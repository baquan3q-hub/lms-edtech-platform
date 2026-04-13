"use client";

import { useState, useEffect } from "react";
import { fetchSurveysForParent, fetchSurveyDetail, submitSurveyResponse } from "@/lib/actions/surveys";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    ClipboardList, Loader2, Star, CheckCircle2, Send,
    CalendarClock, ChevronRight, ListChecks, Type,
    Clock
} from "lucide-react";

export default function ParentSurveysClient({ studentIds }: { studentIds: string[] }) {
    const [surveys, setSurveys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Survey response modal
    const [modalOpen, setModalOpen] = useState(false);
    const [surveyDetail, setSurveyDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadSurveys();
    }, []);

    const loadSurveys = async () => {
        setLoading(true);
        if (studentIds.length > 0) {
            const res = await fetchSurveysForParent(studentIds[0]);
            if (res.data) setSurveys(res.data);
        }
        setLoading(false);
    };

    const openSurvey = async (survey: any) => {
        if (survey.is_answered) {
            toast.info("Bạn đã trả lời khảo sát này rồi.");
            return;
        }
        setModalOpen(true);
        setDetailLoading(true);
        setAnswers({});

        const res = await fetchSurveyDetail(survey.id);
        setSurveyDetail(res.data || null);
        setDetailLoading(false);
    };

    const updateAnswer = (questionId: string, field: string, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { ...(prev[questionId] || {}), [field]: value },
        }));
    };

    const toggleChoice = (questionId: string, option: string, isMultiple: boolean) => {
        setAnswers(prev => {
            const current = prev[questionId]?.selected || [];
            if (isMultiple) {
                const newSelected = current.includes(option)
                    ? current.filter((o: string) => o !== option)
                    : [...current, option];
                return { ...prev, [questionId]: { ...prev[questionId], selected: newSelected } };
            } else {
                return { ...prev, [questionId]: { ...prev[questionId], selected: [option] } };
            }
        });
    };

    const handleSubmit = async () => {
        if (!surveyDetail) return;

        // Validate required
        for (const q of surveyDetail.questions) {
            if (!q.is_required) continue;
            const a = answers[q.id];
            if (!a) { toast.error(`Vui lòng trả lời: "${q.question_text}"`); return; }
            if (["single_choice", "multiple_choice"].includes(q.question_type) && (!a.selected || a.selected.length === 0)) {
                toast.error(`Vui lòng chọn đáp án cho: "${q.question_text}"`); return;
            }
            if (q.question_type === "text" && !a.text?.trim()) {
                toast.error(`Vui lòng nhập câu trả lời cho: "${q.question_text}"`); return;
            }
            if (q.question_type === "rating" && !a.rating) {
                toast.error(`Vui lòng đánh giá: "${q.question_text}"`); return;
            }
        }

        setSubmitting(true);
        const responseData = surveyDetail.questions.map((q: any) => ({
            question_id: q.id,
            answer: answers[q.id] || {},
        }));

        const res = await submitSurveyResponse(surveyDetail.id, responseData);
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã gửi câu trả lời! Cảm ơn bạn.");
            setModalOpen(false);
            loadSurveys();
        }
        setSubmitting(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Khảo sát</h1>
                    <p className="text-sm text-slate-500">Trả lời khảo sát từ nhà trường và giáo viên</p>
                </div>
            </div>

            {/* Survey List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                </div>
            ) : surveys.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có khảo sát nào</h3>
                    <p className="text-sm text-slate-400">Bạn sẽ nhận thông báo khi có khảo sát mới.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {surveys.map((s: any) => {
                        const isExpired = s.deadline && new Date(s.deadline) < new Date();

                        return (
                            <button
                                key={s.id}
                                onClick={() => openSurvey(s)}
                                disabled={isExpired && !s.is_answered}
                                className={`w-full text-left border rounded-xl p-4 transition-all ${
                                    s.is_answered
                                        ? "bg-emerald-50/50 border-emerald-200"
                                        : isExpired
                                            ? "bg-slate-50 border-slate-200 opacity-60"
                                            : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        s.is_answered
                                            ? "bg-emerald-100"
                                            : "bg-indigo-100"
                                    }`}>
                                        {s.is_answered
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            : <ClipboardList className="w-5 h-5 text-indigo-600" />
                                        }
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-slate-900 text-sm">{s.title}</h4>
                                            {s.is_answered && (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px]">
                                                    ✅ Đã trả lời
                                                </Badge>
                                            )}
                                            {isExpired && !s.is_answered && (
                                                <Badge className="bg-red-100 text-red-700 border-none text-[9px]">
                                                    Hết hạn
                                                </Badge>
                                            )}
                                        </div>
                                        {s.description && (
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                            {s.deadline && (
                                                <span className="flex items-center gap-1">
                                                    <CalendarClock className="w-3 h-3" />
                                                    Hạn: {new Date(s.deadline).toLocaleDateString("vi-VN")}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(s.created_at).toLocaleDateString("vi-VN")}
                                            </span>
                                        </div>
                                    </div>

                                    {!s.is_answered && !isExpired && (
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* === SURVEY RESPONSE MODAL === */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-5 bg-gradient-to-r from-indigo-50 to-violet-50 border-b shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <ClipboardList className="w-5 h-5 text-indigo-600" />
                            {surveyDetail?.title || "Khảo sát"}
                        </DialogTitle>
                        {surveyDetail?.description && (
                            <p className="text-xs text-slate-500 mt-1">{surveyDetail.description}</p>
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {detailLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            </div>
                        ) : !surveyDetail ? (
                            <p className="text-center text-slate-400 py-12">Không tải được khảo sát</p>
                        ) : (
                            <>
                                {surveyDetail.questions?.map((q: any, idx: number) => (
                                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                        <div className="flex items-start gap-2 mb-4">
                                            <span className="text-sm font-black text-indigo-400">#{idx + 1}</span>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">{q.question_text}</h4>
                                                {q.is_required && <span className="text-red-500 text-xs ml-1">*</span>}
                                            </div>
                                        </div>

                                        {/* Single Choice */}
                                        {q.question_type === "single_choice" && (
                                            <div className="space-y-2">
                                                {(q.options || []).map((opt: string, oIdx: number) => {
                                                    const isSelected = answers[q.id]?.selected?.includes(opt);
                                                    return (
                                                        <button key={oIdx} onClick={() => toggleChoice(q.id, opt, false)}
                                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                                                isSelected
                                                                    ? "border-indigo-400 bg-indigo-50"
                                                                    : "border-slate-200 hover:border-slate-300"
                                                            }`}>
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-300"
                                                            }`}>
                                                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                            </div>
                                                            <span className="text-sm text-slate-700">{opt}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Multiple Choice */}
                                        {q.question_type === "multiple_choice" && (
                                            <div className="space-y-2">
                                                {(q.options || []).map((opt: string, oIdx: number) => {
                                                    const isSelected = answers[q.id]?.selected?.includes(opt);
                                                    return (
                                                        <button key={oIdx} onClick={() => toggleChoice(q.id, opt, true)}
                                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                                                isSelected
                                                                    ? "border-purple-400 bg-purple-50"
                                                                    : "border-slate-200 hover:border-slate-300"
                                                            }`}>
                                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                                                isSelected ? "border-purple-500 bg-purple-500" : "border-slate-300"
                                                            }`}>
                                                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className="text-sm text-slate-700">{opt}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Rating */}
                                        {q.question_type === "rating" && (
                                            <div className="flex items-center gap-2 py-2">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <button key={s} onClick={() => updateAnswer(q.id, "rating", s)}
                                                        className="transition-transform hover:scale-110 active:scale-95">
                                                        <Star
                                                            className={`w-8 h-8 ${s <= (answers[q.id]?.rating || 0) ? "text-amber-400" : "text-slate-200"}`}
                                                            fill={s <= (answers[q.id]?.rating || 0) ? "currentColor" : "none"}
                                                        />
                                                    </button>
                                                ))}
                                                {answers[q.id]?.rating && (
                                                    <span className="text-sm font-bold text-amber-600 ml-2">
                                                        {answers[q.id].rating}/5
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Text */}
                                        {q.question_type === "text" && (
                                            <Textarea
                                                placeholder="Nhập câu trả lời của bạn..."
                                                value={answers[q.id]?.text || ""}
                                                onChange={(e) => updateAnswer(q.id, "text", e.target.value)}
                                                rows={3}
                                            />
                                        )}
                                    </div>
                                ))}

                                {/* Submit */}
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleSubmit} disabled={submitting}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8">
                                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                        Gửi câu trả lời
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
