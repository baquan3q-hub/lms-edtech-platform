import { describe, it, expect } from "vitest";
import { createExamSnapshot, getSafeSnapshotQuestions } from "@/lib/exams/exam-snapshot";
import { checkAttemptEligibility, calculateAttemptExpiry } from "@/lib/exams/attempt-manager";
import { maskSubmissionForRole } from "@/lib/grading/score-visibility";

describe("Phase 4: Learning & Publication Engine", () => {
    // -------------------------------------------------------------
    // 1. Deadline Enforcement (Server-side Clock)
    // -------------------------------------------------------------
    describe("Deadline Enforcement with Server-Side Clock", () => {
        it("should calculate expiry strictly from server start time and duration, capping at exam due date", () => {
            const serverStart = new Date("2026-10-01T08:00:00.000Z");
            const durationMinutes = 45;
            const examDueDate = "2026-10-01T08:30:00.000Z"; // Hạn đề ngắn hơn thời lượng

            const expiry = calculateAttemptExpiry(durationMinutes, examDueDate, serverStart);
            expect(expiry).toBe(examDueDate); // Bị chặn lại ở hạn đề thi
        });

        it("should reject opening new attempt if server time is past exam due date", () => {
            const exam = {
                max_attempts: 3,
                due_date: "2026-10-01T08:00:00.000Z"
            };
            const serverTime = new Date("2026-10-01T08:00:01.000Z"); // Quá 1 giây

            const result = checkAttemptEligibility(exam, [], serverTime);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("EXAM_DEADLINE_EXPIRED");
        });

        it("should allow resuming an active attempt if not expired and not yet submitted", () => {
            const exam = { max_attempts: 1, due_date: "2026-10-01T10:00:00.000Z" };
            const serverTime = new Date("2026-10-01T08:15:00.000Z");
            const existing = [
                {
                    id: "attempt-1",
                    attempt_no: 1,
                    submitted_at: null,
                    expires_at: "2026-10-01T08:45:00.000Z" // Còn 30 phút
                }
            ];

            const result = checkAttemptEligibility(exam, existing, serverTime);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("ATTEMPT_IN_PROGRESS");
            expect(result.activeAttempt?.id).toBe("attempt-1");
        });

        it("should enforce max_attempts configuration and compute next attempt number", () => {
            const exam = { max_attempts: 2, due_date: "2026-10-01T10:00:00.000Z" };
            const serverTime = new Date("2026-10-01T08:50:00.000Z");

            // Attempt 1 đã nộp
            const attemptsOne = [
                {
                    id: "att-1",
                    attempt_no: 1,
                    submitted_at: "2026-10-01T08:30:00.000Z",
                    expires_at: "2026-10-01T08:45:00.000Z"
                }
            ];

            const eligibleForSecond = checkAttemptEligibility(exam, attemptsOne, serverTime);
            expect(eligibleForSecond.allowed).toBe(true);
            expect(eligibleForSecond.nextAttemptNo).toBe(2);

            // Attempt 2 đã nộp
            const attemptsTwo = [
                ...attemptsOne,
                {
                    id: "att-2",
                    attempt_no: 2,
                    submitted_at: "2026-10-01T09:10:00.000Z",
                    expires_at: "2026-10-01T09:30:00.000Z"
                }
            ];

            const eligibleForThird = checkAttemptEligibility(exam, attemptsTwo, serverTime);
            expect(eligibleForThird.allowed).toBe(false);
            expect(eligibleForThird.reason).toBe("MAX_ATTEMPTS_REACHED");
        });
    });

    // -------------------------------------------------------------
    // 2. Exam Snapshot Immutability
    // -------------------------------------------------------------
    describe("Exam Snapshot Engine", () => {
        it("should create an immutable snapshot of exam questions", () => {
            const originalQuestions = [
                {
                    id: "q1",
                    question: "Thủ đô của Việt Nam là gì?",
                    points: 5,
                    options: [
                        { id: "opt-1", text: "Hà Nội", isCorrect: true },
                        { id: "opt-2", text: "TP. Hồ Chí Minh", isCorrect: false }
                    ]
                },
                {
                    id: "q2",
                    question: "2 + 2 = ?",
                    points: 5,
                    options: [
                        { id: "opt-3", text: "4", isCorrect: true },
                        { id: "opt-4", text: "5", isCorrect: false }
                    ]
                }
            ];

            const snapshot = createExamSnapshot(originalQuestions, 10);
            expect(snapshot.total_points).toBe(10);
            expect(snapshot.questions.length).toBe(2);

            // Giáo viên sửa ngân hàng câu hỏi ban đầu
            originalQuestions[0].question = "CÂU HỎI ĐÃ BỊ SỬA SAU KHI THI";
            originalQuestions[0].options[0].text = "Đà Nẵng";

            // Snapshot không hề bị biến động
            expect(snapshot.questions[0].question).toBe("Thủ đô của Việt Nam là gì?");
            expect(snapshot.questions[0].options[0].text).toBe("Hà Nội");
        });

        it("should hide correct answers for students during exam", () => {
            const snapshot = createExamSnapshot([
                {
                    id: "q1",
                    question: "Sông nào dài nhất Việt Nam?",
                    points: 10,
                    options: [
                        { id: "opt-1", text: "Sông Đồng Nai", isCorrect: true },
                        { id: "opt-2", text: "Sông Hồng", isCorrect: false }
                    ]
                }
            ], 10);

            const studentSafeQuestions = getSafeSnapshotQuestions(snapshot, false);
            expect(studentSafeQuestions[0].options[0]).not.toHaveProperty("isCorrect");
            expect(studentSafeQuestions[0].options[0].text).toBe("Sông Đồng Nai");

            const revealedQuestions = getSafeSnapshotQuestions(snapshot, true);
            expect(revealedQuestions[0].options[0]).toHaveProperty("isCorrect", true);
        });
    });

    // -------------------------------------------------------------
    // 3. Score Visibility Gate (Draft vs Published)
    // -------------------------------------------------------------
    describe("Score Visibility Gate (Phase 4 Acceptance Criteria)", () => {
        it("should return score = null and display 'Đang chấm' to students/parents when grading_status is 'draft'", () => {
            const rawSubmission = {
                id: "sub-1",
                exam_id: "exam-1",
                student_id: "student-1",
                score: 8.5,
                total_points: 10,
                grading_status: "draft",
                rubric_grades: { criterion1: 4, criterion2: 4.5 },
                feedback: "Làm tốt nhưng cần cẩn thận hơn"
            };

            // Học sinh xem bài
            const studentView = maskSubmissionForRole(rawSubmission, "student");
            expect(studentView?.score).toBeNull();
            expect(studentView?.rubric_grades).toBeNull();
            expect(studentView?.feedback).toBeNull();
            expect(studentView?.display_status).toBe("Đang chấm");

            // Phụ huynh xem bài
            const parentView = maskSubmissionForRole(rawSubmission, "parent");
            expect(parentView?.score).toBeNull();
            expect(parentView?.display_status).toBe("Đang chấm");
        });

        it("should reveal full score and feedback to students/parents only when grading_status is 'published'", () => {
            const publishedSubmission = {
                id: "sub-1",
                exam_id: "exam-1",
                student_id: "student-1",
                score: 9.0,
                total_points: 10,
                grading_status: "published",
                feedback: "Điểm chính thức đã công bố"
            };

            const studentView = maskSubmissionForRole(publishedSubmission, "student");
            expect(studentView?.score).toBe(9.0);
            expect(studentView?.feedback).toBe("Điểm chính thức đã công bố");
        });

        it("should always allow teachers and admins to view draft scores", () => {
            const draftSubmission = {
                id: "sub-1",
                score: 7.5,
                total_points: 10,
                grading_status: "draft"
            };

            const teacherView = maskSubmissionForRole(draftSubmission, "teacher");
            expect(teacherView?.score).toBe(7.5);

            const adminView = maskSubmissionForRole(draftSubmission, "admin");
            expect(adminView?.score).toBe(7.5);
        });
    });
});
