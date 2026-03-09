"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    GraduationCap, CalendarDays, FileText, Bell, TrendingUp,
    CheckCircle2, XCircle, Clock, UserPlus, Loader2, BookOpen
} from "lucide-react";
import { fetchParentDashboardData } from "@/lib/actions/parentStudent";
import SessionAccordionList from "@/components/parent/SessionAccordionList";

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

    useEffect(() => {
        if (selectedStudentId) {
            loadDashboard(selectedStudentId);
        }
    }, [selectedStudentId]);

    const loadDashboard = async (studentId: string) => {
        setLoading(true);
        const res = await fetchParentDashboardData(studentId);
        setDashboardData(res.data);
        setLoading(false);
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

            {/* Quick Actions cho Student đã chọn */}
            {selectedStudent && (
                <div className="flex flex-wrap gap-3">
                    <Link href={`/parent/children/${selectedStudent.id}/schedule`}>
                        <Button className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm" variant="outline">
                            <CalendarDays className="w-4 h-4 mr-2" /> Xem Lịch học & Xin nghỉ
                        </Button>
                    </Link>
                    <Link href={`/parent/children/${selectedStudent.id}/progress`}>
                        <Button className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-sm" variant="outline">
                            <TrendingUp className="w-4 h-4 mr-2" /> Xem Điểm số & Tiến độ
                        </Button>
                    </Link>
                </div>
            )}

            {/* Lịch học các buổi thực tế (Session Accordion) — Hiển thị ngoài dashboard */}
            {!loading && dashboardData && dashboardData.upcomingSessions && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <div className="p-5 border-b border-slate-100 bg-blue-50/50 rounded-t-2xl">
                        <h3 className="font-bold text-blue-800 flex items-center gap-2">
                            <CalendarDays className="w-5 h-5" /> Lịch học của con
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Danh sách các buổi học và trạng thái điểm danh</p>
                    </div>
                    <div className="p-4 sm:p-5 bg-slate-50/30">
                        <SessionAccordionList
                            sessions={dashboardData.upcomingSessions}
                            emptyMessage="Học sinh chưa có buổi học nào được xếp."
                        />
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

                    {/* Section A: Tổng quan */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 col-span-full">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-amber-500" /> Tổng quan
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl text-center">
                                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                                    {dashboardData.recentExams.length}
                                </p>
                                <p className="text-[11px] sm:text-xs text-indigo-500 font-medium mt-1">Bài KT đã làm</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl text-center">
                                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                                    {dashboardData.attendanceSummary.present}
                                </p>
                                <p className="text-[11px] sm:text-xs text-emerald-500 font-medium mt-1">Buổi có mặt</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl text-center">
                                <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                                    {dashboardData.attendanceSummary.total - dashboardData.attendanceSummary.present}
                                </p>
                                <p className="text-[11px] sm:text-xs text-rose-500 font-medium mt-1">Buổi vắng</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center">
                                <p className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                                    {(dashboardData.classes || []).length}
                                </p>
                                <p className="text-[11px] sm:text-xs text-blue-500 font-medium mt-1">Lớp đang học</p>
                            </div>
                        </div>
                    </div>

                    {/* Section A2: Lớp đang học */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden col-span-full">
                        <div className="p-5 border-b border-slate-100 bg-blue-50/50">
                            <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                <BookOpen className="w-5 h-5" /> Lớp đang học
                            </h3>
                        </div>
                        <div className="p-4">
                            {(dashboardData.classes || []).length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">Chưa đăng ký lớp nào.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(dashboardData.classes || []).map((cls: any) => {
                                        const teacherObj = cls?.teacher;
                                        const teacherName = Array.isArray(teacherObj) ? teacherObj[0]?.full_name : teacherObj?.full_name;
                                        return (
                                            <div key={cls?.id} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                                    <BookOpen className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-slate-800 truncate">{cls?.name || "—"}</p>
                                                    <p className="text-xs text-slate-400">GV: {teacherName || "—"}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section B: Điểm số gần đây */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-indigo-50/50">
                            <h3 className="font-bold text-indigo-800 flex items-center gap-2">
                                <FileText className="w-5 h-5" /> Điểm kiểm tra gần đây
                            </h3>
                        </div>
                        <div className="p-4">
                            {dashboardData.recentExams.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Chưa có bài kiểm tra nào.</p>
                            ) : (
                                <div className="space-y-2">
                                    {dashboardData.recentExams.map((exam: any) => {
                                        const ratio = exam.total_points ? (exam.score / exam.total_points) : 0;
                                        return (
                                            <div key={exam.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">
                                                        {exam.exam?.title || "Bài kiểm tra"}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {exam.submitted_at ? new Date(exam.submitted_at).toLocaleDateString("vi-VN") : ""}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-extrabold ${ratio >= 0.7 ? "text-emerald-600" :
                                                        ratio >= 0.5 ? "text-amber-600" : "text-rose-600"
                                                        }`}>
                                                        {exam.score}/{exam.total_points || 0}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {Math.round(ratio * 100)}%
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

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
                        <div className="p-5 border-b border-slate-100 bg-blue-50/50">
                            <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                <Bell className="w-5 h-5" /> Thông báo từ giáo viên
                            </h3>
                        </div>
                        <div className="p-4">
                            {dashboardData.announcements.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Chưa có thông báo nào.</p>
                            ) : (
                                <div className="space-y-3">
                                    {dashboardData.announcements.map((ann: any) => (
                                        <div key={ann.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-800 text-sm">{ann.title}</p>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ann.content}</p>
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0 ml-4">
                                                    {ann.created_at ? new Date(ann.created_at).toLocaleDateString("vi-VN") : ""}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
