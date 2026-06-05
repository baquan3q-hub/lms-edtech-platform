"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcAttendanceRate } from "@/lib/utils/attendance-rate";
import { getGeminiModel } from "@/lib/gemini";

export async function getStudentProgressStats(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role !== "admin") {
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
            .not("score", "is", null);

        if (submissionsError) {
            console.error("Lỗi lấy lịch sử bài test:", submissionsError);
        }

        // 4. Fetch homework history
        const { data: hwSubmissions } = await adminSupabase
            .from("homework_submissions")
            .select("score, submitted_at, homework(title, total_points)")
            .eq("student_id", studentId)
            .not("score", "is", null);

        const allSubs: any[] = [];

        // Build Exams
        (submissions || []).forEach((sub: any) => {
            const totalPoints = sub.exams?.total_points || 0;
            let displayScore = 0;
            if (totalPoints > 0 && sub.score !== null) {
                displayScore = (sub.score / totalPoints) * 10;
            }
            allSubs.push({
                title: sub.exams?.title || "Bài kiểm tra",
                score: Number(displayScore.toFixed(1)),
                submitted_at: sub.submitted_at,
                type: "exam"
            });
        });

        // Build Homeworks
        (hwSubmissions || []).forEach((sub: any) => {
            const totalPoints = sub.homework?.total_points || 0;
            let displayScore = 0;
            if (totalPoints > 0 && sub.score !== null) {
                displayScore = (Number(sub.score) / totalPoints) * 10;
            } else {
                displayScore = Number(sub.score || 0);
                if (displayScore > 10) displayScore = displayScore / 10;
            }

            allSubs.push({
                title: sub.homework?.title || "Bài tập",
                score: Number(displayScore.toFixed(1)),
                submitted_at: sub.submitted_at,
                type: "homework"
            });
        });

        // Sort chronologically
        allSubs.sort((a, b) => new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime());

        const history = allSubs.map((sub: any) => {
            const dateStr = sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' }) : "";
            return {
                date: dateStr,
                score: sub.score,
                exam: sub.title,
                type: sub.type
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

// ============================================================
// PARENT: Danh sách nhận xét chi tiết từ giáo viên (đã gửi)
// ============================================================
export async function getStudentFeedbackList(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role !== "admin") {
            // Verify parent access
            const { data: link } = await adminSupabase
                .from("parent_students")
                .select("id")
                .eq("parent_id", user.id)
                .eq("student_id", studentId)
                .single();

            if (!link) return { data: [], error: "Access denied" };
        }

        // Fetch sent feedback with exam info + improvement progress
        const { data: analyses, error } = await adminSupabase
            .from("quiz_individual_analysis")
            .select(`
                id, ai_feedback, teacher_edited_feedback, teacher_edited_tasks,
                improvement_tasks, knowledge_gaps, status, sent_at, deadline,
                exam:exams(id, title, class_id, total_points),
                submission:exam_submissions(score),
                improvement_progress(task_index, status, quiz_score, quiz_total, completed_at),
                supplementary_quizzes(id, title, status, score, total_questions)
            `)
            .eq("student_id", studentId)
            .eq("status", "sent")
            .order("sent_at", { ascending: false })
            .limit(20);

        if (error) {
            console.error("Supabase Error Details:", error.message, error.details, error.hint);
            throw error;
        }
        return { data: analyses || [], error: null };
    } catch (error: any) {
        console.error("Catch Exception in getStudentFeedbackList:", error?.message || JSON.stringify(error));
        return { data: [], error: error?.message || "Unknown error" };
    }
}

// ============================================================
// PARENT: Đánh giá năng lực theo 3 tiêu chí cố định
// (Năng lực học tập / Chăm chỉ / Thái độ)
// ============================================================
export async function getStudentCompetencyData(studentId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

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

        // ---------- 1. NĂNG LỰC HỌC TẬP (Academic Score) ----------
        // Lấy tất cả điểm bài kiểm tra
        const { data: examSubs } = await adminSupabase
            .from("exam_submissions")
            .select("score, exams(total_points)")
            .eq("student_id", studentId)
            .not("score", "is", null);

        // Lấy tất cả điểm bài tập
        const { data: hwSubs } = await adminSupabase
            .from("homework_submissions")
            .select("score, homework(total_points)")
            .eq("student_id", studentId)
            .not("score", "is", null);

        let totalNormScore = 0;
        let totalSubCount = 0;

        // Quy đổi điểm bài kiểm tra về thang 100
        (examSubs || []).forEach((sub: any) => {
            const total = sub.exams?.total_points || 0;
            if (total > 0 && sub.score !== null) {
                totalNormScore += (sub.score / total) * 100;
                totalSubCount++;
            }
        });

        // Quy đổi điểm bài tập về thang 100
        (hwSubs || []).forEach((sub: any) => {
            const total = sub.homework?.total_points || 0;
            if (total > 0 && sub.score !== null) {
                totalNormScore += (Number(sub.score) / total) * 100;
                totalSubCount++;
            }
        });

        const academicScore = totalSubCount > 0
            ? Math.round(totalNormScore / totalSubCount)
            : 50; // Mặc định 50 khi chưa có dữ liệu

        // ---------- 2. CHĂM CHỈ (Diligence Score) ----------
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id")
            .eq("student_id", studentId)
            .eq("status", "active");

        const classIds = (enrollments || []).map((e: any) => e.class_id);

        let diligenceScore = 50; // Mặc định 50 khi chưa có dữ liệu

        if (classIds.length > 0) {
            const { data: attRecords } = await adminSupabase
                .from("attendance_records")
                .select("status, attendance_sessions!inner(class_id)")
                .eq("student_id", studentId)
                .in("attendance_sessions.class_id", classIds);

            if (attRecords && attRecords.length > 0) {
                const present = attRecords.filter((r: any) => r.status === "present").length;
                const absent = attRecords.filter((r: any) => r.status === "absent").length;
                const excused = attRecords.filter((r: any) => r.status === "excused").length;
                const relevantTotal = present + absent + excused;
                diligenceScore = relevantTotal > 0
                    ? Math.round((present / relevantTotal) * 100)
                    : 50;
            }
        }

        // ---------- 3. THÁI ĐỘ (Attitude Score) ----------
        // Lấy tổng điểm tích lũy từ giáo viên
        let totalPointsRaw = 0;

        if (classIds.length > 0) {
            const { data: pointsData } = await adminSupabase
                .from("student_points")
                .select("points")
                .eq("student_id", studentId)
                .in("class_id", classIds);

            if (pointsData) {
                totalPointsRaw = pointsData.reduce((sum: number, p: any) => sum + (p.points || 0), 0);
            }
        }

        // Quy đổi: baseline 80, mỗi điểm tích lũy thay đổi 1.5, clamp [30, 100]
        const attitudeScore = Math.min(100, Math.max(30, Math.round(80 + totalPointsRaw * 1.5)));

        // ---------- 4. TỔNG HỢP (Weighted Average) ----------
        // Trọng số: Điểm số 40% / Chăm chỉ 30% / Thái độ 30%
        const overallScore = Math.round(
            academicScore * 0.40 + diligenceScore * 0.30 + attitudeScore * 0.30
        );

        const totalSessions = classIds.length > 0
            ? (await adminSupabase
                .from("attendance_records")
                .select("id", { count: "exact", head: true })
                .eq("student_id", studentId)
            ).count || 0
            : 0;

        return {
            data: {
                criteria: [
                    {
                        key: "academic",
                        label: "Năng lực học tập",
                        value: academicScore,
                        fullMark: 100,
                        icon: "📚",
                        description: "Điểm trung bình các bài kiểm tra và bài tập"
                    },
                    {
                        key: "diligence",
                        label: "Chăm chỉ",
                        value: diligenceScore,
                        fullMark: 100,
                        icon: "⏰",
                        description: "Tỉ lệ đi học đều đặn tại các lớp"
                    },
                    {
                        key: "attitude",
                        label: "Thái độ học tập",
                        value: attitudeScore,
                        fullMark: 100,
                        icon: "⭐",
                        description: "Đánh giá từ giáo viên về thái độ học tập"
                    },
                ],
                overallScore,
                totalExams: totalSubCount,
                totalSessions,
                totalPointsRaw,
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error getStudentCompetencyData:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// AI: Phân tích năng lực theo 3 tiêu chí
// ============================================================
export async function generateParentAIInsight(
    studentName: string,
    competencyData: {
        criteria: { key: string; label: string; value: number; icon: string; description: string }[];
        overallScore: number;
        totalExams: number;
        totalSessions: number;
        totalPointsRaw: number;
    },
    pointsData: {
        totalPoints: number;
        byClass: { class_name: string; total_points: number }[];
    } | null,
    statsData: {
        class_name: string;
        avg_score: number;
        attendance_rate: number;
    }[]
) {
    try {
        const model = getGeminiModel("gemini-2.5-flash");

        const criteriaSummary = competencyData.criteria.length > 0
            ? competencyData.criteria.map(c => `- ${c.icon} ${c.label}: ${c.value}/100 — ${c.description}`).join("\n")
            : "Chưa có dữ liệu đánh giá.";

        const pointsSummary = pointsData
            ? `Tổng điểm tích lũy: ${pointsData.totalPoints} điểm\n${pointsData.byClass.map(c => `- ${c.class_name}: ${c.total_points > 0 ? '+' : ''}${c.total_points}`).join("\n")}`
            : "Chưa có dữ liệu điểm tích lũy.";

        const classSummary = statsData.length > 0
            ? statsData.map(s => `- ${s.class_name}: ĐTB ${s.avg_score}/10, Chuyên cần ${s.attendance_rate}%`).join("\n")
            : "Chưa có dữ liệu lớp học.";

        const prompt = `
Bạn là một chuyên gia tư vấn giáo dục AI, đang phân tích kết quả học tập của một học sinh để cung cấp nhận xét cho phụ huynh.

📊 THÔNG TIN HỌC SINH: ${studentName}
Đánh giá tổng quan: ${competencyData.overallScore}/100
Tổng bài đã làm: ${competencyData.totalExams} bài
Tổng buổi học: ${competencyData.totalSessions} buổi
Điểm tích lũy thô: ${competencyData.totalPointsRaw > 0 ? '+' : ''}${competencyData.totalPointsRaw}

📊 ĐÁNH GIÁ THEO 3 TIÊU CHÍ (Trọng số: Điểm số 40%, Chăm chỉ 30%, Thái độ 30%):
${criteriaSummary}

⭐ ĐIỂM TÍCH LŨY (Theo dõi hành vi):
${pointsSummary}

📝 HIỆU SUẤT TRÊN LỚP (Chuyên cần & Điểm số):
${classSummary}

YÊU CẦU PHÂN TÍCH (viết bằng tiếng Việt, ngắn gọn, phong phú, dưới 300 chữ):

1. **🌟 Hiện trạng học tập**: Nhận xét ngắn gọn dựa vào 3 tiêu chí năng lực (2-3 câu). Nêu rõ tiêu chí nào tốt, tiêu chí nào cần cải thiện.
2. **💪 Điểm nổi bật**: Khen ngợi tiêu chí cao nhất, nêu rõ con số cụ thể.
3. **📝 Vùng cần cải thiện**: Nhắc nhở về tiêu chí thấp nhất, đưa ra lý do có thể và gợi ý khắc phục.
4. **🎯 Hành động cụ thể**: Khuyên phụ huynh 3-4 cách thực tế để đồng hành cùng con (VD: nhắc con ôn bài, động viên đi học đều, khen khi con được thêm điểm tích lũy...).
5. **💡 Lời nhắn kết**: Câu kết tích cực, khích lệ.

QUAN TRỌNG: Không dùng heading Markdown (##, ###). Dùng **in đậm** cho tiêu đề mục.
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        return { data: response.text(), error: null };
    } catch (error: any) {
        console.error("Error generating parent AI insight:", error);
        return { data: null, error: error.message };
    }
}

