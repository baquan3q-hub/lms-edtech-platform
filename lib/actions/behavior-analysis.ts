"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModel } from "@/lib/gemini";

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
    contextId: string
) {
    try {
        const supabase = createAdminClient();

        // 1. Thu thập activity logs của session vừa rồi
        const sessionMetrics = await computeSessionMetrics(supabase, studentId, classId, contextType, contextId);
        
        // 2. Thu thập lịch sử điểm số để so sánh
        const scoreHistory = await getStudentScoreHistory(supabase, studentId, classId);

        // 3. Thu thập behavior score cũ (nếu có)
        const existingBehavior = await getExistingBehaviorScore(supabase, studentId, classId);

        // 4. Gọi AI phân tích
        const aiResult = await runAIAnalysis(sessionMetrics, scoreHistory, contextType);

        // 5. Lưu behavior score
        const today = new Date().toISOString().split("T")[0]; // '2026-04-14'
        await saveBehaviorScore(supabase, studentId, classId, today, sessionMetrics, aiResult, scoreHistory);

        // 6. Tạo alert nếu cần
        if (aiResult.gaming_score >= 0.7 || aiResult.anomaly_detected) {
            await createBehaviorAlert(supabase, studentId, classId, aiResult, sessionMetrics, contextType);
        }

        return { success: true, result: aiResult };
    } catch (error: any) {
        console.error("Behavior analysis error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Tính toán metrics từ raw activity logs của 1 session
 */
async function computeSessionMetrics(
    supabase: any,
    studentId: string,
    classId: string,
    contextType: string,
    contextId: string
) {
    // Lấy logs trong 2 giờ gần nhất cho context này
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabase
        .from("student_activity_logs")
        .select("*")
        .eq("student_id", studentId)
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: true });

    const allLogs = logs || [];

    // Tính các metrics
    const answerLogs = allLogs.filter((l: any) => l.activity_type === "quiz_answer");
    const tabSwitchLogs = allLogs.filter((l: any) => l.activity_type === "tab_switch");
    const idleEndLogs = allLogs.filter((l: any) => l.activity_type === "idle_end"); // Dùng idle_end thay vì idle_detected
    const warningLogs = allLogs.filter((l: any) => l.activity_type === "cheat_warning");
    const submitLogs = allLogs.filter((l: any) => l.activity_type.includes("_submit"));

    // Tốc độ trả lời trung bình
    const answerSpeeds = answerLogs
        .map((l: any) => l.metadata?.answer_speed_ms)
        .filter((s: any) => typeof s === "number");
    const avgAnswerSpeedMs = answerSpeeds.length > 0
        ? answerSpeeds.reduce((a: number, b: number) => a + b, 0) / answerSpeeds.length
        : 0;

    // Số lần rapid guess (< 3 giây)
    const rapidGuessCount = answerLogs.filter((l: any) => l.metadata?.is_rapid_guess === true).length;

    // Tổng tab switch
    const tabSwitchCount = tabSwitchLogs.length;

    // Warnings count  
    const warningsCount = warningLogs.length;

    // Total session duration (from submit log)
    const totalDurationS = submitLogs.length > 0
        ? submitLogs[submitLogs.length - 1].metadata?.total_duration_s || 0
        : 0;

    // Idle time tổng — dùng idle_end events với idle_duration_s thực tế
    const totalIdleTimeS = idleEndLogs.reduce((acc: number, l: any) => 
        acc + (l.metadata?.idle_duration_s || 0), 0);

    // Tỷ lệ rapid guess
    const rapidGuessPercent = answerLogs.length > 0
        ? (rapidGuessCount / answerLogs.length) * 100
        : 0;

    return {
        total_answers: answerLogs.length,
        avg_answer_speed_ms: Math.round(avgAnswerSpeedMs),
        rapid_guess_count: rapidGuessCount,
        rapid_guess_percent: Math.round(rapidGuessPercent),
        tab_switch_count: tabSwitchCount,
        warnings_count: warningsCount,
        total_duration_s: totalDurationS,
        total_idle_time_s: totalIdleTimeS,
        active_time_s: Math.max(0, totalDurationS - totalIdleTimeS),
        total_events: allLogs.length,
    };
}

/**
 * Lấy lịch sử điểm số gần đây của học sinh (kết hợp submissions + exam_submissions)
 */
async function getStudentScoreHistory(supabase: any, studentId: string, classId: string) {
    // Lấy 20 bài nộp gần nhất
    const [{ data: subs }, { data: examSubs }] = await Promise.all([
        supabase
            .from("submissions")
            .select("score, submitted_at, assignment:assignments(class_id, title, type)")
            .eq("student_id", studentId)
            .not("score", "is", null)
            .order("submitted_at", { ascending: false })
            .limit(20),
        supabase
            .from("exam_submissions")
            .select("score, submitted_at, exam:exams(class_id, title, total_points)")
            .eq("student_id", studentId)
            .not("score", "is", null)
            .order("submitted_at", { ascending: false })
            .limit(20),
    ]);

    // Gộp và filter theo class nếu cần
    const allScores: any[] = [];
    
    (subs || []).forEach((s: any) => {
        const assignmentClass = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
        allScores.push({
            score: Number(s.score),
            type: "assignment",
            title: assignmentClass?.title || "Bài tập",
            submitted_at: s.submitted_at,
            class_match: assignmentClass?.class_id === classId,
        });
    });

    (examSubs || []).forEach((s: any) => {
        const examData = Array.isArray(s.exam) ? s.exam[0] : s.exam;
        const totalPoints = examData?.total_points || 10;
        allScores.push({
            score: Number(s.score),
            score_normalized: (Number(s.score) / totalPoints) * 100,
            type: "exam",
            title: examData?.title || "Bài kiểm tra",
            submitted_at: s.submitted_at,
            class_match: examData?.class_id === classId,
        });
    });

    // Sort by date
    allScores.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    // Tính trend
    const scores = allScores.map(s => s.score_normalized || s.score);
    const recentScores = scores.slice(0, 5);
    const olderScores = scores.slice(5, 10);

    const avgRecent = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
    const avgOlder = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0;

    // Detect anomaly: điểm đột ngột tăng/giảm > 30%
    let trend: "improving" | "stable" | "declining" | "volatile" = "stable";
    let anomalyDetected = false;

    if (recentScores.length >= 3 && olderScores.length >= 2) {
        const diff = avgRecent - avgOlder;
        if (diff > 20) trend = "improving";
        else if (diff < -20) trend = "declining";

        // Check variance — nếu điểm dao động quá lớn
        const variance = recentScores.reduce((acc, s) => acc + Math.pow(s - avgRecent, 2), 0) / recentScores.length;
        if (variance > 400) {
            trend = "volatile";
            anomalyDetected = true;
        }

        // Kiểm tra sự bất thường: điểm rất cao nhưng hành vi nghi ngờ
        if (avgRecent > 80 && diff > 30) {
            anomalyDetected = true; // Đột ngột tăng mạnh
        }
    }

    return {
        scores: allScores.slice(0, 10),
        avg_recent: Math.round(avgRecent * 10) / 10,
        avg_older: Math.round(avgOlder * 10) / 10,
        trend,
        anomaly_detected: anomalyDetected,
        total_submissions: allScores.length,
    };
}

/**
 * Lấy behavior score hiện tại của student trong class
 */
async function getExistingBehaviorScore(supabase: any, studentId: string, classId: string) {
    const { data } = await supabase
        .from("student_behavior_scores")
        .select("*")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data;
}

/**
 * Gọi Gemini AI phân tích hành vi
 */
async function runAIAnalysis(
    sessionMetrics: any,
    scoreHistory: any,
    contextType: string
) {
    try {
        const model = getGeminiModel("gemini-2.5-flash");

        const prompt = `Bạn là AI chuyên phân tích hành vi học sinh trong hệ thống e-learning. Hãy phân tích dữ liệu sau và đưa ra đánh giá.

=== Dữ liệu hoạt động session hiện tại (${contextType}) ===
- Tổng số câu trả lời: ${sessionMetrics.total_answers}
- Tốc độ trả lời trung bình: ${sessionMetrics.avg_answer_speed_ms}ms/câu
- Số lần đoán nhanh (<3s): ${sessionMetrics.rapid_guess_count} (${sessionMetrics.rapid_guess_percent}%)
- Số lần chuyển tab: ${sessionMetrics.tab_switch_count}
- Số cảnh báo gian lận: ${sessionMetrics.warnings_count}
- Thời gian làm bài tổng: ${sessionMetrics.total_duration_s}s
- Thời gian idle (không thao tác): ${sessionMetrics.total_idle_time_s}s
- Thời gian hoạt động thực tế: ${sessionMetrics.active_time_s}s

=== Lịch sử điểm số ===
- Điểm trung bình 5 bài gần nhất: ${scoreHistory.avg_recent}/100
- Điểm trung bình 5 bài trước đó: ${scoreHistory.avg_older}/100
- Xu hướng: ${scoreHistory.trend}
- Phát hiện bất thường điểm: ${scoreHistory.anomaly_detected ? "CÓ" : "Không"}
- Tổng bài đã nộp: ${scoreHistory.total_submissions}

=== Yêu cầu phân tích ===
Trả lời CHÍNH XÁC JSON format sau (KHÔNG thêm markdown, chỉ JSON thuần):
{
  "gaming_score": <số 0.0 đến 1.0, khả năng gaming the system>,
  "risk_level": "<normal|warning|high_risk>",
  "anomaly_detected": <true/false>,
  "behaviors_detected": ["<danh sách hành vi bất thường nếu có>"],
  "analysis_summary": "<mô tả ngắn gọn bằng tiếng Việt, 2-3 câu>",
  "recommendation": "<lời khuyên cho giáo viên bằng tiếng Việt, 1-2 câu>"
}

Quy tắc đánh giá:
- gaming_score < 0.3 → normal (học bình thường)
- 0.3 ≤ gaming_score < 0.7 → warning (cần theo dõi)
- gaming_score ≥ 0.7 → high_risk (nghi ngờ gian lận)
- Rapid guess > 40% → cộng thêm 0.2 gaming_score
- Tab switch > 5 lần → cộng thêm 0.15 gaming_score
- Idle > 40% thời gian → cộng thêm 0.1 gaming_score
- Điểm đột ngột tăng mạnh + hành vi bất thường → anomaly_detected = true`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Parse JSON từ response (loại bỏ markdown code fences nếu có)
        const jsonStr = responseText
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/gi, "")
            .trim();

        const parsed = JSON.parse(jsonStr);

        // Validate fields
        return {
            gaming_score: Math.min(1, Math.max(0, Number(parsed.gaming_score) || 0)),
            risk_level: ["normal", "warning", "high_risk"].includes(parsed.risk_level) ? parsed.risk_level : "normal",
            anomaly_detected: Boolean(parsed.anomaly_detected),
            behaviors_detected: Array.isArray(parsed.behaviors_detected) ? parsed.behaviors_detected : [],
            analysis_summary: parsed.analysis_summary || "Không có phân tích chi tiết.",
            recommendation: parsed.recommendation || "Tiếp tục theo dõi.",
        };
    } catch (error: any) {
        console.error("AI analysis error:", error);

        // Fallback: tính gaming_score thủ công nếu AI fail
        return computeFallbackScore(sessionMetrics, scoreHistory);
    }
}

