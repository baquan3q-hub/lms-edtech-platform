"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcAttendanceRate } from "@/lib/utils/attendance-rate";

export async function getStudentProgressStats(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Kiểm tra quyền (Phụ huynh có được xem của studentId này không)
        const { data: link, error: linkError } = await adminSupabase
            .from("parent_students")
            .select("id")
            .eq("parent_id", user.id)
            .eq("student_id", studentId)
            .single();

        if (linkError || !link) {
            return { data: null, error: "Bạn không có quyền xem thông tin học sinh này" };
        }

        // 2. Fetch active classes for the student
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select("class_id, classes(name, course_id, courses(name))")
            .eq("student_id", studentId)
            .eq("status", "active");

        if (enrollError) throw enrollError;

        const classIds = (enrollments || []).map((e: any) => e.class_id);

        // Fetch attendance records for these classes
        const { data: attRecords } = await adminSupabase
            .from("attendance_records")
            .select("status, session_id, attendance_sessions!inner(class_id)")
            .eq("student_id", studentId)
            .in("attendance_sessions.class_id", classIds);

        // Fetch scores for these classes
        const { data: examSubs } = await adminSupabase
            .from("exam_submissions")
            .select("score, exams!inner(class_id, total_points)")
            .eq("student_id", studentId)
            .in("exams.class_id", classIds);

        // Build stats dynamically
        const statsData = (enrollments || []).map((enroll: any) => {
            const cId = enroll.class_id;

            // Attendance
            const cAtts = (attRecords || []).filter((r: any) => r.attendance_sessions?.class_id === cId);
            const present = cAtts.filter((r: any) => r.status === "present").length;
            const late = cAtts.filter((r: any) => r.status === "late").length;
            const excused = cAtts.filter((r: any) => r.status === "excused").length;
            const absent = cAtts.filter((r: any) => r.status === "absent").length;
            const attRate = calcAttendanceRate(present, late, excused, absent);

            // Scores
            const cScores = (examSubs || []).filter((s: any) => s.exams?.class_id === cId && s.score !== null && s.exams?.total_points > 0);
            let avg = 0;
            if (cScores.length > 0) {
                const totalScore = cScores.reduce((acc: number, curr: any) => acc + ((curr.score / curr.exams.total_points) * 10), 0);
                avg = Number((totalScore / cScores.length).toFixed(1));
            }

            return {
                id: cId,
                student_id: studentId,
                class_id: cId,
                total_sessions: cAtts.length,
                present_count: present,
                absent_count: absent,
                late_count: late,
                excused_count: excused,
                attendance_rate: attRate,
                avg_score: avg,
                classes: enroll.classes
            };
        });

        // 3. Fetch real exam history from `exam_submissions`
        const { data: submissions, error: submissionsError } = await adminSupabase
            .from("exam_submissions")
            .select("score, submitted_at, exams(title, total_points)")
            .eq("student_id", studentId)
            .order("submitted_at", { ascending: true }); // Chronological order

        if (submissionsError) {
            console.error("Lỗi lấy lịch sử bài test:", submissionsError);
        }

        const history = (submissions || []).map((sub: any) => {
            const dateStr = sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' }) : "";
            
            // Normalize score to a 10-point scale if total_points is available
            let displayScore = 0;
            const totalPoints = sub.exams?.total_points || 0;
            if (totalPoints > 0 && sub.score !== null) {
                displayScore = (sub.score / totalPoints) * 10;
            }

            return {
                date: dateStr,
                score: Number(displayScore.toFixed(1)),
                exam: sub.exams?.title || "Bài kiểm tra"
            };
        });

        return {
            data: {
                stats: statsData || [],
                history: history
            },
            error: null
        };
    } catch (error: any) {
        console.error("Lỗi getStudentProgressStats:", error);
        return { data: null, error: error.message };
    }
}
