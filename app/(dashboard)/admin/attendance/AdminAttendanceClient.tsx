"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
    CalendarDays, Download, TrendingUp, AlertTriangle, Clock,
    Loader2, Users, BarChart3, Eye, ChevronRight,
} from "lucide-react";
import { getAttendanceOverview } from "@/lib/actions/attendance";
import { getClassAttendanceSessions } from "@/lib/actions/attendance-points";
import * as XLSX from "xlsx";

export default function AdminAttendanceClient() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [drillDown, setDrillDown] = useState<{ open: boolean; classId: string; className: string; sessions: any[]; loading: boolean }>({
        open: false, classId: "", className: "", sessions: [], loading: false
    });

    useEffect(() => {
        loadOverview();
    }, [month, year]);

    const loadOverview = async () => {
        setLoading(true);
        const { data: overview, error } = await getAttendanceOverview(month, year);
        if (error) toast.error("Lỗi tải thống kê");
        setData(overview);
        setLoading(false);
    };

    const exportExcel = () => {
        if (!data) return;
        const rows = (data.classSummaries || []).map((c: any, idx: number) => ({
            "STT": idx + 1,
            "Tên lớp": c.className,
            "Giáo viên": c.teacherName,
            "Số buổi": c.totalSessions,
            "TB có mặt": c.totalPresent,
            "TB vắng": c.totalAbsent,
            "% Chuyên cần": `${c.attendanceRate}%`,
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Thống kê");
        XLSX.writeFile(wb, `Diemdanh_ToanTruong_T${month}_${year}.xlsx`);
        toast.success("Đã xuất file Excel");
    };

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 rounded-2xl text-white">
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                    <BarChart3 className="w-7 h-7" /> Dashboard Điểm danh
                </h2>
                <p className="text-slate-300 text-sm mt-1">Tổng hợp thống kê chuyên cần toàn trường</p>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-end bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tháng</label>
                    <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {months.map((m) => <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Năm</label>
                    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="ml-auto">
                    <Button variant="outline" onClick={exportExcel} disabled={!data || data.totalSessions === 0}>
                        <Download className="w-4 h-4 mr-1.5" /> Xuất Excel
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : !data || data.totalSessions === 0 ? (
                <div className="bg-white rounded-2xl border p-12 text-center">
                    <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Chưa có dữ liệu</h3>
                    <p className="text-gray-500 text-sm">Không có buổi điểm danh nào trong tháng {month}/{year}.</p>
                </div>
            ) : (
                <>
                    {/* Overview Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <CalendarDays className="w-4 h-4" /> Tổng buổi
                            </div>
                            <p className="text-3xl font-black text-slate-900">{data.totalSessions}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <TrendingUp className="w-4 h-4" /> TB đi học
                            </div>
                            <p className={`text-3xl font-black ${data.avgAttendanceRate >= 80 ? "text-emerald-600" : "text-red-600"}`}>
                                {data.avgAttendanceRate}%
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <AlertTriangle className="w-4 h-4" /> HS vắng &gt;20%
                            </div>
                            <p className="text-3xl font-black text-red-600">{data.studentsHighAbsence.length}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                <Clock className="w-4 h-4" /> Đơn chờ duyệt
                            </div>
                            <p className="text-3xl font-black text-amber-600">{data.pendingRequests}</p>
                        </div>
                    </div>

                    {/* Class Summary Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-500" /> Thống kê theo lớp
                            </h3>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead className="font-medium text-gray-500">Tên lớp</TableHead>
                                    <TableHead className="font-medium text-gray-500">Giáo viên</TableHead>
                                    <TableHead className="text-center font-medium text-gray-500">Số buổi</TableHead>
                                    <TableHead className="text-center font-medium text-gray-500">TB có mặt</TableHead>
                                    <TableHead className="text-center font-medium text-gray-500">TB vắng</TableHead>
                                    <TableHead className="text-center font-medium text-gray-500">% Chuyên cần</TableHead>
                                    <TableHead className="text-center font-medium text-gray-500 w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data.classSummaries || []).map((c: any) => (
                                    <TableRow
                                        key={c.classId}
                                        className="hover:bg-gray-50/50 cursor-pointer"
                                        onClick={async () => {
                                            setDrillDown({ open: true, classId: c.classId, className: c.className, sessions: [], loading: true });
                                            const res = await getClassAttendanceSessions(c.classId, month, year);
                                            setDrillDown(prev => ({ ...prev, sessions: res.data || [], loading: false }));
                                        }}
                                    >
                                        <TableCell className="font-semibold text-slate-800">{c.className}</TableCell>
                                        <TableCell className="text-gray-600">{c.teacherName}</TableCell>
                                        <TableCell className="text-center">{c.totalSessions}</TableCell>
                                        <TableCell className="text-center text-emerald-600 font-bold">{c.totalPresent}</TableCell>
                                        <TableCell className="text-center text-red-600 font-bold">{c.totalAbsent}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={c.attendanceRate >= 80
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                : "bg-red-100 text-red-800 border-red-200"
                                            }>
                                                {c.attendanceRate}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <ChevronRight className="w-4 h-4 text-slate-300 mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* High Absence Students */}
                    {data.studentsHighAbsence.length > 0 && (
                        <div className="bg-white rounded-xl border border-red-200 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-red-100 bg-red-50">
                                <h3 className="font-bold text-red-800 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Học sinh cần chú ý (vắng &gt;20%)
                                </h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-medium text-gray-500">Mã HS</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Số buổi vắng</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Tổng buổi</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">% Vắng</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.studentsHighAbsence.map((s: any) => (
                                        <TableRow key={s.studentId}>
                                            <TableCell className="font-medium text-slate-700 text-xs">{s.studentId.slice(0, 8)}...</TableCell>
                                            <TableCell className="text-center text-red-600 font-bold">{s.absentCount}</TableCell>
                                            <TableCell className="text-center">{s.totalSessions}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-red-100 text-red-800 border-red-200">{s.absentRate}%</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </>
            )}

            {/* Drill-down Dialog */}
            <Dialog open={drillDown.open} onOpenChange={(open) => {
                if (!open) setDrillDown({ open: false, classId: "", className: "", sessions: [], loading: false });
            }}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-indigo-500" />
                            Lịch sử điểm danh — {drillDown.className}
                            <Badge className="ml-2 bg-slate-100 text-slate-600 border-0">Tháng {month}/{year}</Badge>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 max-h-[55vh] overflow-y-auto">
                        {drillDown.loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : drillDown.sessions.length === 0 ? (
                            <p className="text-center text-slate-400 py-12">Không có buổi điểm danh nào trong tháng này.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
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
                                            weekday: "short", day: "2-digit", month: "2-digit"
                                        });
                                        const rate = sess.totalStudents > 0
                                            ? ((sess.presentCount / sess.totalStudents) * 100).toFixed(0)
                                            : "—";
                                        return (
                                            <TableRow key={sess.id}>
                                                <TableCell className="font-medium text-slate-800">
                                                    {dateStr}
                                                    {sess.start_time && <span className="text-xs text-slate-400 ml-2">{sess.start_time.slice(0, 5)}</span>}
                                                </TableCell>
                                                <TableCell className="text-slate-600">{sess.teacherName}</TableCell>
                                                <TableCell className="text-center text-emerald-600 font-bold">{sess.presentCount}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className={sess.absentCount > 0 ? "text-red-600 font-bold" : "text-slate-300"}>
                                                        {sess.absentCount}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={sess.lateCount > 0 ? "text-amber-600 font-bold" : "text-slate-300"}>
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
