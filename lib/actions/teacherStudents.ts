"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lấy tất cả lớp mà giáo viên đang dạy 
 */
export async function fetchTeacherClasses() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from("classes")
            .select("id, name, status, course:courses(name)")
            .eq("teacher_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

/**
 * Lấy danh sách học viên + phụ huynh liên kết, theo classId (hoặc tất cả lớp của GV)
 */
export async function fetchTeacherStudents(classId?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // 1. Lấy danh sách class IDs mà GV dạy
        let classIds: string[] = [];
        if (classId) {
            // Kiểm tra GV có quyền truy cập lớp này
            const { data: cls } = await adminSupabase
                .from("classes")
                .select("id")
                .eq("id", classId)
                .eq("teacher_id", user.id)
                .single();
            if (!cls) return { data: null, error: "Bạn không có quyền truy cập lớp này" };
            classIds = [classId];
        } else {
            const { data: teacherClasses } = await adminSupabase
                .from("classes")
                .select("id")
                .eq("teacher_id", user.id)
                .eq("status", "active");
            classIds = (teacherClasses || []).map((c: any) => c.id);
        }

        if (classIds.length === 0) {
            return { data: [], error: null };
        }

        // 2. Lấy enrollments + student info
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select(`
                id, status, enrolled_at, class_id,
                class:classes(id, name, course:courses(name)),
                student:users!enrollments_student_id_fkey(id, full_name, email, phone, avatar_url)
            `)
            .in("class_id", classIds)
            .eq("status", "active");

        if (enrollError) throw enrollError;

        // 3. Lấy student IDs
        const studentIds = [...new Set((enrollments || []).map((e: any) => e.student?.id).filter(Boolean))];

        if (studentIds.length === 0) {
            return { data: [], error: null };
        }

        // 4. Lấy profile mở rộng của students
        const { data: profiles } = await adminSupabase
            .from("profiles")
            .select("*")
            .in("user_id", studentIds);

        // 5. Lấy parent links
        const { data: parentLinks } = await adminSupabase
            .from("parent_students")
            .select("id, parent_id, student_id, relationship")
            .in("student_id", studentIds);

        // 6. Lấy parent user info
        const parentIds = [...new Set((parentLinks || []).map((l: any) => l.parent_id))];
        let parentUsers: any[] = [];
        if (parentIds.length > 0) {
            const { data: pUsers } = await adminSupabase
                .from("users")
                .select("id, full_name, email, phone")
                .in("id", parentIds);
            parentUsers = pUsers || [];
        }

        // 7. Map tất cả lại thành danh sách hoàn chỉnh
        const studentMap = new Map<string, any>();

        for (const enrollment of (enrollments || [])) {
            const student = enrollment.student as any;
            if (!student) continue;

            if (!studentMap.has(student.id)) {
                const profile = (profiles || []).find((p: any) => p.user_id === student.id);
                const links = (parentLinks || []).filter((l: any) => l.student_id === student.id);
                const parents = links.map((l: any) => ({
                    ...l,
                    parent: parentUsers.find((p: any) => p.id === l.parent_id) || null
                }));

                studentMap.set(student.id, {
                    ...student,
                    profile: profile || null,
                    parents,
                    classes: []
                });
            }

            studentMap.get(student.id).classes.push({
                id: (enrollment.class as any)?.id,
                name: (enrollment.class as any)?.name,
                courseName: (enrollment.class as any)?.course?.name
            });
        }

        return { data: Array.from(studentMap.values()), error: null };
    } catch (error: any) {
        console.error("Error fetchTeacherStudents:", error);
        return { data: null, error: error.message };
    }
}
