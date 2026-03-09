import { createAdminClient } from "@/lib/supabase/admin";
import { fetchExamAnalytics } from "@/lib/actions/exam";
import Link from "next/link";
import {
    ArrowLeft, BarChart3, Trophy, Clock, Users, CheckCircle2, XCircle,
    TrendingUp, TrendingDown, AlertTriangle, Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ExamAnalyticsPage({ params }: { params: Promise<{ id: string; examId: string }> }) {
    const { id: classId, examId } = await params;
    const { data, error } = await fetchExamAnalytics(examId);

    if (error || !data) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p className="font-medium text-lg">Lỗi tải phân tích: {error}</p>
                <Link href={`/teacher/classes/${classId}`} className="text-blue-600 underline mt-4 inline-block">Quay lại</Link>
            </div>
        );
    }

    const { exam, submissions, summary, questionAnalytics, strengths, weaknesses } = data;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link href={`/teacher/classes/${classId}`} className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại lớp học
            </Link>

            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-6 text-white">
                    <Badge className="bg-white/15 border-none text-white mb-2 text-xs">Phân tích bài kiểm tra</Badge>
                    <h1 className="text-2xl font-extrabold">{exam.title}</h1>
                    <p className="text-indigo-200 text-sm mt-1">{exam.description || "Không có mô tả"}</p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-slate-200 bg-slate-50">
                    <div className="p-4 text-center">
                        <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                        <p className="text-2xl font-black text-slate-800">{summary.totalStudents}</p>
                        <p className="text-xs text-slate-500 font-medium">Đã nộp</p>
                    </div>
                    <div className="p-4 text-center">
                        <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-black text-slate-800">{summary.avgScore}/{exam.total_points}</p>
                        <p className="text-xs text-slate-500 font-medium">Điểm TB</p>
                    </div>
                    <div className="p-4 text-center">
                        <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <p className="text-2xl font-black text-emerald-600">{summary.passCount}</p>
                        <p className="text-xs text-slate-500 font-medium">Đạt (≥50%)</p>
                    </div>
                    <div className="p-4 text-center">
                        <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-2xl font-black text-slate-800">{formatTime(summary.avgTimeSeconds)}</p>
                        <p className="text-xs text-slate-500 font-medium">TG Trung bình</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Per-student results */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-white">
                            <h2 className="font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-500" /> Bảng điểm học viên
                            </h2>
                        </div>
                        {submissions.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/50">
                                        <th className="text-left py-3 px-4 font-bold text-slate-700">#</th>
                                        <th className="text-left py-3 px-4 font-bold text-slate-700">Học viên</th>
                                        <th className="text-center py-3 px-4 font-bold text-slate-700">Điểm</th>
                                        <th className="text-center py-3 px-4 font-bold text-slate-700">Thời gian</th>
                                        <th className="text-center py-3 px-4 font-bold text-slate-700">Kết quả</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map((sub: any, idx: number) => {
                                        const studentObj = Array.isArray(sub.student) ? sub.student[0] : sub.student;
                                        const percent = exam.total_points > 0 ? (Number(sub.score) / exam.total_points) * 100 : 0;
                                        return (
                                            <tr key={sub.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                                <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-slate-800">{studentObj?.full_name || "Ẩn danh"}</p>
                                                    <p className="text-[10px] text-slate-400">{studentObj?.email || ""}</p>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`font-bold ${percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-indigo-600' : 'text-red-500'}`}>
                                                        {sub.score}/{exam.total_points}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-500">
                                                    {formatTime(sub.time_taken_seconds || 0)}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {percent >= 50 ? (
                                                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]" variant="outline">Đạt</Badge>
                                                    ) : (
                                                        <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]" variant="outline">Chưa đạt</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-400">Chưa có học viên nào nộp bài.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Strengths & Weaknesses */}
                <div className="space-y-4">
                    {/* Điểm mạnh */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                        <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4" /> Điểm mạnh
                        </h3>
                        {strengths.length > 0 ? (
                            <div className="space-y-2">
                                {strengths.map((s: any) => (
                                    <div key={s.questionIndex} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-xs text-slate-700 flex-1 truncate">Câu {s.questionIndex + 1}: {s.question}</span>
                                        <span className="text-xs font-bold text-emerald-600">{s.correctPercent}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
                        )}
                    </div>

                    {/* Điểm yếu */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                        <h3 className="font-bold text-sm text-red-700 flex items-center gap-2 mb-3">
                            <TrendingDown className="w-4 h-4" /> Điểm yếu (Cần ôn)
                        </h3>
                        {weaknesses.length > 0 ? (
                            <div className="space-y-2">
                                {weaknesses.map((w: any) => (
                                    <div key={w.questionIndex} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="text-xs text-slate-700 flex-1 truncate">Câu {w.questionIndex + 1}: {w.question}</span>
                                        <span className="text-xs font-bold text-red-600">{w.correctPercent}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">Chưa có dữ liệu</p>
                        )}
                    </div>

                    {/* Edit button */}
                    <Link href={`/teacher/classes/${classId}/exams/${examId}/edit`}>
                        <Button variant="outline" className="w-full text-indigo-600 border-indigo-200 font-semibold">
                            Sửa bài kiểm tra
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Per-question analysis */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
                <div className="px-5 py-4 border-b border-slate-200 bg-white">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" /> Phân tích từng câu hỏi
                    </h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {questionAnalytics.map((qa: any) => (
                        <div key={qa.questionIndex} className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-sm text-slate-800">
                                    Câu {qa.questionIndex + 1}: {qa.question}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-emerald-600">{qa.correctCount} đúng</span>
                                    <span className="text-xs text-slate-400">/</span>
                                    <span className="text-xs font-bold text-red-500">{qa.wrongCount} sai</span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
                                <div
                                    className={`h-3 rounded-full transition-all ${qa.correctPercent >= 70 ? 'bg-emerald-500' : qa.correctPercent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${qa.correctPercent}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mb-2">Tỷ lệ đúng: <span className="font-bold">{qa.correctPercent}%</span></p>

                            {/* Option distribution */}
                            <div className="grid grid-cols-2 gap-2">
                                {qa.options.map((opt: any, oIdx: number) => {
                                    const count = qa.optionCounts[opt.id] || 0;
                                    const total = submissions?.length || 1;
                                    const pct = Math.round((count / total) * 100);
                                    return (
                                        <div key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${opt.isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                                            <span className={`font-bold ${opt.isCorrect ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {"ABCDEFGH"[oIdx]}
                                            </span>
                                            <span className="flex-1 truncate text-slate-700">{opt.text}</span>
                                            <span className={`font-bold ${opt.isCorrect ? 'text-emerald-600' : 'text-slate-500'}`}>{count} ({pct}%)</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
