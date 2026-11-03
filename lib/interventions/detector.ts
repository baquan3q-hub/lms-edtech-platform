import { createAdminClient } from "@/lib/supabase/admin";
import { produceOutboxEvent } from "@/lib/outbox/outbox-producer";
import { DEFAULT_PILOT_SCHOOL_ID } from "@/lib/auth/actor-context";

export interface AttendanceSignal {
    studentId: string;
    schoolId: string;
    homeroomId?: string | null;
    classId?: string | null;
    unexcusedCount: number;
    dates: string[];
}

export interface AcademicSignal {
    studentId: string;
    schoolId: string;
    homeroomId?: string | null;
    classId?: string | null;
    consecutiveFails: number;
    scoreDrop?: number;
    recentScores: number[];
}

/**
 * Đánh giá tín hiệu chuyên cần dựa trên quy tắc chính sách:
 * Học sinh có >= 3 buổi vắng không phép -> Tạo hoặc cập nhật ca can thiệp chuyên cần.
 */
export async function evaluateAttendanceSignal(
    signal: AttendanceSignal,
    warningThreshold: number = 3
): Promise<{ triggered: boolean; caseId?: string; existing?: boolean }> {
    if (signal.unexcusedCount < warningThreshold) {
        return { triggered: false };
    }

    const adminSupabase = createAdminClient();
    const schoolId = signal.schoolId || DEFAULT_PILOT_SCHOOL_ID;

    // Kiểm tra xem đã có ca can thiệp chuyên cần đang mở cho học sinh này chưa
    const { data: existingCase } = await adminSupabase
        .from("intervention_cases")
        .select("id, status, evidence")
        .eq("student_id", signal.studentId)
        .eq("case_type", "attendance")
        .in("status", ["open", "in_progress"])
        .maybeSingle();

    if (existingCase) {
        return { triggered: true, caseId: existingCase.id, existing: true };
    }

    const priority = signal.unexcusedCount >= 5 ? "high" : "medium";
    const evidence = {
        rule: "ATTENDANCE_ABSENCE_THRESHOLD",
        unexcused_absences: signal.unexcusedCount,
        threshold: warningThreshold,
        dates: signal.dates,
        detected_at: new Date().toISOString()
    };

    // Tạo ca can thiệp mới
    const { data: newCase, error } = await adminSupabase
        .from("intervention_cases")
        .insert({
            school_id: schoolId,
            student_id: signal.studentId,
            homeroom_id: signal.homeroomId || null,
            class_id: signal.classId || null,
            case_type: "attendance",
            priority,
            status: "open",
            evidence,
            review_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 ngày
        })
        .select()
        .single();

    if (error || !newCase) {
        console.error("Lỗi tạo intervention case (attendance):", error);
        return { triggered: false };
    }

    // Gửi sự kiện Outbox để thông báo giáo viên
    await produceOutboxEvent({
        schoolId,
        eventType: "intervention.created",
        aggregateType: "intervention_cases",
        aggregateId: newCase.id,
        eventKey: `interv_att_${newCase.id}`,
        payload: {
            student_id: signal.studentId,
            case_type: "attendance",
            priority,
            unexcused_count: signal.unexcusedCount
        }
    });

    return { triggered: true, caseId: newCase.id, existing: false };
}

/**
 * Đánh giá tín hiệu học lực:
 * Học sinh có 2 bài kiểm tra liên tiếp dưới 4.0 hoặc giảm điểm >= 2.0 -> Kích hoạt ca can thiệp học tập.
 */
export async function evaluateAcademicSignal(
    signal: AcademicSignal
): Promise<{ triggered: boolean; caseId?: string; existing?: boolean }> {
    const isConsecutiveFail = signal.consecutiveFails >= 2;
    const isSignificantDrop = (signal.scoreDrop || 0) >= 2.0;

    if (!isConsecutiveFail && !isSignificantDrop) {
        return { triggered: false };
    }

    const adminSupabase = createAdminClient();
    const schoolId = signal.schoolId || DEFAULT_PILOT_SCHOOL_ID;

    // Kiểm tra xem đã có ca can thiệp học tập đang mở cho học sinh chưa
    const { data: existingCase } = await adminSupabase
        .from("intervention_cases")
        .select("id, status, evidence")
        .eq("student_id", signal.studentId)
        .eq("case_type", "academic")
        .in("status", ["open", "in_progress"])
        .maybeSingle();

    if (existingCase) {
        return { triggered: true, caseId: existingCase.id, existing: true };
    }

    const priority = isConsecutiveFail && isSignificantDrop ? "high" : "medium";
    const evidence = {
        rule: isConsecutiveFail ? "CONSECUTIVE_LOW_SCORES" : "SIGNIFICANT_GRADE_DROP",
        consecutive_fails: signal.consecutiveFails,
        score_drop: signal.scoreDrop || 0,
        recent_scores: signal.recentScores,
        detected_at: new Date().toISOString()
    };

    const { data: newCase, error } = await adminSupabase
        .from("intervention_cases")
        .insert({
            school_id: schoolId,
            student_id: signal.studentId,
            homeroom_id: signal.homeroomId || null,
            class_id: signal.classId || null,
            case_type: "academic",
            priority,
            status: "open",
            evidence,
            review_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 ngày
        })
        .select()
        .single();

    if (error || !newCase) {
        console.error("Lỗi tạo intervention case (academic):", error);
        return { triggered: false };
    }

    await produceOutboxEvent({
        schoolId,
        eventType: "intervention.created",
        aggregateType: "intervention_cases",
        aggregateId: newCase.id,
        eventKey: `interv_acad_${newCase.id}`,
        payload: {
            student_id: signal.studentId,
            case_type: "academic",
            priority,
            recent_scores: signal.recentScores
        }
    });

    return { triggered: true, caseId: newCase.id, existing: false };
}
