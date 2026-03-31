"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    CalendarDays, TrendingUp, AlertTriangle, Clock,
    Users, ChevronRight, Loader2,
} from "lucide-react";
import { getAttendanceTrendData } from "@/lib/actions/attendance";
import { getClassAttendanceSessions } from "@/lib/actions/attendance-points";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import AttendanceTrendChart from "../charts/AttendanceTrendChart";

interface Props {
    month: number;
    year: number;
    data: any;
    loading: boolean;
}

export default function OverviewTab({ month, year, data, loading }: Props) {
    const [trendData, setTrendData] = useState<any[]>([]);
    const [trendLoading, setTrendLoading] = useState(true);
    const [drillDown, setDrillDown] = useState<{
        open: boolean; classId: string; className: string; sessions: any[]; loading: boolean;
    }>({
        open: false, classId: "", className: "", sessions: [], loading: false,
    });

    // Load trend data
    useEffect(() => {
        const loadTrend = async () => {
            setTrendLoading(true);
            const { data: trend } = await getAttendanceTrendData(3);
            setTrendData(trend || []);
            setTrendLoading(false);
        };
        loadTrend();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!data || data.totalSessions === 0) {
        return (
            <div className="bg-white rounded-2xl border p-12 text-center">
                <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Chưa có dữ liệu</h3>
                <p className="text-gray-500 text-sm">
                    Không có buổi điểm danh nào trong tháng {month}/{year}.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<CalendarDays className="w-4 h-4" />}
                    label="Tổng buổi học"
                    value={data.totalSessions}
                    color="slate"
                />
                <StatCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="TB chuyên cần"
                    value={`${data.avgAttendanceRate}%`}
                    color={data.avgAttendanceRate >= 80 ? "emerald" : "red"}
                />
                <StatCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="HS vắng >20%"
                    value={data.studentsHighAbsence.length}
                    color={data.studentsHighAbsence.length > 0 ? "red" : "emerald"}
                />
                <StatCard
                    icon={<Clock className="w-4 h-4" />}
                    label="Đơn chờ duyệt"
                    value={data.pendingRequests}
                    color={data.pendingRequests > 0 ? "amber" : "slate"}
                />
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Xu hướng chuyên cần (3 tháng gần nhất)
                    </h3>
                </div>
                <div className="p-4">
                    {trendLoading ? (
                        <div className="flex items-center justify-center h-[280px]">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <AttendanceTrendChart data={trendData} />
                    )}
                </div>
            </div>

            {/* Class Summary Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Thống kê theo lớp
                    </h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/30">
                            <TableHead className="font-medium text-gray-500">Tên lớp</TableHead>
                            <TableHead className="font-medium text-gray-500">Giáo viên</TableHead>
                            <TableHead className="text-center font-medium text-gray-500">Số buổi</TableHead>
                            <TableHead className="text-center font-medium text-gray-500">TB có mặt</TableHead>
                            <TableHead className="text-center font-medium text-gray-500">TB vắng</TableHead>
                            <TableHead className="text-center font-medium text-gray-500">% Chuyên cần</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(data.classSummaries || []).map((c: any) => (
                            <TableRow
                                key={c.classId}
                                className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                                onClick={async () => {
                                    setDrillDown({
                                        open: true, classId: c.classId,
                                        className: c.className, sessions: [], loading: true,
                                    });
                                    const res = await getClassAttendanceSessions(c.classId, month, year);
                                    setDrillDown(prev => ({
                                        ...prev, sessions: res.data || [], loading: false,
                                    }));
                                }}
                            >
                                <TableCell className="font-semibold text-gray-800">{c.className}</TableCell>
                                <TableCell className="text-gray-600">{c.teacherName}</TableCell>
                                <TableCell className="text-center">{c.totalSessions}</TableCell>
                                <TableCell className="text-center text-emerald-600 font-bold">{c.totalPresent}</TableCell>
                                <TableCell className="text-center text-red-600 font-bold">{c.totalAbsent}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {/* Mini progress bar */}
                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    c.attendanceRate >= 80
                                                        ? "bg-emerald-500"
                                                        : c.attendanceRate >= 60
                                                        ? "bg-amber-500"
                                                        : "bg-red-500"
                                                }`}
                                                style={{ width: `${Math.min(c.attendanceRate, 100)}%` }}
                                            />
                                        </div>
                                        <Badge
                                            className={
                                                c.attendanceRate >= 80
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    : c.attendanceRate >= 60
                                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                                    : "bg-red-100 text-red-800 border-red-200"
                                            }
                                        >
                                            {c.attendanceRate}%
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <ChevronRight className="w-4 h-4 text-gray-300 mx-auto" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Students High Absence */}
            {data.studentsHighAbsence.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-red-100 bg-red-50/50">
                        <h3 className="font-bold text-red-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Học sinh cần chú ý (vắng &gt;20%)
                        </h3>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-medium text-gray-500">Học sinh</TableHead>
                                <TableHead className="text-center font-medium text-gray-500">Số buổi vắng</TableHead>
                                <TableHead className="text-center font-medium text-gray-500">Tổng buổi</TableHead>
                                <TableHead className="text-center font-medium text-gray-500">% Vắng</TableHead>
                                <TableHead className="text-center font-medium text-gray-500">Mức độ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.studentsHighAbsence.map((s: any) => (
                                <TableRow key={s.studentId}>
                                    <TableCell className="font-medium text-gray-700">
                                        {s.studentName || s.studentId.slice(0, 8) + "..."}
                                    </TableCell>
                                    <TableCell className="text-center text-red-600 font-bold">{s.absentCount}</TableCell>
                                    <TableCell className="text-center">{s.totalSessions}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="bg-red-100 text-red-800 border-red-200">
                                            {s.absentRate}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {s.absentRate >= 30 ? (
                                            <span className="text-xs font-semibold text-red-600">🔴 Nghiêm trọng</span>
                                        ) : (
                                            <span className="text-xs font-semibold text-amber-600">🟡 Chú ý</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Drill-down Dialog */}
            <Dialog
                open={drillDown.open}
                onOpenChange={(open) => {
                    if (!open) setDrillDown({ open: false, classId: "", className: "", sessions: [], loading: false });
                }}
            >
                <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-indigo-500" />
                            Lịch sử điểm danh — {drillDown.className}
                            <Badge className="ml-2 bg-gray-100 text-gray-600 border-0">
                                Tháng {month}/{year}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 max-h-[55vh] overflow-y-auto">
                        {drillDown.loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : drillDown.sessions.length === 0 ? (
                            <p className="text-center text-gray-400 py-12">
                                Không có buổi điểm danh nào trong tháng này.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="font-medium text-gray-500">Ngày</TableHead>
                                        <TableHead className="font-medium text-gray-500">GV điểm danh</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Có mặt</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Vắng</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Trễ</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Tổng</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drillDown.sessions.map((sess: any) => {
                                        const dateStr = new Date(sess.session_date + "T00:00:00").toLocaleDateString("vi-VN", {
                                            weekday: "short", day: "2-digit", month: "2-digit",
                                        });
                                        const rate = sess.totalStudents > 0
                                            ? ((sess.presentCount / sess.totalStudents) * 100).toFixed(0)
                                            : "—";
                                        return (
                                            <TableRow key={sess.id}>
                                                <TableCell className="font-medium text-gray-800">
                                                    {dateStr}
                                                    {sess.start_time && (
                                                        <span className="text-xs text-gray-400 ml-2">
                                                            {sess.start_time.slice(0, 5)}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-gray-600">{sess.teacherName}</TableCell>
                                                <TableCell className="text-center text-emerald-600 font-bold">
                                                    {sess.presentCount}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={sess.absentCount > 0 ? "text-red-600 font-bold" : "text-gray-300"}>
                                                        {sess.absentCount}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={sess.lateCount > 0 ? "text-amber-600 font-bold" : "text-gray-300"}>
                                                        {sess.lateCount}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={Number(rate) >= 80
                                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                    }>
                                                        {rate}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ===== Mini Stat Card Component =====
function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        slate: "text-gray-900",
        emerald: "text-emerald-600",
        red: "text-red-600",
        amber: "text-amber-600",
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                {icon}
                <span>{label}</span>
            </div>
            <p className={`text-3xl font-black ${colorMap[color] || "text-gray-900"}`}>
                {value}
            </p>
        </div>
    );
}
