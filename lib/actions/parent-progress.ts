"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getStudentProgressStats(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Kiểm tra quyền (Phụ huynh có được xem của studentId này không)
        const { data: link, error: linkError } = await adminSupabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        if (linkError || !link) {
            return { data: null, error: "Bạn không có quyền xem thông tin học sinh này" };
        }

        // 2. Lấy thống kê tổng hợp từ bảng `student_class_stats`
        const { data: statsData, error: statsError } = await adminSupabase
            .from("student_class_stats")
            .select("*, classes(name, course_id, courses(name))")
            .eq("student_id", studentId);

        if (statsError) throw statsError;

        // 3. (Mock lấy lịch sử bài test) do database hiện tại chưa có bảng `quiz_attempts` đầy đủ logic.
        // Ta tạo mock data cho LineChart để demo Tiến độ Điểm số theo thời gian.
        const mockScoreHistory = [
            { date: "01/03", score: 7.5, exam: "Test 1" },
            { date: "05/03", score: 8.0, exam: "Kiểm tra miệng" },
            { date: "10/03", score: 8.5, exam: "Test 2" },
            { date: "15/03", score: 8.2, exam: "15 phút" },
            { date: "20/03", score: 9.0, exam: "Test 3" },
        ];

        return {
            data: {
                stats: statsData || [],
                history: mockScoreHistory
            },
            error: null
        };
    } catch (error: any) {
        console.error("Lỗi getStudentProgressStats:", error);
        return { data: null, error: error.message };
    }
}
