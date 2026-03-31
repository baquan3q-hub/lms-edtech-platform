"use client";

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";

interface Props {
    present: number;
    absent: number;
    late: number;
    excused: number;
}

const COLORS = [
    { key: "present", label: "Có mặt", color: "#10b981" },
    { key: "absent", label: "Vắng", color: "#ef4444" },
    { key: "late", label: "Trễ", color: "#f59e0b" },
    { key: "excused", label: "Có phép", color: "#3b82f6" },
];

function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0];
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
            <div className="flex items-center gap-2">
                <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: data.payload.fill }}
                />
                <span className="text-gray-700">{data.name}:</span>
                <span className="font-bold text-gray-900">{data.value} lượt</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
                {((data.value / data.payload.total) * 100).toFixed(1)}%
            </p>
        </div>
    );
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Ẩn label nếu quá nhỏ

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
            className="text-xs font-bold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

export default function StatusDistChart({ present, absent, late, excused }: Props) {
    const total = present + absent + late + excused;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
                Chưa có dữ liệu
            </div>
        );
    }

    const chartData = COLORS.map(c => ({
        name: c.label,
        value: c.key === "present" ? present
            : c.key === "absent" ? absent
            : c.key === "late" ? late
            : excused,
        fill: c.color,
        total,
    })).filter(d => d.value > 0); // Chỉ hiển thị trạng thái có data

    return (
        <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={CustomLabel}
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.fill}
                                stroke="white"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ paddingTop: 8 }}
                        formatter={(value: string) => (
                            <span className="text-xs text-gray-600">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
