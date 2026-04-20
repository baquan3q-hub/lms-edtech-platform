"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================
// GOALS — CRUD
// ============================================================

/**
 * Lấy danh sách mục tiêu của 1 học sinh
 * Dùng bởi cả PH và HS
 */
export async function fetchStudentGoals(studentId: string) {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("student_goals")
            .select("*, creator:users!student_goals_created_by_fkey(full_name)")
            .eq("student_id", studentId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("fetchStudentGoals error:", error);
        return { data: [], error: error.message };
    }
}

/**
 * Tạo mục tiêu mới
 * Có thể do PH hoặc HS tạo
 */
export async function createGoal(input: {
    studentId: string;
    title: string;
    description?: string;
    targetDate?: string; // YYYY-MM-DD
}) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        // Xác định role của người tạo
        const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        const createdByRole = userData?.role || "student";

        // Nếu là parent → kiểm tra quyền xem con
        if (createdByRole === "parent") {
            const { data: link } = await supabase
                .from("parent_students")
                .select("id")
                .eq("parent_id", user.id)
                .eq("student_id", input.studentId)
                .single();
            if (!link) return { error: "Bạn không có quyền đặt mục tiêu cho học sinh này." };
        }

        // Nếu là student → chỉ được tạo cho chính mình
        if (createdByRole === "student" && input.studentId !== user.id) {
            return { error: "Không có quyền." };
        }

        const { error } = await supabase
            .from("student_goals")
            .insert({
                student_id: input.studentId,
                created_by: user.id,
                created_by_role: createdByRole,
                title: input.title,
                description: input.description || null,
                target_date: input.targetDate || null,
            });

        if (error) throw error;

        revalidatePath("/parent/goals");
        revalidatePath("/student/goals");
        return { error: null };
    } catch (error: any) {
        console.error("createGoal error:", error);
        return { error: error.message };
    }
}

/**
 * Cập nhật mục tiêu
 */
export async function updateGoal(goalId: string, input: {
    title?: string;
    description?: string;
    targetDate?: string | null;
    status?: string;
}) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        const updateData: any = { updated_at: new Date().toISOString() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.targetDate !== undefined) updateData.target_date = input.targetDate;
        if (input.status !== undefined) updateData.status = input.status;

        const { error } = await supabase
            .from("student_goals")
            .update(updateData)
            .eq("id", goalId);

        if (error) throw error;

        revalidatePath("/parent/goals");
        revalidatePath("/student/goals");
        return { error: null };
    } catch (error: any) {
        console.error("updateGoal error:", error);
        return { error: error.message };
    }
}

/**
 * Xóa mục tiêu
 */
export async function deleteGoal(goalId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("student_goals")
            .delete()
            .eq("id", goalId);

        if (error) throw error;

        revalidatePath("/parent/goals");
        revalidatePath("/student/goals");
        return { error: null };
    } catch (error: any) {
        console.error("deleteGoal error:", error);
        return { error: error.message };
    }
}

// ============================================================
// HABITS — CRUD (chỉ PH tạo)
// ============================================================

/**
 * Lấy danh sách thói quen + logs 7 ngày gần nhất
 */
export async function fetchStudentHabits(studentId: string) {
    try {
        const supabase = createAdminClient();

        const { data: habits, error } = await supabase
            .from("student_habits")
            .select("*, parent:users!student_habits_parent_id_fkey(full_name)")
            .eq("student_id", studentId)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) throw error;
        if (!habits || habits.length === 0) return { data: [], error: null };

        // Lấy logs 14 ngày gần nhất (đủ cho 2 tuần, phục vụ cả weekly)
        const habitIds = habits.map((h: any) => h.id);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const dateStr = fourteenDaysAgo.toISOString().split("T")[0];

        const { data: logs } = await supabase
            .from("student_habit_logs")
            .select("*")
            .in("habit_id", habitIds)
            .gte("log_date", dateStr)
            .order("log_date", { ascending: false });

        // Merge logs vào habits
        const enriched = habits.map((h: any) => {
            const habitLogs = (logs || []).filter((l: any) => l.habit_id === h.id);

            // Tính streak
            let streak = 0;
            const today = new Date();
            for (let i = 0; i < 14; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split("T")[0];

                if (h.frequency === "weekly") {
                    // Weekly: chỉ check 1 lần/tuần — tìm log trong tuần
                    const weekStart = new Date(d);
                    weekStart.setDate(d.getDate() - d.getDay()); // Sunday
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    const weekLog = habitLogs.find((l: any) =>
                        l.completed && l.log_date >= weekStart.toISOString().split("T")[0] &&
                        l.log_date <= weekEnd.toISOString().split("T")[0]
                    );
                    if (weekLog) streak++;
                    else break;
                    // Skip to previous week
                    i += 6;
                } else {
                    // Daily
                    const dayLog = habitLogs.find((l: any) => l.log_date === dStr && l.completed);
                    if (dayLog) streak++;
                    else if (i > 0) break; // Cho phép hôm nay chưa check
                }
            }

            // Lấy 7 ngày gần nhất cho daily, hoặc 4 tuần cho weekly
            const recentDays: { date: string; completed: boolean }[] = [];
            if (h.frequency === "daily") {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    const dStr = d.toISOString().split("T")[0];
                    const log = habitLogs.find((l: any) => l.log_date === dStr);
                    recentDays.push({ date: dStr, completed: !!log?.completed });
                }
            } else {
                // Weekly: 4 tuần
                for (let w = 3; w >= 0; w--) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - w * 7);
                    const weekStart = new Date(d);
                    weekStart.setDate(d.getDate() - d.getDay());
                    const wStr = weekStart.toISOString().split("T")[0];
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    const weekLog = habitLogs.find((l: any) =>
                        l.completed && l.log_date >= wStr &&
                        l.log_date <= weekEnd.toISOString().split("T")[0]
                    );
                    recentDays.push({ date: wStr, completed: !!weekLog });
                }
            }

            // Hôm nay đã check chưa
            const todayStr = today.toISOString().split("T")[0];
            const todayLog = habitLogs.find((l: any) => l.log_date === todayStr);
            const completedToday = !!todayLog?.completed;

            return {
                ...h,
                logs: habitLogs,
                streak,
                recentDays,
                completedToday,
                todayLogId: todayLog?.id || null,
            };
        });

        return { data: enriched, error: null };
    } catch (error: any) {
        console.error("fetchStudentHabits error:", error);
        return { data: [], error: error.message };
    }
}

