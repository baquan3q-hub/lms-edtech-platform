"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Save, Send, Loader2, BookOpen, Clock, Brain, Plus,
    Trash2, FileQuestion, PenLine, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { editAnalysis, saveSupplementaryQuizDraft, sendSupplementaryQuiz } from "@/lib/actions/quiz-analysis";
import { sendNotificationToStudentAndParents } from "@/lib/notifications/send-notification";
import { toast } from "sonner";
import { formatKnowledgeGap } from "@/lib/utils";

interface StudentFeedbackDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    analysis: any;
    exam: any;
    onSaved: (updated: any) => void;
}

export default function StudentFeedbackDrawer({ open, onOpenChange, analysis, exam, onSaved }: StudentFeedbackDrawerProps) {
    const studentObj = Array.isArray(analysis.student) ? analysis.student[0] : analysis.student;

    // Tab state
    const [activeTab, setActiveTab] = useState<"feedback" | "tasks" | "supplement">("feedback");

    // Tab 1: Feedback
    const [feedback, setFeedback] = useState(analysis.teacher_edited_feedback || analysis.ai_feedback || "");
    const [tasks, setTasks] = useState<any[]>(analysis.teacher_edited_tasks || analysis.improvement_tasks || []);

    // Tab 3: Supplementary quiz
    const [supTitle, setSupTitle] = useState("Bài tập bổ trợ");
    const [supQuestions, setSupQuestions] = useState<any[]>([]);
    const [supQuizId, setSupQuizId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);

    // Status
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // ===== Tab 1: Save/Send feedback =====
    const handleSaveFeedback = async () => {
        setIsSaving(true);
        try {
            const res = await editAnalysis(analysis.id, {
                feedback,
                tasks
            });
            if (res.error) throw new Error(res.error);
            toast.success("Đã lưu chỉnh sửa!");
            onSaved({ id: analysis.id, status: 'edited', teacher_edited_feedback: feedback, teacher_edited_tasks: tasks });
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendFeedback = async () => {
        setIsSending(true);
        try {
            await editAnalysis(analysis.id, { feedback, tasks });
            const res = await fetch("/api/ai/send-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    analysisIds: [analysis.id]
                })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);

            // Nếu có bài bổ trợ draft, gửi luôn
            if (supQuizId && supQuestions.length > 0) {
                await sendSupplementaryQuiz(supQuizId);
            }

            // Gửi notification đến học sinh + phụ huynh
            try {
                await sendNotificationToStudentAndParents({
                    studentId: analysis.student_id,
                    title: "📝 Giáo viên đã gửi nhận xét bài kiểm tra",
                    message: `Giáo viên đã nhận xét bài "${exam?.title || 'Kiểm tra'}". Hãy xem và hoàn thành bài tập cải thiện!`,
                    type: "feedback",
                    link: `/student/classes/${analysis.class_id || ''}/exams/${analysis.exam_id}/feedback`,
                    metadata: { analysisId: analysis.id, examTitle: exam?.title },
                });
            } catch (notifErr) {
                console.error("Notification error (non-critical):", notifErr);
            }

            toast.success("Đã gửi nhận xét" + (supQuizId ? " + bài bổ trợ" : "") + " cho học sinh!");
            onSaved({ id: analysis.id, status: 'sent' });
            onOpenChange(false);
        } catch (err: any) {
            toast.error("Lỗi gửi: " + err.message);
        } finally {
            setIsSending(false);
        }
    };

    // ===== Tab 2: Edit tasks =====
    const updateTask = (index: number, field: string, value: string) => {
        setTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    };

    // ===== Tab 3: Supplementary Quiz CRUD =====
    const handleGenerateAI = async (type: string = "mixed") => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/ai/generate-supplementary-quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    analysisId: analysis.id,
                    examId: analysis.exam_id,
                    studentId: analysis.student_id,
                    questionTypes: type,
                    autoSave: false
                })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setSupTitle(result.data.title || "Bài tập bổ trợ");
            setSupQuestions(result.data.questions || []);
            toast.success(`AI đã tạo ${(result.data.questions || []).length} câu hỏi! Hãy xem và chỉnh sửa trước khi gửi.`);
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const addMCQ = () => {
        const id = `q${Date.now()}`;
        setSupQuestions(prev => [...prev, {
            id,
            type: "mcq",
            question: "",
            options: [
                { id: "a", text: "" },
                { id: "b", text: "" },
                { id: "c", text: "" },
                { id: "d", text: "" }
            ],
            correct: "a",
            explanation: ""
        }]);
        setExpandedQ(id);
    };

    const addEssay = () => {
        const id = `q${Date.now()}`;
        setSupQuestions(prev => [...prev, {
            id,
            type: "essay",
            question: "",
            sample_answer: "",
            max_score: 10,
            rubric: ""
        }]);
        setExpandedQ(id);
    };

    const removeQuestion = (id: string) => {
        setSupQuestions(prev => prev.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, field: string, value: any) => {
        setSupQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId: string, optId: string, text: string) => {
        setSupQuestions(prev => prev.map(q => {
            if (q.id !== qId) return q;
            return { ...q, options: (q.options || []).map((o: any) => o.id === optId ? { ...o, text } : o) };
        }));
    };

    const handleSaveSupDraft = async () => {
        if (supQuestions.length === 0) {
            toast.error("Chưa có câu hỏi nào.");
            return;
        }
        setIsSaving(true);
        try {
            const res = await saveSupplementaryQuizDraft({
                analysisId: analysis.id,
                examId: analysis.exam_id,
                studentId: analysis.student_id,
                title: supTitle,
                questions: supQuestions,
                quizId: supQuizId || undefined
            });
            if (res.error) throw new Error(res.error);
            setSupQuizId(res.data?.id || supQuizId);
            toast.success("Đã lưu bài bổ trợ!");
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendSupOnly = async () => {
        if (!supQuizId) {
            // Lưu trước rồi gửi
            setIsSending(true);
            try {
                const saveRes = await saveSupplementaryQuizDraft({
                    analysisId: analysis.id,
                    examId: analysis.exam_id,
                    studentId: analysis.student_id,
                    title: supTitle,
                    questions: supQuestions,
                });
                if (saveRes.error) throw new Error(saveRes.error);
                const savedId = saveRes.data?.id;
                if (!savedId) throw new Error("Không lưu được");
                setSupQuizId(savedId);
                const sendRes = await sendSupplementaryQuiz(savedId);
                if (sendRes.error) throw new Error(sendRes.error);
                toast.success("Đã gửi bài bổ trợ cho học sinh!");
            } catch (err: any) {
                toast.error("Lỗi: " + err.message);
            } finally {
                setIsSending(false);
            }
        } else {
            setIsSending(true);
            try {
                // Lưu lại
                await saveSupplementaryQuizDraft({
                    analysisId: analysis.id,
                    examId: analysis.exam_id,
                    studentId: analysis.student_id,
                    title: supTitle,
                    questions: supQuestions,
                    quizId: supQuizId
                });
                const sendRes = await sendSupplementaryQuiz(supQuizId);
                if (sendRes.error) throw new Error(sendRes.error);
                toast.success("Đã gửi bài bổ trợ cho học sinh!");
            } catch (err: any) {
                toast.error("Lỗi: " + err.message);
            } finally {
                setIsSending(false);
            }
        }
    };

    const tabItems = [
        { key: "feedback" as const, label: "💬 Nhận xét", count: null },
        { key: "tasks" as const, label: "📚 Bài tập", count: tasks.length },
        { key: "supplement" as const, label: "✏️ Bài bổ trợ", count: supQuestions.length || null },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[88vh] flex flex-col p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 border-b border-indigo-100 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                            👤 {studentObj?.full_name || "Học sinh"}
                            {analysis.status === 'sent' && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" variant="outline">
                                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> Đã gửi
                                </Badge>
                            )}
                            {analysis.status === 'edited' && (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]" variant="outline">
                                    <PenLine className="w-3 h-3 mr-0.5" /> Đã chỉnh sửa
                                </Badge>
                            )}
                            {analysis.status === 'ai_draft' && (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]" variant="outline">
                                    <Brain className="w-3 h-3 mr-0.5" /> AI Draft
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {(analysis.knowledge_gaps || []).map((gap: string, i: number) => (
                            <Badge key={i} className="bg-red-50 text-red-700 border-none text-[10px]">🔴 {formatKnowledgeGap(gap)}</Badge>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 shrink-0">
                    {tabItems.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                                activeTab === tab.key
                                    ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            {tab.label} {tab.count !== null && tab.count > 0 && `(${tab.count})`}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 p-5 overflow-y-auto">
                    {/* ===== TAB 1: NHẶN XÉT ===== */}
                    {activeTab === "feedback" && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-2">💬 Nhận xét cho học sinh</label>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="w-full min-h-[120px] p-3 border border-slate-200 rounded-xl text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                    placeholder="Nhận xét của AI hoặc tự viết..."
                                />
                        </div>
                        </div>
                    )}

                    {/* ===== TAB 2: BÀI TẬP CẢI THIỆN ===== */}
                    {activeTab === "tasks" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500">Bài tập AI đã tạo (kèm lý thuyết + mini quiz). Có thể thêm/sửa/xóa.</p>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-xs font-semibold h-7 text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                                    onClick={() => setTasks(prev => [...prev, { title: "Bài tập mới", content: "", type: "review", estimated_time: "15 phút" }])}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Thêm bài tập
                                </Button>
                            </div>
                            
                            {tasks.map((task: any, idx: number) => (
                                <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px]">
                                                <BookOpen className="w-3 h-3 mr-1" /> Bài tập {idx + 1}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400">⏱️ {task.estimated_time || '15 phút'}</span>
                                            {task.mini_quiz?.length > 0 && (
                                                <Badge className="bg-purple-50 text-purple-700 border-none text-[9px]">
                                                    <FileQuestion className="w-2.5 h-2.5 mr-0.5" /> {task.mini_quiz.length} câu quiz
                                                </Badge>
                                            )}
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setTasks(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <input
                                        value={task.title || ""}
                                        onChange={(e) => updateTask(idx, "title", e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm mb-2 font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
                                        placeholder="Tên bài tập"
                                    />
                                    <textarea
                                        value={task.content || task.description || ""}
                                        onChange={(e) => updateTask(idx, "content", e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg text-xs min-h-[60px] resize-y focus:ring-2 focus:ring-indigo-500 bg-white"
                                        placeholder="Nội dung bài tập..."
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ===== TAB 3: BÀI BỔ TRỢ — CRUD ===== */}
                    {activeTab === "supplement" && (
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề bài bổ trợ</label>
                                <input
                                    value={supTitle}
                                    onChange={(e) => setSupTitle(e.target.value)}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {/* AI Generate + Add buttons */}
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold"
                                    disabled={isGenerating}
                                    onClick={() => handleGenerateAI("mixed")}
                                >
                                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1.5" />}
                                    {isGenerating ? "Đang tạo..." : "🤖 AI tạo câu hỏi"}
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={addMCQ}>
                                    <Plus className="w-3 h-3 mr-1" /> Trắc nghiệm
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={addEssay}>
                                    <PenLine className="w-3 h-3 mr-1" /> Tự luận
                                </Button>
                            </div>

                            {/* Questions list */}
                            {supQuestions.length === 0 ? (
                                <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400">
                                    <FileQuestion className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium">Chưa có câu hỏi nào.</p>
                                    <p className="text-xs mt-1">Nhấn &quot;AI tạo câu hỏi&quot; hoặc thêm thủ công.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {supQuestions.map((q, idx) => {
                                        const isExpanded = expandedQ === q.id;
                                        return (
                                            <div key={q.id} className={`border rounded-xl overflow-hidden ${q.type === 'mcq' ? 'border-indigo-200' : 'border-amber-200'}`}>
                                                {/* Q Header */}
                                                <div
                                                    className={`flex items-center justify-between p-3 cursor-pointer ${q.type === 'mcq' ? 'bg-indigo-50/50' : 'bg-amber-50/50'}`}
                                                    onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Badge className={`border-none text-[9px] shrink-0 ${q.type === 'mcq' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {q.type === 'mcq' ? '📝 Trắc nghiệm' : '✍️ Tự luận'}
                                                        </Badge>
                                                        <span className="text-xs font-medium text-slate-700 truncate">
                                                            Câu {idx + 1}: {q.question || "(chưa nhập)"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                                    </div>
                                                </div>

                                                {/* Q Expanded */}
                                                {isExpanded && (
                                                    <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                                                        {/* Câu hỏi */}
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-600 mb-1 block">Câu hỏi</label>
                                                            <textarea
                                                                value={q.question}
                                                                onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                                                                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm min-h-[60px] resize-y focus:ring-2 focus:ring-indigo-500 bg-white"
                                                                placeholder="Nhập câu hỏi..."
                                                            />
                                                        </div>

                                                        {q.type === "mcq" && (
                                                            <>
                                                                {/* Đáp án */}
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-600 mb-1 block">Các đáp án</label>
                                                                    <div className="space-y-2">
                                                                        {(q.options || []).map((opt: any) => (
                                                                            <div key={opt.id} className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={() => updateQuestion(q.id, "correct", opt.id)}
                                                                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                                                                        q.correct === opt.id
                                                                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                                            : 'border-slate-300 text-slate-400 hover:border-emerald-300'
                                                                                    }`}
                                                                                >
                                                                                    {opt.id.toUpperCase()}
                                                                                </button>
                                                                                <input
                                                                                    value={opt.text}
                                                                                    onChange={(e) => updateOption(q.id, opt.id, e.target.value)}
                                                                                    className="flex-1 p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                                                                    placeholder={`Đáp án ${opt.id.toUpperCase()}`}
                                                                                />
                                                                                {q.correct === opt.id && (
                                                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-400 mt-1">Click vào chữ cái để chọn đáp án đúng</p>
                                                                </div>
                                                                {/* Giải thích */}
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-600 mb-1 block">Giải thích</label>
                                                                    <textarea
                                                                        value={q.explanation || ""}
                                                                        onChange={(e) => updateQuestion(q.id, "explanation", e.target.value)}
                                                                        className="w-full p-2 border border-slate-200 rounded-lg text-xs min-h-[40px] resize-y focus:ring-2 focus:ring-indigo-500 bg-white"
                                                                        placeholder="Giải thích tại sao đáp án đúng..."
                                                                    />
                                                                </div>
                                                            </>
                                                        )}

                                                        {q.type === "essay" && (
                                                            <>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-600 mb-1 block">Đáp án mẫu (tham khảo)</label>
                                                                    <textarea
                                                                        value={q.sample_answer || ""}
                                                                        onChange={(e) => updateQuestion(q.id, "sample_answer", e.target.value)}
                                                                        className="w-full p-2 border border-slate-200 rounded-lg text-xs min-h-[60px] resize-y focus:ring-2 focus:ring-indigo-500 bg-white"
                                                                        placeholder="Đáp án mẫu cho câu tự luận..."
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-slate-600 mb-1 block">Điểm tối đa</label>
                                                                        <input
                                                                            type="number"
                                                                            value={q.max_score || 10}
                                                                            onChange={(e) => updateQuestion(q.id, "max_score", parseInt(e.target.value) || 10)}
                                                                            className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-slate-600 mb-1 block">Tiêu chí chấm</label>
                                                                        <input
                                                                            value={q.rubric || ""}
                                                                            onChange={(e) => updateQuestion(q.id, "rubric", e.target.value)}
                                                                            className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                                                            placeholder="VD: Đúng ý chính, diễn đạt mạch lạc"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Sup quiz footer actions */}
                            {supQuestions.length > 0 && (
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs font-semibold"
                                        disabled={isSaving}
                                        onClick={handleSaveSupDraft}
                                    >
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                        Lưu nháp
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                                        disabled={isSending}
                                        onClick={handleSendSupOnly}
                                    >
                                        {isSending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                                        Gửi bài bổ trợ
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <DialogFooter className="p-4 border-t border-slate-200 bg-white shrink-0">
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="outline"
                            onClick={handleSaveFeedback}
                            disabled={isSaving}
                            className="flex-1 font-semibold"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lưu
                        </Button>
                        <Button
                            onClick={handleSendFeedback}
                            disabled={isSending}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Gửi tất cả
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
