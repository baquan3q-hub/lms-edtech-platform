"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationToClass, sendNotificationToUser } from "@/lib/notifications/send-notification";

// ============================================================
// Tạo thông báo từ Admin (đa phạm vi: system / course / class)
// ============================================================
export async function createAdminAnnouncement(data: {
    title: string;
    content?: string;
    scope: "system" | "course" | "class";
    courseId?: string;
    classId?: string;
    // Đính kèm
    attachments?: { url: string; name: string; size: number; type: string }[];
    video_url?: string;
    link_url?: string;
    // Tùy chọn
    target_roles?: string[];
    is_pinned?: boolean;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        // Kiểm tra role admin
        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role !== "admin") return { error: "Không có quyền" };

        // Xây dựng insert data
        const insertData: any = {
            title: data.title,
            content: data.content || null,
            scope: data.scope,
            created_by_role: "admin",
            teacher_id: user.id, // Dùng teacher_id để lưu admin creator
            attachments: data.attachments || [],
            video_url: data.video_url || null,
            link_url: data.link_url || null,
            target_roles: data.target_roles || ["student", "parent"],
            is_pinned: data.is_pinned || false,
        };

        if (data.scope === "course" && data.courseId) {
            insertData.course_id = data.courseId;
        }
        if (data.scope === "class" && data.classId) {
            insertData.class_id = data.classId;
        }

        const { data: announcement, error } = await adminSupabase
            .from("announcements")
            .insert(insertData)
            .select()
            .single();

        if (error) return { error: error.message };

        // Gửi notification tự động
        try {
            await sendAdminNotifications(adminSupabase, data, announcement.id);
        } catch (notifErr) {
            console.error("Notification error (non-critical):", notifErr);
        }

        return { data: announcement };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Helper: Gửi notification dựa vào scope
// ============================================================
async function sendAdminNotifications(adminSupabase: any, data: any, announcementId: string) {
    const notifications: any[] = [];
    const targetRoles = data.target_roles || ["student", "parent"];

    if (data.scope === "system") {
        // Gửi cho tất cả users có role phù hợp
        const { data: users } = await adminSupabase
            .from("users")
            .select("id, role")
            .in("role", targetRoles);

        users?.forEach((u: any) => {
            const rolePath = u.role === "student" ? "student" : u.role === "teacher" ? "teacher" : "parent";
            notifications.push({
                user_id: u.id,
                title: `📢 ${data.title}`,
                message: data.content?.substring(0, 150) || "Có thông báo mới từ Ban quản lý",
                type: "announcement",
                link: `/${rolePath}/announcements`,
                metadata: { announcementId, scope: "system" },
                is_read: false,
            });
        });
    } else if (data.scope === "course" && data.courseId) {
        // Gửi cho tất cả HS/PH trong các lớp thuộc khóa
        const { data: classes } = await adminSupabase
            .from("classes")
            .select("id")
            .eq("course_id", data.courseId);

        for (const cls of classes || []) {
            const classNotifs = await buildClassNotifications(adminSupabase, cls.id, data, announcementId, targetRoles);
            notifications.push(...classNotifs);
        }
    } else if (data.scope === "class" && data.classId) {
        const classNotifs = await buildClassNotifications(adminSupabase, data.classId, data, announcementId, targetRoles);
        notifications.push(...classNotifs);
    }

    // Deduplicate by user_id
    const uniqueNotifs = Array.from(
        new Map(notifications.map((n) => [n.user_id, n])).values()
    );

    if (uniqueNotifs.length > 0) {
        await adminSupabase.from("notifications").insert(uniqueNotifs);
    }

    return { sent: uniqueNotifs.length };
}

// ============================================================
// Helper: Build notifications cho 1 lớp
// ============================================================
async function buildClassNotifications(
    adminSupabase: any,
    classId: string,
    data: any,
    announcementId: string,
    targetRoles: string[]
) {
    const notifications: any[] = [];

    if (targetRoles.includes("student")) {
        const { data: students } = await adminSupabase
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId)
            .eq("status", "active");

        students?.forEach((s: any) => {
            notifications.push({
                user_id: s.student_id,
                title: `📢 ${data.title}`,
                message: data.content?.substring(0, 150) || "Có thông báo mới",
                type: "announcement",
                link: `/student/announcements`,
                metadata: { announcementId, scope: data.scope },
                is_read: false,
            });
        });
    }

    if (targetRoles.includes("parent")) {
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId)
            .eq("status", "active");

        const studentIds = enrollments?.map((e: any) => e.student_id) || [];
        if (studentIds.length > 0) {
            const { data: parents } = await adminSupabase
                .from("parent_students")
                .select("parent_id")
                .in("student_id", studentIds);

            const uniqueParentIds = [...new Set(parents?.map((p: any) => p.parent_id))];
            uniqueParentIds.forEach((parentId) => {
                notifications.push({
                    user_id: parentId,
                    title: `📢 ${data.title}`,
                    message: data.content?.substring(0, 150) || "Có thông báo mới từ nhà trường",
                    type: "announcement",
                    link: `/parent/announcements`,
                    metadata: { announcementId, scope: data.scope },
                    is_read: false,
                });
            });
        }
    }

    if (targetRoles.includes("teacher")) {
        const { data: cls } = await adminSupabase
            .from("classes")
            .select("teacher_id")
            .eq("id", classId)
            .single();

        if (cls?.teacher_id) {
            notifications.push({
                user_id: cls.teacher_id,
                title: `📢 ${data.title}`,
                message: data.content?.substring(0, 150) || "Có thông báo mới",
                type: "announcement",
                link: `/teacher/announcements`,
                metadata: { announcementId, scope: data.scope },
                is_read: false,
            });
        }
    }

    return notifications;
}

