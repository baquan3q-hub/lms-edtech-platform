"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    School, Loader2, CalendarDays, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Clock, Shield, Users,
} from "lucide-react";
import {
    getAllClassesForAdmin,
    getAttendanceTrendData,
} from "@/lib/actions/attendance";
import { getClassAttendanceSessions } from "@/lib/actions/attendance-points";
import StatusDistChart from "../charts/StatusDistChart";

interface Props {
    month: number;
    year: number;
}

export default function ClassDetailTab({ month, year }: Props) {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [loading, setLoading] = useState(true);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

    // Stats tổng hợp cho lớp đã chọn
    const [classStats, setClassStats] = useState({
        present: 0, absent: 0, late: 0, excused: 0, total: 0,
        totalSessions: 0, avgRate: 0,
    });

    // Load classes danh sách
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data } = await getAllClassesForAdmin();
            setClasses(data || []);
            setLoading(false);
        };
        load();
    }, []);

    // Load sessions khi chọn lớp
    useEffect(() => {
        if (!selectedClassId) return;
        loadClassSessions();
    }, [selectedClassId, month, year]);

    const loadClassSessions = async () => {
        setSessionsLoading(true);
        const { data: sessData, error } = await getClassAttendanceSessions(selectedClassId, month, year);
        if (error) toast.error("Lỗi tải buổi điểm danh");
        const allSess = sessData || [];
        setSessions(allSess);

        // Tính tổng stats
        let present = 0, absent = 0, late = 0, excused = 0, total = 0;
        for (const s of allSess) {
            present += s.presentCount || 0;
            absent += s.absentCount || 0;
            late += s.lateCount || 0;
            excused += s.excusedCount || 0;
            total += s.totalStudents || 0;
        }
        const avgRate = total > 0 ? Math.round((present / total) * 100) : 0;
        setClassStats({ present, absent, late, excused, total, totalSessions: allSess.length, avgRate });
        setSessionsLoading(false);
    };

    const toggleSession = (sessionId: string) => {
        setExpandedSessions(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) next.delete(sessionId);
            else next.add(sessionId);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Class Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Chọn lớp học</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="— Chọn lớp để xem chi tiết —" />
                    </SelectTrigger>
                    <SelectContent>
                        {classes.map((c: any) => {
                            const teacherName = Array.isArray(c.teacher)
                                ? c.teacher[0]?.full_name
                                : c.teacher?.full_name;
                            return (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name} {teacherName ? `(${teacherName})` : ""}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Nếu chưa chọn lớp */}
            {!selectedClassId && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
                    <School className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-700">Chọn lớp để bắt đầu</h3>
                    <p className="text-gray-400 text-sm">Chọn một lớp từ dropdown ở trên để xem chi tiết điểm danh.</p>
                </div>
            )}

            {/* Loading */}
            {selectedClassId && sessionsLoading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
            )}

            {/* Đã chọn + có data */}
            {selectedClassId && !sessionsLoading && (
                <>
                    {/* Stats + PieChart Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Mini Stats */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Thống kê lớp — Tháng {month}/{year}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <MiniStat icon={<CalendarDays className="w-4 h-4 text-slate-500" />} label="Tổng buổi" value={classStats.totalSessions} color="slate" />
                                <MiniStat icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="TB chuyên cần" value={`${classStats.avgRate}%`} color={classStats.avgRate >= 80 ? "emerald" : "red"} />
                                <MiniStat icon={<Users className="w-4 h-4 text-indigo-500" />} label="Lượt có mặt" value={classStats.present} color="indigo" />
                                <MiniStat icon={<XCircle className="w-4 h-4 text-red-500" />} label="Lượt vắng" value={classStats.absent} color="red" />
                            </div>
                        </div>

                        {/* PieChart */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Phân bố trạng thái
                            </h4>
                            <StatusDistChart
                                present={classStats.present}
                                absent={classStats.absent}
                                late={classStats.late}
                                excused={classStats.excused}
                            />
                        </div>
                    </div>

                    {/* Sessions Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-indigo-500" />
                                Lịch sử buổi điểm danh
                                <Badge className="ml-2 bg-gray-100 text-gray-600 border-0 text-xs">
                                    {sessions.length} buổi
                                </Badge>
                            </h3>
                        </div>
                        {sessions.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                Không có buổi điểm danh nào trong tháng {month}/{year}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/30">
                                            <th className="w-8 px-3 py-3"></th>
                                            <th className="text-left px-3 py-3 font-medium text-gray-500">Ngày</th>
                                            <th className="text-left px-3 py-3 font-medium text-gray-500">GV</th>
                                            <th className="text-center px-3 py-3 font-medium text-gray-500">
                                                <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-500" />
                                            </th>
                                            <th className="text-center px-3 py-3 font-medium text-gray-500">
                                                <XCircle className="w-3.5 h-3.5 inline text-red-500" />
                                            </th>
                                            <th className="text-center px-3 py-3 font-medium text-gray-500">
                                                <Clock className="w-3.5 h-3.5 inline text-amber-500" />
                                            </th>
                                            <th className="text-center px-3 py-3 font-medium text-gray-500">
                                                <Shield className="w-3.5 h-3.5 inline text-blue-500" />
                                            </th>
                                            <th className="text-center px-3 py-3 font-medium text-gray-500">Tổng</th>
                                            <th className="text-center px-3 py-3 font-medium text-gray-500">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.map((sess: any) => {
                                            const isExpanded = expandedSessions.has(sess.id);
                                            const dateStr = new Date(sess.session_date + "T00:00:00").toLocaleDateString("vi-VN", {
                                                weekday: "short", day: "2-digit", month: "2-digit",
                                            });
                                            const rate = sess.totalStudents > 0
                                                ? Math.round((sess.presentCount / sess.totalStudents) * 100)
                                                : 0;

                                            return (
                                                <SessionRow
                                                    key={sess.id}
                                                    sess={sess}
                                                    dateStr={dateStr}
                                                    rate={rate}
                                                    isExpanded={isExpanded}
                                                    onToggle={() => toggleSession(sess.id)}
                                                />
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ===== Session Row with expand =====
function SessionRow({ sess, dateStr, rate, isExpanded, onToggle }: {
    sess: any; dateStr: string; rate: number; isExpanded: boolean; onToggle: () => void;
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
                    <span className="font-medium text-gray-800">{dateStr}</span>
                    {sess.start_time && (
                        <span className="text-xs text-gray-400 ml-2">{sess.start_time.slice(0, 5)}</span>
                    )}
                </td>
                <td className="px-3 py-3 text-gray-600">{sess.teacherName || "—"}</td>
                <td className="text-center px-3 py-3 text-emerald-600 font-bold">{sess.presentCount}</td>
                <td className="text-center px-3 py-3">
                    <span className={sess.absentCount > 0 ? "text-red-600 font-bold" : "text-gray-300"}>
                        {sess.absentCount}
                    </span>
                </td>
                <td className="text-center px-3 py-3">
                    <span className={sess.lateCount > 0 ? "text-amber-600 font-bold" : "text-gray-300"}>
                        {sess.lateCount}
                    </span>
                </td>
                <td className="text-center px-3 py-3">
                    <span className={sess.excusedCount > 0 ? "text-blue-600 font-bold" : "text-gray-300"}>
                        {sess.excusedCount || 0}
                    </span>
                </td>
                <td className="text-center px-3 py-3 text-gray-700 font-semibold">{sess.totalStudents}</td>
                <td className="text-center px-3 py-3">
                    <Badge className={
                        rate >= 80
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : rate >= 60
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-red-100 text-red-800 border-red-200"
                    }>
                        {rate}%
                    </Badge>
                </td>
            </tr>

            {/* Expanded: Student list for this session */}
            {isExpanded && sess.students && (
                <tr>
                    <td colSpan={9} className="p-0">
                        <div className="bg-gray-50/80 border-t border-gray-100 px-8 py-3 animate-in slide-in-from-top-1 duration-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Danh sách học sinh
                            </p>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {sess.students.map((st: any) => (
                                    <div
                                        key={st.studentId || st.student_id}
                                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100"
                                    >
                                        <span className="text-sm text-gray-700 truncate">
                                            {st.studentName || st.student_name || st.student_id?.slice(0, 8)}
                                        </span>
                                        <Badge className={
                                            st.status === "present" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                : st.status === "absent" ? "bg-red-100 text-red-700 border-red-200"
                                                : st.status === "late" ? "bg-amber-100 text-amber-700 border-amber-200"
                                                : "bg-blue-100 text-blue-700 border-blue-200"
                                        }>
                                            {st.status === "present" ? "✓ Có mặt"
                                                : st.status === "absent" ? "✗ Vắng"
                                                : st.status === "late" ? "⏰ Trễ"
                                                : "📋 Có phép"
                                            }
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}

            {/* Expanded nhưng chưa có students (chưa fetch) */}
            {isExpanded && !sess.students && (
                <tr>
                    <td colSpan={9} className="p-0">
                        <div className="bg-gray-50/80 border-t border-gray-100 px-8 py-6 text-center text-gray-400 text-sm">
                            Chi tiết học sinh sẽ hiện ở đây khi dữ liệu được tải
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ===== Mini Stat =====
function MiniStat({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
    const colorMap: Record<string, string> = {
        slate: "text-gray-900", emerald: "text-emerald-600", red: "text-red-600",
        indigo: "text-indigo-600", amber: "text-amber-600",
    };
    return (
        <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <p className={`text-xl font-black ${colorMap[color] || "text-gray-900"}`}>{value}</p>
            <p className="text-[10px] text-gray-500">{label}</p>
        </div>
    );
}
