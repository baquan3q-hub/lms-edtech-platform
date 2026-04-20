"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Users, Target, BookOpen, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { sendReminderAction } from "@/lib/actions/class-students";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
    classId: string;
    className: string;
    reportData: any;
}

export default function ClassOverviewAnalyticsClient({ classId, className, reportData }: Props) {
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [missingDialog, setMissingDialog] = useState(false);
    const [completedDialog, setCompletedDialog] = useState(false);

    if (!reportData) return null;

    const { summary, students, examList } = reportData;

    // --- AI WARNING LOGIC ---
    // Ngưỡng: ĐTB < 5, Chuyên cần < 60%, Thiếu bài tập > 50%
    const atRiskStudents = students.filter((s: any) => {
        const hwRatio = s.homework.total > 0 ? (s.homework.completed / s.homework.total) : 1;
        return s.avgScore10 < 5 || s.attendance.rate < 60 || hwRatio < 0.5;
    });

    const handleSendWarning = async (studentId: string, studentName: string) => {
        setSendingReminder(studentId);
        try {
            // Reusing sendReminderAction with generic message logic for AI Warning
            await sendReminderAction(studentId, classId, className, "Kết quả học tập cần cải thiện", "homework");
        } catch (error) {
            console.error(error);
        } finally {
            setSendingReminder(null);
        }
    };

    // --- CHART DATA PREP ---
    // Pie Chart: Score distribution
    const pieData = [
        { name: "Xuất sắc (≥8)", value: summary.excellentCount, color: "#10b981" },
        { name: "Khá (6-7.9)", value: summary.goodCount, color: "#3b82f6" },
        { name: "Trung bình/Yếu (<6)", value: summary.totalStudents - summary.excellentCount - summary.goodCount, color: "#f59e0b" },
        { name: "Kém (<5)", value: summary.weakCount, color: "#ef4444" },
    ].filter(d => d.value > 0);

    // Line Chart: Exam trend (Average score of the class across exams)
    // We compute average score per exam across all students
    const examTrendData = examList.map((exam: any) => {
        let totalScore10 = 0;
        let count = 0;
        students.forEach((s: any) => {
            const sub = s.exams.scores.find((score: any) => score.examId === exam.id);
            if (sub) {
                totalScore10 += sub.score10;
                count++;
            }
        });
        return {
            name: exam.title.length > 15 ? exam.title.substring(0, 15) + "..." : exam.title,
            avg: count > 0 ? Math.round((totalScore10 / count) * 10) / 10 : 0
        };
    });

    // --- KPI STATS PREP ---
    const completedStudents: any[] = [];
    const missingStudents: any[] = [];

    students.forEach((s: any) => {
        if (s.homework.total > 0) {
            if (s.homework.completed >= s.homework.total) {
                completedStudents.push(s);
            } else {
                missingStudents.push(s);
            }
        }
    });

    const averageScore = summary.classAvg10 || 0;

    return (
        <div className="space-y-6 mt-6">
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <CardContent className="p-6">
                        <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                            <Target className="w-5 h-5 mr-2 text-indigo-500" /> Điểm trung bình lớp
                        </h4>
                        <p className="text-4xl font-black text-indigo-600">{averageScore}<span className="text-sm font-normal text-slate-400">/10</span></p>
                    </CardContent>
                </Card>

                <Card 
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors hover:shadow-md"
                    onClick={() => setCompletedDialog(true)}
                >
                    <CardContent className="p-6">
                        <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                            <BookOpen className="w-5 h-5 mr-2 text-emerald-500" /> Đã hoàn thành BT
                        </h4>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-4xl font-black text-emerald-600">{completedStudents.length}</p>
                                <p className="text-sm text-slate-500 mt-1">học sinh nộp đủ bài</p>
                            </div>
                            <Button variant="ghost" className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-full h-8 px-3 text-xs">Xem chi tiết</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className="bg-white rounded-2xl shadow-sm border border-red-100 bg-red-50/20 cursor-pointer hover:border-red-300 transition-colors hover:shadow-md"
                    onClick={() => setMissingDialog(true)}
                >
                    <CardContent className="p-6">
                        <h4 className="font-bold text-red-800 mb-4 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-red-500" /> Thiếu/Chưa làm BT
                        </h4>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-4xl font-black text-red-600">{missingStudents.length}</p>
                                <p className="text-sm text-red-500/80 mt-1">học sinh còn nợ bài tập</p>
                            </div>
                            <Button variant="ghost" className="text-red-600 bg-red-50 hover:bg-red-100 rounded-full h-8 px-3 text-xs">Xem & Nhắc</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* AI WARNING PANEL */}
            {atRiskStudents.length > 0 && (
                <Card className="border-red-200 shadow-sm bg-red-50/40">
                    <CardHeader className="border-b border-red-100 py-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
                                <AlertTriangle className="w-5 h-5" /> Hệ thống cảnh báo AI
                            </CardTitle>
                            <CardDescription className="text-red-600/80 mt-1">
                                Phát hiện {atRiskStudents.length} học sinh có dấu hiệu sa sút (ĐTB &lt; 5, vắng mặt &gt; 40%, hoặc bỏ &gt; 50% bài tập).
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-red-100">
                            {atRiskStudents.map((s: any) => {
                                const hwRatio = s.homework.total > 0 ? (s.homework.completed / s.homework.total) : 1;
                                const reasons = [];
                                if (s.avgScore10 < 5) reasons.push(`ĐTB Thấp (${s.avgScore10})`);
                                if (s.attendance.rate < 60) reasons.push(`Chuyên cần kém (${s.attendance.rate}%)`);
                                if (hwRatio < 0.5 && s.homework.total > 0) reasons.push(`Nợ bài tập (${s.homework.total - s.homework.completed}/${s.homework.total})`);

                                const isSending = sendingReminder === s.id;

                                return (
                                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-white/50 transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800">{s.name}</p>
                                            <div className="flex gap-2 mt-1.5 flex-wrap">
                                                {reasons.map((r, i) => (
                                                    <Badge key={i} variant="outline" className="text-[10px] bg-red-100/50 text-red-700 border-red-200">{r}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                                            disabled={isSending}
                                            onClick={() => handleSendWarning(s.id, s.name)}
                                        >
                                            {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                                            Gửi cánh báo phụ huynh
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100 py-4">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                            <TrendingUp className="w-4 h-4 text-indigo-500" /> Biểu đồ điểm số qua các bài KT
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {examTrendData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={examTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                        <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Line type="monotone" dataKey="avg" name="ĐTB chung" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu bài kiểm tra</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100 py-4">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                            <Target className="w-4 h-4 text-emerald-500" /> Phân loại học lực lớp
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex items-center justify-center">
                        {pieData.length > 0 ? (
                            <div className="h-64 w-full flex items-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: "bold" }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu phân loại học lực</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* COMPLETED DIALOG */}
            <Dialog open={completedDialog} onOpenChange={setCompletedDialog}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-emerald-700 flex items-center gap-2">
                            <BookOpen className="w-5 h-5"/> Danh sách đã hoàn thành bài tập
                        </DialogTitle>
                        <DialogDescription>
                            Gồm {completedStudents.length} học sinh báo cáo đã nộp đủ số lượng bài tập hiện có.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        {completedStudents.map(s => (
                            <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <Avatar className="h-8 w-8 border border-emerald-200">
                                    <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xs">{s.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                    <p className="text-[10px] text-slate-500">Đã nộp: {s.homework.completed}/{s.homework.total}</p>
                                </div>
                            </div>
                        ))}
                        {completedStudents.length === 0 && (
                            <p className="text-center text-sm text-slate-500 italic py-6">Chưa có học sinh nào hoàn thành.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* MISSING DIALOG */}
            <Dialog open={missingDialog} onOpenChange={setMissingDialog}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-red-700 flex items-center gap-2">
                            <Users className="w-5 h-5"/> Danh sách nợ bài tập
                        </DialogTitle>
                        <DialogDescription>
                            Chi tiết {missingStudents.length} học sinh chưa nộp đủ bài tập và danh sách tính năng vắng mặt tương ứng.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        {missingStudents.map(s => {
                            const hwList = reportData?.homeworkList || [];
                            const missedHomework = hwList.filter((h: any) => !s.homework.scores.find((score: any) => score.hwId === h.id));
                            
                            return (
                                <div key={s.id} className="p-4 bg-red-50/30 rounded-xl border border-red-100">
                                    <div className="flex items-center justify-between mb-3 border-b border-red-100 pb-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-red-200">
                                                <AvatarFallback className="bg-red-100 text-red-600 text-xs">{s.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                                <p className="text-[10px] text-red-500 font-medium bg-red-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Nợ {missedHomework.length} bài</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {missedHomework.map((h: any) => {
                                            const isSending = sendingReminder === `${s.id}-${h.title}`;
                                            return (
                                                <div key={h.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-red-100/50 shadow-sm">
                                                    <span className="text-xs text-slate-700 font-medium truncate pr-2 flex-1">{h.title}</span>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="h-6 text-[10px] bg-red-50 text-red-600 border-red-200 hover:bg-red-100 shrink-0"
                                                        disabled={isSending}
                                                        onClick={async () => {
                                                            setSendingReminder(`${s.id}-${h.title}`);
                                                            try {
                                                                await sendReminderAction(s.id, classId, className, h.title, "homework");
                                                            } finally {
                                                                setSendingReminder(null);
                                                            }
                                                        }}
                                                    >
                                                        {isSending ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null}
                                                        Nhắc nhở
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {missingStudents.length === 0 && (
                            <p className="text-center text-sm text-slate-500 italic py-6">Tất cả học sinh đã hoàn thành.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
