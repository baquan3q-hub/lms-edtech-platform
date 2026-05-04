"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Trophy, CheckCircle2, Clock, XCircle,
    BookOpen, BarChart3
} from "lucide-react";

interface TeacherProgressTrackingProps {
    analyses: any[];
}

export default function TeacherProgressTracking({ analyses }: TeacherProgressTrackingProps) {
    // Lọc chỉ những analysis đã gửi
    const sentAnalyses = analyses.filter(a => a.status === 'sent');

    if (sentAnalyses.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="p-6 text-center text-slate-400">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Chưa có dữ liệu theo dõi.</p>
                    <p className="text-xs mt-1">Hãy gửi nhận xét cho học sinh trước để theo dõi tiến độ.</p>
                </CardContent>
            </Card>
        );
    }

    // Tính tổng thống kê
    let totalTasks = 0, completedTasks = 0, totalQuizScore = 0, totalQuizTotal = 0, quizCount = 0;

    sentAnalyses.forEach((a: any) => {
        const progress = a.improvement_progress || [];
        progress.forEach((p: any) => {
            totalTasks++;
            if (p.status === 'completed') {
                completedTasks++;
                if (p.quiz_score !== null && p.quiz_total !== null) {
                    totalQuizScore += p.quiz_score;
                    totalQuizTotal += p.quiz_total;
                    quizCount++;
                }
            }
        });
    });

    const overallPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const avgQuizPercent = totalQuizTotal > 0 ? Math.round((totalQuizScore / totalQuizTotal) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* Thống kê tổng */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <BookOpen className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                        <p className="text-xl font-black text-slate-800">{sentAnalyses.length}</p>
                        <p className="text-[10px] text-slate-500 font-medium">HS đã gửi</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-xl font-black text-emerald-600">{completedTasks}/{totalTasks}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Bài tập hoàn thành</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <BarChart3 className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <p className="text-xl font-black text-purple-600">{overallPercent}%</p>
                        <p className="text-[10px] text-slate-500 font-medium">Tỷ lệ hoàn thành</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <p className="text-xl font-black text-amber-600">{avgQuizPercent}%</p>
                        <p className="text-[10px] text-slate-500 font-medium">Điểm TB Mini Quiz</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng chi tiết từng học sinh */}
            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" /> Tiến độ từng học sinh
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-y border-slate-200">
                                <tr>
                                    <th className="text-left py-3 px-4 font-bold text-slate-700">#</th>
                                    <th className="text-left py-3 px-4 font-bold text-slate-700">Học sinh</th>
                                    <th className="text-center py-3 px-4 font-bold text-slate-700">Tiến độ</th>
                                    <th className="text-center py-3 px-4 font-bold text-slate-700">Điểm Mini Quiz</th>
                                    <th className="text-center py-3 px-4 font-bold text-slate-700">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sentAnalyses.map((a: any, idx: number) => {
                                    const studentObj = Array.isArray(a.student) ? a.student[0] : a.student;
                                    const progress = a.improvement_progress || [];
                                    const taskCount = progress.length;
                                    const doneCount = progress.filter((p: any) => p.status === 'completed').length;
                                    const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

                                    // Tính điểm quiz riêng cho HS này
                                    let studentQuizScore = 0, studentQuizTotal = 0;
                                    progress.forEach((p: any) => {
                                        if (p.quiz_score !== null && p.quiz_total !== null) {
                                            studentQuizScore += p.quiz_score;
                                            studentQuizTotal += p.quiz_total;
                                        }
                                    });
                                    const studentQuizPct = studentQuizTotal > 0 ? Math.round((studentQuizScore / studentQuizTotal) * 100) : null;

                                    const allDone = doneCount === taskCount && taskCount > 0;

                                    return (
                                        <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-slate-800">{studentObj?.full_name || "Ẩn danh"}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={pct} className="h-2 flex-1" />
                                                    <span className="text-xs font-bold text-slate-600 w-12 text-right">{doneCount}/{taskCount}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {studentQuizPct !== null ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span className={`text-sm font-bold ${studentQuizPct >= 80 ? 'text-emerald-600' : studentQuizPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                                            {studentQuizScore}/{studentQuizTotal}
                                                        </span>
                                                        <Badge className={`text-[9px] border-none ${studentQuizPct >= 80 ? 'bg-emerald-50 text-emerald-700' : studentQuizPct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                                            {studentQuizPct}%
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {allDone ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px]">
                                                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Hoàn thành
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-amber-50 text-amber-700 border-none text-[10px]">
                                                        <Clock className="w-3 h-3 mr-0.5" /> Đang làm
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
