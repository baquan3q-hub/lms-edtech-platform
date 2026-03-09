"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ═══════════════════════════════════════════════
// 1. Danh sách con em của phụ huynh
// ═══════════════════════════════════════════════
export function useMyChildren(parentId: string) {
    return useQuery({
        queryKey: ["my-children", parentId],
        enabled: !!parentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("parent_students")
                .select(`
                    student_id,
                    relationship,
                    student:users!student_id(id, full_name, avatar_url, email)
                `)
                .eq("parent_id", parentId);

            if (error) throw error;
            return data;
        },
    });
}

// ═══════════════════════════════════════════════
// 2. Danh sách lớp học của con
// ═══════════════════════════════════════════════
export function useChildClasses(studentId: string) {
    return useQuery({
        queryKey: ["child-classes", studentId],
        enabled: !!studentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("enrollments")
                .select(`
                    class_id,
                    status,
                    enrolled_at,
                    classes(
                        id, name,
                        teacher:users!teacher_id(full_name, avatar_url)
                    )
                `)
                .eq("student_id", studentId)
                .eq("status", "active");

            if (error) throw error;
            return data;
        },
    });
}

// ═══════════════════════════════════════════════
// 3. Lịch học sắp tới (upcoming sessions)
// ═══════════════════════════════════════════════
export function useChildSchedule(studentId: string, classIds: string[]) {
    return useQuery({
        queryKey: ["child-schedule", studentId, classIds],
        enabled: !!studentId && classIds.length > 0,
        queryFn: async () => {
            const today = new Date().toISOString().split("T")[0];
            const { data, error } = await supabase
                .from("class_sessions")
                .select("*, classes!class_id(name)")
                .in("class_id", classIds)
                .gte("session_date", today)
                .order("session_date", { ascending: true })
                .limit(14);

            if (error) throw error;
            return data;
        },
    });
}

// ═══════════════════════════════════════════════
// 4. Điểm danh gần đây của con
// ═══════════════════════════════════════════════
export function useChildAttendance(studentId: string) {
    return useQuery({
        queryKey: ["child-attendance", studentId],
        enabled: !!studentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("attendance_records")
                .select(`
                    *,
                    session:attendance_sessions!session_id(
                        session_date, start_time,
                        class:classes!class_id(name)
                    )
                `)
                .eq("student_id", studentId)
                .order("marked_at", { ascending: false })
                .limit(15);

            if (error) throw error;
            return data;
        },
    });
}

// ═══════════════════════════════════════════════
// 5. Thống kê tổng hợp cho từng lớp
// ═══════════════════════════════════════════════
export function useChildStats(studentId: string, classIds: string[]) {
    return useQuery({
        queryKey: ["child-stats", studentId, classIds],
        enabled: !!studentId && classIds.length > 0,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_class_stats")
                .select("*")
                .eq("student_id", studentId)
                .in("class_id", classIds);

            if (error) throw error;
            return data;
        },
    });
}

// ═══════════════════════════════════════════════
// 6. Điểm chuyên cần (gamification)
// ═══════════════════════════════════════════════
export function useChildAttendancePoints(studentId: string) {
    return useQuery({
        queryKey: ["attendance-points", studentId],
        enabled: !!studentId,
        queryFn: async () => {
            // Tổng điểm theo lớp
            const { data: points, error: pErr } = await supabase
                .from("attendance_points")
                .select("class_id, points_earned, reason")
                .eq("student_id", studentId);

            if (pErr) throw pErr;

            // Achievements
            const { data: achievements, error: aErr } = await supabase
                .from("student_achievements")
                .select("*")
                .eq("student_id", studentId);

            if (aErr) throw aErr;

            // Group points by class
            const classPoints: Record<string, number> = {};
            for (const p of (points || [])) {
                classPoints[p.class_id] = (classPoints[p.class_id] || 0) + p.points_earned;
            }

            const totalPoints = (points || []).reduce((sum, p) => sum + p.points_earned, 0);

            return {
                totalPoints,
                classPoints,
                achievements: achievements || [],
            };
        },
    });
}

// ═══════════════════════════════════════════════
// 7. Nhận xét / Báo cáo từ Giáo viên
// ═══════════════════════════════════════════════
export function useChildTeacherFeedback(studentId: string) {
    return useQuery({
        queryKey: ["child-feedback", studentId],
        enabled: !!studentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grade_notifications")
                .select(`
                    *,
                    classes!class_id(name),
                    teacher:users!teacher_id(full_name, avatar_url)
                `)
                .eq("student_id", studentId)
                .order("sent_at", { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
        },
    });
}

// ═══════════════════════════════════════════════
// 8. Bảng xếp hạng điểm chuyên cần
// ═══════════════════════════════════════════════
export function useAttendanceLeaderboard(classId: string) {
    return useQuery({
        queryKey: ["leaderboard", classId],
        enabled: !!classId,
        queryFn: async () => {
            // Lấy tất cả điểm chuyên cần cho lớp này
            const { data, error } = await supabase
                .from("attendance_points")
                .select(`
                    student_id,
                    points_earned,
                    reason,
                    student:users!student_id(full_name, avatar_url)
                `)
                .eq("class_id", classId);

            if (error) throw error;

            // Group by student
            const studentMap: Record<string, {
                studentId: string;
                name: string;
                avatarUrl: string | null;
                totalPoints: number;
                streakBadges: string[];
            }> = {};

            for (const row of (data || [])) {
                const sid = row.student_id;
                const studentObj = Array.isArray(row.student) ? row.student[0] : row.student;

                if (!studentMap[sid]) {
                    studentMap[sid] = {
                        studentId: sid,
                        name: studentObj?.full_name || "Ẩn danh",
                        avatarUrl: studentObj?.avatar_url || null,
                        totalPoints: 0,
                        streakBadges: [],
                    };
                }
                studentMap[sid].totalPoints += row.points_earned;
                if (["streak_3", "streak_5", "streak_10"].includes(row.reason)) {
                    if (!studentMap[sid].streakBadges.includes(row.reason)) {
                        studentMap[sid].streakBadges.push(row.reason);
                    }
                }
            }

            const leaderboard = Object.values(studentMap).sort(
                (a, b) => b.totalPoints - a.totalPoints
            );

            return leaderboard;
        },
    });
}
