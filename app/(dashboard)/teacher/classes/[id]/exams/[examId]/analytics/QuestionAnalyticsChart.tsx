"use client";

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface QuestionAnalyticsChartProps {
    data: any[];
}

export default function QuestionAnalyticsChart({ data }: QuestionAnalyticsChartProps) {
    const chartData = useMemo(() => {
        return data.map((item) => ({
            name: `Câu ${item.questionIndex + 1}`,
            fullQuestion: item.question,
            correct: item.correctCount,
            wrong: item.wrongCount,
            total: item.correctCount + item.wrongCount,
            correctPercent: item.correctPercent,
        }));
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs">
                    <p className="font-bold text-slate-800 mb-2">{label}</p>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">"{dataPoint.fullQuestion}"</p>
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-emerald-600 font-medium">Đúng:</span>
                            <span className="font-bold">{dataPoint.correct} học sinh</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-red-500 font-medium">Sai / Bỏ trống:</span>
                            <span className="font-bold">{dataPoint.wrong} học sinh</span>
                        </div>
                        <div className="flex justify-between text-sm pt-1 border-t border-slate-100 mt-1">
                            <span className="text-indigo-600 font-medium">Tỷ lệ đúng:</span>
                            <span className="font-bold">{dataPoint.correctPercent}%</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!data || data.length === 0) return null;

    return (
        <Card className="shadow-sm border-slate-200 mt-6 relative overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-slate-900">Mức độ hoàn thành theo Câu hỏi</CardTitle>
                        <CardDescription>Thống kê số lượng học sinh trả lời đúng/sai cho từng câu</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar
                                dataKey="correct"
                                name="Trả lời Đúng"
                                stackId="a"
                                fill="#10b981"
                                radius={[0, 0, 4, 4]}
                                maxBarSize={50}
                            />
                            <Bar
                                dataKey="wrong"
                                name="Trả lời Sai / Trống"
                                stackId="a"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