/**
 * Fallback scoring nếu Gemini API không khả dụng
 */
function computeFallbackScore(sessionMetrics: any, scoreHistory: any) {
    let gamingScore = 0;

    // Rapid guess
    if (sessionMetrics.rapid_guess_percent > 60) gamingScore += 0.35;
    else if (sessionMetrics.rapid_guess_percent > 40) gamingScore += 0.2;
    else if (sessionMetrics.rapid_guess_percent > 20) gamingScore += 0.1;

    // Tab switching
    if (sessionMetrics.tab_switch_count > 10) gamingScore += 0.25;
    else if (sessionMetrics.tab_switch_count > 5) gamingScore += 0.15;
    else if (sessionMetrics.tab_switch_count > 2) gamingScore += 0.05;

    // Idle ratio
    const idleRatio = sessionMetrics.total_duration_s > 0
        ? sessionMetrics.total_idle_time_s / sessionMetrics.total_duration_s
        : 0;
    if (idleRatio > 0.5) gamingScore += 0.15;
    else if (idleRatio > 0.3) gamingScore += 0.08;

    // Score anomaly
    if (scoreHistory.anomaly_detected) gamingScore += 0.15;

    gamingScore = Math.min(1, gamingScore);

    let riskLevel: "normal" | "warning" | "high_risk" = "normal";
    if (gamingScore >= 0.7) riskLevel = "high_risk";
    else if (gamingScore >= 0.3) riskLevel = "warning";

    const behaviors: string[] = [];
    if (sessionMetrics.rapid_guess_percent > 40) behaviors.push("Đoán nhanh nhiều câu");
    if (sessionMetrics.tab_switch_count > 5) behaviors.push("Chuyển tab nhiều lần");
    if (idleRatio > 0.3) behaviors.push("Thời gian idle cao");
    if (scoreHistory.anomaly_detected) behaviors.push("Điểm số bất thường");

    return {
        gaming_score: Math.round(gamingScore * 100) / 100,
        risk_level: riskLevel,
        anomaly_detected: scoreHistory.anomaly_detected,
        behaviors_detected: behaviors,
        analysis_summary: behaviors.length > 0
            ? `Phát hiện ${behaviors.length} dấu hiệu bất thường: ${behaviors.join(", ")}.`
            : "Không phát hiện hành vi bất thường.",
        recommendation: gamingScore >= 0.7
            ? "Cần trao đổi trực tiếp với học sinh và thông báo phụ huynh."
            : gamingScore >= 0.3
                ? "Nên theo dõi thêm trong các bài tiếp theo."
                : "Học sinh hoạt động bình thường.",
    };
}

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
        ai_analysis_json: aiResult,
        avg_score_recent: scoreHistory.avg_recent,
        score_trend: scoreHistory.trend,
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
        console.error("Error saving behavior score:", error);
    }
}

