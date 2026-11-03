"use server";

import { requireActor, requireClassAccess } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { produceOutboxEvent } from "@/lib/outbox/outbox-producer";
import { DEFAULT_PILOT_SCHOOL_ID } from "@/lib/auth/actor-context";

export interface CreateAbsenceRequestInput {
    studentId: string;
    classId: string;
    absenceDate: string;
    reason: string;
    evidenceUrl?: string;
    schoolId?: string;
    termId?: string;
}

export interface ReviewAbsenceRequestInput {
    requestId: string;
    decision: 'approved' | 'rejected';
    reviewNote?: string;
    rejectReason?: string;
}

/**
 * Phụ huynh gửi đơn xin phép nghỉ học cho con kèm minh chứng (Phase 5).
 * Kiểm tra phân quyền: Phụ huynh chỉ được gửi cho con đã xác minh.
 */
export async function submitAbsenceRequest(input: CreateAbsenceRequestInput) {
    try {
        const actor = await requireActor(["parent", "admin"]);
        const adminSupabase = createAdminClient();

        // 1. Phụ huynh: Xác minh mối quan hệ phụ huynh - học sinh
        if (actor.role === "parent") {
            const { data: link, error: linkErr } = await adminSupabase
                .from("parent_students")
                .select("id")
                .eq("parent_id", actor.id)
                .eq("student_id", input.studentId)
                .maybeSingle();

            if (linkErr || !link) {
                return {
                    success: false,
                    error: "Bạn không có quyền gửi đơn cho học sinh này (Chỉ xem con đã xác minh).",
                    code: "FORBIDDEN"
                };
            }
        }

        // 2. Lấy thông tin lớp học và trường học
        const { data: classData, error: classErr } = await adminSupabase
            .from("classes")
            .select("id, name, school_id, term_id, teacher_id")
            .eq("id", input.classId)
            .single();

        if (classErr || !classData) {
            return { success: false, error: "Không tìm thấy lớp học.", code: "NOT_FOUND" };
        }

        const schoolId = input.schoolId || classData.school_id || DEFAULT_PILOT_SCHOOL_ID;
        const termId = input.termId || classData.term_id;

        // 3. Tạo đơn xin nghỉ phép
        const { data: request, error: insertErr } = await adminSupabase
            .from("absence_requests")
            .insert({
                school_id: schoolId,
                term_id: termId,
                parent_id: actor.id,
                student_id: input.studentId,
                class_id: input.classId,
                absence_date: input.absenceDate,
                reason: input.reason,
                attachment_url: input.evidenceUrl || null,
                evidence_url: input.evidenceUrl || null,
                status: "pending"
            })
            .select()
            .single();

        if (insertErr || !request) {
            throw insertErr || new Error("Không thể lưu đơn xin nghỉ phép.");
        }

        // 4. Phát hành Outbox Event
        await produceOutboxEvent({
            schoolId,
            eventType: "absence_request.created",
            aggregateType: "absence_requests",
            aggregateId: request.id,
            eventKey: `abs_req_created_${request.id}`,
            payload: {
                parent_id: actor.id,
                student_id: input.studentId,
                class_id: input.classId,
                absence_date: input.absenceDate,
                teacher_id: classData.teacher_id
            }
        });

        revalidatePath("/parent");
        revalidatePath("/parent/absence-request");
        return { success: true, error: null, data: request };
    } catch (err: any) {
        console.error("Lỗi submitAbsenceRequest:", err);
        return { success: false, error: err.message || "Không thể nộp đơn xin nghỉ.", code: "INTERNAL_ERROR" };
    }
}

/**
 * Giáo viên chủ nhiệm hoặc Admin phê duyệt / từ chối đơn xin nghỉ (Phase 5).
 * Khi duyệt 'approved': Tự động đồng bộ vào điểm danh của ngày đó thành 'excused' (Nghỉ có phép).
 */
export async function reviewAbsenceRequestK12(input: ReviewAbsenceRequestInput) {
    try {
        const actor = await requireActor(["teacher", "admin"]);
        const adminSupabase = createAdminClient();

        // 1. Lấy thông tin đơn hiện tại
        const { data: request, error: fetchErr } = await adminSupabase
            .from("absence_requests")
            .select("id, class_id, student_id, absence_date, parent_id, school_id, status")
            .eq("id", input.requestId)
            .single();

        if (fetchErr || !request) {
            return { success: false, error: "Không tìm thấy đơn xin nghỉ phép.", code: "NOT_FOUND" };
        }

        // 2. Giáo viên phải có quyền truy cập lớp học
        if (actor.role === "teacher") {
            await requireClassAccess(request.class_id, "teach");
        }

        const now = new Date().toISOString();
        const rejectReason = input.decision === "rejected" ? input.rejectReason || "Không đủ lý do hợp lệ" : null;

        // 3. Cập nhật trạng thái đơn
        const { data: updatedRequest, error: updateErr } = await adminSupabase
            .from("absence_requests")
            .update({
                status: input.decision,
                reviewed_by: actor.id,
                reviewed_at: now,
                review_note: input.reviewNote || null,
                reject_reason: rejectReason
            })
            .eq("id", input.requestId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // 4. Nếu DUYỆT (approved) -> Tự động đồng bộ vào bảng điểm danh attendance_records
        if (input.decision === "approved") {
            // Tìm session điểm danh của lớp trong ngày đó
            let { data: session } = await adminSupabase
                .from("attendance_sessions")
                .select("id")
                .eq("class_id", request.class_id)
                .eq("session_date", request.absence_date)
                .maybeSingle();

            // Nếu chưa có session, tạo session mới cho ngày đó
            if (!session) {
                const { data: newSession, error: sessErr } = await adminSupabase
                    .from("attendance_sessions")
                    .insert({
                        class_id: request.class_id,
                        session_date: request.absence_date,
                        teacher_id: actor.id,
                        status: "open"
                    })
                    .select("id")
                    .single();

                if (!sessErr && newSession) {
                    session = newSession;
                }
            }

            if (session) {
                // Upsert bản ghi điểm danh trạng thái 'excused' (nghỉ có phép)
                await adminSupabase
                    .from("attendance_records")
                    .upsert({
                        session_id: session.id,
                        student_id: request.student_id,
                        status: "excused",
                        note: `Nghỉ có phép theo đơn duyệt (${input.reviewNote || 'Hợp lệ'})`,
                        marked_by: actor.id,
                        marked_at: now,
                        updated_by: actor.id,
                        updated_at: now,
                        school_id: request.school_id || DEFAULT_PILOT_SCHOOL_ID
                    }, { onConflict: "session_id,student_id" });
            }
        }

        // 5. Gửi Outbox Event thông báo kết quả duyệt
        await produceOutboxEvent({
            schoolId: request.school_id || DEFAULT_PILOT_SCHOOL_ID,
            eventType: "absence_request.reviewed",
            aggregateType: "absence_requests",
            aggregateId: request.id,
            eventKey: `abs_req_reviewed_${request.id}_${input.decision}`,
            payload: {
                parent_id: request.parent_id,
                student_id: request.student_id,
                decision: input.decision,
                absence_date: request.absence_date,
                note: input.reviewNote || rejectReason
            }
        });

        revalidatePath("/teacher/absence-requests");
        revalidatePath("/teacher/attendance");
        revalidatePath("/parent/absence-request");
        return { success: true, error: null, data: updatedRequest };
    } catch (err: any) {
        console.error("Lỗi reviewAbsenceRequestK12:", err);
        return { success: false, error: err.message || "Không thể phê duyệt đơn.", code: "INTERNAL_ERROR" };
    }
}