/**
 * Tạo thói quen mới (chỉ PH)
 */
export async function createHabit(input: {
    studentId: string;
    title: string;
    description?: string;
    frequency?: "daily" | "weekly";
}) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        // Kiểm tra PH có link với HS không
        const { data: link } = await supabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", input.studentId)
            .single();
        if (!link) return { error: "Bạn không có quyền đặt thói quen cho học sinh này." };

        const { error } = await supabase
            .from("student_habits")
            .insert({
                student_id: input.studentId,
                parent_id: user.id,
                title: input.title,
                description: input.description || null,
                frequency: input.frequency || "daily",
            });

        if (error) throw error;

        revalidatePath("/parent/goals");
        revalidatePath("/student/goals");
        return { error: null };
    } catch (error: any) {
        console.error("createHabit error:", error);
        return { error: error.message };
    }
}

/**
 * Cập nhật thói quen
 */
export async function updateHabit(habitId: string, input: {
    title?: string;
    description?: string;
    isActive?: boolean;
    frequency?: "daily" | "weekly";
}) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        const updateData: any = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.isActive !== undefined) updateData.is_active = input.isActive;
        if (input.frequency !== undefined) updateData.frequency = input.frequency;

        const { error } = await supabase
            .from("student_habits")
            .update(updateData)
            .eq("id", habitId);

        if (error) throw error;

        revalidatePath("/parent/goals");
        revalidatePath("/student/goals");
        return { error: null };
    } catch (error: any) {
        console.error("updateHabit error:", error);
        return { error: error.message };
    }
}

/**
 * Xóa thói quen (cascade xóa logs)
 */
export async function deleteHabit(habitId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("student_habits")
            .delete()
            .eq("id", habitId);

        if (error) throw error;

        revalidatePath("/parent/goals");
        revalidatePath("/student/goals");
        return { error: null };
    } catch (error: any) {
        console.error("deleteHabit error:", error);
        return { error: error.message };
    }
}

// ============================================================
// HABIT LOGS — HS toggle check/uncheck
// ============================================================

/**
 * Toggle hoàn thành thói quen cho ngày hôm nay
 * Chỉ HS mới được tự check
 */
export async function toggleHabitLog(habitId: string) {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { error: "Chưa đăng nhập.", completed: false };

        const supabase = createAdminClient();
        const today = new Date().toISOString().split("T")[0];

        // Kiểm tra đã có log chưa
        const { data: existing } = await supabase
            .from("student_habit_logs")
            .select("id, completed")
            .eq("habit_id", habitId)
            .eq("log_date", today)
            .single();

        if (existing) {
            // Toggle
            const newCompleted = !existing.completed;
            const { error } = await supabase
                .from("student_habit_logs")
                .update({
                    completed: newCompleted,
                    completed_at: newCompleted ? new Date().toISOString() : null,
                })
                .eq("id", existing.id);

            if (error) throw error;

            revalidatePath("/student/goals");
            revalidatePath("/parent/goals");
            return { error: null, completed: newCompleted };
        } else {
            // Insert mới = completed
            const { error } = await supabase
                .from("student_habit_logs")
                .insert({
                    habit_id: habitId,
                    student_id: user.id,
                    log_date: today,
                    completed: true,
                    completed_at: new Date().toISOString(),
                });

            if (error) throw error;

            revalidatePath("/student/goals");
            revalidatePath("/parent/goals");
            return { error: null, completed: true };
        }
    } catch (error: any) {
        console.error("toggleHabitLog error:", error);
        return { error: error.message, completed: false };
    }
}

// ============================================================
// HELPERS — Dùng cho pages
// ============================================================

/**
 * Lấy danh sách con em đã liên kết (cho dropdown chọn con)
 * Trả về gọn hơn fetchMyLinkedStudents
 */
export async function fetchMyChildren() {
    try {
        const supabaseClient = await createClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { data: [], error: "Chưa đăng nhập." };

        const supabase = createAdminClient();

        const { data: links } = await supabase
            .from("parent_students")
            .select("student_id")
            .eq("parent_id", user.id);

        const studentIds = (links || []).map((l: any) => l.student_id);
        if (studentIds.length === 0) return { data: [], error: null };

        const { data: students } = await supabase
            .from("users")
            .select("id, full_name, avatar_url")
            .in("id", studentIds);

        return { data: students || [], error: null };
    } catch (error: any) {
        return { data: [], error: error.message };
    }
}
