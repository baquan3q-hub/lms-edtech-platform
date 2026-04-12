"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function fetchTasksStatus(teacherId: string) {
    try {
        const supabase = createAdminClient();

        // 1. Get Teacher's Classes
        const { data: classes } = await supabase
            .from("classes")
            .select("id, name, course:courses(name)")
            .eq("teacher_id", teacherId)
            .eq("status", "active");

        if (!classes || classes.length === 0) return { tasks: [], error: null };

        const classIds = classes.map((c: any) => c.id);

        // 2. Fetch Enrollments with Student detail
        const { data: enrollments } = await supabase
            .from("enrollments")
            .select(`
                class_id,
                student_id,
                student:users!student_id(id, full_name, email, avatar_url)
            `)
            .in("class_id", classIds)
            .eq("status", "active");

        const students = enrollments || [];

        // 3. Fetch Assignments and Exams for these classes
        const { data: assignments } = await supabase.from("assignments").select("id, class_id, title").in("class_id", classIds);
        const { data: exams } = await supabase.from("exams").select("id, class_id, title").in("class_id", classIds);

        const assignmentIds = assignments?.map((a: any) => a.id) || [];
        const examIds = exams?.map((e: any) => e.id) || [];

        // 4. Fetch all Submissions
        let subQuery = supabase.from("submissions").select("assignment_id, student_id");
        if (assignmentIds.length > 0) subQuery = subQuery.in("assignment_id", assignmentIds);
        else subQuery = subQuery.limit(0);

        let examSubQuery = supabase.from("exam_submissions").select("exam_id, student_id");
        if (examIds.length > 0) examSubQuery = examSubQuery.in("exam_id", examIds);
        else examSubQuery = examSubQuery.limit(0);

        const [{ data: subs }, { data: examSubs }] = await Promise.all([subQuery, examSubQuery]);

        // Build Task List
        const taskStats: any[] = [];

        assignments?.forEach((a: any) => {
            const classEnrollments = students.filter((s:any) => s.class_id === a.class_id);
            const totalExpected = classEnrollments.length;
            let submitted = 0;
            const missingStudents: any[] = [];

            classEnrollments.forEach((enroll:any) => {
                const hasSubmitted = subs?.some((s: any) => s.assignment_id === a.id && s.student_id === enroll.student_id);
                if (hasSubmitted) submitted++;
                else {
                    missingStudents.push({
                        id: enroll.student_id,
                        name: enroll.student?.full_name || "Kho dữ liệu trống",
                        avatar: enroll.student?.avatar_url
                    });
                }
            });

            const courseData = classes.find((c: any) => c.id === a.class_id)?.course as any;
            const courseName = (Array.isArray(courseData) ? courseData[0]?.name : courseData?.name) || "Lớp học";

            taskStats.push({
                id: `a-${a.id}`,
                title: a.title || "Bài tập về nhà",
                className: courseName,
                type: "assignment",
                totalExpected,
                submitted,
                missingStudents
            });
        });

        exams?.forEach((e: any) => {
            const classEnrollments = students.filter((s:any) => s.class_id === e.class_id);
            const totalExpected = classEnrollments.length;
            let submitted = 0;
            const missingStudents: any[] = [];

            classEnrollments.forEach((enroll:any) => {
                const hasSubmitted = examSubs?.some((s: any) => s.exam_id === e.id && s.student_id === enroll.student_id);
                if (hasSubmitted) submitted++;
                else {
                    missingStudents.push({
                        id: enroll.student_id,
                        name: enroll.student?.full_name || "Kho dữ liệu trống",
                        avatar: enroll.student?.avatar_url
                    });
                }
            });

            const courseData = classes.find((c: any) => c.id === e.class_id)?.course as any;
            const courseName = (Array.isArray(courseData) ? courseData[0]?.name : courseData?.name) || "Lớp học";

            taskStats.push({
                id: `e-${e.id}`,
                title: e.title || "Bài Kiểm tra",
                className: courseName,
                type: "exam",
                totalExpected,
                submitted,
                missingStudents
            });
        });

        // Filter out empty classes or tasks with 0 expected students? Keeping them is fine, but maybe sort by completion
        const sortedTasks = taskStats.sort((a,b) => {
            const missingA = a.totalExpected - a.submitted;
            const missingB = b.totalExpected - b.submitted;
            return missingB - missingA; // Ưu tiên task nợ nhiều nhất
        }).slice(0, 10); // Lấy 10 task đáng chú ý

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
        const supabase = createAdminClient();

        // 1. Gửi cho Học sinh
        await supabase.from("notifications").insert({
            user_id: studentId,
            title: "Cảnh báo Tiến độ Học tập \u26A0\uFE0F",
            content: message,
            type: "alert"
        });

        // 2. Tra cứu Phụ huynh
        const { data: parentLink } = await supabase
            .from("parent_student")
            .select("parent_id")
            .eq("student_id", studentId);

        if (parentLink && parentLink.length > 0) {
            // Gửi mâm copy cho Phụ huynh
            const parentNotifications = parentLink.map((p: any) => ({
                user_id: p.parent_id,
                title: "Thông báo từ Giáo viên về con bạn",
                content: `Kính gửi Phụ huynh, đây là cảnh báo tự động: ${message}`,
                type: "alert"
            }));
            await supabase.from("notifications").insert(parentNotifications);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error sending reminder:", error);
        return { success: false, error: error.message };
    }
}
