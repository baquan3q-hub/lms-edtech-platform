"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiModel } from "@/lib/gemini";

export async function getClassStudentsWithStats(classId: string) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Get enrolled students
        const { data: enrollments, error: enrollError } = await adminSupabase
            .from("enrollments")
            .select(`
                student_id,
                student:users!student_id(id, full_name, email)
            `)
            .eq("class_id", classId)
            .eq("status", "active");

        if (enrollError) throw enrollError;
        if (!enrollments || enrollments.length === 0) return { data: [], error: null };

        const studentIds = enrollments.map(e => e.student_id);

        // 2. Get their stats
        const { data: stats, error: statsError } = await adminSupabase
            .from("student_class_stats")
            .select("*")
            .in("student_id", studentIds)
            .eq("class_id", classId);

        if (statsError) throw statsError;

        // 3. Merge data
        const merged = enrollments.map(en => {
            const studentStats = stats?.find(s => s.student_id === en.student_id) || {
                total_sessions: 0,
                present_count: 0,
                absent_count: 0,
                late_count: 0,
                excused_count: 0,
                attendance_rate: 0,
                avg_score: 0,
            };

            const studentInfo = Array.isArray(en.student) ? en.student[0] : en.student;

            return {
                id: en.student_id,
                name: studentInfo?.full_name || "Ẩn danh",
                email: studentInfo?.email || "",
                stats: studentStats
            };
        });

        return { data: merged, error: null };
    } catch (error: any) {
        console.error("Lỗi getClassStudentsWithStats:", error);
        return { data: [], error: error.message };
    }
}

