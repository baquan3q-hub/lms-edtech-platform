"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Láy danh sách các buổi học của một lớp
 */
export async function getClassSessions(classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("class_sessions")
            .select("*")
            .eq("class_id", classId)
            .order("session_date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Lỗi getClassSessions:", error);
        return { data: [], error: error.message };
    }
}

/**
 * Cập nhật thông tin chi tiết một buổi học
 */
export async function updateClassSession(
    sessionId: string,
    updates: {
        topic?: string;
        description?: string;
        materials_url?: string[];
        homework?: string;
        status?: string;
        cancel_reason?: string;
        teacher_notes?: string;
    },
    classId: string
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Cập nhật session
        const { error, data: updatedSession } = await adminSupabase
            .from("class_sessions")
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq("id", sessionId)
            .select()
            .single();

        if (error) throw error;

        // Nếu huỷ buổi học, ta có thể gửi thông báo tới học sinh và phụ huynh
        if (updates.status === 'cancelled') {
            const { data: enrollments } = await adminSupabase
                .from("enrollments")
                .select("student_id")
                .eq("class_id", classId)
                .eq("status", "active");

            if (enrollments && enrollments.length > 0) {
                const notifications = [];
                for (const en of enrollments) {
                    // Thông báo tới học sinh
                    notifications.push({
                        user_id: en.student_id,
                        title: "Hủy buổi học",
                        message: `Buổi học ngày ${updatedSession.session_date} đã bị hủy.${updates.cancel_reason ? ` Lý do: ${updates.cancel_reason}` : ''}`,
                        type: "system",
                        link: `/student/schedule` // Giả định
                    });

                    // Lấy ds phụ huynh để thông báo
                    const { data: parents } = await adminSupabase
                        .from("parent_students")
                        .select("parent_id")
                        .eq("student_id", en.student_id);

                    if (parents) {
                        for (const p of parents) {
                            notifications.push({
                                user_id: p.parent_id,
                                title: "Hủy buổi học của con",
                                message: `Buổi học của con trong lớp ngày ${updatedSession.session_date} đã bị hủy.`,
                                type: "system",
                                link: `/parent/children/${en.student_id}/schedule`
                            });
                        }
                    }
                }

                if (notifications.length > 0) {
                    await adminSupabase.from("notifications").insert(notifications);
                }
            }
        }

        revalidatePath(`/teacher/classes/${classId}/schedule`);
        return { success: true, data: updatedSession, error: null };
    } catch (error: any) {
        console.error("Lỗi updateClassSession:", error);
        return { success: false, error: error.message };
    }
}
