"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ============================================================
// Student/Parent: Gửi phản hồi
// ============================================================
export async function submitUserFeedback({
    type,
    title,
    content,
    targetTeacherId,
    classId,
}: {
    type: string;
    title: string;
    content: string;
    targetTeacherId?: string;
    classId?: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        // Lấy role + tên
        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase
            .from("users")
            .select("role, full_name")
            .eq("id", user.id)
            .single();

        if (!userData || !["student", "parent"].includes(userData.role)) {
            return { error: "Chỉ học sinh và phụ huynh mới có thể gửi phản hồi" };
        }

        const { error } = await adminSupabase
            .from("user_feedback")
            .insert({
                user_id: user.id,
                role: userData.role,
                type,
                title,
                content,
                status: "pending",
            });

        if (error) return { error: error.message };

        // === Gửi notification đến tất cả Admin ===
        const { data: admins } = await adminSupabase
            .from("users")
            .select("id")
            .eq("role", "admin");

        const roleName = userData.role === "student" ? "Học sinh" : "Phụ huynh";
        const adminNotifications = (admins || []).map((a: any) => ({
            user_id: a.id,
            title: `📝 Phản hồi mới từ ${roleName}`,
            message: `${userData.full_name} gửi phản hồi: "${title}"`,
            type: "system",
            link: "/admin/feedback",
            metadata: { feedbackType: type },
            is_read: false,
        }));

        if (adminNotifications.length > 0) {
            await adminSupabase.from("notifications").insert(adminNotifications);
        }

        // === Gửi notification đến Giáo viên (nếu có) ===
        if (targetTeacherId) {
            await adminSupabase.from("notifications").insert({
                user_id: targetTeacherId,
                title: `📝 Phản hồi từ ${roleName}`,
                message: `${userData.full_name} gửi phản hồi: "${title}"`,
                type: "feedback",
                link: null,
                metadata: { feedbackType: type, classId: classId || null },
                is_read: false,
            });
        }

        return { error: null };
    } catch (err: any) {
        return { error: err.message };
    }
}

// ============================================================
// Admin: Lấy danh sách phản hồi
// ============================================================
export async function fetchAllFeedback(options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
} = {}) {
    const { status, type, limit = 50, offset = 0 } = options;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Kiểm tra role admin
        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
        if (userData?.role !== "admin") return { data: null, error: "Không có quyền" };

        let query = adminSupabase
            .from("user_feedback")
            .select("*, user:users!user_feedback_user_id_fkey(full_name, email, avatar_url)", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status && status !== "all") query = query.eq("status", status);
        if (type && type !== "all") query = query.eq("type", type);

        const { data, count, error } = await query;
        if (error) return { data: null, error: error.message };

        return { data: { items: data || [], total: count || 0 }, error: null };
    } catch (err: any) {
        return { data: null, error: err.message };
    }
}

// ============================================================
// Admin: Cập nhật status + reply phản hồi
// ============================================================
export async function updateFeedbackStatus(
    feedbackId: string,
    updates: { status?: string; admin_reply?: string }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
        if (userData?.role !== "admin") return { error: "Không có quyền" };

        const updateData: any = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.admin_reply !== undefined) updateData.admin_reply = updates.admin_reply;
        if (updates.status === "resolved") updateData.resolved_at = new Date().toISOString();

        const { error } = await adminSupabase
            .from("user_feedback")
            .update(updateData)
            .eq("id", feedbackId);

        if (error) return { error: error.message };

        revalidatePath("/admin/feedback");
        return { error: null };
    } catch (err: any) {
        return { error: err.message };
    }
}
