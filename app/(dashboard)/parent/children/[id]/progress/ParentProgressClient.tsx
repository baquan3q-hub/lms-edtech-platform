"use client";

import { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from "recharts";
import { TrendingUp, Users, BookOpen, Clock, Target, Award, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ClassStats {
    class_id: string;
    total_sessions: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
    attendance_rate: number;
    avg_score: number;
    classes: {
        name: string;
        course_id: string;
        courses: { name: string } | { name: string }[];
    } | {
        name: string;
        course_id: string;
        courses: { name: string } | { name: string }[];
    }[];
}

interface ScoreHistory {
    date: string;
    score: number;
    exam: string;
}

interface ParentProgressClientProps {
    studentId: string;
    studentName: string;
    stats: ClassStats[];
    history: ScoreHistory[];
}

export default function ParentProgressClient({ studentName, stats, history }: ParentProgressClientProps) {
    const getProgressColor = (rate: number) => {
        if (rate >= 80) return "bg-emerald-500";
        if (rate >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    const getScoreColor = (score: number) => {
        if (score >= 8.5) return "text-emerald-600 font-bold";
        if (score >= 6.5) return "text-amber-600 font-bold";
        return "text-red-600 font-bold";
    };

    // Tooltip custom cho Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border rounded-lg shadow-lg p-3">
                    <p className="text-slate-500 text-xs mb-1 font-medium">{payload[0].payload.exam}</p>
                    <p className="text-slate-800 font-bold">Ngày: {label}</p>
                    <p className="text-indigo-600 font-bold text-lg">
                        Điểm: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">+2.5% so với tháng trước</Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Điểm Trung Bình (Tất cả)</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            {(stats.reduce((acc, curr) => acc + curr.avg_score, 0) / (stats.length || 1)).toFixed(1)}
                        </h4>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-blue-100 bg-blue-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Tỉ lệ Chuyên Cần</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            {(stats.reduce((acc, curr) => acc + curr.attendance_rate, 0) / (stats.length || 1)).toFixed(1)}%
                        </h4>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <BookOpen className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Lớp Đang Tham Gia</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            {stats.length} <span className="text-lg font-medium text-slate-500">lớp</span>
                        </h4>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-amber-100 bg-amber-50/30">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <Star className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Đánh Giá Chung</p>
                        <h4 className="text-3xl font-black text-slate-800 mt-1">
                            Tốt
                        </h4>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Biểu đồ tiến độ (Line Chart) */}
                <Card className="lg:col-span-2 shadow-sm relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Tiến độ Học tập (Biểu đồ Điểm số)</CardTitle>
                        <CardDescription>Xu hướng điểm số qua các bài kiểm tra gần đây</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 pb-0 pl-0 pr-4">
                        <div className="h-[300px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        domain={[0, 10]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Danh sách lớp học và chi tiết */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Thống kê theo Lớp học</h3>

                    {stats.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">Chưa có dữ liệu lớp học.</div>
                    ) : (
                        stats.map(stat => {
                            const classInfo = Array.isArray(stat.classes) ? stat.classes[0] : stat.classes;
                            return (
                                <Card key={stat.class_id} className="shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-slate-800 truncate pr-4">{classInfo?.name || "Lớp học ẩn"}</h4>
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 shrink-0">
                                                ĐTB: {stat.avg_score.toFixed(1)}
                                            </Badge>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1.5">
                                                    <span className="text-slate-500 font-medium">Chuyên cần</span>
                                                    <span className="font-semibold text-slate-700">{stat.attendance_rate}%</span>
                                                </div>
                                                <Progress
                                                    value={stat.attendance_rate}
                                                    className="h-2"
                                                    indicatorColor={getProgressColor(stat.attendance_rate)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-50">
                                                <div>
                                                    <span className="block font-bold text-emerald-600">{stat.present_count}</span>
                                                    <span className="text-slate-500">Có mặt</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-red-600">{stat.absent_count}</span>
                                                    <span className="text-slate-500">Vắng</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-amber-600">{stat.late_count}</span>
                                                    <span className="text-slate-500">Trễ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Bảng lịch sử Test/Exam chi tiết (Mock) */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Lịch sử Bài kiểm tra gần đây</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">BÀI KIỂM TRA</th>
                                    <th className="px-6 py-3 font-medium">NGÀY THI</th>
                                    <th className="px-6 py-3 font-medium text-center">ĐIỂM SỐ</th>
                                    <th className="px-6 py-3 font-medium text-right">ĐÁNH GIÁ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <Target className="w-4 h-4" />
                                            </div>
                                            {item.exam}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {item.date}/2024
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-base ${getScoreColor(item.score)}`}>
                                                {item.score.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.score >= 8 ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none">Khá/Giỏi</Badge>
                                            ) : item.score >= 6.5 ? (
                                                <Badge className="bg-amber-50 text-amber-600 border-none shadow-none">Trung bình</Badge>
                                            ) : (
                                                <Badge className="bg-red-50 text-red-600 border-none shadow-none">Cần cố gắng</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
