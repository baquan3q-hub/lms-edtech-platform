"use client";

import {
    ShieldAlert, ShieldCheck, AlertTriangle, TrendingUp,
    BarChart3, Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BehaviorAnalytics {
    summary: {
        total_alerts: number;
        unresolved_alerts: number;
        high_risk_alerts: number;
        total_scores_tracked: number;
    };
    risk_distribution: {
        high_risk: number;
        warning: number;
        normal: number;
    };
    top_risk_students: any[];
    alert_trend: { date: string; alerts: number }[];
}

export default function BehaviorAnalyticsWidget({ data }: { data: BehaviorAnalytics }) {
    const { summary, risk_distribution, top_risk_students, alert_trend } = data;
    const totalRisk = risk_distribution.high_risk + risk_distribution.warning + risk_distribution.normal;
    const maxAlertInTrend = Math.max(...alert_trend.map(a => a.alerts), 1);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5 text-red-600" />
                    </div>
                    Giám sát Hành vi Học sinh (AI)
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Tổng hợp phân tích hành vi toàn hệ thống, phát hiện "Gaming the System"
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-slate-100">
                <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-4 border border-red-100">
                    <p className="text-3xl font-black text-red-600">{summary.high_risk_alerts}</p>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mt-1">Nguy cơ cao</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-100">
                    <p className="text-3xl font-black text-amber-600">{summary.unresolved_alerts}</p>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mt-1">Chưa xử lý</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 border border-indigo-100">
                    <p className="text-3xl font-black text-indigo-600">{summary.total_alerts}</p>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">Tổng cảnh báo</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                    <p className="text-3xl font-black text-slate-700">{summary.total_scores_tracked}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">HS theo dõi</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                {/* Left: Risk Distribution + Alert Trend */}
                <div className="p-6 space-y-6">
                    {/* Risk Distribution Bar */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phân bổ mức độ rủi ro</p>
                        <p className="text-[10px] text-slate-400 mb-3">Tỷ lệ học sinh theo mức rủi ro gian lận (dựa trên AI phân tích hành vi trong bài kiểm tra)</p>
                        {totalRisk > 0 ? (
                            <>
                                <div className="flex rounded-full h-4 overflow-hidden bg-slate-100 mb-3">
                                    {risk_distribution.high_risk > 0 && (
                                        <div
                                            className="bg-red-500 transition-all duration-700"
                                            style={{ width: `${(risk_distribution.high_risk / totalRisk) * 100}%` }}
                                        />
                                    )}
                                    {risk_distribution.warning > 0 && (
                                        <div
                                            className="bg-amber-400 transition-all duration-700"
                                            style={{ width: `${(risk_distribution.warning / totalRisk) * 100}%` }}
                                        />
                                    )}
                                    {risk_distribution.normal > 0 && (
                                        <div
                                            className="bg-emerald-400 transition-all duration-700"
                                            style={{ width: `${(risk_distribution.normal / totalRisk) * 100}%` }}
                                        />
                                    )}
                                </div>
                                <div className="flex gap-4 text-xs font-semibold">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                        <span className="text-slate-600">Cao: {risk_distribution.high_risk}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                        <span className="text-slate-600">TB: {risk_distribution.warning}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                        <span className="text-slate-600">BT: {risk_distribution.normal}</span>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-slate-400">Chưa có dữ liệu phân bổ</p>
                        )}
                    </div>

                    {/* Alert Trend - Mini Bar Chart */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cảnh báo 7 ngày gần nhất</p>
                        {alert_trend.length > 0 ? (
                            <div className="flex items-end gap-2 h-24">
                                {alert_trend.map((day, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-[10px] font-bold text-slate-500">{day.alerts}</span>
                                        <div
                                            className={`w-full rounded-t-md transition-all duration-500 ${
                                                day.alerts > 0 ? "bg-gradient-to-t from-red-400 to-red-300" : "bg-slate-100"
                                            }`}
                                            style={{ height: `${Math.max((day.alerts / maxAlertInTrend) * 64, 4)}px` }}
                                        />
                                        <span className="text-[9px] text-slate-400 font-medium">{day.date}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Chưa có dữ liệu trend</p>
                        )}
                    </div>
                </div>

                {/* Right: Top Risk Students */}
                <div className="p-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Top học sinh Gaming Score cao nhất
                    </p>
                    <p className="text-[10px] text-slate-400 mb-3">
                        Gaming Score (0-100%) = Khả năng gian lận do AI đánh giá. ≥70% Nguy cơ cao, 30-69% Cần theo dõi, &lt;30% Bình thường.
                    </p>
                    {top_risk_students.length > 0 ? (
                        <div className="space-y-2">
                            {top_risk_students.map((student, idx) => {
                                const gamingPercent = Math.round(student.gaming_score * 100);
                                return (
                                    <div key={student.student_id + idx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                        <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}</span>
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={student.avatar_url} />
                                            <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-bold">
                                                {student.student_name?.charAt(0) || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{student.student_name}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{student.class_name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        gamingPercent >= 70 ? "bg-red-500" :
                                                        gamingPercent >= 30 ? "bg-amber-400" : "bg-emerald-400"
                                                    }`}
                                                    style={{ width: `${gamingPercent}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-bold w-8 text-right ${
                                                gamingPercent >= 70 ? "text-red-600" :
                                                gamingPercent >= 30 ? "text-amber-600" : "text-emerald-600"
                                            }`}>
                                                {gamingPercent}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <ShieldCheck className="w-10 h-10 text-emerald-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-400 font-medium">Tất cả học sinh đều bình thường</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
