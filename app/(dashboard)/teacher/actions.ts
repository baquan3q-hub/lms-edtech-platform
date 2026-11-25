"use server";

import { requireSelfOrRoles } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchTeacherClasses(teacherId: string) {
    try {
        await requireSelfOrRoles(teacherId, ["admin"]);
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
        await requireSelfOrRoles(teacherId, ["admin"]);
        const supabase = createAdminClient();

        // 1. Số lớp đang dạy (active)
        const classCountQuery = supabase
            .from("classes")
            .select("id", { count: "exact", head: true })
            .eq("teacher_id", teacherId)
            .eq("status", "active");

        // Lấy danh sách ID của các lớp do GV này dạy để truy vấn chéo
        const classIdsQuery = supabase
            .from("classes")
            .select("id")
            .eq("teacher_id", teacherId);
        const [classCountResult, classIdsResult] = await Promise.all([classCountQuery, classIdsQuery]);
        if (classCountResult.error) throw classCountResult.error;
        if (classIdsResult.error) throw classIdsResult.error;
        const { count: classesCount } = classCountResult;
        const { data: myClasses } = classIdsResult;
            
        const classIds = myClasses?.map((c: any) => c.id) || [];

        let totalStudents = 0;
        let pendingAssignments = 0;
        let avgScore = "—";

        if (classIds.length > 0) {
            // 2. Đếm tổng học sinh đang đăng ký
            const studentsQuery = supabase
                .from("enrollments")
                .select("student_id", { count: "exact", head: true })
                .in("class_id", classIds)
                .eq("status", "active");
                
            // 3. Bài chờ chấm (score IS NULL) đếm bằng count head:true; điểm TB chỉ tải cột score của
            // bài đã có điểm. Bài nộp lọc theo lớp bằng inner join nên không cần chờ danh sách
            // assignment/exam id (3 đợt → 2 đợt). Tải đủ (phân trang) để điểm TB không bị cắt ở 1.000 dòng.
            // Đợt 2: thay phần tải điểm bằng RPC trả về sum/count để khỏi tải từng dòng.
            const [studentsResult, pendingSubsResult, pendingExamSubsResult, gradedSubs, gradedExamSubs] = await Promise.all([
                studentsQuery,
                supabase.from("submissions")
                    .select("id, assignments!inner()", { count: "exact", head: true })
                    .in("assignments.class_id", classIds)
                    .is("score", null),
                supabase.from("exam_submissions")
                    .select("id, exams!inner()", { count: "exact", head: true })
                    .in("exams.class_id", classIds)
                    .is("score", null),
                selectAllRows((from, to) => supabase.from("submissions")
                    .select("score, assignments!inner()", { count: "exact" })
                    .in("assignments.class_id", classIds)
                    .not("score", "is", null)
                    .order("id").range(from, to)),
                selectAllRows((from, to) => supabase.from("exam_submissions")
                    .select("score, exams!inner()", { count: "exact" })
                    .in("exams.class_id", classIds)
                    .not("score", "is", null)
                    .order("id").range(from, to)),
            ]);
            for (const result of [studentsResult, pendingSubsResult, pendingExamSubsResult]) {
                if (result.error) throw result.error;
            }
            totalStudents = studentsResult.count || 0;
            pendingAssignments = (pendingSubsResult.count || 0) + (pendingExamSubsResult.count || 0);

            let scoreSum = 0;
            let gradedCount = 0;

            for (const sub of [...gradedSubs, ...gradedExamSubs] as { score: number | string }[]) {
                gradedCount++;
                scoreSum += Number(sub.score);
            }

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
        await requireSelfOrRoles(teacherId, ["admin"]);
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

// Helper nội bộ (không export: file "use server" chỉ export async action).
type PageResult<T> = { data: T[] | null; error: unknown; count?: number | null };

// PostgREST cắt im lặng ở max-rows (mặc định 1.000 dòng). Trang đầu lấy kèm `count: "exact"`,
// nếu còn thiếu thì tải các trang còn lại song song (tối đa thêm 1 lượt nối tiếp).
// Query truyền vào phải có `.order(...)` ổn định và `{ count: "exact" }`.
async function selectAllRows<T>(page: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
    const first = await page(0, 999);
    if (first.error) throw first.error;
    const rows = [...(first.data ?? [])];
    const step = rows.length; // = max-rows thực tế của server
    const total = first.count ?? step;
    if (step === 0 || total <= step) return rows;
    const rest = await Promise.all(
        Array.from({ length: Math.ceil((total - step) / step) }, (_, i) => page(step * (i + 1), step * (i + 2) - 1)),
    );
    for (const result of rest) {
        if (result.error) throw result.error;
        rows.push(...(result.data ?? []));
    }
    return rows;
}
