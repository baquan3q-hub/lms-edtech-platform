"use client";

import { useState } from "react";
import { TrendingUp, FileText, Loader2, Play, RotateCcw } from "lucide-react";

type ChartDatum = Record<string, string | number | boolean | null | undefined>;

interface AdminAiInsightsProps {
    attendanceData: ChartDatum[];
    gradesData: ChartDatum[];
    submissionData: ChartDatum[];
}

export function AdminAiInsights({ attendanceData, gradesData, submissionData }: AdminAiInsightsProps) {
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setInsight(null);

        try {
            const response = await fetch("/api/ai/admin-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attendanceData, gradesData, submissionData }),
            });

            const result = await response.json().catch(() => null);

            if (!response.ok || result?.error) {
                setError(result?.error || "Không thể tạo phân tích số liệu. Vui lòng thử lại.");
                return;
            }

            setInsight(result?.data || "Hệ thống chưa có đủ dữ liệu để tổng hợp nhận định.");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Lỗi không xác định.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 relative overflow-hidden shadow-sm border border-slate-200 mt-6">
            <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Tổng Hợp & Đánh Giá Vận Hành</h3>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-4">
                        Phân tích tổng hợp số liệu từ chuyên cần, phổ điểm và tiến độ học tập để đưa ra các khuyến nghị điều hành trường học kịp thời.
                    </p>
                    
                    {/* Nút chính */}
                    {!loading && (
                        <button 
                            onClick={handleGenerate}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
                        >
                            {insight || error ? (
                                <>
                                    <RotateCcw className="w-4 h-4" />
                                    Cập nhật đánh giá
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4" />
                                    Tổng hợp nhận định ngay
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex-1 w-full relative">
                    {(loading || insight || error) && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 min-h-[120px] w-full flex items-center relative z-20">
                            {loading ? (
                                <div className="flex items-center gap-3 text-blue-700 w-full justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm font-semibold">Hệ thống đang phân tích số liệu học vụ...</span>
                                </div>
                            ) : error ? (
                                <div className="text-rose-600 text-sm font-medium">
                                    <span className="font-bold">Lỗi:</span> {error}
                                </div>
                            ) : (
                                <p className="text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                                    {insight}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
