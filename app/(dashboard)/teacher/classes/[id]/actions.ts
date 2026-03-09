"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function fetchClassDetails(classId: string) {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("classes")
            .select(`
                *,
                course:courses(name, description, mode)
            `)
            .eq("id", classId)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching class details:", error);
        return { data: null, error: error.message };
    }
}

export async function fetchClassStudents(classId: string) {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("enrollments")
            .select(`
                id,
                student_id,
                enrolled_at,
                status,
                student:users!student_id(id, full_name, email, phone)
            `)
            .eq("class_id", classId)
            .eq("status", "active");

        if (error) throw error;

        const studentIds = data.map((e: any) => e.student_id);
        let parentLinks: any[] = [];

        if (studentIds.length > 0) {
            const { data: parentsData } = await supabase
                .from("parent_students")
                .select("student_id, parent_id, relationship, parent:users!parent_id(full_name, email, phone)")
                .in("student_id", studentIds);
            parentLinks = parentsData || [];
        }

        // Transform data for easier map
        const students = data.map((e: any) => {
            const studentObj = Array.isArray(e.student) ? e.student[0] : e.student;

            const myParents = parentLinks
                .filter(p => p.student_id === e.student_id)
                .map(p => {
                    const parentData = Array.isArray(p.parent) ? p.parent[0] : p.parent;
                    return {
                        id: p.parent_id,
                        relationship: p.relationship,
                        full_name: parentData?.full_name,
                        email: parentData?.email,
                        phone: parentData?.phone
                    };
                });

            return {
                enrollment_id: e.id,
                student_id: studentObj?.id,
                name: studentObj?.full_name,
                email: studentObj?.email,
                phone: studentObj?.phone,
                parents: myParents
            };
        });

        return { data: students, error: null };
    } catch (error: any) {
        console.error("Error fetching class students:", error);
        return { data: null, error: error.message };
    }
}

export async function submitAttendance(classId: string, attendanceRecords: any[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const date = new Date().toISOString().split('T')[0]; // Current date YYYY-MM-DD

        // Delete any existing attendance for this class and date to overwrite
        await supabase
            .from("attendance")
            .delete()
            .match({ class_id: classId, date: date });

        // Prepare new records
        const recordsToInsert = attendanceRecords.map(record => ({
            class_id: classId,
            student_id: record.student_id || record.studentId,
            date: date,
            status: record.status,
            notes: record.note || record.notes,
            recorded_by: user.id
        }));

        if (recordsToInsert.length > 0) {
            const { error } = await supabase
                .from("attendance")
                .insert(recordsToInsert);

            if (error) throw error;
        }

        revalidatePath(`/teacher/classes/${classId}`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error submitting attendance:", error);
        return { success: false, error: error.message };
    }
}

export async function getTodayAttendance(classId: string) {
    try {
        const supabase = createAdminClient();
        const date = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from("attendance")
            .select("student_id, status, notes")
            .eq("class_id", classId)
            .eq("date", date);

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching today attendance:", error);
        return { data: [], error: null };
    }
}

// Lấy tiến độ học tập của tất cả học sinh trong một lớp
export async function fetchStudentProgressForClass(classId: string) {
    try {
        const supabase = createAdminClient();

        // 1. Lấy danh sách học sinh
        const { data: enrollments } = await supabase
            .from("enrollments")
            .select("student_id, student:users!student_id(id, full_name, email)")
            .eq("class_id", classId)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) return { data: [], error: null };

        // 2. Lấy course_items (published, không phải folder)
        const { data: courseItems } = await supabase
            .from("course_items")
            .select("id, title, type")
            .eq("class_id", classId)
            .eq("is_published", true)
            .neq("type", "folder")
            .order("order_index", { ascending: true });

        const items = courseItems || [];
        const totalItems = items.length;
        const itemIds = items.map(i => i.id);

        // 3. Lấy tất cả student_progress cho class này
        const studentIds = enrollments.map(e => e.student_id);
        const { data: allProgress } = await supabase
            .from("student_progress")
            .select("student_id, item_id, status, score, completed_at, last_accessed")
            .in("student_id", studentIds)
            .in("item_id", itemIds.length > 0 ? itemIds : ['__none__']);

        // 4. Lấy quiz_attempts cho thống kê điểm
        const { data: allAttempts } = await supabase
            .from("quiz_attempts")
            .select("student_id, item_id, score, passed, submitted_at")
            .in("student_id", studentIds)
            .in("item_id", itemIds.length > 0 ? itemIds : ['__none__']);

        // 5. Tính toán tiến độ cho mỗi học sinh
        const studentProgressList = enrollments.map((enrollment: any) => {
            const studentObj = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
            const sid = enrollment.student_id;

            const myProgress = (allProgress || []).filter(p => p.student_id === sid);
            const completedItems = myProgress.filter(p => p.status === 'completed').length;
            const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            // Quiz scores
            const myAttempts = (allAttempts || []).filter(a => a.student_id === sid);
            const quizScores = myAttempts.map(a => Number(a.score) || 0);
            const avgQuizScore = quizScores.length > 0 ? (quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : null;

            // Last active: lấy max last_accessed từ progress
            const accessTimes = myProgress
                .filter(p => p.last_accessed)
                .map(p => new Date(p.last_accessed).getTime());
            const lastActive = accessTimes.length > 0 ? new Date(Math.max(...accessTimes)).toISOString() : null;

            // Per-item detail
            const itemDetails = items.map(item => {
                const prog = myProgress.find(p => p.item_id === item.id);
                const attempt = myAttempts.filter(a => a.item_id === item.id);
                return {
                    itemId: item.id,
                    title: item.title,
                    type: item.type,
                    status: prog?.status || 'not_started',
                    score: prog?.score,
                    completedAt: prog?.completed_at,
                    attempts: attempt.length,
                    bestScore: attempt.length > 0 ? Math.max(...attempt.map(a => Number(a.score) || 0)) : null
                };
            });

            return {
                studentId: sid,
                name: studentObj?.full_name || "Ẩn danh",
                email: studentObj?.email || "",
                completedItems,
                totalItems,
                progressPercent,
                avgQuizScore: avgQuizScore !== null ? Math.round(avgQuizScore * 10) / 10 : null,
                totalQuizAttempts: myAttempts.length,
                lastActive,
                itemDetails
            };
        });

        // Sắp xếp theo tiến độ giảm dần
        studentProgressList.sort((a, b) => b.progressPercent - a.progressPercent);

        return { data: studentProgressList, error: null };
    } catch (error: any) {
        console.error("Error fetching student progress:", error);
        return { data: [], error: error.message };
    }
}
