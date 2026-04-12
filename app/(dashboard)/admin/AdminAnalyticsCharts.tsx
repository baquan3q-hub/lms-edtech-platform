"use client";

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Label
} from "recharts";
import { Clock, BarChart2, CheckCircle2 } from "lucide-react";

interface AdminAnalyticsChartsProps {
    attendanceData: any[];
    gradesData: any[];
    submissionData: any[];
}

// Custom label cho Pie Chart - hiển thị tên + %
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent === 0) return null;

    return (
        <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={600}>
            {name} ({(percent * 100).toFixed(1)}%)
        </text>
    );
};

// Custom label cho Bar Chart - hiển thị count + % trên đầu cột
const renderBarLabel = (props: any, total: number) => {
    const { x, y, width, value } = props;
    if (!value || value === 0 || total === 0) return null;
    const pct = ((value / total) * 100).toFixed(1);
    return (
        <text x={x + width / 2} y={y - 8} fill="#6b7280" textAnchor="middle" fontSize={11} fontWeight={700}>
            {value} ({pct}%)
        </text>
    );
};

export function AdminAnalyticsCharts({ attendanceData, gradesData, submissionData }: AdminAnalyticsChartsProps) {
    const hasAttendance = attendanceData.length > 0;
    const hasGrades = gradesData.length > 0;
    const hasSubmission = submissionData.length > 0;

    // Tính tổng cho Bar Chart
    const totalGrades = gradesData.reduce((acc: number, d: any) => acc + (d.count || 0), 0);
    // Tính tổng cho Pie Chart
    const totalSubmissions = submissionData.reduce((acc: number, d: any) => acc + (d.value || 0), 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Lịch sử điểm danh (Line Chart) */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Xu hướng chuyên cần
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {hasAttendance ? "Tỷ lệ có mặt trung bình trong 7 ngày qua" : "Hệ thống chưa có phiên điểm danh nào"}
                        </p>
                    </div>
                </div>
                <div className="h-[280px] w-full">
                    {hasAttendance ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#f3f4f6', borderRadius: '16px', color: '#111827', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`${value}%`, 'Tỷ lệ có mặt']}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="rate" 
                                    name="Tỷ lệ (%)"
                                    stroke="#3b82f6" 
                                    strokeWidth={4} 
                                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }} 
                                    activeDot={{ r: 6 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-gray-400 text-sm font-medium">Chưa có dữ liệu đồ thị</div>
                    )}
                </div>
            </div>

            {/* Chart 2: Tình trạng Bài tập (Pie/Donut Chart) */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all duration-300 flex flex-col relative overflow-hidden">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Tiến độ làm bài tập
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {hasSubmission ? `Tổng ${totalSubmissions} bài · Trạng thái nộp bài toàn hệ thống` : "Hệ thống chưa có dữ liệu nộp bài"}
                    </p>
                </div>
                <div className="h-[260px] w-full flex-1 mt-2">
                    {hasSubmission ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any, name: any) => {
                                        const pct = totalSubmissions > 0 ? ((Number(value) / totalSubmissions) * 100).toFixed(1) : '0';
                                        return [`${value} bài (${pct}%)`, name];
                                    }}
                                />
                                <Pie
                                    data={submissionData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={78}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={renderPieLabel}
                                    labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                                >
                                    {submissionData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-[150px] mt-6 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-full aspect-square mx-auto bg-gray-50/50 text-gray-400 text-xs font-medium text-center px-4">Trống</div>
                    )}
                </div>
            </div>

            {/* Chart 3: Phân bổ Điểm số (Bar Chart) */}
            <div className="col-span-1 lg:col-span-3 bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all duration-300 mt-2">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-amber-500" />
                        Khảo sát phổ điểm
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {hasGrades ? `Tổng ${totalGrades} bài · Phân nhóm điểm đạt được của học sinh qua các kỳ` : "Chưa có phổ điểm nào được ghi nhận"}
                    </p>
                </div>
                <div className="h-[280px] w-full">
                    {hasGrades ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradesData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#f3f4f6', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any, name: any) => {
                                        const pct = totalGrades > 0 ? ((Number(value) / totalGrades) * 100).toFixed(1) : '0';
                                        return [`${value} bài (${pct}%)`, name];
                                    }}
                                />
                                <Bar 
                                    dataKey="count" 
                                    name="Số lượng bài" 
                                    radius={[6, 6, 0, 0]} 
                                    barSize={55}
                                    label={(props: any) => renderBarLabel(props, totalGrades)}
                                >
                                    {gradesData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-gray-400 text-sm font-medium">Chưa có dữ liệu đồ thị</div>
                    )}
                </div>
            </div>
        </div>
    );
}
