"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { StudentPoint } from "@/types/database";

export async function getClassPointsLeaderboard(classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Fetch all enrolled students in the class
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select("student_id, users:users!student_id(id, full_name, email, avatar_url)")
            .eq("class_id", classId)
            .eq("status", "active");

        if (enrollError) throw enrollError;

        // 2. Fetch all point transactions for the class
        const { data: pointsData, error: pointsError } = await adminSupabase
            .from("student_points")
            .select("student_id, points")
            .eq("class_id", classId);

        if (pointsError) throw pointsError;

        // 3. Aggregate points per student
        const studentPointsMap: Record<string, number> = {};
        (pointsData || []).forEach(p => {
            studentPointsMap[p.student_id] = (studentPointsMap[p.student_id] || 0) + p.points;
        });

        // 4. Combine and sort
        const leaderboard = (enrollments || []).map((en: any) => {
            const studentUser = Array.isArray(en.users) ? en.users[0] : en.users; // Handle different PostgREST relationships
            return {
                student_id: en.student_id,
                full_name: studentUser?.full_name || "Unknown Student",
                email: studentUser?.email || "",
                avatar_url: studentUser?.avatar_url || null,
                total_points: studentPointsMap[en.student_id] || 0,
            };
        });

        leaderboard.sort((a, b) => b.total_points - a.total_points);

        return { data: leaderboard, error: null };
    } catch (error: any) {
        console.error("Error fetching leaderboard:", error);
        return { data: [], error: error.message };
    }
}

export async function getStudentPointHistory(studentId: string, classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("student_points")
            .select("*, teacher:users!teacher_id(full_name)")
            .eq("student_id", studentId)
            .eq("class_id", classId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Error fetching student point history:", error);
        return { data: [], error: error.message };
    }
}

export async function addPointTransaction(data: {
    student_id: string;
    class_id: string;
    points: number;
    reason: string;
    type: StudentPoint["type"];
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("student_points")
            .insert({
                student_id: data.student_id,
                class_id: data.class_id,
                teacher_id: user.id, // Authenticated teacher
                points: data.points,
                reason: data.reason,
                type: data.type,
            });

        if (error) throw error;

        revalidatePath(`/teacher/classes/${data.class_id}/points`);
        revalidatePath(`/student/classes/${data.class_id}`);
        return { error: null };
    } catch (error: any) {
        console.error("Error adding point transaction:", error);
        return { error: error.message };
    }
}

export async function deletePointTransaction(transactionId: string, classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("student_points")
            .delete()
            .eq("id", transactionId);

        if (error) throw error;

        revalidatePath(`/teacher/classes/${classId}/points`);
        revalidatePath(`/student/classes/${classId}`);
        return { error: null };
    } catch (error: any) {
        console.error("Error deleting point transaction:", error);
        return { error: error.message };
    }
}

// ============================================================
// STUDENT: Xem điểm tích lũy của bản thân ở tất cả lớp
// ============================================================
export async function getMyPoints() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy tất cả lớp đang enrolled
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, classes(name, course_id, courses(name))")
            .eq("student_id", user.id)
            .eq("status", "active");

        const classIds = (enrollments || []).map((e: any) => e.class_id);
        if (classIds.length === 0) return { data: { byClass: [], recentHistory: [], totalPoints: 0 }, error: null };

        // Lấy tất cả điểm của student
        const { data: allPoints, error: pointsError } = await adminSupabase
            .from("student_points")
            .select("*, teacher:users!teacher_id(full_name), class:classes!class_id(name)")
            .eq("student_id", user.id)
            .in("class_id", classIds)
            .order("created_at", { ascending: false });

        if (pointsError) throw pointsError;

        // Tính tổng điểm theo lớp
        const classPointsMap: Record<string, number> = {};
        (allPoints || []).forEach((p: any) => {
            classPointsMap[p.class_id] = (classPointsMap[p.class_id] || 0) + p.points;
        });

        const byClass = (enrollments || []).map((en: any) => {
            const classInfo = Array.isArray(en.classes) ? en.classes[0] : en.classes;
            const courseInfo = Array.isArray(classInfo?.courses) ? classInfo?.courses[0] : classInfo?.courses;
            return {
                class_id: en.class_id,
                class_name: classInfo?.name || "Lớp học",
                course_name: courseInfo?.name || "Khóa học",
                total_points: classPointsMap[en.class_id] || 0,
            };
        });

        const totalPoints = byClass.reduce((sum, c) => sum + c.total_points, 0);

        return {
            data: {
                byClass,
                recentHistory: (allPoints || []).slice(0, 20), // 20 lần gần nhất
                totalPoints,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetching my points:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// PARENT: Xem điểm tích lũy của con mình
// ============================================================
export async function getStudentPointsForParent(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Xác minh quyền phụ huynh
        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role !== "admin") {
            const { data: link } = await adminSupabase
                .from("parent_students")
                .select("id")
                .eq("parent_id", user.id)
                .eq("student_id", studentId)
                .single();

            if (!link) return { data: null, error: "Access denied" };
        }

        // Lấy lớp đang học
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, classes(name, course_id, courses(name))")
            .eq("student_id", studentId)
            .eq("status", "active");

        const classIds = (enrollments || []).map((e: any) => e.class_id);
        if (classIds.length === 0) return { data: { byClass: [], recentHistory: [], totalPoints: 0 }, error: null };

        // Lấy tất cả điểm
        const { data: allPoints, error: pointsError } = await adminSupabase
            .from("student_points")
            .select("*, teacher:users!teacher_id(full_name), class:classes!class_id(name)")
            .eq("student_id", studentId)
            .in("class_id", classIds)
            .order("created_at", { ascending: false });

        if (pointsError) throw pointsError;

        // Tính tổng theo lớp
        const classPointsMap: Record<string, number> = {};
        (allPoints || []).forEach((p: any) => {
            classPointsMap[p.class_id] = (classPointsMap[p.class_id] || 0) + p.points;
        });

        const byClass = (enrollments || []).map((en: any) => {
            const classInfo = Array.isArray(en.classes) ? en.classes[0] : en.classes;
            const courseInfo = Array.isArray(classInfo?.courses) ? classInfo?.courses[0] : classInfo?.courses;
            return {
                class_id: en.class_id,
                class_name: classInfo?.name || "Lớp học",
                course_name: courseInfo?.name || "Khóa học",
                total_points: classPointsMap[en.class_id] || 0,
            };
        });

        const totalPoints = byClass.reduce((sum, c) => sum + c.total_points, 0);

        return {
            data: {
                byClass,
                recentHistory: (allPoints || []).slice(0, 20),
                totalPoints,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetching student points for parent:", error);
        return { data: null, error: error.message };
    }
}

