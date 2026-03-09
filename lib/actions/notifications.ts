"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key_123");

/**
 * Fetch notifications for the current user
 */
export async function getNotifications(limit = 20) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: [], error: "Unauthorized" };

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching notifications:", error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

    if (error) {
        console.error("Error marking notification read:", error);
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) {
        console.error("Error marking all read:", error);
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Create a system notification (Admin only server action)
 */
export async function createSystemNotification(userId: string, title: string, message: string, type: string, link?: string) {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
        .from("notifications")
        .insert({
            user_id: userId,
            title,
            message,
            type,
            link
        });

    if (error) {
        console.error("Error creating notification:", error);
        return { error: error.message };
    }

    return { error: null };
}
