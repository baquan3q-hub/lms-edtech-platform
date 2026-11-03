import { z } from "zod";

/**
 * Zod Structured Output Schemas cho 3 tác vụ AI Pilot duy nhất (Phase 6)
 * Tuân thủ quy chuẩn nghiêm ngặt:
 * 1. AI không tự quyết định điểm số chính thức.
 * 2. Không chấp nhận nội dung mẫu, placeholder hoặc suy diễn vô căn cứ.
 * 3. Cấm tuyệt đối ngôn từ miệt thị, phán xét đạo đức hoặc chụp mũ gian lận/lười biếng.
 */

// Danh sách từ cấm tuyệt đối xuất hiện trong phản hồi của AI
export const BANNED_AI_WORDS_REGEX = /gian lận|chép bài|quay cóp|lười học|lười biếng|vô ý thức|vô trách nhiệm|kém cỏi|dốt nát|kém thông minh|chắc chắn không học|hư hỏng/iu;

// =========================================================================
// TÁC VỤ 1: SINH BẢN NHÁP CÂU HỎI BÀI TẬP / ĐỀ KIỂM TRA (Question Generation)
// =========================================================================

export const questionOptionSchema = z.object({
    id: z.string().trim().min(1, "Mã đáp án không được để trống"),
    text: z.string().trim().min(1, "Nội dung đáp án không được để trống")
        .refine(val => !/^(Đáp án [A-D]|Lựa chọn [1-4]|Tùy chọn)$/i.test(val), "Đáp án không được là placeholder chung chung"),
});

