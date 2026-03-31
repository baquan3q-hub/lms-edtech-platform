"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

interface TeacherChartData {
    name: string;
    conducted: number;
    expected: number;
    conductRate: number;
}

interface Props {
    data: TeacherChartData[];
}

const COLORS = {
    conducted: "#6366f1",   // indigo-500
    remaining: "#e2e8f0",   // slate-200
};

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload) return null;
    const data = payload[0]?.payload;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-semibold text-gray-800 mb-1.5">{label}</p>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-gray-600">Đã điểm danh:</span>
                    <span className="font-semibold text-gray-900">{data?.conducted} buổi</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
                    <span className="text-gray-600">Tổng dự kiến:</span>
                    <span className="font-semibold text-gray-900">{data?.expected} buổi</span>
                </div>
                <div className="pt-1 border-t border-gray-100 mt-1">
                    <span className="text-gray-500">Tỷ lệ: </span>
                    <span className={`font-bold ${data?.conductRate >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                        {data?.conductRate}%
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function TeacherBarChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                Chưa có dữ liệu giáo viên
            </div>
        );
    }

    // Tính "remaining" cho stacked bar
    const chartData = data.map(d => ({
        ...d,
        remaining: Math.max(0, d.expected - d.conducted),
    }));

    return (
        <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    barSize={20}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        horizontal={false}
                    />
                    <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        tickFormatter={(v) => `${v}`}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                        width={100}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Legend
                        wrapperStyle={{ paddingTop: 8 }}
                        iconType="circle"
                        iconSize={8}
                    />
                    <Bar
                        dataKey="conducted"
                        name="Đã điểm danh"
                        stackId="a"
                        fill={COLORS.conducted}
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="remaining"
                        name="Còn lại"
                        stackId="a"
                        fill={COLORS.remaining}
                        radius={[0, 4, 4, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
