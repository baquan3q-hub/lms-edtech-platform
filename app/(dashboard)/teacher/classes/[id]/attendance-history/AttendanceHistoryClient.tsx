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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CalendarDays, Download, Users, CheckCircle2, XCircle, Clock,
    FileText, Loader2, ArrowLeft, ChevronDown, TrendingUp, AlertTriangle, Award,
    Edit, Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAttendanceHistory, deleteAttendanceSession } from "@/lib/actions/attendance";
import { calcAttendanceRate } from "@/lib/utils/attendance-rate";
import * as XLSX from "xlsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AttendanceHistoryClientProps {
    classId: string;
    className: string;
    students: { student_id: string; name: string; email: string }[];
}

const STATUS_LABELS: Record<string, string> = {
    present: "Có mặt",
    absent: "Vắng",
    late: "Đi trễ",
    excused: "Có phép",
};

const STATUS_COLORS: Record<string, string> = {
    present: "bg-emerald-100 text-emerald-800",
    absent: "bg-red-100 text-red-800",
    late: "bg-amber-100 text-amber-800",
    excused: "bg-blue-100 text-blue-800",
};

export default function AttendanceHistoryClient({
    classId, className, students,
}: AttendanceHistoryClientProps) {
    const router = useRouter();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [filterStudent, setFilterStudent] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        loadHistory();
    }, [month, year]);

    const loadHistory = async () => {
        setLoading(true);
        const { data, error } = await getAttendanceHistory(classId, month, year);
        if (error) {
            toast.error("Lỗi tải lịch sử điểm danh");
        } else if (data) {
            setSessions(data.sessions);
            setRecords(data.records);
        }
        setLoading(false);
    };

    const handleDeleteSession = async (sessionId: string) => {
        setLoading(true);
        const { error } = await deleteAttendanceSession(sessionId);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Đã xóa buổi điểm danh thành công");
            loadHistory();
        }
        setLoading(false);
    };

    // ---- Compute stats ----
    const totalSessions = sessions.length;
    const totalRecords = records.length;
    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const excusedCount = records.filter((r) => r.status === "excused").length;
    const avgRate = calcAttendanceRate(presentCount, lateCount, excusedCount, absentCount);

    // Per-student stats
    const studentStats = students.map((s) => {
        const sRecords = records.filter((r: any) => r.student_id === s.student_id);
        const total = sRecords.length;
        const present = sRecords.filter((r: any) => r.status === "present").length;
        const absent = sRecords.filter((r: any) => r.status === "absent").length;
        const late = sRecords.filter((r: any) => r.status === "late").length;
        const excused = sRecords.filter((r: any) => r.status === "excused").length;
        const rate = calcAttendanceRate(present, late, excused, absent);
        return { ...s, total, present, absent, late, excused, rate };
    });

    const mostAbsent = studentStats.length > 0
        ? studentStats.reduce((prev, curr) => curr.absent > prev.absent ? curr : prev)
        : null;

    const perfectAttendance = studentStats.filter((s) => s.rate === 100 && s.total > 0);

    // ---- Filtered records ----
    const filteredRecords = records.filter((r: any) => {
        if (filterStudent !== "all" && r.student_id !== filterStudent) return false;
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        return true;
    });

    // Per-session breakdown
    const sessionBreakdown = sessions.map((sess: any) => {
        const sessRecords = filteredRecords.filter((r: any) => r.session_id === sess.id);
        return {
            ...sess,
            records: sessRecords,
            present: sessRecords.filter((r: any) => r.status === "present").length,
            absent: sessRecords.filter((r: any) => r.status === "absent").length,
            late: sessRecords.filter((r: any) => r.status === "late").length,
            excused: sessRecords.filter((r: any) => r.status === "excused").length,
            total: sessRecords.length,
        };
    });

    // ---- Export Excel ----
    const exportExcel = () => {
        // Sheet 1: Tổng hợp
        const summaryData = studentStats.map((s, idx) => ({
            "STT": idx + 1,
            "Tên học sinh": s.name,
            "Tổng buổi": s.total,
            "Có mặt": s.present,
            "Vắng": s.absent,
            "Đi trễ": s.late,
            "Có phép": s.excused,
            "% Chuyên cần": `${s.rate}%`,
        }));

        // Sheet 2: Chi tiết
        const detailData = studentStats.map((s) => {
            const row: Record<string, any> = { "Tên học sinh": s.name };
            sessions.forEach((sess: any) => {
                const record = records.find(
                    (r: any) => r.student_id === s.student_id && r.session_id === sess.id
                );
                const dateStr = new Date(sess.session_date).toLocaleDateString("vi-VN");
                row[dateStr] = record ? STATUS_LABELS[record.status] : "—";
            });
            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(summaryData);
        const ws2 = XLSX.utils.json_to_sheet(detailData);
        XLSX.utils.book_append_sheet(wb, ws1, "Tổng hợp");
        XLSX.utils.book_append_sheet(wb, ws2, "Chi tiết");

        const fileName = `Diemdanh_${className.replace(/\s+/g, "_")}_Thang${month}_${year}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Đã xuất file ${fileName}`);
    };

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation */}
            <Link
                href={`/teacher/classes/${classId}`}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors w-fit"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại lớp học
            </Link>

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 rounded-2xl text-white">
                <h2 className="text-2xl font-extrabold">📊 Lịch sử Điểm danh — {className}</h2>
                <p className="text-slate-300 text-sm mt-1">Tháng {month}/{year}</p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-3 items-end bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tháng</label>
                    <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Năm</label>
                    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[year - 1, year, year + 1].map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Học sinh</label>
                    <Select value={filterStudent} onValueChange={setFilterStudent}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            {students.map((s) => (
                                <SelectItem key={s.student_id} value={s.student_id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Trạng thái</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="present">Có mặt</SelectItem>
                            <SelectItem value="absent">Vắng</SelectItem>
                            <SelectItem value="late">Đi trễ</SelectItem>
                            <SelectItem value="excused">Có phép</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" onClick={exportExcel} disabled={sessions.length === 0}>
                        <Download className="w-4 h-4 mr-1.5" /> Xuất Excel
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <CalendarDays className="w-4 h-4" /> Tổng buổi
                    </div>
                    <p className="text-2xl font-black text-slate-900">{totalSessions}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <TrendingUp className="w-4 h-4" /> TB đi học
                    </div>
                    <p className={`text-2xl font-black ${avgRate >= 80 ? "text-emerald-600" : "text-red-600"}`}>
                        {avgRate}%
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <AlertTriangle className="w-4 h-4" /> Vắng nhiều nhất
                    </div>
                    <p className="text-sm font-bold text-red-600 truncate">
                        {mostAbsent && mostAbsent.absent > 0 ? `${mostAbsent.name} (${mostAbsent.absent})` : "—"}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Award className="w-4 h-4" /> 100% chuyên cần
                    </div>
                    <p className="text-sm font-bold text-emerald-600">
                        {perfectAttendance.length > 0 ? `${perfectAttendance.length} HS` : "—"}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="ml-3 text-gray-500">Đang tải...</span>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Chưa có dữ liệu</h3>
                    <p className="text-gray-500 text-sm">Không có buổi điểm danh nào trong tháng {month}/{year}.</p>
                </div>
            ) : (
                <Tabs defaultValue="by-session" className="w-full">
                    <TabsList className="bg-white border border-gray-200 rounded-xl p-1">
                        <TabsTrigger value="by-session" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                            📅 Xem theo buổi
                        </TabsTrigger>
                        <TabsTrigger value="by-student" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                            👤 Xem theo học sinh
                        </TabsTrigger>
                    </TabsList>

                    {/* ---- View: By Session ---- */}
                    <TabsContent value="by-session" className="mt-4">
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-gray-50/80">
                                    <TableRow>
                                        <TableHead className="font-medium text-gray-500">Ngày</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Tổng HS</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Có mặt</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Vắng</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Trễ</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Có phép</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessionBreakdown.map((sess) => (
                                        <TableRow key={sess.id} className="hover:bg-gray-50/50">
                                            <TableCell className="font-semibold text-slate-800">
                                                {new Date(sess.session_date).toLocaleDateString("vi-VN", {
                                                    weekday: "short", day: "2-digit", month: "2-digit",
                                                })}
                                            </TableCell>
                                            <TableCell className="text-center">{sess.total}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-emerald-600 font-bold">{sess.present}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-red-600 font-bold">{sess.absent}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-amber-600 font-bold">{sess.late}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-blue-600 font-bold">{sess.excused}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => router.push(`/teacher/classes/${classId}?tab=attendance&date=${sess.session_date}`)}
                                                        title="Sửa điểm danh"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                title="Xóa buổi điểm danh"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Bạn có chắc chắn muốn xóa dữ liệu điểm danh của ngày{" "}
                                                                    <strong>
                                                                        {new Date(sess.session_date).toLocaleDateString("vi-VN")}
                                                                    </strong>
                                                                    không? Lịch sử điểm danh của học sinh trong buổi học này sẽ bị xóa hoàn toàn.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                    onClick={() => handleDeleteSession(sess.id)}
                                                                >
                                                                    Đồng ý xóa
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* ---- View: By Student ---- */}
                    <TabsContent value="by-student" className="mt-4">
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-gray-50/80">
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center font-medium text-gray-500">STT</TableHead>
                                        <TableHead className="font-medium text-gray-500">Học sinh</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Tổng</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Có mặt</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Vắng</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Trễ</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">Có phép</TableHead>
                                        <TableHead className="text-center font-medium text-gray-500">% Chuyên cần</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentStats.map((s, idx) => (
                                        <TableRow key={s.student_id} className="hover:bg-gray-50/50">
                                            <TableCell className="text-center text-gray-400 text-sm">{idx + 1}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                                                    <p className="text-xs text-gray-400">{s.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">{s.total}</TableCell>
                                            <TableCell className="text-center text-emerald-600 font-bold">{s.present}</TableCell>
                                            <TableCell className="text-center text-red-600 font-bold">{s.absent}</TableCell>
                                            <TableCell className="text-center text-amber-600 font-bold">{s.late}</TableCell>
                                            <TableCell className="text-center text-blue-600 font-bold">{s.excused}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={s.rate >= 80
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    : "bg-red-100 text-red-800 border-red-200"
                                                }>
                                                    {s.rate}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
