"use client";

import { useState, useMemo } from "react";
import {
    BarChart3, TrendingUp, Users, Award, Search, Filter,
    ArrowUpDown, Trophy, GraduationCap, BookOpen, ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

const RANK_COLORS: Record<string, string> = {
    "Giỏi": "#10b981",
    "Khá": "#6366f1",
    "Trung bình": "#f59e0b",
    "Yếu": "#ef4444",
};

const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];

interface AdminGradesClientProps {
    data: any;
}

export default function AdminGradesClient({ data }: AdminGradesClientProps) {
    const [selectedCourse, setSelectedCourse] = useState<string>("all");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "score">("score");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    if (!data) {
        return (
            <div className="text-center py-20">
                <BarChart3 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Không tải được dữ liệu</h3>
                <p className="text-sm text-slate-500">Vui lòng thử lại sau.</p>
            </div>
        );
    }

    // Filter classes by selected course
    const filteredClasses = useMemo(() => {
        if (selectedCourse === "all") return data.classGrades;
        return data.classGrades.filter((c: any) => c.courseId === selectedCourse);
    }, [selectedCourse, data.classGrades]);

    // Filter students
    const filteredStudents = useMemo(() => {
        let students = data.studentDetails || [];
        if (selectedCourse !== "all") {
            students = students.filter((s: any) => {
                const classInfo = data.classGrades.find((c: any) => c.classId === s.classId);
                return classInfo?.courseId === selectedCourse;
            });
        }
        if (selectedClass !== "all") {
            students = students.filter((s: any) => s.classId === selectedClass);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            students = students.filter((s: any) =>
                s.studentName?.toLowerCase().includes(q) || s.studentEmail?.toLowerCase().includes(q)
            );
        }
        // Sort
        students = [...students].sort((a: any, b: any) => {
            if (sortBy === "name") {
                return sortDir === "asc"
                    ? (a.studentName || "").localeCompare(b.studentName || "")
                    : (b.studentName || "").localeCompare(a.studentName || "");
            }
            return sortDir === "asc" ? a.avgScore - b.avgScore : b.avgScore - a.avgScore;
        });
        return students;
    }, [data.studentDetails, data.classGrades, selectedCourse, selectedClass, searchQuery, sortBy, sortDir]);

    // Pie chart data
    const pieData = useMemo(() => {
        const counts = { "Giỏi": 0, "Khá": 0, "Trung bình": 0, "Yếu": 0 };
        filteredStudents.forEach((s: any) => {
            if (counts[s.rank as keyof typeof counts] !== undefined) {
                counts[s.rank as keyof typeof counts]++;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    }, [filteredStudents]);

    // Bar chart data (class comparison)
    const barData = useMemo(() => {
        return filteredClasses.map((c: any) => ({
            name: c.className.length > 12 ? c.className.slice(0, 12) + "…" : c.className,
            "Kiểm tra": c.avgExamScore,
            "Bài tập": c.avgHwScore,
            "Tổng": c.overallAvg,
        }));
    }, [filteredClasses]);

    const toggleSort = (field: "name" | "score") => {
        if (sortBy === field) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortDir(field === "score" ? "desc" : "asc");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        Quản lý Điểm số
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Theo dõi và đánh giá xu hướng điểm số toàn hệ thống
                    </p>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">ĐTB Hệ thống</p>
                    </div>
                    <p className="text-3xl font-black text-indigo-700">{data.systemAvg || "—"}<span className="text-sm font-medium text-slate-400 ml-1">/10</span></p>
                </div>
                <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Tổng Học sinh</p>
                    </div>
                    <p className="text-3xl font-black text-emerald-700">{data.totalStudents}</p>
                </div>
                <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <Award className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Bài nộp</p>
                    </div>
                    <p className="text-3xl font-black text-amber-700">{data.totalSubmissions}</p>
                </div>
                <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Số lớp</p>
                    </div>
                    <p className="text-3xl font-black text-purple-700">{data.totalClasses}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-slate-200 p-4">
                <Filter className="w-4 h-4 text-slate-400" />
                <div className="relative">
                    <select
                        className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={selectedCourse}
                        onChange={e => { setSelectedCourse(e.target.value); setSelectedClass("all"); }}
                    >
                        <option value="all">Tất cả khóa học</option>
                        {(data.courses || []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                    <select
                        className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                    >
                        <option value="all">Tất cả lớp</option>
                        {filteredClasses.map((c: any) => (
                            <option key={c.classId} value={c.classId}>{c.className}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Tìm học sinh..."
                        className="pl-9 bg-slate-50 border-slate-200"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart — So sánh theo lớp */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" /> So sánh Điểm TB theo Lớp
                    </h3>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 10]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                    formatter={(value: any) => [`${value}/10`, ""]}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="Kiểm tra" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Bài tập" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
                            Chưa có dữ liệu điểm
                        </div>
                    )}
                </div>

                {/* Pie Chart — Phân bổ xếp loại */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-purple-500" /> Phân bổ Xếp loại
                    </h3>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={50}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={entry.name} fill={RANK_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => [`${value} HS`, ""]} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>
            </div>

            {/* Line Chart — Xu hướng điểm */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Xu hướng Điểm TB theo Tháng (6 tháng gần nhất)
                </h3>
                {data.monthlyTrends && data.monthlyTrends.some((t: any) => t.submissionCount > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={data.monthlyTrends} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 10]} />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                formatter={(value: any, name: any) => {
                                    if (name === "avgScore") return [`${value}/10`, "ĐTB"];
                                    return [value, "Bài nộp"];
                                }}
                            />
                            <Line type="monotone" dataKey="avgScore" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: "#6366f1" }} name="avgScore" />
                            <Line type="monotone" dataKey="submissionCount" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: "#10b981" }} name="submissionCount" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
                        Chưa có dữ liệu xu hướng
                    </div>
                )}
            </div>

            {/* Top Performers */}
            {data.topPerformers && data.topPerformers.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm p-6">
                    <h3 className="text-base font-bold text-amber-800 mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-600" /> Top 10 Học sinh Xuất sắc
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.topPerformers.slice(0, 10).map((s: any, idx: number) => (
                            <div key={`${s.studentId}-${s.classId}`} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                    idx === 0 ? "bg-amber-400 text-white" :
                                    idx === 1 ? "bg-slate-300 text-white" :
                                    idx === 2 ? "bg-orange-400 text-white" :
                                    "bg-slate-100 text-slate-600"
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{s.studentName}</p>
                                    <p className="text-[10px] text-slate-500">{s.className} • {s.courseName}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-black text-emerald-600">{s.avgScore}</p>
                                    <Badge className={`text-[9px] border-none ${
                                        s.rank === "Giỏi" ? "bg-emerald-100 text-emerald-700" :
                                        s.rank === "Khá" ? "bg-indigo-100 text-indigo-700" :
                                        "bg-amber-100 text-amber-700"
                                    }`}>{s.rank}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Details Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-500" /> Chi tiết Điểm số Học sinh
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{filteredStudents.length} kết quả</p>
                    </div>
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50">
                                    <th className="py-3 px-4 text-left font-bold text-slate-600 w-12">#</th>
                                    <th className="py-3 px-4 text-left font-bold text-slate-600 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort("name")}>
                                        <span className="flex items-center gap-1">Học sinh <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="py-3 px-4 text-left font-bold text-slate-600">Lớp</th>
                                    <th className="py-3 px-4 text-left font-bold text-slate-600">Khóa học</th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600">Số bài</th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort("score")}>
                                        <span className="flex items-center justify-center gap-1">ĐTB <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="py-3 px-4 text-center font-bold text-slate-600">Xếp loại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.slice(0, 50).map((s: any, idx: number) => (
                                    <tr key={`${s.studentId}-${s.classId}-${idx}`} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                        <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                    {s.studentName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{s.studentName}</p>
                                                    <p className="text-[10px] text-slate-400">{s.studentEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">{s.className}</td>
                                        <td className="py-3 px-4 text-slate-500 text-xs">{s.courseName}</td>
                                        <td className="py-3 px-4 text-center font-semibold text-slate-700">{s.totalSubmissions}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-base font-black ${
                                                s.avgScore >= 8 ? "text-emerald-600" :
                                                s.avgScore >= 6.5 ? "text-indigo-600" :
                                                s.avgScore >= 5 ? "text-amber-600" :
                                                "text-red-500"
                                            }`}>{s.avgScore}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <Badge className={`text-[10px] border-none ${
                                                s.rank === "Giỏi" ? "bg-emerald-100 text-emerald-700" :
                                                s.rank === "Khá" ? "bg-indigo-100 text-indigo-700" :
                                                s.rank === "Trung bình" ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                                            }`}>{s.rank}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length > 50 && (
                            <div className="p-4 text-center border-t border-slate-100">
                                <p className="text-xs text-slate-400">Hiển thị 50/{filteredStudents.length} kết quả. Sử dụng bộ lọc để thu hẹp.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có dữ liệu điểm số.</p>
                        <p className="text-sm text-slate-400 mt-1">Khi học sinh nộp bài, dữ liệu sẽ tự động hiển thị ở đây.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
