"use server";

import { requireActor } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/lib/audit/audit-logger";
import { produceOutboxEvent } from "@/lib/outbox/outbox-producer";
import { DEFAULT_PILOT_SCHOOL_ID } from "@/lib/auth/actor-context";

export interface AddInterventionActionInput {
    caseId: string;
    actionType: 'parent_contact' | 'counseling' | 'tutoring' | 'review_note' | 'status_change';
    note: string;
    outcome?: string;
}

export interface CloseInterventionCaseInput {
    caseId: string;
    resolutionSummary: string;
    status?: 'resolved' | 'closed';
}

/**
 * Ghi nhận một hành động can thiệp hỗ trợ học sinh (Append-only).
 * Không cho phép sửa đè hành động cũ nhằm bảo toàn nhật ký can thiệp.
 */
export async function addInterventionAction(input: AddInterventionActionInput) {
    try {
        const actor = await requireActor(["teacher", "admin"]);
        if (!input.note || input.note.trim().length === 0) {
            return { success: false, error: "Ghi chú hành động can thiệp không được để trống.", code: "NOTE_REQUIRED" };
        }

        const adminSupabase = createAdminClient();

        // 1. Kiểm tra ca can thiệp
        const { data: currentCase, error: caseErr } = await adminSupabase
            .from("intervention_cases")
            .select("id, school_id, student_id, status")
            .eq("id", input.caseId)
            .single();

        if (caseErr || !currentCase) {
            return { success: false, error: "Không tìm thấy hồ sơ can thiệp.", code: "NOT_FOUND" };
        }

        // 2. Thêm bản ghi append-only vào intervention_actions
        const { data: newAction, error: actionErr } = await adminSupabase
            .from("intervention_actions")
            .insert({
                case_id: input.caseId,
                actor_id: actor.id,
                action_type: input.actionType,
                note: input.note.trim(),
                outcome: input.outcome || null
            })
            .select()
            .single();

        if (actionErr || !newAction) {
            throw actionErr || new Error("Không thể lưu hành động can thiệp.");
        }

        // Cập nhật trạng thái case sang in_progress nếu đang open
        if (currentCase.status === "open") {
            await adminSupabase
                .from("intervention_cases")
                .update({ status: "in_progress", updated_at: new Date().toISOString() })
                .eq("id", input.caseId);
        }

        return { success: true, error: null, data: newAction };
    } catch (err: any) {
        console.error("Lỗi addInterventionAction:", err);
        return { success: false, error: err.message || "Lỗi ghi nhận hành động.", code: "INTERNAL_ERROR" };
    }
}

/**
 * Đóng hoặc hoàn thành ca can thiệp sớm (Phase 5 Gate: 100% case đóng phải có người xử lý và tóm tắt kết quả).
 */
export async function closeInterventionCase(input: CloseInterventionCaseInput) {
    try {
        const actor = await requireActor(["teacher", "admin"]);

        if (!input.resolutionSummary || input.resolutionSummary.trim().length === 0) {
            return {
                success: false,
                error: "CANNOT_CLOSE_WITHOUT_SUMMARY: Cần có tóm tắt kết quả xử lý khi đóng ca can thiệp.",
                code: "SUMMARY_REQUIRED"
            };
        }

        const adminSupabase = createAdminClient();

        const { data: currentCase, error: caseErr } = await adminSupabase
            .from("intervention_cases")
            .select("id, school_id, student_id, status, assigned_to")
            .eq("id", input.caseId)
            .single();

        if (caseErr || !currentCase) {
            return { success: false, error: "Không tìm thấy hồ sơ can thiệp.", code: "NOT_FOUND" };
        }

        const closeStatus = input.status || "resolved";
        const now = new Date().toISOString();
        const schoolId = currentCase.school_id || DEFAULT_PILOT_SCHOOL_ID;

        // 1. Cập nhật trạng thái đóng case
        const { data: closedCase, error: updateErr } = await adminSupabase
            .from("intervention_cases")
            .update({
                status: closeStatus,
                resolution_summary: input.resolutionSummary.trim(),
                closed_by: actor.id,
                closed_at: now,
                updated_at: now
            })
            .eq("id", input.caseId)
            .select()
            .single();

        if (updateErr || !closedCase) {
            throw updateErr || new Error("Không thể đóng ca can thiệp.");
        }

        // 2. Ghi hành động kết thúc vào nhật ký
        await adminSupabase.from("intervention_actions").insert({
            case_id: input.caseId,
            actor_id: actor.id,
            action_type: "status_change",
            note: `Đóng ca can thiệp với trạng thái: ${closeStatus}. Tóm tắt: ${input.resolutionSummary.trim()}`,
            outcome: input.resolutionSummary.trim()
        });

        // 3. Ghi vết kiểm toán
        await recordAuditEvent({
            schoolId,
            actorId: actor.id,
            action: "intervention.closed",
            entityType: "intervention_cases",
            entityId: input.caseId,
            beforeState: { status: currentCase.status },
            afterState: { status: closeStatus, resolution_summary: input.resolutionSummary.trim() },
            reason: input.resolutionSummary.trim()
        });

        // 4. Phát hành Outbox Event
        await produceOutboxEvent({
            schoolId,
            eventType: "intervention.resolved",
            aggregateType: "intervention_cases",
            aggregateId: input.caseId,
            eventKey: `interv_resolved_${input.caseId}_${Date.now()}`,
            payload: {
                student_id: currentCase.student_id,
                status: closeStatus,
                closed_by: actor.id
            }
        });

        return { success: true, error: null, data: closedCase };
    } catch (err: any) {
        console.error("Lỗi closeInterventionCase:", err);
        return { success: false, error: err.message || "Lỗi đóng ca can thiệp.", code: "INTERNAL_ERROR" };
    }
}
