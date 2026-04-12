"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Fetch tổng hợp điểm số toàn bộ hệ thống cho Admin
// ============================================================
export async function fetchAdminGradeOverview() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // 1. Lấy danh sách tất cả courses + classes
        const { data: courses } = await adminSupabase
            .from("courses")
            .select("id, name")
            .order("name");

        const { data: classes } = await adminSupabase
            .from("classes")
            .select("id, name, course_id, course:courses(name)")
            .order("name");

        // 2. Lấy enrollments active
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id, class_id")
            .eq("status", "active");

        // 3. Lấy tất cả exam submissions
        const { data: examSubs } = await adminSupabase
            .from("exam_submissions")
            .select("id, student_id, exam_id, score, total_points, submitted_at, exams!inner(class_id, title)")
            .order("submitted_at", { ascending: false });

        // 4. Lấy tất cả homework submissions đã chấm
        const { data: hwSubs } = await adminSupabase
            .from("homework_submissions")
            .select("id, student_id, homework_id, score, status, updated_at, homework!inner(class_id, title, total_points)")
            .eq("status", "graded")
            .order("updated_at", { ascending: false });

        // 5. Lấy thông tin học sinh
        const studentIds = new Set<string>();
        (enrollments || []).forEach(e => studentIds.add(e.student_id));
        
        let studentsMap: Record<string, any> = {};
        if (studentIds.size > 0) {
            const { data: students } = await adminSupabase
                .from("users")
                .select("id, full_name, email")
                .in("id", Array.from(studentIds));
            (students || []).forEach(s => { studentsMap[s.id] = s; });
        }

        // 6. Tính toán tổng hợp theo lớp
        const classGradeMap: Record<string, {
            classId: string;
            className: string;
            courseName: string;
            courseId: string;
            studentCount: number;
            avgExamScore: number;
            avgHwScore: number;
            overallAvg: number;
            examCount: number;
            hwCount: number;
            excellentCount: number; // >= 8
            goodCount: number;     // >= 6.5
            averageCount: number;  // >= 5
            weakCount: number;     // < 5
        }> = {};

        // Khởi tạo map cho từng class
        (classes || []).forEach((c: any) => {
            classGradeMap[c.id] = {
                classId: c.id,
                className: c.name,
                courseName: (c.course as any)?.name || "",
                courseId: c.course_id,
                studentCount: 0,
                avgExamScore: 0,
                avgHwScore: 0,
                overallAvg: 0,
                examCount: 0,
                hwCount: 0,
                excellentCount: 0,
                goodCount: 0,
                averageCount: 0,
                weakCount: 0,
            };
        });

        // Đếm HS theo lớp
        const classStudentMap: Record<string, Set<string>> = {};
        (enrollments || []).forEach(e => {
            if (!classStudentMap[e.class_id]) classStudentMap[e.class_id] = new Set();
            classStudentMap[e.class_id].add(e.student_id);
            if (classGradeMap[e.class_id]) {
                classGradeMap[e.class_id].studentCount = classStudentMap[e.class_id].size;
            }
        });

        // Tính điểm TB theo lớp từ exam
        const classExamScores: Record<string, number[]> = {};
        (examSubs || []).forEach((sub: any) => {
            const classId = sub.exams?.class_id;
            if (!classId) return;
            if (!classExamScores[classId]) classExamScores[classId] = [];
            // Normalize score to 10-point scale
            const normalized = sub.total_points > 0 ? (sub.score / sub.total_points) * 10 : 0;
            classExamScores[classId].push(normalized);
        });

        // Tính điểm TB theo lớp từ homework
        const classHwScores: Record<string, number[]> = {};
        (hwSubs || []).forEach((sub: any) => {
            const classId = sub.homework?.class_id;
            if (!classId) return;
            if (!classHwScores[classId]) classHwScores[classId] = [];
            const totalPts = sub.homework?.total_points || 10;
            const normalized = totalPts > 0 ? (sub.score / totalPts) * 10 : 0;
            classHwScores[classId].push(normalized);
        });

        // Merge scores & compute aggregates
        Object.keys(classGradeMap).forEach(classId => {
            const examScores = classExamScores[classId] || [];
            const hwScores = classHwScores[classId] || [];
            const allScores = [...examScores, ...hwScores];

            classGradeMap[classId].examCount = examScores.length;
            classGradeMap[classId].hwCount = hwScores.length;
            classGradeMap[classId].avgExamScore = examScores.length > 0
                ? Number((examScores.reduce((a, b) => a + b, 0) / examScores.length).toFixed(1))
                : 0;
            classGradeMap[classId].avgHwScore = hwScores.length > 0
                ? Number((hwScores.reduce((a, b) => a + b, 0) / hwScores.length).toFixed(1))
                : 0;
            classGradeMap[classId].overallAvg = allScores.length > 0
                ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
                : 0;
        });

        // 7. Tính xếp loại theo từng HS (dựa trên điểm TB tất cả bài)
        const studentAvgMap: Record<string, Record<string, number[]>> = {}; // studentId -> classId -> scores[]
        (examSubs || []).forEach((sub: any) => {
            const classId = sub.exams?.class_id;
            if (!classId) return;
            if (!studentAvgMap[sub.student_id]) studentAvgMap[sub.student_id] = {};
            if (!studentAvgMap[sub.student_id][classId]) studentAvgMap[sub.student_id][classId] = [];
            const normalized = sub.total_points > 0 ? (sub.score / sub.total_points) * 10 : 0;
            studentAvgMap[sub.student_id][classId].push(normalized);
        });
        (hwSubs || []).forEach((sub: any) => {
            const classId = sub.homework?.class_id;
            if (!classId) return;
            if (!studentAvgMap[sub.student_id]) studentAvgMap[sub.student_id] = {};
            if (!studentAvgMap[sub.student_id][classId]) studentAvgMap[sub.student_id][classId] = [];
            const totalPts = sub.homework?.total_points || 10;
            const normalized = totalPts > 0 ? (sub.score / totalPts) * 10 : 0;
            studentAvgMap[sub.student_id][classId].push(normalized);
        });

        // Phân loại HS theo từng class
        Object.entries(studentAvgMap).forEach(([studentId, classScores]) => {
            Object.entries(classScores).forEach(([classId, scores]) => {
                if (!classGradeMap[classId]) return;
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                if (avg >= 8) classGradeMap[classId].excellentCount++;
                else if (avg >= 6.5) classGradeMap[classId].goodCount++;
                else if (avg >= 5) classGradeMap[classId].averageCount++;
                else classGradeMap[classId].weakCount++;
            });
        });

        // 8. Tạo dữ liệu chi tiết từng HS cho bảng
        const studentDetails: any[] = [];
        Object.entries(studentAvgMap).forEach(([studentId, classScores]) => {
            Object.entries(classScores).forEach(([classId, scores]) => {
                const student = studentsMap[studentId];
                const classInfo = classGradeMap[classId];
                if (!student || !classInfo) return;
                const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
                let rank = "Yếu";
                if (avg >= 8) rank = "Giỏi";
                else if (avg >= 6.5) rank = "Khá";
                else if (avg >= 5) rank = "Trung bình";

                studentDetails.push({
                    studentId,
                    studentName: student.full_name,
                    studentEmail: student.email,
                    classId,
                    className: classInfo.className,
                    courseName: classInfo.courseName,
                    avgScore: avg,
                    totalSubmissions: scores.length,
                    rank,
                });
            });
        });

        // Sort by avg descending
        studentDetails.sort((a, b) => b.avgScore - a.avgScore);

        // 9. Dữ liệu xu hướng theo tháng (6 tháng gần nhất)
        const monthlyTrends: { month: string; avgScore: number; submissionCount: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = `T${d.getMonth() + 1}/${d.getFullYear()}`;
            
            const examInMonth = (examSubs || []).filter((s: any) => s.submitted_at?.startsWith(monthStr));
            const hwInMonth = (hwSubs || []).filter((s: any) => s.updated_at?.startsWith(monthStr));
            
            const allScoresInMonth: number[] = [];
            examInMonth.forEach((s: any) => {
                if (s.total_points > 0) allScoresInMonth.push((s.score / s.total_points) * 10);
            });
            hwInMonth.forEach((s: any) => {
                const tp = s.homework?.total_points || 10;
                if (tp > 0) allScoresInMonth.push((s.score / tp) * 10);
            });

            monthlyTrends.push({
                month: monthLabel,
                avgScore: allScoresInMonth.length > 0
                    ? Number((allScoresInMonth.reduce((a, b) => a + b, 0) / allScoresInMonth.length).toFixed(1))
                    : 0,
                submissionCount: allScoresInMonth.length,
            });
        }

        // 10. Tổng hợp toàn hệ thống
        const allClassGrades = Object.values(classGradeMap).filter(c => c.studentCount > 0);
        const systemAvg = allClassGrades.length > 0
            ? Number((allClassGrades.reduce((a, b) => a + b.overallAvg, 0) / allClassGrades.filter(c => c.overallAvg > 0).length || 1).toFixed(1))
            : 0;

        const totalStudents = new Set((enrollments || []).map(e => e.student_id)).size;
        const totalSubmissions = (examSubs?.length || 0) + (hwSubs?.length || 0);

        return {
            data: {
                // Tổng quan
                systemAvg,
                totalStudents,
                totalSubmissions,
                totalClasses: allClassGrades.length,
                // Chi tiết theo lớp
                classGrades: allClassGrades.sort((a, b) => b.overallAvg - a.overallAvg),
                // Chi tiết theo HS
                studentDetails,
                // Xu hướng
                monthlyTrends,
                // Top performers
                topPerformers: studentDetails.slice(0, 10),
                // Dropdown filters
                courses: courses || [],
                classes: classes || [],
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetchAdminGradeOverview:", error);
        return { data: null, error: error.message };
    }
}
