"use client";

import { useState } from "react";
import {
    AlertTriangle, Shield, ShieldAlert, ShieldCheck,
    Eye, ChevronDown, ChevronUp, Clock, Monitor, Zap,
    MousePointer2, TrendingUp, TrendingDown, Minus,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

// Config màu cho risk level
const riskConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    high_risk: { label: "Nguy cơ cao", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: ShieldAlert },
    warning: { label: "Cần theo dõi", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle },
    normal: { label: "Bình thường", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: ShieldCheck },
};

const trendIcons: Record<string, any> = {
    improving: TrendingUp,
    declining: TrendingDown,
    stable: Minus,
    volatile: AlertTriangle,
};

const trendLabels: Record<string, string> = {
    improving: "Tăng",
    declining: "Giảm",
    stable: "Ổn định",
    volatile: "Biến động",
};

interface StudentBehaviorData {
    student_id: string;
    student_name: string;
    avatar_url?: string;
    email?: string;
    behavior: {
        gaming_score: number;
        risk_level: string;
        avg_answer_speed_ms: number;
        tab_switch_count: number;
        rapid_guess_count: number;
        total_active_time_s: number;
        total_idle_time_s: number;
        score_trend: string;
        avg_score_recent: number;
        anomaly_detected: boolean;
        ai_analysis: any;
        updated_at: string;
    } | null;
    alerts: any[];
}

