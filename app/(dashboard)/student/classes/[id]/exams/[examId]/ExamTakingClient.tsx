"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { submitExamAnswers } from "@/lib/actions/exam";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    ArrowLeft, Clock, Send, CheckCircle2, XCircle, Trophy, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Play } from "lucide-react";
import { useActivityTracker } from "@/hooks/useActivityTracker";

export default function ExamTakingClient({
    exam, classId, alreadySubmitted
}: {
    exam: any;
    classId: string;
    alreadySubmitted: any | null;
}) {
    const router = useRouter();
    const questions = exam.questions || [];
    const [answers, setAnswers] = useState<any[]>(
        alreadySubmitted?.answers || questions.map(() => ({ selectedOptionId: null, textAnswer: "" }))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasStarted, setHasStarted] = useState(!!alreadySubmitted);
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
    const [showResult, setShowResult] = useState(!!alreadySubmitted);
    const [result, setResult] = useState<any>(alreadySubmitted);
    const [warnings, setWarnings] = useState(0);
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const isSubmittingRef = useRef(false); // Flag tạm tắt violation detection khi đang nộp bài

    // === Activity Tracker: Theo dõi hành vi học sinh ===
    const tracker = useActivityTracker({
        contextType: "exam",
        contextId: exam.id,
        classId,
        enabled: hasStarted && !showResult,
    });

    // Strict Mode & Fullscreen: Detect tab switch / blur / exit fullscreen
    useEffect(() => {
        if (showResult || !hasStarted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User left the tab
                triggerWarning("Bạn đã thoát khỏi tab làm bài!");
            }
        };

        const handleBlur = () => {
             // User defocused the window
             triggerWarning("Bạn đã chuyển sang cửa sổ khác!");
        };

        const handleFullscreenChange = () => {
             if (!document.fullscreenElement) {
                 triggerWarning("Bạn đã thoát chế độ toàn màn hình!");
             }
        };

        const triggerWarning = (reason: string) => {
            // Nếu đang trong quá trình nộp bài hoặc xác nhận nộp → BỎ QUA detection
            if (isSubmittingRef.current) return;
            
            // Ghi nhận tab switch/warning vào behavior tracker
            tracker.trackWarning(reason);
            if (!exam.is_strict_mode) return;
            
            setWarnings(prev => {
                const newCount = prev + 1;
                if (exam.strict_mode_limit !== null && newCount > exam.strict_mode_limit) {
                    // Auto submit
                    toast.error("Vượt quá số lần cảnh báo (" + newCount + "/" + exam.strict_mode_limit + "). Tự động nộp bài.");
                    handleSubmit(undefined, true);
                } else {
                    toast.error(reason);
                    setShowWarningDialog(true);
                }
                return newCount;
            });
        };

        if (exam.is_strict_mode) {
            document.addEventListener("visibilitychange", handleVisibilityChange);
            window.addEventListener("blur", handleBlur);
            document.addEventListener("fullscreenchange", handleFullscreenChange);
        }

        return () => {
            if (exam.is_strict_mode) {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
                window.removeEventListener("blur", handleBlur);
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
            }
        };
    }, [showResult, hasStarted, exam.is_strict_mode, exam.strict_mode_limit]);

    const handleSubmit = useCallback(async (e?: any, autoSubmit: boolean = false) => {
        if (isSubmitting || !startedAt) return;

        // Bật flag tạm tắt violation detection
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        
        try {
            const elapsed = exam.duration_minutes * 60 - timeLeft;
            const res = await submitExamAnswers(exam.id, classId, answers, startedAt, elapsed);
            if (res.error) {
                toast.error(res.error);
                setIsSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }
            setResult(res.data);
            setShowResult(true);
            toast.success("Nộp bài thành công!");

            // Thoát fullscreen SAU khi submit thành công
            if (document.fullscreenElement) {
                try { await document.exitFullscreen(); } catch (e) { }
            }

            // Trigger AI behavior analysis sau khi nộp bài
            await tracker.trackSubmission({ score: res.data?.score, warnings_count: warnings });
            try {
                fetch("/api/ai/behavior-analysis", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ classId, contextType: "exam", contextId: exam.id }),
                });
            } catch (e) { /* fire-and-forget */ }
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    }, [answers, timeLeft, isSubmitting, exam.id, classId, startedAt, exam.duration_minutes]);

    // Timer
    useEffect(() => {
        if (showResult || !hasStarted) return;
        if (!startedAt) return; // Wait until started info
        if (timeLeft <= 0) {
            handleSubmit(undefined, true);
            return;
        }
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft, showResult, hasStarted, startedAt, handleSubmit]);

    const selectOption = (qIdx: number, optionId: string) => {
        if (showResult) return;
        // Track câu trả lời cho behavior analysis
        tracker.trackQuestionAnswer(qIdx);
        const updated = [...answers];
        updated[qIdx] = { selectedOptionId: optionId };
        setAnswers(updated);
        
        // Track bắt đầu câu hỏi tiếp theo (câu chưa trả lời gần nhất)
        const nextUnanswered = updated.findIndex((a, i) => i > qIdx && a.selectedOptionId === null);
        if (nextUnanswered !== -1) {
            tracker.trackQuestionStart(nextUnanswered);
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const answeredCount = answers.filter(a => a.selectedOptionId !== null || (a.textAnswer && a.textAnswer.trim().length > 0)).length;
    const letters = "ABCDEFGHIJKLMNOP";
    const isLowTime = timeLeft < 60;

    // === RESULT VIEW ===
    if (showResult && result) {
        const score = result.score ?? result.submission?.score ?? 0;
        const total = result.totalPoints ?? result.total_points ?? exam.total_points ?? 0;
        const percent = total > 0 ? Math.round((score / total) * 100) : 0;
        const passed = percent >= 50;

        return (
            <div className="max-w-3xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                    <div className={`p-8 text-center ${passed ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-rose-500'} text-white`}>
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                            {passed ? <Trophy className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                        </div>
                        <h1 className="text-3xl font-extrabold mb-1">{score}/{total}</h1>
                        <p className="text-lg font-semibold opacity-90">{percent}% — {passed ? 'Đạt' : 'Chưa đạt'}</p>
                        <p className="text-sm opacity-75 mt-2">{exam.title}</p>
                    </div>

                    <div className="p-6">
                        <Link href={`/student/classes/${classId}`}>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại lớp học
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* REVIEW QUESTIONS */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 px-2 tracking-tight">Chi tiết bài làm</h2>
                    {questions.map((q: any, qIdx: number) => {
                        const studentAnswer = answers[qIdx];
                        let isCorrectAns = false;
                        
                        // Check correctly if it is a multiple choice
                        if (q.type !== "ESSAY" && exam.show_answers !== false) {
                             const correctOption = (q.options || []).find((o: any) => o.isCorrect);
                             isCorrectAns = studentAnswer?.selectedOptionId === correctOption?.id;
                        }

                        // Determine borders/colors based on show_answers
                        const highlightCorrectness = exam.show_answers !== false && q.type !== 'ESSAY';
                        const containerBorder = highlightCorrectness ? (isCorrectAns ? 'border-emerald-200' : 'border-rose-200') : 'border-slate-200';
                        const headerBg = highlightCorrectness ? (isCorrectAns ? 'bg-emerald-50 border-emerald-100/50' : 'bg-rose-50 border-rose-100/50') : 'bg-slate-50 border-slate-200';

                        return (
                            <div key={q.id || qIdx} className={`bg-white border-2 rounded-xl shadow-sm overflow-hidden transition-colors ${containerBorder}`}>
                                <div className={`px-5 py-3 border-b flex items-center justify-between ${headerBg}`}>
                                    <span className="text-sm font-bold text-slate-700">Câu {qIdx + 1}</span>
                                    <div className="flex items-center gap-2">
                                        {highlightCorrectness && (
                                            isCorrectAns ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Đúng</Badge>
                                            ) : (
                                                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none"><XCircle className="w-3 h-3 mr-1" /> Sai</Badge>
                                            )
                                        )}
                                        <span className="text-xs text-slate-400 font-medium">{q.points || 1} điểm</span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="font-semibold text-slate-800 mb-4 whitespace-pre-wrap">{q.question}</p>
                                    
                                    {q.type === "ESSAY" ? (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 pb-10">
                                            <p className="text-sm text-slate-500 font-medium mb-2 uppercase tracking-wide">Câu trả lời tự luận</p>
                                            <p className="text-slate-800 whitespace-pre-wrap">{studentAnswer?.textAnswer || <span className="text-slate-400 italic">Không có câu trả lời</span>}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {(q.options || []).map((opt: any, oIdx: number) => {
                                                const isSelected = studentAnswer?.selectedOptionId === opt.id;
                                                const isCorrect = exam.show_answers !== false ? opt.isCorrect : false;
                                                
                                                let stateClass = 'border-slate-200 bg-white opacity-60';
                                                let letterClass = 'bg-slate-100 text-slate-500';
                                                
                                                if (isCorrect) {
                                                    stateClass = 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100';
                                                    letterClass = 'bg-emerald-500 text-white';
                                                } else if (isSelected && !isCorrect) {
                                                    stateClass = highlightCorrectness ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-100' : 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100';
                                                    letterClass = highlightCorrectness ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white';
                                                }

                                                return (
                                                    <div
                                                        key={opt.id}
                                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${stateClass}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${letterClass}`}>
                                                            {letters[oIdx]}
                                                        </div>
                                                        <span className={`text-sm ${isSelected || isCorrect ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                                                            {opt.text}
                                                        </span>
                                                        {isSelected && <span className="ml-auto text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Bạn chọn</span>}
                                                        {isCorrect && !isSelected && <span className="ml-auto text-xs font-semibold bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">Đáp án</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // === START SCREEN ===
    if (!hasStarted) {
        return (
            <div className="max-w-2xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6 text-indigo-600">
                        <Play className="w-8 h-8 fill-indigo-600 ml-1" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-3">{exam.title}</h1>
                    {exam.description && <p className="text-slate-500 mb-6">{exam.description}</p>}
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                                <Clock className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Thời lượng</p>
                                <p className="font-bold text-slate-800">{exam.duration_minutes} phút</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                                <Trophy className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Tổng điểm</p>
                                <p className="font-bold text-slate-800">{exam.total_points}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Số lượng câu</p>
                                <p className="font-bold text-slate-800">{questions.length} câu</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl text-left mb-8">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> 
                            Lưu ý quan trọng
                        </h3>
                        <ul className="list-disc pl-5 text-sm text-blue-800 space-y-1.5 opacity-90">
                            <li>Bài kiểm tra sẽ mở trong <strong>chế độ Toàn màn hình (Fullscreen)</strong>.</li>
                            <li>Nếu bạn thoát chế độ toàn màn hình, chuyển tab hoặc qua cửa sổ khác, hệ thống sẽ <strong>cảnh báo gian lận</strong>.</li>
                            {exam.is_strict_mode && exam.strict_mode_limit && (
                                <li>Quá <strong>{exam.strict_mode_limit}</strong> lần cảnh báo, bài sẽ tự động nộp.</li>
                            )}
                            <li>Thời gian làm bài sẽ bắt đầu đếm ngược ngay khi bạn nhấn "Bắt đầu".</li>
                        </ul>
                    </div>

                    <Button 
                        onClick={async () => {
                            try {
                                await document.documentElement.requestFullscreen();
                                setStartedAt(new Date().toISOString());
                                setHasStarted(true);
                                // Track bắt đầu câu hỏi đầu tiên
                                tracker.trackQuestionStart(0);
                            } catch (err) {
                                toast.error("Không thể mở toàn màn hình. Hãy đảm bảo bạn đã cấp quyền cho trình duyệt.");
                            }
                        }}
                        className="w-full sm:w-auto min-w-[200px] h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md"
                    >
                        Tôi đã hiểu, Bắt đầu làm bài
                    </Button>
                </div>
            </div>
        );
    }

    // === EXAM VIEW ===
    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto w-full h-full">
            <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen flex flex-col">
                {/* Sticky header with timer */}
                <div className="sticky top-4 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 px-5 py-3 mb-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-extrabold text-slate-900 truncate">{exam.title}</h1>
                        <p className="text-xs text-slate-500">{answeredCount}/{questions.length} câu đã trả lời</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${isLowTime ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-100 text-indigo-700'}`}>
                        <Clock className="w-4 h-4" />
                        {formatTime(timeLeft)}
                    </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {questions.map((q: any, qIdx: number) => (
                    <div key={q.id || qIdx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:border-indigo-200 transition-colors">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">Câu {qIdx + 1}</span>
                            <span className="text-xs text-slate-400">{q.points || 1} điểm</span>
                        </div>
                            <div className="p-5">
                                <p className="font-semibold text-slate-800 mb-4 whitespace-pre-wrap">{q.question}</p>
                                
                                {q.type === "ESSAY" ? (
                                    <textarea
                                        placeholder="Nhập câu trả lời tự luận của bạn vào đây..."
                                        value={answers[qIdx]?.textAnswer || ""}
                                        onChange={(e) => {
                                            const updated = [...answers];
                                            updated[qIdx] = { ...updated[qIdx], textAnswer: e.target.value };
                                            setAnswers(updated);
                                        }}
                                        className="w-full min-h-[150px] resize-y p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-50 text-slate-700"
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        {(q.options || []).map((opt: any, oIdx: number) => {
                                            const isSelected = answers[qIdx]?.selectedOptionId === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => selectOption(qIdx, opt.id)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                                        ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-200'
                                                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {letters[oIdx]}
                                                    </div>
                                                    <span className={`text-sm ${isSelected ? 'text-indigo-700 font-semibold' : 'text-slate-700'}`}>
                                                        {opt.text}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                    </div>
                ))}
            </div>

            {/* Submit button — mở Dialog xác nhận thay vì submit thẳng */}
            <div className="mt-8 mb-12">
                <Button
                    onClick={() => {
                        isSubmittingRef.current = true; // Tạm tắt detection khi hiện dialog
                        setShowSubmitConfirm(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-base rounded-xl shadow-xl"
                >
                    <Send className="w-5 h-5 mr-2" />
                    {isSubmitting ? "Đang nộp..." : `Nộp bài (${answeredCount}/${questions.length} câu)`}
                </Button>
            </div>

            {/* Submit Confirmation Dialog — hiện ngay trong bài thi, không trigger blur */}
            <Dialog open={showSubmitConfirm} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-[450px] z-[99999]" style={{position: 'fixed'}}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-indigo-700 gap-2 text-lg">
                            <Send className="w-5 h-5" />
                            Xác nhận nộp bài
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 text-sm pt-3 space-y-3">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                                <p className="text-base font-bold text-indigo-800 mb-1">
                                    Bạn đã trả lời {answeredCount}/{questions.length} câu
                                </p>
                                <p className="text-xs text-indigo-600">
                                    Thời gian còn lại: {formatTime(timeLeft)}
                                </p>
                                {answeredCount < questions.length && (
                                    <p className="text-xs text-amber-600 font-semibold mt-2">
                                        ⚠️ Bạn chưa trả lời hết tất cả các câu hỏi!
                                    </p>
                                )}
                            </div>
                            <p className="text-center text-sm text-slate-500">
                                Sau khi nộp bài, bạn sẽ <strong>không thể</strong> chỉnh sửa câu trả lời.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                        <Button
                            onClick={() => {
                                setShowSubmitConfirm(false);
                                handleSubmit(undefined, true);
                            }}
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold h-12 rounded-xl shadow-md"
                        >
                            {isSubmitting ? "Đang nộp bài..." : "✅ Chấp nhận nộp bài"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowSubmitConfirm(false);
                                isSubmittingRef.current = false; // Bật lại detection
                            }}
                            disabled={isSubmitting}
                            className="w-full border-slate-300 text-slate-700 font-semibold h-10 rounded-xl"
                        >
                            Quay lại tiếp tục làm bài
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Warning Dialog */}
            <Dialog open={showWarningDialog} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-[425px] z-[99999]" style={{position: 'fixed'}}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-red-600 gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Cảnh báo gian lận
                        </DialogTitle>
                        <DialogDescription className="text-slate-700 text-base py-4 text-center">
                            Bạn đã thoát khỏi khu vực làm bài hoặc vi phạm quy chế!
                            <br />
                            Số lần cảnh báo: <span className="font-bold text-red-600">{warnings}</span> / {exam.strict_mode_limit || 0}
                            <br />
                            Nếu vượt quá số lần cho phép, hệ thống sẽ tự động nộp bài phần làm hiện tại.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            onClick={async () => {
                                setShowWarningDialog(false);
                                try {
                                    if (!document.fullscreenElement) {
                                        await document.documentElement.requestFullscreen();
                                    }
                                } catch (e) { }
                            }}
                        >
                            Tôi đã hiểu, Quay lại làm bài
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </div>
    );
}
