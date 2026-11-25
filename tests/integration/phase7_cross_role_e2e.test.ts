import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExamSnapshot } from "@/lib/exams/exam-snapshot";
import { saveExamDraftWithVersioning } from "@/lib/actions/submission-draft";
import { gradeExamSubmission } from "@/lib/actions/grading";
import { maskSubmissionForRole } from "@/lib/grading/score-visibility";
import { verifyParentAccessToStudent } from "@/lib/auth/parent-boundary";
import { evaluateAcademicSignal } from "@/lib/interventions/detector";
import { generateInterventionRecommendationDraft } from "@/lib/ai/ai-service";
import { approveAiJobAction, applyApprovedInterventionAction } from "@/lib/actions/ai-review";

// Mock Database & State for Cross-Role Lifecycle E2E
const mockDb = {
    exams: new Map<string, any>(),
    attempts: new Map<string, any>(),
    submissions: new Map<string, any>(),
    adjustments: [] as any[],
    auditLogs: [] as any[],
    parentLinks: new Map<string, any>(),
    cases: new Map<string, any>(),
    actions: [] as any[],
    aiJobs: new Map<string, any>(),
};

vi.mock("@/lib/auth/authorize", () => ({
    AccessError: class AccessError extends Error {},
    requireActor: async (roles?: string[]) => {
        if (roles?.includes("teacher")) {
            return { id: "teacher-001", role: "teacher", roles: ["teacher"], schoolId: "00000000-0000-0000-0001-000000000000" };
        }
        return { id: "student-001", role: "student", roles: ["student"], schoolId: "00000000-0000-0000-0001-000000000000" };
    },
    requireResourceAccess: async () => ({ resource: { id: "exam-math-final-01" } }),
    requireRecordAccess: async () => true,
}));

