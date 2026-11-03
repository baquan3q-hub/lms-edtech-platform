"use server";

import { requireActor, requireResourceAccess } from "@/lib/auth/authorize";
import { answersSchema } from "@/lib/learning/grading";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export interface AutosaveDraftInput {
    attemptId: string;
    answers: unknown;
    clientVersion: number;
}

export interface AutosaveDraftResponse {
    success: boolean;
    error: string | null;
    version?: number;
    code?: 'VERSION_CONFLICT' | 'DEADLINE_EXPIRED' | 'UNAUTHORIZED' | 'VALIDATION_ERROR';
}

/**
 * Xử lý lưu nháp bài thi / tự luận có kiểm soát phiên bản (Optimistic Concurrency Control).
 * Ngăn chặn race condition khi học sinh mở nhiều tab làm bài đồng thời.
 * Từ chối bản nháp cũ ghi đè bản nháp mới (Conflict 409).
 */
export async function saveExamDraftWithVersioning(input: AutosaveDraftInput): Promise<AutosaveDraftResponse> {
    try {
        z.object({attemptId:z.string().min(1).max(64),clientVersion:z.number().int().min(0)}).parse(input);
        const actor = await requireActor(["student"]);
        const validatedAnswers = answersSchema.parse(input.answers);

        const adminSupabase = createAdminClient();

        // 1. Lấy thông tin lượt thi hiện tại
        const { data: attempt, error: fetchErr } = await adminSupabase
            .from("exam_attempts")
            .select("id, exam_id, student_id, draft_version, expires_at, submitted_at, snapshot")
            .eq("id", input.attemptId)
            .eq("student_id", actor.id)
            .single();

        if (fetchErr || !attempt) {
            return {
                success: false,
                error: "Không tìm thấy lần làm bài.",
                code: 'VALIDATION_ERROR'
            };
        }
        if (!Array.isArray(attempt.snapshot?.questions) || validatedAnswers.length>attempt.snapshot.questions.length) {
            return {success:false,error:"Số câu trả lời không hợp lệ.",code:"VALIDATION_ERROR"};
        }

        // 2. Kiểm tra nếu bài thi đã nộp
        if (attempt.submitted_at !== null) {
            return {
                success: false,
                error: "Bài thi đã được nộp, không thể lưu nháp.",
                code: 'DEADLINE_EXPIRED'
            };
        }

        // 3. Kiểm tra đồng hồ Server: đã quá thời gian làm bài hay chưa
        const now = new Date();
        const expiryTime = Date.parse(attempt.expires_at);
        if (isNaN(expiryTime) || now.getTime() >= expiryTime) {
            return {
                success: false,
                error: "Thời gian làm bài đã kết thúc (SUBMISSION_DEADLINE_PASSED).",
                code: 'DEADLINE_EXPIRED',
                version: attempt.draft_version
            };
        }

        // 4. Kiểm tra quyền truy cập bài thi
        await requireResourceAccess("exams", attempt.exam_id, "learn");

        // 5. Kiểm tra xung đột phiên bản (Optimistic Concurrency Check)
        if (attempt.draft_version !== input.clientVersion) {
            return {
                success: false,
                error: `Xung đột phiên bản: Bản nháp trên máy chủ đã ở phiên bản ${attempt.draft_version}, bản gửi lên là ${input.clientVersion}.`,
                code: 'VERSION_CONFLICT',
                version: attempt.draft_version
            };
        }

        // 6. Cập nhật nguyên tử với điều kiện phiên bản chính xác
        const nextVersion = input.clientVersion + 1;
        const { data: updatedAttempt, error: updateErr } = await adminSupabase
            .from("exam_attempts")
            .update({
                draft_answers: validatedAnswers,
                draft_version: nextVersion
            })
            .eq("id", input.attemptId)
            .eq("draft_version", input.clientVersion) // Khóa kiểm tra lạc quan
            .is("submitted_at", null)
            .gt("expires_at", now.toISOString())
            .select("draft_version")
            .maybeSingle();

        if (updateErr || !updatedAttempt) {
            return {
                success: false,
                error: "Bản nháp đã thay đổi ở nơi khác hoặc bài đã hết giờ trong lúc lưu.",
                code: 'VERSION_CONFLICT',
                version: attempt.draft_version
            };
        }

        return {
            success: true,
            error: null,
            version: updatedAttempt.draft_version
        };
    } catch (err: any) {
        console.error("Lỗi saveExamDraftWithVersioning:", err);
        return {
            success: false,
            error: err.message || "Chưa lưu được bản nháp. Vui lòng kiểm tra lại kết nối.",
            code: 'VALIDATION_ERROR'
        };
    }
}