// =====================================================
// BÁO CÁO ĐIỂM SỐ TOÀN DIỆN
// =====================================================
export async function fetchClassScoreReport(classId: string) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Enrolled students
        const { data: enrollments } = await adminSupabase
            .from("enrollments")
            .select("student_id, student:users!student_id(id, full_name, email)")
            .eq("class_id", classId)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) return { data: null, error: null };

        const studentIds = enrollments.map(e => e.student_id);

        // 2. Parallel: attendance stats, exams, homework, progress, points
        const [statsRes, examsRes, examSubsRes, hwRes, hwSubsRes, progressRes, pointsRes, courseItemsRes] = await Promise.all([
            adminSupabase.from("student_class_stats").select("*").in("student_id", studentIds).eq("class_id", classId),
            adminSupabase.from("exams").select("id, title, total_points, duration_minutes").eq("class_id", classId).eq("is_published", true),
            adminSupabase.from("exam_submissions").select("id, exam_id, student_id, score, total_points, submitted_at").in("student_id", studentIds),
            adminSupabase.from("homework").select("id, title, total_points, due_date").eq("class_id", classId).eq("is_published", true),
            adminSupabase.from("homework_submissions").select("id, homework_id, student_id, score, status").in("student_id", studentIds),
            adminSupabase.from("student_progress").select("student_id, item_id, status").in("student_id", studentIds),
            adminSupabase.from("student_points").select("id, student_id, points, type, reason, created_at").eq("class_id", classId).in("student_id", studentIds).order("created_at", { ascending: false }),
            adminSupabase.from("course_items").select("id, title, type").eq("class_id", classId).eq("is_published", true).neq("type", "folder"),
        ]);

        // quiz_attempts — may not exist
        let quizAttempts: any[] = [];
        try {
            const qaRes = await adminSupabase.from("quiz_attempts").select("id, student_id, item_id, score, passed, submitted_at").in("student_id", studentIds).order("submitted_at", { ascending: false });
            quizAttempts = qaRes.data || [];
        } catch { /* table may not exist */ }

        const stats = statsRes.data || [];
        const exams = examsRes.data || [];
        const examSubs: any[] = examSubsRes.data || [];
        const homeworks = hwRes.data || [];
        const hwSubs: any[] = hwSubsRes.data || [];
        const progress: any[] = progressRes.data || [];
        const points: any[] = pointsRes.data || [];
        const courseItems: any[] = courseItemsRes.data || [];

        const examIds = exams.map(e => e.id);
        const hwIds = homeworks.map(h => h.id);
        const totalLessons = courseItems.length;

        // 3. Calculate per-student report
        const studentReports = enrollments.map(en => {
            const studentInfo = Array.isArray(en.student) ? en.student[0] : en.student;
            const sid = en.student_id;

            // Attendance
            const st = stats.find(s => s.student_id === sid) || { attendance_rate: 0, avg_score: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0, total_sessions: 0 };

            // Exams — thang điểm 10
            const myExamSubs = examSubs.filter(s => s.student_id === sid && examIds.includes(s.exam_id));
            const examScores = myExamSubs.map(s => {
                const exam = exams.find(e => e.id === s.exam_id);
                const max = s.total_points || exam?.total_points || 10;
                const score10 = max > 0 ? Math.round((s.score / max) * 10 * 10) / 10 : 0;
                return { examId: s.exam_id, title: exam?.title || "", score: s.score, total: max, score10, percent: max > 0 ? Math.round((s.score / max) * 100) : 0, date: s.submitted_at };
            });
            const avgExam = examScores.length > 0 ? examScores.reduce((s, e) => s + e.percent, 0) / examScores.length : 0;
            const avgExam10 = examScores.length > 0 ? Math.round(examScores.reduce((s, e) => s + e.score10, 0) / examScores.length * 10) / 10 : 0;

            // Homework — thang điểm 10
            const myHwSubs = hwSubs.filter(s => s.student_id === sid && hwIds.includes(s.homework_id) && s.status === "graded");
            const hwScores = myHwSubs.map(s => {
                const hw = homeworks.find(h => h.id === s.homework_id);
                const max = hw?.total_points || 10;
                const score10 = max > 0 ? Math.round((s.score / max) * 10 * 10) / 10 : 0;
                return { hwId: s.homework_id, title: hw?.title || "", score: s.score, total: max, score10, percent: max > 0 ? Math.round((s.score / max) * 100) : 0 };
            });
            const avgHw = hwScores.length > 0 ? hwScores.reduce((s, h) => s + h.percent, 0) / hwScores.length : 0;
            const avgHw10 = hwScores.length > 0 ? Math.round(hwScores.reduce((s, h) => s + h.score10, 0) / hwScores.length * 10) / 10 : 0;

            // Progress
            const myProgress = progress.filter(p => p.student_id === sid);
            const completedLessons = myProgress.filter(p => p.status === "completed").length;
            const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            // Points (from student_points — teacher-managed, same source as TeacherPointsTab)
            const myPoints = points.filter(p => p.student_id === sid);
            const totalPoints = myPoints.reduce((s: number, p: any) => s + (p.points || 0), 0);
            const pointsNorm = Math.min(100, Math.max(0, 50 + totalPoints * 2));

            // ĐTB thang 10 = trung bình KT + BT
            const allScores10 = [...examScores.map((e: any) => e.score10), ...hwScores.map((h: any) => h.score10)];
            const avgScore10 = allScores10.length > 0 ? Math.round(allScores10.reduce((a: number, b: number) => a + b, 0) / allScores10.length * 10) / 10 : 0;

            // Quiz attempts (trắc nghiệm trong khóa học)
            const courseItemIds = courseItems.map((ci: any) => ci.id);
            const myQuizAttempts = quizAttempts.filter((q: any) => q.student_id === sid && courseItemIds.includes(q.item_id));
            const quizHistory = myQuizAttempts.map((q: any) => {
                const item = courseItems.find((ci: any) => ci.id === q.item_id);
                return { id: q.id, title: item?.title || "Trắc nghiệm", score: q.score, passed: q.passed, date: q.submitted_at };
            });

            // Weak areas: bài KT/BT < 5 điểm (thang 10)
            const weakExams = examScores.filter((e: any) => e.score10 < 5).map((e: any) => e.title);
            const weakHw = hwScores.filter((h: any) => h.score10 < 5).map((h: any) => h.title);
            const weakAreas = [...weakExams, ...weakHw];

            return {
                id: sid,
                name: studentInfo?.full_name || "Ẩn danh",
                email: studentInfo?.email || "",
                avgScore10,
                attendance: { rate: st.attendance_rate ?? 0, present: st.present_count, absent: st.absent_count, late: st.late_count, excused: st.excused_count, total: st.total_sessions },
                exams: { scores: examScores, avg: Math.round(avgExam), avg10: avgExam10, completed: myExamSubs.length, total: exams.length },
                homework: { scores: hwScores, avg: Math.round(avgHw), avg10: avgHw10, completed: myHwSubs.length, total: homeworks.length },
                progress: { completed: completedLessons, total: totalLessons, percent: progressPercent },
                points: { total: totalPoints, history: myPoints.slice(0, 10).map((p: any) => ({ id: p.id, points: p.points, reason: p.reason, type: p.type, date: p.created_at })), normalized: pointsNorm },
                quizHistory,
                weakAreas,
                totalScore: avgScore10, // Ranking chính bằng ĐTB thang 10
            };
        });

        // Sort by avgScore10 desc (thang điểm 10)
        studentReports.sort((a, b) => b.avgScore10 - a.avgScore10);

        // Class summary — thang 10
        const classAvg10 = studentReports.length > 0 ? Math.round(studentReports.reduce((s, r) => s + r.avgScore10, 0) / studentReports.length * 10) / 10 : 0;
        const excellentCount = studentReports.filter(r => r.avgScore10 >= 8).length;
        const goodCount = studentReports.filter(r => r.avgScore10 >= 6 && r.avgScore10 < 8).length;
        const weakCount = studentReports.filter(r => r.avgScore10 < 5).length;
        const avgAttendance = studentReports.length > 0 ? Math.round(studentReports.reduce((s, r) => s + r.attendance.rate, 0) / studentReports.length) : 0;
        const avgProgressClass = studentReports.length > 0 ? Math.round(studentReports.reduce((s, r) => s + r.progress.percent, 0) / studentReports.length) : 0;

        return {
            data: {
                students: studentReports,
                summary: {
                    totalStudents: studentReports.length,
                    classAvg10,
                    excellentCount,
                    goodCount,
                    weakCount,
                    avgAttendance,
                    avgProgress: avgProgressClass,
                    totalExams: exams.length,
                    totalHomework: homeworks.length,
                    totalLessons,
                },
                examList: exams,
                homeworkList: homeworks,
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetchClassScoreReport:", error);
        return { data: null, error: error.message };
    }
}

