import { z } from "zod";
import { publicQuestions, questionSchema, answersSchema } from "@/lib/learning/grading";

export const publishedGradeStatuses = ["published", "locked"] as const;
export function isGradePublished(status: unknown): boolean {
  return status === "published" || status === "locked";
}

const examHeader = z.object({
  id: z.string(), title: z.string(), description: z.string().nullable().optional(),
  class_id: z.string(), duration_minutes: z.number(), total_points: z.number(),
  due_date: z.string().nullable().optional(), max_attempts: z.number().optional(),
  is_strict_mode: z.boolean().nullable().optional(), strict_mode_limit: z.number().nullable().optional(),
  show_answers: z.boolean().nullable().optional(),
});

/** Whitelist serialized fields. Never spread a database row into client props. */
export function toStudentExam(exam: unknown, questions: unknown, reveal = false) {
  const header = examHeader.parse(exam);
  return { ...header, questions: publicQuestions(z.array(questionSchema).parse(questions), reveal && header.show_answers === true) };
}

const submissionFields = z.object({
  id: z.string(), exam_id: z.string().optional(), attempt_id: z.string().nullable().optional(),
  answers: answersSchema.optional(), submitted_at: z.string().nullable().optional(),
  total_points: z.number().nullable().optional(), time_taken_seconds: z.number().nullable().optional(),
  grading_status: z.string().nullable().optional(), status: z.string().nullable().optional(),
  score: z.number().nullable().optional(), feedback: z.string().nullable().optional(),
});

export function toStudentSubmission(input: unknown) {
  const submission = submissionFields.parse(input);
  const published = isGradePublished(submission.grading_status);
  return { ...submission, score: published ? submission.score ?? null : null,
    feedback: published ? submission.feedback ?? null : null,
    display_status: published ? "Đã công bố" : "Đang chấm" };
}
export type StudentExam = ReturnType<typeof toStudentExam>;
export type StudentSubmission = ReturnType<typeof toStudentSubmission>;
