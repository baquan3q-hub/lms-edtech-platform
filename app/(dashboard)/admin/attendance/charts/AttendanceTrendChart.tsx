"use client";

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface TrendDataPoint {
    period: string;
    presentRate: number;
    absentRate: number;
    lateRate: number;
    excusedRate: number;
    total: number;
    totalPresent?: number;
    totalSessions?: number;
}

interface Props {
    data: TrendDataPoint[];
}

const COLORS = {
    present: "#10b981",  // emerald-500
    absent: "#ef4444",   // red-500
    late: "#f59e0b",     // amber-500
    excused: "#3b82f6",  // blue-500
};

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-semibold text-gray-800 mb-1.5">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.name} className="flex items-center gap-2 py-0.5">
                    <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-600">{entry.name}:</span>
                    <span className="font-semibold text-gray-900">{entry.value}%</span>
                </div>
            ))}
            {payload[0]?.payload?.totalSessions !== undefined && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-gray-500 text-xs flex flex-col gap-0.5">
                    <span>Tổng buổi học: {payload[0].payload.totalSessions} buổi</span>
                    <span>Số lượt điểm danh: {payload[0].payload.total} lượt ({payload[0].payload.totalPresent} có mặt)</span>
                </div>
            )}
        </div>
    );
}

export default function AttendanceTrendChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                Chưa có dữ liệu xu hướng
            </div>
        );
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="period"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        dy={8}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        dx={-4}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ paddingTop: 12 }}
                        iconType="circle"
                        iconSize={8}
                    />
                    <Line
                        type="monotone"
                        dataKey="presentRate"
                        name="Có mặt"
                        stroke={COLORS.present}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: COLORS.present, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                    />
                    <Line
                        type="monotone"
                        dataKey="absentRate"
                        name="Vắng"
                        stroke={COLORS.absent}
                        strokeWidth={2}
                        dot={{ r: 3, fill: COLORS.absent, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                    />
                    <Line
                        type="monotone"
                        dataKey="lateRate"
                        name="Trễ"
                        stroke={COLORS.late}
                        strokeWidth={2}
                        dot={{ r: 3, fill: COLORS.late, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                        strokeDasharray="5 3"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
