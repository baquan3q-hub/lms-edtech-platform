"use client";

import { useState, useEffect, useCallback } from "react";
import { submitExamAnswers } from "@/lib/actions/exam";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    ArrowLeft, Clock, Send, CheckCircle2, XCircle, Trophy, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ExamTakingClient({
    exam, classId, alreadySubmitted
}: {
    exam: any;
    classId: string;
    alreadySubmitted: any | null;
}) {
    const router = useRouter();
    const questions = exam.questions || [];
    const [answers, setAnswers] = useState<{ selectedOptionId: string | null }[]>(
        questions.map(() => ({ selectedOptionId: null }))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startedAt] = useState(new Date().toISOString());
    const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
    const [showResult, setShowResult] = useState(!!alreadySubmitted);
    const [result, setResult] = useState<any>(alreadySubmitted);

    // Timer
    useEffect(() => {
        if (showResult) return;
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
    }, [timeLeft, showResult]);

    const selectOption = (qIdx: number, optionId: string) => {
        if (showResult) return;
        const updated = [...answers];
        updated[qIdx] = { selectedOptionId: optionId };
        setAnswers(updated);
    };

    const handleSubmit = useCallback(async (e?: any, autoSubmit: boolean = false) => {
        if (isSubmitting) return;

        if (!autoSubmit && !window.confirm("Bạn có chắc chắn muốn nộp bài chưa?")) {
            return;
        }

        setIsSubmitting(true);
        try {
            const elapsed = exam.duration_minutes * 60 - timeLeft;
            const res = await submitExamAnswers(exam.id, classId, answers, startedAt, elapsed);
            if (res.error) {
                toast.error(res.error);
                setIsSubmitting(false);
                return;
            }
            setResult(res.data);
            setShowResult(true);
            toast.success("Nộp bài thành công!");
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    }, [answers, timeLeft, isSubmitting]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const answeredCount = answers.filter(a => a.selectedOptionId !== null).length;
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
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
            </div>
        );
    }

    // === EXAM VIEW ===
    return (
        <div className="max-w-3xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sticky header with timer */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-5 py-3 mb-6 rounded-b-xl shadow-sm -mx-1">
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
                            <p className="font-semibold text-slate-800 mb-4">{q.question}</p>
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
                        </div>
                    </div>
                ))}
            </div>

            {/* Submit button */}
            <div className="mt-8 sticky bottom-4">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-base rounded-xl shadow-xl"
                >
                    <Send className="w-5 h-5 mr-2" />
                    {isSubmitting ? "Đang nộp..." : `Nộp bài (${answeredCount}/${questions.length} câu)`}
                </Button>
            </div>
        </div>
    );
}
