"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { Wallet, TrendingUp, AlertTriangle, Receipt } from "lucide-react";

interface RevenueChartProps {
    chartData: { month: string; revenue: number; count: number }[];
    summary: {
        totalPaid: number;
        totalPending: number;
        overdueCount: number;
        paidCount: number;
        pendingCount: number;
    };
}

function formatVND(amount: number) {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}tr`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return amount.toLocaleString("vi-VN");
}

export function AdminRevenueChart({ chartData, summary }: RevenueChartProps) {
    const hasData = chartData.some(d => d.revenue > 0);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                        Tài chính Học phí
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Doanh thu theo tháng (12 tháng gần nhất)</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Đã thu</span>
                    </div>
                    <p className="text-lg font-black text-emerald-700">{formatVND(summary.totalPaid)}</p>
                    <p className="text-[10px] text-emerald-500 font-medium">{summary.paidCount} hóa đơn</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Receipt className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Chờ thu</span>
                    </div>
                    <p className="text-lg font-black text-amber-700">{formatVND(summary.totalPending)}</p>
                    <p className="text-[10px] text-amber-500 font-medium">{summary.pendingCount} hóa đơn</p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-3 border border-rose-100">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Quá hạn</span>
                    </div>
                    <p className="text-lg font-black text-rose-700">{summary.overdueCount}</p>
                    <p className="text-[10px] text-rose-500 font-medium">hóa đơn trễ</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Tổng giá trị</span>
                    </div>
                    <p className="text-lg font-black text-blue-700">{formatVND(summary.totalPaid + summary.totalPending)}</p>
                    <p className="text-[10px] text-blue-500 font-medium">toàn hệ thống</p>
                </div>
            </div>

            {/* Area Chart */}
            <div className="h-[280px] w-full">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={false}
                            />
                            <YAxis 
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => formatVND(v)}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                                }}
                                formatter={(value: any) => [
                                    `${Number(value).toLocaleString('vi-VN')} đ`,
                                    'Doanh thu'
                                ]}
                                labelStyle={{ color: '#475569', fontWeight: 700 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fill="url(#revenueGradient)"
                                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                        <Wallet className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm font-medium">Chưa có dữ liệu giao dịch tài chính</p>
                        <p className="text-gray-300 text-xs mt-1">Dữ liệu sẽ hiển thị khi có hóa đơn được thanh toán</p>
                    </div>
                )}
            </div>
        </div>
    );
}
