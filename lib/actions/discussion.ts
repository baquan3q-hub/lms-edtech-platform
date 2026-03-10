"use server";

import { createClient } from "@/lib/supabase/server";

export interface DiscussionMessage {
    id: string;
    item_id: string;
    class_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user?: {
        id: string;
        full_name: string;
        avatar_url: string;
        role: string;
    };
}

/**
 * Lấy lịch sử tin nhắn của một bài học thảo luận
 */
export async function getDiscussionMessages(itemId: string) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('discussion_messages')
            .select(`
        *,
        user:users(id, full_name, avatar_url, role)
      `)
            .eq('item_id', itemId)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) {
            console.error("Error fetching discussion messages:", error);
            return { error: error.message, data: null };
        }

        return { data: data as DiscussionMessage[], error: null };
    } catch (err: any) {
        console.error("Exception in getDiscussionMessages:", err);
        return { error: err.message, data: null };
    }
}

/**
 * Gửi một tin nhắn mới vào cuộc thảo luận
 */
export async function sendDiscussionMessage(itemId: string, classId: string, content: string) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Bạn chưa đăng nhập" };

        if (!content || content.trim() === "") {
            return { error: "Nội dung tin nhắn không được để trống" };
        }

        const { error } = await supabase
            .from('discussion_messages')
            .insert({
                item_id: itemId,
                class_id: classId,
                user_id: user.id,
                content: content.trim()
            });

        if (error) {
            console.error("Error sending discussion message:", error);
            return { error: error.message };
        }

        return { error: null, success: true };
    } catch (err: any) {
        console.error("Exception in sendDiscussionMessage:", err);
        return { error: err.message };
    }
}

/**
 * (Giáo viên) Xóa một tin nhắn (kiểm duyệt)
 */
export async function deleteDiscussionMessage(messageId: string) {
    try {
        const supabase = await createClient();

        // Server action bảo mật bằng JWT và custom backend logic
        // Có thể check role giáo viên ở đây, hoặc đơn giản cứ verify user có trong lớp
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Bạn chưa đăng nhập" };

        // Kiểm tra quyền (chỉ admin hoặc teacher mới được xóa tin nhắn của người khác, hoặc user tự xóa)
        // Để đơn giản ta có thể check claims lấy trực tiếp từ database
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

        // Nếu ko phải admin hoặc teacher, chúng ta kiểm tra người xóa có phải chủ nhân tin nhắn?
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            const { data: message } = await supabase.from('discussion_messages').select('user_id').eq('id', messageId).single();
            if (!message || message.user_id !== user.id) {
                return { error: "Bạn không có quyền xóa tin nhắn này" };
            }
        }

        const { error } = await supabase
            .from('discussion_messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error("Error deleting discussion message:", error);
            return { error: error.message };
        }

        return { error: null, success: true };
    } catch (err: any) {
        console.error("Exception in deleteDiscussionMessage:", err);
        return { error: err.message };
    }
}
