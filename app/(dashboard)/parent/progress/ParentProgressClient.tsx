"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateParentAIInsight } from "@/lib/actions/parent-progress";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    TrendingUp, BookOpen, Clock, Target, Star, SearchX,
    MessageSquare, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Circle,
    Trophy, PlusCircle, MinusCircle, Sparkles, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ClassStats {
    class_id: string;
    total_sessions: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
    attendance_rate: number;
    avg_score: number;
    classes: {
        name: string;
        course_id: string;
        courses: { name: string } | { name: string }[];
    } | {
        name: string;
        course_id: string;
        courses: { name: string } | { name: string }[];
    }[];
}

interface ScoreHistory {
    date: string;
    score: number;
    exam: string;
    type?: string;
}

interface SkillItem {
    key: string;
    label: string;
    value: number;
    icon: string;
}

interface CompetencyData {
    skills: SkillItem[];
    strengths: SkillItem[];
    weaknesses: SkillItem[];
    overallScore: number;
}

interface PointsData {
    byClass: { class_id: string; class_name: string; course_name: string; total_points: number }[];
    recentHistory: any[];
    totalPoints: number;
}

interface ParentProgressClientProps {
    students: { id: string; name: string; avatar_url?: string }[];
    activeStudentId: string;
    activeStudentName: string;
    stats: ClassStats[];
    history: ScoreHistory[];
    feedbackList: any[];
    competencyData: CompetencyData | null;
    pointsData: PointsData | null;
}

