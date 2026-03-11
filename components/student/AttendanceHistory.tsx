"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    CheckCircle2, XCircle, Clock, FileText, Loader2,
    CalendarDays, TrendingUp,
} from "lucide-react";
import { getStudentAttendanceHistory } from "@/lib/actions/attendance";
import { calcAttendanceRate } from "@/lib/utils/attendance-rate";

interface AttendanceHistoryProps {
    studentId: string;
    studentName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
    present: { label: "Có mặt", color: "bg-emerald-100 text-emerald-800", dotColor: "bg-emerald-500" },
    absent: { label: "Vắng", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
    late: { label: "Đi trễ", color: "bg-amber-100 text-amber-800", dotColor: "bg-amber-500" },
    excused: { label: "Có phép", color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" },
};

export default function AttendanceHistory({ studentId, studentName }: AttendanceHistoryProps) {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<any[]>([]);

    useEffect(() => {
        loadHistory();
    }, [month, year, studentId]);

    const loadHistory = async () => {
        setLoading(true);
        const { data } = await getStudentAttendanceHistory(studentId, month, year);
        setRecords(data || []);
        setLoading(false);
    };

    // ---- Calendar computation ----
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun

    // Map: date string -> status
    const dateStatusMap: Record<string, string> = {};
    records.forEach((r: any) => {
        if (r.session) {
            dateStatusMap[r.session.session_date] = r.status;
        }
    });

    // Stats
    const totalSessions = records.length;
    const presentCount = records.filter((r: any) => r.status === "present").length;
    const absentCount = records.filter((r: any) => r.status === "absent").length;
    const lateCount = records.filter((r: any) => r.status === "late").length;
    const excusedCount = records.filter((r: any) => r.status === "excused").length;
    const attendanceRate = calcAttendanceRate(presentCount, lateCount, excusedCount, absentCount);

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="space-y-5">
            {/* Filter */}
            <div className="flex items-center gap-3">
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {months.map((m) => <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="ml-2 text-gray-500 text-sm">Đang tải...</span>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: "Có mặt", value: presentCount, color: "text-emerald-600", dot: "bg-emerald-500" },
                            { label: "Vắng", value: absentCount, color: "text-red-600", dot: "bg-red-500" },
                            { label: "Đi trễ", value: lateCount, color: "text-amber-600", dot: "bg-amber-500" },
                            { label: "Có phép", value: excusedCount, color: "text-blue-600", dot: "bg-blue-500" },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className={`w-2.5 h-2.5 rounded-full ${stat.dot}`} />
                                    <span className="text-xs text-gray-500">{stat.label}</span>
                                </div>
                                <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                            </div>
                        ))}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingUp className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">Chuyên cần</span>
                            </div>
                            <Badge className={attendanceRate >= 80
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-base font-bold"
                                : "bg-red-100 text-red-800 border-red-200 text-base font-bold"
                            }>
                                {attendanceRate}%
                            </Badge>
                        </div>
                    </div>

                    {/* Calendar View */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                            <CalendarDays className="w-4 h-4 text-indigo-500" />
                            Tháng {month}/{year}
                        </h4>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                                <div key={d} className="text-[10px] font-medium text-gray-400 py-1">{d}</div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Empty cells for first row offset */}
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-9" />
                            ))}

                            {/* Day cells */}
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const status = dateStatusMap[dateStr];
                                const cfg = status ? STATUS_CONFIG[status] : null;

                                return (
                                    <div
                                        key={day}
                                        className={`
                                            h-9 rounded-lg flex items-center justify-center text-xs font-medium
                                            cursor-default transition-all relative
                                            ${cfg ? cfg.color + " font-bold" : "text-gray-400 bg-gray-50"}
                                        `}
                                        title={cfg ? `${dateStr}: ${cfg.label}` : dateStr}
                                    >
                                        {day}
                                        {cfg && (
                                            <div className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
                                    {cfg.label}
                                </div>
                            ))}
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                                Không có buổi
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
