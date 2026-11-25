"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { AccessError, requireActor } from "@/lib/auth/authorize";
import {
    questionGenerationSchema,
    rubricFeedbackSchema,
    earlyInterventionRecommendationSchema,
} from "@/lib/ai/schemas";

/** Reviewer must be the signed-in staff member, acting on a job in their own school. */
async function guardAiReviewer(claimedUserId: string, jobSchoolId: string | null): Promise<string | null> {
    try {
        const actor = await requireActor(["admin", "teacher"]);
        if (claimedUserId !== actor.id) return "Người duyệt không khớp với tài khoản đang đăng nhập.";
        if (actor.role !== "super_admin" && jobSchoolId !== actor.schoolId) return "Tác vụ AI thuộc trường khác.";
        return null;
    } catch (error) {
        if (error instanceof AccessError) return error.message;
        throw error;
    }
}

export interface ReviewActionResult {
    success: boolean;
    error?: string;
    jobId?: string;
    reviewStatus?: "approved" | "rejected";
    payload?: unknown;
}

/**
 * Server Action: Giáo viên phê duyệt bản nháp AI (có thể giữ nguyên hoặc chỉnh sửa nội dung)
 */
export async function approveAiJobAction(params: {
    jobId: string;
    reviewerId: string;
    modifiedPayload?: unknown;
    reviewNote?: string;
}): Promise<ReviewActionResult> {
    const { jobId, reviewerId, modifiedPayload, reviewNote } = params;
    const supabase = createAdminClient();

    // 1. Kiểm tra tồn tại và trạng thái job
    const { data: job, error: fetchErr } = await supabase
        .from("learning_ai_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

    if (fetchErr || !job) {
        return { success: false, error: "Không tìm thấy tác vụ AI cần duyệt." };
    }

    const denied = await guardAiReviewer(reviewerId, job.school_id);
    if (denied) return { success: false, error: denied };

    if (job.review_status !== "draft") {
        return { success: false, error: `Tác vụ AI này đã được xử lý (trạng thái: ${job.review_status}).` };
    }

    // 2. Validate payload nếu giáo viên có chỉnh sửa
    let finalPayload = modifiedPayload || job.raw_output;
    try {
        if (job.kind === "question_generation") {
            finalPayload = questionGenerationSchema.parse(finalPayload);
        } else if (job.kind === "rubric_grading_feedback") {
            finalPayload = rubricFeedbackSchema.parse(finalPayload);
        } else if (job.kind === "early_intervention_recommendation") {
            finalPayload = earlyInterventionRecommendationSchema.parse(finalPayload);
        }
    } catch (valErr: any) {
        return { success: false, error: "Nội dung chỉnh sửa không hợp lệ theo quy chuẩn: " + valErr.message };
    }

    // 3. Cập nhật trạng thái 'approved'
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
        .from("learning_ai_jobs")
        .update({
            review_status: "approved",
            reviewer_id: reviewerId,
            reviewed_at: now,
            review_note: reviewNote || null,
            approved_payload: finalPayload,
        })
        .eq("id", jobId);

    if (updateErr) {
        return { success: false, error: "Lỗi ghi nhận phê duyệt: " + updateErr.message };
    }

    // 4. Ghi vết kiểm toán audit_events
    try {
        await supabase.from("audit_events").insert({
            school_id: job.school_id,
            actor_id: reviewerId,
            action: "ai_job_approved",
            entity_type: "learning_ai_jobs",
            entity_id: jobId,
            payload: {
                kind: job.kind,
                target_type: job.target_type,
                target_id: job.target_id,
                modified_by_teacher: !!modifiedPayload,
            },
        });
    } catch {
        // Không block action chính nếu audit gặp lỗi
    }

    return {
        success: true,
        jobId,
        reviewStatus: "approved",
        payload: finalPayload,
    };
}

/**
 * Server Action: Giáo viên bác bỏ bản nháp AI
 */
export async function rejectAiJobAction(params: {
    jobId: string;
    reviewerId: string;
    rejectionReason: string;
}): Promise<ReviewActionResult> {
    const { jobId, reviewerId, rejectionReason } = params;
    if (!rejectionReason || rejectionReason.trim().length < 3) {
        return { success: false, error: "Bắt buộc phải ghi rõ lý do bác bỏ bản nháp AI." };
    }

    const supabase = createAdminClient();

    const { data: job, error: fetchErr } = await supabase
        .from("learning_ai_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

    if (fetchErr || !job) {
        return { success: false, error: "Không tìm thấy tác vụ AI cần bác bỏ." };
    }

    const denied = await guardAiReviewer(reviewerId, job.school_id);
    if (denied) return { success: false, error: denied };

    if (job.review_status !== "draft") {
        return { success: false, error: `Tác vụ AI này đã ở trạng thái ${job.review_status}.` };
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
        .from("learning_ai_jobs")
        .update({
            review_status: "rejected",
            reviewer_id: reviewerId,
            reviewed_at: now,
            review_note: rejectionReason,
        })
        .eq("id", jobId);

    if (updateErr) {
        return { success: false, error: "Lỗi ghi nhận bác bỏ: " + updateErr.message };
    }

    try {
        await supabase.from("audit_events").insert({
            school_id: job.school_id,
            actor_id: reviewerId,
            action: "ai_job_rejected",
            entity_type: "learning_ai_jobs",
            entity_id: jobId,
            payload: { kind: job.kind, reason: rejectionReason },
        });
    } catch {}

    return {
        success: true,
        jobId,
        reviewStatus: "rejected",
    };
}

/**
 * Áp dụng đề xuất can thiệp sớm đã được giáo viên duyệt vào ca can thiệp (Chặn hoàn toàn Zero Autonomy)
 */
export async function applyApprovedInterventionAction(params: {
    jobId: string;
    caseId: string;
    teacherId: string;
    actionIndex?: number;
}): Promise<{ success: boolean; error?: string; actionId?: string }> {
    const { jobId, caseId, teacherId, actionIndex = 0 } = params;
    const supabase = createAdminClient();

    // 1. Kiểm tra trạng thái AI Job: PHẢI LÀ 'approved'
    const { data: job, error: jobErr } = await supabase
        .from("learning_ai_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

    if (jobErr || !job) {
        return { success: false, error: "Không tìm thấy tác vụ AI." };
    }

    const denied = await guardAiReviewer(teacherId, job.school_id);
    if (denied) return { success: false, error: denied };

    if (job.review_status !== "approved") {
        return {
            success: false,
            error: "CHẶN TRUY CẬP: Bản nháp AI chưa được giáo viên phê duyệt. Không thể tự động đưa vào hồ sơ can thiệp.",
        };
    }

    const payload = job.approved_payload as any;
    const selectedAction = payload?.recommended_actions?.[actionIndex];
    if (!selectedAction) {
        return { success: false, error: "Hành động được chọn không tồn tại trong bản nháp đã duyệt." };
    }

    const { data: interventionCase } = await supabase
        .from("intervention_cases")
        .select("school_id")
        .eq("id", caseId)
        .maybeSingle();
    if (!interventionCase || interventionCase.school_id !== job.school_id) {
        return { success: false, error: "Ca can thiệp không thuộc cùng trường với tác vụ AI." };
    }

    // 2. Ghi vào bảng intervention_actions (Phase 5)
    const { data: act, error: actErr } = await supabase
        .from("intervention_actions")
        .insert({
            case_id: caseId,
            action_type: selectedAction.action_type || "meeting",
            action_summary: selectedAction.title,
            action_details: selectedAction.description,
            performed_by: teacherId,
        })
        .select("id")
        .single();

    if (actErr) {
        return { success: false, error: "Lỗi tạo hành động can thiệp: " + actErr.message };
    }

    return { success: true, actionId: act.id };
}
