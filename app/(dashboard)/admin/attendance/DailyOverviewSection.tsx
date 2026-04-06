"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CalendarDays, ChevronLeft, ChevronRight, Loader2,
    CheckCircle2, XCircle, Clock, Shield, School,
    MapPin, UserCircle, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import { getDailyAttendanceOverview, getAttendanceRecords } from "@/lib/actions/attendance";

const WEEKDAY_NAMES = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function formatDateVN(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const weekday = WEEKDAY_NAMES[d.getDay()];
    return { weekday, formatted: `${day}/${month}/${year}` };
}

function toDateStr(d: Date) {
    return d.toISOString().split("T")[0];
}

export default function DailyOverviewSection() {
    const [date, setDate] = useState(toDateStr(new Date()));
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<Record<string, any[]>>({});
    const [studentLoading, setStudentLoading] = useState<string | null>(null);

    useEffect(() => {
        loadDaily();
    }, [date]);

    const loadDaily = async () => {
        setLoading(true);
        setExpandedClass(null);
        const { data: result, error } = await getDailyAttendanceOverview(date);
        if (error) toast.error("Lỗi tải dữ liệu theo ngày");
        setData(result);
        setLoading(false);
    };

    const navigateDate = (delta: number) => {
        const d = new Date(date + "T00:00:00");
        d.setDate(d.getDate() + delta);
        setDate(toDateStr(d));
    };

    const goToday = () => setDate(toDateStr(new Date()));

    const handleExpandClass = async (classId: string, sessionId: string | null) => {
        if (expandedClass === classId) {
            setExpandedClass(null);
            return;
        }
        setExpandedClass(classId);
        if (!sessionId) return; // Chưa ĐD → không có data

        // Nếu đã cache thì không fetch lại
        if (studentData[sessionId]) return;

        setStudentLoading(classId);
        const { data: records, error } = await getAttendanceRecords(sessionId);
        if (!error && records) {
            setStudentData(prev => ({ ...prev, [sessionId]: records }));
        }
        setStudentLoading(null);
    };

    const { weekday, formatted } = formatDateVN(date);
    const isToday = date === toDateStr(new Date());

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header + Date Nav */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-cyan-50/50">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                        Lớp học trong ngày
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigateDate(-1)}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="text-center min-w-[160px] flex flex-col items-center">
                            <p className="text-sm font-semibold text-gray-800">{weekday}</p>
                            <div className="relative inline-flex items-center mt-0.5 group">
                                <label className="cursor-pointer flex items-center gap-1.5 hover:bg-gray-100 rounded px-2 py-0.5 transition-colors">
                                    <span className="text-xs text-gray-500 group-hover:text-gray-700">{formatted}</span>
                                    <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                                    <input 
                                        type="date"
                                        value={date}
                                        onChange={(e) => {
                                            if (e.target.value) setDate(e.target.value);
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    />
                                </label>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigateDate(1)}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        {!isToday && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={goToday}
                            >
                                Hôm nay
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary badges */}
                {data && !loading && (
                    <div className="flex gap-3 mt-3">
                        <SummaryBadge
                            icon={<School className="w-3.5 h-3.5" />}
                            label="Tổng lớp"
                            value={data.totalClasses}
                            color="slate"
                        />
                        <SummaryBadge
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            label="Đã ĐD"
                            value={data.completedCount}
                            color="emerald"
                        />
                        <SummaryBadge
                            icon={<Clock className="w-3.5 h-3.5" />}
                            label="Chưa ĐD"
                            value={data.pendingCount}
                            color={data.pendingCount > 0 ? "amber" : "slate"}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                ) : !data || data.totalClasses === 0 ? (
                    <div className="text-center py-10">
                        <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="font-semibold text-gray-600">Hôm nay chưa có dữ liệu</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Không có lớp nào được xếp lịch vào {weekday.toLowerCase()}, {formatted}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.classes.map((cls: any) => {
                            const isExpanded = expandedClass === cls.classId;
                            const stats = cls.attendanceStats;
                            const rate = stats && stats.total > 0
                                ? Math.round((stats.present / stats.total) * 100)
                                : null;

                            // Tìm sessionId cho class trong ngày
                            const sessionForStudents = cls.hasSession ? cls.classId : null;
                            // Lookup session from the daily data
                            // getDailyAttendanceOverview doesn't return sessionId directly,
                            // we need it for getAttendanceRecords. Let's use classId + date to find it.
                            // Actually, we need to get session_id. Let's store it in data if available.

                            return (
                                <div key={cls.classId} className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors">
                                    {/* Class Header */}
                                    <div
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                            isExpanded ? "bg-indigo-50/50" : "hover:bg-gray-50/50"
                                        }`}
                                        onClick={() => handleExpandClass(cls.classId, cls.sessionId || null)}
                                    >
                                        {/* Time */}
                                        <div className="text-center shrink-0 w-[70px]">
                                            <p className="text-sm font-bold text-indigo-600">{cls.startTime}</p>
                                            <p className="text-[10px] text-gray-400">{cls.endTime}</p>
                                        </div>

                                        {/* Divider */}
                                        <div className={`w-0.5 h-10 rounded-full shrink-0 ${
                                            cls.hasSession && stats
                                                ? rate! >= 80 ? "bg-emerald-400" : rate! >= 60 ? "bg-amber-400" : "bg-red-400"
                                                : "bg-gray-200"
                                        }`} />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-800 truncate">{cls.className}</p>
                                                {cls.source === "extra" && (
                                                    <Badge className="bg-indigo-100 text-indigo-600 border-indigo-200 text-[10px] px-1.5 shrink-0">
                                                        <Zap className="w-3 h-3 mr-0.5" />Bù
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <UserCircle className="w-3 h-3" />
                                                    {cls.teacherName}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {cls.roomName}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status + Stats */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            {cls.hasSession && stats ? (
                                                <>
                                                    {/* Mini stats */}
                                                    <div className="hidden sm:flex items-center gap-2 text-xs">
                                                        <span className="text-emerald-600 font-bold">{stats.present}</span>
                                                        <span className="text-gray-300">/</span>
                                                        <span className="text-gray-500">{stats.total}</span>
                                                    </div>
                                                    <Badge className={
                                                        rate! >= 80
                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                            : rate! >= 60
                                                            ? "bg-amber-100 text-amber-700 border-amber-200"
                                                            : "bg-red-100 text-red-700 border-red-200"
                                                    }>
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        {rate}%
                                                    </Badge>
                                                </>
                                            ) : (
                                                <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Chưa ĐD
                                                </Badge>
                                            )}
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-300" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded: Attendance details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 animate-in slide-in-from-top-1 duration-200">
                                            {!cls.hasSession || !stats ? (
                                                <p className="text-sm text-gray-400 text-center py-3">
                                                    Giáo viên chưa điểm danh cho buổi này
                                                </p>
                                            ) : (
                                                <>
                                                    {/* Stats row */}
                                                    <div className="flex gap-4 mb-3">
                                                        <MiniStat label="Có mặt" value={stats.present} color="emerald" />
                                                        <MiniStat label="Vắng" value={stats.absent} color="red" />
                                                        <MiniStat label="Trễ" value={stats.late} color="amber" />
                                                        <MiniStat label="Có phép" value={stats.excused} color="blue" />
                                                    </div>

                                                    {/* Student list */}
                                                    {studentLoading === cls.classId ? (
                                                        <div className="flex justify-center py-3">
                                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                                        </div>
                                                    ) : cls.sessionId && studentData[cls.sessionId] ? (
                                                        <div>
                                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                                Danh sách học sinh
                                                            </p>
                                                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                                {studentData[cls.sessionId].map((rec: any) => {
                                                                    const st = Array.isArray(rec.student) ? rec.student[0] : rec.student;
                                                                    return (
                                                                        <div
                                                                            key={rec.id}
                                                                            className="flex items-center justify-between bg-white rounded-md px-2.5 py-1.5 border border-gray-100 text-sm"
                                                                        >
                                                                            <span className="text-gray-700 truncate mr-2">
                                                                                {st?.full_name || rec.student_id?.slice(0, 8)}
                                                                            </span>
                                                                            <StatusBadge status={rec.status} />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 text-center py-2">
                                                            Nhấn để xem chi tiết học sinh
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ===== Sub-components =====

function SummaryBadge({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: number; color: string;
}) {
    const colorMap: Record<string, string> = {
        slate: "bg-gray-100 text-gray-700",
        emerald: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
    };
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${colorMap[color] || colorMap.slate}`}>
            {icon}
            <span>{label}:</span>
            <span className="font-bold">{value}</span>
        </div>
    );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        emerald: "text-emerald-600", red: "text-red-600",
        amber: "text-amber-600", blue: "text-blue-600",
    };
    return (
        <div className="text-center">
            <p className={`text-lg font-black ${colorMap[color] || "text-gray-600"}`}>{value}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        present: { label: "✓ Có mặt", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
        absent: { label: "✗ Vắng", className: "bg-red-100 text-red-700 border-red-200" },
        late: { label: "⏰ Trễ", className: "bg-amber-100 text-amber-700 border-amber-200" },
        excused: { label: "📋 Có phép", className: "bg-blue-100 text-blue-700 border-blue-200" },
    };
    const c = config[status] || config.present;
    return <Badge className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}
