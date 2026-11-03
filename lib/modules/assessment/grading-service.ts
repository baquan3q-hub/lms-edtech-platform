import "server-only";
import { z } from "zod";
import { requireActor, requireRecordAccess } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccessError } from "@/lib/auth/actor-context";

const gradeInput = z.object({
  submissionId: z.string().min(1).max(64), newScore: z.number().finite().min(0),
  reason: z.string().trim().max(2000).optional(), feedback: z.string().max(30000).optional(),
  publishNow: z.boolean().default(false), rubricGrades: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type GradeInput = z.input<typeof gradeInput>;

export async function saveGrade(kind: "exam" | "homework", input: GradeInput) {
  const checked = gradeInput.parse(input);
  const actor = await requireActor(["teacher", "admin"]);
  await requireRecordAccess(kind === "exam" ? "exam_submissions" : "homework_submissions", checked.submissionId);
  const { data, error } = await createAdminClient().rpc("set_school_grade", {
    p_actor: actor.id, p_kind: kind, p_submission: checked.submissionId,
    p_score: checked.newScore, p_publish: checked.publishNow, p_reason: checked.reason || null,
    p_feedback: checked.feedback ?? null, p_rubric: checked.rubricGrades ?? null,
  });
  if (error) {
    if(error.message.includes("FORBIDDEN"))throw new AccessError(403);
    if(error.message.includes("NOT_FOUND"))throw new AccessError(404,"Không tìm thấy bài nộp.","NOT_FOUND");
    if(error.message.includes("REASON_REQUIRED"))throw new AccessError(409,"Sửa điểm đã công bố bắt buộc phải có lý do.","REASON_REQUIRED");
    if(error.message.includes("GRADE_LOCKED"))throw new AccessError(409,"Điểm đã khóa, không thể thay đổi.","GRADE_LOCKED");
    if(error.message.includes("INVALID_SCORE"))throw new AccessError(400,"Điểm số không hợp lệ.","INVALID_SCORE");
    throw error;
  }
  return data as "draft" | "published";
}
