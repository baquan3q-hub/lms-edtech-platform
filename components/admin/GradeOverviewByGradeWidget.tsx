"use client";

import { useState } from "react";
import { 
    GraduationCap, 
    TrendingUp, 
    Award, 
    AlertCircle, 
    Search, 
    ArrowUpDown,
    BarChart3,
    Table as TableIcon
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { GradeOverviewGroup } from "@/app/(dashboard)/admin/analytics-actions";

interface Props {
    initialData: GradeOverviewGroup[];
}

export default function GradeOverviewByGradeWidget({ initialData }: Props) {
    const [selectedGrade, setSelectedGrade] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<"avg-desc" | "avg-asc" | "name">("avg-desc");
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

    // Lọc theo khối
    const filteredGrades = initialData.filter((g) => {
        if (selectedGrade === "all") return true;
        return g.gradeName === selectedGrade;
    });

    const gradeTabs = ["all", ...initialData.map((g) => g.gradeName)];

    // Tạo dataset cho biểu đồ so sánh điểm số
    const chartData = filteredGrades.flatMap((g) =>
        g.classes.map((c) => ({
            name: c.className,
            fullName: `${c.className} (${g.gradeName})`,
            grade: g.gradeName,
            maxScore: c.maxScore,
            avgScore: c.avgScore,
            minScore: c.minScore,
            submissions: c.submissionCount,
            classification: c.classification,
        }))
    );

    const getClassificationBadge = (classification: string) => {
        switch (classification) {
            case "Xuất sắc":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Xuất sắc</span>;
            case "Khá":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Khá</span>;
            case "Trung bình":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Trung bình</span>;
            case "Cần cải thiện":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Cần cải thiện</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Chưa có điểm</span>;
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 md:p-8 space-y-6">
            {/* 1. Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Học Lực & Thống Kê Điểm Số</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                        Tổng Quan Phổ Điểm Theo Khối & Lớp
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                        Biểu đồ trực quan và bảng so sánh Điểm cao nhất, Điểm trung bình và Điểm thấp nhất giữa các lớp.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                    {/* View Switcher */}
                    <div className="flex items-center p-1 bg-slate-100/80 rounded-xl">
                        <button
                            onClick={() => setViewMode("chart")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "chart"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Biểu đồ</span>
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "table"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <TableIcon className="w-3.5 h-3.5" />
                            <span>Bảng chi tiết</span>
                        </button>
                    </div>

                    {/* Grade Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/80 rounded-xl">
                        {gradeTabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setSelectedGrade(tab)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    selectedGrade === tab
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                {tab === "all" ? "Tất cả khối" : tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. Visual Chart View */}
            {viewMode === "chart" ? (
                <div className="space-y-4">
                    {chartData.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-sm">
                            Chưa có dữ liệu điểm số nào được ghi nhận.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-2 px-1">
                                <span>Thang điểm: 0 - 10 (So sánh Điểm Cao Nhất, Trung Bình, Thấp Nhất)</span>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Điểm cao nhất
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-sm bg-indigo-600"></span> Điểm trung bình
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-sm bg-rose-500"></span> Điểm thấp nhất
                                    </span>
                                </div>
                            </div>

                            <div className="h-[340px] w-full bg-slate-50/40 rounded-2xl border border-slate-100 p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#64748b"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={[0, 10]}
                                            ticks={[0, 2, 4, 6, 8, 10]}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3.5 rounded-2xl shadow-lg border border-slate-100 text-xs space-y-2 min-w-[210px]">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-bold text-slate-900">{d.fullName}</p>
                                                                {getClassificationBadge(d.classification)}
                                                            </div>
                                                            <p className="text-slate-400 text-[11px]">Đã chấm: {d.submissions} bài</p>
                                                            <div className="pt-1.5 border-t border-slate-100 space-y-1">
                                                                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                                                                    <span>Điểm cao nhất:</span>
                                                                    <span>{d.maxScore.toFixed(1)} / 10</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-indigo-700 font-bold">
                                                                    <span>Điểm trung bình:</span>
                                                                    <span>{d.avgScore.toFixed(1)} / 10</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-rose-700 font-semibold">
                                                                    <span>Điểm thấp nhất:</span>
                                                                    <span>{d.minScore.toFixed(1)} / 10</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="maxScore" name="Điểm cao nhất" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                                        <Bar dataKey="avgScore" name="Điểm trung bình" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={28} />
                                        <Bar dataKey="minScore" name="Điểm thấp nhất" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* 3. Detailed Table View with Filters */}
            {viewMode === "table" ? (
                <div className="space-y-6">
                    {/* Search and Sort Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm lớp..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-48 sm:w-56"
                            />
                        </div>

                        <div className="relative inline-flex items-center">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                aria-label="Sắp xếp kết quả điểm số"
                                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs"
                            >
                                <option value="avg-desc">Điểm TB (Cao → Thấp)</option>
                                <option value="avg-asc">Điểm TB (Thấp → Cao)</option>
                                <option value="name">Tên lớp (A → Z)</option>
                            </select>
                            <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
                        </div>
                    </div>

                    {filteredGrades.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            Chưa có dữ liệu điểm số nào được ghi nhận.
                        </div>
                    ) : (
                        filteredGrades.map((gradeGroup) => {
                            let classList = [...gradeGroup.classes];

                            if (searchQuery.trim()) {
                                const query = searchQuery.toLowerCase().trim();
                                classList = classList.filter((c) => c.className.toLowerCase().includes(query));
                            }

                            if (sortBy === "avg-desc") {
                                classList.sort((a, b) => b.avgScore - a.avgScore);
                            } else if (sortBy === "avg-asc") {
                                classList.sort((a, b) => a.avgScore - b.avgScore);
                            } else {
                                classList.sort((a, b) => a.className.localeCompare(b.className));
                            }

                            if (classList.length === 0 && searchQuery.trim()) {
                                return null;
                            }

                            return (
                                <div
                                    key={gradeGroup.gradeName}
                                    className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-xs"
                                >
                                    {/* Grade Summary Bar */}
                                    <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                                {gradeGroup.gradeName.replace("Khối ", "K")}
                                            </div>
                                            <span className="font-bold text-slate-900 text-sm">
                                                {gradeGroup.gradeName}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                ({gradeGroup.classes.length} lớp học)
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium">
                                                Cao nhất: <strong>{gradeGroup.maxScore > 0 ? gradeGroup.maxScore.toFixed(1) : "—"}</strong>
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 font-medium">
                                                Điểm TB: <strong>{gradeGroup.avgScore > 0 ? gradeGroup.avgScore.toFixed(1) : "—"}</strong>
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-medium">
                                                Thấp nhất: <strong>{gradeGroup.minScore > 0 ? gradeGroup.minScore.toFixed(1) : "—"}</strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/40 text-slate-500 font-medium">
                                                    <th className="py-3 px-5">Lớp Học</th>
                                                    <th className="py-3 px-4 text-center">Số Lượt Chấm</th>
                                                    <th className="py-3 px-4 text-center font-semibold text-emerald-700">Điểm Cao Nhất</th>
                                                    <th className="py-3 px-4 text-center font-semibold text-indigo-700">Điểm Trung Bình</th>
                                                    <th className="py-3 px-4 text-center font-semibold text-rose-700">Điểm Thấp Nhất</th>
                                                    <th className="py-3 px-5 text-right">Đánh Giá Học Lực</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                                {classList.map((cls) => (
                                                    <tr key={cls.classId} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                                                            Lớp {cls.className}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center text-slate-500">
                                                            {cls.submissionCount > 0 ? `${cls.submissionCount} bài` : "Chưa có bài"}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            {cls.submissionCount > 0 ? (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">
                                                                    {cls.maxScore.toFixed(1)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            {cls.submissionCount > 0 ? (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                                                                    {cls.avgScore.toFixed(1)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            {cls.submissionCount > 0 ? (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs">
                                                                    {cls.minScore.toFixed(1)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right">
                                                            {getClassificationBadge(cls.classification)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : null}
        </div>
    );
}
