"use server";

import { requireActor, requireClassAccess, requireStudentAccess, requireResourceAccess } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/lib/gemini";
import { sessionMetrics, scoreTrend } from "@/lib/learning/behavior";
import { generateBrief } from "@/lib/ai/generate-brief";
import { missingBrief, formatBrief, PROMPT_VERSION } from "@/lib/ai/brief";

// ============================================================
// Behavior Analysis Engine
// Phân tích hành vi học sinh kết hợp dữ liệu hoạt động + điểm số
// ============================================================

/**
 * Chạy phân tích hành vi khi student hoàn thành bài (real-time trigger)
 * Kết hợp: activity logs + điểm số cũ → AI dự đoán gaming
 */
export async function analyzeStudentBehavior(
    studentId: string,
    classId: string,
    contextType: "quiz" | "exam" | "homework",
    contextId: string,
    attemptId?: string
) {
    try {
        await requireStudentAccess(studentId); const actor = await requireClassAccess(classId); if (actor.role === "student" && actor.id !== studentId) throw new Error("Không có quyền.");

        const supabase = createAdminClient();

        if (!attemptId) return {success:false, error:"Chưa có lần làm bài để phân tích."};
        const {data: attempt} = await supabase.from("exam_attempts").select("id,exam_id,student_id,submitted_at").eq("id",attemptId).eq("exam_id",contextId).eq("student_id",studentId).maybeSingle();
        if(!attempt?.submitted_at) return {success:false,error:"Bài làm chưa được nộp."};
        await requireResourceAccess("exams",contextId);
        // 1. Thu thập activity logs của session vừa rồi
        const sessionMetrics = await computeSessionMetrics(supabase, studentId, classId, contextType, contextId, attemptId);
        
        // 2. Thu thập lịch sử điểm số để so sánh
        const scoreHistory = await getStudentScoreHistory(supabase, studentId, classId);

        // 3. Thu thập behavior score cũ (nếu có)

        // 4. Gọi AI phân tích
        const aiResult = await runAIAnalysis(sessionMetrics, scoreHistory, contextType);

        // 5. Lưu behavior score (dùng contextType + contextId làm period để tránh ghi đè dữ liệu)
        const periodKey = `${contextType}_${attemptId}`;
        await saveBehaviorScore(supabase, studentId, classId, periodKey, sessionMetrics, aiResult, scoreHistory);

        // 6. Tạo alert nếu cần

        return { success: true, result: aiResult };
    } catch (error: any) {
        console.error("Behavior analysis error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Tính toán metrics từ raw activity logs của 1 session
 */
async function computeSessionMetrics(supabase: ReturnType<typeof createAdminClient>, studentId: string, classId: string, contextType: string, contextId: string, attemptId: string) {
 const { data, error } = await supabase.from("student_activity_logs").select("activity_type,metadata,attempt_id,session_id,occurred_at").eq("student_id",studentId).eq("class_id",classId).eq("context_type",contextType).eq("context_id",contextId).eq("attempt_id",attemptId).order("occurred_at");
 if(error) throw new Error("Không đọc được dữ liệu hoạt động.");
 return sessionMetrics(data || [],attemptId);
}

/**
 * Lấy lịch sử điểm số gần đây của học sinh (kết hợp submissions + exam_submissions)
 */
async function getStudentScoreHistory(supabase: ReturnType<typeof createAdminClient>, studentId: string, classId: string) {
 const {data: exams,error: examError}=await supabase.from("exams").select("id").eq("class_id",classId);
 if(examError) throw examError;
 if(!exams?.length) return scoreTrend([],classId);
 const {data,error}=await supabase.from("exam_submissions").select("score,total_points,submitted_at,grading_status").eq("student_id",studentId).in("exam_id",exams.map(e=>e.id)).eq("grading_status","graded").order("submitted_at",{ascending:false}).limit(20);
 if(error) throw error;
 return scoreTrend((data||[]).map(r=>({...r,class_id:classId,graded:true})),classId);
}

/**
 * Lấy behavior score hiện tại của student trong class
 */


/**
 * Gọi Gemini AI phân tích hành vi
 */
async function runAIAnalysis(metrics: ReturnType<typeof sessionMetrics>, history: ReturnType<typeof scoreTrend>, contextType: string) {
 const enough=metrics.data_status === "sufficient";
 const signals: string[]=[];
 if(enough && metrics.total_answers >= 10 && metrics.rapid_guess_percent > 40) signals.push("Nhiều câu được trả lời dưới 3 giây");
 if(enough && metrics.tab_switch_count > 5) signals.push("Chuyển tab nhiều lần");
 const fallback = enough ? { summary: signals.length ? "Có hoạt động cần giáo viên xem xét thêm." : "Đã ghi nhận hoạt động làm bài.", evidence: metrics.total_answers + " lượt trả lời; " + metrics.tab_switch_count + " lần chuyển tab.", next_action: "Đối chiếu bài làm và trao đổi với học sinh khi cần." } : missingBrief;
 const generated = enough ? await generateBrief({metrics,history,contextType},fallback) : {brief:missingBrief,status:"not_requested"};
 return { gaming_score: enough ? signals.length * 0.2 : null, risk_level: enough ? (signals.length ? "warning" : "normal") : null,
 anomaly_detected:false, behaviors_detected:signals, analysis_summary:formatBrief(generated.brief), recommendation:generated.brief.next_action,
 data_status:metrics.data_status, analysis_status:generated.status, prompt_version:PROMPT_VERSION, model:AI_MODEL };
}

/**
 * Fallback scoring nếu Gemini API không khả dụng
 */


/**
 * Lưu behavior score vào DB
 */
async function saveBehaviorScore(
    supabase: any,
    studentId: string,
    classId: string,
    period: string,
    metrics: any,
    aiResult: any,
    scoreHistory: any
) {
    const scoreData = {
        student_id: studentId,
        class_id: classId,
        period,
        avg_answer_speed_ms: metrics.avg_answer_speed_ms,
        tab_switch_count: metrics.tab_switch_count,
        total_active_time_s: metrics.active_time_s,
        total_idle_time_s: metrics.total_idle_time_s,
        rapid_guess_count: metrics.rapid_guess_count,
        total_sessions: 1,
        gaming_score: aiResult.gaming_score,
        risk_level: aiResult.risk_level,
        data_status: aiResult.data_status,
        analysis_status: aiResult.analysis_status,
        ai_analysis_json: aiResult,
        avg_score_recent: scoreHistory.avg_recent,
        score_trend: scoreHistory.trend === "insufficient_data" ? "stable" : scoreHistory.trend,
        anomaly_detected: aiResult.anomaly_detected,
        updated_at: new Date().toISOString(),
    };

    // Upsert: cập nhật nếu đã có record cho cùng student/class/period
    const { error } = await supabase
        .from("student_behavior_scores")
        .upsert(scoreData, {
            onConflict: "student_id,class_id,period",
        });

    if (error) {
        throw new Error("Không lưu được báo cáo hành vi.");
    }
}

/**
 * Tạo alert + gửi notification cho teacher & parent
 */


// ============================================================
// Teacher Dashboard — Tổng hợp Hành vi học tập toàn lớp
// ============================================================

/**
 * Lấy tổng quan hành vi lớp: stats, biểu đồ, cảnh báo, chi tiết HS
 * Dùng cho trang /teacher/behavior
 */
export async function fetchTeacherClassBehaviorOverview(classId: string) {
    try {
        await requireClassAccess(classId, "teach");

        const supabase = createAdminClient();

        // 1. Lấy danh sách HS enrolled
        const { data: enrollments } = await supabase
            .from("enrollments")
            .select("student_id, student:users!student_id(id, full_name, avatar_url, email)")
            .eq("class_id", classId)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) {
            return { data: null, error: null };
        }

        const studentIds = enrollments.map((e: any) => e.student_id);

        // 2. Lấy behavior scores (lấy bài có gaming_score lớn nhất - MAX)
        const { data: allScores } = await supabase
            .from("student_behavior_scores")
            .select("*")
            .eq("class_id", classId)
            .in("student_id", studentIds)
            .order("updated_at", { ascending: false });

        const scoreMap = new Map<string, any>();
        (allScores || []).forEach((s: any) => {
            if (!scoreMap.has(s.student_id)) scoreMap.set(s.student_id, s);
        });

        // 3. Lấy alerts chưa resolved
        const { data: unresolvedAlerts } = await supabase
            .from("behavior_alerts")
            .select("*")
            .eq("class_id", classId)
            .in("student_id", studentIds)
            .eq("is_resolved", false)
            .order("created_at", { ascending: false })
            .limit(20);

        // 4. Lấy lịch sử bài làm (exam_submissions + submissions)
        const [{ data: examSubs }, { data: assignSubs }] = await Promise.all([
            supabase
                .from("exam_submissions")
                .select("id, student_id, score, submitted_at, time_taken_seconds, exam:exams(id, title, total_points, class_id)")
                .in("student_id", studentIds)
                .not("score", "is", null)
                .order("submitted_at", { ascending: false })
                .limit(200),
            supabase
                .from("submissions")
                .select("id, student_id, score, submitted_at, assignment:assignments(id, title, type, class_id)")
                .in("student_id", studentIds)
                .not("score", "is", null)
                .order("submitted_at", { ascending: false })
                .limit(200),
        ]);

        // Filter theo class_id
        const classExamSubs = (examSubs || []).filter((s: any) => {
            const exam = Array.isArray(s.exam) ? s.exam[0] : s.exam;
            return exam?.class_id === classId;
        });
        const classAssignSubs = (assignSubs || []).filter((s: any) => {
            const assignment = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
            return assignment?.class_id === classId;
        });

        // 5. Lấy activity logs cho metrics per submission
        const { data: activityLogs } = await supabase
            .from("student_activity_logs")
            .select("student_id, context_type, context_id, activity_type, metadata, created_at")
            .eq("class_id", classId)
            .in("student_id", studentIds)
            .order("created_at", { ascending: false })
            .limit(500);

        // === OVERVIEW STATS ===
        const scores = Array.from(scoreMap.values());
        const highRiskCount = scores.filter((s: any) => s.risk_level === "high_risk").length;
        const warningCount = scores.filter((s: any) => s.risk_level === "warning").length;
        const normalCount = scores.filter((s: any) => s.risk_level === "normal").length;
        const noDataCount = studentIds.length - scores.length;

        const gamingScores = scores.map((s: any) => s.gaming_score || 0);
        const avgGamingScore = gamingScores.length > 0
            ? Number((gamingScores.reduce((a: number, b: number) => a + b, 0) / gamingScores.length).toFixed(2))
            : 0;

        // Metrics trung bình lớp
        const avgTabSwitch = scores.length > 0
            ? Number((scores.reduce((a: number, s: any) => a + (s.tab_switch_count || 0), 0) / scores.length).toFixed(1))
            : 0;
        const avgRapidGuess = scores.length > 0
            ? Number((scores.reduce((a: number, s: any) => a + (s.rapid_guess_count || 0), 0) / scores.length).toFixed(1))
            : 0;
        const avgAnswerSpeed = scores.length > 0
            ? Math.round(scores.reduce((a: number, s: any) => a + (s.avg_answer_speed_ms || 0), 0) / scores.length)
            : 0;

        const overview = {
            totalStudents: studentIds.length,
            highRiskCount,
            warningCount,
            normalCount,
            noDataCount,
            avgGamingScore,
            avgTabSwitch,
            avgRapidGuess,
            avgAnswerSpeedMs: avgAnswerSpeed,
            unresolvedAlertCount: (unresolvedAlerts || []).length,
        };

        // === PIE CHART: Phân bổ risk ===
        const riskDistribution = [
            { name: "Bình thường", value: normalCount, fill: "#10b981" },
            { name: "Cần theo dõi", value: warningCount, fill: "#f59e0b" },
            { name: "Nguy cơ cao", value: highRiskCount, fill: "#ef4444" },
            { name: "Chưa có dữ liệu", value: noDataCount, fill: "#cbd5e1" },
        ].filter(d => d.value > 0);

        // === CẢNH BÁO TỨC THÌ — Rule-based ===
        const immediateAlerts: any[] = [];
        scores.forEach((s: any) => {
            const studentEnrollment = enrollments.find((e: any) => e.student_id === s.student_id);
            const studentData = studentEnrollment
                ? (Array.isArray(studentEnrollment.student) ? studentEnrollment.student[0] : studentEnrollment.student)
                : null;
            const name = studentData?.full_name || "HS";

            // Rule 1: Gaming score cao
            if (s.gaming_score >= 0.7) {
                immediateAlerts.push({
                    student_id: s.student_id, student_name: name,
                    type: "gaming_high", severity: "high",
                    message: `Điểm nghi ngờ gian lận: ${(s.gaming_score * 100).toFixed(0)}%`,
                    icon: "🔴",
                });
            }
            // Rule 2: Đoán bừa nhiều
            if (s.rapid_guess_count >= 5) {
                immediateAlerts.push({
                    student_id: s.student_id, student_name: name,
                    type: "rapid_guess", severity: s.rapid_guess_count >= 10 ? "high" : "medium",
                    message: `Đoán bừa ${s.rapid_guess_count} câu (< 3s/câu)`,
                    icon: "🟠",
                });
            }
            // Rule 3: Chuyển tab nhiều
            if (s.tab_switch_count >= 8) {
                immediateAlerts.push({
                    student_id: s.student_id, student_name: name,
                    type: "tab_switch", severity: s.tab_switch_count >= 15 ? "high" : "medium",
                    message: `Chuyển tab ${s.tab_switch_count} lần khi làm bài`,
                    icon: "🟠",
                });
            }
            // Rule 4: Idle cao
            const totalTime = (s.total_active_time_s || 0) + (s.total_idle_time_s || 0);
            if (totalTime > 0 && (s.total_idle_time_s || 0) / totalTime > 0.4) {
                immediateAlerts.push({
                    student_id: s.student_id, student_name: name,
                    type: "high_idle", severity: "low",
                    message: `Thời gian rảnh tay chiếm ${Math.round(((s.total_idle_time_s || 0) / totalTime) * 100)}%`,
                    icon: "🟡",
                });
            }
            // Rule 5: Điểm giảm sút
            if (s.score_trend === "declining" && (s.avg_score_recent || 0) < 50) {
                immediateAlerts.push({
                    student_id: s.student_id, student_name: name,
                    type: "score_decline", severity: "medium",
                    message: `Điểm giảm sút — TB gần đây: ${s.avg_score_recent}%`,
                    icon: "🟠",
                });
            }
            // Rule 6: Điểm bất thường
            if (s.anomaly_detected) {
                immediateAlerts.push({
                    student_id: s.student_id, student_name: name,
                    type: "anomaly", severity: "high",
                    message: `Phát hiện bất thường về điểm số`,
                    icon: "🔴",
                });
            }
            // Rule 7: Làm bài quá nhanh
            if (s.avg_answer_speed_ms > 0 && s.avg_answer_speed_ms < 2000) {
                immediateAlerts.push({
                    student_id: s.student_id, student_name: name,
                    type: "too_fast", severity: "medium",
                    message: `Tốc độ trả lời quá nhanh: ${(s.avg_answer_speed_ms / 1000).toFixed(1)}s/câu`,
                    icon: "🟠",
                });
            }
        });

        // Sort alerts: high → medium → low
        const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        immediateAlerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

        // === CHI TIẾT TỪNG HS ===
        // Gom submission history per student
        const submissionHistoryMap = new Map<string, any[]>();
        classExamSubs.forEach((s: any) => {
            const exam = Array.isArray(s.exam) ? s.exam[0] : s.exam;
            const list = submissionHistoryMap.get(s.student_id) || [];
            list.push({
                id: s.id, type: "exam", title: exam?.title || "Kiểm tra",
                score: Number(s.score), total: exam?.total_points || 10,
                percentage: exam?.total_points ? Math.round((Number(s.score) / exam.total_points) * 100) : 0,
                submitted_at: s.submitted_at,
                time_spent: s.time_taken_seconds || null,
            });
            submissionHistoryMap.set(s.student_id, list);
        });
        classAssignSubs.forEach((s: any) => {
            const assignment = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
            const list = submissionHistoryMap.get(s.student_id) || [];
            list.push({
                id: s.id, type: assignment?.type || "homework", title: assignment?.title || "Bài tập",
                score: Number(s.score), total: 10,
                percentage: Math.round(Number(s.score) * 10),
                submitted_at: s.submitted_at,
                time_spent: null,
            });
            submissionHistoryMap.set(s.student_id, list);
        });

        // Gom activity logs per student
        const logsMap = new Map<string, any[]>();
        (activityLogs || []).forEach((l: any) => {
            const list = logsMap.get(l.student_id) || [];
            list.push(l);
            logsMap.set(l.student_id, list);
        });

        const students = enrollments.map((e: any) => {
            const studentData = Array.isArray(e.student) ? e.student[0] : e.student;
            const behavior = scoreMap.get(e.student_id);
            const submissions = (submissionHistoryMap.get(e.student_id) || [])
                .sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
            const studentAlerts = (unresolvedAlerts || []).filter((a: any) => a.student_id === e.student_id);
            const logs = logsMap.get(e.student_id) || [];

            // Tính metrics per student (từ logs)
            const tabSwitchLogs = logs.filter((l: any) => l.activity_type === "tab_switch");
            const rapidGuessLogs = logs.filter((l: any) => l.metadata?.is_rapid_guess === true);

            // Tìm thông tin bài thi vi phạm nặng nhất
            let worstExamTitle = "Bài kiểm tra";
            let worstExamId = "";
            if (behavior && behavior.period && behavior.period.startsWith("exam_")) {
                worstExamId = behavior.period.replace("exam_", "");
                const worstSub = classExamSubs.find((s: any) => {
                    const exam = Array.isArray(s.exam) ? s.exam[0] : s.exam;
                    return s.student_id === e.student_id && exam?.id === worstExamId;
                });
                if (worstSub) {
                    const exam = Array.isArray(worstSub.exam) ? worstSub.exam[0] : worstSub.exam;
                    worstExamTitle = exam?.title || "Bài kiểm tra";
                }
            }

            return {
                student_id: e.student_id,
                student_name: studentData?.full_name || "N/A",
                avatar_url: studentData?.avatar_url,
                email: studentData?.email,
                behavior: behavior ? {
                    gaming_score: behavior.gaming_score,
                    risk_level: behavior.risk_level,
                    avg_answer_speed_ms: behavior.avg_answer_speed_ms,
                    tab_switch_count: behavior.tab_switch_count,
                    rapid_guess_count: behavior.rapid_guess_count,
                    total_active_time_s: behavior.total_active_time_s,
                    total_idle_time_s: behavior.total_idle_time_s,
                    score_trend: behavior.score_trend,
                    avg_score_recent: behavior.avg_score_recent,
                    anomaly_detected: behavior.anomaly_detected,
                    ai_analysis: behavior.ai_analysis_json,
                    updated_at: behavior.updated_at,
                    exam_title: worstExamTitle,
                    exam_id: worstExamId,
                } : null,
                submissions,
                alerts: studentAlerts,
                total_tab_switches: tabSwitchLogs.length,
                total_rapid_guesses: rapidGuessLogs.length,
            };
        });

        // Sort: high_risk → warning → normal → no data
        students.sort((a: any, b: any) => {
            const riskOrder: Record<string, number> = { high_risk: 0, warning: 1, normal: 2 };
            const aRisk = a.behavior?.risk_level ? riskOrder[a.behavior.risk_level] ?? 3 : 3;
            const bRisk = b.behavior?.risk_level ? riskOrder[b.behavior.risk_level] ?? 3 : 3;
            if (aRisk !== bRisk) return aRisk - bRisk;
            return (b.behavior?.gaming_score || 0) - (a.behavior?.gaming_score || 0);
        });

        // === BAR CHART: So sánh metrics HS (top 15) ===
        const barChartData = students.slice(0, 15).map((s: any) => ({
            name: (s.student_name || "").split(" ").slice(-1)[0] || "HS", // Lấy tên cuối
            fullName: s.student_name,
            gaming: Math.round((s.behavior?.gaming_score || 0) * 100),
            tabSwitch: s.behavior?.tab_switch_count || 0,
            rapidGuess: s.behavior?.rapid_guess_count || 0,
            avgScore: s.behavior?.avg_score_recent || 0,
        }));

        return {
            data: {
                overview,
                riskDistribution,
                immediateAlerts,
                barChartData,
                students,
                dbAlerts: unresolvedAlerts || [],
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetchTeacherClassBehaviorOverview:", error);
        return { data: null, error: error.message };
    }
}

// ============================================================
// API cho Teacher dashboard
// ============================================================

/**
 * Lấy lịch sử bài làm chi tiết của 1 HS trong 1 lớp
 * Kèm behavior metrics per submission (tab switch, rapid guess, speed, idle)
 */
export async function fetchStudentBehaviorHistory(studentId: string, classId: string) {
    try {
        await requireStudentAccess(studentId); await requireClassAccess(classId);

        const supabase = createAdminClient();

        // 1. Lấy tất cả exam submissions
        const { data: examSubs } = await supabase
            .from("exam_submissions")
            .select("id, student_id, score, submitted_at, time_taken_seconds, answers, exam:exams(id, title, total_points, class_id, questions)")
            .eq("student_id", studentId)
            .not("score", "is", null)
            .order("submitted_at", { ascending: false })
            .limit(30);

        // 2. Lấy tất cả assignment submissions
        const { data: assignSubs } = await supabase
            .from("submissions")
            .select("id, student_id, score, submitted_at, assignment:assignments(id, title, type, class_id)")
            .eq("student_id", studentId)
            .not("score", "is", null)
            .order("submitted_at", { ascending: false })
            .limit(30);

        // Filter theo class_id
        const classExamSubs = (examSubs || []).filter((s: any) => {
            const exam = Array.isArray(s.exam) ? s.exam[0] : s.exam;
            return exam?.class_id === classId;
        });
        const classAssignSubs = (assignSubs || []).filter((s: any) => {
            const assignment = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
            return assignment?.class_id === classId;
        });

        // 3. Lấy activity logs cho student trong class này
        const { data: allLogs } = await supabase
            .from("student_activity_logs")
            .select("context_type, context_id, activity_type, metadata, created_at")
            .eq("student_id", studentId)
            .eq("class_id", classId)
            .order("created_at", { ascending: false })
            .limit(500);

        // Group logs by context_id
        const logsByContext = new Map<string, any[]>();
        (allLogs || []).forEach((l: any) => {
            const key = l.context_id;
            if (!key) return;
            const list = logsByContext.get(key) || [];
            list.push(l);
            logsByContext.set(key, list);
        });

        // 4. Build detailed submissions list
        const submissions: any[] = [];

        classExamSubs.forEach((s: any) => {
            const exam = Array.isArray(s.exam) ? s.exam[0] : s.exam;
            const totalPoints = exam?.total_points || 10;
            const percentage = Math.round((Number(s.score) / totalPoints) * 100);

            // Get behavior metrics from logs for this exam
            const contextLogs = logsByContext.get(exam?.id) || [];
            const tabSwitches = contextLogs.filter((l: any) => l.activity_type === "tab_switch").length;
            const rapidGuesses = contextLogs.filter((l: any) => l.metadata?.is_rapid_guess === true).length;
            const answerLogs = contextLogs.filter((l: any) => l.activity_type === "quiz_answer");
            const answerSpeeds = answerLogs.map((l: any) => l.metadata?.answer_speed_ms).filter((s: any) => typeof s === "number");
            const avgSpeed = answerSpeeds.length > 0 ? Math.round(answerSpeeds.reduce((a: number, b: number) => a + b, 0) / answerSpeeds.length) : 0;
            const idleLogs = contextLogs.filter((l: any) => l.activity_type === "idle_end");
            const totalIdle = idleLogs.reduce((acc: number, l: any) => acc + (l.metadata?.idle_duration_s || 0), 0);
            const warnings = contextLogs.filter((l: any) => l.activity_type === "cheat_warning").length;
            const totalQuestions = (exam?.questions || []).length;

            submissions.push({
                id: s.id,
                type: "exam",
                title: exam?.title || "Bài kiểm tra",
                score: Number(s.score),
                total: totalPoints,
                percentage,
                submitted_at: s.submitted_at,
                time_spent: s.time_taken_seconds || null,
                total_questions: totalQuestions,
                behavior: {
                    tab_switches: tabSwitches,
                    rapid_guesses: rapidGuesses,
                    avg_speed_ms: avgSpeed,
                    total_idle_s: totalIdle,
                    warnings,
                    has_data: contextLogs.length > 0,
                },
            });
        });

        classAssignSubs.forEach((s: any) => {
            const assignment = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
            submissions.push({
                id: s.id,
                type: assignment?.type || "homework",
                title: assignment?.title || "Bài tập",
                score: Number(s.score),
                total: 10,
                percentage: Math.round(Number(s.score) * 10),
                submitted_at: s.submitted_at,
                time_spent: null,
                total_questions: 0,
                behavior: { tab_switches: 0, rapid_guesses: 0, avg_speed_ms: 0, total_idle_s: 0, warnings: 0, has_data: false },
            });
        });

        // Sort by date
        submissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

        // 5. Trend data (cho sparkline chart — chronological order)
        const trendData = [...submissions]
            .reverse()
            .map(s => ({
                date: new Date(s.submitted_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
                score: s.percentage,
                title: s.title,
                type: s.type,
            }));

        // 6. Summary stats
        const examSubmissions = submissions.filter(s => s.type === "exam");
        const behaviorSubs = examSubmissions.filter(s => s.behavior.has_data);
        const totalTabSwitches = behaviorSubs.reduce((a, s) => a + s.behavior.tab_switches, 0);
        const totalRapidGuesses = behaviorSubs.reduce((a, s) => a + s.behavior.rapid_guesses, 0);
        const avgSpeedAll = behaviorSubs.length > 0
            ? Math.round(behaviorSubs.reduce((a, s) => a + s.behavior.avg_speed_ms, 0) / behaviorSubs.length)
            : 0;
        const avgPercentage = submissions.length > 0
            ? Math.round(submissions.reduce((a, s) => a + s.percentage, 0) / submissions.length)
            : 0;

        return {
            data: {
                submissions,
                trendData,
                summary: {
                    totalSubmissions: submissions.length,
                    totalExams: examSubmissions.length,
                    avgPercentage,
                    totalTabSwitches,
                    totalRapidGuesses,
                    avgSpeedMs: avgSpeedAll,
                    sessionsWithData: behaviorSubs.length,
                },
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetchStudentBehaviorHistory:", error);
        return { data: null, error: error.message };
    }
}


/**
 * Lấy behavior scores cho toàn bộ học sinh trong lớp
 */
export async function fetchClassBehaviorScores(classId: string) {
    try {
        await requireClassAccess(classId, "teach");

        const supabase = createAdminClient();

        // Lấy danh sách học sinh enrolled
        const { data: enrollments } = await supabase
            .from("enrollments")
            .select("student_id, student:users!student_id(id, full_name, avatar_url, email)")
            .eq("class_id", classId)
            .eq("status", "active");

        if (!enrollments || enrollments.length === 0) {
            return { data: [], error: null };
        }

        const studentIds = enrollments.map((e: any) => e.student_id);

        // Lấy behavior scores có gaming score lớn nhất (MAX)
        const { data: scores } = await supabase
            .from("student_behavior_scores")
            .select("*")
            .eq("class_id", classId)
            .in("student_id", studentIds)
            .order("updated_at", { ascending: false });

        // Lấy alerts chưa resolved
        const { data: alerts } = await supabase
            .from("behavior_alerts")
            .select("*")
            .eq("class_id", classId)
            .in("student_id", studentIds)
            .eq("is_resolved", false)
            .order("created_at", { ascending: false })
            .limit(50);

        // Map scores theo student (lấy record mới nhất)
        const scoreMap = new Map<string, any>();
        (scores || []).forEach((s: any) => {
            if (!scoreMap.has(s.student_id)) {
                scoreMap.set(s.student_id, s);
            }
        });

        // Build result
        const result = enrollments.map((e: any) => {
            const studentData = Array.isArray(e.student) ? e.student[0] : e.student;
            const behaviorScore = scoreMap.get(e.student_id);
            const studentAlerts = (alerts || []).filter((a: any) => a.student_id === e.student_id);

            return {
                student_id: e.student_id,
                student_name: studentData?.full_name || "N/A",
                avatar_url: studentData?.avatar_url,
                email: studentData?.email,
                behavior: behaviorScore ? {
                    gaming_score: behaviorScore.gaming_score,
                    risk_level: behaviorScore.risk_level,
                    avg_answer_speed_ms: behaviorScore.avg_answer_speed_ms,
                    tab_switch_count: behaviorScore.tab_switch_count,
                    rapid_guess_count: behaviorScore.rapid_guess_count,
                    total_active_time_s: behaviorScore.total_active_time_s,
                    total_idle_time_s: behaviorScore.total_idle_time_s,
                    score_trend: behaviorScore.score_trend,
                    avg_score_recent: behaviorScore.avg_score_recent,
                    anomaly_detected: behaviorScore.anomaly_detected,
                    ai_analysis: behaviorScore.ai_analysis_json,
                    updated_at: behaviorScore.updated_at,
                } : null,
                alerts: studentAlerts,
            };
        });

        // Sort: high_risk đầu → warning → normal → no data
        result.sort((a: any, b: any) => {
            const riskOrder: Record<string, number> = { high_risk: 0, warning: 1, normal: 2 };
            const aRisk = a.behavior?.risk_level ? riskOrder[a.behavior.risk_level] ?? 3 : 3;
            const bRisk = b.behavior?.risk_level ? riskOrder[b.behavior.risk_level] ?? 3 : 3;
            return aRisk - bRisk;
        });

        return { data: result, error: null };
    } catch (error: any) {
        console.error("Error fetching class behavior:", error);
        return { data: [], error: error.message };
    }
}

/**
 * Lấy chi tiết activity logs của 1 học sinh (dùng cho teacher xem detail)
 */
export async function fetchStudentActivityDetail(studentId: string, classId: string, limit = 50) {
    try {
        await requireStudentAccess(studentId); await requireClassAccess(classId);

        const supabase = createAdminClient();

        const { data: logs } = await supabase
            .from("student_activity_logs")
            .select("*")
            .eq("student_id", studentId)
            .eq("class_id", classId)
            .order("created_at", { ascending: false })
            .limit(limit);

        const { data: alerts } = await supabase
            .from("behavior_alerts")
            .select("*")
            .eq("student_id", studentId)
            .eq("class_id", classId)
            .order("created_at", { ascending: false })
            .limit(20);

        return { logs: logs || [], alerts: alerts || [], error: null };
    } catch (error: any) {
        return { logs: [], alerts: [], error: error.message };
    }
}

// ============================================================
// API cho Admin dashboard
// ============================================================

/**
 * Admin: lấy tổng hợp behavior analytics toàn hệ thống
 */
export async function fetchSystemBehaviorAnalytics() {
    try {
        await requireActor(["admin"]);

        const supabase = createAdminClient();

        // Alerts và điểm hành vi độc lập, tải cùng lúc.
        const [alertsResult, scoresResult] = await Promise.all([
            supabase.from("behavior_alerts")
                .select("id, is_resolved, severity, created_at", { count: "exact" })
                .order("created_at", { ascending: false }).limit(100),
            supabase.from("student_behavior_scores")
                .select("risk_level, gaming_score, student_id, class_id, updated_at")
                .order("gaming_score", { ascending: false }).limit(200),
        ]);
        if (alertsResult.error) throw alertsResult.error;
        if (scoresResult.error) throw scoresResult.error;
        const { data: allAlerts, count: totalAlerts } = alertsResult;
        const { data: allScores } = scoresResult;

        const alerts = allAlerts || [];
        const unresolvedAlerts = alerts.filter((a: any) => !a.is_resolved);
        const highRiskAlerts = alerts.filter((a: any) => a.severity === "high");

        // 2. Phân bố risk level
        const scores = allScores || [];
        const riskDistribution = {
            high_risk: scores.filter((s: any) => s.risk_level === "high_risk").length,
            warning: scores.filter((s: any) => s.risk_level === "warning").length,
            normal: scores.filter((s: any) => s.risk_level === "normal").length,
        };

        // 3. Top 10 gaming score cao nhất (kèm student name)
        const topRiskStudentIds = scores.slice(0, 10).map((s: any) => s.student_id);
        let topRiskStudents: any[] = [];

        if (topRiskStudentIds.length > 0) {
            const [{ data: students }, { data: classesData }] = await Promise.all([
                supabase.from("users")
                    .select("id, full_name, avatar_url, email")
                    .in("id", topRiskStudentIds),
                supabase.from("classes")
                    .select("id, name, course:courses(name)")
                    .in("id", scores.slice(0, 10).map((s: any) => s.class_id)),
            ]);

            const studentMap = new Map((students || []).map((s: any) => [s.id, s]));
            const classMap = new Map((classesData || []).map((c: any) => [c.id, c]));

            topRiskStudents = scores.slice(0, 10).map((s: any) => {
                const student = studentMap.get(s.student_id);
                const cls = classMap.get(s.class_id);
                const courseData = cls ? (Array.isArray(cls.course) ? cls.course[0] : cls.course) : null;
                return {
                    student_id: s.student_id,
                    student_name: student?.full_name || "N/A",
                    avatar_url: student?.avatar_url,
                    class_name: courseData?.name || cls?.name || "N/A",
                    class_id: s.class_id,
                    gaming_score: s.gaming_score,
                    risk_level: s.risk_level,
                    updated_at: s.updated_at,
                };
            });
        }

        // 4. Alert trend theo ngày (7 ngày gần nhất)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const recentAlerts = alerts.filter((a: any) => a.created_at >= sevenDaysAgo);

        const alertsByDay = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            alertsByDay.set(d.toISOString().split("T")[0], 0);
        }

        recentAlerts.forEach((a: any) => {
            const day = a.created_at.split("T")[0];
            if (alertsByDay.has(day)) {
                alertsByDay.set(day, (alertsByDay.get(day) || 0) + 1);
            }
        });

        const alertTrend = Array.from(alertsByDay.entries()).map(([date, count]) => ({
            date: date.slice(5), // mm-dd
            alerts: count,
        }));

        return {
            summary: {
                total_alerts: totalAlerts || 0,
                unresolved_alerts: unresolvedAlerts.length,
                high_risk_alerts: highRiskAlerts.length,
                total_scores_tracked: scores.length,
            },
            risk_distribution: riskDistribution,
            top_risk_students: topRiskStudents,
            alert_trend: alertTrend,
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetching system behavior analytics:", error);
        return {
            summary: { total_alerts: 0, unresolved_alerts: 0, high_risk_alerts: 0, total_scores_tracked: 0 },
            risk_distribution: { high_risk: 0, warning: 0, normal: 0 },
            top_risk_students: [],
            alert_trend: [],
            error: error.message,
        };
    }
}

/**
 * Teacher: Lấy tóm tắt behavior cho teacher dashboard chính
 */
export async function fetchTeacherBehaviorSummary(teacherId: string) {
    try {
        const actor = await requireActor(["teacher", "admin"]); if (actor.role !== "admin" && actor.id !== teacherId) throw new Error("Không có quyền.");

        const supabase = createAdminClient();

        // Lấy classes của teacher
        const { data: classes } = await supabase
            .from("classes")
            .select("id")
            .eq("teacher_id", teacherId)
            .eq("status", "active");

        if (!classes || classes.length === 0) {
            return { highRiskCount: 0, warningCount: 0, recentAlerts: [], error: null };
        }

        const classIds = classes.map((c: any) => c.id);

        // Đếm risks
        const { data: scores } = await supabase
            .from("student_behavior_scores")
            .select("risk_level, student_id")
            .in("class_id", classIds)
            .in("risk_level", ["warning", "high_risk"]);

        // Unique students per risk level
        const uniqueHighRisk = new Set((scores || []).filter((s: any) => s.risk_level === "high_risk").map((s: any) => s.student_id));
        const uniqueWarning = new Set((scores || []).filter((s: any) => s.risk_level === "warning").map((s: any) => s.student_id));

        // Recent alerts (5 gần nhất)
        const { data: alerts } = await supabase
            .from("behavior_alerts")
            .select("*, student:users!student_id(full_name, avatar_url)")
            .in("class_id", classIds)
            .eq("is_resolved", false)
            .order("created_at", { ascending: false })
            .limit(5);

        return {
            highRiskCount: uniqueHighRisk.size,
            warningCount: uniqueWarning.size,
            recentAlerts: (alerts || []).map((a: any) => ({
                id: a.id,
                student_name: Array.isArray(a.student) ? a.student[0]?.full_name : a.student?.full_name || "N/A",
                avatar_url: Array.isArray(a.student) ? a.student[0]?.avatar_url : a.student?.avatar_url,
                alert_type: a.alert_type,
                severity: a.severity,
                description: a.description,
                created_at: a.created_at,
            })),
            error: null,
        };
    } catch (error: any) {
        return { highRiskCount: 0, warningCount: 0, recentAlerts: [], error: error.message };
    }
}
// ============================================================
// Manual Action: Gửi thông báo đến phụ huynh (Teacher / Admin)
// ============================================================

/**
 * Gửi thông báo trực tiếp đến phụ huynh về hành vi của học sinh
 */
export async function notifyParentAboutBehavior(studentId: string, customMessage: string) {
    try {
        await requireStudentAccess(studentId, true);

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Kiểm tra quyền (phải là admin hoặc teacher)
        const { data: senderData } = await adminSupabase
            .from("users")
            .select("role, full_name")
            .eq("id", user.id)
            .single();

        if (!senderData || !['admin', 'teacher'].includes(senderData.role)) {
            return { error: "Không có quyền gửi thông báo." };
        }

        // Lấy thông tin học sinh
        const { data: student } = await adminSupabase
            .from("users")
            .select("full_name")
            .eq("id", studentId)
            .single();

        // Lấy danh sách phụ huynh
        const { data: parents } = await adminSupabase
            .from("parent_students")
            .select("parent_id")
            .eq("student_id", studentId);

        if (!parents || parents.length === 0) {
            return { error: "Học sinh này chưa được liên kết với tài khoản phụ huynh nào." };
        }

        const senderTitle = senderData.role === "admin" ? "Ban quản trị" : `Giáo viên ${senderData.full_name}`;

        // Gửi notification cho tất cả phụ huynh
        const parentNotifs = parents.map((p: any) => ({
            user_id: p.parent_id,
            title: `Cập nhật hành vi học tập: ${student?.full_name || "Học sinh"}`,
            message: `[${senderTitle} nhắc nhở]: ${customMessage}`,
            type: 'behavior_alert',
            is_read: false,
            link: `/parent/students/${studentId}/behavior`
        }));

        const { error } = await adminSupabase.from("notifications").insert(parentNotifs);
        if (error) throw error;

        return { error: null };
    } catch (error: any) {
        console.error("notifyParentAboutBehavior error:", error);
        return { error: error.message };
    }
}

// ============================================================
// Admin Dashboard — Behavior Analytics toàn diện
// ============================================================

export async function fetchAdminBehaviorDashboard(filters?: {
    courseId?: string;
    classId?: string;
}) {
    try {
        await requireActor(["admin"]);

        const supabase = createAdminClient();

        // 1. Lấy classes + courses + teachers
        const { data: allClasses } = await supabase
            .from("classes")
            .select("id, name, course_id, teacher_id, course:courses(id, name), teacher:users!teacher_id(id, full_name)")
            .order("name");

        const { data: allCourses } = await supabase
            .from("courses")
            .select("id, name")
            .order("name");

        // Áp dụng filter
        let targetClassIds: string[] = [];
        if (filters?.classId && filters.classId !== "all") {
            targetClassIds = [filters.classId];
        } else if (filters?.courseId && filters.courseId !== "all") {
            targetClassIds = (allClasses || [])
                .filter((c: any) => c.course_id === filters!.courseId)
                .map((c: any) => c.id);
        } else {
            targetClassIds = (allClasses || []).map((c: any) => c.id);
        }

        // 2. Lấy behavior scores cho targeted classes
        let scoresQuery = supabase
            .from("student_behavior_scores")
            .select("*")
            .order("gaming_score", { ascending: false });

        if (targetClassIds.length > 0 && targetClassIds.length < (allClasses || []).length) {
            scoresQuery = scoresQuery.in("class_id", targetClassIds);
        }

        const { data: allScores } = await scoresQuery;
        const scores = allScores || [];

        // Deduplicate: mỗi student_id + class_id chỉ lấy record mới nhất
        const uniqueScoreMap = new Map<string, any>();
        scores.forEach((s: any) => {
            const key = `${s.student_id}_${s.class_id}`;
            if (!uniqueScoreMap.has(key)) {
                uniqueScoreMap.set(key, s);
            }
        });
        const uniqueScores = Array.from(uniqueScoreMap.values());

        // 3. Lấy alerts
        let alertsQuery = supabase
            .from("behavior_alerts")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .limit(200);

        if (targetClassIds.length > 0 && targetClassIds.length < (allClasses || []).length) {
            alertsQuery = alertsQuery.in("class_id", targetClassIds);
        }

        const { data: allAlerts, count: totalAlertCount } = await alertsQuery;
        const alerts = allAlerts || [];

        // 4. Lấy thông tin students
        const studentIds = [...new Set(uniqueScores.map((s: any) => s.student_id))];
        const studentsMap: Record<string, any> = {};
        if (studentIds.length > 0) {
            const { data: students } = await supabase
                .from("users")
                .select("id, full_name, email, avatar_url")
                .in("id", studentIds);
            (students || []).forEach((s: any) => { studentsMap[s.id] = s; });
        }

        // === OVERVIEW CARDS ===
        const highRiskCount = uniqueScores.filter((s: any) => s.risk_level === "high_risk").length;
        const warningCount = uniqueScores.filter((s: any) => s.risk_level === "warning").length;
        const normalCount = uniqueScores.filter((s: any) => s.risk_level === "normal").length;

        const gamingScores = uniqueScores.map((s: any) => s.gaming_score || 0);
        const avgGamingScore = gamingScores.length > 0
            ? Number((gamingScores.reduce((a: number, b: number) => a + b, 0) / gamingScores.length).toFixed(2))
            : 0;

        const unresolvedAlerts = alerts.filter((a: any) => !a.is_resolved).length;

        const overviewCards = {
            totalStudentsTracked: uniqueScores.length,
            highRiskCount,
            warningCount,
            normalCount,
            avgGamingScore,
            totalAlerts: totalAlertCount || alerts.length,
            unresolvedAlerts,
        };

        // === PIE CHART: Risk Distribution ===
        const riskDistribution = [
            { name: "Bình thường", value: normalCount, fill: "#10b981" },
            { name: "Cần theo dõi", value: warningCount, fill: "#f59e0b" },
            { name: "Nguy cơ cao", value: highRiskCount, fill: "#ef4444" },
        ].filter(d => d.value > 0);

        // === LINE CHART: Alert trend 14 ngày ===
        const alertsByDay = new Map<string, number>();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            alertsByDay.set(d.toISOString().split("T")[0], 0);
        }
        alerts.forEach((a: any) => {
            const day = a.created_at?.split("T")[0];
            if (day && alertsByDay.has(day)) {
                alertsByDay.set(day, (alertsByDay.get(day) || 0) + 1);
            }
        });
        const alertTrend = Array.from(alertsByDay.entries()).map(([date, count]) => ({
            date: date.slice(5), // mm-dd
            alerts: count,
        }));

        // === BAR CHART: So sánh lớp ===
        const classMap = new Map<string, any>();
        (allClasses || []).forEach((c: any) => {
            if (targetClassIds.includes(c.id)) {
                const courseData = Array.isArray(c.course) ? c.course[0] : c.course;
                const teacherData = Array.isArray(c.teacher) ? c.teacher[0] : c.teacher;
                classMap.set(c.id, {
                    classId: c.id,
                    className: c.name,
                    courseName: courseData?.name || "",
                    teacherName: teacherData?.full_name || "N/A",
                });
            }
        });

        const classStatsMap: Record<string, {
            gamingScores: number[]; activeTimes: number[]; idleTimes: number[];
            highRisk: number; warning: number; total: number;
        }> = {};

        uniqueScores.forEach((s: any) => {
            if (!classStatsMap[s.class_id]) {
                classStatsMap[s.class_id] = {
                    gamingScores: [], activeTimes: [], idleTimes: [],
                    highRisk: 0, warning: 0, total: 0,
                };
            }
            const stats = classStatsMap[s.class_id];
            stats.gamingScores.push(s.gaming_score || 0);
            stats.activeTimes.push(s.total_active_time_s || 0);
            stats.idleTimes.push(s.total_idle_time_s || 0);
            stats.total++;
            if (s.risk_level === "high_risk") stats.highRisk++;
            if (s.risk_level === "warning") stats.warning++;
        });

        const classComparison = Object.entries(classStatsMap)
            .map(([classId, stats]) => {
                const info = classMap.get(classId);
                if (!info) return null;
                const avg = (arr: number[]) =>
                    arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;
                return {
                    ...info,
                    avgGamingScore: avg(stats.gamingScores),
                    avgActiveTimeMin: Number((avg(stats.activeTimes) / 60).toFixed(1)),
                    avgIdleTimeMin: Number((avg(stats.idleTimes) / 60).toFixed(1)),
                    studentCount: stats.total,
                    highRiskCount: stats.highRisk,
                    warningCount: stats.warning,
                };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => b.avgGamingScore - a.avgGamingScore);

        // === BẢNG CHI TIẾT HS ===
        const studentDetails = uniqueScores.map((s: any) => {
            const student = studentsMap[s.student_id];
            const classInfo = classMap.get(s.class_id);
            const studentAlertCount = alerts.filter(
                (a: any) => a.student_id === s.student_id && a.class_id === s.class_id
            ).length;

            return {
                studentId: s.student_id,
                studentName: student?.full_name || "N/A",
                email: student?.email || "",
                avatarUrl: student?.avatar_url || null,
                classId: s.class_id,
                className: classInfo?.className || "N/A",
                courseName: classInfo?.courseName || "",
                teacherName: classInfo?.teacherName || "",
                gamingScore: s.gaming_score || 0,
                riskLevel: s.risk_level || "normal",
                tabSwitchCount: s.tab_switch_count || 0,
                rapidGuessCount: s.rapid_guess_count || 0,
                avgAnswerSpeedMs: s.avg_answer_speed_ms || 0,
                activeTimeS: s.total_active_time_s || 0,
                idleTimeS: s.total_idle_time_s || 0,
                scoreTrend: s.score_trend || "stable",
                avgScoreRecent: s.avg_score_recent || 0,
                anomalyDetected: s.anomaly_detected || false,
                alertCount: studentAlertCount,
                aiAnalysis: s.ai_analysis_json || null,
                updatedAt: s.updated_at,
            };
        });

        // Sort: high_risk → warning → normal
        studentDetails.sort((a: any, b: any) => {
            const riskOrder: Record<string, number> = { high_risk: 0, warning: 1, normal: 2 };
            const diff = (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
            if (diff !== 0) return diff;
            return b.gamingScore - a.gamingScore;
        });

        return {
            data: {
                overviewCards,
                riskDistribution,
                alertTrend,
                classComparison,
                studentDetails,
                // Dropdown filters
                courses: allCourses || [],
                classes: (allClasses || []).map((c: any) => {
                    const courseData = Array.isArray(c.course) ? c.course[0] : c.course;
                    return {
                        id: c.id,
                        name: c.name,
                        courseId: c.course_id,
                        courseName: courseData?.name || "",
                    };
                }),
            },
            error: null,
        };
    } catch (error: any) {
        console.error("Error fetchAdminBehaviorDashboard:", error);
        return { data: null, error: error.message };
    }
}
