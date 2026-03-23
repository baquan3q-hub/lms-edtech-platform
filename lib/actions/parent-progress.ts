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
// PARENT: Đánh giá theo kỹ năng / môn học thực tế
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

        // ---------- 1. Get knowledge_gaps for weaknesses ----------
        const { data: analyses } = await adminSupabase
            .from("quiz_individual_analysis")
            .select("knowledge_gaps")
            .eq("student_id", studentId)
            .eq("status", "sent");

        const gapCounts: Record<string, number> = {};
        if (analyses) {
            analyses.forEach(a => {
                if (a.knowledge_gaps && Array.isArray(a.knowledge_gaps)) {
                    a.knowledge_gaps.forEach((g: any) => {
                        let gapLabel = '';
                        if (typeof g === 'string') {
                            // Có thể là JSON string: '{"QuestionIndex":8,"Topic":"..."}'
                            if (g.startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(g);
                                    gapLabel = parsed?.topic || parsed?.Topic || parsed?.name || '';
                                } catch { gapLabel = g; }
                            } else {
                                gapLabel = g;
                            }
                        } else if (typeof g === 'object' && g !== null) {
                            // Object trực tiếp: {topic: "...", severity: "..."}
                            gapLabel = g?.topic || g?.Topic || g?.name || '';
                        }
                        if (gapLabel) {
                            gapCounts[gapLabel] = (gapCounts[gapLabel] || 0) + 1;
                        }
                    });
                }
            });
        }
        
        // Helper inline
        const formatGap = (gap: string) => gap.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        const weaknesses = Object.entries(gapCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([gap, count]) => ({
                key: gap,
                label: formatGap(gap),
                value: count, // times identified
                icon: "🎯"
            }));

        // ---------- 2. Get high scores to extract strengths ----------
        const { data: highExams } = await adminSupabase
            .from("exam_submissions")
            .select("score, exams(title, total_points)")
            .eq("student_id", studentId)
            .not("score", "is", null);

        const strengthCounts: Record<string, number> = {};
        if (highExams) {
            highExams.forEach((sub: any) => {
                const total = sub.exams?.total_points || 0;
                if (total > 0 && sub.score !== null) {
                    const normScore = (sub.score / total) * 10;
                    if (normScore >= 8.0) {
                        const title = sub.exams?.title || "Bài kiểm tra";
                        strengthCounts[title] = (strengthCounts[title] || 0) + 1;
                    }
                }
            });
        }
        
        const strengths = Object.entries(strengthCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([title, count]) => ({
                key: title,
                label: title,
                value: count, // times scored high
                icon: "🌟"
            }));

        // ---------- 3. Skill Mastery (Performance by Class/Subject) ----------
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("class_id, classes(name)")
            .eq("student_id", studentId)
            .eq("status", "active");

        const skills: any[] = [];
        let totalNormalized = 0;
        let classCount = 0;

        if (enrollments) {
            for (const enroll of enrollments) {
                const cId = enroll.class_id;
                const classObj = Array.isArray(enroll.classes) ? enroll.classes[0] : enroll.classes;
                const cName = classObj?.name || "Lớp học";

                const { data: cExams } = await adminSupabase
                    .from("exam_submissions")
                    .select("score, exams!inner(class_id, total_points)")
                    .eq("student_id", studentId)
                    .eq("exams.class_id", cId)
                    .not("score", "is", null);

                let avgClassScore = 0;
                if (cExams && cExams.length > 0) {
                    const validCExams = cExams.filter((e: any) => e.exams?.total_points > 0);
                    if (validCExams.length > 0) {
                        const totalScore = validCExams.reduce((acc: number, curr: any) => acc + ((curr.score / curr.exams.total_points) * 100), 0);
                        avgClassScore = Number((totalScore / validCExams.length).toFixed(0));
                        
                        skills.push({
                            key: cId,
                            label: cName,
                            value: avgClassScore,
                            icon: "📚"
                        });
                        totalNormalized += avgClassScore;
                        classCount++;
                    }
                }
            }
        }

        const overallScore = classCount > 0 ? Math.round(totalNormalized / classCount) : 0;

        return {
            data: {
                skills,
                strengths,
                weaknesses,
                overallScore
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error getStudentCompetencyData:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// AI: Phân tích điểm mạnh/yếu theo format mới
// ============================================================
export async function generateParentAIInsight(
    studentName: string,
    competencyData: {
        skills: { key: string; label: string; value: number; icon: string }[];
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

        const skillsSummary = competencyData.skills.length > 0
            ? competencyData.skills.map(s => `- ${s.icon} ${s.label}: ${s.value}%`).join("\n")
            : "Chưa có dữ liệu môn học cụ thể.";

        const strengthsList = competencyData.strengths.length > 0
            ? competencyData.strengths.map(s => `${s.icon} ${s.label}`).join(", ")
            : "Chưa xác định rõ";

        const weaknessesList = competencyData.weaknesses.length > 0
            ? competencyData.weaknesses.map(w => `${w.icon} ${w.label}`).join(", ")
            : "Không có điểm yếu đáng lo";

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

📚 MỨC ĐỘ THÀNH THẠO THEO MÔN/LỚP:
${skillsSummary}

🏆 ĐIỂM MẠNH (Các bài/kỹ năng làm tốt): ${strengthsList}
⚠️ CẦN CẢI THIỆN (Các lỗ hổng kiến thức): ${weaknessesList}

⭐ ĐIỂM TÍCH LŨY (Theo dõi hành vi):
${pointsSummary}

📝 HIỆU SUẤT TRÊN LỚP (Chuyên cần & Điểm số):
${classSummary}

YÊU CẦU PHÂN TÍCH (viết bằng tiếng Việt, ngắn gọn, phong phú, dưới 300 chữ):

1. **🌟 Hiện trạng học tập**: Nhận xét ngắn gọn dựa vào mức độ thành thạo và chuyên cần (2-3 câu).
2. **💪 Kỹ năng tốt**: Nhấn mạnh các môn hoặc chủ đề con đang làm tốt (khen ngợi).
3. **📝 Vùng cần khắc phục**: Nhắc nhở về các điểm yếu/lỗ hổng kiến thức cụ thể.
4. **🎯 Hành động cụ thể**: Khuyên phụ huynh 3-4 cách thực tế để đồng hành cùng con (VD: hỏi bài con sau giờ học đối với những vùng yếu, duy trì động lực ở môn con giỏi...).
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

