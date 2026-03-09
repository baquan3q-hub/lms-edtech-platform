"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getClassStudentsWithStats(classId: string) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Get enrolled students
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select(`
                student_id,
                student:users!student_id(id, full_name, email)
            `)
            .eq("class_id", classId)
            .eq("status", "active");

        if (enrollError) throw enrollError;
        if (!enrollments || enrollments.length === 0) return { data: [], error: null };

        const studentIds = enrollments.map(e => e.student_id);

        // 2. Get their stats
        const { data: stats, error: statsError } = await adminSupabase
            .from("student_class_stats")
            .select("*")
            .in("student_id", studentIds)
            .eq("class_id", classId);

        if (statsError) throw statsError;

        // 3. Merge data
        const merged = enrollments.map(en => {
            const studentStats = stats?.find(s => s.student_id === en.student_id) || {
                total_sessions: 0,
                present_count: 0,
                absent_count: 0,
                late_count: 0,
                excused_count: 0,
                attendance_rate: 0,
                avg_score: 0,
            };

            const studentInfo = Array.isArray(en.student) ? en.student[0] : en.student;

            return {
                id: en.student_id,
                name: studentInfo?.full_name || "Ẩn danh",
                email: studentInfo?.email || "",
                stats: studentStats
            };
        });

        return { data: merged, error: null };
    } catch (error: any) {
        console.error("Lỗi getClassStudentsWithStats:", error);
        return { data: [], error: error.message };
    }
}
