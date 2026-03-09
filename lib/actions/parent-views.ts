"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Láy danh sách các buổi học của học sinh (con) trong các lớp học đang tham gia
 * Có kèm theo trạng thái điểm danh của từng buổi.
 */
export async function getStudentSchedule(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Kiểm tra quyền (Phụ huynh có được xem của studentId này không)
        const { data: link, error: linkError } = await adminSupabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        if (linkError || !link) {
            return { data: [], error: "Bạn không có quyền xem thông tin học sinh này" };
        }

        // 2. Lấy các lớp học học sinh đang tham gia
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select("class_id, classes(name, course_id, courses(name, mode))")
            .eq("student_id", studentId)
            .eq("status", "active");

        if (enrollError || !enrollments || enrollments.length === 0) {
            return { data: [], error: null };
        }

        const classIds = enrollments.map(e => e.class_id);

        // 3. Lấy tất cả các class_sessions của các lớp đó
        const { data: sessions, error: sessionsError } = await adminSupabase
            .from("class_sessions")
            .select("*")
            .in("class_id", classIds);

        if (sessionsError) throw sessionsError;

        // 4. Lấy dữ liệu điểm danh của học sinh cho các session trên
        // Note: Cấu trúc data điểm danh: attendance_records -> attendance_sessions -> class_id & session_date
        // Thay vì join phức tạp, ta lấy tất cả attendance_records của studentId này.
        const { data: attendanceRecords, error: attError } = await adminSupabase
            .from("attendance_records")
            .select(`
                status,
                notes,
                session:attendance_sessions!inner(class_id, session_date)
            `)
            .eq("student_id", studentId)
            .in("session.class_id", classIds);

        // Map data điểm danh vào
        const mappedSessions = (sessions || []).map(session => {
            // Find class info
            const enrollment = enrollments.find(e => e.class_id === session.class_id);
            const classInfo = Array.isArray(enrollment?.classes) ? enrollment.classes[0] : enrollment?.classes;
            const courseInfo = Array.isArray(classInfo?.courses) ? classInfo.courses[0] : classInfo?.courses;

            // Find attendance status
            const attendance = attendanceRecords?.find(att =>
                att.session &&
                    Array.isArray(att.session) ? att.session[0].class_id === session.class_id && att.session[0].session_date === session.session_date :
                    (att.session as any).class_id === session.class_id && (att.session as any).session_date === session.session_date
            );

            return {
                ...session,
                class_name: classInfo?.name,
                course_name: courseInfo?.name,
                attendance_status: attendance?.status || null,
                attendance_notes: attendance?.notes || null
            };
        });

        // Sort by date then time
        mappedSessions.sort((a, b) => {
            if (a.session_date !== b.session_date) return a.session_date.localeCompare(b.session_date);
            return a.start_time.localeCompare(b.start_time);
        });

        return { data: mappedSessions, error: null };
    } catch (error: any) {
        console.error("Lỗi getStudentSchedule:", error);
        return { data: [], error: error.message };
    }
}