/**
 * Tạo alert + gửi notification cho teacher & parent
 */
async function createBehaviorAlert(
    supabase: any,
    studentId: string,
    classId: string,
    aiResult: any,
    metrics: any,
    contextType: string
) {
    // Lấy thông tin học sinh
    const { data: student } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", studentId)
        .single();

    const studentName = student?.full_name || "Học sinh";

    // Xác định loại alert
    let alertType = "gaming_detected";
    if (aiResult.anomaly_detected && aiResult.gaming_score < 0.7) alertType = "score_anomaly";
    if (metrics.rapid_guess_percent > 60) alertType = "rapid_guessing";
    if (metrics.tab_switch_count > 10) alertType = "tab_switching";

    const severity = aiResult.gaming_score >= 0.7 ? "high" : aiResult.gaming_score >= 0.3 ? "medium" : "low";

    const description = aiResult.analysis_summary;

    // 1. Tạo alert record
    const { data: alert } = await supabase.from("behavior_alerts").insert({
        student_id: studentId,
        class_id: classId,
        alert_type: alertType,
        severity,
        description,
        details_json: {
            gaming_score: aiResult.gaming_score,
            risk_level: aiResult.risk_level,
            behaviors: aiResult.behaviors_detected,
            recommendation: aiResult.recommendation,
            metrics: {
                rapid_guess_percent: metrics.rapid_guess_percent,
                tab_switch_count: metrics.tab_switch_count,
                active_time_s: metrics.active_time_s,
                idle_time_s: metrics.total_idle_time_s,
            },
            context_type: contextType,
        },
        notified_teacher: true,
        notified_parent: severity === "high",
    }).select("id").single();

    // 2. Gửi notification cho Teacher
    const { data: classData } = await supabase
        .from("classes")
        .select("teacher_id, name, course:courses(name)")
        .eq("id", classId)
        .single();

    if (classData?.teacher_id) {
        const courseData = Array.isArray(classData.course) ? classData.course[0] : classData.course;
        const className = courseData?.name || classData.name || "Lớp học";

        await supabase.from("notifications").insert({
            user_id: classData.teacher_id,
            title: `⚠️ Cảnh báo hành vi: ${studentName}`,
            message: `[${className}] ${description}\n\nĐề xuất: ${aiResult.recommendation}`,
            type: "warning",
            is_read: false,
        });
    }

    // 3. Gửi notification cho Phụ huynh (nếu severity = high)
    if (severity === "high") {
        const { data: parentLinks } = await supabase
            .from("parent_students")
            .select("parent_id")
            .eq("student_id", studentId);

        if (parentLinks && parentLinks.length > 0) {
            const parentNotifs = parentLinks.map((p: any) => ({
                user_id: p.parent_id,
                title: `🔔 Thông báo về hành vi học tập của con bạn`,
                message: `Hệ thống AI phát hiện hành vi bất thường của ${studentName}:\n${description}\n\nĐề xuất: ${aiResult.recommendation}\n\nVui lòng liên hệ giáo viên để được tư vấn thêm.`,
                type: "warning",
                is_read: false,
            }));
            await supabase.from("notifications").insert(parentNotifs);
        }
    }
}

