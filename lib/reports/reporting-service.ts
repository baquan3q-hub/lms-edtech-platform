import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PILOT_SCHOOL_ID } from "@/lib/auth/actor-context";

export interface AttendanceReportOptions {
    termId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface ReconciledAttendanceResult {
    schoolId: string;
    isReconciled: boolean;
    discrepancyCount: number;
    summary: {
        totalRecords: number;
        presentCount: number;
        absentCount: number;
        lateCount: number;
        excusedCount: number;
        attendanceRate: number;
    };
    pagination: {
        page: number;
        limit: number;
        totalClasses: number;
        totalPages: number;
    };
    classes: any[];
}

/**
 * Lấy báo cáo tổng hợp chuyên cần đối soát được 100% với dữ liệu nguồn (Phase 5).
 * Kiểm tra tính nhất quán toán học: totalRecords === present + absent + late + excused.
 */
export async function getReconciledAttendanceReport(
    schoolId: string = DEFAULT_PILOT_SCHOOL_ID,
    options: AttendanceReportOptions = {}
): Promise<ReconciledAttendanceResult> {
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.rpc("get_school_attendance_summary", {
        p_school_id: schoolId,
        p_term_id: options.termId || null,
        p_start_date: options.startDate || null,
        p_end_date: options.endDate || null,
        p_page: options.page || 1,
        p_limit: options.limit || 50
    });

    if (error) {
        throw new Error(`Lỗi RPC get_school_attendance_summary: ${error.message}`);
    }

    const report = data as any;
    const summary = report?.summary || {
        total_records: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        excused_count: 0,
        overall_attendance_rate: 0
    };

    const sumCategories = Number(summary.present_count || 0) +
                          Number(summary.absent_count || 0) +
                          Number(summary.late_count || 0) +
                          Number(summary.excused_count || 0);

    const totalRecords = Number(summary.total_records || 0);
    const discrepancy = Math.abs(totalRecords - sumCategories);

    return {
        schoolId,
        isReconciled: discrepancy === 0,
        discrepancyCount: discrepancy,
        summary: {
            totalRecords,
            presentCount: Number(summary.present_count || 0),
            absentCount: Number(summary.absent_count || 0),
            lateCount: Number(summary.late_count || 0),
            excusedCount: Number(summary.excused_count || 0),
            attendanceRate: Number(summary.overall_attendance_rate || 0)
        },
        pagination: {
            page: report?.pagination?.page || 1,
            limit: report?.pagination?.limit || 50,
            totalClasses: report?.pagination?.total_classes || 0,
            totalPages: report?.pagination?.total_pages || 1
        },
        classes: report?.classes || []
    };
}

/**
 * Lấy báo cáo tổng hợp học lực của lớp học từ điểm đã công bố.
 */
export async function getClassAcademicReport(classId: string) {
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.rpc("get_class_academic_summary", {
        p_class_id: classId
    });

    if (error) {
        throw new Error(`Lỗi RPC get_class_academic_summary: ${error.message}`);
    }

    return data;
}

/**
 * Lấy báo cáo chủ nhiệm chi tiết từng học sinh trong lớp.
 */
export async function getHomeroomStudentReport(homeroomId: string) {
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.rpc("get_homeroom_student_overview", {
        p_homeroom_id: homeroomId
    });

    if (error) {
        throw new Error(`Lỗi RPC get_homeroom_student_overview: ${error.message}`);
    }

    return data;
}
