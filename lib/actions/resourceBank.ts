"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ==========================================
// NGÂN HÀNG TÀI LIỆU SỐ — RESOURCE BANK
// ==========================================

export type ResourceType = "quiz" | "essay" | "document" | "video" | "file" | "link";

/**
 * Lấy danh sách tài nguyên của giáo viên hiện tại.
 * Có thể lọc theo type.
 */
export async function fetchTeacherResources(type?: ResourceType) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        let query = adminSupabase
            .from("teacher_resources")
            .select("*")
            .eq("teacher_id", user.id)
            .order("created_at", { ascending: false });

        if (type) {
            query = query.eq("type", type);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { data, error: null };
    } catch (error: any) {
        console.error("fetchTeacherResources error:", error);
        return { data: null, error: error.message };
    }
}

/**
 * Tạo tài nguyên mới
 */
export async function createResource(data: {
    type: ResourceType;
    title: string;
    description?: string;
    content?: any;
    file_url?: string;
    video_url?: string;
    link_url?: string;
    tags?: string[];
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data: resource, error } = await adminSupabase
            .from("teacher_resources")
            .insert([{ ...data, teacher_id: user.id }])
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/teacher/lessons");
        return { data: resource, error: null };
    } catch (error: any) {
        console.error("createResource error:", error);
        return { data: null, error: error.message };
    }
}

/**
 * Cập nhật tài nguyên
 */
export async function updateResource(id: string, updates: {
    title?: string;
    description?: string;
    content?: any;
    file_url?: string;
    video_url?: string;
    link_url?: string;
    tags?: string[];
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("teacher_resources")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("teacher_id", user.id);

        if (error) throw error;

        revalidatePath("/teacher/lessons");
        return { error: null };
    } catch (error: any) {
        console.error("updateResource error:", error);
        return { error: error.message };
    }
}

/**
 * Xóa tài nguyên
 */
export async function deleteResource(id: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("teacher_resources")
            .delete()
            .eq("id", id)
            .eq("teacher_id", user.id);

        if (error) throw error;

        revalidatePath("/teacher/lessons");
        return { error: null };
    } catch (error: any) {
        console.error("deleteResource error:", error);
        return { error: error.message };
    }
}

/**
 * Lấy danh sách lớp của giáo viên (cho dialog chia sẻ)
 */
export async function fetchTeacherClassesForShare() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("classes")
            .select("id, name, course:courses(name)")
            .eq("teacher_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("fetchTeacherClassesForShare error:", error);
        return { data: null, error: error.message };
    }
}

/**
 * Chia sẻ tài nguyên vào lớp → tạo thông báo (announcement)
 */
export async function shareResourceToClass(data: {
    resource_id: string;
    resource_type: string;
    class_id: string;
    title: string;
    content: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("announcements")
            .insert([{
                teacher_id: user.id,
                class_id: data.class_id,
                title: data.title,
                content: data.content,
                resource_id: data.resource_id,
                resource_type: data.resource_type,
            }]);

        if (error) throw error;

        revalidatePath("/teacher/lessons");
        revalidatePath(`/teacher/classes/${data.class_id}`);
        revalidatePath("/student");
        return { error: null };
    } catch (error: any) {
        console.error("shareResourceToClass error:", error);
        return { error: error.message };
    }
}

// ============================================================
// Lấy danh sách bộ đề trắc nghiệm từ ngân hàng tài nguyên
// ============================================================
export async function fetchTeacherQuizResources() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập", data: [] };

        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from("teacher_resources")
            .select("id, title, description, type, content, created_at")
            .eq("teacher_id", user.id)
            .eq("type", "quiz")
            .order("created_at", { ascending: false });

        if (error) return { error: error.message, data: [] };
        return { data: data || [] };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định", data: [] };
    }
}
