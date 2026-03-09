"use client";

import { useState } from "react";
import { submitHomework } from "@/lib/actions/homework";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    ListChecks, FileText, Video, Paperclip,
    CheckCircle2, Clock, ArrowLeft, Send, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    multiple_choice: { label: "Trắc nghiệm", icon: ListChecks, color: "text-indigo-600", bg: "bg-indigo-50" },
    essay: { label: "Tự luận", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
    video: { label: "Nộp Video", icon: Video, color: "text-rose-600", bg: "bg-rose-50" },
    attachment: { label: "Đính kèm & Minh chứng", icon: Paperclip, color: "text-amber-600", bg: "bg-amber-50" },
};

export default function HomeworkSubmitClient({
    homework,
    existingSubmission,
    classId,
}: {
    homework: any;
    existingSubmission: any;
    classId: string;
}) {
    const router = useRouter();
    const questions: any[] = homework.questions || [];
    const isGraded = existingSubmission?.status === "graded";
    const isSubmitted = existingSubmission?.status === "submitted" || isGraded;

    // Initialize answers from existing submission or empty
    const [answers, setAnswers] = useState<any[]>(() => {
        if (existingSubmission?.answers) return existingSubmission.answers;
        return questions.map((q: any) => ({
            question_id: q.id,
            type: q.type,
            selected_option_id: "",
            essay_text: "",
            video_url: "",
            attachment_url: "",
            proof_image_url: "",
        }));
    });
    const [submitting, setSubmitting] = useState(false);

    const updateAnswer = (qIdx: number, field: string, value: string) => {
        const next = [...answers];
        next[qIdx] = { ...next[qIdx], [field]: value };
        setAnswers(next);
    };

    const handleSubmit = async () => {
        // Validate
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const a = answers[i];
            if (q.type === "multiple_choice" && !a?.selected_option_id) {
                toast.error(`Câu ${i + 1}: Chưa chọn đáp án`);
                return;
            }
            if (q.type === "essay" && !a?.essay_text?.trim()) {
                toast.error(`Câu ${i + 1}: Chưa viết câu trả lời`);
                return;
            }
        }

        setSubmitting(true);
        const res = await submitHomework(homework.id, answers);
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Nộp bài thành công!");
            router.refresh();
        }
        setSubmitting(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link
                href={`/student/classes/${classId}`}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại lớp học
            </Link>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h1 className="text-xl font-extrabold text-slate-900">{homework.title}</h1>
                {homework.description && (
                    <p className="text-sm text-slate-500 mt-1">{homework.description}</p>
                )}
                <div className="flex gap-4 mt-3 text-sm text-slate-500 flex-wrap">
                    <span>Tổng điểm: <strong className="text-indigo-600">{homework.total_points}</strong></span>
                    <span>{questions.length} câu hỏi</span>
                    {homework.due_date && (
                        <span className="flex items-center gap-1 text-rose-500">
                            <Clock className="w-3.5 h-3.5" />
                            Hạn: {new Date(homework.due_date).toLocaleString("vi-VN")}
                        </span>
                    )}
                </div>
                {isGraded && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-sm font-bold text-emerald-800">
                            Điểm: <span className="text-lg">{existingSubmission.score}</span>/{homework.total_points}
                        </p>
                        {existingSubmission.feedback && (
                            <p className="text-sm text-emerald-700 mt-1">Nhận xét: {existingSubmission.feedback}</p>
                        )}
                    </div>
                )}
                {isSubmitted && !isGraded && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Đã nộp — đang chờ giáo viên chấm điểm
                        </p>
                    </div>
                )}
            </div>

            {/* Questions */}
            {questions.map((q: any, qIdx: number) => {
                const cfg = typeConfig[q.type] || typeConfig.essay;
                const Icon = cfg.icon;
                const ans = answers[qIdx] || {};

                return (
                    <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className={`flex items-center gap-3 px-5 py-3 ${cfg.bg} border-b border-slate-100`}>
                            <Badge className={`${cfg.bg} ${cfg.color} border-none font-semibold text-xs`}>
                                <Icon className="w-3 h-3 mr-1" />
                                {cfg.label}
                            </Badge>
                            <span className="text-sm font-bold text-slate-700">Câu {qIdx + 1}</span>
                            <span className="text-xs text-slate-400 ml-auto">{q.points} điểm</span>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-sm font-semibold text-slate-800">{q.question}</p>

                            {/* Instructions */}
                            {q.instructions && (
                                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
                                    💡 {q.instructions}
                                </div>
                            )}

                            {/* Teacher attachment link */}
                            {q.type === "attachment" && q.attachment_url && (
                                <a href={q.attachment_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <ExternalLink className="w-4 h-4" />
                                    Mở link/tài liệu đính kèm của giáo viên
                                </a>
                            )}

                            {/* Answer inputs */}
                            {q.type === "multiple_choice" && (
                                <div className="space-y-2">
                                    {(q.options || []).map((opt: any) => (
                                        <label
                                            key={opt.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${ans.selected_option_id === opt.id
                                                    ? "border-indigo-400 bg-indigo-50"
                                                    : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                                                } ${isSubmitted ? "pointer-events-none opacity-70" : ""}`}
                                        >
                                            <input
                                                type="radio"
                                                name={`q_${q.id}`}
                                                checked={ans.selected_option_id === opt.id}
                                                onChange={() => updateAnswer(qIdx, "selected_option_id", opt.id)}
                                                disabled={isSubmitted}
                                                className="accent-indigo-600 w-4 h-4"
                                            />
                                            <span className="text-sm text-slate-700 font-medium">{opt.text}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {q.type === "essay" && (
                                <Textarea
                                    value={ans.essay_text || ""}
                                    onChange={(e) => updateAnswer(qIdx, "essay_text", e.target.value)}
                                    placeholder="Viết câu trả lời của bạn..."
                                    rows={5}
                                    disabled={isSubmitted}
                                    className="disabled:opacity-70"
                                />
                            )}

                            {q.type === "video" && (
                                <div className="space-y-2">
                                    <Input
                                        value={ans.video_url || ""}
                                        onChange={(e) => updateAnswer(qIdx, "video_url", e.target.value)}
                                        placeholder="Dán link video YouTube, Google Drive, Vimeo..."
                                        disabled={isSubmitted}
                                        className="disabled:opacity-70"
                                    />
                                    <p className="text-xs text-slate-400">Quay video bài nói và tải lên YouTube hoặc Google Drive, sau đó dán link vào đây.</p>
                                </div>
                            )}

                            {q.type === "attachment" && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Link bài làm</label>
                                        <Input
                                            value={ans.attachment_url || ""}
                                            onChange={(e) => updateAnswer(qIdx, "attachment_url", e.target.value)}
                                            placeholder="Dán link bài làm hoàn thành..."
                                            disabled={isSubmitted}
                                            className="disabled:opacity-70"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Link minh chứng (ảnh chụp màn hình)</label>
                                        <Input
                                            value={ans.proof_image_url || ""}
                                            onChange={(e) => updateAnswer(qIdx, "proof_image_url", e.target.value)}
                                            placeholder="Dán link ảnh minh chứng (Google Drive, Imgur, ...)"
                                            disabled={isSubmitted}
                                            className="disabled:opacity-70"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">📸 Chụp ảnh rõ ràng kết quả hoàn thành, tải lên Google Drive hoặc Imgur rồi dán link vào đây.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Submit button */}
            {!isSubmitted && (
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-12 text-base rounded-xl"
                    >
                        {submitting ? (
                            "Đang nộp..."
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" /> Nộp bài
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
