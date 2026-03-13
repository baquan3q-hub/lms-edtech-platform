"use client";

import { useState, useTransition } from "react";
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
    Area,
    AreaChart,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
} from "recharts";
import { 
    TrendingUp, Users, BookOpen, Clock, Target, Award, Star, SearchX,
    MessageSquare, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Circle,
    Trophy, PlusCircle, MinusCircle, Sparkles, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
}

interface CompetencyAxis {
    key: string;
    label: string;
    value: number;
    icon: string;
}

interface CompetencyData {
    axes: CompetencyAxis[];
    strengths: CompetencyAxis[];
    weaknesses: CompetencyAxis[];
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
            return (
                <div className="bg-white border rounded-lg shadow-lg p-3">
                    <p className="text-slate-500 text-xs mb-1 font-medium">{payload[0].payload.exam}</p>
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

            {/* Student Selector Drawer / Header block */}
            {students.length > 1 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" /> Chọn Hồ sơ Học sinh
                        </p>
                    </div>
                    <div className="w-full sm:w-[300px]">
                        <Select value={activeStudentId} onValueChange={handleStudentChange}>
                            <SelectTrigger className="w-full bg-slate-50 h-12 rounded-xl border-slate-200 shadow-none font-medium text-slate-900 focus:ring-amber-500">
                                <SelectValue placeholder="Chọn học sinh..." />
                            </SelectTrigger>
                            <SelectContent>
                                {students.map((student) => (
                                    <SelectItem key={student.id} value={student.id} className="cursor-pointer">
                                        <div className="flex items-center gap-3 py-1">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                                                {student.avatar_url ? (
                                                    <img src={student.avatar_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <span className="text-indigo-700 font-bold text-xs">{student.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <span className="font-semibold text-slate-800">{student.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

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
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">+2.5% so với tháng trước</Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Điểm Trung Bình (Tất cả)</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            {(stats.reduce((acc, curr) => acc + curr.avg_score, 0) / (stats.length || 1)).toFixed(1)}
                        </h4>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-blue-100 bg-blue-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Tỉ lệ Chuyên Cần</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            {(stats.reduce((acc, curr) => acc + curr.attendance_rate, 0) / (stats.length || 1)).toFixed(1)}%
                        </h4>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <BookOpen className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Lớp Đang Tham Gia</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            {stats.length} <span className="text-lg font-medium text-slate-500">lớp</span>
                        </h4>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-purple-100 bg-purple-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                <Star className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Năng lực Tổng hợp</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            {competencyData?.overallScore ?? '—'}<span className="text-lg font-medium text-slate-500">/100</span>
                        </h4>
                    </CardContent>
                </Card>
            </div>

            {/* ===================== ĐIỂM TÍCH LŨY ===================== */}
            {pointsData && (
                <Card className="shadow-sm overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-600" /> Điểm Tích Lũy (Thái độ & Đạo đức)
                            </CardTitle>
                            <div className={`text-2xl font-black ${pointsData.totalPoints > 0 ? 'text-emerald-600' : pointsData.totalPoints < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                {pointsData.totalPoints > 0 ? `+${pointsData.totalPoints}` : pointsData.totalPoints} điểm
                            </div>
                        </div>
                        <CardDescription>Giáo viên đánh giá dựa trên chuyên cần, phát biểu, thái độ học tập</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5">
                        {pointsData.byClass.length > 0 ? (
                            <div className="space-y-5">
                                {/* Điểm theo lớp */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {pointsData.byClass.map((cls) => (
                                        <div key={cls.class_id} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                                            <p className="text-sm font-bold text-slate-800 truncate">{cls.class_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{cls.course_name}</p>
                                            <p className={`text-2xl font-black mt-2 ${cls.total_points > 0 ? 'text-emerald-600' : cls.total_points < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                {cls.total_points > 0 ? `+${cls.total_points}` : cls.total_points}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Lịch sử gần đây */}
                                {pointsData.recentHistory.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Lịch sử cộng/trừ điểm gần đây
                                        </h4>
                                        <div className="space-y-2 max-h-[260px] overflow-y-auto">
                                            {pointsData.recentHistory.slice(0, 10).map((item: any) => {
                                                const isPositive = item.points > 0;
                                                return (
                                                    <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                                            {isPositive ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-800 truncate">{item.reason}</p>
                                                            <span className="text-[11px] text-slate-400">
                                                                {item.class?.name || 'Lớp học'} • GV: {item.teacher?.full_name || 'Giáo viên'} • {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                                            </span>
                                                        </div>
                                                        <span className={`font-black text-base shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
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
                                <Star className="w-10 h-10 text-amber-200 mx-auto mb-2" />
                                <p className="text-sm text-amber-700 font-medium">Chưa có điểm tích lũy nào.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ===================== BIỂU ĐỒ NĂNG LỰC (RADAR CHART) ===================== */}
            {competencyData && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Radar Chart */}
                    <Card className="lg:col-span-3 shadow-sm overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-600" /> Biểu đồ Năng lực
                            </CardTitle>
                            <CardDescription>
                                Đánh giá toàn diện dựa trên Bloom&apos;s Taxonomy & Competency-Based Education
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 pb-2">
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={competencyData.axes.map(a => ({ subject: a.label, value: a.value, fullMark: 100 }))}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis
                                            dataKey="subject"
                                            tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }}
                                        />
                                        <PolarRadiusAxis
                                            angle={30}
                                            domain={[0, 100]}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        />
                                        <Radar
                                            name="Năng lực"
                                            dataKey="value"
                                            stroke="#6366f1"
                                            fill="#6366f1"
                                            fillOpacity={0.25}
                                            strokeWidth={2}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Axis detail grid */}
                            <div className="grid grid-cols-3 gap-3 mt-4 px-2">
                                {competencyData.axes.map(axis => {
                                    const label = getCompetencyLabel(axis.value);
                                    return (
                                        <div key={axis.key} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-lg">{axis.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-700 truncate">{axis.label}</p>
                                                <p className="text-lg font-black text-slate-900">{axis.value}</p>
                                            </div>
                                            <Badge className={`text-[9px] border-none shrink-0 ${label.color}`}>{label.text}</Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Strengths & Weaknesses Panel */}
                    <Card className="lg:col-span-2 shadow-sm flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-emerald-50 to-amber-50 border-b border-emerald-100">
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-emerald-600" /> Điểm mạnh & Điểm yếu
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 flex-1 flex flex-col gap-6">
                            {/* Strengths */}
                            <div>
                                <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mb-3">
                                    <CheckCircle2 className="w-4 h-4" /> Điểm mạnh nổi bật
                                </h4>
                                {competencyData.strengths.length > 0 ? (
                                    <div className="space-y-2">
                                        {competencyData.strengths.map(s => (
                                            <div key={s.key} className="flex items-center gap-3 p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                                                <span className="text-xl">{s.icon}</span>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-emerald-800">{s.label}</p>
                                                    <p className="text-xs text-emerald-600">Đạt {s.value}/100 điểm</p>
                                                </div>
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">
                                                    {s.value >= 80 ? '🌟 Xuất sắc' : '✅ Tốt'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Chưa đủ dữ liệu để đánh giá</p>
                                )}
                            </div>

                            {/* Weaknesses */}
                            <div>
                                <h4 className="text-sm font-bold text-amber-700 flex items-center gap-1.5 mb-3">
                                    <AlertTriangle className="w-4 h-4" /> Cần cải thiện
                                </h4>
                                {competencyData.weaknesses.length > 0 ? (
                                    <div className="space-y-2">
                                        {competencyData.weaknesses.map(w => (
                                            <div key={w.key} className="flex items-center gap-3 p-3 bg-amber-50/70 rounded-xl border border-amber-100">
                                                <span className="text-xl">{w.icon}</span>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-amber-800">{w.label}</p>
                                                    <p className="text-xs text-amber-600">Hiện tại: {w.value}/100 điểm</p>
                                                </div>
                                                <Badge className="bg-amber-100 text-amber-700 border-none text-xs">
                                                    {w.value < 40 ? '⚠️ Yếu' : '📈 TB'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-emerald-500 font-medium">🎉 Tuyệt vời! Không có kỹ năng nào cần cải thiện.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ===================== AI PHÂN TÍCH NĂNG LỰC ===================== */}
            {competencyData && (
                <Card className="shadow-sm overflow-hidden border-violet-200 bg-gradient-to-br from-violet-50/30 to-indigo-50/20">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-600" /> AI Phân tích Năng lực
                            </CardTitle>
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
                        <CardDescription>AI đánh giá toàn diện dựa trên dữ liệu năng lực, điểm tích lũy, và kết quả học tập</CardDescription>
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

            {/* ===================== NHẬN XÉT TỪ GIÁO VIÊN ===================== */}
            {feedbackList.length > 0 && (
                <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-purple-600" /> Nhận xét từ Giáo viên ({feedbackList.length})
                        </CardTitle>
                        <CardDescription>Nhận xét chi tiết về bài kiểm tra và đề xuất cải thiện</CardDescription>
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
                                        className="p-5 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => openFeedbackDetail(fb)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-slate-800 truncate">
                                                        📝 {examObj?.title || 'Bài kiểm tra'}
                                                    </h4>
                                                    {norm && (
                                                        <Badge className={`text-[10px] border-none shrink-0 ${
                                                            parseFloat(norm) >= 8 ? 'bg-emerald-50 text-emerald-700'
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
                                                    {fb.knowledge_gaps && fb.knowledge_gaps.length > 0 && (
                                                        <Badge className="bg-red-50 text-red-600 border-none text-[9px]">
                                                            ⚠️ {fb.knowledge_gaps.length} kiến thức cần cải thiện
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
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

            {/* ===================== ĐIỂM CHUYÊN CẦN ===================== */}
            {stats.length > 0 && (
                <Card className="shadow-sm overflow-hidden border-cyan-200 bg-gradient-to-br from-cyan-50/30 to-sky-50/20">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 border-b border-cyan-100">
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-cyan-600" /> Điểm Chuyên Cần theo Lớp
                        </CardTitle>
                        <CardDescription>Thống kê chi tiết tình trạng đi học của con tại từng lớp</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="space-y-4">
                            {stats.map((stat: any) => {
                                const cls = Array.isArray(stat.classes) ? stat.classes[0] : stat.classes;
                                const className = cls?.name || "Lớp học";
                                const courseObj = Array.isArray(cls?.courses) ? cls?.courses[0] : cls?.courses;
                                const courseName = courseObj?.name || "Khóa học";
                                const rate = stat.attendance_rate ?? 0;
                                const rateColor = rate >= 90 ? 'text-emerald-600' : rate >= 75 ? 'text-amber-600' : 'text-red-500';
                                const barColor = rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500';

                                return (
                                    <div key={stat.class_id} className="bg-white rounded-xl p-4 border border-cyan-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{className}</p>
                                                <p className="text-xs text-slate-500">{courseName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-2xl font-black ${rateColor}`}>{rate}%</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Tỉ lệ chuyên cần</p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                                            <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${rate}%` }} />
                                        </div>

                                        {/* Detail stats */}
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div className="bg-emerald-50 rounded-lg p-2">
                                                <p className="text-lg font-black text-emerald-600">{stat.present_count}</p>
                                                <p className="text-[10px] text-emerald-700 font-medium">Có mặt</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-2">
                                                <p className="text-lg font-black text-amber-600">{stat.late_count}</p>
                                                <p className="text-[10px] text-amber-700 font-medium">Đi muộn</p>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-2">
                                                <p className="text-lg font-black text-blue-600">{stat.excused_count}</p>
                                                <p className="text-[10px] text-blue-700 font-medium">Có phép</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-2">
                                                <p className="text-lg font-black text-red-500">{stat.absent_count}</p>
                                                <p className="text-[10px] text-red-700 font-medium">Vắng</p>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-slate-400 mt-2 text-center font-medium">
                                            Tổng: {stat.total_sessions} buổi điểm danh
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Biểu đồ tiến độ (Line Chart) */}
                <Card className="lg:col-span-2 shadow-sm relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Tiến độ Học tập (Biểu đồ Điểm số)</CardTitle>
                        <CardDescription>Xu hướng điểm số qua các bài kiểm tra gần đây</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 pb-0 pl-0 pr-4">
                        <div className="h-[300px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        domain={[0, 10]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Danh sách lớp học và chi tiết */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Thống kê theo Lớp học</h3>

                    {stats.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">Chưa có dữ liệu lớp học.</div>
                    ) : (
                        stats.map(stat => {
                            const classInfo = Array.isArray(stat.classes) ? stat.classes[0] : stat.classes;
                            return (
                                <Card key={stat.class_id} className="shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-slate-800 truncate pr-4">{classInfo?.name || "Lớp học ẩn"}</h4>
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 shrink-0">
                                                ĐTB: {stat.avg_score.toFixed(1)}
                                            </Badge>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1.5">
                                                    <span className="text-slate-500 font-medium">Chuyên cần</span>
                                                    <span className="font-semibold text-slate-700">{stat.attendance_rate}%</span>
                                                </div>
                                                <Progress
                                                    value={stat.attendance_rate}
                                                    className="h-2"
                                                    indicatorColor={getProgressColor(stat.attendance_rate)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-50">
                                                <div>
                                                    <span className="block font-bold text-emerald-600">{stat.present_count}</span>
                                                    <span className="text-slate-500">Có mặt</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-red-600">{stat.absent_count}</span>
                                                    <span className="text-slate-500">Vắng</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-amber-600">{stat.late_count}</span>
                                                    <span className="text-slate-500">Trễ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Bảng lịch sử Test/Exam chi tiết */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Lịch sử Bài kiểm tra gần đây</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">BÀI KIỂM TRA</th>
                                    <th className="px-6 py-3 font-medium">NGÀY THI</th>
                                    <th className="px-6 py-3 font-medium text-center">ĐIỂM SỐ</th>
                                    <th className="px-6 py-3 font-medium text-right">ĐÁNH GIÁ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <Target className="w-4 h-4" />
                                            </div>
                                            {item.exam}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {item.date}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-base ${getScoreColor(item.score)}`}>
                                                {item.score.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.score >= 8 ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none">Khá/Giỏi</Badge>
                                            ) : item.score >= 6.5 ? (
                                                <Badge className="bg-amber-50 text-amber-600 border-none shadow-none">Trung bình</Badge>
                                            ) : (
                                                <Badge className="bg-red-50 text-red-600 border-none shadow-none">Cần cố gắng</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

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
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Gửi ngày: {selectedFeedback.sent_at ? new Date(selectedFeedback.sent_at).toLocaleDateString("vi-VN") : '—'}
                                        </p>
                                    </div>
                                    {norm && (
                                        <div className={`text-center px-4 py-2 rounded-xl ${
                                            parseFloat(norm) >= 8 ? 'bg-emerald-50 text-emerald-700'
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

                                        {selectedFeedback.knowledge_gaps && selectedFeedback.knowledge_gaps.length > 0 && (
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
