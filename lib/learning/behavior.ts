import { normalizeScore } from "./grading";
export interface ActivityLog { activity_type: string; session_id?: string | null; attempt_id?: string | null; occurred_at?: string; metadata?: Record<string, unknown> }
export function sessionMetrics(logs: ActivityLog[], attemptId: string) {
    const events = logs.filter(l => l.attempt_id === attemptId);
    const answers = events.filter(l => l.activity_type === "quiz_answer");
    const speeds = answers.map(l => Number(l.metadata?.answer_speed_ms)).filter(s => Number.isFinite(s) && s >= 0);
    const rapid = speeds.filter(s => s < 3000).length;
    const submits = events.filter(l => l.activity_type.endsWith("_submit"));
    const duration = Math.max(0, Number(submits.at(-1)?.metadata?.total_duration_s) || 0);
    const idle = Math.min(duration, events.filter(l => l.activity_type === "idle_end").reduce((n, l) => n + Math.max(0, Number(l.metadata?.idle_duration_s) || 0), 0));
    return { total_answers: answers.length, avg_answer_speed_ms: speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0,
        rapid_guess_count: rapid, rapid_guess_percent: speeds.length ? Math.round(rapid / speeds.length * 100) : 0,
        tab_switch_count: events.filter(l => l.activity_type === "tab_switch").length,
        warnings_count: events.filter(l => l.activity_type === "cheat_warning").length,
        total_duration_s: duration, total_idle_time_s: idle, active_time_s: Math.max(0, duration - idle), total_events: events.length,
        data_status: submits.length && answers.length ? "sufficient" as const : "insufficient_data" as const };
}
export interface ScoreRecord { score: number | null; total_points: number | null; class_id: string; submitted_at: string; graded: boolean }
export function scoreTrend(records: ScoreRecord[], classId: string) {
    const values = records.filter(r => r.class_id === classId && r.graded).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
        .map(r => normalizeScore(r.score, r.total_points)).filter((s): s is number => s !== null);
    const mean = (s: number[]) => s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
    const recent = mean(values.slice(0, 5)), older = mean(values.slice(5, 10));
    return { avg_recent: recent, avg_older: older, total_submissions: values.length,
        trend: recent === null || older === null ? "insufficient_data" : recent - older > 20 ? "improving" : older - recent > 20 ? "declining" : "stable",
        anomaly_detected: false, scores: values.slice(0, 10) };
}
