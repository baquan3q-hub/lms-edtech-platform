"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, CheckCircle, XCircle, Clock, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuizQuestions, submitQuiz } from "../../actions";
import { toast } from "sonner";

export default function QuizViewerClient({
    classId,
    itemId,
    contentData,
    nextItemId,
    progress
}: {
    classId: string;
    itemId: string;
    contentData: any;
    nextItemId: string | null;
    progress?: any;
}) {
    const router = useRouter();
    const [questions, setQuestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Result holds the newly submitted score
    const [result, setResult] = useState<{ score: number, passed: boolean, maxPossibleScore: number } | null>(null);

    // Past result state
    const [showPastResult, setShowPastResult] = useState(!!progress && progress.status === 'completed');

    const maxPossibleScore = questions.reduce((acc, q) => acc + (q.points || 1), 0);

    useEffect(() => {
        async function loadQuestions() {
            setIsLoading(true);
            const res = await getQuizQuestions(itemId);
            if (res.error) {
                toast.error(res.error);
            } else if (res.questions) {
                setQuestions(res.questions);
            }
            setIsLoading(false);
        }
        loadQuestions();
    }, [itemId]);

    const handleAnswerChange = (questionId: string, optionId: string) => {
        // Single choice (radio)
        setAnswers(prev => ({ ...prev, [questionId]: [optionId] }));
    };

    const handleSubmit = async () => {
        const unanswered = questions.filter(q => !answers[q.id] || answers[q.id].length === 0);
        if (unanswered.length > 0) {
            if (!confirm(`Bạn chưa trả lời ${unanswered.length} câu. Bạn có chắc chắn muốn nộp bài?`)) {
                return;
            }
        }

        setIsSubmitting(true);
        const res = await submitQuiz(classId, itemId, answers);
        setIsSubmitting(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Nộp bài thành công!");
            setResult({
                score: res.score as number,
                passed: res.passed as boolean,
                maxPossibleScore: res.maxPossibleScore as number
            });
        }
    };

    if (isLoading) {
        return (
            <div className="text-center p-16">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Đang tải đề thi...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="mb-6 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
                <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Chưa có câu hỏi</h3>
                <p className="text-slate-500 text-sm mt-1">Giáo viên chưa thêm câu hỏi trắc nghiệm cho bài này.</p>
            </div>
        );
    }

    // KẾT QUẢ SAU KHI NỘP BÀI
    if (result) {
        const scorePercent = (result.score / result.maxPossibleScore) * 100;
        return (
            <div className="mb-6 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
                {result.passed ? (
                    <div className="bg-emerald-50 text-emerald-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-100">
                        <Trophy className="w-12 h-12" />
                    </div>
                ) : (
                    <div className="bg-rose-50 text-rose-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-rose-100">
                        <XCircle className="w-12 h-12" />
                    </div>
                )}

                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    {result.passed ? "Chúc mừng! Bạn đã đạt! 🎉" : "Chưa đạt. Hãy thử lại!"}
                </h3>

                <div className="my-6">
                    <div className="relative w-32 h-32 mx-auto">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                            <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                            <circle
                                cx="64" cy="64" r="56" fill="none"
                                stroke={result.passed ? "#10b981" : "#f43f5e"}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${(scorePercent / 100) * 352} 352`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900">{result.score}</span>
                            <span className="text-xs text-slate-400 font-medium">/ {result.maxPossibleScore}</span>
                        </div>
                    </div>
                </div>

                <p className="text-slate-500 mb-6">
                    Điểm qua: <span className="font-bold">{contentData?.min_score || 0}</span> điểm
                </p>

                <div className="flex gap-4 justify-center">
                    <Button
                        variant="outline"
                        className="font-semibold"
                        onClick={() => {
                            setResult(null);
                            setAnswers({});
                        }}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" /> Làm lại
                    </Button>

                    {nextItemId && result.passed && (
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                            onClick={() => router.push(`/student/classes/${classId}/learn/${nextItemId}`)}
                        >
                            Bài tiếp theo →
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // HIỂN THỊ KẾT QUẢ ĐÃ LÀM TỪ TRƯỚC (NẾU HỌC SINH QUAY LẠI)
    if (showPastResult && !result) {
        const pastScore = Number(progress.score || 0);
        const minPass = Number(contentData?.min_score || 0);
        const passed = pastScore >= minPass;
        const scorePercent = maxPossibleScore > 0 ? (pastScore / maxPossibleScore) * 100 : 0;

        return (
            <div className="mb-6 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-indigo-50 text-indigo-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-indigo-100">
                    <CheckCircle className="w-10 h-10" />
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    Bạn đã hoàn thành bài trắc nghiệm này
                </h3>

                <div className="my-6">
                    <div className="relative w-32 h-32 mx-auto">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                            <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                            <circle
                                cx="64" cy="64" r="56" fill="none"
                                stroke={passed ? "#10b981" : "#f43f5e"}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${(scorePercent / 100) * 352} 352`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900">{pastScore}</span>
                            <span className="text-xs text-slate-400 font-medium">/ {maxPossibleScore}</span>
                        </div>
                    </div>
                </div>

                <p className="text-slate-500 mb-6 font-medium">
                    Trạng thái: <span className={passed ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>{passed ? "Đạt" : "Chưa đạt"}</span>
                    <span className="mx-2">•</span>
                    Điểm qua: <span className="font-bold">{minPass}</span>
                </p>

                <div className="flex gap-4 justify-center">
                    <Button
                        variant="outline"
                        className="font-semibold"
                        onClick={() => setShowPastResult(false)}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" /> Làm lại bài
                    </Button>

                    {nextItemId && (
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                            onClick={() => router.push(`/student/classes/${classId}/learn/${nextItemId}`)}
                        >
                            Bài tiếp theo →
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // GIAO DIỆN LÀM BÀI
    const answeredCount = Object.keys(answers).filter(k => answers[k].length > 0).length;

    return (
        <div className="mb-6">
            {/* Quiz Header */}
            <div className="p-6 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl shadow-lg border border-indigo-400 text-white mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center">
                        <CheckSquare className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">Bài Trắc Nghiệm</h3>
                        <p className="text-indigo-200 text-sm">{questions.length} câu hỏi</p>
                    </div>
                </div>

                <div className="flex gap-6 text-indigo-100 text-sm font-medium flex-wrap">
                    <span className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4" /> Điểm qua: {contentData?.min_score || 0}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4" /> Số lần tối đa: {contentData?.max_attempts || 'Không giới hạn'}
                    </span>
                    <span>•</span>
                    <span>Lấy điểm: {
                        contentData?.score_method === 'latest' ? 'Lần cuối' :
                            contentData?.score_method === 'average' ? 'Trung bình' : 'Cao nhất'
                    }</span>
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-5">
                {questions.map((q, index) => {
                    const currentSelected = answers[q.id] || [];

                    return (
                        <div key={q.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            {/* Question header */}
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold shrink-0 mt-0.5">
                                    {index + 1}
                                </span>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-800 whitespace-pre-wrap">{q.content}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{q.points || 1} điểm</p>
                                </div>
                                {currentSelected.length > 0 && (
                                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
                                )}
                            </div>

                            {/* Options */}
                            <div className="p-4 space-y-2">
                                {(q.options || []).map((opt: any, optIndex: number) => {
                                    const isSelected = currentSelected.includes(opt.id);
                                    const letter = String.fromCharCode(65 + optIndex); // A, B, C, D

                                    return (
                                        <label
                                            key={opt.id}
                                            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${isSelected
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {letter}
                                            </div>
                                            <input
                                                type="radio"
                                                name={`question-${q.id}`}
                                                className="sr-only"
                                                checked={isSelected}
                                                onChange={() => handleAnswerChange(q.id, opt.id)}
                                            />
                                            <span className={`text-sm ${isSelected ? 'font-semibold text-indigo-700' : 'text-slate-700'}`}>
                                                {opt.text}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Submit Footer */}
            <div className="mt-8 flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500">
                    Đã trả lời: <span className="font-bold text-slate-900">{answeredCount}</span> / {questions.length} câu
                </p>
                <Button
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-bold shadow-md"
                    onClick={handleSubmit}
                    disabled={isSubmitting || questions.length === 0}
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Đang chấm bài...
                        </>
                    ) : (
                        "Nộp bài"
                    )}
                </Button>
            </div>
        </div>
    );
}
