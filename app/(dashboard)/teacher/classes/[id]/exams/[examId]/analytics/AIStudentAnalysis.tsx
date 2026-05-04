"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Brain, Loader2, Send, Eye, CheckCircle2, SendHorizonal, FileQuestion,
    AlertCircle, SkipForward, RefreshCw, ChevronDown, ChevronUp,
    BookOpen, Lightbulb, Clock, Edit3
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
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Progress
    const [progress, setProgress] = useState<{
        current: number; total: number; skipped: number;
        currentStudent: string; status: 'idle' | 'running' | 'done' | 'error';
    }>({ current: 0, total: 0, skipped: 0, currentStudent: '', status: 'idle' });

    const handleRunIndividual = async () => {
        setIsRunning(true);
        setProgress({ current: 0, total: submissions.length, skipped: 0, currentStudent: 'Đang khởi tạo...', status: 'running' });
        try {
            const res = await fetch("/api/ai/analyze-quiz-individual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            const { success, failed, skipped, total, errors } = result.data;
            setProgress({ current: success, total, skipped: skipped || 0, currentStudent: 'Hoàn tất!', status: 'done' });
            if (failed > 0) {
                toast.warning(`${success}/${total} thành công, ${failed} lỗi.`);
            } else {
                toast.success(`Phân tích xong ${success}/${total} học sinh!${skipped > 0 ? ` (${skipped} bỏ qua)` : ''}`);
            }
            window.location.reload();
        } catch (err: any) {
            setProgress(prev => ({ ...prev, status: 'error', currentStudent: err.message }));
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsRunning(false);
        }
    };

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

    const handleSendAll = async () => {
        const approvedIds = analysisList.filter(a => a.status === 'approved' || a.status === 'edited').map(a => a.id);
        if (approvedIds.length === 0) { toast.error("Chưa có nhận xét nào được duyệt."); return; }
        setIsSendingAll(true);
        try {
            const res = await fetch("/api/ai/send-feedback", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisIds: approvedIds })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            toast.success(`Đã gửi ${result.data.sent} nhận xét!`);
            setAnalysisList(prev => prev.map(a => approvedIds.includes(a.id) ? { ...a, status: 'sent' } : a));
        } catch (err: any) { toast.error("Lỗi gửi: " + err.message); }
        finally { setIsSendingAll(false); }
    };

    const handleSendOne = async (analysisId: string) => {
        try {
            const res = await fetch("/api/ai/send-feedback", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisIds: [analysisId] })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            toast.success("Đã gửi nhận xét!");
            setAnalysisList(prev => prev.map(a => a.id === analysisId ? { ...a, status: 'sent' } : a));
        } catch (err: any) { toast.error("Lỗi: " + err.message); }
    };

    const handleGenerateQuiz = async (analysis: any) => {
        setGeneratingQuiz(analysis.id);
        try {
            const res = await fetch("/api/ai/generate-supplementary-quiz", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysisId: analysis.id, examId: analysis.exam_id, studentId: analysis.student_id, teacherId: "" })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            const studentObj = Array.isArray(analysis.student) ? analysis.student[0] : analysis.student;
            toast.success(`Đã tạo quiz bổ trợ cho ${studentObj?.full_name || 'HS'}!`);
        } catch (err: any) { toast.error("Lỗi: " + err.message); }
        finally { setGeneratingQuiz(null); }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { bg: string; text: string; label: string }> = {
            ai_draft: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'AI Draft' },
            approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Đã duyệt' },
            edited: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Đã sửa' },
            sent: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Đã gửi' },
        };
        const s = map[status];
        return s ? <Badge className={`${s.bg} ${s.text} border-none text-[10px]`}>{s.label}</Badge> : null;
    };

    const approvedCount = analysisList.filter(a => a.status === 'approved' || a.status === 'edited').length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button onClick={handleRunIndividual} disabled={isRunning || submissions.length === 0}
                        variant="outline" size="sm"
                        className="text-xs border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold">
                        {isRunning ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang phân tích...</>
                            : <><Brain className="w-3.5 h-3.5 mr-1.5" /> Chạy phân tích cá nhân</>}
                    </Button>
                    {analysisList.length > 0 && (
                        <span className="text-[10px] text-slate-400">{analysisList.length}/{submissions.length} đã phân tích</span>
                    )}
                </div>
                {approvedCount > 0 && (
                    <Button onClick={handleSendAll} disabled={isSendingAll} size="sm"
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                        {isSendingAll ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Đang gửi...</>
                            : <><SendHorizonal className="w-3.5 h-3.5 mr-1.5" /> Gửi tất cả ({approvedCount})</>}
                    </Button>
                )}
            </div>

            {/* Progress Bar */}
            {progress.status !== 'idle' && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            {progress.status === 'running' && <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />}
                            {progress.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            {progress.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                            <span className="text-sm font-semibold text-slate-700">
                                {progress.status === 'running' ? 'Đang phân tích AI...' : progress.status === 'done' ? 'Hoàn tất!' : 'Có lỗi'}
                            </span>
                        </div>
                        <span className="text-xs text-slate-500">
                            {progress.current}/{progress.total}
                            {progress.skipped > 0 && <span className="ml-1 text-amber-600"><SkipForward className="w-3 h-3 inline mr-0.5" />{progress.skipped} bỏ qua</span>}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${progress.status === 'error' ? 'bg-red-500' : progress.status === 'done' ? 'bg-emerald-500' : 'bg-purple-500'}`}
                            style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
                    </div>
                    {progress.status === 'error' && (
                        <div className="flex items-center gap-2 mt-2">
                            <p className="text-[10px] text-red-500 flex-1">{progress.currentStudent}</p>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={handleRunIndividual}>
                                <RefreshCw className="w-3 h-3 mr-1" /> Thử lại
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Expandable Student Cards */}
            {analysisList.length > 0 ? (
                <div className="space-y-3">
                    {analysisList.map((a: any, idx: number) => {
                        const studentObj = Array.isArray(a.student) ? a.student[0] : a.student;
                        const isExpanded = expandedId === a.id;
                        const tasks = a.teacher_edited_tasks || a.improvement_tasks || [];
                        const feedback = a.teacher_edited_feedback || a.ai_feedback || "";

                        return (
                            <div key={a.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all">
                                {/* Card Header — click to expand */}
                                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                                    <span className="text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-slate-800">{studentObj?.full_name || "Ẩn danh"}</p>
                                            {getStatusBadge(a.status)}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(a.knowledge_gaps || []).slice(0, 4).map((gap: string, i: number) => (
                                                <Badge key={i} className="bg-amber-50 text-amber-700 border-none text-[9px]">{formatKnowledgeGap(gap)}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                        {a.status === 'ai_draft' && (
                                            <Button size="sm" className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                                onClick={() => handleApprove(a.id)}>
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Duyệt
                                            </Button>
                                        )}
                                        {(a.status === 'approved' || a.status === 'edited') && (
                                            <Button size="sm" className="h-7 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white"
                                                onClick={() => handleSendOne(a.id)}>
                                                <Send className="w-3 h-3 mr-1" /> Gửi
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]"
                                            onClick={() => { setSelectedAnalysis(a); setDrawerOpen(true); }}>
                                            <Edit3 className="w-3 h-3 mr-1" /> Sửa
                                        </Button>
                                        {a.status === 'sent' && (
                                            <Button size="sm" variant="outline" disabled={generatingQuiz === a.id}
                                                className="h-7 px-2 text-[10px] border-purple-200 text-purple-700 bg-purple-50"
                                                onClick={() => handleGenerateQuiz(a)}>
                                                {generatingQuiz === a.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileQuestion className="w-3 h-3 mr-1" />}
                                                Quiz bổ trợ
                                            </Button>
                                        )}
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                                </div>

                                {/* Expanded Content — Nhận xét + Bài tập inline */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/30 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        {/* AI Feedback */}
                                        <div className="bg-white rounded-lg p-4 border border-slate-100">
                                            <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 mb-2">
                                                <Brain className="w-3.5 h-3.5" /> Nhận xét AI
                                            </h4>
                                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{feedback || "Chưa có nhận xét."}</p>
                                            {a.advancement_suggestion && (
                                                <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
                                                    <p className="text-xs font-semibold text-indigo-700 mb-1">🚀 Đề xuất phát triển:</p>
                                                    <p className="text-xs text-indigo-600">{a.advancement_suggestion}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Improvement Tasks */}
                                        {tasks.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                    <BookOpen className="w-3.5 h-3.5 text-purple-600" /> Bài tập cải thiện ({tasks.length})
                                                </h4>
                                                {tasks.map((task: any, tIdx: number) => (
                                                    <div key={tIdx} className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                                        <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-100">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-800">{task.title || `Bài tập ${tIdx + 1}`}</span>
                                                                <div className="flex items-center gap-2">
                                                                    {task.estimated_time && (
                                                                        <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                                                            <Clock className="w-2.5 h-2.5" /> {task.estimated_time}
                                                                        </span>
                                                                    )}
                                                                    <Badge className={`border-none text-[9px] ${task.type === 'extension' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                                        {task.type === 'extension' ? '🚀 Nâng cao' : '📚 Ôn tập'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 space-y-3">
                                                            {/* Theory */}
                                                            {task.theory && (
                                                                <div className="bg-amber-50/50 rounded-lg p-3">
                                                                    <p className="text-[10px] font-bold text-amber-700 mb-1 flex items-center gap-1">
                                                                        <Lightbulb className="w-3 h-3" /> Lý thuyết
                                                                    </p>
                                                                    <p className="text-xs text-slate-700">{task.theory.explanation}</p>
                                                                    {task.theory.formula && (
                                                                        <p className="text-xs text-slate-600 mt-1 font-mono bg-white px-2 py-1 rounded border border-amber-100">{task.theory.formula}</p>
                                                                    )}
                                                                    {task.theory.tip && (
                                                                        <p className="text-[10px] text-amber-600 mt-1.5">💡 {task.theory.tip}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* Mini Quiz */}
                                                            {task.mini_quiz && task.mini_quiz.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-purple-700 mb-2">📝 Mini Quiz ({task.mini_quiz.length} câu)</p>
                                                                    <div className="space-y-2">
                                                                        {task.mini_quiz.map((q: any, qIdx: number) => (
                                                                            <div key={q.id || qIdx} className="bg-slate-50 rounded-lg p-2.5">
                                                                                <p className="text-xs font-semibold text-slate-800 mb-1.5">
                                                                                    Câu {qIdx + 1}: {q.question}
                                                                                </p>
                                                                                <div className="grid grid-cols-2 gap-1.5">
                                                                                    {(q.options || []).map((opt: any) => (
                                                                                        <div key={opt.id}
                                                                                            className={`text-[10px] px-2 py-1.5 rounded-md border ${opt.id === q.correct
                                                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                                                                                                : 'bg-white border-slate-200 text-slate-600'}`}>
                                                                                            <span className="font-bold mr-1">{opt.id.toUpperCase()}.</span>{opt.text}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {q.explanation && (
                                                                                    <p className="text-[9px] text-slate-500 mt-1 italic">💡 {q.explanation}</p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {tasks.length === 0 && !feedback && (
                                            <p className="text-xs text-slate-400 text-center py-4">Chưa có nội dung phân tích.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Chưa có phân tích cá nhân.</p>
                    <p className="text-xs mt-1">Hãy nhấn &quot;Chạy phân tích cá nhân&quot; để AI tạo nhận xét cho từng học sinh.</p>
                </div>
            )}

            {/* Drawer — chỉ dùng khi Sửa */}
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
