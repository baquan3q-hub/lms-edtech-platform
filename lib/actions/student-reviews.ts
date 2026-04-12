"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createSystemNotification } from "./notifications";

// ============================================================
// Lấy danh sách lớp + học sinh cho GV
// ============================================================
export async function fetchTeacherReportData() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy role của user
        const { data: userProfile } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        const isAdmin = userProfile?.role === "admin";

        // Lấy lớp GV dạy (nếu là admin thì lấy hết)
        let query = adminSupabase
            .from("classes")
            .select("id, name, course_id, course:courses(id, name)")
            .order("name");

        if (!isAdmin) {
            query = query.eq("teacher_id", user.id);
        }

        const { data: classes, error: classesError } = await query;

        if (classesError) {
            console.error("fetchTeacherReportData classes error:", JSON.stringify(classesError));
            return { data: null, error: "Lỗi tải danh sách lớp: " + classesError.message };
        }

        if (!classes || classes.length === 0) {
            return { data: { classes: [], students: {}, sessions: {} }, error: null };
        }

        const classIds = classes.map(c => c.id);

        // Lấy HS enrolled trong mỗi lớp
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id, class_id, users:users!enrollments_student_id_fkey(id, full_name, email, avatar_url)")
            .in("class_id", classIds)
            .eq("status", "active");

        // Group students by class
        const studentsByClass: Record<string, any[]> = {};
        (enrollments || []).forEach((e: any) => {
            if (!studentsByClass[e.class_id]) studentsByClass[e.class_id] = [];
            studentsByClass[e.class_id].push({
                id: e.users.id,
                full_name: e.users.full_name,
                email: e.users.email,
                avatar_url: e.users.avatar_url,
            });
        });

        // Lấy sessions cho mỗi lớp (cho nhận xét buổi)
        const { data: sessions } = await adminSupabase
            .from("class_sessions")
            .select("id, class_id, session_number, session_date, start_time, end_time, topic, lesson_title, status")
            .in("class_id", classIds)
            .order("session_date", { ascending: false });

        const sessionsByClass: Record<string, any[]> = {};
        (sessions || []).forEach((s: any) => {
            if (!sessionsByClass[s.class_id]) sessionsByClass[s.class_id] = [];
            sessionsByClass[s.class_id].push(s);
        });

        return {
            data: {
                classes,
                students: studentsByClass,
                sessions: sessionsByClass,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetchTeacherReportData:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// Tạo nhận xét (buổi / tuần / tháng / quý / khóa)
// ============================================================
export async function createStudentReview(input: {
    classId: string;
    studentId: string;
    reviewType: "session" | "weekly" | "monthly" | "quarterly" | "course_end";
    reviewDate: string;
    weekStart?: string;
    periodLabel?: string;
    sessionId?: string;
    positiveTags: string[];
    improvementTags: string[];
    teacherComment?: string;
    scoreData?: any;
    autoSend?: boolean;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { error } = await adminSupabase
            .from("student_reviews")
            .insert({
                class_id: input.classId,
                student_id: input.studentId,
                teacher_id: user.id,
                review_type: input.reviewType,
                review_date: input.reviewDate,
                week_start: input.weekStart || null,
                period_label: input.periodLabel || null,
                session_id: input.sessionId || null,
                positive_tags: input.positiveTags,
                improvement_tags: input.improvementTags,
                teacher_comment: input.teacherComment || null,
                score_data: input.scoreData || {},
                is_sent: input.autoSend || false,
                sent_at: input.autoSend ? new Date().toISOString() : null,
            });

        if (error) throw error;

        // Nếu gửi ngay → thông báo phụ huynh
        if (input.autoSend) {
            await notifyParentAboutReview(adminSupabase, input.studentId, input.classId, input.reviewType, input.periodLabel);
        }

        revalidatePath("/teacher/reports");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error createStudentReview:", error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// Tạo nhận xét hàng loạt cho cả lớp
// ============================================================
export async function createBulkReviews(input: {
    classId: string;
    reviewType: "session" | "weekly" | "monthly" | "quarterly" | "course_end";
    reviewDate: string;
    weekStart?: string;
    periodLabel?: string;
    sessionId?: string;
    reviews: Array<{
        studentId: string;
        positiveTags: string[];
        improvementTags: string[];
        teacherComment?: string;
        scoreData?: any;
    }>;
    autoSend?: boolean;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized", count: 0 };

        const adminSupabase = createAdminClient();

        const rows = input.reviews.map(r => ({
            class_id: input.classId,
            student_id: r.studentId,
            teacher_id: user.id,
            review_type: input.reviewType,
            review_date: input.reviewDate,
            week_start: input.weekStart || null,
            period_label: input.periodLabel || null,
            session_id: input.sessionId || null,
            positive_tags: r.positiveTags,
            improvement_tags: r.improvementTags,
            teacher_comment: r.teacherComment || null,
            score_data: r.scoreData || {},
            is_sent: input.autoSend || false,
            sent_at: input.autoSend ? new Date().toISOString() : null,
        }));

        const { error } = await adminSupabase
            .from("student_reviews")
            .insert(rows);

        if (error) throw error;

        // Thông báo tới phụ huynh nếu gửi ngay
        if (input.autoSend) {
            for (const r of input.reviews) {
                await notifyParentAboutReview(adminSupabase, r.studentId, input.classId, input.reviewType, input.periodLabel);
            }
        }

        revalidatePath("/teacher/reports");
        return { success: true, error: null, count: rows.length };
    } catch (error: any) {
        console.error("Error createBulkReviews:", error);
        return { success: false, error: error.message, count: 0 };
    }
}

// ============================================================
// Gửi nhận xét đã tạo (chưa gửi) tới phụ huynh
// ============================================================
export async function sendReviewToParent(reviewId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { data: review, error: fetchError } = await adminSupabase
            .from("student_reviews")
            .select("*")
            .eq("id", reviewId)
            .single();

        if (fetchError || !review) return { success: false, error: "Không tìm thấy nhận xét." };

        // Mark as sent
        const { error } = await adminSupabase
            .from("student_reviews")
            .update({ is_sent: true, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", reviewId);

        if (error) throw error;

        await notifyParentAboutReview(adminSupabase, review.student_id, review.class_id, review.review_type, review.period_label);

        revalidatePath("/teacher/reports");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error sendReviewToParent:", error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// Lấy nhận xét đã tạo (cho GV xem lại)
// ============================================================
export async function fetchReviewsByClass(classId: string, reviewType?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        let query = adminSupabase
            .from("student_reviews")
            .select("*, student:users!student_id(full_name, email, avatar_url)")
            .eq("class_id", classId)
            .eq("teacher_id", user.id)
            .order("review_date", { ascending: false })
            .order("created_at", { ascending: false });

        if (reviewType) {
            query = query.eq("review_type", reviewType);
        }

        const { data, error } = await query.limit(100);
        if (error) throw error;

        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Error fetchReviewsByClass:", error);
        return { data: [], error: error.message };
    }
}

// ============================================================
// Parent: Lấy nhận xét con em (đã gửi)
// ============================================================
export async function fetchReviewsForStudent(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { data, error } = await adminSupabase
            .from("student_reviews")
            .select("*, teacher:users!teacher_id(full_name), class:classes!class_id(name, course:courses(name))")
            .eq("student_id", studentId)
            .eq("is_sent", true)
            .order("review_date", { ascending: false })
            .limit(50);

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Error fetchReviewsForStudent:", error);
        return { data: [], error: error.message };
    }
}

// ============================================================
// Tính dữ liệu tổng hợp cho báo cáo định kỳ
// ============================================================
export async function generatePeriodicSummary(classId: string, studentId: string, startDate: string, endDate: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Attendance trong khoảng thời gian
        const { data: attendanceRecords } = await adminSupabase
            .from("attendance_records")
            .select("status, session:attendance_sessions!inner(session_date, class_id)")
            .eq("student_id", studentId)
            .eq("session.class_id", classId)
            .gte("session.session_date", startDate)
            .lte("session.session_date", endDate);

        const totalAttendance = (attendanceRecords || []).length;
        const presentCount = (attendanceRecords || []).filter((r: any) => r.status === "present" || r.status === "late").length;
        const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

        // 2. Exam scores trong khoảng
        const { data: examSubs } = await adminSupabase
            .from("exam_submissions")
            .select("score, total_points, submitted_at, exams!inner(class_id)")
            .eq("student_id", studentId)
            .eq("exams.class_id", classId)
            .gte("submitted_at", startDate)
            .lte("submitted_at", endDate);

        const examScores = (examSubs || []).map((s: any) =>
            s.total_points > 0 ? (s.score / s.total_points) * 10 : 0
        );
        const avgExamScore = examScores.length > 0
            ? Number((examScores.reduce((a, b) => a + b, 0) / examScores.length).toFixed(1))
            : 0;

        // 3. Homework submissions trong khoảng
        const { data: hwSubs } = await adminSupabase
            .from("homework_submissions")
            .select("score, status, homework!inner(class_id, total_points)")
            .eq("student_id", studentId)
            .eq("homework.class_id", classId)
            .eq("status", "graded");

        const hwScores = (hwSubs || []).map((s: any) => {
            const tp = s.homework?.total_points || 10;
            return tp > 0 ? (s.score / tp) * 10 : 0;
        });
        const avgHwScore = hwScores.length > 0
            ? Number((hwScores.reduce((a, b) => a + b, 0) / hwScores.length).toFixed(1))
            : 0;

        // 4. Overall
        const allScores = [...examScores, ...hwScores];
        const overallAvg = allScores.length > 0
            ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
            : 0;

        // 5. Xếp loại
        let rank = "Yếu";
        if (overallAvg >= 8) rank = "Giỏi";
        else if (overallAvg >= 6.5) rank = "Khá";
        else if (overallAvg >= 5) rank = "Trung bình";

        return {
            data: {
                attendanceRate,
                totalSessions: totalAttendance,
                presentCount,
                absentCount: totalAttendance - presentCount,
                avgExamScore,
                examCount: examScores.length,
                avgHwScore,
                hwCount: hwScores.length,
                overallAvg,
                rank,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error generatePeriodicSummary:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// Helper: Gửi thông báo tới phụ huynh
// ============================================================
async function notifyParentAboutReview(adminSupabase: any, studentId: string, classId: string, reviewType: string, periodLabel?: string | null) {
    try {
        // Tìm phụ huynh
        const { data: parents } = await adminSupabase
            .from("parent_students")
            .select("parent_id")
            .eq("student_id", studentId);

        if (!parents || parents.length === 0) return;

        // Lấy tên lớp
        const { data: classInfo } = await adminSupabase
            .from("classes")
            .select("name")
            .eq("id", classId)
            .single();

        const typeLabels: Record<string, string> = {
            session: "Buổi học",
            weekly: "Tuần",
            monthly: "Tháng",
            quarterly: "Quý",
            course_end: "Kết thúc khóa"
        };

        for (const p of parents) {
            await createSystemNotification(
                p.parent_id,
                `Nhận xét mới — ${typeLabels[reviewType] || reviewType}`,
                `Giáo viên lớp ${classInfo?.name || ""} vừa gửi nhận xét ${typeLabels[reviewType]?.toLowerCase() || ""}${periodLabel ? ` (${periodLabel})` : ""} cho con bạn. Xem ngay!`,
                "teacher_review",
                `/parent/children/${studentId}/reviews`
            );
        }
    } catch (error) {
        console.error("Error notifying parent:", error);
    }
}