export const generatedQuestionItemSchema = z.object({
    id: z.string().trim().min(1),
    question_text: z.string().trim().min(10, "Nội dung câu hỏi phải có ít nhất 10 ký tự")
        .refine(val => !/^(Câu hỏi mẫu|Câu \d+: Placeholder|Giáo viên sẽ cập nhật nội dung)/i.test(val), "Nội dung câu hỏi không được là bản mẫu placeholder"),
    question_type: z.enum(["multiple_choice", "short_answer", "essay"]).default("multiple_choice"),
    options: z.array(questionOptionSchema).optional(),
    correct_answer: z.string().trim().min(1, "Phải có đáp án đúng"),
    explanation: z.string().trim().min(5, "Giải thích đáp án phải có ít nhất 5 ký tự"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    points: z.number().positive("Điểm câu hỏi phải là số dương").default(1.0),
}).superRefine((data, ctx) => {
    if (data.question_type === "multiple_choice") {
        if (!data.options || data.options.length !== 4) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Câu hỏi trắc nghiệm bắt buộc phải có đúng 4 phương án lựa chọn",
                path: ["options"],
            });
            return;
        }

        const optionIds = new Set(data.options.map(o => o.id));
        if (optionIds.size !== 4) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Các mã phương án lựa chọn (A, B, C, D) phải là duy nhất",
                path: ["options"],
            });
        }

        if (!data.options.some(o => o.id === data.correct_answer)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Đáp án đúng "${data.correct_answer}" phải trùng khớp với một trong các mã lựa chọn`,
                path: ["correct_answer"],
            });
        }
    }
});

export const questionGenerationSchema = z.object({
    subject: z.string().trim().min(1, "Môn học không được để trống"),
    grade_level: z.number().int().min(1).max(12),
    topic: z.string().trim().min(3, "Chủ đề kiến thức phải có ít nhất 3 ký tự"),
    questions: z.array(generatedQuestionItemSchema).min(1, "Phải có ít nhất 1 câu hỏi").max(20, "Tối đa 20 câu hỏi một lần sinh"),
});

export type GeneratedQuestionItem = z.infer<typeof generatedQuestionItemSchema>;
export type QuestionGenerationDraft = z.infer<typeof questionGenerationSchema>;

// =========================================================================
// TÁC VỤ 2: GỢI Ý NHẬN XÉT & CHẤM ĐIỂM THEO RUBRIC (Rubric Feedback Draft)
// =========================================================================

export const rubricCriterionFeedbackSchema = z.object({
    criterion_id: z.string().trim().min(1),
    criterion_name: z.string().trim().min(1),
    suggested_score: z.number().min(0, "Điểm gợi ý không được âm"),
    max_score: z.number().positive("Điểm tối đa của tiêu chí phải lớn hơn 0"),
    evidence_quote: z.string().trim().min(1, "Phải có trích dẫn minh chứng từ bài làm"),
    feedback_text: z.string().trim().min(5, "Nhận xét tiêu chí phải có ít nhất 5 ký tự"),
}).refine(data => data.suggested_score <= data.max_score, {
    message: "Điểm gợi ý không được vượt quá điểm tối đa của tiêu chí",
    path: ["suggested_score"],
});

export const rubricFeedbackSchema = z.object({
    criteria_feedback: z.array(rubricCriterionFeedbackSchema).min(1, "Phải có ít nhất một tiêu chí rubric"),
    overall_feedback: z.object({
        strengths: z.string().trim().min(5, "Ưu điểm phải có ít nhất 5 ký tự"),
        areas_for_improvement: z.string().trim().min(5, "Điểm cần cải thiện phải có ít nhất 5 ký tự"),
        next_steps: z.string().trim().min(5, "Hướng dẫn khắc phục phải có ít nhất 5 ký tự"),
    }),
}).superRefine((data, ctx) => {
    const fullText = JSON.stringify(data);
    if (BANNED_AI_WORDS_REGEX.test(fullText)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Nhận xét AI vi phạm quy chuẩn an toàn: Chứa ngôn từ phán xét đạo đức hoặc chụp mũ gian lận/lười biếng.",
            path: ["overall_feedback"],
        });
    }
});

export type RubricCriterionFeedback = z.infer<typeof rubricCriterionFeedbackSchema>;
export type RubricFeedbackDraft = z.infer<typeof rubricFeedbackSchema>;

// =========================================================================
// TÁC VỤ 3: GỢI Ý CAN THIỆP SỚM THEO DỮ LIỆU ĐÃ CHỐT (Early Intervention Recommendation)
// =========================================================================

export const interventionRecommendedActionSchema = z.object({
    action_type: z.enum(["academic_tutoring", "parent_consultation", "counseling", "attendance_contract"]),
    title: z.string().trim().min(5, "Tiêu đề hành động phải có ít nhất 5 ký tự"),
    description: z.string().trim().min(10, "Mô tả hành động phải có ít nhất 10 ký tự"),
    target_timeline_days: z.number().int().min(1).max(60, "Thời hạn hành động tối đa 60 ngày"),
});

export const earlyInterventionRecommendationSchema = z.object({
    risk_level: z.enum(["low", "medium", "high"]),
    primary_concern: z.enum(["attendance", "academic", "comprehensive"]),
    observed_patterns: z.string().trim().min(10, "Minh chứng thực tế phải có ít nhất 10 ký tự"),
    recommended_actions: z.array(interventionRecommendedActionSchema).min(1, "Phải có ít nhất 1 hành động hỗ trợ đề xuất").max(5),
    parent_communication_draft: z.string().trim().min(20, "Bản nháp gửi phụ huynh phải mang tính hợp tác, lịch sự và ít nhất 20 ký tự"),
}).superRefine((data, ctx) => {
    const fullText = JSON.stringify(data);
    if (BANNED_AI_WORDS_REGEX.test(fullText)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Đề xuất can thiệp vi phạm quy chuẩn: Nghiêm cấm nhận định chủ quan tiêu cực về phẩm chất học sinh.",
            path: ["observed_patterns"],
        });
    }
});

export type InterventionRecommendedAction = z.infer<typeof interventionRecommendedActionSchema>;
export type EarlyInterventionRecommendationDraft = z.infer<typeof earlyInterventionRecommendationSchema>;
