"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle, ChevronDown, ChevronRight, GraduationCap,
    Loader2, BarChart3, Mail, UserCircle, CheckCircle2, CalendarOff,
} from "lucide-react";
import { getTeacherAttendanceStats } from "@/lib/actions/attendance";
import TeacherBarChart from "../charts/TeacherBarChart";

interface Props {
    month: number;
    year: number;
}

export default function TeacherTab({ month, year }: Props) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, [month, year]);

    const loadData = async () => {
        setLoading(true);
        const { data: stats, error } = await getTeacherAttendanceStats(month, year);
        if (error) toast.error("Lỗi tải thống kê giáo viên");
        setData(stats || []);
        setLoading(false);
    };

    const toggleExpand = (teacherId: string) => {
        setExpandedTeachers(prev => {
            const next = new Set(prev);
            if (next.has(teacherId)) next.delete(teacherId);
            else next.add(teacherId);
            return next;
        });
    };

    const pendingTeachers = data.filter((t: any) => t.todayPending);

    // Chuẩn bị dữ liệu chart
    const chartData = data
        .filter((t: any) => t.totalSessionsConducted > 0 || t.totalSessionsExpected > 0)
        .slice(0, 10)
        .map((t: any) => ({
            name: t.teacherName.length > 12
                ? t.teacherName.slice(0, 12) + "…"
                : t.teacherName,
            conducted: t.totalSessionsConducted,
            expected: t.totalSessionsExpected,
            conductRate: t.conductRate,
        }));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border p-12 text-center">
                <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Chưa có dữ liệu</h3>
                <p className="text-gray-500 text-sm">
                    Không có giáo viên nào có buổi dạy trong tháng {month}/{year}.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Alert Banner */}
            {pendingTeachers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-amber-800 text-sm">
                            {pendingTeachers.length} giáo viên chưa điểm danh hôm nay
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {pendingTeachers.map((t: any) => (
                                <Badge
                                    key={t.teacherId}
                                    className="bg-amber-100 text-amber-700 border-amber-300 text-xs"
                                >
                                    {t.teacherName}
                                    {t.todayClasses.length > 0 && (
                                        <span className="ml-1 opacity-70">
                                            ({t.todayClasses.join(", ")})
                                        </span>
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* BarChart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-indigo-500" />
                            So sánh số buổi điểm danh
                        </h3>
                    </div>
                    <div className="p-4">
                        <TeacherBarChart data={chartData} />
                    </div>
                </div>
            )}

            {/* Teacher Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        Chi tiết theo giáo viên
                        <Badge className="ml-2 bg-gray-100 text-gray-600 border-0 text-xs">
                            {data.length} GV
                        </Badge>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/30">
                                <th className="w-8 px-3 py-3"></th>
                                <th className="text-left px-3 py-3 font-medium text-gray-500">Giáo viên</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">Số lớp</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">Buổi dạy</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">Nghỉ</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">Hoàn thành</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">Hôm nay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((t: any) => {
                                const isExpanded = expandedTeachers.has(t.teacherId);
                                return (
                                    <TeacherRow
                                        key={t.teacherId}
                                        teacher={t}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleExpand(t.teacherId)}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ===== Teacher Row Component =====
function TeacherRow({ teacher: t, isExpanded, onToggle }: {
    teacher: any;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <>
            <tr
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={onToggle}
            >
                <td className="w-8 px-3 py-3">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                </td>
                <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {t.avatarUrl ? (
                                <img src={t.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <UserCircle className="w-5 h-5 text-indigo-500" />
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{t.teacherName}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {t.teacherEmail}
                            </p>
                        </div>
                    </div>
                </td>
                <td className="text-center px-3 py-3 font-semibold text-gray-700">
                    {t.totalClasses}
                </td>
                <td className="text-center px-3 py-3">
                    <span className="font-bold text-indigo-600">{t.totalSessionsConducted}</span>
                    {t.totalSessionsExpected > 0 && (
                        <span className="text-gray-400 text-xs ml-1">/{t.totalSessionsExpected}</span>
                    )}
                </td>
                <td className="text-center px-3 py-3">
                    {t.leaveCount > 0 ? (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs">
                            <CalendarOff className="w-3 h-3 mr-0.5" />
                            {t.leaveCount}
                        </Badge>
                    ) : (
                        <span className="text-gray-300 text-xs">0</span>
                    )}
                </td>
                <td className="text-center px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    t.conductRate >= 80 ? "bg-emerald-500"
                                        : t.conductRate >= 50 ? "bg-amber-500"
                                        : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(t.conductRate, 100)}%` }}
                            />
                        </div>
                        <Badge className={
                            t.conductRate >= 80
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : t.conductRate >= 50
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-red-100 text-red-800 border-red-200"
                        }>
                            {t.conductRate}%
                        </Badge>
                    </div>
                </td>
                <td className="text-center px-3 py-3">
                    {t.todayPending ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse text-xs">
                            ⏳ Chưa ĐD
                        </Badge>
                    ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    )}
                </td>
            </tr>

            {/* Expanded Class Details */}
            {isExpanded && (
                <tr>
                    <td colSpan={7} className="p-0">
                        <div className="bg-gray-50/80 border-t border-gray-100 px-8 py-3 animate-in slide-in-from-top-1 duration-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Danh sách lớp phụ trách
                            </p>
                            <div className="space-y-2">
                                {t.classes.map((cls: any) => (
                                    <div
                                        key={cls.classId}
                                        className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100 hover:border-indigo-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                            <span className="font-medium text-gray-700 text-sm">
                                                {cls.className}
                                            </span>
                                            {cls.classStatus === "active" && (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">
                                                    Đang hoạt động
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-5 text-sm">
                                            <div className="text-center">
                                                <span className="text-xs text-gray-400 block">Buổi dạy</span>
                                                <span className="font-bold text-indigo-600">
                                                    {cls.totalSessions}
                                                    {cls.expectedSessions > 0 && (
                                                        <span className="text-gray-300 font-normal text-xs">/{cls.expectedSessions}</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="text-center">
                                                <span className="text-xs text-gray-400 block">HS có mặt</span>
                                                <span className="font-bold text-emerald-600">{cls.presentCount}</span>
                                                <span className="text-gray-300 font-normal text-xs">/{cls.totalRecords}</span>
                                            </div>
                                            <div className="text-center min-w-[60px]">
                                                <span className="text-xs text-gray-400 block">TB chuyên cần</span>
                                                <Badge className={
                                                    cls.avgAttendanceRate >= 80
                                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                        : cls.avgAttendanceRate >= 60
                                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                }>
                                                    {cls.avgAttendanceRate}%
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Taught_at Timeline */}
                            {t.taughtSessions && t.taughtSessions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        ⏰ Thời gian điểm danh gần nhất
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                        {t.taughtSessions
                                            .sort((a: any, b: any) => b.date.localeCompare(a.date))
                                            .slice(0, 6)
                                            .map((ts: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2 bg-white rounded px-3 py-1.5 border border-gray-100 text-xs">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${ts.teachingStatus === 'substitute' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                                                    <span className="text-gray-700 font-medium">
                                                        {new Date(ts.date + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                                                    </span>
                                                    <span className="text-gray-400">{ts.className}</span>
                                                    <span className="ml-auto text-gray-500 font-mono">
                                                        {ts.taughtAt
                                                            ? new Date(ts.taughtAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                                                            : "—"}
                                                    </span>
                                                    {ts.teachingStatus === 'substitute' && (
                                                        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[9px] py-0 h-4">Thay</Badge>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
