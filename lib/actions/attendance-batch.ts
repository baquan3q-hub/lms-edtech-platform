"use server";

import { saveAttendanceRecords } from "@/lib/actions/attendance";

export interface BatchAttendanceRecord {
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    note?: string;
}

/**
 * Server Action xử lý batch điểm danh cho 40-50 học sinh (Task T5.3 - Phase 5).
 * Kiểm tra tính hợp lệ, loại trừ trùng lặp và lưu vết điểm danh.
 */
export async function saveBatchAttendanceAction(
    sessionId: string,
    classId: string,
    records: BatchAttendanceRecord[]
) {
    return await saveAttendanceRecords(sessionId, classId, records);
}
