import { z } from "zod";
import { isGradePublished } from "./dto";

const answerLink = z.string().max(2000).refine(value => !value || value.startsWith("https://") || /^\/api\/v1\/files\/[\w-]+$/.test(value));
export const homeworkAnswersSchema = z.array(z.object({
  question_id: z.string().min(1).max(100), type: z.string().max(30).optional(),
  selected_option_id: z.string().max(100).optional(), essay_text: z.string().max(30000).optional(),
  video_url: answerLink.optional(), attachment_url: answerLink.optional(), proof_image_url: answerLink.optional(),
})).max(100);
const homeworkQuestion = z.object({
  id: z.string().min(1), question: z.string().min(1),
  type: z.enum(["multiple_choice", "essay", "video", "attachment"]), points: z.number().positive(),
  instructions: z.string().optional(), attachment_url: z.string().optional(),
  options: z.array(z.object({ id: z.string(), text: z.string(), isCorrect: z.boolean().optional() })).optional(),
});
export function validateHomework(questions: unknown, totalPoints: number) {
  const checked = z.array(homeworkQuestion).min(1).max(100).parse(questions);
  if (new Set(checked.map(q => q.id)).size !== checked.length || !Number.isFinite(totalPoints) ||
      Math.abs(checked.reduce((sum,q) => sum+q.points,0)-totalPoints)>0.001) throw new Error("Câu hỏi hoặc tổng điểm không hợp lệ.");
  for (const q of checked) if (q.type === "multiple_choice" && (!q.options || q.options.length<2 ||
    q.options.filter(o => o.isCorrect).length!==1 || new Set(q.options.map(o=>o.id)).size!==q.options.length)) throw new Error("Câu hỏi trắc nghiệm phải có một đáp án đúng.");
  return checked;
}
const header = z.object({
  id: z.string(), class_id: z.string(), title: z.string(), description: z.string().nullable().optional(),
  total_points: z.number(), due_date: z.string().nullable().optional(), max_attempts: z.number().optional(),
  questions: z.array(homeworkQuestion),
});
export function toStudentHomework(raw: unknown) {
  const parsed = header.parse(raw);
  return { ...parsed, questions: parsed.questions.map(q => ({ ...q, options: q.options?.map(o => ({ id:o.id,text:o.text })) })) };
}
export function toStudentHomeworkSubmission(raw: unknown) {
  const parsed = z.object({
    id:z.string(), homework_id:z.string(), answers:homeworkAnswersSchema, submitted_at:z.string().nullable().optional(),
    grading_status:z.string(), status:z.string().nullable().optional(), score:z.number().nullable().optional(),
    feedback:z.string().nullable().optional(), attempts:z.number().optional(),
  }).parse(raw);
  const published=isGradePublished(parsed.grading_status);
  return { ...parsed,score:published ? parsed.score ?? null : null,feedback:published ? parsed.feedback ?? null : null };
}
