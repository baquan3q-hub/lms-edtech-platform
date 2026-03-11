"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
    Brain, Loader2, TrendingUp, TrendingDown, Lightbulb, AlertTriangle,
    CheckCircle2, Target, Users, Trophy
} from "lucide-react";
import { toast } from "sonner";

interface AIClassAnalysisProps {
    examId: string;
    classId: string;
    existingAnalysis: any | null;
    totalSubmissions: number;
}

export default function AIClassAnalysis({ examId, classId, existingAnalysis, totalSubmissions }: AIClassAnalysisProps) {
    const [analysis, setAnalysis] = useState<any>(existingAnalysis);
    const [isLoading, setIsLoading] = useState(false);

    const handleRunAnalysis = async () => {
        if (totalSubmissions < 3) {
            toast.error("Cần ít nhất 3 bài nộp để phân tích AI.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch("/api/ai/analyze-quiz-class", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId, classId })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setAnalysis(result.data);
            toast.success("AI đã phân tích xong!");
        } catch (err: any) {
            toast.error("Lỗi phân tích: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!analysis) {
        return (
            <Card className="border-dashed border-2 border-indigo-200 bg-indigo-50/30">
                <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Phân tích AI tổng thể lớp</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                        AI sẽ phân tích kết quả của cả lớp, tìm ra điểm mạnh, điểm yếu, kiến thức hổng và gợi ý giảng dạy.
                    </p>
                    <Button
                        onClick={handleRunAnalysis}
                        disabled={isLoading || totalSubmissions < 3}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-md"
                    >
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI đang phân tích {totalSubmissions} bài nộp...</>
                        ) : (
                            <><Brain className="w-4 h-4 mr-2" /> Chạy phân tích AI</>
                        )}
                    </Button>
                    {totalSubmissions < 3 && (
                        <p className="text-xs text-amber-600 mt-3">Cần ít nhất 3 bài nộp ({totalSubmissions} hiện tại)</p>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Dữ liệu biểu đồ phân bố điểm
    const distData = [
        { name: "0-4", count: analysis.score_distribution?.["0-4"] || 0, fill: "#ef4444" },
        { name: "5-6", count: analysis.score_distribution?.["5-6"] || 0, fill: "#f59e0b" },
        { name: "7-8", count: analysis.score_distribution?.["7-8"] || 0, fill: "#3b82f6" },
        { name: "9-10", count: analysis.score_distribution?.["9-10"] || 0, fill: "#10b981" },
    ];

    return (
        <div className="space-y-6">
            {/* Tổng quan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="shadow-sm"><CardContent className="p-4 text-center">
                    <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                    <p className="text-xl font-black text-slate-800">{analysis.total_submissions}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Bài nộp</p>
                </CardContent></Card>
                <Card className="shadow-sm"><CardContent className="p-4 text-center">
                    <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xl font-black text-slate-800">{analysis.avg_score}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Điểm TB</p>
                </CardContent></Card>
                <Card className="shadow-sm"><CardContent className="p-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xl font-black text-emerald-600">{analysis.pass_count}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Đạt</p>
                </CardContent></Card>
                <Card className="shadow-sm"><CardContent className="p-4 text-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <p className="text-xl font-black text-red-600">{analysis.fail_count}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Chưa đạt</p>
                </CardContent></Card>
            </div>

            {/* Phân bố điểm */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-500" /> Phân bố điểm số
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" name="Số HS" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                    {distData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* AI Summary */}
            <Card className="shadow-sm border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
                <CardContent className="p-6">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-purple-600" /> Nhận xét của AI
                    </h3>
                    <p className="text-slate-700 text-sm leading-relaxed mb-5">{analysis.ai_summary}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        {/* Điểm mạnh */}
                        <div className="bg-white rounded-xl border border-emerald-200 p-4">
                            <h4 className="font-bold text-sm text-emerald-700 flex items-center gap-1.5 mb-3">
                                <TrendingUp className="w-4 h-4" /> Điểm mạnh
                            </h4>
                            <ul className="space-y-2">
                                {(analysis.strengths || []).map((s: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Điểm yếu */}
                        <div className="bg-white rounded-xl border border-red-200 p-4">
                            <h4 className="font-bold text-sm text-red-700 flex items-center gap-1.5 mb-3">
                                <TrendingDown className="w-4 h-4" /> Điểm yếu cần cải thiện
                            </h4>
                            <ul className="space-y-2">
                                {(analysis.weaknesses || []).map((w: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Kiến thức hổng */}
                    {analysis.knowledge_gaps && analysis.knowledge_gaps.length > 0 && (
                        <div className="bg-white rounded-xl border border-amber-200 p-4 mb-5">
                            <h4 className="font-bold text-sm text-amber-700 flex items-center gap-1.5 mb-3">
                                <AlertTriangle className="w-4 h-4" /> Kiến thức hổng phát hiện
                            </h4>
                            <div className="space-y-2">
                                {analysis.knowledge_gaps.map((gap: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Badge className={`text-[10px] ${gap.severity === 'high' ? 'bg-red-100 text-red-700' : gap.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} border-none`}>
                                                {gap.severity === 'high' ? 'Nghiêm trọng' : gap.severity === 'medium' ? 'Trung bình' : 'Nhẹ'}
                                            </Badge>
                                            <span className="text-xs font-semibold text-slate-800">{gap.topic}</span>
                                        </div>
                                        <span className="text-xs text-slate-500">{gap.affected_students_percent}% HS yếu</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Gợi ý */}
                    {analysis.teaching_suggestions && analysis.teaching_suggestions.length > 0 && (
                        <div className="bg-white rounded-xl border border-blue-200 p-4">
                            <h4 className="font-bold text-sm text-blue-700 flex items-center gap-1.5 mb-3">
                                <Lightbulb className="w-4 h-4" /> Gợi ý cho Giáo viên
                            </h4>
                            <ul className="space-y-2">
                                {analysis.teaching_suggestions.map((s: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Nút làm mới */}
                    <div className="mt-4 flex justify-end">
                        <Button variant="outline" size="sm" onClick={handleRunAnalysis} disabled={isLoading} className="text-xs border-indigo-200 text-indigo-700">
                            {isLoading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Brain className="w-3 h-3 mr-1.5" />}
                            Phân tích lại
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
