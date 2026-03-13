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
// PARENT: Tính toán 6 trục năng lực dựa trên Bloom's Taxonomy
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
            // Verify parent access
            const { data: link } = await adminSupabase
                .from("parent_students")
                .select("id")
                .eq("parent_id", user.id)
                .eq("student_id", studentId)
                .single();

            if (!link) return { data: null, error: "Access denied" };
        }

        // ---------- 1. KIẾN THỨC (Knowledge) — Điểm TB bài kiểm tra ----------
        const { data: submissions } = await adminSupabase
            .from("exam_submissions")
            .select("score, exams!inner(total_points)")
            .eq("student_id", studentId);

        let knowledgeScore = 0;
        const validSubs = (submissions || []).filter((s: any) => s.score !== null && s.exams?.total_points > 0);
        if (validSubs.length > 0) {
            const totalNorm = validSubs.reduce((acc: number, s: any) => acc + (s.score / s.exams.total_points) * 100, 0);
            knowledgeScore = Math.round(totalNorm / validSubs.length);
        }

        // ---------- 2. CHUYÊN CẦN (Discipline) — Tỉ lệ có mặt ----------
        const { data: attRecords } = await adminSupabase
            .from("attendance_records")
            .select("status")
            .eq("student_id", studentId);

        let disciplineScore = 0;
        if (attRecords && attRecords.length > 0) {
            const present = attRecords.filter((r: any) => r.status === "present").length;
            const late = attRecords.filter((r: any) => r.status === "late").length;
            disciplineScore = Math.round(((present + late * 0.7) / attRecords.length) * 100);
        }

        // ---------- 3. CẢI THIỆN (Improvement) — % bài tập cải thiện hoàn thành ----------
        const { data: progRecords } = await adminSupabase
            .from("improvement_progress")
            .select("status")
            .eq("student_id", studentId);

        let improvementScore = 0;
        if (progRecords && progRecords.length > 0) {
            const completed = progRecords.filter((r: any) => r.status === "completed").length;
            improvementScore = Math.round((completed / progRecords.length) * 100);
        }

        // ---------- 4. NỖ LỰC (Effort) — Tỉ lệ nộp bài / tổng bài kiểm tra có thể nộp ----------
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id")
            .eq("student_id", studentId)
            .eq("status", "active");

        const classIds = (enrollments || []).map((e: any) => e.class_id);
        let effortScore = 0;
        if (classIds.length > 0) {
            const { count: totalExams } = await adminSupabase
                .from("exams")
                .select("id", { count: "exact", head: true })
                .in("class_id", classIds);

            const { count: submittedExams } = await adminSupabase
                .from("exam_submissions")
                .select("id", { count: "exact", head: true })
                .eq("student_id", studentId);

            if (totalExams && totalExams > 0) {
                effortScore = Math.min(100, Math.round(((submittedExams || 0) / totalExams) * 100));
            }
        }

        // ---------- 5. ĐIỂM MẠNH (Strengths) — Số bài >= 8.0/10 / tổng bài ----------
        let strengthsScore = 0;
        if (validSubs.length > 0) {
            const highScores = validSubs.filter((s: any) => (s.score / s.exams.total_points) * 10 >= 8.0).length;
            strengthsScore = Math.round((highScores / validSubs.length) * 100);
        }

        // ---------- 6. TƯƠNG TÁC (Engagement) — Dựa vào Điểm tích lũy ----------
        const { data: pointRecords } = await adminSupabase
            .from("student_points")
            .select("points, type")
            .eq("student_id", studentId);

        let engagementScore = 50; // baseline
        if (pointRecords && pointRecords.length > 0) {
            const totalPoints = pointRecords.reduce((sum: number, r: any) => sum + r.points, 0);
            const maxExpected = pointRecords.length * 5; // hypothetical max: each transaction could be +5
            // Normalize: 0 points = 50, positive = 50-100, negative = 0-50
            if (totalPoints >= 0) {
                engagementScore = Math.min(100, 50 + Math.round((totalPoints / Math.max(maxExpected, 1)) * 50));
            } else {
                engagementScore = Math.max(0, 50 + Math.round((totalPoints / Math.max(Math.abs(totalPoints) + 10, 1)) * 50));
            }
        }

        // ===== Tổng hợp điểm mạnh / yếu =====
        const axes = [
            { key: "knowledge", label: "Kiến thức", value: knowledgeScore, icon: "📚" },
            { key: "discipline", label: "Chuyên cần", value: disciplineScore, icon: "📅" },
            { key: "improvement", label: "Cải thiện", value: improvementScore, icon: "📈" },
            { key: "effort", label: "Nỗ lực", value: effortScore, icon: "💪" },
            { key: "strengths", label: "Điểm mạnh", value: strengthsScore, icon: "⭐" },
            { key: "engagement", label: "Tương tác", value: engagementScore, icon: "🤝", description: "Điểm tích lũy (thái độ, đạo đức)" },
        ];

        const sorted = [...axes].sort((a, b) => b.value - a.value);
        const topStrengths = sorted.filter(a => a.value >= 70).slice(0, 3);
        const topWeaknesses = sorted.filter(a => a.value < 60).sort((a, b) => a.value - b.value).slice(0, 3);

        return {
            data: {
                axes,
                strengths: topStrengths,
                weaknesses: topWeaknesses,
                overallScore: Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length),
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error getStudentCompetencyData:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// AI: Phân tích điểm mạnh/yếu và đưa ra giải pháp bằng Gemini
// ============================================================
export async function generateParentAIInsight(
    studentName: string,
    competencyData: {
        axes: { key: string; label: string; value: number; icon: string }[];
        strengths: any[];
        weaknesses: any[];
        overallScore: number;
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

        const axesSummary = competencyData.axes
            .map(a => `- ${a.icon} ${a.label}: ${a.value}/100`)
            .join("\n");

        const strengthsList = competencyData.strengths.length > 0
            ? competencyData.strengths.map(s => `${s.icon} ${s.label} (${s.value}/100)`).join(", ")
            : "Chưa xác định rõ";

        const weaknessesList = competencyData.weaknesses.length > 0
            ? competencyData.weaknesses.map(w => `${w.icon} ${w.label} (${w.value}/100)`).join(", ")
            : "Không có điểm yếu đáng lo";

        const pointsSummary = pointsData
            ? `Tổng điểm tích lũy: ${pointsData.totalPoints} điểm\n${pointsData.byClass.map(c => `- ${c.class_name}: ${c.total_points > 0 ? '+' : ''}${c.total_points}`).join("\n")}`
            : "Chưa có dữ liệu điểm tích lũy.";

        const classSummary = statsData.length > 0
            ? statsData.map(s => `- ${s.class_name}: ĐTB ${s.avg_score}/10, Chuyên cần ${s.attendance_rate}%`).join("\n")
            : "Chưa có dữ liệu lớp học.";

        const prompt = `
Bạn là một chuyên gia tư vấn giáo dục AI, đang phân tích năng lực học tập của một học sinh để cung cấp nhận xét cho phụ huynh.

📊 THÔNG TIN HỌC SINH: ${studentName}
Điểm tổng hợp năng lực: ${competencyData.overallScore}/100

📈 6 TRỤC NĂNG LỰC (Bloom's Taxonomy):
${axesSummary}

🏆 Điểm mạnh nổi bật: ${strengthsList}
⚠️ Điểm yếu cần cải thiện: ${weaknessesList}

⭐ ĐIỂM TÍCH LŨY (Thái độ & Đạo đức):
${pointsSummary}

📚 KẾT QUẢ THEO LỚP:
${classSummary}

YÊU CẦU PHÂN TÍCH (viết bằng tiếng Việt, ngắn gọn, phong cách thân thiện, dưới 300 chữ):

1. **🌟 Tổng quan**: Đánh giá chung về năng lực học sinh (2-3 câu).
2. **💪 Điểm mạnh**: Phân tích chi tiết 2-3 điểm mạnh nổi bật, khen ngợi cụ thể.
3. **📝 Điểm cần cải thiện**: Phân tích 2-3 điểm yếu, giải thích tại sao cần cải thiện.
4. **🎯 Giải pháp cụ thể**: Đưa ra 3-4 lời khuyên HÀNH ĐỘNG CỤ THỂ mà phụ huynh có thể áp dụng ngay để hỗ trợ con em (ví dụ: lập thời gian biểu ôn tập, khuyến khích phát biểu...).
5. **💡 Lời nhắn**: Một câu động viên tích cực dành cho phụ huynh.

QUAN TRỌNG: Không dùng heading Markdown (##, ###). Dùng **in đậm** cho tiêu đề mục. Phân tích phải dựa trên dữ liệu thực tế ở trên.
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return { data: text, error: null };
    } catch (error: any) {
        console.error("Error generating parent AI insight:", error);
        return { data: null, error: error.message };
    }
}

