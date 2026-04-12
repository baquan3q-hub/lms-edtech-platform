"use client";

import { useState } from "react";
import { Sparkles, BrainCircuit, Loader2, Play, RotateCcw } from "lucide-react";
import { generateAdminInsights } from "./ai-actions";

interface AdminAiInsightsProps {
    attendanceData: any[];
    gradesData: any[];
    submissionData: any[];
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
            const { data, error: resError } = await generateAdminInsights(attendanceData, gradesData, submissionData);
            if (resError) {
                setError(resError);
            } else {
                setInsight(data);
            }
        } catch (e: any) {
            setError(e.message || "Lỗi không xác định.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 relative overflow-hidden shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-indigo-50 mt-6 group">
            {/* Vibe effects */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-5 transition-opacity duration-500 pointer-events-none">
                <BrainCircuit className="w-48 h-48 text-indigo-600" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">AI Advisor Insight</h3>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-4">
                        Assistant sẽ phân loại và phân tích số liệu từ Biểu đồ để đưa ra các lời khuyên Vận hành Hệ thống tối ưu nhất. Sử dụng Gemini 2.5 Flash.
                    </p>
                    
                    {/* Nút chính - Luôn hiện khi không đang loading */}
                    {!loading && (
                        <button 
                            onClick={handleGenerate}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold relative overflow-hidden bg-indigo-600 text-white rounded-xl shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:bg-indigo-700 transition-all duration-200"
                        >
                            {insight || error ? (
                                <>
                                    <RotateCcw className="w-4 h-4" />
                                    Phân tích lại
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 fill-current" />
                                    Phân tích Dữ liệu ngay
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex-1 w-full relative">
                    {(loading || insight || error) && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 min-h-[120px] w-full flex items-center relative z-20 shadow-inner">
                            {loading ? (
                                <div className="flex items-center gap-3 text-indigo-600 w-full justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm font-semibold animate-pulse">SmartLife AI đang đọc Dữ liệu... Điều này mất vài giây.</span>
                                </div>
                            ) : error ? (
                                <div className="text-rose-500 text-sm font-medium">
                                    <span className="font-bold">Oops!</span> Lỗi AI: {error}
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
