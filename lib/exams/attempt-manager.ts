export interface ExamAttemptRecord {
    id?: string;
    attempt_no: number;
    submitted_at: string | null;
    expires_at: string;
    started_at?: string;
    draft_answers?: unknown;
    draft_version?: number;
    snapshot?: any;
}

export interface AttemptEligibilityResult {
    allowed: boolean;
    reason?: 'EXAM_DEADLINE_EXPIRED' | 'ATTEMPT_IN_PROGRESS' | 'MAX_ATTEMPTS_REACHED';
    activeAttempt?: ExamAttemptRecord;
    nextAttemptNo?: number;
}

/**
 * Tính toán thời điểm hết giờ làm bài dựa hoàn toàn vào đồng hồ Server.
 * Tuyệt đối không nhận thời gian từ phía Client gửi lên.
 */
export function calculateAttemptExpiry(
    durationMinutes: number,
    examDueDate?: string | null,
    serverStartTime: Date = new Date()
): string {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new Error("Thời lượng đề thi không hợp lệ.");
    }

    const durationMs = durationMinutes * 60 * 1000;
    const expiryByDuration = serverStartTime.getTime() + durationMs;

    if (examDueDate) {
        const dueTime = Date.parse(examDueDate);
        if (!isNaN(dueTime)) {
            return new Date(Math.min(expiryByDuration, dueTime)).toISOString();
        }
    }

    return new Date(expiryByDuration).toISOString();
}

/**
 * Kiểm tra tính hợp lệ để mở lượt làm bài mới theo cấu hình max_attempts (Phase 4).
 * Hỗ trợ tiếp tục lượt làm đang dở (Idempotent resume) nếu chưa hết giờ và chưa nộp bài.
 */
export function checkAttemptEligibility(
    exam: {
        max_attempts?: number;
        due_date?: string | null;
    },
    existingAttempts: ExamAttemptRecord[],
    serverTime: Date = new Date()
): AttemptEligibilityResult {
    // 1. Kiểm tra hạn nộp toàn đề thi
    if (exam.due_date) {
        const dueTime = Date.parse(exam.due_date);
        if (!isNaN(dueTime) && serverTime.getTime() > dueTime) {
            return {
                allowed: false,
                reason: 'EXAM_DEADLINE_EXPIRED'
            };
        }
    }

    // 2. Tìm lượt làm bài đang mở (in-progress)
    const activeAttempt = existingAttempts.find(att => {
        if (att.submitted_at !== null) return false;
        const expiryTime = Date.parse(att.expires_at);
        return !isNaN(expiryTime) && serverTime.getTime() < expiryTime;
    });

    if (activeAttempt) {
        return {
            allowed: false,
            reason: 'ATTEMPT_IN_PROGRESS',
            activeAttempt
        };
    }

    // 3. Đếm số lượt làm đã hoàn thành hoặc đã hết giờ
    const maxAllowed = exam.max_attempts && exam.max_attempts > 0 ? exam.max_attempts : 1;
    const completedOrExpiredCount = existingAttempts.length;

    if (completedOrExpiredCount >= maxAllowed) {
        return {
            allowed: false,
            reason: 'MAX_ATTEMPTS_REACHED'
        };
    }

    // 4. Lấy số thứ tự lượt làm tiếp theo
    const maxAttemptNo = existingAttempts.reduce((max, att) => Math.max(max, att.attempt_no || 0), 0);
    const nextAttemptNo = maxAttemptNo + 1;

    return {
        allowed: true,
        nextAttemptNo
    };
}