export default function StudentBehaviorPanel({ data }: { data: StudentBehaviorData[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const studentsWithData = data.filter(d => d.behavior !== null);
    const studentsWithoutData = data.filter(d => d.behavior === null);

    const highRiskCount = studentsWithData.filter(d => d.behavior?.risk_level === "high_risk").length;
    const warningCount = studentsWithData.filter(d => d.behavior?.risk_level === "warning").length;
    const normalCount = studentsWithData.filter(d => d.behavior?.risk_level === "normal").length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl border-2 border-red-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-3xl font-black text-red-700">{highRiskCount}</p>
                        <p className="text-xs font-bold text-red-500/80 uppercase tracking-wider">Nguy cơ cao</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border-2 border-amber-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-3xl font-black text-amber-700">{warningCount}</p>
                        <p className="text-xs font-bold text-amber-500/80 uppercase tracking-wider">Cần theo dõi</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border-2 border-emerald-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-3xl font-black text-emerald-700">{normalCount}</p>
                        <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-wider">Bình thường</p>
                    </div>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Chi tiết hành vi theo học sinh</h3>
                    <span className="text-[10px] text-slate-400 italic">Gaming Score = Khả năng gian lận (AI phân tích). ≥70% Cao · 30-69% TB · &lt;30% BT</span>
                    <span className="text-xs text-slate-400 ml-auto">{studentsWithData.length} đã có dữ liệu</span>
                </div>

                <div className="divide-y divide-slate-50">
                    {studentsWithData.length === 0 && studentsWithoutData.length > 0 && (
                        <div className="p-8 text-center">
                            <Eye className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-600">Chưa có dữ liệu hành vi</p>
                            <p className="text-xs text-slate-400 mt-1">Dữ liệu sẽ được cập nhật khi học sinh hoàn thành bài tập hoặc bài kiểm tra.</p>
                        </div>
                    )}

                    {studentsWithData.map((student) => {
                        const b = student.behavior!;
                        const risk = riskConfig[b.risk_level] || riskConfig.normal;
                        const RiskIcon = risk.icon;
                        const isExpanded = expandedId === student.student_id;
                        const TrendIcon = trendIcons[b.score_trend] || Minus;
                        const gamingPercent = Math.round(b.gaming_score * 100);

                        return (
                            <div key={student.student_id} className={`transition-colors ${isExpanded ? "bg-slate-50/50" : "hover:bg-slate-50/30"}`}>
                                {/* Row chính */}
                                <div
                                    className="px-6 py-4 flex items-center gap-4 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : student.student_id)}
                                >
                                    <Avatar className="w-9 h-9">
                                        <AvatarImage src={student.avatar_url} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                                            {student.student_name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 truncate">{student.student_name}</p>
                                        <p className="text-xs text-slate-400 truncate">{student.email}</p>
                                    </div>

                                    {/* Gaming Score Bar */}
                                    <div className="hidden sm:flex items-center gap-3 w-[180px]">
                                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    gamingPercent >= 70 ? "bg-red-500" :
                                                    gamingPercent >= 30 ? "bg-amber-500" : "bg-emerald-500"
                                                }`}
                                                style={{ width: `${gamingPercent}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold w-10 text-right ${
                                            gamingPercent >= 70 ? "text-red-600" :
                                            gamingPercent >= 30 ? "text-amber-600" : "text-emerald-600"
                                        }`}>
                                            {gamingPercent}%
                                        </span>
                                    </div>

                                    {/* Risk Badge */}
                                    <Badge className={`${risk.bg} ${risk.color} ${risk.border} border font-semibold text-[10px] gap-1 px-2.5`}>
                                        <RiskIcon className="w-3 h-3" />
                                        {risk.label}
                                    </Badge>

                                    {/* Alerts count */}
                                    {student.alerts.length > 0 && (
                                        <span className="flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                            {student.alerts.length} cảnh báo
                                        </span>
                                    )}

                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="px-6 pb-5 pt-1 animate-in slide-in-from-top-2 duration-300">
                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                            <MetricCard
                                                icon={Zap}
                                                label="Tốc độ TB"
                                                value={`${(b.avg_answer_speed_ms / 1000).toFixed(1)}s/câu`}
                                                color={b.avg_answer_speed_ms < 3000 ? "text-red-600" : "text-slate-700"}
                                                bg={b.avg_answer_speed_ms < 3000 ? "bg-red-50" : "bg-slate-50"}
                                            />
                                            <MetricCard
                                                icon={Monitor}
                                                label="Chuyển tab"
                                                value={`${b.tab_switch_count} lần`}
                                                color={b.tab_switch_count > 5 ? "text-amber-600" : "text-slate-700"}
                                                bg={b.tab_switch_count > 5 ? "bg-amber-50" : "bg-slate-50"}
                                            />
                                            <MetricCard
                                                icon={MousePointer2}
                                                label="Đoán nhanh"
                                                value={`${b.rapid_guess_count} lần`}
                                                color={b.rapid_guess_count > 3 ? "text-red-600" : "text-slate-700"}
                                                bg={b.rapid_guess_count > 3 ? "bg-red-50" : "bg-slate-50"}
                                            />
                                            <MetricCard
                                                icon={Clock}
                                                label="Idle time"
                                                value={`${Math.round(b.total_idle_time_s / 60)}p`}
                                                color={b.total_idle_time_s > 300 ? "text-amber-600" : "text-slate-700"}
                                                bg={b.total_idle_time_s > 300 ? "bg-amber-50" : "bg-slate-50"}
                                            />
                                        </div>

                                        {/* Score Info */}
                                        <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-500">Điểm TB gần đây:</span>
                                                <span className="text-sm font-bold text-slate-900">{b.avg_score_recent || "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-semibold text-slate-500">Xu hướng:</span>
                                                <TrendIcon className={`w-4 h-4 ${
                                                    b.score_trend === "improving" ? "text-emerald-600" :
                                                    b.score_trend === "declining" ? "text-red-600" :
                                                    b.score_trend === "volatile" ? "text-amber-600" : "text-slate-400"
                                                }`} />
                                                <span className={`text-xs font-bold ${
                                                    b.score_trend === "improving" ? "text-emerald-600" :
                                                    b.score_trend === "declining" ? "text-red-600" :
                                                    b.score_trend === "volatile" ? "text-amber-600" : "text-slate-500"
                                                }`}>{trendLabels[b.score_trend] || "—"}</span>
                                            </div>
                                            {b.anomaly_detected && (
                                                <Badge className="bg-red-100 text-red-700 border-red-200 border text-[10px]">
                                                    ⚠ Điểm bất thường
                                                </Badge>
                                            )}
                                        </div>

                                        {/* AI Analysis */}
                                        {b.ai_analysis && (
                                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mb-3">
                                                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Phân tích AI</p>
                                                <p className="text-sm text-slate-700">{b.ai_analysis.analysis_summary}</p>
                                                <p className="text-xs text-indigo-600 mt-2 font-semibold">
                                                    💡 {b.ai_analysis.recommendation}
                                                </p>
                                                {b.ai_analysis.behaviors_detected?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {b.ai_analysis.behaviors_detected.map((behavior: string, i: number) => (
                                                            <span key={i} className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-600 font-medium">
                                                                {behavior}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Recent Alerts */}
                                        {student.alerts.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cảnh báo gần đây</p>
                                                {student.alerts.slice(0, 3).map((alert: any) => (
                                                    <div key={alert.id} className={`p-3 rounded-xl border text-sm ${
                                                        alert.severity === "high" ? "bg-red-50 border-red-200" :
                                                        alert.severity === "medium" ? "bg-amber-50 border-amber-200" :
                                                        "bg-slate-50 border-slate-200"
                                                    }`}>
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={`font-semibold ${
                                                                alert.severity === "high" ? "text-red-800" :
                                                                alert.severity === "medium" ? "text-amber-800" :
                                                                "text-slate-700"
                                                            }`}>{alert.description}</p>
                                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Update time */}
                                        <p className="text-[10px] text-slate-400 mt-3">
                                            Cập nhật: {formatDistanceToNow(new Date(b.updated_at), { addSuffix: true, locale: vi })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Students without data (collapsed) */}
                    {studentsWithoutData.length > 0 && (
                        <div className="px-6 py-3 bg-slate-50/50">
                            <p className="text-xs text-slate-400 font-medium">
                                {studentsWithoutData.length} học sinh chưa có dữ liệu hành vi
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-component: Metric card
function MetricCard({ icon: Icon, label, value, color, bg }: {
    icon: any; label: string; value: string; color: string; bg: string;
}) {
    return (
        <div className={`p-3 rounded-xl ${bg} border border-slate-100`}>
            <Icon className={`w-4 h-4 ${color} mb-1.5`} />
            <p className={`text-sm font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
        </div>
    );
}
