"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Lấy danh sách thông báo lớp cho phụ huynh (theo studentId)
// ============================================================
export async function fetchParentClassAnnouncements(
    studentId: string,
    options: {
        classId?: string;
        filter?: "all" | "has_files" | "has_quiz";
        limit?: number;
        offset?: number;
    } = {}
) {
    const { classId, filter = "all", limit = 20, offset = 0 } = options;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Xác minh quyền phụ huynh
        const { data: link } = await adminSupabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        if (!link) return { data: null, error: "Không có quyền xem" };

        // Lấy class IDs của học sinh
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, class:classes(id, name)")
            .eq("student_id", studentId)
            .eq("status", "active");

        const classes = (enrollments || []).map((e: any) => ({
            id: e.class_id,
            name: e.class?.name || "Lớp học"
        }));
        const classIds = classId ? [classId] : classes.map((c: any) => c.id);

        if (classIds.length === 0) {
            return { data: { announcements: [], classes: [], total: 0 }, error: null };
        }

        // Query announcements
        let query = adminSupabase
            .from("announcements")
            .select("id, title, content, file_url, video_url, link_url, quiz_data, attachments, quiz_id, is_pinned, target_roles, resource_id, resource_type, created_at, class_id, teacher:users!announcements_teacher_id_fkey(full_name, avatar_url)", { count: "exact" })
            .in("class_id", classIds)
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Áp dụng filter
        if (filter === "has_files") {
            query = query.or("file_url.neq.,attachments.neq.[]");
        }
        if (filter === "has_quiz") {
            query = query.or("quiz_data.neq.,quiz_id.neq.");
        }

        const { data: announcements, count, error } = await query;

        if (error) return { data: null, error: error.message };

        // Map class names
        const classMap = new Map(classes.map((c: any) => [c.id, c.name]));
        const enriched = (announcements || []).map((a: any) => ({
            ...a,
            class_name: classMap.get(a.class_id) || "Lớp học",
            teacher_name: Array.isArray(a.teacher) ? a.teacher[0]?.full_name : a.teacher?.full_name,
            teacher_avatar: Array.isArray(a.teacher) ? a.teacher[0]?.avatar_url : a.teacher?.avatar_url,
        }));

        return {
            data: {
                announcements: enriched,
                classes,
                total: count || 0,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetching parent class announcements:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// Lấy thông tin học sinh (cho header trang)
// ============================================================
export async function fetchStudentInfoForParent(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Xác minh quyền phụ huynh
        const { data: link } = await adminSupabase
            .from("parent_students")
            .select("id, relationship")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        if (!link) return { data: null, error: "Không có quyền" };

        const { data: student } = await adminSupabase
            .from("users")
            .select("id, full_name, email, avatar_url")
            .eq("id", studentId)
            .single();

        return { data: student, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}
