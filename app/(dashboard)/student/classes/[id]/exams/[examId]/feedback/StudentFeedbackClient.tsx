"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    MessageSquare, BookOpen, Clock, CheckCircle2, Circle,
    AlertTriangle, Award, PartyPopper, Loader2, Lightbulb,
    ChevronDown, ChevronUp, XCircle, FileQuestion
} from "lucide-react";
import { fetchStudentFeedback, updateImprovementProgress, fetchSupplementaryQuizzes, submitSupplementaryQuiz } from "@/lib/actions/quiz-analysis";
import { toast } from "sonner";
import Link from "next/link";

interface StudentFeedbackPageProps {
    examId: string;
    classId: string;
    examTitle: string;
}

export default function StudentFeedbackClient({ examId, classId, examTitle }: StudentFeedbackPageProps) {
    const [feedback, setFeedback] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [completedAll, setCompletedAll] = useState(false);

    // Mini quiz state
    const [quizAnswers, setQuizAnswers] = useState<Record<number, Record<string, string>>>({});
    const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
    const [expandedTask, setExpandedTask] = useState<number | null>(0);

    // Supplementary quiz state
    const [supQuizzes, setSupQuizzes] = useState<any[]>([]);
    const [supAnswers, setSupAnswers] = useState<Record<string, Record<string, string>>>({});
    const [supSubmitted, setSupSubmitted] = useState<Record<string, boolean>>({});
    const [expandedSupQuiz, setExpandedSupQuiz] = useState<string | null>(null);

    useEffect(() => {
        loadFeedback();
    }, [examId]);

    const loadFeedback = async () => {
        setIsLoading(true);
        const { data } = await fetchStudentFeedback(examId);
        if (data) setFeedback(data);
        // Load supplementary quizzes
        const { data: quizzes } = await fetchSupplementaryQuizzes(examId);
        setSupQuizzes(quizzes || []);
        // Pre-fill submitted state for completed quizzes
        const submitted: Record<string, boolean> = {};
        const answers: Record<string, Record<string, string>> = {};
        (quizzes || []).forEach((q: any) => {
            if (q.status === 'completed') {
                submitted[q.id] = true;
                answers[q.id] = q.student_answers || {};
            }
        });
        setSupSubmitted(submitted);
        setSupAnswers(answers);
        setIsLoading(false);
    };

    const handleSelectAnswer = (taskIdx: number, questionId: string, optionId: string) => {
        if (quizSubmitted[taskIdx]) return;
        setQuizAnswers(prev => ({
            ...prev,
            [taskIdx]: { ...(prev[taskIdx] || {}), [questionId]: optionId }
        }));
    };

    const handleSubmitQuiz = (taskIdx: number) => {
        setQuizSubmitted(prev => ({ ...prev, [taskIdx]: true }));
    };

    const getQuizScore = (taskIdx: number, miniQuiz: any[]) => {
        const answers = quizAnswers[taskIdx] || {};
        let correct = 0;
        miniQuiz.forEach(q => {
            if (answers[q.id] === q.correct) correct++;
        });
        return { correct, total: miniQuiz.length };
    };

    const handleCompleteTask = async (progressId: string, taskIndex: number) => {
        const tasks = feedback?.teacher_edited_tasks || feedback?.improvement_tasks || [];
        const task = tasks[taskIndex];
        const miniQuiz = task?.mini_quiz || [];
        const { correct, total } = getQuizScore(taskIndex, miniQuiz);
        const answers = quizAnswers[taskIndex] || {};

        const res = await updateImprovementProgress(progressId, "completed", {
            quiz_score: correct,
            quiz_total: total,
            quiz_answers: answers
        });
        if (res.error) {
            toast.error("Lỗi: " + res.error);
            return;
        }

        setFeedback((prev: any) => {
            if (!prev) return prev;
            const updated = {
                ...prev,
                progress: prev.progress.map((p: any) =>
                    p.id === progressId ? { ...p, status: 'completed', completed_at: new Date().toISOString(), quiz_score: correct, quiz_total: total } : p
                )
            };
            const allDone = updated.progress.every((p: any) => p.status === 'completed');
            if (allDone) setCompletedAll(true);
            return updated;
        });

        toast.success(`Hoàn thành! Điểm mini quiz: ${correct}/${total} 🎉`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="ml-2 text-sm text-slate-500">Đang tải nhận xét...</span>
            </div>
        );
    }

    if (!feedback) {
        return (
            <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700 mb-2">Chưa có nhận xét</h3>
                    <p className="text-sm text-slate-400">Giáo viên chưa gửi nhận xét cho bài kiểm tra này.</p>
                    <Link href={`/student/classes/${classId}`}>
                        <Button variant="outline" className="mt-4 text-sm">Quay lại lớp học</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    const tasks = feedback.teacher_edited_tasks || feedback.improvement_tasks || [];
    const progress = feedback.progress || [];
    const completedCount = progress.filter((p: any) => p.status === 'completed').length;
    const totalTasks = tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    const deadlineDate = feedback.deadline ? new Date(feedback.deadline) : null;
    const daysLeft = deadlineDate ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
    const displayFeedback = feedback.teacher_edited_feedback || feedback.ai_feedback || "";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Banner hoàn thành */}
            {completedAll && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white text-center animate-in zoom-in duration-500">
                    <PartyPopper className="w-10 h-10 mx-auto mb-2" />
                    <h2 className="text-xl font-extrabold">🎉 Xuất sắc!</h2>
                    <p className="text-emerald-100 text-sm mt-1">Em đã hoàn thành tất cả bài tập cải thiện. Tiếp tục cố gắng nhé!</p>
                </div>
            )}

            {/* Nhận xét từ Giáo viên */}
            <Card className="shadow-sm border-indigo-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-indigo-100">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" /> Nhận xét từ Giáo viên
                    </h3>
                </div>
                <CardContent className="p-5">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{displayFeedback}</p>
                    {feedback.knowledge_gaps && feedback.knowledge_gaps.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5" /> Kiến thức cần cải thiện
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {feedback.knowledge_gaps.map((gap: string, i: number) => (
                                    <Badge key={i} className="bg-red-50 text-red-700 border-none text-[10px]">🔴 {gap}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Progress tổng */}
            {totalTasks > 0 && (
                <Card className="shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-slate-800">Hoàn thành: {completedCount}/{totalTasks} bài tập</span>
                            {daysLeft !== null && (
                                <Badge className={`text-[10px] ${daysLeft <= 2 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'} border-none`}>
                                    <Clock className="w-3 h-3 mr-1" /> Còn {daysLeft} ngày
                                </Badge>
                            )}
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                        <p className="text-[10px] text-slate-400 mt-1 text-right">{progressPercent}%</p>
                    </CardContent>
                </Card>
            )}

            {/* Bài tập cải thiện */}
            {totalTasks > 0 && (
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <BookOpen className="w-5 h-5 text-indigo-500" /> Bài tập cải thiện ({totalTasks})
                    </h3>
                    <div className="space-y-4">
                        {tasks.map((task: any, idx: number) => {
                            const prog = progress.find((p: any) => p.task_index === idx);
                            const isCompleted = prog?.status === 'completed';
                            const isExpanded = expandedTask === idx;
                            const miniQuiz = task.mini_quiz || [];
                            const theory = task.theory;
                            const submitted = quizSubmitted[idx];
                            const answers = quizAnswers[idx] || {};
                            const quizResult = submitted ? getQuizScore(idx, miniQuiz) : null;

                            return (
                                <Card key={idx} className={`shadow-sm transition-all overflow-hidden ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                                    {/* Task Header */}
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                                        onClick={() => setExpandedTask(isExpanded ? null : idx)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-300" />
                                            )}
                                            <div>
                                                <h4 className={`font-bold text-sm ${isCompleted ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                    📘 Bài tập {idx + 1}: {task.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge className="bg-slate-100 text-slate-500 border-none text-[9px]">
                                                        <Clock className="w-2.5 h-2.5 mr-0.5" /> {task.estimated_time || '15 phút'}
                                                    </Badge>
                                                    {isCompleted && prog?.quiz_score !== null && (
                                                        <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px]">
                                                            ✅ Quiz: {prog.quiz_score}/{prog.quiz_total}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 p-5 space-y-5">
                                            {/* Lý thuyết */}
                                            {theory && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                    <h5 className="font-bold text-sm text-blue-800 flex items-center gap-1.5 mb-3">
                                                        <Lightbulb className="w-4 h-4" /> Lý thuyết nhanh
                                                    </h5>
                                                    <p className="text-sm text-slate-700 leading-relaxed mb-3">{theory.explanation}</p>
                                                    {theory.formula && (
                                                        <div className="bg-white border border-blue-100 rounded-lg p-3 mb-3 font-mono text-sm text-blue-900">
                                                            📐 {theory.formula}
                                                        </div>
                                                    )}
                                                    {theory.examples && theory.examples.length > 0 && (
                                                        <div className="mb-3">
                                                            <p className="text-xs font-bold text-slate-600 mb-1.5">Ví dụ:</p>
                                                            <ul className="space-y-1">
                                                                {theory.examples.map((ex: string, i: number) => (
                                                                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                                                        <span className="text-blue-500 shrink-0">•</span>
                                                                        <span>{ex}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {theory.tip && (
                                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                                                            💡 <strong>Mẹo:</strong> {theory.tip}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Mini Quiz */}
                                            {miniQuiz.length > 0 && (
                                                <div>
                                                    <h5 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-3">
                                                        ✏️ Bài luyện tập ({miniQuiz.length} câu)
                                                    </h5>
                                                    <div className="space-y-4">
                                                        {miniQuiz.map((q: any, qIdx: number) => {
                                                            const selectedId = answers[q.id];
                                                            const isCorrect = submitted && selectedId === q.correct;
                                                            const isWrong = submitted && selectedId && selectedId !== q.correct;

                                                            return (
                                                                <div key={q.id} className={`border rounded-xl p-4 ${submitted ? (isCorrect ? 'border-emerald-200 bg-emerald-50/30' : isWrong ? 'border-red-200 bg-red-50/30' : 'border-slate-200') : 'border-slate-200'}`}>
                                                                    <p className="text-sm font-semibold text-slate-800 mb-3">
                                                                        Câu {qIdx + 1}: {q.question}
                                                                    </p>
                                                                    <div className="space-y-2">
                                                                        {(q.options || []).map((opt: any) => {
                                                                            const isSelected = selectedId === opt.id;
                                                                            const isThisCorrect = submitted && opt.id === q.correct;
                                                                            const isThisWrong = submitted && isSelected && opt.id !== q.correct;

                                                                            let optClass = "border-slate-200 bg-white hover:bg-slate-50";
                                                                            if (isSelected && !submitted) optClass = "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400";
                                                                            if (isThisCorrect) optClass = "border-emerald-400 bg-emerald-50";
                                                                            if (isThisWrong) optClass = "border-red-400 bg-red-50";

                                                                            return (
                                                                                <button
                                                                                    key={opt.id}
                                                                                    onClick={() => handleSelectAnswer(idx, q.id, opt.id)}
                                                                                    disabled={submitted}
                                                                                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center gap-3 ${optClass} ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                                                                                >
                                                                                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${isSelected && !submitted ? 'border-indigo-500 bg-indigo-500 text-white' : isThisCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : isThisWrong ? 'border-red-500 bg-red-500 text-white' : 'border-slate-300 text-slate-400'}`}>
                                                                                        {opt.id.toUpperCase()}
                                                                                    </span>
                                                                                    <span className="flex-1">{opt.text}</span>
                                                                                    {isThisCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                                                    {isThisWrong && <XCircle className="w-4 h-4 text-red-500" />}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Giải thích sau khi submit */}
                                                                    {submitted && q.explanation && (
                                                                        <div className={`mt-3 p-3 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                                                            {isCorrect ? '✅' : '💡'} {q.explanation}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Submit / Score */}
                                                    {!submitted ? (
                                                        <Button
                                                            onClick={() => handleSubmitQuiz(idx)}
                                                            disabled={Object.keys(answers).length < miniQuiz.length}
                                                            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold w-full"
                                                        >
                                                            Kiểm tra đáp án ({Object.keys(answers).length}/{miniQuiz.length} câu đã chọn)
                                                        </Button>
                                                    ) : (
                                                        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl text-center">
                                                            <p className="text-lg font-extrabold text-slate-800">
                                                                Kết quả: {quizResult?.correct}/{quizResult?.total} câu đúng
                                                                {quizResult && quizResult.correct === quizResult.total && " 🎉"}
                                                            </p>
                                                            <Progress value={quizResult ? (quizResult.correct / quizResult.total) * 100 : 0} className="h-2 mt-2" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Nút hoàn thành */}
                                            {!isCompleted && submitted && prog && (
                                                <Button
                                                    onClick={() => handleCompleteTask(prog.id, idx)}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Đánh dấu hoàn thành bài tập này
                                                </Button>
                                            )}

                                            {isCompleted && (
                                                <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 rounded-xl">
                                                    <Award className="w-5 h-5 text-emerald-500" />
                                                    <p className="text-sm font-bold text-emerald-700">Đã hoàn thành!</p>
                                                    {prog?.quiz_score !== null && (
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-2">
                                                            Quiz: {prog.quiz_score}/{prog.quiz_total}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bài tập bổ trợ (MCQ + Tự luận) */}
            {supQuizzes.length > 0 && (
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <FileQuestion className="w-5 h-5 text-purple-500" /> Bài tập bổ trợ ({supQuizzes.length})
                    </h3>
                    <div className="space-y-4">
                        {supQuizzes.map((sq: any) => {
                            const isExpanded = expandedSupQuiz === sq.id;
                            const isComplete = sq.status === 'completed' || supSubmitted[sq.id];
                            const sqAnswers = supAnswers[sq.id] || {};
                            const questions = sq.questions || [];
                            const mcqQs = questions.filter((q: any) => q.type !== 'essay');
                            const essayQs = questions.filter((q: any) => q.type === 'essay');

                            let sqScore = 0;
                            if (isComplete) {
                                mcqQs.forEach((q: any) => { if (sqAnswers[q.id] === q.correct) sqScore++; });
                            }

                            const mcqDone = Object.keys(sqAnswers).filter(k => mcqQs.some((q: any) => q.id === k)).length;
                            const essayDone = Object.keys(sqAnswers).filter(k => essayQs.some((q: any) => q.id === k) && sqAnswers[k]?.trim()).length;
                            const totalDone = mcqDone + essayDone;

                            return (
                                <Card key={sq.id} className={`shadow-sm transition-all overflow-hidden ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-purple-200'}`}>
                                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpandedSupQuiz(isExpanded ? null : sq.id)}>
                                        <div className="flex items-center gap-3">
                                            {isComplete ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <FileQuestion className="w-5 h-5 text-purple-500" />}
                                            <div>
                                                <h4 className={`font-bold text-sm ${isComplete ? 'text-emerald-700' : 'text-purple-800'}`}>{sq.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {mcqQs.length > 0 && <Badge className="bg-indigo-50 text-indigo-700 border-none text-[9px]">📝 {mcqQs.length} trắc nghiệm</Badge>}
                                                    {essayQs.length > 0 && <Badge className="bg-amber-50 text-amber-700 border-none text-[9px]">✍️ {essayQs.length} tự luận</Badge>}
                                                    {isComplete && mcqQs.length > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px]">✅ {sq.score ?? sqScore}/{mcqQs.length}</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 p-5 space-y-4">
                                            {questions.map((q: any, qIdx: number) => {
                                                const submitted = supSubmitted[sq.id];

                                                // Câu tự luận
                                                if (q.type === 'essay') {
                                                    const essayText = sqAnswers[q.id] || "";
                                                    return (
                                                        <div key={q.id} className={`border rounded-xl p-4 ${submitted ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200'}`}>
                                                            <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] mb-2">✍️ Tự luận {q.max_score ? `(${q.max_score} điểm)` : ''}</Badge>
                                                            <p className="text-sm font-semibold text-slate-800 mb-3">Câu {qIdx + 1}: {q.question}</p>
                                                            {!submitted ? (
                                                                <textarea
                                                                    value={essayText}
                                                                    onChange={(e) => setSupAnswers((prev: Record<string, Record<string, string>>) => ({ ...prev, [sq.id]: { ...(prev[sq.id] || {}), [q.id]: e.target.value } }))}
                                                                    className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm resize-y focus:ring-2 focus:ring-amber-500 bg-white"
                                                                    placeholder="Viết câu trả lời của em ở đây..."
                                                                />
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                        <p className="text-[10px] font-bold text-blue-700 mb-1">📝 Câu trả lời:</p>
                                                                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{essayText || "(Chưa trả lời)"}</p>
                                                                    </div>
                                                                    {q.sample_answer && (
                                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                                                            <p className="text-[10px] font-bold text-emerald-700 mb-1">✅ Đáp án mẫu:</p>
                                                                            <p className="text-xs text-slate-700 whitespace-pre-wrap">{q.sample_answer}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                // Câu trắc nghiệm (MCQ)
                                                const selectedId = sqAnswers[q.id];
                                                const isCorrect = submitted && selectedId === q.correct;
                                                const isWrong = submitted && selectedId && selectedId !== q.correct;
                                                return (
                                                    <div key={q.id} className={`border rounded-xl p-4 ${submitted ? (isCorrect ? 'border-emerald-200 bg-emerald-50/30' : isWrong ? 'border-red-200 bg-red-50/30' : 'border-slate-200') : 'border-slate-200'}`}>
                                                        <Badge className="bg-indigo-100 text-indigo-700 border-none text-[9px] mb-2">📝 Trắc nghiệm</Badge>
                                                        <p className="text-sm font-semibold text-slate-800 mb-3">Câu {qIdx + 1}: {q.question}</p>
                                                        <div className="space-y-2">
                                                            {(q.options || []).map((opt: any) => {
                                                                const isSelected = selectedId === opt.id;
                                                                const isThisCorrect = submitted && opt.id === q.correct;
                                                                const isThisWrong = submitted && isSelected && opt.id !== q.correct;
                                                                let optClass = "border-slate-200 bg-white hover:bg-slate-50";
                                                                if (isSelected && !submitted) optClass = "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400";
                                                                if (isThisCorrect) optClass = "border-emerald-400 bg-emerald-50";
                                                                if (isThisWrong) optClass = "border-red-400 bg-red-50";
                                                                return (
                                                                    <button
                                                                        key={opt.id}
                                                                        onClick={() => { if (!submitted) setSupAnswers((prev: Record<string, Record<string, string>>) => ({ ...prev, [sq.id]: { ...(prev[sq.id] || {}), [q.id]: opt.id } })); }}
                                                                        disabled={!!submitted}
                                                                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center gap-3 ${optClass} ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                                                                    >
                                                                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${isSelected && !submitted ? 'border-indigo-500 bg-indigo-500 text-white' : isThisCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : isThisWrong ? 'border-red-500 bg-red-500 text-white' : 'border-slate-300 text-slate-400'}`}>
                                                                            {opt.id.toUpperCase()}
                                                                        </span>
                                                                        <span className="flex-1">{opt.text}</span>
                                                                        {isThisCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                                        {isThisWrong && <XCircle className="w-4 h-4 text-red-500" />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {submitted && q.explanation && (
                                                            <div className={`mt-3 p-3 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                                                {isCorrect ? '✅' : '💡'} {q.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Nộp bài */}
                                            {!supSubmitted[sq.id] ? (
                                                <Button
                                                    onClick={async () => {
                                                        const answers = supAnswers[sq.id] || {};
                                                        setSupSubmitted((prev: Record<string, boolean>) => ({ ...prev, [sq.id]: true }));
                                                        const res = await submitSupplementaryQuiz(sq.id, answers);
                                                        if (res.error) { toast.error("Lỗi: " + res.error); return; }
                                                        setSupQuizzes((prev: any[]) => prev.map((q: any) => q.id === sq.id ? { ...q, status: 'completed', score: res.score } : q));
                                                        toast.success(`Hoàn thành! Điểm trắc nghiệm: ${res.score}/${res.total} 🎉`);
                                                    }}
                                                    disabled={totalDone < questions.length}
                                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                                >
                                                    Nộp bài ({totalDone}/{questions.length} câu đã làm)
                                                </Button>
                                            ) : (
                                                <div className="p-4 bg-white border border-slate-200 rounded-xl text-center">
                                                    {mcqQs.length > 0 && (
                                                        <p className="text-lg font-extrabold text-slate-800">
                                                            Trắc nghiệm: {sq.score ?? sqScore}/{mcqQs.length} đúng
                                                            {(sq.score ?? sqScore) === mcqQs.length && " 🎉"}
                                                        </p>
                                                    )}
                                                    {essayQs.length > 0 && (
                                                        <p className="text-sm text-amber-700 mt-1 font-medium">
                                                            ✍️ {essayQs.length} câu tự luận — Giáo viên sẽ chấm
                                                        </p>
                                                    )}
                                                    <Progress value={mcqQs.length > 0 ? ((sq.score ?? sqScore) / mcqQs.length) * 100 : 100} className="h-2 mt-2" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
