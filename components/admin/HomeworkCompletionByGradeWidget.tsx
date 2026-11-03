"use client";

import { useState } from "react";
import { 
    BookOpen, 
    CheckCircle, 
    AlertTriangle, 
    Layers, 
    FileText, 
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
    Cell,
    LabelList
} from "recharts";
import { GradeHomeworkSummary } from "@/app/(dashboard)/admin/analytics-actions";

interface Props {
    initialData: GradeHomeworkSummary[];
}

export default function HomeworkCompletionByGradeWidget({ initialData }: Props) {
    const [selectedGrade, setSelectedGrade] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

    // Lọc theo khối
    const filteredGrades = initialData.filter((g) => {
        if (selectedGrade === "all") return true;
        return g.gradeName === selectedGrade;
    });

    const gradeTabs = ["all", ...initialData.map((g) => g.gradeName)];

    // Dữ liệu tổng hợp cho biểu đồ (Flatten theo các lớp)
    const chartData = filteredGrades.flatMap((g) =>
        g.classes.map((c) => ({
            name: c.className,
            fullName: `Lớp ${c.className} (${g.gradeName})`,
            grade: g.gradeName,
            rate: c.completionRate,
            hwCount: c.homeworkCount,
            completed: c.completedStudents,
            enrolled: c.totalStudents,
            status: c.status,
        }))
    );

    const getBarColor = (rate: number, hwCount: number) => {
        if (hwCount === 0) return "#94a3b8"; // slate-400
        if (rate >= 80) return "#10b981"; // emerald-500
        if (rate >= 50) return "#f59e0b"; // amber-500
        return "#f43f5e"; // rose-500
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 md:p-8 space-y-6">
            {/* 1. Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Học Vụ & Tiến Độ Bài Tập</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                        Tiến Độ Hoàn Thành Bài Tập Theo Khối & Lớp
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                        Trực quan hóa số lượng bài tập đang mở và tỷ lệ nộp bài thực tế của từng lớp học.
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

                    {/* Grade Tabs */}
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
                            Chưa có dữ liệu bài tập cho khối học này.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-2 px-1">
                                <span>Tỷ lệ hoàn thành theo từng lớp (%)</span>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Đạt chuẩn (≥80%)
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Cần đôn đốc (≥50%)
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Thấp (&lt;50%)
                                    </span>
                                </div>
                            </div>

                            <div className="h-[320px] w-full bg-slate-50/40 rounded-2xl border border-slate-100 p-4">
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
                                            unit="%"
                                            domain={[0, 100]}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3.5 rounded-2xl shadow-lg border border-slate-100 text-xs space-y-1.5 min-w-[200px]">
                                                            <p className="font-bold text-slate-900">{d.fullName}</p>
                                                            <div className="pt-1.5 border-t border-slate-100 space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500">Tỷ lệ nộp bài:</span>
                                                                    <span className="font-bold text-blue-600">{d.rate}%</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500">Học sinh đã nộp:</span>
                                                                    <span className="font-semibold text-slate-800">{d.completed}/{d.enrolled} em</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500">Số bài tập:</span>
                                                                    <span className="font-semibold text-slate-800">{d.hwCount} bài</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="rate"
                                            radius={[8, 8, 0, 0]}
                                            maxBarSize={48}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={getBarColor(entry.rate, entry.hwCount)}
                                                />
                                            ))}
                                            <LabelList
                                                dataKey="rate"
                                                position="top"
                                                formatter={(v: any) => `${v}%`}
                                                style={{ fontSize: 10, fill: "#475569", fontWeight: 700 }}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* 3. Detailed Table View */}
            {viewMode === "table" ? (
                <div className="space-y-6">
                    {filteredGrades.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            Chưa có dữ liệu bài tập cho khối học này.
                        </div>
                    ) : (
                        filteredGrades.map((gradeGroup) => (
                            <div
                                key={gradeGroup.gradeName}
                                className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-xs"
                            >
                                {/* Grade Header */}
                                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-slate-800 text-sm">{gradeGroup.gradeName}</span>
                                        <span className="text-xs text-slate-500">
                                            ({gradeGroup.totalClasses} lớp)
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="text-slate-600">
                                            Tổng bài tập: <strong>{gradeGroup.totalHomework} bài</strong>
                                        </span>
                                        <span className="text-slate-600">
                                            Hoàn thành:{" "}
                                            <strong className="text-blue-600">
                                                {gradeGroup.totalCompletedStudents}/{gradeGroup.totalEnrolledStudents} em ({gradeGroup.overallRate}%)
                                            </strong>
                                        </span>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 font-medium">
                                                <th className="py-3 px-4">Lớp Học</th>
                                                <th className="py-3 px-4 text-center">Bài Tập Đang Mở</th>
                                                <th className="py-3 px-4">Tỷ Lệ Hoàn Thành</th>
                                                <th className="py-3 px-4 text-right">Trạng Thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {gradeGroup.classes.map((cls) => (
                                                <tr key={cls.classId} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                                                        Lớp {cls.className}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        {cls.homeworkCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs">
                                                                <FileText className="w-3 h-3" />
                                                                {cls.homeworkCount} bài
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">Không có bài tập</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 min-w-[200px]">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-semibold text-slate-800">
                                                                    {cls.completedStudents}/{cls.totalStudents} học sinh
                                                                </span>
                                                                <span className="font-bold text-slate-700">
                                                                    {cls.completionRate}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                <div
                                                                    style={{ width: `${cls.completionRate}%` }}
                                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                                        cls.completionRate >= 80
                                                                            ? "bg-emerald-500"
                                                                            : cls.completionRate >= 50
                                                                            ? "bg-amber-500"
                                                                            : "bg-rose-500"
                                                                    }`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        {cls.homeworkCount === 0 ? (
                                                            <span className="text-slate-400 text-xs">Chưa giao bài</span>
                                                        ) : cls.status === "Đạt chuẩn" ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                Đạt tiến độ
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                Cần đôn đốc
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}
