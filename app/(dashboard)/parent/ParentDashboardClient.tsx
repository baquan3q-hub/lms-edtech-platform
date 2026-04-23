"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchParentDashboardData } from "@/lib/actions/parentStudent";
import { confirmAnnouncementRead } from "@/lib/actions/admin-announcements";
import {
    GraduationCap, CalendarDays, Bell, TrendingUp, CreditCard,
    CheckCircle2, XCircle, Clock, UserPlus, Loader2, BookOpen,
    MessageSquare, AlertTriangle, ArrowRight, Star, MapPin, FileText,
    History
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
import ExpandableContentClient from "@/components/shared/ExpandableContentClient";
import ParentMobileDashboard from "@/components/parent/ParentMobileDashboard";
import { InstallBanner } from "@/components/shared/InstallBanner";
import AttendanceHistory from "@/components/student/AttendanceHistory";

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
    const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
    const [confirmingId, setConfirmingId] = useState<string | null>(null);



    useEffect(() => {
        if (selectedStudentId) loadDashboard(selectedStudentId);
    }, [selectedStudentId]);

    const loadDashboard = async (studentId: string) => {
        setLoading(true);
        try {
            const dashRes = await fetchParentDashboardData(studentId);
            setDashboardData(dashRes.data);
            if (dashRes.data?.confirmedAnnouncementIds) {
                setConfirmedIds(new Set(dashRes.data.confirmedAnnouncementIds));
            }
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

    const handleConfirmRead = async (announcementId: string) => {
        if (!announcementId) return;
        setConfirmingId(announcementId);
        try {
            const res = await confirmAnnouncementRead(announcementId);
            if (!res.error) {
                setConfirmedIds(prev => new Set([...prev, announcementId]));
            }
        } catch (error) {
            console.error("Error confirming read:", error);
        } finally {
            setConfirmingId(null);
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
    // Tỷ lệ chỉ dựa trên Đi học vs Vắng (có phép + không phép), không tính đi muộn
    const getAttendanceRate = () => {
        if (!dashboardData?.attendanceSummary) return null;
        const { present, absent, excused } = dashboardData.attendanceSummary;
        const relevantTotal = (present || 0) + (absent || 0) + (excused || 0);
        if (relevantTotal === 0) return null;
        return Math.round(((present || 0) / relevantTotal) * 100);
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
        <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4 sm:px-0">
            {/* MOBILE VIEW (SIMPLIFIED) */}
            <div className="sm:hidden">
                <ParentMobileDashboard 
                    dashboardData={dashboardData} 
                    activeChildren={students} 
                    stats={{ avgScore, attendanceRate }}
                />
            </div>

            {/* DESKTOP VIEW (FULL) */}
            <div className="hidden sm:block space-y-6">
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

            {/* HERO CARD & QUICK ACTIONS */}
            {students.length === 1 && selectedStudent && (
                <div className="bg-[#1e293b] rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden mb-6">
                    {/* Abstract background decos */}
                    <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                    <div className="absolute bottom-0 left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl translate-y-1/3"></div>
                    
                    <div className="relative z-10 flex items-center gap-5 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-2xl font-bold border border-white/20 shadow-inner shrink-0">
                            {selectedStudent.full_name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-300 text-xs font-semibold mb-0.5 tracking-wider uppercase">Tình hình học tập của</p>
                            <h2 className="text-2xl lg:text-3xl font-black text-white">{selectedStudent.full_name}</h2>
                        </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="relative z-10 flex gap-3 lg:gap-4 w-full md:w-auto shrink-0">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex-1 w-32 lg:w-40 xl:w-48 text-center relative overflow-hidden group hover:bg-white/20 transition-all cursor-default">
                            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mb-1 opacity-80 group-hover:opacity-100 transition-opacity">Điểm TB</p>
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-3xl lg:text-4xl font-black text-white">{avgScore !== null ? avgScore.toFixed(1) : "—"}</span>
                                {avgScore !== null && <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex-1 w-32 lg:w-40 xl:w-48 text-center relative overflow-hidden group hover:bg-white/20 transition-all cursor-default">
                            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mb-1 opacity-80 group-hover:opacity-100 transition-opacity">Chuyên Cần</p>
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-3xl lg:text-4xl font-black text-white">{attendanceRate !== null ? `${attendanceRate.toFixed(0)}%` : "—"}</span>
                                {attendanceRate !== null && <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions Array */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Link href="/parent/schedule">
                    <Button variant="outline" className="w-full h-14 rounded-2xl bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 font-bold shadow-sm group">
                        <CalendarDays className="w-5 h-5 mr-2 text-indigo-500 group-hover:scale-110 transition-transform" /> Lịch học
                    </Button>
                </Link>
                <Link href="/parent/progress">
                    <Button variant="outline" className="w-full h-14 rounded-2xl bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 font-bold shadow-sm group">
                        <TrendingUp className="w-5 h-5 mr-2 text-emerald-500 group-hover:scale-110 transition-transform" /> Điểm số
                    </Button>
                </Link>
                <Link href="/parent/payments">
                    <Button variant="outline" className="w-full h-14 rounded-2xl bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold shadow-sm group">
                        <CreditCard className="w-5 h-5 mr-2 text-blue-500 group-hover:scale-110 transition-transform" /> Học phí
                    </Button>
                </Link>
                <Link href="/parent/schedule">
                    <Button variant="outline" className="w-full h-14 rounded-2xl bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 font-bold shadow-sm group">
                        <XCircle className="w-5 h-5 mr-2 text-rose-500 group-hover:scale-110 transition-transform" /> Xin nghỉ
                    </Button>
                </Link>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            )}
            {/* ===== MAIN CONTENT GRID ===== */}
            {!loading && dashboardData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* COLUMN 1: Lịch học & Giáo viên */}
                    <div className="space-y-6">
                        {/* Buổi học sắp tới */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                    <Clock className="w-5 h-5 text-indigo-500" /> Buổi học sắp tới
                                </h3>
                                <Link href="/parent/schedule">
                                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold px-2">Tất cả <ArrowRight className="w-3 h-3 ml-1" /></Button>
                                </Link>
                            </div>
                            <div className="p-4 space-y-3">
                                {next2.length === 0 ? (
                                    <div className="text-center py-6">
                                        <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">Không có lịch học sắp tới</p>
                                    </div>
                                ) : (
                                    next2.map((session, idx) => {
                                        const date = parseISO(session.session_date);
                                        const isCurrentDay = isToday(date);
                                        const dayName = getDayName(session.session_date);
                                        const dateFormatted = format(date, 'dd/MM', { locale: vi });
                                        
                                        return (
                                            <div key={session.id || idx} className={`rounded-xl border p-4 transition-all ${isCurrentDay ? "border-emerald-300 bg-emerald-50/50" : "border-slate-100 bg-slate-50"}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">{dayName}</span>
                                                        {isCurrentDay && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0 h-4 border-none font-bold">Hôm nay</Badge>}
                                                        <span className="text-xs text-slate-400">({dateFormatted})</span>
                                                    </div>
                                                    {session.class_name && <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 bg-white">{session.class_name}</Badge>}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                                    <span className="flex items-center gap-1 font-semibold text-indigo-700"><Clock className="w-3.5 h-3.5" /> {session.start_time?.substring(0, 5)} – {session.end_time?.substring(0, 5)}</span>
                                                    {session.room_name && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-500" /> <span className="font-medium text-slate-700">{session.room_name}</span></span>}
                                                </div>
                                                {(session.lesson_title || session.lesson_content) && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                                                        {session.lesson_title && <p className="text-xs font-semibold text-slate-800 mb-1 flex items-start gap-1"><BookOpen className="w-3 h-3 text-indigo-500 mt-0.5" /> {session.lesson_title}</p>}
                                                        {session.lesson_content && <p className="text-[11px] text-slate-500 line-clamp-1 ml-4 italic">{session.lesson_content}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Nhận xét từ Giáo viên (Teacher Reviews) */}
                        {selectedStudentId && (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200 shadow-sm p-4 sm:p-5 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-emerald-100">
                                        <MessageSquare className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-emerald-900 text-sm sm:text-base mb-1 cursor-default">Nhận xét từ Giáo viên</h3>
                                        <p className="text-xs text-emerald-700/80 mb-3 leading-relaxed hidden sm:block cursor-default">Các đánh giá định kỳ, nhận xét hàng tuần và báo cáo lộ trình học tập của con em.</p>
                                        <Link href={`/parent/children/${selectedStudentId}/reviews`}>
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs px-4 h-8 group-hover:shadow-md transition-all">
                                                Xem nhận xét chi tiết <ArrowRight className="w-3 h-3 ml-1.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lịch sử đi học & Tổng buổi */}
                        {selectedStudentId && dashboardData?.attendanceSummary && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                        <History className="w-5 h-5 text-teal-500" /> Lịch sử đi học
                                    </h3>
                                    <Link href="/parent/schedule">
                                        <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 text-xs font-semibold px-2">Lịch học <ArrowRight className="w-3 h-3 ml-1" /></Button>
                                    </Link>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* All-time summary hero */}
                                    <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 rounded-xl border border-teal-100/80 p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-teal-200/60 shrink-0">
                                                <span className="text-2xl font-black text-teal-600">{dashboardData.attendanceSummary?.allTime?.total || 0}</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-teal-800 mb-1">Tổng buổi đã học</p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                        <span className="text-slate-600">Có mặt: <b className="text-emerald-700">{dashboardData.attendanceSummary?.allTime?.present || 0}</b></span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                        <span className="text-slate-600">Vắng: <b className="text-red-600">{dashboardData.attendanceSummary?.allTime?.absent || 0}</b></span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                        <span className="text-slate-600">Trễ: <b className="text-amber-600">{dashboardData.attendanceSummary?.allTime?.late || 0}</b></span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                        <span className="text-slate-600">Phép: <b className="text-blue-600">{dashboardData.attendanceSummary?.allTime?.excused || 0}</b></span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Attendance Calendar */}
                                    <AttendanceHistory studentId={selectedStudentId} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLUMN 2: Tiến độ & Thông báo */}
                    <div className="space-y-6">
                        {/* Nhận xét bài kiểm tra (Tiến trình) */}
                        {!loading && !feedbackLoading && feedbackData.length > 0 && (
                            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-purple-100 flex items-center justify-between">
                                    <h3 className="font-bold text-purple-800 flex items-center gap-2 text-base">
                                        <FileText className="w-5 h-5" /> Báo cáo học tập
                                    </h3>
                                    <Link href="/parent/progress">
                                        <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 text-xs font-semibold px-2">Chi tiết <ArrowRight className="w-3 h-3 ml-1" /></Button>
                                    </Link>
                                </div>
                                <div className="p-4 space-y-3">
                                    {feedbackData.slice(0, 2).map((analysis) => {
                                        const examObj = Array.isArray(analysis.exam) ? analysis.exam[0] : analysis.exam;
                                        const progress = analysis.improvement_progress || [];
                                        const totalTasks = progress.length;
                                        const completedTasks = progress.filter((p: any) => p.status === 'completed').length;
                                        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                        const feedbackText = analysis.teacher_edited_feedback || analysis.ai_feedback || "";

                                        return (
                                            <div key={analysis.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-purple-200 transition-colors">
                                                <p className="font-bold text-slate-800 text-sm mb-1.5 truncate">📝 {examObj?.title || 'Bài kiểm tra'}</p>
                                                {feedbackText && <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{feedbackText}</p>}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-semibold text-slate-500">Khắc phục lỗ hổng: {completedTasks}/{totalTasks} nhiệm vụ</span>
                                                            <span className="text-[10px] font-bold text-purple-600">{progressPercent}%</span>
                                                        </div>
                                                        <Progress value={progressPercent} className="h-1.5 bg-slate-200" indicatorColor="bg-purple-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Thông báo trung tâm/lớp — Xem chi tiết ngay trên trang */}
                        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden flex-1">
                            <div className="p-4 border-b border-blue-100 flex items-center justify-between">
                                <h3 className="font-bold text-blue-800 flex items-center gap-2 text-base">
                                    <Bell className="w-5 h-5" /> Thông báo mới
                                </h3>
                                {selectedStudentId && (
                                    <Link href="/parent/notifications">
                                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs font-semibold px-2">Tất cả <ArrowRight className="w-3 h-3 ml-1" /></Button>
                                    </Link>
                                )}
                            </div>
                            <div className="p-3">
                                {(!dashboardData.announcements?.length && !dashboardData.recentNotifications?.length) ? (
                                    <div className="text-center py-6">
                                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">Không có thông báo mới.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {[...(dashboardData.announcements || []).map((a: any)=>({...a, source: 'announcement'})), ...(dashboardData.recentNotifications || []).map((n: any)=>({...n, source: 'notification'}))]
                                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .slice(0, 5)
                                        .map((item: any) => {
                                            const isAnnouncement = item.source === 'announcement';
                                            const annId = isAnnouncement ? item.id : item._announcementId;
                                            
                                            // Handle the safe title to string conversion using simple fallback logic
                                            // If title is object (React child), stringify it or just use a fallback string
                                            const displayTitle = typeof item.title === 'string' ? item.title : (item.title?.props?.children || 'Thông báo mới');
                                            
                                            return (
                                                <ExpandableContentClient
                                                    key={`${item.source}-${item.id}`}
                                                    className={`border ${item.source === 'announcement' ? 'border-orange-100 bg-gradient-to-br from-orange-50/60 to-white' : 'border-blue-100 bg-gradient-to-br from-blue-50/60 to-white'} rounded-xl hover:shadow-md transition-all`}
                                                    icon={<Bell className={`w-5 h-5 ${item.source === 'announcement' ? 'text-orange-500' : 'text-blue-500'}`} />}
                                                    title={displayTitle}
                                                    content={item.source === 'announcement' ? (item.content || 'Không có nội dung chi tiết.') : (item.message || 'Không có nội dung.')}
                                                    timestamp={new Date(item.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    attachments={item.attachments}
                                                    fileUrl={item.file_url}
                                                    videoUrl={item.video_url}
                                                    linkUrl={item.link_url}
                                                    onConfirm={annId ? () => handleConfirmRead(annId) : undefined}
                                                    isConfirmed={annId ? confirmedIds.has(annId) : false}
                                                    confirming={confirmingId === annId}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
            


            <InstallBanner />
        </div>
    );
}
