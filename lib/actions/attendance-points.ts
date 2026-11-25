"use server";

import { requireClassAccess } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// =========================================================
// Lấy điểm tích lũy (student_points) của tất cả học sinh trong lớp
// =========================================================
export async function getClassAttendancePoints(classId: string) {
    try {
        await requireClassAccess(classId, "teach");
        const adminSupabase = createAdminClient();

        // Lấy tất cả điểm trong lớp từ student_points (teacher-managed)
        const { data: points, error } = await adminSupabase
            .from("student_points")
            .select(`
                id, student_id, points, type, reason, created_at
            `)
            .eq("class_id", classId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Lấy enrolled students
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id, student:users!student_id(id, full_name, avatar_url, email)")
            .eq("class_id", classId)
            .eq("status", "active");

        // Group points by student
        const studentMap: Record<string, {
            studentId: string;
            name: string;
            email: string;
            avatarUrl: string | null;
            totalPoints: number;
            history: any[];
            achievements: string[];
        }> = {};

        // Initialize from enrollments
        for (const en of (enrollments || [])) {
            const stu = Array.isArray(en.student) ? en.student[0] : en.student;
            studentMap[en.student_id] = {
                studentId: en.student_id,
                name: stu?.full_name || "Ẩn danh",
                email: stu?.email || "",
                avatarUrl: stu?.avatar_url || null,
                totalPoints: 0,
                history: [],
                achievements: [],
            };
        }

        // Accumulate points
        for (const p of (points || [])) {
            const sid = p.student_id;
            if (studentMap[sid]) {
                studentMap[sid].totalPoints += p.points;
                studentMap[sid].history.push({
                    id: p.id,
                    points: p.points,
                    reason: p.reason,
                    type: p.type,
                    date: p.created_at,
                });
            }
        }

        // Sort by totalPoints desc
        const result = Object.values(studentMap).sort((a, b) => b.totalPoints - a.totalPoints);

        return { data: result, error: null };
    } catch (error: any) {
        console.error("Lỗi getClassAttendancePoints:", error);
        return { data: [], error: error.message };
    }
}

// =========================================================
// GV thêm/cộng/trừ điểm tích lũy cho 1 học sinh
// =========================================================
export async function adjustAttendancePoints(data: {
    studentId: string;
    classId: string;
    points: number;      // Dương = cộng, Âm = trừ
    reason: string;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Determine type from reason prefix
        let type = "other";
        if (data.reason.startsWith("bonus:")) type = "participation";
        else if (data.reason.startsWith("penalty:")) type = "behavior";

        // Insert record into student_points
        const { error } = await adminSupabase
            .from("student_points")
            .insert({
                student_id: data.studentId,
                class_id: data.classId,
                teacher_id: user.id,
                points: data.points,
                reason: data.reason,
                type,
            });

        if (error) throw error;

        revalidatePath(`/teacher/classes/${data.classId}/students`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi adjustAttendancePoints:", error);
        return { success: false, error: error.message };
    }
}

// =========================================================
// GV xoá 1 bản ghi điểm tích lũy
// =========================================================
export async function deleteAttendancePoint(pointId: string, classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("student_points")
            .delete()
            .eq("id", pointId);

        if (error) throw error;

        revalidatePath(`/teacher/classes/${classId}/students`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi deleteAttendancePoint:", error);
        return { success: false, error: error.message };
    }
}

// =========================================================
// Admin: Lấy lịch sử điểm danh theo lớp (drill-down)
// =========================================================
export async function getClassAttendanceSessions(classId: string, month: number, year: number, cycle: "month" | "year" | "since_start" = "month") {
    try {
        await requireClassAccess(classId, "teach");
        const adminSupabase = createAdminClient();

        let startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        let endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        if (cycle === "year") {
            startDate = `${year}-01-01`;
            endDate = `${year + 1}-01-01`;
        } else if (cycle === "since_start") {
            startDate = "1970-01-01";
            endDate = "9999-12-31";
        }

        // 1. Lấy attendance_sessions đã điểm danh
        const { data: sessions, error } = await adminSupabase
            .from("attendance_sessions")
            .select(`
                id, session_date, start_time, end_time, status, note,
                teacher:users!teacher_id(full_name)
            `)
            .eq("class_id", classId)
            .gte("session_date", startDate)
            .lt("session_date", endDate)
            .order("session_date", { ascending: false });

        if (error) throw error;

        // 2. Lấy records cho sessions đã điểm danh
        const sessionIds = (sessions || []).map((s: any) => s.id);
        let allRecords: any[] = [];
        if (sessionIds.length > 0) {
            const { data: records, error: recordsError } = await adminSupabase
                .from("attendance_records")
                .select("session_id, status, student_id, student:users!student_id(full_name)")
                .in("session_id", sessionIds);
            if (recordsError) throw recordsError;
            allRecords = records || [];
        }

        // Keep only sessions that have records (actually marked)
        const recordsBySession = new Map<string, any[]>();
        for (const record of allRecords) {
            const group = recordsBySession.get(record.session_id) || [];
            group.push(record);
            recordsBySession.set(record.session_id, group);
        }
        const validSessionIds = new Set(recordsBySession.keys());
        const validSessions = (sessions || []).filter((s: any) => validSessionIds.has(s.id));

        // 3. Xây dựng danh sách sessions đã điểm danh
        const enrichedAttended = validSessions.map((sess: any) => {
            const sessRecords = recordsBySession.get(sess.id) || [];
            const teacherObj = Array.isArray(sess.teacher) ? sess.teacher[0] : sess.teacher;
            return {
                ...sess,
                source: "attended" as const,
                teacherName: teacherObj?.full_name || "—",
                totalStudents: sessRecords.length,
                presentCount: sessRecords.filter((r: any) => r.status === "present").length,
                absentCount: sessRecords.filter((r: any) => r.status === "absent").length,
                lateCount: sessRecords.filter((r: any) => r.status === "late").length,
                excusedCount: sessRecords.filter((r: any) => r.status === "excused").length,
                students: sessRecords.map((r: any) => {
                    const stuObj = Array.isArray(r.student) ? r.student[0] : r.student;
                    return {
                        student_id: r.student_id,
                        studentName: stuObj?.full_name || r.student_id?.slice(0, 8),
                        status: r.status,
                    };
                }),
            };
        });

        // Only return attended sessions as requested
        const allSessions = [...enrichedAttended]
            .sort((a, b) => b.session_date.localeCompare(a.session_date));

        return { data: allSessions, error: null };
    } catch (error: any) {
        console.error("Lỗi getClassAttendanceSessions:", error);
        return { data: [], error: error.message };
    }
}
