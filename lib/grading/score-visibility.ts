import { isGradePublished } from "@/lib/modules/assessment/dto";
/**
 * Mặt nạ điểm thi và bài tập cho các vai trò khác nhau (Phase 4 Score Visibility Gate).
 * 0 trường hợp học sinh hoặc phụ huynh thấy được điểm số ở trạng thái 'draft' hoặc 'ungraded'.
 */
export function maskSubmissionForRole<T extends {
    score?: number | null;
    objective_score?: number | null;
    grading_status?: string | null;
    status?: string | null;
    rubric_grades?: unknown;
    feedback?: string | null;
}>(submission: T | null | undefined, role: 'teacher' | 'admin' | 'student' | 'parent'): (T & { display_status?: string }) | null {
    if (!submission) return null;

    // Giáo viên và Ban Giám hiệu được xem toàn bộ điểm nháp và điểm công bố
    if (role === 'teacher' || role === 'admin') {
        return submission;
    }

    // Học sinh và Phụ huynh CHỈ được xem điểm khi grading_status = 'published' (hoặc status = 'graded' legacy)
    const isPublished = isGradePublished(submission.grading_status);

    if (!isPublished) {
        return {
            ...submission,
            score: null,
            objective_score: null,
            rubric_grades: null,
            feedback: null,
            grading_status: 'draft',
            display_status: 'Đang chấm'
        };
    }

    return submission;
}
