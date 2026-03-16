"use client";

import { useState } from "react";
import {
    LineChart,
    Line,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import {
    TrendingUp, Users, BookOpen, Clock, Target, Award, Star,
    MessageSquare, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Circle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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

interface ParentProgressClientProps {
    studentId: string;
    studentName: string;
    stats: ClassStats[];
    history: ScoreHistory[];
    feedbackList: any[];
    competencyData: CompetencyData | null;
}

export default function ParentProgressClient({ studentName, stats, history, feedbackList, competencyData }: ParentProgressClientProps) {
    const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [showAllFeedback, setShowAllFeedback] = useState(false);

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

    const openFeedbackDetail = (fb: any) => {
        setSelectedFeedback(fb);
        setFeedbackModalOpen(true);
    };

    const displayedFeedback = showAllFeedback ? feedbackList : feedbackList.slice(0, 3);

    return (
        <div className="space-y-6">

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Điểm Trung Bình</p>
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

            {/* ===================== NĂNG LỰC THEO MÔN + ĐIỂM MẠNH/YẾU ===================== */}
            {competencyData && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Skill Mastery Bar Chart */}
                    {competencyData.skills.length > 0 && (
                        <Card className="lg:col-span-3 shadow-sm overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-indigo-600" /> Mức độ Thành thạo theo Môn
                                </CardTitle>
                                <CardDescription>
                                    Điểm trung bình (%) của từng lớp/môn học dựa trên các bài kiểm tra
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 pb-2">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={competencyData.skills} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                                            <YAxis dataKey="label" type="category" width={120} tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} />
                                            <Tooltip
                                                formatter={(value: any) => [`${value}%`, 'Thành thạo']}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                                                {competencyData.skills.map((skill) => (
                                                    <Cell key={skill.key} fill={skill.value >= 80 ? '#10b981' : skill.value >= 60 ? '#6366f1' : skill.value >= 40 ? '#f59e0b' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Strengths & Weaknesses Panel */}
                    <Card className={`${competencyData.skills.length > 0 ? 'lg:col-span-2' : 'lg:col-span-5'} shadow-sm flex flex-col`}>
                        <CardHeader className="bg-gradient-to-r from-emerald-50 to-amber-50 border-b border-emerald-100">
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-emerald-600" /> Điểm mạnh &amp; Lỗ hổng Kiến thức
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 flex-1 flex flex-col gap-6">
                            {/* Strengths */}
                            <div>
                                <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mb-3">
                                    <CheckCircle2 className="w-4 h-4" /> Bài làm tốt
                                </h4>
                                {competencyData.strengths.length > 0 ? (
                                    <div className="space-y-2">
                                        {competencyData.strengths.map(s => (
                                            <div key={s.key} className="flex items-center gap-3 p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                                                <span className="text-xl">{s.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-emerald-800 truncate">{s.label}</p>
                                                    <p className="text-xs text-emerald-600">Đạt điểm giỏi {s.value} lần</p>
                                                </div>
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs shrink-0">🌟 Giỏi</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Chưa có bài đạt điểm giỏi (≥8.0)</p>
                                )}
                            </div>

                            {/* Weaknesses */}
                            <div>
                                <h4 className="text-sm font-bold text-amber-700 flex items-center gap-1.5 mb-3">
                                    <AlertTriangle className="w-4 h-4" /> Lỗ hổng kiến thức
                                </h4>
                                {competencyData.weaknesses.length > 0 ? (
                                    <div className="space-y-2">
                                        {competencyData.weaknesses.map(w => (
                                            <div key={w.key} className="flex items-center gap-3 p-3 bg-amber-50/70 rounded-xl border border-amber-100">
                                                <span className="text-xl">{w.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-amber-800 truncate">{w.label}</p>
                                                    <p className="text-xs text-amber-600">Xuất hiện trong {w.value} bài phân tích</p>
                                                </div>
                                                <Badge className="bg-amber-100 text-amber-700 border-none text-xs shrink-0">⚠️ Cần ôn</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-emerald-500 font-medium">🎉 Tuyệt vời! Chưa phát hiện lỗ hổng kiến thức nào.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
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

            {/* ===================== BIỂU ĐỒ TIẾN ĐỒ ĐIỂM SỐ ===================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Tiến độ Học tập (Biểu đồ Điểm số)</CardTitle>
                        <CardDescription>Xu hướng điểm số qua các bài kiểm tra gần đây</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 pb-0 pl-0 pr-4">
                        <div className="h-[300px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={({ cx, cy, payload }: any) => (
                                            <circle
                                                key={`${payload.date}-${payload.exam}`}
                                                cx={cx} cy={cy} r={5}
                                                fill={payload.type === 'homework' ? '#10b981' : '#6366f1'}
                                                stroke="#fff" strokeWidth={2}
                                            />
                                        )}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Danh sách lớp học */}
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

            {/* Bảng lịch sử Test/Exam */}
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
                                        <td className="px-6 py-4 text-slate-600">{item.date}</td>
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
    );
}
