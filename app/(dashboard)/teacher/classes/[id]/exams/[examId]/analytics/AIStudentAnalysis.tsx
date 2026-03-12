"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Brain, Loader2, Send, Eye, CheckCircle2, Edit3, SendHorizonal, FileQuestion
} from "lucide-react";
import StudentFeedbackDrawer from "./StudentFeedbackDrawer";
import { formatKnowledgeGap } from "@/lib/utils";

interface AIStudentAnalysisProps {
    examId: string;
    classId: string;
    analyses: any[];
    submissions: any[];
    exam: any;
}

export default function AIStudentAnalysis({ examId, classId, analyses, submissions, exam }: AIStudentAnalysisProps) {
    const [analysisList, setAnalysisList] = useState<any[]>(analyses);
    const [isRunning, setIsRunning] = useState(false);
    const [isSendingAll, setIsSendingAll] = useState(false);
    const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null);
    const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Chạy phân tích cá nhân cho tất cả
    const handleRunIndividual = async () => {
        setIsRunning(true);
        try {
            const res = await fetch("/api/ai/analyze-quiz-individual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            toast.success(`Phân tích xong: ${result.data.success} thành công, ${result.data.failed} lỗi`);

            // Reload analyses
            const res2 = await fetch(`/api/ai/analyze-quiz-individual?examId=${examId}`);
            // Tạm thời reload trang
            window.location.reload();
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsRunning(false);
        }
    };

    // Duyệt nhận xét
    const handleApprove = async (analysisId: string) => {
        try {
            const { approveAnalysis } = await import("@/lib/actions/quiz-analysis");
            const res = await approveAnalysis(analysisId);
            if (res.error) throw new Error(res.error);
            setAnalysisList(prev => prev.map(a => a.id === analysisId ? { ...a, status: 'approved' } : a));
            toast.success("Đã duyệt nhận xét!");
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        }
    };

    // Gửi tất cả đã duyệt
    const handleSendAll = async () => {
        const approvedIds = analysisList
            .filter(a => a.status === 'approved' || a.status === 'edited')
            .map(a => a.id);

        if (approvedIds.length === 0) {
            toast.error("Chưa có nhận xét nào được duyệt.");
            return;
        }

        setIsSendingAll(true);
        try {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            const res = await fetch("/api/ai/send-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisIds: approvedIds, deadline: deadline.toISOString() })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            toast.success(`Đã gửi ${result.data.sent} nhận xét cho học sinh!`);
            setAnalysisList(prev => prev.map(a => approvedIds.includes(a.id) ? { ...a, status: 'sent' } : a));
        } catch (err: any) {
            toast.error("Lỗi gửi: " + err.message);
        } finally {
            setIsSendingAll(false);
        }
    };

    // Gửi 1 học sinh
    const handleSendOne = async (analysisId: string) => {
        try {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            const res = await fetch("/api/ai/send-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisIds: [analysisId], deadline: deadline.toISOString() })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            toast.success("Đã gửi nhận xét!");
            setAnalysisList(prev => prev.map(a => a.id === analysisId ? { ...a, status: 'sent' } : a));
        } catch (err: any) {
            toast.error("Lỗi gửi: " + err.message);
        }
    };

    // Tạo quiz bổ trợ
    const handleGenerateQuiz = async (analysis: any) => {
        setGeneratingQuiz(analysis.id);
        try {
            const res = await fetch("/api/ai/generate-supplementary-quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    analysisId: analysis.id,
                    examId: analysis.exam_id,
                    studentId: analysis.student_id,
                    teacherId: "" // will be set server-side if needed
                })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            const studentObj = Array.isArray(analysis.student) ? analysis.student[0] : analysis.student;
            toast.success(`Đã tạo và gửi bài quiz bổ trợ cho ${studentObj?.full_name || 'học sinh'}!`);
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setGeneratingQuiz(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ai_draft': return <Badge className="bg-purple-50 text-purple-700 border-none text-[10px]">AI Draft</Badge>;
            case 'approved': return <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px]">Đã duyệt</Badge>;
            case 'edited': return <Badge className="bg-blue-50 text-blue-700 border-none text-[10px]">Đã sửa</Badge>;
            case 'sent': return <Badge className="bg-indigo-50 text-indigo-700 border-none text-[10px]">Đã gửi</Badge>;
            default: return null;
        }
    };

    const approvedCount = analysisList.filter(a => a.status === 'approved' || a.status === 'edited').length;

    return (
        <div className="space-y-4">
            {/* Header actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleRunIndividual}
                        disabled={isRunning || submissions.length === 0}
                        variant="outline"
                        size="sm"
                        className="text-xs border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold"
                    >
                        {isRunning ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang phân tích...</>
                        ) : (
                            <><Brain className="w-3.5 h-3.5 mr-1.5" /> Chạy phân tích cá nhân</>
                        )}
                    </Button>
                </div>
                {approvedCount > 0 && (
                    <Button
                        onClick={handleSendAll}
                        disabled={isSendingAll}
                        size="sm"
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        {isSendingAll ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang gửi...</>
                        ) : (
                            <><SendHorizonal className="w-3.5 h-3.5 mr-1.5" /> Gửi tất cả ({approvedCount})</>
                        )}
                    </Button>
                )}
            </div>

            {/* Table */}
            {analysisList.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-4 font-bold text-slate-700">#</th>
                                <th className="text-left py-3 px-4 font-bold text-slate-700">Học sinh</th>
                                <th className="text-center py-3 px-4 font-bold text-slate-700">Kiến thức hổng</th>
                                <th className="text-center py-3 px-4 font-bold text-slate-700">Trạng thái</th>
                                <th className="text-right py-3 px-4 font-bold text-slate-700">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysisList.map((a: any, idx: number) => {
                                const studentObj = Array.isArray(a.student) ? a.student[0] : a.student;
                                return (
                                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-800">{studentObj?.full_name || "Ẩn danh"}</p>
                                            <p className="text-[10px] text-slate-400">{studentObj?.email || ""}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {(a.knowledge_gaps || []).slice(0, 3).map((gap: string, i: number) => (
                                                    <Badge key={i} className="bg-amber-50 text-amber-700 border-none text-[9px]">{formatKnowledgeGap(gap)}</Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">{getStatusBadge(a.status)}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-[10px]"
                                                    onClick={() => { setSelectedAnalysis(a); setDrawerOpen(true); }}
                                                >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    {a.status === 'ai_draft' ? 'Xem' : 'Sửa'}
                                                </Button>
                                                {a.status === 'ai_draft' && (
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => handleApprove(a.id)}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Duyệt
                                                    </Button>
                                                )}
                                                {(a.status === 'approved' || a.status === 'edited') && (
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white"
                                                        onClick={() => handleSendOne(a.id)}
                                                    >
                                                        <Send className="w-3 h-3 mr-1" /> Gửi
                                                    </Button>
                                                )}
                                                {a.status === 'sent' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-[10px] border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                                                        disabled={generatingQuiz === a.id}
                                                        onClick={() => handleGenerateQuiz(a)}
                                                    >
                                                        {generatingQuiz === a.id ? (
                                                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang tạo...</>
                                                        ) : (
                                                            <><FileQuestion className="w-3 h-3 mr-1" /> Quiz bổ trợ</>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Chưa có phân tích cá nhân.</p>
                    <p className="text-xs mt-1">Hãy nhấn &quot;Chạy phân tích cá nhân&quot; để AI tạo nhận xét cho từng học sinh.</p>
                </div>
            )}

            {/* Drawer */}
            {selectedAnalysis && (
                <StudentFeedbackDrawer
                    open={drawerOpen}
                    onOpenChange={(open) => { setDrawerOpen(open); if (!open) setSelectedAnalysis(null); }}
                    analysis={selectedAnalysis}
                    exam={exam}
                    onSaved={(updated) => {
                        setAnalysisList(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
                    }}
                />
            )}
        </div>
    );
}
