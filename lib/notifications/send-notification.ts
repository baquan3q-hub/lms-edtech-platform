"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Helper gửi notification đến nhiều người trong lớp
// Dùng bulk insert, không insert từng cái
// ============================================================
export async function sendNotificationToClass({
    classId,
    title,
    message,
    type,
    link,
    metadata,
    targetRoles = ["student", "parent"],
}: {
    classId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    metadata?: Record<string, unknown>;
    targetRoles?: ("student" | "parent" | "teacher" | "admin")[];
}) {
    const adminSupabase = createAdminClient();
    const notifications: any[] = [];

    // Lấy danh sách học sinh trong lớp
    if (targetRoles.includes("student")) {
        const { data: students } = await adminSupabase
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId)
            .eq("status", "active");

        students?.forEach((s) => {
            notifications.push({
                user_id: s.student_id,
                title,
                message,
                type,
                link: link || null,
                metadata: metadata || {},
                is_read: false,
            });
        });
    }

    // Lấy danh sách phụ huynh của học sinh trong lớp
    if (targetRoles.includes("parent")) {
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId)
            .eq("status", "active");

        const studentIds = enrollments?.map((e) => e.student_id) || [];

        if (studentIds.length > 0) {
            const { data: parents } = await adminSupabase
                .from("parent_students")
                .select("parent_id")
                .in("student_id", studentIds);

            // Deduplicate parent IDs (1 PH có thể có 2 con trong lớp)
            const uniqueParentIds = [...new Set(parents?.map((p) => p.parent_id))];

            uniqueParentIds.forEach((parentId) => {
                notifications.push({
                    user_id: parentId,
                    title,
                    message,
                    type,
                    link: link || null,
                    metadata: metadata || {},
                    is_read: false,
                });
            });
        }
    }

    // Lấy giáo viên lớp (nếu cần)
    if (targetRoles.includes("teacher")) {
        const { data: classData } = await adminSupabase
            .from("classes")
            .select("teacher_id")
            .eq("id", classId)
            .single();

        if (classData) {
            notifications.push({
                user_id: classData.teacher_id,
                title,
                message,
                type,
                link: link || null,
                metadata: metadata || {},
                is_read: false,
            });
        }
    }

    // Bulk insert
    if (notifications.length > 0) {
        const { error } = await adminSupabase
            .from("notifications")
            .insert(notifications);

        if (error) {
            console.error("Send notification error:", error);
            throw error;
        }
    }

    return { sent: notifications.length };
}

// ============================================================
// Helper gửi notification đến 1 người
// ============================================================
export async function sendNotificationToUser({
    userId,
    title,
    message,
    type,
    link,
    metadata,
}: {
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    metadata?: Record<string, unknown>;
}) {
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from("notifications")
        .insert({
            user_id: userId,
            title,
            message,
            type,
            link: link || null,
            metadata: metadata || {},
            is_read: false,
        });

    if (error) {
        console.error("Send notification to user error:", error);
        throw error;
    }

    return { sent: 1 };
}

// ============================================================
// Helper gửi notification đến học sinh + phụ huynh của học sinh đó
// ============================================================
export async function sendNotificationToStudentAndParents({
    studentId,
    title,
    message,
    type,
    link,
    metadata,
}: {
    studentId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    metadata?: Record<string, unknown>;
}) {
    const adminSupabase = createAdminClient();
    const notifications: any[] = [];

    // Notification cho học sinh
    notifications.push({
        user_id: studentId,
        title,
        message,
        type,
        link: link || null,
        metadata: metadata || {},
        is_read: false,
    });

    // Tìm phụ huynh của học sinh
    const { data: parents } = await adminSupabase
        .from("parent_students")
        .select("parent_id")
        .eq("student_id", studentId);

    parents?.forEach((p) => {
        notifications.push({
            user_id: p.parent_id,
            title,
            message,
            type,
            link: link || null,
            metadata: metadata || {},
            is_read: false,
        });
    });

    // Bulk insert
    if (notifications.length > 0) {
        const { error } = await adminSupabase
            .from("notifications")
            .insert(notifications);

        if (error) {
            console.error("Send notification error:", error);
            throw error;
        }
    }

    return { sent: notifications.length };
}
