"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchTeacherClasses(teacherId: string) {
    try {
        const supabase = createAdminClient();

        // Lấy thông tin lớp học, khóa học và lịch học chi tiết (bao gồm phòng học)
        const { data, error } = await supabase
            .from("classes")
            .select(`
                *,
                course:courses(name, description, mode),
                schedules:class_schedules(
                    day_of_week,
                    start_time,
                    end_time,
                    room:rooms(name)
                ),
                enrollments(count)
            `)
            .eq("teacher_id", teacherId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching teacher classes:", error);
        return { data: null, error: error.message };
    }
}

export async function fetchTeacherStats(teacherId: string) {
    try {
        const supabase = createAdminClient();

        // 1. Số lớp đang dạy (active)
        const { count: classesCount } = await supabase
            .from("classes")
            .select("id", { count: "exact", head: true })
            .eq("teacher_id", teacherId)
            .eq("status", "active");

        // Lấy danh sách ID của các lớp do GV này dạy để truy vấn chéo
        const { data: myClasses } = await supabase
            .from("classes")
            .select("id")
            .eq("teacher_id", teacherId);
            
        const classIds = myClasses?.map((c: any) => c.id) || [];

        let totalStudents = 0;
        let pendingAssignments = 0;
        let avgScore = "—";

        if (classIds.length > 0) {
            // 2. Đếm tổng học sinh đang đăng ký
            const { count: studentsCount } = await supabase
                .from("enrollments")
                .select("student_id", { count: "exact", head: true })
                .in("class_id", classIds)
                .eq("status", "active");
                
            totalStudents = studentsCount || 0;

            // 3. Đếm số lượng bài chờ chấm & Tính điểm trung bình
            // Phun ra các assignment và exam của GV
            const { data: assignments } = await supabase.from("assignments").select("id").in("class_id", classIds);
            const { data: exams } = await supabase.from("exams").select("id").in("class_id", classIds);
            
            const assignmentIds = assignments?.map((a: any) => a.id) || [];
            const examIds = exams?.map((e: any) => e.id) || [];

            let subQuery = supabase.from("submissions").select("score");
            if (assignmentIds.length > 0) subQuery = subQuery.in("assignment_id", assignmentIds);
            else subQuery = subQuery.limit(0);

            let exSubQuery = supabase.from("exam_submissions").select("score");
            if (examIds.length > 0) exSubQuery = exSubQuery.in("exam_id", examIds);
            else exSubQuery = exSubQuery.limit(0);

            const [{ data: subsData }, { data: examsData }] = await Promise.all([subQuery, exSubQuery]);
            const allSubmissions = [...(subsData || []), ...(examsData || [])];

            let scoreSum = 0;
            let gradedCount = 0;

            allSubmissions.forEach((sub: any) => {
                if (sub.score !== null && sub.score !== undefined) {
                    gradedCount++;
                    scoreSum += Number(sub.score);
                } else {
                    pendingAssignments++;
                }
            });

            if (gradedCount > 0) {
                // Đổi về thang điểm trung bình 10
                let rawAvg = scoreSum / gradedCount;
                if (rawAvg > 20) rawAvg = rawAvg / 10; // Cân bằng hệ thang 100
                avgScore = rawAvg.toFixed(1) + "/10";
            }
        }

        return {
            data: {
                classesCount: classesCount || 0,
                totalStudents: totalStudents,
                attendanceRate: avgScore, // Đổi nhãn Tỷ lệ sang Điểm trung bình ở logic Client
                pendingAssignments: pendingAssignments
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error fetching teacher stats:", error);
        return { data: null, error: error.message };
    }
}

export async function fetchTeacherNotifications(teacherId: string) {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", teacherId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        return { data: [], error: error.message };
    }
}
