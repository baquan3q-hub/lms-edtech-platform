"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchParentDashboardData } from "@/lib/actions/parentStudent";
import {
    GraduationCap, CalendarDays, FileText, Bell, TrendingUp,
    CheckCircle2, XCircle, Clock, UserPlus, Loader2, BookOpen,
    MessageSquare, AlertTriangle, ArrowRight
} from "lucide-react";
import { parseISO, format } from "date-fns";
import { vi } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import UpcomingSessionsWidget from "@/components/shared/UpcomingSessionsWidget";
import AbsenceRequestModal from "@/components/shared/AbsenceRequestModal";
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
    
    // Schedule state: default 3 (1 past + 2 upcoming)
    const [visibleScheduleCount, setVisibleScheduleCount] = useState(3);
    const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
    const [selectedSessionForAbsence, setSelectedSessionForAbsence] = useState<{ class_id: string, class_name: string, session_date: string } | null>(null);
    const [feedbackData, setFeedbackData] = useState<any[]>([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    useEffect(() => {
        if (selectedStudentId) {
            loadDashboard(selectedStudentId);
        }
    }, [selectedStudentId]);

    const loadDashboard = async (studentId: string) => {
        setLoading(true);
        try {
            const dashRes = await fetchParentDashboardData(studentId);
            setDashboardData(dashRes.data);
            setVisibleScheduleCount(4); // Reset view more state
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        // Load feedback
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

    const handleOpenAbsenceModal = (session: any) => {
        setSelectedSessionForAbsence({
            class_id: session.class_id,
            class_name: session.class_name || session.class?.name || "Lớp học",
            session_date: session.session_date
        });
        setIsAbsenceModalOpen(true);
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



            {/* Lịch học sắp tới */}
            {!loading && dashboardData && dashboardData.upcomingSessions && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <div className="p-5 border-b border-slate-100 rounded-t-2xl flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-indigo-500" /> Lịch học sắp tới
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">1 buổi gần nhất đã qua + 2 buổi tiếp theo</p>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5">
                        <UpcomingSessionsWidget 
                            sessions={dashboardData.upcomingSessions || []} 
                            limit={visibleScheduleCount}
                            onSessionClick={handleOpenAbsenceModal} 
                        />
                        
                        <div className="mt-4 flex items-center justify-center gap-3">
                            {(dashboardData.upcomingSessions?.length || 0) > visibleScheduleCount && (
                                <Button 
                                    variant="outline" 
                                    className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 border-dashed text-sm"
                                    onClick={() => setVisibleScheduleCount(prev => prev + 3)}
                                >
                                    Xem thêm lịch học
                                </Button>
                            )}
                            {visibleScheduleCount > 3 && (
                                <Button 
                                    variant="ghost" 
                                    className="text-slate-500 hover:text-slate-700 text-sm"
                                    onClick={() => setVisibleScheduleCount(3)}
                                >
                                    Thu gọn
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Nhận xét bài kiểm tra */}
            {!loading && !feedbackLoading && feedbackData.length > 0 && (
                <div className="bg-white rounded-2xl border border-purple-200 shadow-sm mb-6 overflow-hidden">
                    <div className="p-5 border-b border-purple-100 bg-purple-50/50">
                        <h3 className="font-bold text-purple-800 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" /> Nhận xét bài kiểm tra
                        </h3>
                        <p className="text-xs text-purple-600 mt-1">Giáo viên đã gửi nhận xét và bài tập cải thiện</p>
                    </div>
                    <div className="p-4 space-y-4">
                        {feedbackData.map((analysis: any) => {
                            const examObj = Array.isArray(analysis.exam) ? analysis.exam[0] : analysis.exam;
                            const progress = analysis.improvement_progress || [];
                            const totalTasks = progress.length;
                            const completedTasks = progress.filter((p: any) => p.status === 'completed').length;
                            const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                            const feedbackText = analysis.teacher_edited_feedback || analysis.ai_feedback || "";
                            const supQuizzes = analysis.supplementary_quizzes || [];

                            // Tính điểm quiz cải thiện
                            let quizScore = 0, quizTotal = 0;
                            progress.forEach((p: any) => {
                                if (p.quiz_score !== null && p.quiz_total !== null) {
                                    quizScore += p.quiz_score;
                                    quizTotal += p.quiz_total;
                                }
                            });

                            const deadline = analysis.deadline ? new Date(analysis.deadline) : null;
                            const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

                            return (
                                <div key={analysis.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">📝 {examObj?.title || 'Bài kiểm tra'}</p>
                                        </div>
                                        {daysLeft !== null && (
                                            <Badge className={`text-[9px] ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} border-none shrink-0`}>
                                                <Clock className="w-2.5 h-2.5 mr-0.5" /> Còn {daysLeft} ngày
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Nhận xét */}
                                    {feedbackText && (
                                        <div className="bg-white border border-purple-100 rounded-lg p-3 mb-3">
                                            <p className="text-xs text-purple-700 font-semibold mb-1 flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" /> Nhận xét của giáo viên:
                                            </p>
                                            <div className="text-xs text-slate-600 leading-relaxed prose prose-sm max-w-none prose-p:mb-2 prose-pre:bg-slate-100">
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{feedbackText}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    {/* Kiến thức hổng */}
                                    {analysis.knowledge_gaps && analysis.knowledge_gaps.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                                                <AlertTriangle className="w-3 h-3" /> Kiến thức cần cải thiện:
                                            </span>
                                            {analysis.knowledge_gaps.map((gap: string, i: number) => (
                                                <Badge key={i} className="bg-red-50 text-red-700 border-none text-[9px]">🔴 {formatKnowledgeGap(gap)}</Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tiến độ */}
                                    <div className="mb-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-slate-600">📚 Tiến độ bài tập: {completedTasks}/{totalTasks}</span>
                                            <span className="text-[10px] font-bold text-indigo-600">{progressPercent}%</span>
                                        </div>
                                        <Progress value={progressPercent} className="h-2" />
                                    </div>

                                    {/* Điểm mini quiz */}
                                    {quizTotal > 0 && (
                                        <p className="text-[10px] text-slate-500 mb-2">
                                            ✅ Điểm mini quiz: <span className="font-bold text-emerald-600">{quizScore}/{quizTotal}</span>
                                        </p>
                                    )}

                                    {/* Bài quiz bổ trợ */}
                                    {supQuizzes.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                            {supQuizzes.map((sq: any) => (
                                                <div key={sq.id} className="flex items-center justify-between text-[10px] bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5">
                                                    <span className="text-purple-800 font-medium">📝 {sq.title}</span>
                                                    {sq.status === 'completed' ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px]">
                                                            ✅ {sq.score}/{sq.total_questions}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-50 text-amber-700 border-none text-[9px]">
                                                            ⏳ Chưa làm
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Trạng thái tổng */}
                                    {completedTasks === totalTasks && totalTasks > 0 ? (
                                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Con đã hoàn thành tất cả bài tập!
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                                            <Clock className="w-3.5 h-3.5" /> Con chưa hoàn thành hết bài tập cải thiện
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            )}

            {/* Dashboard Content */}
            {!loading && dashboardData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Removed Section A (Tổng quan), Section A2 (Lớp đang học), Section B (Điểm số gần đây) */}

                    {/* Section C: Điểm danh tháng */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-emerald-50/50">
                            <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" /> Điểm danh tháng {new Date().getMonth() + 1}
                            </h3>
                        </div>
                        <div className="p-4">
                            {dashboardData.attendance.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu điểm danh.</p>
                            ) : (
                                <div className="grid grid-cols-7 gap-1.5">
                                    {/* Day labels */}
                                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
                                        <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
                                    ))}
                                    {/* Calendar cells */}
                                    {(() => {
                                        const now = new Date();
                                        const year = now.getFullYear();
                                        const month = now.getMonth();
                                        const firstDay = new Date(year, month, 1);
                                        const lastDay = new Date(year, month + 1, 0);
                                        const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

                                        const cells: any[] = [];
                                        // Empty cells before first day
                                        for (let i = 0; i < startDayOfWeek; i++) {
                                            cells.push(<div key={`empty-${i}`} />);
                                        }
                                        // Day cells
                                        for (let day = 1; day <= lastDay.getDate(); day++) {
                                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const record = dashboardData.attendance.find((a: any) => a.date === dateStr);
                                            let bgColor = "bg-slate-100 text-slate-400";
                                            let icon = null;
                                            if (record) {
                                                if (record.status === "present") {
                                                    bgColor = "bg-emerald-100 text-emerald-700";
                                                    icon = <CheckCircle2 className="w-3 h-3" />;
                                                } else if (record.status === "absent") {
                                                    bgColor = "bg-rose-100 text-rose-700";
                                                    icon = <XCircle className="w-3 h-3" />;
                                                } else if (record.status === "excused") {
                                                    bgColor = "bg-amber-100 text-amber-700";
                                                    icon = <Clock className="w-3 h-3" />;
                                                }
                                            }
                                            cells.push(
                                                <div key={day} className={`${bgColor} rounded-lg p-1.5 text-center text-[11px] font-medium flex flex-col items-center gap-0.5`}>
                                                    {day}
                                                    {icon}
                                                </div>
                                            );
                                        }
                                        return cells;
                                    })()}
                                </div>
                            )}
                            {/* Legend */}
                            <div className="flex gap-4 justify-center mt-4 pt-3 border-t border-slate-100">
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <span className="w-3 h-3 bg-emerald-100 rounded-sm inline-block" /> Có mặt
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <span className="w-3 h-3 bg-rose-100 rounded-sm inline-block" /> Vắng
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <span className="w-3 h-3 bg-amber-100 rounded-sm inline-block" /> Có phép
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section D: Thông báo */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden col-span-full">
                        <div className="p-5 border-b border-slate-100 bg-blue-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                <Bell className="w-5 h-5" /> Thông báo từ giáo viên
                            </h3>
                            {selectedStudentId && (
                                <Link href={`/parent/children/${selectedStudentId}/announcements`}>
                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs font-semibold">
                                        Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                        <div className="p-4">
                            {dashboardData.announcements.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Chưa có thông báo nào.</p>
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
                </div>
            )}

            <AbsenceRequestModal 
                isOpen={isAbsenceModalOpen} 
                onClose={() => setIsAbsenceModalOpen(false)} 
                session={selectedSessionForAbsence} 
                studentId={selectedStudentId || ""} 
            />
        </div>
    );
}
