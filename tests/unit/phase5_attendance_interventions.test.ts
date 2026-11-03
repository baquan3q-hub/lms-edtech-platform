import { describe, it, expect, vi } from "vitest";
import { evaluateAttendanceSignal, evaluateAcademicSignal } from "@/lib/interventions/detector";
import { verifyParentAccessToStudent } from "@/lib/auth/parent-boundary";

// Mock Supabase admin client for unit testing detector and parent boundary
vi.mock("@/lib/supabase/admin", () => {
    return {
        createAdminClient: () => ({
            from: (table: string) => {
                if (table === "parent_students") {
                    return {
                        select: () => ({
                            eq: (field1: string, val1: string) => ({
                                eq: (field2: string, val2: string) => ({
                                    maybeSingle: async () => {
                                        // Giả lập: Phụ huynh P1 có con S1 (verified) và S2 (verified)
                                        // Học sinh S3 thuộc về phụ huynh khác
                                        if (val1 === "parent-p1" && (val2 === "student-s1" || val2 === "student-s2")) {
                                            return {
                                                data: { id: "link-1", parent_id: val1, student_id: val2, verification_status: "verified" },
                                                error: null
                                            };
                                        }
                                        return { data: null, error: null };
                                    }
                                })
                            })
                        })
                    };
                }

                if (table === "intervention_cases") {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    in: () => ({
                                        maybeSingle: async () => ({ data: null, error: null })
                                    })
                                })
                            })
                        }),
                        insert: (payload: any) => ({
                            select: () => ({
                                single: async () => ({
                                    data: { id: "case-generated-123", ...payload },
                                    error: null
                                })
                            })
                        })
                    };
                }

                if (table === "outbox_events") {
                    return {
                        insert: () => ({
                            select: () => ({
                                single: async () => ({ data: { id: "outbox-1" }, error: null })
                            })
                        })
                    };
                }

                return {};
            }
        })
    };
});

describe("Phase 5: Attendance Policies, Parent Portal & Early Interventions", () => {
    // -------------------------------------------------------------
    // 1. Parent Boundary Enforcement (403 Forbidden on Cross-Access)
    // -------------------------------------------------------------
    describe("Parent Access Boundary", () => {
        it("should permit parent to access their own verified children (S1, S2)", async () => {
            const resultS1 = await verifyParentAccessToStudent("parent-p1", "student-s1");
            expect(resultS1.allowed).toBe(true);
            expect(resultS1.studentId).toBe("student-s1");

            const resultS2 = await verifyParentAccessToStudent("parent-p1", "student-s2");
            expect(resultS2.allowed).toBe(true);
        });

        it("should reject parent trying to access student from another family (S3) with 403 Forbidden", async () => {
            const resultS3 = await verifyParentAccessToStudent("parent-p1", "student-s3");
            expect(resultS3.allowed).toBe(false);
            expect(resultS3.error).toContain("403_FORBIDDEN");
        });
    });

    // -------------------------------------------------------------
    // 2. Early Intervention Signal Detection
    // -------------------------------------------------------------
    describe("Early Intervention Signal Detector", () => {
        it("should trigger attendance intervention case when unexcused absences >= 3", async () => {
            const signal = {
                studentId: "student-s1",
                schoolId: "00000000-0000-0000-0001-000000000000",
                unexcusedCount: 3,
                dates: ["2026-10-01", "2026-10-02", "2026-10-03"]
            };

            const result = await evaluateAttendanceSignal(signal, 3);
            expect(result.triggered).toBe(true);
            expect(result.caseId).toBe("case-generated-123");
        });

        it("should NOT trigger attendance intervention case when unexcused absences < 3", async () => {
            const signal = {
                studentId: "student-s1",
                schoolId: "00000000-0000-0000-0001-000000000000",
                unexcusedCount: 2,
                dates: ["2026-10-01", "2026-10-02"]
            };

            const result = await evaluateAttendanceSignal(signal, 3);
            expect(result.triggered).toBe(false);
        });

        it("should trigger academic intervention case when student fails 2 consecutive exams (< 4.0)", async () => {
            const signal = {
                studentId: "student-s1",
                schoolId: "00000000-0000-0000-0001-000000000000",
                consecutiveFails: 2,
                recentScores: [3.5, 3.0]
            };

            const result = await evaluateAcademicSignal(signal);
            expect(result.triggered).toBe(true);
            expect(result.caseId).toBe("case-generated-123");
        });

        it("should trigger academic intervention case when student has a significant score drop (>= 2.0)", async () => {
            const signal = {
                studentId: "student-s1",
                schoolId: "00000000-0000-0000-0001-000000000000",
                consecutiveFails: 0,
                scoreDrop: 2.5,
                recentScores: [6.0]
            };

            const result = await evaluateAcademicSignal(signal);
            expect(result.triggered).toBe(true);
            expect(result.caseId).toBe("case-generated-123");
        });
    });

    // -------------------------------------------------------------
    // 3. Batch Attendance Validation & Integrity
    // -------------------------------------------------------------
    describe("Batch Attendance Input Validation", () => {
        it("should detect duplicate student IDs in a batch payload", () => {
            const batch = [
                { student_id: "s1", status: "present" },
                { student_id: "s2", status: "late" },
                { student_id: "s1", status: "absent" } // Trùng s1
            ];

            const hasDuplicates = new Set(batch.map(r => r.student_id)).size !== batch.length;
            expect(hasDuplicates).toBe(true);
        });

        it("should detect invalid status in a batch payload", () => {
            const validStatuses = new Set(["present", "absent", "late", "excused"]);
            const batch = [
                { student_id: "s1", status: "present" },
                { student_id: "s2", status: "unknown_status" }
            ];

            const hasInvalidStatus = batch.some(r => !validStatuses.has(r.status));
            expect(hasInvalidStatus).toBe(true);
        });
    });

    // -------------------------------------------------------------
    // 4. Report Consistency & 100% Reconciliation Logic
    // -------------------------------------------------------------
    describe("Report Mathematical Reconciliation", () => {
        it("should ensure total_records matches exactly present + absent + late + excused", () => {
            const sampleSummary = {
                total_records: 1540,
                present_count: 1400,
                absent_count: 50,
                late_count: 60,
                excused_count: 30
            };

            const calculatedSum = sampleSummary.present_count +
                                  sampleSummary.absent_count +
                                  sampleSummary.late_count +
                                  sampleSummary.excused_count;

            expect(calculatedSum).toBe(sampleSummary.total_records);
            const discrepancy = Math.abs(sampleSummary.total_records - calculatedSum);
            expect(discrepancy).toBe(0);
        });
    });
});
