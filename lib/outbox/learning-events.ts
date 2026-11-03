import "server-only";
import { produceOutboxEvent } from "@/lib/outbox/outbox-producer";

export async function emitExamSubmittedEvent(params: {
    schoolId: string;
    examId: string;
    studentId: string;
    submissionId: string;
    attemptId?: string;
    attemptNo?: number;
    score?: number | null;
}) {
    return await produceOutboxEvent({
        schoolId: params.schoolId,
        eventType: "exam.submitted",
        aggregateType: "exam_submissions",
        aggregateId: params.submissionId,
        eventKey: `exam_sub_${params.submissionId}_${Date.now()}`,
        payload: {
            exam_id: params.examId,
            student_id: params.studentId,
            submission_id: params.submissionId,
            attempt_id: params.attemptId,
            attempt_no: params.attemptNo || 1,
            score: params.score
        }
    });
}

export async function emitExamGradePublishedEvent(params: {
    schoolId: string;
    examId: string;
    studentId: string;
    submissionId: string;
    score: number;
    totalPoints: number;
}) {
    return await produceOutboxEvent({
        schoolId: params.schoolId,
        eventType: "exam.grade_published",
        aggregateType: "exam_submissions",
        aggregateId: params.submissionId,
        eventKey: `exam_pub_${params.submissionId}_${Date.now()}`,
        payload: {
            exam_id: params.examId,
            student_id: params.studentId,
            score: params.score,
            total_points: params.totalPoints
        }
    });
}

export async function emitHomeworkSubmittedEvent(params: {
    schoolId: string;
    homeworkId: string;
    studentId: string;
    submissionId: string;
    score?: number | null;
    requiresManualGrading?: boolean;
}) {
    return await produceOutboxEvent({
        schoolId: params.schoolId,
        eventType: "homework.submitted",
        aggregateType: "homework_submissions",
        aggregateId: params.submissionId,
        eventKey: `hw_sub_${params.submissionId}_${Date.now()}`,
        payload: {
            homework_id: params.homeworkId,
            student_id: params.studentId,
            score: params.score,
            requires_manual: params.requiresManualGrading
        }
    });
}

export async function emitHomeworkGradePublishedEvent(params: {
    schoolId: string;
    homeworkId: string;
    studentId: string;
    submissionId: string;
    score: number;
}) {
    return await produceOutboxEvent({
        schoolId: params.schoolId,
        eventType: "homework.grade_published",
        aggregateType: "homework_submissions",
        aggregateId: params.submissionId,
        eventKey: `hw_pub_${params.submissionId}_${Date.now()}`,
        payload: {
            homework_id: params.homeworkId,
            student_id: params.studentId,
            score: params.score
        }
    });
}
