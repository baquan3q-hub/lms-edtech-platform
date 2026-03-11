"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Tạo thông báo mới cho lớp học
// ============================================================
export async function createAnnouncement(
    classId: string,
    data: {
        title: string;
        content?: string;
        file_url?: string;
        video_url?: string;
        link_url?: string;
        quiz_data?: any;
        resource_id?: string;
        resource_type?: string;
    }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        const { data: announcement, error } = await adminSupabase
            .from("announcements")
            .insert({
                class_id: classId,
                teacher_id: user.id,
                title: data.title,
                content: data.content || null,
                file_url: data.file_url || null,
                video_url: data.video_url || null,
                link_url: data.link_url || null,
                quiz_data: data.quiz_data || null,
                resource_id: data.resource_id || null,
                resource_type: data.resource_type || null,
            })
            .select()
            .single();

        if (error) return { error: error.message };
        return { data: announcement };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Lấy danh sách thông báo của lớp
// ============================================================
export async function fetchClassAnnouncements(classId: string) {
    try {
        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from("announcements")
            .select("id, title, content, resource_id, resource_type, file_url, video_url, link_url, quiz_data, created_at, teacher:users!announcements_teacher_id_fkey(full_name)")
            .eq("class_id", classId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) return { error: error.message };
        return { data: data || [] };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Xóa thông báo
// ============================================================
export async function deleteAnnouncement(announcementId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Kiểm tra quyền: chỉ giáo viên tạo mới được xóa
        const { data: ann } = await adminSupabase
            .from("announcements")
            .select("teacher_id")
            .eq("id", announcementId)
            .single();

        if (!ann) return { error: "Không tìm thấy thông báo" };
        if (ann.teacher_id !== user.id) return { error: "Bạn không có quyền xóa thông báo này" };

        const { error } = await adminSupabase
            .from("announcements")
            .delete()
            .eq("id", announcementId);

        if (error) return { error: error.message };
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}
