import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQuestionsDraft, generateRubricFeedbackDraft, generateInterventionRecommendationDraft } from "@/lib/ai/ai-service";
import { approveAiJobAction, rejectAiJobAction, applyApprovedInterventionAction } from "@/lib/actions/ai-review";

// Mock Supabase admin client for AI governance testing
const mockJobsDb = new Map<string, any>();
const mockSchoolsDb = new Map<string, any>([
    ["school-ai-active", { id: "school-ai-active", ai_enabled: true }],
    ["school-ai-disabled", { id: "school-ai-disabled", ai_enabled: false }],
]);
const mockQuotasDb = new Map<string, any>([
    ["school-ai-active", { id: "q1", school_id: "school-ai-active", token_quota: 500000, tokens_used: 1000 }],
    ["school-quota-exceeded", { id: "q2", school_id: "school-quota-exceeded", token_quota: 10000, tokens_used: 10000 }],
]);

vi.mock("@/lib/supabase/admin", () => {
    return {
        createAdminClient: () => ({
            rpc: async (fn: string, args: any) => {
                if (fn === "check_and_consume_ai_quota") {
                    const schoolId = args.p_school_id;
                    const school = mockSchoolsDb.get(schoolId);
                    if (school && school.ai_enabled === false) {
                        return { data: { allowed: false, reason: "AI_DISABLED_FOR_SCHOOL" }, error: null };
                    }
                    const quota = mockQuotasDb.get(schoolId);
                    if (quota && (quota.tokens_used + args.p_estimated_tokens) > quota.token_quota) {
                        return { data: { allowed: false, reason: "QUOTA_EXCEEDED" }, error: null };
                    }
                    return { data: { allowed: true, tokens_used: quota?.tokens_used || 0, token_quota: quota?.token_quota || 500000 }, error: null };
                }

                if (fn === "record_ai_token_usage") {
                    return { data: null, error: null };
                }

                return { data: null, error: null };
            },
            from: (table: string) => {
                if (table === "schools") {
                    return {
                        select: () => ({
                            eq: (field: string, val: string) => ({
                                maybeSingle: async () => ({
                                    data: mockSchoolsDb.get(val) || { id: val, ai_enabled: true },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "school_ai_quotas") {
                    return {
                        select: () => ({
                            eq: (field1: string, val1: string) => ({
                                eq: (field2: string, val2: string) => ({
                                    maybeSingle: async () => ({
                                        data: mockQuotasDb.get(val1) || null,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }

                if (table === "learning_ai_jobs") {
                    return {
                        insert: (payload: any) => ({
                            select: () => ({
                                single: async () => {
                                    const id = `ai-job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                                    const record = { id, ...payload };
                                    mockJobsDb.set(id, record);
                                    return { data: record, error: null };
                                },
                            }),
                        }),
                        select: () => ({
                            eq: (field: string, val: string) => ({
                                maybeSingle: async () => ({
                                    data: mockJobsDb.get(val) || null,
                                    error: null,
                                }),
                            }),
                        }),
                        update: (updates: any) => ({
                            eq: (field: string, val: string) => {
                                const existing = mockJobsDb.get(val);
                                if (existing) {
                                    const updated = { ...existing, ...updates };
                                    mockJobsDb.set(val, updated);
                                }
                                return { data: null, error: null };
                            },
                        }),
                    };
                }

                if (table === "intervention_actions") {
                    return {
                        insert: (payload: any) => ({
                            select: () => ({
                                single: async () => ({
                                    data: { id: "action-123", ...payload },
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }

                if (table === "audit_events") {
                    return {
                        insert: async () => ({ data: null, error: null }),
                    };
                }

                return {};
            },
        }),
    };
});

describe("Phase 6: AI Integration & Zero-Autonomy Boundary Tests", () => {
    beforeEach(() => {
        mockJobsDb.clear();
    });

    // -------------------------------------------------------------------------
    // 1. Zero Autonomy Verification: AI drafts must NEVER auto-publish
    // -------------------------------------------------------------------------
    describe("Zero Autonomy Verification", () => {
        it("should initialize all generated AI jobs in 'draft' review status", async () => {
            const res = await generateQuestionsDraft({
                schoolId: "school-ai-active",
                requestedBy: "teacher-t1",
                subject: "Toán",
                gradeLevel: 6,
                topic: "Số nguyên",
                questionCount: 2,
            });

            expect(res.success).toBe(true);
            expect(res.jobId).toBeDefined();

            const savedJob = mockJobsDb.get(res.jobId!);
            expect(savedJob).toBeDefined();
            expect(savedJob.status).toBe("ready");
            expect(savedJob.review_status).toBe("draft"); // Luôn là draft!
            expect(savedJob.approved_payload).toBeUndefined();
            expect(savedJob.reviewer_id).toBeUndefined();
        });

        it("should block applying unapproved AI draft to intervention records", async () => {
            // Tạo 1 job can thiệp sớm ở trạng thái draft
            const genRes = await generateInterventionRecommendationDraft({
                schoolId: "school-ai-active",
                requestedBy: "teacher-t1",
                studentId: "student-s1",
                caseId: "case-c1",
                academicSummary: { averageScore: 4.2, recentScores: [4.0, 4.5], failingExamsCount: 2 },
                attendanceSummary: { unexcusedAbsences: 3, totalAbsences: 4, attendanceRate: 85 },
            });

            expect(genRes.success).toBe(true);
            const draftJobId = genRes.jobId!;

            // Cố tình áp dụng khi chưa giáo viên nào bấm Duyệt
            const applyRes = await applyApprovedInterventionAction({
                jobId: draftJobId,
                caseId: "case-c1",
                teacherId: "teacher-t1",
            });

            expect(applyRes.success).toBe(false);
            expect(applyRes.error).toContain("CHẶN TRUY CẬP");
            expect(applyRes.error).toContain("chưa được giáo viên phê duyệt");
        });
    });

    // -------------------------------------------------------------------------
    // 2. Human Review & Approval Flow
    // -------------------------------------------------------------------------
    describe("Human-in-the-loop Review Workflow", () => {
        it("should allow teacher to approve AI draft and record audit", async () => {
            const genRes = await generateRubricFeedbackDraft({
                schoolId: "school-ai-active",
                requestedBy: "teacher-t1",
                submissionId: "sub-1",
                studentAnswerText: "Học sinh đã giải phương trình và tìm ra nghiệm x = 5.",
                rubricCriteria: [
                    { id: "c1", name: "Đúng kết quả", max_score: 5.0 },
                    { id: "c2", name: "Trình bày", max_score: 5.0 },
                ],
            });

            const jobId = genRes.jobId!;

            // Giáo viên duyệt
            const approveRes = await approveAiJobAction({
                jobId,
                reviewerId: "teacher-t1",
                reviewNote: "Đồng ý với nhận xét của AI.",
            });

            expect(approveRes.success).toBe(true);
            expect(approveRes.reviewStatus).toBe("approved");

            const updatedJob = mockJobsDb.get(jobId);
            expect(updatedJob.review_status).toBe("approved");
            expect(updatedJob.reviewer_id).toBe("teacher-t1");
            expect(updatedJob.reviewed_at).toBeDefined();
            expect(updatedJob.approved_payload).toEqual(updatedJob.raw_output);
        });

        it("should allow teacher to modify content before approving", async () => {
            const genRes = await generateQuestionsDraft({
                schoolId: "school-ai-active",
                requestedBy: "teacher-t1",
                subject: "Văn học",
                gradeLevel: 7,
                topic: "Ca dao dân ca",
                questionCount: 1,
            });

            const jobId = genRes.jobId!;
            const modifiedPayload = {
                subject: "Văn học",
                grade_level: 7,
                topic: "Ca dao dân ca",
                questions: [
                    {
                        id: "q_custom",
                        question_text: "Bài ca dao 'Công cha như núi Thái Sơn' ca ngợi điều gì?",
                        question_type: "multiple_choice",
                        options: [
                            { id: "A", text: "Công ơn trời biển của cha mẹ đối với con cái" },
                            { id: "B", text: "Tình cảm anh em một nhà" },
                            { id: "C", text: "Tình bạn bè trong sáng" },
                            { id: "D", text: "Tình thầy trò cao quý" },
                        ],
                        correct_answer: "A",
                        explanation: "Bài ca dao nói về công lao to lớn của cha mẹ.",
                        difficulty: "easy",
                        points: 2.0,
                    },
                ],
            };

            const approveRes = await approveAiJobAction({
                jobId,
                reviewerId: "teacher-t1",
                modifiedPayload,
                reviewNote: "Giáo viên đã sửa câu hỏi cho gần gũi với bài học hơn.",
            });

            expect(approveRes.success).toBe(true);
            const updatedJob = mockJobsDb.get(jobId);
            expect(updatedJob.approved_payload).toEqual(modifiedPayload);
        });

        it("should allow teacher to reject AI draft with required reason", async () => {
            const genRes = await generateQuestionsDraft({
                schoolId: "school-ai-active",
                requestedBy: "teacher-t1",
                subject: "Lịch sử",
                gradeLevel: 8,
                topic: "Cách mạng Pháp",
            });

            const jobId = genRes.jobId!;

            // Cố tình từ chối không có lý do
            const emptyReasonRes = await rejectAiJobAction({
                jobId,
                reviewerId: "teacher-t1",
                rejectionReason: "",
            });
            expect(emptyReasonRes.success).toBe(false);

            // Từ chối với lý do rõ ràng
            const rejectRes = await rejectAiJobAction({
                jobId,
                reviewerId: "teacher-t1",
                rejectionReason: "Câu hỏi quá khó so với trình độ học sinh lớp 8.",
            });

            expect(rejectRes.success).toBe(true);
            expect(rejectRes.reviewStatus).toBe("rejected");

            const updatedJob = mockJobsDb.get(jobId);
            expect(updatedJob.review_status).toBe("rejected");
            expect(updatedJob.review_note).toContain("Câu hỏi quá khó");
        });
    });

    // -------------------------------------------------------------------------
    // 3. AI Safety Gate & School Kill Switch
    // -------------------------------------------------------------------------
    describe("AI Kill Switch & Quota Gate", () => {
        it("should refuse AI operation immediately when school ai_enabled = false without crashing", async () => {
            const res = await generateQuestionsDraft({
                schoolId: "school-ai-disabled",
                requestedBy: "teacher-t1",
                subject: "Hóa học",
                gradeLevel: 8,
                topic: "Oxit",
            });

            expect(res.success).toBe(false);
            expect(res.reason).toBe("AI_DISABLED_FOR_SCHOOL");
            expect(res.error).toContain("bị tắt theo chính sách");
        });

        it("should reject AI operation when token quota is exceeded", async () => {
            const res = await generateQuestionsDraft({
                schoolId: "school-quota-exceeded",
                requestedBy: "teacher-t1",
                subject: "Sinh học",
                gradeLevel: 9,
                topic: "Di truyền",
            });

            expect(res.success).toBe(false);
            expect(res.reason).toBe("QUOTA_EXCEEDED");
        });
    });
});
