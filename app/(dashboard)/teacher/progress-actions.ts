"use server";

import { AccessError, requireSelfOrRoles, requireStudentAccess } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function fetchTasksStatus(teacherId: string) {
    try {
        await requireSelfOrRoles(teacherId, ["admin"]);
        const supabase = createAdminClient();

        // 1. Get Teacher's Classes
        const { data: classes, error: classesError } = await supabase
            .from("classes")
            .select("id, name, course:courses(name)")
            .eq("teacher_id", teacherId)
            .eq("status", "active");
        if (classesError) throw classesError;

        if (!classes || classes.length === 0) return { tasks: [], error: null };

        const classIds = classes.map((c: any) => c.id);

        // 2. Một đợt song song: enrollments, đề bài, và bài nộp lọc theo lớp bằng inner join
        // (trước đây phải chờ danh sách assignment/exam id rồi mới tải bài nộp: 3 đợt → 2 đợt).
        // Bài nộp tải đủ (phân trang) để số "đã nộp" không bị cắt ở 1.000 dòng.
        // Đợt 2: thay bằng RPC đếm bài nộp theo task phía DB, khi đó không cần tải từng bài nộp.
        const [enrollmentsResult, assignmentsResult, examsResult, subs, examSubs] = await Promise.all([
            supabase
                .from("enrollments")
                .select("class_id, student_id, student:users!student_id(full_name, avatar_url)")
                .in("class_id", classIds)
                .eq("status", "active"),
            supabase.from("assignments").select("id, class_id, title").in("class_id", classIds),
            supabase.from("exams").select("id, class_id, title").in("class_id", classIds),
            selectAllRows((from, to) => supabase.from("submissions")
                .select("assignment_id, student_id, assignments!inner()", { count: "exact" })
                .in("assignments.class_id", classIds)
                .order("id").range(from, to)),
            selectAllRows((from, to) => supabase.from("exam_submissions")
                .select("exam_id, student_id, exams!inner()", { count: "exact" })
                .in("exams.class_id", classIds)
                .order("id").range(from, to)),
        ]);
        for (const result of [enrollmentsResult, assignmentsResult, examsResult]) {
            if (result.error) throw result.error;
        }
        const students = enrollmentsResult.data || [];
        const assignments = assignmentsResult.data || [];
        const exams = examsResult.data || [];

        const submittedAssignments = new Set(subs.map((s: any) => `${s.assignment_id}:${s.student_id}`));
        const submittedExams = new Set(examSubs.map((s: any) => `${s.exam_id}:${s.student_id}`));
        const enrollmentsByClass = new Map<string, typeof students>();
        for (const student of students) {
            const group = enrollmentsByClass.get(student.class_id) || [];
            group.push(student);
            enrollmentsByClass.set(student.class_id, group);
        }
        const classesById = new Map(classes.map(c => [c.id, c]));

        // Đếm số đã nộp cho mọi task trước, xếp hạng, rồi chỉ dựng danh sách HS thiếu cho 10 task đầu.
        type TaskDraft = { id: string; title: string; classId: string; type: "assignment" | "exam"; submittedKeys: Set<string>; refId: string; totalExpected: number; submitted: number };
        const drafts: TaskDraft[] = [];
        const addDraft = (type: TaskDraft["type"], task: any, submittedKeys: Set<string>, fallbackTitle: string) => {
            const classEnrollments = enrollmentsByClass.get(task.class_id) || [];
            let submitted = 0;
            for (const enroll of classEnrollments) if (submittedKeys.has(`${task.id}:${enroll.student_id}`)) submitted++;
            drafts.push({
                id: `${type === "assignment" ? "a" : "e"}-${task.id}`,
                title: task.title || fallbackTitle,
                classId: task.class_id,
                type,
                submittedKeys,
                refId: task.id,
                totalExpected: classEnrollments.length,
                submitted,
            });
        };
        assignments.forEach((a: any) => addDraft("assignment", a, submittedAssignments, "Bài tập về nhà"));
        exams.forEach((e: any) => addDraft("exam", e, submittedExams, "Bài Kiểm tra"));

        // Sort ổn định giống trước: ưu tiên task nợ nhiều nhất, giữ thứ tự assignment rồi exam khi bằng nhau.
        const sortedTasks = drafts
            .sort((a, b) => (b.totalExpected - b.submitted) - (a.totalExpected - a.submitted))
            .slice(0, 10) // Lấy 10 task đáng chú ý
            .map(task => {
                const missingStudents = (enrollmentsByClass.get(task.classId) || [])
                    .filter((enroll: any) => !task.submittedKeys.has(`${task.refId}:${enroll.student_id}`))
                    .map((enroll: any) => {
                        const student = Array.isArray(enroll.student) ? enroll.student[0] : enroll.student;
                        return {
                            id: enroll.student_id,
                            name: student?.full_name || "Kho dữ liệu trống",
                            avatar: student?.avatar_url,
                        };
                    });
                const courseData = classesById.get(task.classId)?.course as { name: string } | { name: string }[] | null;
                const courseName = (Array.isArray(courseData) ? courseData[0]?.name : courseData?.name) || "Lớp học";
                return {
                    id: task.id,
                    title: task.title,
                    className: courseName,
                    type: task.type,
                    totalExpected: task.totalExpected,
                    submitted: task.submitted,
                    missingStudents,
                };
            });

        return { 
            tasks: sortedTasks, 
            error: null 
        };
    } catch (error: any) {
        console.error("Error fetching tasks status:", error);
        return { tasks: [], error: error.message };
    }
}

export async function sendProgressReminder(studentId: string, message: string) {
    try {
        await requireStudentAccess(studentId, true);
        const supabase = createAdminClient();

        // 1. Gửi cho Học sinh
        // Bảng notifications dùng cột `message` (không có `content`).
        const { error: studentError } = await supabase.from("notifications").insert({
            user_id: studentId,
            title: "Cảnh báo Tiến độ Học tập \u26A0\uFE0F",
            message,
            type: "alert"
        });
        if (studentError) throw studentError;

        // 2. Tra cứu Phụ huynh (bảng liên kết là parent_students)
        const { data: parentLink, error: linkError } = await supabase
            .from("parent_students")
            .select("parent_id")
            .eq("student_id", studentId);
        if (linkError) throw linkError;

        if (parentLink && parentLink.length > 0) {
            // Gửi mâm copy cho Phụ huynh
            const parentNotifications = parentLink.map((p: { parent_id: string }) => ({
                user_id: p.parent_id,
                title: "Thông báo từ Giáo viên về con bạn",
                message: `Kính gửi Phụ huynh, đây là cảnh báo tự động: ${message}`,
                type: "alert"
            }));
            const { error: parentError } = await supabase.from("notifications").insert(parentNotifications);
            if (parentError) throw parentError;
        }

        return { success: true };
    } catch (error: unknown) {
        console.error("Error sending reminder:", error);
        const reason = error instanceof AccessError ? error.message : "Không gửi được nhắc nhở. Vui lòng thử lại.";
        return { success: false, error: reason };
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
