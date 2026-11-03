import { describe, it, expect } from "vitest";
import { sanitizeTextPII, sanitizeContextForAI, computeSourceDataHash } from "@/lib/ai/pii-sanitizer";
import {
    questionGenerationSchema,
    rubricFeedbackSchema,
    earlyInterventionRecommendationSchema,
    BANNED_AI_WORDS_REGEX,
} from "@/lib/ai/schemas";
import { getCircuitState, recordAiFailure, recordAiSuccess } from "@/lib/ai/quota-manager";

describe("Phase 6: AI Controlled Scope - Unit Tests", () => {
    // =========================================================================
    // 1. PII Sanitizer & Hashing Tests
    // =========================================================================
    describe("PII Sanitizer & Data Hashing", () => {
        it("should strip personal identifiers (Name, Student Code, Email, Phone, CCCD) from context", () => {
            const rawText = "Học sinh Nguyễn Văn An, mã số HS-12345, email an.nguyen@gmail.com, sđt 0912345678, CCCD 001200001234 đã nộp bài.";
            const { sanitized, pseudonymMap } = sanitizeTextPII(rawText, {
                name: "Nguyễn Văn An",
                studentCode: "HS-12345",
                email: "an.nguyen@gmail.com",
                phone: "0912345678",
            });

            expect(sanitized).not.toContain("Nguyễn Văn An");
            expect(sanitized).not.toContain("HS-12345");
            expect(sanitized).not.toContain("an.nguyen@gmail.com");
            expect(sanitized).not.toContain("0912345678");
            expect(sanitized).not.toContain("001200001234");

            expect(sanitized).toContain("Học sinh A");
            expect(sanitized).toContain("HS_ANONYMOUS_01");
            expect(sanitized).toContain("[ID_ANONYMIZED]");
            expect(pseudonymMap["Nguyễn Văn An"]).toBe("Học sinh A");
        });

        it("should compute deterministic SHA-256 hash for identical data", () => {
            const data1 = { subject: "Toán", grade: 6, topic: "Số học" };
            const data2 = { topic: "Số học", grade: 6, subject: "Toán" };

            const hash1 = computeSourceDataHash(data1);
            const hash2 = computeSourceDataHash(data2);
            expect(hash1).toBe(hash2);
            expect(hash1.length).toBe(64); // SHA-256 hex string
        });

        it("should sanitize nested JSON context completely for AI consumption", () => {
            const context = {
                student: { name: "Trần Thị Bé", code: "HS-67890" },
                submission: { note: "Liên hệ phụ huynh qua số 0987654321" },
            };

            const result = sanitizeContextForAI(context, {
                name: "Trần Thị Bé",
                studentCode: "HS-67890",
            });

            expect(JSON.stringify(result.sanitizedData)).not.toContain("Trần Thị Bé");
            expect(JSON.stringify(result.sanitizedData)).not.toContain("0987654321");
            expect(result.sourceHash).toBeDefined();
        });
    });

    // =========================================================================
    // 2. Task 1: Question Generation Schema Validation
    // =========================================================================
    describe("Task 1: Question Generation Zod Schema", () => {
        it("should accept valid standard-aligned multiple choice questions", () => {
            const validPayload = {
                subject: "Toán học",
                grade_level: 6,
                topic: "Phân số",
                questions: [
                    {
                        id: "q1",
                        question_text: "Kết quả của phép tính 1/2 + 1/4 bằng bao nhiêu?",
                        question_type: "multiple_choice",
                        options: [
                            { id: "A", text: "3/4" },
                            { id: "B", text: "2/6" },
                            { id: "C", text: "1/8" },
                            { id: "D", text: "5/4" },
                        ],
                        correct_answer: "A",
                        explanation: "Quy đồng mẫu số: 1/2 = 2/4. Khi đó 2/4 + 1/4 = 3/4.",
                        difficulty: "medium",
                        points: 1.0,
                    },
                ],
            };

            const result = questionGenerationSchema.safeParse(validPayload);
            expect(result.success).toBe(true);
        });

        it("should reject multiple choice question with less than 4 options", () => {
            const invalidPayload = {
                subject: "Toán học",
                grade_level: 6,
                topic: "Phân số",
                questions: [
                    {
                        id: "q1",
                        question_text: "Kết quả của phép tính 1/2 + 1/4 bằng bao nhiêu?",
                        question_type: "multiple_choice",
                        options: [
                            { id: "A", text: "3/4" },
                            { id: "B", text: "2/6" },
                        ],
                        correct_answer: "A",
                        explanation: "Giải thích...",
                    },
                ],
            };

            const result = questionGenerationSchema.safeParse(invalidPayload);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain("đúng 4 phương án");
            }
        });

        it("should reject question with placeholder text", () => {
            const placeholderPayload = {
                subject: "Toán học",
                grade_level: 6,
                topic: "Phân số",
                questions: [
                    {
                        id: "q1",
                        question_text: "Câu hỏi mẫu số 1: Placeholder nội dung ở đây",
                        question_type: "multiple_choice",
                        options: [
                            { id: "A", text: "Đáp án A" },
                            { id: "B", text: "Lựa chọn 2" },
                            { id: "C", text: "Phương án 3" },
                            { id: "D", text: "Phương án 4" },
                        ],
                        correct_answer: "A",
                        explanation: "Giải thích...",
                    },
                ],
            };

            const result = questionGenerationSchema.safeParse(placeholderPayload);
            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // 3. Task 2: Rubric Feedback Schema Validation & Banned Words Gate
    // =========================================================================
    describe("Task 2: Rubric Feedback Zod Schema & Safety Rules", () => {
        it("should accept constructive pedagogical feedback within rubric limits", () => {
            const validFeedback = {
                criteria_feedback: [
                    {
                        criterion_id: "crit-1",
                        criterion_name: "Lập luận toán học",
                        suggested_score: 2.5,
                        max_score: 3.0,
                        evidence_quote: "Học sinh đã trình bày đúng các bước biến đổi trung gian.",
                        feedback_text: "Em đã nắm vững quy tắc giải phương trình bậc nhất.",
                    },
                ],
                overall_feedback: {
                    strengths: "Tư duy logic tốt, trình bày bài bản sạch đẹp.",
                    areas_for_improvement: "Cần chú ý điều kiện xác định của ẩn số ở đầu bài toán.",
                    next_steps: "Làm thêm 3 bài tập về phương trình chứa ẩn ở mẫu.",
                },
            };

            const result = rubricFeedbackSchema.safeParse(validFeedback);
            expect(result.success).toBe(true);
        });

        it("should reject feedback where suggested_score exceeds max_score", () => {
            const invalidScore = {
                criteria_feedback: [
                    {
                        criterion_id: "crit-1",
                        criterion_name: "Lập luận toán học",
                        suggested_score: 3.5, // > max_score 3.0
                        max_score: 3.0,
                        evidence_quote: "Minh chứng...",
                        feedback_text: "Nhận xét...",
                    },
                ],
                overall_feedback: {
                    strengths: "Tốt...",
                    areas_for_improvement: "Cần cải thiện...",
                    next_steps: "Bước tiếp theo...",
                },
            };

            const result = rubricFeedbackSchema.safeParse(invalidScore);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain("không được vượt quá điểm tối đa");
            }
        });

        it("NON-NEGOTIABLE: should strictly reject feedback containing banned accusations or insults", () => {
            const defamatoryFeedback = {
                criteria_feedback: [
                    {
                        criterion_id: "crit-1",
                        criterion_name: "Kỹ năng làm bài",
                        suggested_score: 0,
                        max_score: 2.0,
                        evidence_quote: "Bài làm giống hệt bạn bên cạnh",
                        feedback_text: "Học sinh lười học và chắc chắn có hành vi gian lận quay cóp.",
                    },
                ],
                overall_feedback: {
                    strengths: "Không có",
                    areas_for_improvement: "Quá dốt nát và vô ý thức",
                    next_steps: "Cần kỷ luật ngay",
                },
            };

            const result = rubricFeedbackSchema.safeParse(defamatoryFeedback);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain("vi phạm quy chuẩn an toàn");
            }
        });
    });

    // =========================================================================
    // 4. Task 3: Early Intervention Recommendation Validation
    // =========================================================================
    describe("Task 3: Early Intervention Recommendation Zod Schema", () => {
        it("should accept objective factual intervention plans with target timelines", () => {
            const validPlan = {
                risk_level: "medium" as const,
                primary_concern: "attendance" as const,
                observed_patterns: "Học sinh có 3 buổi vắng không phép trong vòng 2 tuần qua, tập trung vào các tiết đầu ngày.",
                recommended_actions: [
                    {
                        action_type: "parent_consultation" as const,
                        title: "Họp trao đổi phối hợp với phụ huynh",
                        description: "Liên hệ phụ huynh để nắm bắt hoàn cảnh gia đình và thỏa thuận lịch đưa đón học sinh đúng giờ.",
                        target_timeline_days: 7,
                    },
                ],
                parent_communication_draft: "Kính gửi Quý Phụ huynh, nhà trường xin trân trọng thông báo về tình hình chuyên cần gần đây của em và mong muốn có buổi trao đổi ngắn để cùng hỗ trợ em học tập tốt hơn.",
            };

            const result = earlyInterventionRecommendationSchema.safeParse(validPlan);
            expect(result.success).toBe(true);
        });

        it("should reject intervention draft with speculative moral degradation", () => {
            const abusivePlan = {
                risk_level: "high" as const,
                primary_concern: "academic" as const,
                observed_patterns: "Học sinh hư hỏng, lười biếng, gia đình vô trách nhiệm.",
                recommended_actions: [
                    {
                        action_type: "counseling" as const,
                        title: "Cảnh cáo trước toàn trường",
                        description: "Phạt học sinh và buộc thôi học.",
                        target_timeline_days: 3,
                    },
                ],
                parent_communication_draft: "Phụ huynh nuôi dạy con quá kém cỏi.",
            };

            const result = earlyInterventionRecommendationSchema.safeParse(abusivePlan);
            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // 5. Circuit Breaker State Transition
    // =========================================================================
    describe("Circuit Breaker State Transitions", () => {
        const testSchool = "school-cb-test-01";

        it("should remain CLOSED under normal conditions", () => {
            recordAiSuccess(testSchool);
            expect(getCircuitState(testSchool)).toBe("CLOSED");
        });

        it("should transition to OPEN after 3 consecutive failures to protect system", () => {
            recordAiFailure(testSchool);
            recordAiFailure(testSchool);
            expect(getCircuitState(testSchool)).toBe("CLOSED");

            recordAiFailure(testSchool); // 3rd failure
            expect(getCircuitState(testSchool)).toBe("OPEN");
        });

        it("should reset to CLOSED when recorded as success", () => {
            recordAiSuccess(testSchool);
            expect(getCircuitState(testSchool)).toBe("CLOSED");
        });
    });
});
