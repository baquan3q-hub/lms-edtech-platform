"use server";
import { saveGrade, type GradeInput } from "@/lib/modules/assessment/grading-service";
import { revalidatePath } from "next/cache";
import { AccessError } from "@/lib/auth/actor-context";
export interface GradeExamInput { submissionId: string; newScore: number; reason?: string; rubricGrades?: Record<string, unknown> | null; publishNow?: boolean }
export interface GradeHomeworkInput { submissionId: string; newScore: number; feedback?: string; reason?: string; publishNow?: boolean }

async function grade(kind: "exam" | "homework", input: GradeInput) {
  try {
    const gradingStatus = await saveGrade(kind, input);
    revalidatePath("/teacher", "layout");
    revalidatePath("/student", "layout");
    revalidatePath("/parent", "layout");
    return { success: true, error: null, gradingStatus };
  } catch (error) {
    if(error instanceof AccessError)return {success:false,error:error.message,code:error.code};
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
    const code = message.includes("REASON_REQUIRED") ? "REASON_REQUIRED" : message.includes("GRADE_LOCKED") ? "GRADE_LOCKED" : message.includes("INVALID_SCORE") ? "INVALID_SCORE" : "GRADE_SAVE_FAILED";
    const text = code === "REASON_REQUIRED" ? "Sửa điểm đã công bố bắt buộc phải có lý do." : code === "GRADE_LOCKED" ? "Điểm đã khóa, không thể thay đổi." : "Không thể lưu điểm. Vui lòng kiểm tra quyền và điểm nhập vào.";
    return { success: false, error: text, code };
  }
}
export async function gradeExamSubmission(input: GradeExamInput) { return grade("exam", input); }
export async function gradeHomeworkSubmissionK12(input: GradeHomeworkInput) { return grade("homework", input); }
