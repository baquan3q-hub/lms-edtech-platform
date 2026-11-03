import { z } from "zod";

export const rubricSchema = z.array(z.object({ id: z.string().min(1), label: z.string().min(1), maxPoints: z.number().positive() })).min(1);
export const questionSchema = z.object({
    id: z.string().min(1), question: z.string().min(1), type: z.string().optional(),
    points: z.number().positive().default(1),
    options: z.array(z.object({ id: z.string().min(1), text: z.string(), isCorrect: z.boolean().optional() })).default([]),
    rubric: rubricSchema.optional(), tags: z.array(z.string()).optional(),
});
export const answersSchema = z.array(z.object({ selectedOptionId: z.string().nullable().optional(), textAnswer: z.string().max(30000).optional() })).max(200);
export type ExamQuestion = z.infer<typeof questionSchema>;

export function validateExam(questions: unknown, totalPoints: number) {
    const parsed = z.array(questionSchema).min(1).max(200).parse(questions);
    if (new Set(parsed.map(q => q.id)).size !== parsed.length) throw new Error("Mã câu hỏi bị trùng.");
    for (const q of parsed) {
        if (q.type !== "ESSAY" && (q.options.length < 2 || q.options.filter(o => o.isCorrect === true).length !== 1 || new Set(q.options.map(o => o.id)).size !== q.options.length)) {
            throw new Error("Mỗi câu trắc nghiệm cần các lựa chọn riêng biệt và đúng một đáp án chuẩn.");
        }
        if (q.rubric && Math.abs(q.rubric.reduce((n, r) => n + r.maxPoints, 0) - q.points) > 0.001) throw new Error("Tổng điểm rubric không khớp điểm câu hỏi.");
    }
    if (!Number.isFinite(totalPoints) || Math.abs(parsed.reduce((n, q) => n + q.points, 0) - totalPoints) > 0.001) throw new Error("Tổng điểm câu hỏi không khớp tổng điểm đề.");
    return parsed;
}
export function gradeObjective(questions: ExamQuestion[], input: unknown) {
    const answers = answersSchema.parse(input);
    if (answers.length > questions.length) throw new Error("Số câu trả lời không hợp lệ.");
    let score = 0;
    for (const [i, q] of questions.entries()) {
        if (q.type === "ESSAY") continue;
        const correct = q.options.find(o => o.isCorrect === true);
        if (correct && answers[i]?.selectedOptionId === correct.id) score += q.points;
    }
    return { score, pending: questions.some(q => q.type === "ESSAY"), answers };
}
export function publicQuestions(questions: ExamQuestion[], reveal = false) {
    return questions.map(q => ({ id: q.id, question: q.question, type: q.type, points: q.points,
        options: q.options.map(o => reveal ? o : ({ id: o.id, text: o.text })) }));
}
export function normalizeScore(score: number | null, maximum: number | null): number | null {
    return score !== null && maximum !== null && Number.isFinite(score) && maximum > 0 && score >= 0 && score <= maximum ? score / maximum * 100 : null;
}