// =====================================================
// AI PHÂN TÍCH BÁO CÁO LỚP HỌC (có Retry + lưu DB)
// =====================================================
export async function generateClassAIReport(className: string, reportData: any, classId?: string) {
    try {
        const { summary, students } = reportData;
        const weakStudents = students.filter((s: any) => s.avgScore10 < 5);

        const studentSummary = students.map((s: any, i: number) =>
            `${i + 1}. ${s.name}: ĐTB ${s.avgScore10}/10 | KT ${s.exams.avg10}/10 | BT ${s.homework.avg10}/10 | CC ${s.attendance.rate}% | TĐ ${s.progress.percent}% | ĐTL ${s.points.total} | Yếu: ${s.weakAreas.length > 0 ? s.weakAreas.join(', ') : 'Không'}`
        ).join("\n");

        const prompt = `
Bạn là chuyên gia phân tích giáo dục AI. Hãy phân tích báo cáo lớp học sau và đưa ra nhận xét + đề xuất.

📊 LỚP: ${className}
Sĩ số: ${summary.totalStudents} học sinh
ĐTB Lớp: ${summary.classAvg10}/10 (thang điểm 10)
Xuất sắc (≥8): ${summary.excellentCount} | Khá (6-7.9): ${summary.goodCount} | Yếu (<5): ${summary.weakCount}
CC trung bình: ${summary.avgAttendance}% | Tiến trình: ${summary.avgProgress}%
Số bài KT: ${summary.totalExams} | Bài tập: ${summary.totalHomework} | Bài học: ${summary.totalLessons}

📋 CHI TIẾT TỪNG HỌC SINH (ĐTB/10 / KT/10 / BT/10 / CC% / TĐ% / ĐTL / Bài yếu):
${studentSummary}

YÊU CẦU PHÂN TÍCH (Viết tiếng Việt, rõ ràng, dưới 500 chữ):

1. **📊 Tổng quan lớp học**: Đánh giá chung tình hình lớp dựa trên ĐTB thang 10 (3-4 câu).
2. **🌟 Học sinh xuất sắc**: Khen ngợi 2-3 HS giỏi nhất (≥8 điểm), gợi ý cách phát huy thêm (bài tập nâng cao, vai trò trợ giảng...).
3. **⚠️ Học sinh cần cải thiện**: Liệt kê ${weakStudents.length} HS yếu (<5 điểm), phân tích CỤ THỂ từng em yếu ở bài nào, cần luyện gì.
4. **🔮 Dự báo**: Dự báo xu hướng lớp nếu tiếp tục tình trạng hiện tại.
5. **🎯 Đề xuất cải thiện**: 4-5 hành động CỤ THỂ cho giáo viên.
6. **📌 Ưu tiên hàng đầu**: 1-2 việc cần làm NGAY trong tuần tới.

QUAN TRỌNG: Trả về văn bản thuần (KHÔNG dùng JSON). Sử dụng **in đậm** cho tiêu đề và tên học sinh. Dùng emoji phù hợp. Không dùng heading Markdown (##, ###). Phân tích phải dựa trên dữ liệu thực tế.
`;

        // Dùng getGeminiModel trực tiếp (không dùng callGeminiWithRetry vì output là text, không phải JSON)
        const model = getGeminiModel("gemini-2.5-flash");
        let text = "";
        
        // Retry logic cho rate limit
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                text = result.response.text();
                break;
            } catch (err: any) {
                const isOverloaded = err.status === 429 || err.status === 503 || err.message?.includes("429") || err.message?.includes("503");
                if (isOverloaded && attempt < 3) {
                    const waitTime = Math.pow(2, attempt) * 2000 + 1000;
                    console.log(`[ClassAIReport] Rate limit hit. Retrying in ${waitTime}ms (attempt ${attempt + 1}/3)...`);
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }
                if (isOverloaded) {
                    return { data: null, error: "AI hiện đang quá tải. Vui lòng thử lại sau 1-2 phút." };
                }
                throw err;
            }
        }
        
        if (!text) {
            return { data: null, error: "Không nhận được phản hồi từ AI." };
        }

        // Lưu vào DB nếu có classId
        if (classId) {
            try {
                const adminSupabase = createAdminClient();
                
                // Lấy teacher_id từ class
                const { data: classData } = await adminSupabase
                    .from("classes")
                    .select("teacher_id")
                    .eq("id", classId)
                    .single();

                await adminSupabase
                    .from("class_ai_reports")
                    .upsert({
                        class_id: classId,
                        teacher_id: classData?.teacher_id || null,
                        report_text: text,
                        student_count: summary.totalStudents || 0,
                        class_avg: summary.classAvg10 || 0,
                        generated_at: new Date().toISOString(),
                    }, { onConflict: "class_id" });
            } catch (saveErr) {
                console.error("[ClassAIReport] Failed to save to DB:", saveErr);
                // Vẫn trả về text dù lưu DB lỗi
            }
        }
        
        return { data: text, error: null };
    } catch (error: any) {
        console.error("Error generateClassAIReport:", error);
        return { data: null, error: error.message };
    }
}

