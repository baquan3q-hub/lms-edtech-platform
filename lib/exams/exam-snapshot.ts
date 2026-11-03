import { validateExam, ExamQuestion, publicQuestions } from "@/lib/learning/grading";

export interface ExamSnapshotData {
    questions: ExamQuestion[];
    total_points: number;
    created_at: string;
}

/**
 * Tạo snapshot bất biến của đề thi tại thời điểm công bố hoặc bắt đầu làm bài.
 * Bất kỳ sự thay đổi nào đối với ngân hàng câu hỏi hay đề thi sau thời điểm này
 * đều không ảnh hưởng đến lượt làm bài của học sinh.
 */
export function createExamSnapshot(questions: unknown, totalPoints: number): ExamSnapshotData {
    const validatedQuestions = validateExam(questions, totalPoints);
    return {
        questions: validatedQuestions,
        total_points: totalPoints,
        created_at: new Date().toISOString()
    };
}

/**
 * Trích xuất danh sách câu hỏi an toàn từ snapshot (ẩn đáp án đúng nếu học sinh chưa được phép xem).
 */
export function getSafeSnapshotQuestions(
    snapshot: ExamSnapshotData | null | undefined, 
    revealAnswers: boolean = false
) {
    if (!snapshot || !Array.isArray(snapshot.questions)) {
        return [];
    }
    return publicQuestions(snapshot.questions, revealAnswers);
}
