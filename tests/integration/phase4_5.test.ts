import { describe, it, expect, vi } from "vitest";
import { saveExamDraftWithVersioning } from "@/lib/actions/submission-draft";
import { closeInterventionCase } from "@/lib/interventions/actions";

// Mock authorize and admin supabase for integration test simulation
vi.mock("@/lib/auth/authorize", () => ({
    requireActor: async (allowedRoles?: string[]) => ({ id: "mock-actor-id", role: allowedRoles?.[0] || "teacher" }),
    requireRecordAccess: async () => ({ record: { id: "mock-id" } }),
    requireResourceAccess: async () => ({ resource: { id: "mock-resource-id" } }),
    requireClassAccess: async () => true
}));

let mockDraftVersion = 1;
const mockIsSubmitted = false;
const mockExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // Còn 30 phút

vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
        from: (table: string) => {
            if (table === "exam_attempts") {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: async () => ({
                                    data: {
                                        id: "attempt-1",
                                        exam_id: "exam-1",
                                        student_id: "mock-actor-id",
                                        draft_version: mockDraftVersion,
                                        expires_at: mockExpiresAt,
                                        submitted_at: mockIsSubmitted ? new Date().toISOString() : null,
                                        snapshot: { questions: [{ id: "q1", points: 10 }] }
                                    },
                                    error: null
                                })
                            })
                        })
                    }),
                    update: (updates: any) => ({
                        eq: () => ({
                            eq: (_col: string, val: number) => {
                                // Kiểm tra optimistic concurrency
                                if (val !== mockDraftVersion) {
                                    return {
                                        is: () => ({
                                            gt: () => ({
                                                select: () => ({
                                                    maybeSingle: async () => ({ data: null, error: null }) // Conflict!
                                                })
                                            })
                                        })
                                    };
                                }

                                mockDraftVersion = updates.draft_version;
                                return {
                                    is: () => ({
                                        gt: () => ({
                                            select: () => ({
                                                maybeSingle: async () => ({ data: { draft_version: mockDraftVersion }, error: null })
                                            })
                                        })
                                    })
                                };
                            }
                        })
                    })
                };
            }

            if (table === "intervention_cases") {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: {
                                    id: "case-1",
                                    school_id: "00000000-0000-0000-0001-000000000000",
                                    student_id: "student-1",
                                    status: "open",
                                    assigned_to: "mock-actor-id"
                                },
                                error: null
                            })
                        })
                    }),
                    update: (updates: any) => ({
                        eq: () => ({
                            select: () => ({
                                single: async () => ({
                                    data: { id: "case-1", ...updates },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }

            if (table === "intervention_actions") {
                return {
                    insert: () => ({
                        select: () => ({
                            single: async () => ({ data: { id: "act-1" }, error: null })
                        })
                    })
                };
            }

            if (table === "audit_events" || table === "outbox_events") {
                return {
                    insert: () => ({
                        select: () => ({
                            single: async () => ({ data: { id: "event-1" }, error: null })
                        })
                    })
                };
            }

            return {};
        }
    })
}));

describe("Integration: Phase 4 & Phase 5 Workflows", () => {
    // -------------------------------------------------------------
    // 1. Optimistic Concurrency & Draft Versioning (Tab A vs Tab B)
    // -------------------------------------------------------------
    describe("Autosave Draft Versioning (Tab A vs Tab B)", () => {
        it("should successfully save when clientVersion matches serverVersion (Tab A)", async () => {
            mockDraftVersion = 1;

            const tabAResult = await saveExamDraftWithVersioning({
                attemptId: "attempt-1",
                answers: [{ selectedOptionId: "opt-1" }],
                clientVersion: 1
            });

            expect(tabAResult.success).toBe(true);
            expect(tabAResult.version).toBe(2);
            expect(mockDraftVersion).toBe(2);
        });

        it("should reject with VERSION_CONFLICT when Tab B sends stale version 1 while server is now at version 2", async () => {
            // Server hiện tại đã ở version 2 (sau khi Tab A lưu)
            mockDraftVersion = 2;

            const tabBResult = await saveExamDraftWithVersioning({
                attemptId: "attempt-1",
                answers: [{ selectedOptionId: "opt-old" }],
                clientVersion: 1 // Gửi version 1 cũ lên
            });

            expect(tabBResult.success).toBe(false);
            expect(tabBResult.code).toBe("VERSION_CONFLICT");
            expect(tabBResult.version).toBe(2); // Giữ nguyên version 2 trên server
        });
    });

    // -------------------------------------------------------------
    // 2. Early Intervention Case Closure Validation
    // -------------------------------------------------------------
    describe("Intervention Case Closure Enforcement", () => {
        it("should reject closing an intervention case without a resolution summary", async () => {
            const result = await closeInterventionCase({
                caseId: "case-1",
                resolutionSummary: "" // Trống
            });

            expect(result.success).toBe(false);
            expect(result.code).toBe("SUMMARY_REQUIRED");
        });

        it("should successfully close case when actor and resolution summary are provided", async () => {
            const result = await closeInterventionCase({
                caseId: "case-1",
                resolutionSummary: "Đã liên hệ phụ huynh và bố trí học đạo buổi chiều; kết quả kiểm tra gần nhất đạt 7.5.",
                status: "resolved"
            });

            expect(result.success).toBe(true);
            expect(result.data?.status).toBe("resolved");
            expect(result.data?.resolution_summary).toContain("Đã liên hệ phụ huynh");
        });
    });
});