// ============================================================
// Lấy danh sách thông báo admin (có thống kê đọc)
// ============================================================
export async function fetchAdminAnnouncements(filters?: {
    scope?: string;
    limit?: number;
}) {
    try {
        const adminSupabase = createAdminClient();

        let query = adminSupabase
            .from("announcements")
            .select(`
                id, title, content, scope, course_id, class_id, 
                attachments, video_url, link_url, target_roles, 
                is_pinned, created_by_role, created_at,
                course:courses(name),
                class:classes(name)
            `)
            .eq("created_by_role", "admin")
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(filters?.limit || 50);

        if (filters?.scope && filters.scope !== "all") {
            query = query.eq("scope", filters.scope);
        }

        const { data, error } = await query;
        if (error) return { error: error.message };

        // Lấy thống kê đọc cho mỗi thông báo
        const announcementIds = data?.map((a: any) => a.id) || [];
        let readStats: Record<string, { total_read: number; total_confirmed: number }> = {};

        if (announcementIds.length > 0) {
            const { data: reads } = await adminSupabase
                .from("announcement_reads")
                .select("announcement_id, confirmed_at")
                .in("announcement_id", announcementIds);

            if (reads) {
                for (const read of reads) {
                    if (!readStats[read.announcement_id]) {
                        readStats[read.announcement_id] = { total_read: 0, total_confirmed: 0 };
                    }
                    readStats[read.announcement_id].total_read++;
                    if (read.confirmed_at) {
                        readStats[read.announcement_id].total_confirmed++;
                    }
                }
            }
        }

        const enriched = data?.map((a: any) => ({
            ...a,
            stats: readStats[a.id] || { total_read: 0, total_confirmed: 0 },
        }));

        return { data: enriched || [] };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Lấy chi tiết thống kê xem thông báo
// ============================================================
export async function getAnnouncementReadDetails(announcementId: string) {
    try {
        const adminSupabase = createAdminClient();

        const { data: reads, error } = await adminSupabase
            .from("announcement_reads")
            .select("user_id, read_at, confirmed_at, user:users(full_name, email, role)")
            .eq("announcement_id", announcementId)
            .order("read_at", { ascending: false });

        if (error) return { error: error.message };
        return { data: reads || [] };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// PH xác nhận đã xem thông báo
// ============================================================
export async function confirmAnnouncementRead(announcementId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        // Upsert: tạo hoặc cập nhật record
        const { error } = await adminSupabase
            .from("announcement_reads")
            .upsert({
                announcement_id: announcementId,
                user_id: user.id,
                read_at: new Date().toISOString(),
                confirmed_at: new Date().toISOString(),
            }, { onConflict: "announcement_id,user_id" });

        if (error) return { error: error.message };
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Record đọc thông báo (khi click vào)
// ============================================================
export async function recordAnnouncementRead(announcementId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập" };

        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from("announcement_reads")
            .upsert({
                announcement_id: announcementId,
                user_id: user.id,
                read_at: new Date().toISOString(),
            }, { onConflict: "announcement_id,user_id" });

        if (error) return { error: error.message };
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Lỗi không xác định" };
    }
}

// ============================================================
// Lấy danh sách khóa học và lớp (cho Admin Composer)
// ============================================================
export async function fetchCoursesAndClasses() {
    try {
        const adminSupabase = createAdminClient();

        const { data: courses } = await adminSupabase
            .from("courses")
            .select("id, name")
            .order("name");

        const { data: classes } = await adminSupabase
            .from("classes")
            .select("id, name, course_id, course:courses(name)")
            .order("name");

        return {
            courses: courses || [],
            classes: classes || [],
        };
    } catch (err: any) {
        return { courses: [], classes: [], error: err.message };
    }
}

// ============================================================
// Xóa thông báo admin
// ============================================================
export async function deleteAdminAnnouncement(announcementId: string) {
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