// =====================================================
// LOAD BÁO CÁO AI ĐÃ LƯU TỪ DB (không cần gọi AI lại)
// =====================================================
export async function loadSavedAIReport(classId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("class_ai_reports")
            .select("*")
            .eq("class_id", classId)
            .single();

        if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
        return { data: data || null, error: null };
    } catch (error: any) {
        console.error("Error loadSavedAIReport:", error);
        return { data: null, error: error.message };
    }
}

// =====================================================
// AI TẠO BÀI TẬP CẢI THIỆN CHO HS YẾU
// =====================================================
export async function generateImprovementTasks(studentName: string, weakAreas: string[], className: string) {
    try {
        const model = getGeminiModel("gemini-2.5-flash");

        const prompt = `
Bạn là giáo viên AI. Hãy tạo bài tập cải thiện cho học sinh **${studentName}** lớp **${className}**.

Học sinh này đang yếu ở các bài/chủ đề sau:
${weakAreas.map((a, i) => `${i + 1}. ${a}`).join("\n")}

YÊU CẦU (Viết tiếng Việt):
1. **Phân tích ngắn** lý do có thể khiến học sinh yếu ở các bài trên (2-3 câu).
2. **3-5 bài tập cải thiện** cụ thể, phù hợp trình độ, giúp học sinh nắm vững kiến thức. Mỗi bài tập ghi rõ:
   - Tên bài tập
   - Mô tả ngắn
   - Mục tiêu cần đạt
3. **Lộ trình học** gợi ý (thứ tự ưu tiên, thời gian ước tính).
4. **Lời khuyên** động viên học sinh.

QUAN TRỌNG: Dùng **in đậm** cho tên bài tập và tiêu đề. Dùng emoji. Không dùng heading (##, ###).
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return { data: text, error: null };
    } catch (error: any) {
        console.error("Error generateImprovementTasks:", error);
        return { data: null, error: error.message };
    }
}

// =====================================================
// GỬI THÔNG BÁO NHẮC NHỞ HỌC SINH VÀ PHỤ HUYNH
// =====================================================
export async function sendReminderAction(studentId: string, classId: string, className: string, itemName: string, itemType: "homework" | "exam") {
    try {
        const adminSupabase = createAdminClient();

        // 1. Get parents
        const { data: parentLinks } = await adminSupabase
            .from("parent_students")
            .select("parent_id")
            .eq("student_id", studentId);

        const targetUserIds = [studentId];
        if (parentLinks) {
            parentLinks.forEach(link => targetUserIds.push(link.parent_id));
        }

        // 2. Prepare message
        const typeLabel = itemType === "homework" ? "Bài tập" : "Bài kiểm tra";
        const title = `⚠️ Nhắc nhở: Chưa hoàn thành ${typeLabel}`;
        const message = `Học sinh chưa hoàn thành ${typeLabel} "${itemName}" của lớp ${className}. Vui lòng kiểm tra và hoàn thành sớm.`;

        // 3. Insert notifications
        const notifications = targetUserIds.map(uid => ({
            user_id: uid,
            title,
            message,
            type: "warning",
            link: `/parent`,
        }));

        const { error } = await adminSupabase.from("notifications").insert(notifications);
        if (error) throw error;

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error sendReminderAction:", error);
        return { success: false, error: error.message };
    }
}