vi.mock("@/lib/supabase/admin", () => {
    return {
        createAdminClient: () => ({
            rpc: async (name: string, args: Record<string, any>) => {
                if (name === "set_school_grade") {
                    const row=mockDb.submissions.get(args.p_submission);
                    if (!row) return {data:null,error:{message:"SUBMISSION_NOT_FOUND"}};
                    if(row.score!==null&&row.score!==args.p_score)mockDb.adjustments.push({old_score:row.score,new_score:args.p_score});
                    row.score=args.p_score;row.grading_status=args.p_publish?"published":"draft";
                    return {data:row.grading_status,error:null};
                }
                return { data: { allowed: true, tokens_used: 100, token_quota: 500000 }, error: null };
            },
            from: (table: string) => {
                if (table === "exams") {
                    return {
                        select: () => ({
                            eq: (_field: string, val: string) => ({
                                single: async () => ({ data: mockDb.exams.get(val) || null, error: null }),
                            }),
                        }),
                        update: (payload: any) => ({
                            eq: (_field: string, val: string) => {
                                const ex = mockDb.exams.get(val);
                                if (ex) mockDb.exams.set(val, { ...ex, ...payload });
                                return { data: null, error: null };
                            },
                        }),
                    };
                }

                if (table === "exam_attempts") {
                    return {
                        select: () => {
                            let currentAttemptId = "";
                            return {
                                eq: (f1: string, v1: string) => {
                                    if (f1 === "id") currentAttemptId = v1;
                                    return {
                                        eq: (f2: string, v2: string) => {
                                            if (f2 === "id") currentAttemptId = v2;
                                            return {
                                                single: async () => ({
                                                    data: mockDb.attempts.get(currentAttemptId) || null,
                                                    error: null,
                                                }),
                                            };
                                        },
                                    };
                                },
                            };
                        },
                        update: (updates: any) => ({
                            eq: (_f1: string, attemptId: string) => ({
                                eq: (_f2: string, clientVer: number) => {
                                    const current = mockDb.attempts.get(attemptId);
                                    if (!current || current.draft_version !== clientVer) {
                                        return {
                                            is: () => ({
                                                gt: () => ({
                                                    select: () => ({
                                                        maybeSingle: async () => ({ data: null, error: null }), // Conflict!
                                                    }),
                                                }),
                                            }),
                                        };
                                    }
                                    const nextVer = clientVer + 1;
                                    const updated = { ...current, ...updates, draft_version: nextVer };
                                    mockDb.attempts.set(attemptId, updated);
                                    return {
                                        is: () => ({
                                            gt: () => ({
                                                select: () => ({
                                                    maybeSingle: async () => ({ data: { draft_version: nextVer }, error: null }),
                                                }),
                                            }),
                                        }),
                                    };
                                },
                            }),
                        }),
                    };
                }

                if (table === "exam_submissions") {
                    return {
                        select: () => ({
                            eq: (_field: string, val: string) => ({
                                single: async () => ({ data: mockDb.submissions.get(val) || null, error: null }),
                                maybeSingle: async () => ({ data: mockDb.submissions.get(val) || null, error: null }),
                            }),
                        }),
                        insert: (payload: any) => ({
                            select: () => ({
                                single: async () => {
                                    const record = { id: payload.id || "sub-" + Date.now(), ...payload };
                                    mockDb.submissions.set(record.id, record);
                                    return { data: record, error: null };
                                },
                            }),
                        }),
                        update: (payload: any) => ({
                            eq: (_field: string, val: string) => {
                                const s = mockDb.submissions.get(val);
                                if (s) mockDb.submissions.set(val, { ...s, ...payload });
                                return { data: null, error: null };
                            },
                        }),
                    };
                }

                if (table === "score_adjustments") {
                    return {
                        insert: async (payload: any) => {
                            mockDb.adjustments.push(payload);
                            return { data: payload, error: null };
                        },
                    };
                }

                if (table === "audit_events") {
                    return {
                        insert: (payload: any) => {
                            mockDb.auditLogs.push(payload);
                            return {
                                select: () => ({
                                    single: async () => ({ data: { id: "audit-1", ...payload }, error: null }),
                                }),
                            };
                        },
                    };
                }

                if (table === "parent_students") {
                    return {
                        select: () => ({
                            eq: (_f1: string, v1: string) => ({
                                eq: (_f2: string, v2: string) => ({
                                    maybeSingle: async () => ({
                                        data: mockDb.parentLinks.get(`${v1}_${v2}`) || null,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }

                if (table === "intervention_cases") {
                    return {
                        select: () => ({
                            eq: (_field: string, value: string) => ({
                                maybeSingle: async () => ({ data: mockDb.cases.get(value) || null, error: null }),
                                eq: () => ({
                                    in: () => ({
                                        maybeSingle: async () => ({ data: null, error: null }),
                                    }),
                                }),
                            }),
                        }),
                        insert: (payload: any) => ({
                            select: () => ({
                                single: async () => {
                                    const id = "case-e2e-" + Date.now();
                                    const c = { id, ...payload };
                                    mockDb.cases.set(id, c);
                                    return { data: c, error: null };
                                },
                            }),
                        }),
                    };
                }

                if (table === "intervention_actions") {
                    return {
                        insert: (payload: any) => ({
                            select: () => ({
                                single: async () => {
                                    const id = "act-" + Date.now();
                                    const a = { id, ...payload };
                                    mockDb.actions.push(a);
                                    return { data: a, error: null };
                                },
                            }),
                        }),
                    };
                }

                if (table === "schools") {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({ data: { id: "00000000-0000-0000-0001-000000000000", ai_enabled: true }, error: null }),
                            }),
                        }),
                    };
                }

                if (table === "learning_ai_jobs") {
                    return {
                        insert: (payload: any) => ({
                            select: () => ({
                                single: async () => {
                                    const id = "ai-job-" + Date.now();
                                    const j = { id, ...payload };
                                    mockDb.aiJobs.set(id, j);
                                    return { data: j, error: null };
                                },
                            }),
                        }),
                        select: () => ({
                            eq: (_f: string, v: string) => ({
                                maybeSingle: async () => ({ data: mockDb.aiJobs.get(v) || null, error: null }),
                            }),
                        }),
                        update: (payload: any) => ({
                            eq: (_f: string, v: string) => {
                                const j = mockDb.aiJobs.get(v);
                                if (j) mockDb.aiJobs.set(v, { ...j, ...payload });
                                return { data: null, error: null };
                            },
                        }),
                    };
                }

                if (table === "outbox_events") {
                    return {
                        insert: () => ({
                            select: () => ({
                                single: async () => ({ data: { id: "outbox-1" }, error: null }),
                            }),
                        }),
                    };
                }

                return {};
            },
        }),
    };
});

describe("Phase 7: Full Cross-Role Lifecycle E2E Integration Suite", () => {
    beforeEach(() => {
        mockDb.exams.clear();
        mockDb.attempts.clear();
        mockDb.submissions.clear();
        mockDb.adjustments.length = 0;
        mockDb.auditLogs.length = 0;
        mockDb.parentLinks.clear();
        mockDb.cases.clear();
        mockDb.actions.length = 0;
        mockDb.aiJobs.clear();
    });

    it("should execute the complete lifecycle across Admin, Teacher, Student, Parent and AI Assistant seamlessly", async () => {
        const SCHOOL_ID = "00000000-0000-0000-0001-000000000000";
        const TEACHER_ID = "teacher-001";
        const STUDENT_ID = "student-001";
        const PARENT_ID = "parent-001";
        const EXAM_ID = "exam-math-final-01";

        // -------------------------------------------------------------
        // STEP 1: Teacher creates exam & publishes snapshot
        // -------------------------------------------------------------
        const questionsOriginal = [
            {
                id: "q1",
                question: "1 + 1 = ?",
                points: 5,
                options: [
                    { id: "opt-1", text: "2", isCorrect: true },
                    { id: "opt-2", text: "3", isCorrect: false },
                ],
            },
            {
                id: "q2",
                question: "2 * 3 = ?",
                points: 5,
                options: [
                    { id: "opt-3", text: "6", isCorrect: true },
                    { id: "opt-4", text: "5", isCorrect: false },
                ],
            },
        ];

        mockDb.exams.set(EXAM_ID, {
            id: EXAM_ID,
            school_id: SCHOOL_ID,
            teacher_id: TEACHER_ID,
            title: "Kiểm tra Học kỳ I - Toán",
            total_points: 10,
            max_attempts: 1,
            publication_status: "draft",
        });

        const snapshot = createExamSnapshot(questionsOriginal, 10);
        expect(snapshot.questions.length).toBe(2);

        // Update exam with snapshot and set to published
        mockDb.exams.set(EXAM_ID, {
            ...mockDb.exams.get(EXAM_ID),
            questions_snapshot: snapshot.questions,
            publication_status: "published",
        });

        const publishedExam = mockDb.exams.get(EXAM_ID);
        expect(publishedExam.publication_status).toBe("published");
        expect(publishedExam.questions_snapshot.length).toBe(2);

        // -------------------------------------------------------------
        // STEP 2: Student takes exam, autosaves drafts with versioning
        // -------------------------------------------------------------
        const ATTEMPT_ID = "attempt-001";
        const SUB_ID = "sub-student-001";
        mockDb.attempts.set(ATTEMPT_ID, {
            id: ATTEMPT_ID,
            exam_id: EXAM_ID,
            student_id: STUDENT_ID,
            draft_answers: [],
            draft_version: 0,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            submitted_at: null,
            snapshot: { questions: questionsOriginal },
        });

        // Tab A: lưu draft v1
        const saveV1 = await saveExamDraftWithVersioning({
            attemptId: ATTEMPT_ID,
            answers: [{ selectedOptionId: "opt-1" }],
            clientVersion: 0,
        });
        expect(saveV1.success).toBe(true);
        expect(saveV1.version).toBe(1);

        // Tab B: cố tình gửi draft v0 đè lên -> Nhận lỗi 409 Conflict
        const conflictRes = await saveExamDraftWithVersioning({
            attemptId: ATTEMPT_ID,
            answers: [{ selectedOptionId: "opt-2" }],
            clientVersion: 0,
        });
        expect(conflictRes.success).toBe(false);
        expect(conflictRes.code).toBe("VERSION_CONFLICT");

        // -------------------------------------------------------------
        // STEP 3: Teacher grades with Rubric, marks draft, then publishes
        // -------------------------------------------------------------
        mockDb.submissions.set(SUB_ID, {
            id: SUB_ID,
            exam_id: EXAM_ID,
            student_id: STUDENT_ID,
            school_id: SCHOOL_ID,
            total_points: 10,
            score: null,
            grading_status: "draft",
        });

        // 3.2 Student & Parent không được thấy điểm nháp
        const studentView = maskSubmissionForRole(mockDb.submissions.get(SUB_ID), "student");
        expect(studentView?.score).toBeNull();
        expect(studentView?.display_status).toBe("Đang chấm");

        // 3.3 Teacher công bố điểm ban đầu (3.5)
        const publishRes = await gradeExamSubmission({
            submissionId: SUB_ID,
            newScore: 3.5,
            publishNow: true,
        });
        expect(publishRes.success).toBe(true);

        // 3.4 Teacher điều chỉnh điểm đã công bố (từ 3.5 lên 3.75 kèm lý do giải trình)
        const adjustRes = await gradeExamSubmission({
            submissionId: SUB_ID,
            newScore: 3.75,
            reason: "Chấm thi chính thức theo barem chuẩn Sở GD",
            publishNow: true,
        });
        expect(adjustRes.success).toBe(true);
        expect(mockDb.adjustments.length).toBe(1);

        // -------------------------------------------------------------
        // STEP 4: Parent boundary check
        // -------------------------------------------------------------
        // Phụ huynh P1 đã liên kết con S1 (verified)
        mockDb.parentLinks.set(`${PARENT_ID}_${STUDENT_ID}`, {
            parent_id: PARENT_ID,
            student_id: STUDENT_ID,
            verification_status: "verified",
        });

        const parentAccessValid = await verifyParentAccessToStudent(PARENT_ID, STUDENT_ID);
        expect(parentAccessValid.allowed).toBe(true);

        // Phụ huynh P1 cố truy cập học sinh lớp khác (S2)
        const parentAccessCross = await verifyParentAccessToStudent(PARENT_ID, "student-002");
        expect(parentAccessCross.allowed).toBe(false);
        expect(parentAccessCross.error).toContain("403_FORBIDDEN");

        // -------------------------------------------------------------
        // STEP 5: Early Intervention Detection (Điểm thi thấp < 4.0)
        // -------------------------------------------------------------
        const interventionRes = await evaluateAcademicSignal({
            studentId: STUDENT_ID,
            schoolId: SCHOOL_ID,
            recentScores: [3.5, 3.0],
            consecutiveFails: 2,
        });
        expect(interventionRes.triggered).toBe(true);
        expect(interventionRes.caseId).toBeDefined();

        // -------------------------------------------------------------
        // STEP 6: Teacher requests AI assistant to propose support action
        // -------------------------------------------------------------
        const aiJobRes = await generateInterventionRecommendationDraft({
            schoolId: SCHOOL_ID,
            requestedBy: TEACHER_ID,
            studentId: STUDENT_ID,
            caseId: interventionRes.caseId,
            academicSummary: { averageScore: 3.25, recentScores: [3.5, 3.0], failingExamsCount: 2 },
            attendanceSummary: { unexcusedAbsences: 0, totalAbsences: 1, attendanceRate: 98 },
        });
        expect(aiJobRes.success).toBe(true);
        expect(aiJobRes.jobId).toBeDefined();

        // Kiểm tra Zero-autonomy: Chưa duyệt thì không thể áp dụng vào ca can thiệp
        const unapprovedApply = await applyApprovedInterventionAction({
            jobId: aiJobRes.jobId!,
            caseId: interventionRes.caseId!,
            teacherId: TEACHER_ID,
        });
        expect(unapprovedApply.success).toBe(false);

        // Giáo viên duyệt và áp dụng
        const approveRes = await approveAiJobAction({
            jobId: aiJobRes.jobId!,
            reviewerId: TEACHER_ID,
            reviewNote: "Duyệt kế hoạch phụ đạo kiến thức toán.",
        });
        expect(approveRes.success).toBe(true);

        const approvedApply = await applyApprovedInterventionAction({
            jobId: aiJobRes.jobId!,
            caseId: interventionRes.caseId!,
            teacherId: TEACHER_ID,
        });
        expect(approvedApply.success).toBe(true);
        expect(mockDb.actions.length).toBe(1);
    });
});