// ============================================================
// API cho Teacher dashboard
// ============================================================

/**
 * Lấy behavior scores cho toàn bộ học sinh trong lớp
 */
export async function fetchClassBehaviorScores(classId: string) {
    try {
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

        // Lấy behavior scores mới nhất
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
        const supabase = createAdminClient();

        // 1. Tổng quan alerts
        const { data: allAlerts, count: totalAlerts } = await supabase
            .from("behavior_alerts")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .limit(100);

        const alerts = allAlerts || [];
        const unresolvedAlerts = alerts.filter((a: any) => !a.is_resolved);
        const highRiskAlerts = alerts.filter((a: any) => a.severity === "high");

        // 2. Phân bố risk level
        const { data: allScores } = await supabase
            .from("student_behavior_scores")
            .select("risk_level, gaming_score, student_id, class_id, updated_at, ai_analysis_json")
            .order("gaming_score", { ascending: false })
            .limit(200);

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
            const { data: students } = await supabase
                .from("users")
                .select("id, full_name, avatar_url, email")
                .in("id", topRiskStudentIds);

            const { data: classesData } = await supabase
                .from("classes")
                .select("id, name, course:courses(name)")
                .in("id", scores.slice(0, 10).map((s: any) => s.class_id));

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
        let studentsMap: Record<string, any> = {};
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