export default function ParentProgressClient({ students, activeStudentId, activeStudentName, stats, history, feedbackList, competencyData, pointsData }: ParentProgressClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [showAllFeedback, setShowAllFeedback] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [academicView, setAcademicView] = useState<'chart' | 'table'>('chart');

    const handleStudentChange = (newStudentId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("studentId", newStudentId);
        router.push(`/parent/progress?${params.toString()}`);
    };
    const getProgressColor = (rate: number) => {
        if (rate >= 80) return "bg-emerald-500";
        if (rate >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    const getScoreColor = (score: number) => {
        if (score >= 8.5) return "text-emerald-600 font-bold";
        if (score >= 6.5) return "text-amber-600 font-bold";
        return "text-red-600 font-bold";
    };

    const getCompetencyLabel = (value: number) => {
        if (value >= 80) return { text: "Xuất sắc", color: "text-emerald-600 bg-emerald-50" };
        if (value >= 60) return { text: "Tốt", color: "text-blue-600 bg-blue-50" };
        if (value >= 40) return { text: "Trung bình", color: "text-amber-600 bg-amber-50" };
        return { text: "Cần cải thiện", color: "text-red-600 bg-red-50" };
    };

    const openFeedbackDetail = (fb: any) => {
        setSelectedFeedback(fb);
        setFeedbackModalOpen(true);
    };

    const displayedFeedback = showAllFeedback ? feedbackList : feedbackList.slice(0, 3);

    // Tooltip custom cho Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const isHomework = payload[0].payload.type === 'homework';
            return (
                <div className="bg-white border rounded-lg shadow-lg p-3">
                    <p className="text-slate-500 text-xs mb-1 font-medium">
                        {isHomework ? '📝 Bài tập' : '📋 Bài kiểm tra'}
                    </p>
                    <p className="text-slate-800 font-semibold text-sm">{payload[0].payload.exam}</p>
                    <p className="text-slate-800 font-bold">Ngày: {label}</p>
                    <p className="text-indigo-600 font-bold text-lg">
                        Điểm: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">

            {/* ===== HERO SECTION (Light Gradient Theme) ===== */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-sky-50/80 to-blue-100/60 border border-sky-200/50 shadow-lg p-6 lg:p-8">
                {/* Decorative background blobs */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-sky-300/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-300/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-cyan-200/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                {/* Header Row: Title + Student Selector */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight">Tổng quan Học tập</h2>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">Kết quả của <span className="text-sky-700 font-bold">{activeStudentName}</span></p>
                        </div>
                    </div>
                    {students.length > 1 && (
                        <div className="w-full sm:w-[280px]">
                            <Select value={activeStudentId} onValueChange={handleStudentChange}>
                                <SelectTrigger className="w-full bg-white/80 backdrop-blur-sm h-11 rounded-xl border-sky-200 shadow-sm font-medium text-slate-800 focus:ring-sky-400 hover:border-sky-300 transition-colors">
                                    <SelectValue placeholder="Chọn học sinh..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((student) => (
                                        <SelectItem key={student.id} value={student.id} className="cursor-pointer">
                                            <div className="flex items-center gap-3 py-1">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center shrink-0">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <span className="text-sky-700 font-bold text-xs">{student.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-slate-700">{student.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* 4 KPI Metric Cards */}
                {(stats.length > 0 || history.length > 0) && (
                    <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                        {/* Điểm Trung Bình */}
                        <div className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-4 lg:p-5 hover:shadow-md hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 cursor-default">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <TrendingUp className="w-[18px] h-[18px] text-emerald-600" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm TB</span>
                            </div>
                            <p className="text-3xl lg:text-4xl font-black text-slate-800 leading-none">
                                {(stats.reduce((acc, curr) => acc + curr.avg_score, 0) / (stats.length || 1)).toFixed(1)}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1.5">trên thang 10</p>
                        </div>

                        {/* Tỉ lệ Chuyên Cần */}
                        <div className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-4 lg:p-5 hover:shadow-md hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 cursor-default">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <Clock className="w-[18px] h-[18px] text-blue-600" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chuyên cần</span>
                            </div>
                            <p className="text-3xl lg:text-4xl font-black text-slate-800 leading-none">
                                {(stats.reduce((acc, curr) => acc + curr.attendance_rate, 0) / (stats.length || 1)).toFixed(0)}<span className="text-lg font-bold text-slate-400">%</span>
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1.5">tỉ lệ có mặt</p>
                        </div>

                        {/* Lớp Đang Tham Gia */}
                        <div className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-4 lg:p-5 hover:shadow-md hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 cursor-default">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <BookOpen className="w-[18px] h-[18px] text-indigo-600" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp học</span>
                            </div>
                            <p className="text-3xl lg:text-4xl font-black text-slate-800 leading-none">
                                {stats.length} <span className="text-lg font-bold text-slate-400">lớp</span>
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1.5">đang tham gia</p>
                        </div>

                        {/* Năng lực Tổng hợp */}
                        <div className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-4 lg:p-5 hover:shadow-md hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 cursor-default">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <Star className="w-[18px] h-[18px] text-violet-600" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Năng lực</span>
                            </div>
                            <p className="text-3xl lg:text-4xl font-black text-slate-800 leading-none">
                                {competencyData?.overallScore ?? '—'}<span className="text-lg font-bold text-slate-400">/100</span>
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1.5">chỉ số tổng hợp</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Empty State when no stats */}
            {stats.length === 0 && history.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center mt-6">
                    <SearchX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">Chưa có dữ liệu học tập</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                        Học sinh {activeStudentName} hiện chưa tham gia lớp học nào hoặc chưa có điểm số và điểm chuyên cần được ghi nhận.
                    </p>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* ===================== QUÁ TRÌNH HỌC TẬP (CHART + TABLE TABS) ===================== */}
                    {history.length > 0 && (
                        <Card className="p-0 gap-0 shadow-sm overflow-hidden border-sky-200/60">
                            <CardHeader className="bg-gradient-to-r from-sky-50 via-indigo-50/50 to-blue-50 border-b border-sky-100 py-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-indigo-600" /> Quá trình Học tập
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            Điểm số qua các bài kiểm tra và bài tập theo thời gian
                                        </CardDescription>
                                    </div>
                                    {/* Tab Toggle */}
                                    <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-sky-200/60 shadow-sm">
                                        <button
                                            onClick={() => setAcademicView('chart')}
                                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${academicView === 'chart'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            <TrendingUp className="w-3.5 h-3.5" /> Biểu đồ
                                        </button>
                                        <button
                                            onClick={() => setAcademicView('table')}
                                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${academicView === 'table'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            <Target className="w-3.5 h-3.5" /> Chi tiết
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {academicView === 'chart' ? (
                                    <div className="pt-6 pb-2 px-4">
                                        <div className="h-[320px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="score"
                                                        stroke="#6366f1"
                                                        strokeWidth={2.5}
                                                        dot={({ cx, cy, payload }: any) => (
                                                            <circle
                                                                key={`${payload.date}-${payload.exam}`}
                                                                cx={cx} cy={cy} r={5}
                                                                fill={payload.type === 'homework' ? '#10b981' : '#6366f1'}
                                                                stroke="#fff" strokeWidth={2}
                                                            />
                                                        )}
                                                        activeDot={{ r: 7, strokeWidth: 2 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex items-center justify-center gap-6 mt-3 pb-2">
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <span className="w-3 h-3 rounded-full bg-indigo-500"></span> Bài kiểm tra
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Bài tập
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80">
                                                <tr>
                                                    <th className="px-5 py-3 font-medium">BÀI KIỂM TRA</th>
                                                    <th className="px-5 py-3 font-medium">NGÀY</th>
                                                    <th className="px-5 py-3 font-medium text-center">ĐIỂM</th>
                                                    <th className="px-5 py-3 font-medium text-right">ĐÁNH GIÁ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {history.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-sky-50/40 transition-colors">
                                                        <td className="px-5 py-3.5 font-medium text-slate-800">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'homework' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                                                <span className="truncate max-w-[200px]">{item.exam}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">{item.date}</td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            <span className={`text-sm font-black ${getScoreColor(item.score)}`}>
                                                                {item.score.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            {item.score >= 8 ? (
                                                                <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none text-[10px]">Giỏi</Badge>
                                                            ) : item.score >= 6.5 ? (
                                                                <Badge className="bg-amber-50 text-amber-600 border-none shadow-none text-[10px]">TB Khá</Badge>
                                                            ) : (
                                                                <Badge className="bg-red-50 text-red-600 border-none shadow-none text-[10px]">Cần CG</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ===================== Ý THỨC HỌC TẬP: TÍCH LŨY + CHUYÊN CẦN (2 CỘT) ===================== */}

                    {(pointsData || stats.length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* CỘT 1: Điểm Tích Lũy */}
                            {pointsData && (
                                <Card className="p-0 gap-0 shadow-sm overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50/30 to-orange-50/20">
                                    <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50/80 border-b border-amber-100 py-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <Trophy className="w-5 h-5 text-amber-600" /> Điểm Tích Lũy
                                            </CardTitle>
                                            <div className={`text-xl font-black ${pointsData.totalPoints > 0 ? 'text-emerald-600' : pointsData.totalPoints < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                                {pointsData.totalPoints > 0 ? `+${pointsData.totalPoints}` : pointsData.totalPoints}
                                            </div>
                                        </div>
                                        <CardDescription className="text-xs">Thái độ, phát biểu, tương tác trên lớp</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        {pointsData.byClass.length > 0 ? (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    {pointsData.byClass.map((cls) => (
                                                        <div key={cls.class_id} className="bg-white rounded-xl p-3 border border-amber-100/80 shadow-sm flex items-center justify-between">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-800 truncate">{cls.class_name}</p>
                                                                <p className="text-[11px] text-slate-400 truncate">{cls.course_name}</p>
                                                            </div>
                                                            <span className={`text-xl font-black shrink-0 ml-3 ${cls.total_points > 0 ? 'text-emerald-600' : cls.total_points < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                {cls.total_points > 0 ? `+${cls.total_points}` : cls.total_points}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {pointsData.recentHistory.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5" /> Lịch sử gần đây
                                                        </h4>
                                                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                                            {pointsData.recentHistory.slice(0, 6).map((item: any) => {
                                                                const isPositive = item.points > 0;
                                                                return (
                                                                    <div key={item.id} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-slate-100">
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                                                            {isPositive ? <PlusCircle className="w-3.5 h-3.5" /> : <MinusCircle className="w-3.5 h-3.5" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-semibold text-slate-700 truncate">{item.reason}</p>
                                                                            <span suppressHydrationWarning className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                                                                        </div>
                                                                        <span className={`font-black text-sm shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                            {isPositive ? `+${item.points}` : item.points}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <Star className="w-8 h-8 text-amber-200 mx-auto mb-2" />
                                                <p className="text-xs text-amber-600 font-medium">Chưa có điểm tích lũy nào.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* CỘT 2: Chuyên Cần */}
                            {stats.length > 0 && (
                                <Card className="p-0 gap-0 shadow-sm overflow-hidden border-cyan-200/60 bg-gradient-to-br from-cyan-50/20 to-sky-50/10">
                                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50/80 border-b border-cyan-100 py-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <CardTitle className="flex items-center gap-2 text-base">
                                                    <Clock className="w-5 h-5 text-cyan-600" /> Chuyên Cần theo Lớp
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-1">Tình trạng đi học tại từng lớp</CardDescription>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-[11px] font-semibold text-cyan-700 border-cyan-200 bg-white hover:bg-cyan-50 hover:text-cyan-800 transition-colors shadow-sm"
                                                onClick={() => {
                                                    const params = new URLSearchParams(searchParams.toString());
                                                    params.set("studentId", activeStudentId);
                                                    router.push(`/parent/schedule?${params.toString()}`);
                                                }}
                                            >
                                                Xin nghỉ phép
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            {stats.map((stat: any) => {
                                                const cls = Array.isArray(stat.classes) ? stat.classes[0] : stat.classes;
                                                const className = cls?.name || "Lớp học";
                                                const rate = stat.attendance_rate ?? 0;
                                                const rateColor = rate >= 90 ? 'text-emerald-600' : rate >= 75 ? 'text-amber-600' : 'text-red-500';
                                                const barColor = rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500';

                                                return (
                                                    <div key={stat.class_id} className="bg-white rounded-xl p-3.5 border border-cyan-100/80 shadow-sm">
                                                        <div className="flex items-center justify-between mb-2.5">
                                                            <p className="text-sm font-bold text-slate-800 truncate">{className}</p>
                                                            <p className={`text-lg font-black ${rateColor}`}>{rate}%</p>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                                                            <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${rate}%` }} />
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1.5 text-center">
                                                            <div className="bg-emerald-50 rounded-lg py-1.5 px-1">
                                                                <p className="text-base font-black text-emerald-600">{stat.present_count}</p>
                                                                <p className="text-[9px] text-emerald-700 font-medium">Có mặt</p>
                                                            </div>
                                                            <div className="bg-amber-50 rounded-lg py-1.5 px-1">
                                                                <p className="text-base font-black text-amber-600">{stat.late_count}</p>
                                                                <p className="text-[9px] text-amber-700 font-medium">Muộn</p>
                                                            </div>
                                                            <div className="bg-blue-50 rounded-lg py-1.5 px-1">
                                                                <p className="text-base font-black text-blue-600">{stat.excused_count}</p>
                                                                <p className="text-[9px] text-blue-700 font-medium">Phép</p>
                                                            </div>
                                                            <div className="bg-red-50 rounded-lg py-1.5 px-1">
                                                                <p className="text-base font-black text-red-500">{stat.absent_count}</p>
                                                                <p className="text-[9px] text-red-700 font-medium">Vắng</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">Tổng: {stat.total_sessions} buổi</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ===================== NHẬN XÉT TỪ GIÁO VIÊN ===================== */}
                    {feedbackList.length > 0 && (
                        <Card className="p-0 gap-0 shadow-sm overflow-hidden border-purple-100/60">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50/80 border-b border-purple-100 py-4">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MessageSquare className="w-5 h-5 text-purple-600" /> Nhận xét từ Giáo viên ({feedbackList.length})
                                </CardTitle>
                                <CardDescription className="text-xs">Nhận xét bài kiểm tra và đề xuất cải thiện</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {displayedFeedback.map((fb: any) => {
                                        const examObj = Array.isArray(fb.exam) ? fb.exam[0] : fb.exam;
                                        const subObj = Array.isArray(fb.submission) ? fb.submission[0] : fb.submission;
                                        const score = subObj?.score;
                                        const totalP = examObj?.total_points || 10;
                                        const norm = score != null ? ((score / totalP) * 10).toFixed(1) : null;
                                        const displayFeedback = fb.teacher_edited_feedback || fb.ai_feedback || "";
                                        const tasks = fb.teacher_edited_tasks || fb.improvement_tasks || [];
                                        const progress = fb.improvement_progress || [];
                                        const completedTasks = progress.filter((p: any) => p.status === 'completed').length;

                                        return (
                                            <div
                                                key={fb.id}
                                                className="p-4 hover:bg-purple-50/30 transition-colors cursor-pointer"
                                                onClick={() => openFeedbackDetail(fb)}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="text-sm font-bold text-slate-800 truncate">
                                                                📝 {examObj?.title || 'Bài kiểm tra'}
                                                            </h4>
                                                            {norm && (
                                                                <Badge className={`text-[10px] border-none shrink-0 ${parseFloat(norm) >= 8 ? 'bg-emerald-50 text-emerald-700'
                                                                    : parseFloat(norm) >= 6 ? 'bg-amber-50 text-amber-700'
                                                                        : 'bg-red-50 text-red-700'
                                                                    }`}>
                                                                    Điểm: {norm}/10
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{displayFeedback}</p>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            {tasks.length > 0 && (
                                                                <Badge className="bg-indigo-50 text-indigo-600 border-none text-[9px]">
                                                                    📚 {completedTasks}/{tasks.length} bài tập hoàn thành
                                                                </Badge>
                                                            )}
                                                            {fb.knowledge_gaps && fb.knowledge_gaps.length > 0 && (tasks.length === 0 || completedTasks < tasks.length) && (
                                                                <Badge className="bg-red-50 text-red-600 border-none text-[9px]">
                                                                    ⚠️ {fb.knowledge_gaps.length} kiến thức cần cải thiện
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div suppressHydrationWarning className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                        {fb.sent_at && new Date(fb.sent_at).toLocaleDateString("vi-VN")}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {feedbackList.length > 3 && (
                                    <div className="p-3 border-t border-slate-100 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAllFeedback(!showAllFeedback)}
                                            className="text-purple-600 hover:text-purple-700"
                                        >
                                            {showAllFeedback ? (
                                                <><ChevronUp className="w-4 h-4 mr-1" /> Thu gọn</>
                                            ) : (
                                                <><ChevronDown className="w-4 h-4 mr-1" /> Xem thêm {feedbackList.length - 3} nhận xét</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ===================== AI TỔNG KẾT HỌC TẬP (CUỐI TRANG — SUMMARY) ===================== */}
                    {competencyData && (
                        <Card className="shadow-sm overflow-hidden border-violet-200/60 bg-gradient-to-br from-violet-50/30 to-indigo-50/20">
                            <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50/80 border-b border-violet-100 py-7">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Sparkles className="w-5 h-5 text-violet-600" /> 🤖 AI Tổng kết Học tập
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">Phân tích toàn diện dựa trên năng lực, điểm tích lũy và kết quả</CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 h-9 rounded-lg"
                                        disabled={loadingInsight}
                                        onClick={async () => {
                                            setLoadingInsight(true);
                                            try {
                                                const statsForAI = stats.map((s: any) => {
                                                    const cls = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                                                    return {
                                                        class_name: cls?.name || "Lớp học",
                                                        avg_score: s.avg_score,
                                                        attendance_rate: s.attendance_rate,
                                                    };
                                                });
                                                const result = await generateParentAIInsight(
                                                    activeStudentName,
                                                    competencyData,
                                                    pointsData,
                                                    statsForAI
                                                );
                                                if (result.data) {
                                                    setAiInsight(result.data);
                                                } else {
                                                    setAiInsight("Không thể tạo phân tích lúc này. Vui lòng thử lại sau.");
                                                }
                                            } catch (e) {
                                                setAiInsight("Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.");
                                            } finally {
                                                setLoadingInsight(false);
                                            }
                                        }}
                                    >
                                        {loadingInsight ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang phân tích...</>
                                        ) : (
                                            <><Sparkles className="w-4 h-4 mr-2" /> {aiInsight ? 'Phân tích lại' : 'Tạo phân tích AI'}</>
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5">
                                {aiInsight ? (
                                    <div className="prose prose-sm max-w-none">
                                        <div className="bg-white rounded-xl p-5 border border-violet-100 text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                                            {aiInsight}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Sparkles className="w-12 h-12 text-violet-200 mx-auto mb-3" />
                                        <p className="text-sm text-violet-700 font-medium">Nhấn &quot;Tạo phân tích AI&quot; để nhận đánh giá tổng hợp</p>
                                        <p className="text-xs text-violet-500 mt-1">AI sẽ phân tích điểm mạnh, điểm yếu và đưa ra giải pháp cụ thể cho phụ huynh</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}




                    {/* ===================== FEEDBACK DETAIL DIALOG ===================== */}
                    <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
                        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 bg-slate-50">
                            <DialogHeader className="p-5 bg-white border-b border-slate-100 shrink-0">
                                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                                    <BookOpen className="w-5 h-5 text-indigo-500" />
                                    Chi tiết Nhận xét & Đề xuất
                                </DialogTitle>
                            </DialogHeader>

                            {selectedFeedback && (() => {
                                const examObj = Array.isArray(selectedFeedback.exam) ? selectedFeedback.exam[0] : selectedFeedback.exam;
                                const subObj = Array.isArray(selectedFeedback.submission) ? selectedFeedback.submission[0] : selectedFeedback.submission;
                                const score = subObj?.score;
                                const totalP = examObj?.total_points || 10;
                                const norm = score != null ? ((score / totalP) * 10).toFixed(1) : null;
                                const displayFb = selectedFeedback.teacher_edited_feedback || selectedFeedback.ai_feedback || "";
                                const tasks = selectedFeedback.teacher_edited_tasks || selectedFeedback.improvement_tasks || [];
                                const progress = selectedFeedback.improvement_progress || [];

                                return (
                                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                        {/* Exam Info */}
                                        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">📝 {examObj?.title || 'Bài kiểm tra'}</h3>
                                                <p suppressHydrationWarning className="text-xs text-slate-500 mt-0.5">
                                                    Gửi ngày: {selectedFeedback.sent_at ? new Date(selectedFeedback.sent_at).toLocaleDateString("vi-VN") : '—'}
                                                </p>
                                            </div>
                                            {norm && (
                                                <div className={`text-center px-4 py-2 rounded-xl ${parseFloat(norm) >= 8 ? 'bg-emerald-50 text-emerald-700'
                                                    : parseFloat(norm) >= 6 ? 'bg-amber-50 text-amber-700'
                                                        : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    <p className="text-2xl font-black">{norm}</p>
                                                    <p className="text-[10px] font-medium">/ 10 điểm</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Teacher Feedback */}
                                        <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
                                            <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-100">
                                                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                                    <MessageSquare className="w-4 h-4 text-indigo-500" /> Nhận xét từ Giáo viên
                                                </h3>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{displayFb}</p>

                                                {selectedFeedback.knowledge_gaps && selectedFeedback.knowledge_gaps.length > 0 && (tasks.length === 0 || (progress.filter((p: any) => p.status === 'completed').length) < tasks.length) && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                        <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                                                            <AlertTriangle className="w-3.5 h-3.5" /> Kiến thức cần cải thiện
                                                        </h4>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {selectedFeedback.knowledge_gaps.map((gap: string, i: number) => (
                                                                <Badge key={i} className="bg-red-50 text-red-700 border-none text-[10px]">🔴 {gap}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Improvement Tasks */}
                                        {tasks.length > 0 && (
                                            <div>
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                                    <BookOpen className="w-5 h-5 text-indigo-500" /> Bài tập cải thiện ({tasks.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {tasks.map((task: any, idx: number) => {
                                                        const prog = progress.find((p: any) => p.task_index === idx);
                                                        const isCompleted = prog?.status === 'completed';

                                                        return (
                                                            <div key={idx} className={`p-3 rounded-xl border ${isCompleted ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    {isCompleted ? (
                                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                                                    ) : (
                                                                        <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                                                                    )}
                                                                    <div className="flex-1">
                                                                        <h4 className={`font-bold text-sm ${isCompleted ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                                            Bài {idx + 1}: {task.title}
                                                                        </h4>
                                                                        {isCompleted && prog?.quiz_score != null && (
                                                                            <p className="text-xs text-emerald-600 mt-0.5">
                                                                                ✅ Quiz: {prog.quiz_score}/{prog.quiz_total}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </DialogContent>
                    </Dialog>

                </div>
            )}
        </div>
    );
}
