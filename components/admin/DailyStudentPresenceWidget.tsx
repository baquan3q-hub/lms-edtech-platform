"use client";

import { useState } from "react";
import {
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Calendar,
    HelpCircle,
    Wifi,
    WifiOff,
    ChevronLeft,
    ChevronRight,
    Filter
} from "lucide-react";
import { DailyPresenceSummary, StudentPresenceRecord } from "@/app/(dashboard)/admin/analytics-actions";

interface Props {
    initialData: DailyPresenceSummary;
}

export default function DailyStudentPresenceWidget({ initialData }: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [pageSize, setPageSize] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const todayFormatted = new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    // Lọc học sinh theo bộ lọc và ô tìm kiếm
    const filteredRecords = initialData.records.filter((rec) => {
        const matchSearch =
            rec.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rec.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rec.className.toLowerCase().includes(searchQuery.toLowerCase());

        let matchStatus = true;
        if (activeFilter === "absent") {
            matchStatus = rec.attendanceStatus === "absent";
        } else if (activeFilter === "late") {
            matchStatus = rec.attendanceStatus === "late";
        } else if (activeFilter === "excused") {
            matchStatus = rec.attendanceStatus === "excused";
        } else if (activeFilter === "online") {
            matchStatus = rec.isOnline;
        } else if (activeFilter === "present") {
            matchStatus = rec.attendanceStatus === "present";
        }

        return matchSearch && matchStatus;
    });

    // Phân trang
    const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Tính tỷ lệ phần trăm phân bổ
    const total = initialData.totalStudents || 1;
    const presentPct = ((initialData.presentCount / total) * 100).toFixed(0);
    const latePct = ((initialData.lateCount / total) * 100).toFixed(0);
    const absentPct = ((initialData.absentCount / total) * 100).toFixed(0);
    const excusedPct = ((initialData.excusedCount / total) * 100).toFixed(0);

    const getAttendanceStatusBadge = (status: StudentPresenceRecord["attendanceStatus"], timeStr: string) => {
        switch (status) {
            case "present":
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Có mặt</span>
                        <span className="text-[11px] text-emerald-600 font-mono">({timeStr})</span>
                    </div>
                );
            case "late":
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Vào muộn</span>
                        <span className="text-[11px] text-amber-600 font-mono">({timeStr})</span>
                    </div>
                );
            case "absent":
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Vắng mặt</span>
                    </div>
                );
            case "excused":
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Xin phép</span>
                    </div>
                );
            default:
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium">
                        <span>Chưa điểm danh</span>
                    </div>
                );
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 md:p-8 space-y-6">
            {/* 1. Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                        Điểm Danh & Hoạt Động Ra Vào Hệ Thống
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                        Theo dõi mốc giờ điểm danh tại lớp học và lịch sử đăng nhập/hoạt động LMS của từng học sinh.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Live Date Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span className="capitalize">{todayFormatted}</span>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Tìm học sinh, mã số, lớp..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-52 sm:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Visual Metrics & Filter Bar */}
            <div className="space-y-3">
                {/* Horizontal Filter Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {/* All */}
                    <button
                        onClick={() => {
                            setActiveFilter("all");
                            setCurrentPage(1);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                            activeFilter === "all"
                                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                : "bg-slate-50/80 hover:bg-slate-100/80 border-slate-100 text-slate-700"
                        }`}
                    >
                        <span className="text-[11px] font-medium opacity-80 block">Tổng học sinh</span>
                        <span className="text-xl font-black">{initialData.totalStudents}</span>
                    </button>

                    {/* Present */}
                    <button
                        onClick={() => {
                            setActiveFilter("present");
                            setCurrentPage(1);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                            activeFilter === "present"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-emerald-50/40 hover:bg-emerald-50 border-emerald-100 text-emerald-800"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium opacity-80">Có mặt</span>
                            <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span className="text-xl font-black">{initialData.presentCount}</span>
                    </button>

                    {/* Late */}
                    <button
                        onClick={() => {
                            setActiveFilter("late");
                            setCurrentPage(1);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                            activeFilter === "late"
                                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                : "bg-amber-50/40 hover:bg-amber-50 border-amber-100 text-amber-800"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium opacity-80">Vào muộn</span>
                            <Clock className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span className="text-xl font-black">{initialData.lateCount}</span>
                    </button>

                    {/* Absent */}
                    <button
                        onClick={() => {
                            setActiveFilter("absent");
                            setCurrentPage(1);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                            activeFilter === "absent"
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-rose-50/40 hover:bg-rose-50 border-rose-100 text-rose-800"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium opacity-80">Vắng mặt</span>
                            <XCircle className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span className="text-xl font-black">{initialData.absentCount}</span>
                    </button>

                    {/* Online LMS */}
                    <button
                        onClick={() => {
                            setActiveFilter("online");
                            setCurrentPage(1);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                            activeFilter === "online"
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-blue-50/40 hover:bg-blue-50 border-blue-100 text-blue-800"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium opacity-80">Online LMS</span>
                            <Wifi className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span className="text-xl font-black">{initialData.onlineCount}</span>
                    </button>

                    {/* Excused */}
                    <button
                        onClick={() => {
                            setActiveFilter("excused");
                            setCurrentPage(1);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                            activeFilter === "excused"
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-indigo-50/40 hover:bg-indigo-50 border-indigo-100 text-indigo-800"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium opacity-80">Có đơn phép</span>
                            <HelpCircle className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span className="text-xl font-black">{initialData.excusedCount}</span>
                    </button>
                </div>

                {/* Visual Ratio Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                    <div
                        style={{ width: `${presentPct}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={`Có mặt: ${presentPct}%`}
                    />
                    <div
                        style={{ width: `${latePct}%` }}
                        className="bg-amber-400 transition-all duration-500"
                        title={`Vào muộn: ${latePct}%`}
                    />
                    <div
                        style={{ width: `${absentPct}%` }}
                        className="bg-rose-500 transition-all duration-500"
                        title={`Vắng mặt: ${absentPct}%`}
                    />
                    <div
                        style={{ width: `${excusedPct}%` }}
                        className="bg-indigo-400 transition-all duration-500"
                        title={`Có phép: ${excusedPct}%`}
                    />
                </div>
            </div>

            {/* 3. Full Width Students Table */}
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-600 font-semibold">
                                <th className="py-3 px-4">Tên học sinh</th>
                                <th className="py-3 px-4">Lớp & Khối</th>
                                <th className="py-3 px-4">Trạng thái điểm danh (tại lớp)</th>
                                <th className="py-3 px-4">Mốc giờ ra/vào LMS</th>
                                <th className="py-3 px-4 text-right">Trạng thái mạng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {paginatedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecords.map((stu) => (
                                    <tr key={stu.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-slate-900">
                                            <div>{stu.fullName}</div>
                                            <div className="text-[10px] text-slate-400 font-normal">{stu.email}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-semibold text-slate-800">{stu.className}</span>
                                            <span className="text-[11px] text-slate-400 block">{stu.gradeName}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {getAttendanceStatusBadge(stu.attendanceStatus, stu.markedTimeStr)}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                                            {stu.lastSignInTimeStr}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {stu.isOnline ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs font-medium">Offline</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/30 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Hiển thị:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            aria-label="Số học sinh hiển thị trên mỗi trang"
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span>/ tổng số {filteredRecords.length} học sinh</span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            aria-label="Trang trước"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-semibold text-slate-700 px-1">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            aria-label="Trang sau"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
