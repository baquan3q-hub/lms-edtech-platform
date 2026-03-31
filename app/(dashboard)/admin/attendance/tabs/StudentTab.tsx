"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Users, Search, Loader2, UserCircle, Mail, Users2,
    AlertTriangle, CheckCircle2, XCircle, Clock, Eye,
} from "lucide-react";
import { getStudentCrossClassAttendance } from "@/lib/actions/attendance";
import StudentDetailDialog from "../StudentDetailDialog";

interface Props {
    month: number;
    year: number;
}

export default function StudentTab({ month, year }: Props) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [alertFilter, setAlertFilter] = useState("all");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [month, year]);

    const loadData = async () => {
        setLoading(true);
        const { data: stats, error } = await getStudentCrossClassAttendance(month, year);
        if (error) toast.error("Lỗi tải thống kê học sinh");
        setData(stats || []);
        setLoading(false);
    };

    // Danh sách lớp unique cho filter
    const classList = useMemo(() => {
        const map = new Map<string, string>();
        for (const s of data) {
            for (const cls of s.classes) {
                map.set(cls.classId, cls.className);
            }
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [data]);

    // Filtered data
    const filtered = useMemo(() => {
        let result = data;

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((s: any) =>
                s.studentName.toLowerCase().includes(q) ||
                s.studentEmail.toLowerCase().includes(q)
            );
        }

        // Class filter
        if (classFilter !== "all") {
            result = result.filter((s: any) =>
                s.classes.some((c: any) => c.classId === classFilter)
            );
        }

        // Alert filter
        if (alertFilter !== "all") {
            result = result.filter((s: any) => s.alert === alertFilter);
        }

        return result;
    }, [data, search, classFilter, alertFilter]);

    const dangerCount = data.filter((s: any) => s.alert === "danger").length;
    const warningCount = data.filter((s: any) => s.alert === "warning").length;

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
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Chưa có dữ liệu</h3>
                <p className="text-gray-500 text-sm">
                    Không có dữ liệu điểm danh học sinh trong tháng {month}/{year}.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Alert Summary */}
            {(dangerCount > 0 || warningCount > 0) && (
                <div className="flex gap-3">
                    {dangerCount > 0 && (
                        <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <div>
                                <p className="font-semibold text-red-800 text-sm">
                                    {dangerCount} HS nghiêm trọng
                                </p>
                                <p className="text-red-600 text-xs">Vắng &gt;30%</p>
                            </div>
                        </div>
                    )}
                    {warningCount > 0 && (
                        <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <p className="font-semibold text-amber-800 text-sm">
                                    {warningCount} HS cần chú ý
                                </p>
                                <p className="text-amber-600 text-xs">Vắng 20-30%</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Tên hoặc email học sinh..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Lớp</label>
                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Tất cả lớp" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả lớp</SelectItem>
                                {classList.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Mức cảnh báo</label>
                        <Select value={alertFilter} onValueChange={setAlertFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="danger">🔴 Nghiêm trọng</SelectItem>
                                <SelectItem value="warning">🟡 Cần chú ý</SelectItem>
                                <SelectItem value="normal">🟢 Bình thường</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Student Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Danh sách Học sinh
                        <Badge className="ml-2 bg-gray-100 text-gray-600 border-0 text-xs">
                            {filtered.length}/{data.length} HS
                        </Badge>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/30">
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Học sinh</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">Lớp</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">
                                    <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-500 mr-1" />Có mặt
                                </th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">
                                    <XCircle className="w-3.5 h-3.5 inline text-red-500 mr-1" />Vắng
                                </th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">
                                    <Clock className="w-3.5 h-3.5 inline text-amber-500 mr-1" />Trễ
                                </th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">% Tổng</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-500">PH</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-gray-400">
                                        Không tìm thấy học sinh phù hợp
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((s: any) => (
                                    <tr
                                        key={s.studentId}
                                        className={`border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors ${
                                            s.alert === "danger" ? "bg-red-50/30" :
                                            s.alert === "warning" ? "bg-amber-50/20" : ""
                                        }`}
                                        onClick={() => {
                                            setSelectedStudent(s);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {s.avatarUrl ? (
                                                        <img src={s.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <UserCircle className="w-5 h-5 text-indigo-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-semibold text-gray-800">{s.studentName}</p>
                                                        {s.consecutiveAbsent >= 3 && (
                                                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5">
                                                                {s.consecutiveAbsent} buổi liên tiếp
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400">{s.studentEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {s.classes.map((c: any) => (
                                                    <Badge key={c.classId} className="bg-slate-100 text-slate-600 border-0 text-[10px]">
                                                        {c.className}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3 text-emerald-600 font-bold">
                                            {s.overall.present}
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <span className={s.overall.absent > 0 ? "text-red-600 font-bold" : "text-gray-300"}>
                                                {s.overall.absent}
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <span className={s.overall.late > 0 ? "text-amber-600 font-bold" : "text-gray-300"}>
                                                {s.overall.late}
                                            </span>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            s.overall.rate >= 80 ? "bg-emerald-500"
                                                                : s.overall.rate >= 60 ? "bg-amber-500"
                                                                : "bg-red-500"
                                                        }`}
                                                        style={{ width: `${Math.min(s.overall.rate, 100)}%` }}
                                                    />
                                                </div>
                                                <Badge className={
                                                    s.overall.rate >= 80
                                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                        : s.overall.rate >= 60
                                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                }>
                                                    {s.overall.rate}%
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3">
                                            {s.parentLinked ? (
                                                <Users2 className="w-4 h-4 text-blue-400 mx-auto" />
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-3">
                                            <Eye className="w-4 h-4 text-gray-300 mx-auto" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Detail Dialog */}
            <StudentDetailDialog
                student={selectedStudent}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                month={month}
                year={year}
            />
        </div>
    );
}
