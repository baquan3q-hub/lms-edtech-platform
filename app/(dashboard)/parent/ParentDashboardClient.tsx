"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchParentDashboardData } from "@/lib/actions/parentStudent";
import {
    GraduationCap, CalendarDays, Bell, TrendingUp,
    CheckCircle2, XCircle, Clock, UserPlus, Loader2, BookOpen,
    MessageSquare, AlertTriangle, ArrowRight, Star, MapPin, FileText
} from "lucide-react";
import { parseISO, format, isBefore, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { formatKnowledgeGap } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type StudentInfo = {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    relationship: string;
};

export default function ParentDashboardClient({ students }: { students: StudentInfo[] }) {
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [feedbackData, setFeedbackData] = useState<any[]>([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    useEffect(() => {
        if (selectedStudentId) loadDashboard(selectedStudentId);
    }, [selectedStudentId]);

    const loadDashboard = async (studentId: string) => {
        setLoading(true);
        try {
            const dashRes = await fetchParentDashboardData(studentId);
            setDashboardData(dashRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        loadFeedback(studentId);
    };

    const loadFeedback = async (studentId: string) => {
        setFeedbackLoading(true);
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("quiz_individual_analysis")
                .select("*, improvement_progress(*), exam:exams!exam_id(id, title, class_id), supplementary_quizzes(id, title, status, score, total_questions)")
                .eq("student_id", studentId)
                .eq("status", "sent")
                .order("sent_at", { ascending: false })
                .limit(5);
            setFeedbackData(data || []);
        } catch (err) {
            console.error("Error loading feedback:", err);
        } finally {
            setFeedbackLoading(false);
        }
    };

    // ----- Nếu chưa liên kết con nào -----
    if (students.length === 0) {
        return (
            <div className="max-w-lg mx-auto text-center py-20">
                <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-6">
                    <GraduationCap className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Chào mừng đến Cổng Phụ huynh!</h2>
                <p className="text-slate-500 mb-6">Bạn chưa liên kết với con em nào. Hãy nhập mã liên kết để bắt đầu theo dõi kết quả học tập.</p>
                <Link href="/parent/link-student">
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white h-12 px-8 text-base font-semibold">
                        <UserPlus className="w-5 h-5 mr-2" /> Liên kết con em ngay
                    </Button>
                </Link>
            </div>
        );
    }

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    // Compute 2 nearest future sessions from dashboardData
    const getNext2Sessions = () => {
        if (!dashboardData?.upcomingSessions) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sorted = [...dashboardData.upcomingSessions].sort((a: any, b: any) =>
            a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)
        );
        return sorted.filter((s: any) => !isBefore(parseISO(s.session_date), today)).slice(0, 2);
    };

    // Compute average score from dashboardData.stats
    const getAvgScore = () => {
        if (!dashboardData?.stats?.averageScore) return null;
        const val = parseFloat(dashboardData.stats.averageScore);
        return isNaN(val) ? null : val;
    };

    // Compute attendance rate from dashboardData.attendanceSummary
    const getAttendanceRate = () => {
        if (!dashboardData?.attendanceSummary) return null;
        const { total, present } = dashboardData.attendanceSummary;
        if (!total || total === 0) return null;
        return Math.round((present / total) * 100);
    };

    const next2 = getNext2Sessions();
    const avgScore = getAvgScore();
    const attendanceRate = getAttendanceRate();

    // Day name helper
    const getDayName = (dateStr: string) => {
        const date = parseISO(dateStr);
        const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        return dayNames[date.getDay()];
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Tabs chọn con */}
            {students.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {students.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedStudentId(s.id)}
                            className={`flex items-center gap-3 px-5 py-3 rounded-xl shrink-0 transition-all font-medium ${selectedStudentId === s.id
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-amber-300"
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedStudentId === s.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
                                }`}>
                                {s.full_name?.charAt(0) || "?"}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold">{s.full_name}</p>
                                <p className={`text-[10px] ${selectedStudentId === s.id ? "text-amber-100" : "text-slate-400"}`}>
                                    {s.relationship}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Single student header */}
            {students.length === 1 && selectedStudent && (
                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                        {selectedStudent.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900">{selectedStudent.full_name}</h2>
                        <p className="text-sm text-slate-500">{selectedStudent.relationship} · {selectedStudent.email}</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            )}

            {/* ===== TOP ROW: 2 Buổi học gần nhất + Điểm TB ===== */}
            {!loading && dashboardData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: 2 buổi học gần nhất */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                                <CalendarDays className="w-4 h-4 text-indigo-500" /> Buổi học sắp tới
                            </h3>
                            <Link href="/parent/schedule">
                                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold h-7">
                                    Xem lịch đầy đủ <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        </div>
                        <div className="p-4 space-y-3">
                            {next2.length === 0 ? (
                                <div className="text-center py-6">
                                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">Chưa có lịch học sắp tới</p>
                                </div>
                            ) : (
                                next2.map((session: any, idx: number) => {
                                    const date = parseISO(session.session_date);
                                    const isCurrentDay = isToday(date);
                                    const dayName = getDayName(session.session_date);
                                    const dateFormatted = format(date, 'dd/MM', { locale: vi });

                                    return (
                                        <div
                                            key={session.id || idx}
                                            className={`rounded-xl border p-4 transition-all ${
                                                isCurrentDay
                                                    ? "border-emerald-300 bg-emerald-50/30 shadow-sm shadow-emerald-100/50"
                                                    : "border-slate-200 bg-slate-50/30 hover:border-indigo-200"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                        <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                                                        {dayName}
                                                    </span>
                                                    {isCurrentDay && (
                                                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0 h-4 border-none font-semibold">
                                                            Hôm nay
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-slate-400">({dateFormatted})</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="font-semibold">{session.start_time?.substring(0, 5)} – {session.end_time?.substring(0, 5)}</span>
                                                </span>
                                                {session.room_name && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                                        <span className="font-medium">{session.room_name}</span>
                                                    </span>
                                                )}
                                                {session.topic && (
                                                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <FileText className="w-3 h-3" />
                                                        {session.topic}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Điểm TB + Chuyên cần */}
                    <div className="space-y-4">
                        {/* Điểm trung bình */}
                        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 overflow-hidden">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Điểm Trung Bình</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {avgScore !== null ? avgScore.toFixed(1) : "—"}
                                        <span className="text-sm font-medium text-slate-400 ml-1">/10</span>
                                    </p>
                                </div>
                            </div>
                            {avgScore !== null && (
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-700 ${avgScore >= 8 ? 'bg-emerald-500' : avgScore >= 6 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${avgScore * 10}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Chuyên cần */}
                        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 overflow-hidden">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Tỉ lệ Chuyên Cần</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {attendanceRate !== null ? attendanceRate.toFixed(0) : "—"}
                                        <span className="text-sm font-medium text-slate-400 ml-1">%</span>
                                    </p>
                                </div>
                            </div>
                            {attendanceRate !== null && (
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-700 ${attendanceRate >= 90 ? 'bg-emerald-500' : attendanceRate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${attendanceRate}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Quick link */}
                        <Link href="/parent/progress" className="block">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-4 hover:shadow-sm transition-all cursor-pointer group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Star className="w-4 h-4 text-indigo-500" />
                                        <span className="text-sm font-bold text-indigo-700">Xem chi tiết tiến độ</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <p className="text-xs text-indigo-500 mt-1">Biểu đồ, năng lực, điểm tích lũy...</p>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* ===== NHẬN XÉT BÀI KIỂM TRA ===== */}
            {!loading && !feedbackLoading && feedbackData.length > 0 && (
                <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-purple-100 bg-purple-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-purple-800 flex items-center gap-2 text-sm">
                            <MessageSquare className="w-4 h-4" /> Nhận xét bài kiểm tra
                        </h3>
                        <Link href="/parent/progress">
                            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 text-xs font-semibold h-7">
                                Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    <div className="p-4 space-y-3">
                        {feedbackData.slice(0, 3).map((analysis: any) => {
                            const examObj = Array.isArray(analysis.exam) ? analysis.exam[0] : analysis.exam;
                            const progress = analysis.improvement_progress || [];
                            const totalTasks = progress.length;
                            const completedTasks = progress.filter((p: any) => p.status === 'completed').length;
                            const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                            const feedbackText = analysis.teacher_edited_feedback || analysis.ai_feedback || "";

                            const deadline = analysis.deadline ? new Date(analysis.deadline) : null;
                            const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

                            return (
                                <div key={analysis.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <p className="font-bold text-slate-800 text-sm">📝 {examObj?.title || 'Bài kiểm tra'}</p>
                                        {daysLeft !== null && (
                                            <Badge className={`text-[9px] ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} border-none shrink-0`}>
                                                <Clock className="w-2.5 h-2.5 mr-0.5" /> Còn {daysLeft} ngày
                                            </Badge>
                                        )}
                                    </div>

                                    {feedbackText && (
                                        <div className="text-xs text-slate-600 line-clamp-2 mb-2">
                                            {feedbackText.substring(0, 150)}{feedbackText.length > 150 ? "..." : ""}
                                        </div>
                                    )}

                                    {/* Knowledge gaps */}
                                    {analysis.knowledge_gaps && analysis.knowledge_gaps.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {analysis.knowledge_gaps.slice(0, 3).map((gap: string, i: number) => (
                                                <Badge key={i} className="bg-red-50 text-red-700 border-none text-[9px]">🔴 {formatKnowledgeGap(gap)}</Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tiến độ */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-slate-500">Bài tập: {completedTasks}/{totalTasks}</span>
                                                <span className="text-[10px] font-bold text-indigo-600">{progressPercent}%</span>
                                            </div>
                                            <Progress value={progressPercent} className="h-1.5" />
                                        </div>
                                        {completedTasks === totalTasks && totalTasks > 0 && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== THÔNG BÁO TỪ GIÁO VIÊN ===== */}
            {!loading && dashboardData && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-blue-800 flex items-center gap-2 text-sm">
                            <Bell className="w-4 h-4" /> Thông báo từ giáo viên
                        </h3>
                        {selectedStudentId && (
                            <Link href={`/parent/children/${selectedStudentId}/announcements`}>
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs font-semibold h-7">
                                    Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        )}
                    </div>
                    <div className="p-4">
                        {(!dashboardData.announcements || dashboardData.announcements.length === 0) ? (
                            <p className="text-sm text-slate-400 text-center py-6">Chưa có thông báo nào.</p>
                        ) : (
                            <div className="space-y-3">
                                {dashboardData.announcements.slice(0, 3).map((ann: any) => (
                                    <div key={ann.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800 text-sm">{ann.title}</p>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ann.content}</p>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {(ann.file_url || (ann.attachments && ann.attachments.length > 0)) && (
                                                        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[9px]" variant="outline">
                                                            📎 {ann.attachments?.length ? `${ann.attachments.length} File` : 'File'}
                                                        </Badge>
                                                    )}
                                                    {ann.video_url && (
                                                        <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[9px]" variant="outline">🎥 Video</Badge>
                                                    )}
                                                    {ann.link_url && (
                                                        <Badge className="bg-violet-50 text-violet-600 border-violet-200 text-[9px]" variant="outline">🔗 Link</Badge>
                                                    )}
                                                    {(ann.quiz_data || ann.quiz_id) && (
                                                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[9px]" variant="outline">📝 Quiz</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0 ml-4">
                                                {ann.created_at ? new Date(ann.created_at).toLocaleDateString("vi-VN") : ""}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {dashboardData.announcements.length > 3 && selectedStudentId && (
                                    <Link href={`/parent/children/${selectedStudentId}/announcements`} className="block">
                                        <p className="text-xs text-center text-blue-500 font-semibold hover:text-blue-700 py-2">
                                            Xem thêm {dashboardData.announcements.length - 3} thông báo khác →
                                        </p>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
