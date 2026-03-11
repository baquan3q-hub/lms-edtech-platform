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
    CheckCircle2, Clock, ArrowLeft, Send, ExternalLink, Upload, Loader2, Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    // Upload state
    const [uploading, setUploading] = useState<Record<number, boolean>>({});
    const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

    const handleVideoUpload = async (qIdx: number, file: File) => {
        if (!file) return;

        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
            toast.error(`File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB — tối đa 500MB)`);
            return;
        }

        const allowedTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime', 'video/avi', 'video/x-msvideo'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
            toast.error("Chỉ hỗ trợ file video (MP4, WebM, MOV, AVI)");
            return;
        }

        setUploading(prev => ({ ...prev, [qIdx]: true }));
        setUploadProgress(prev => ({ ...prev, [qIdx]: 0 }));

        // Simulate progress while uploading
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                const current = prev[qIdx] || 0;
                if (current >= 90) { clearInterval(progressInterval); return { ...prev, [qIdx]: 90 }; }
                return { ...prev, [qIdx]: current + Math.random() * 15 };
            });
        }, 300);

        try {
            const supabase = createClient();
            const ext = file.name.split('.').pop();
            const fileName = `student_submissions/${homework.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            // Upload to Supabase Storage
            const { error } = await supabase.storage
                .from('lesson-videos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            clearInterval(progressInterval);

            if (error) {
                console.error('Upload error details:', error);
                throw error;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('lesson-videos')
                .getPublicUrl(fileName);

            updateAnswer(qIdx, "video_url", urlData.publicUrl);
            setUploadProgress(prev => ({ ...prev, [qIdx]: 100 }));
            toast.success("Upload video thành công!");
        } catch (err: any) {
            clearInterval(progressInterval);
            console.error("Upload video error:", err);
            toast.error("Lỗi upload video: " + (err.message || "Không thể tải lên tệp"));
        } finally {
            setUploading(prev => ({ ...prev, [qIdx]: false }));
        }
    };

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
                        <div className="flex items-center gap-2 mb-2">
                             <Clock className="w-4 h-4 text-amber-600" />
                             <p className="text-sm font-semibold text-amber-700">Đã nộp — đang chờ giáo viên chấm phần tự luận/thực hành</p>
                        </div>
                        {existingSubmission.score !== null && existingSubmission.score !== undefined && (
                            <p className="text-sm font-bold text-amber-800">
                                Điểm trắc nghiệm tạm tính: <span className="text-lg">{existingSubmission.score}</span>/{homework.total_points}
                            </p>
                        )}
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
                                    {(q.options || []).map((opt: any) => {
                                        const isSelected = ans.selected_option_id === opt.id;
                                        const isCorrect = opt.isCorrect;
                                        let optionClass = "border-slate-200 hover:border-indigo-200 hover:bg-slate-50";

                                        if (isSubmitted) {
                                            if (isCorrect) {
                                                optionClass = "border-emerald-500 bg-emerald-50";
                                            } else if (isSelected && !isCorrect) {
                                                optionClass = "border-rose-400 bg-rose-50";
                                            } else {
                                                optionClass = "border-slate-100 bg-slate-50 opacity-50";
                                            }
                                        } else if (isSelected) {
                                            optionClass = "border-indigo-400 bg-indigo-50";
                                        }

                                        return (
                                            <label
                                                key={opt.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSubmitted ? "pointer-events-none" : "cursor-pointer"} ${optionClass}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name={`q_${q.id}`}
                                                        checked={isSelected}
                                                        onChange={() => updateAnswer(qIdx, "selected_option_id", opt.id)}
                                                        disabled={isSubmitted}
                                                        className="accent-indigo-600 w-4 h-4"
                                                    />
                                                    <span className={`text-sm font-medium ${isSubmitted && isCorrect ? 'text-emerald-800' : isSubmitted && isSelected ? 'text-rose-800' : 'text-slate-700'}`}>
                                                        {opt.text}
                                                    </span>
                                                </div>
                                                {isSubmitted && (
                                                    <div className="flex-shrink-0">
                                                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                                        {isSelected && !isCorrect && <span className="text-xs font-bold text-rose-500 bg-rose-100 px-2 py-1 rounded-md">Sai</span>}
                                                    </div>
                                                )}
                                            </label>
                                        );
                                    })}
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
                                <div className="space-y-4">
                                     <div
                                         onClick={() => {
                                             if (!isSubmitted && !uploading[qIdx]) {
                                                 document.getElementById(`video-upload-${qIdx}`)?.click();
                                             }
                                         }}
                                         className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${isSubmitted ? 'opacity-50 cursor-not-allowed border-slate-200' : 'cursor-pointer'} ${uploading[qIdx] ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"}`}
                                     >
                                         {uploading[qIdx] ? (
                                             <div className="space-y-2">
                                                 <Loader2 className="w-8 h-8 text-indigo-500 mx-auto animate-spin" />
                                                 <p className="text-sm font-medium text-indigo-700">Đang tải lên... {Math.round(uploadProgress[qIdx] || 0)}%</p>
                                                 <div className="w-full bg-indigo-200 rounded-full h-2 max-w-xs mx-auto">
                                                     <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress[qIdx] || 0}%` }}></div>
                                                 </div>
                                             </div>
                                         ) : (
                                             <>
                                                 <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                                 <p className="text-sm font-medium text-indigo-700">
                                                     Kéo thả hoặc <span className="underline text-indigo-600">chọn file video</span> để upload
                                                 </p>
                                                 <p className="text-xs text-indigo-400 mt-1">MP4, WebM, MOV, AVI — tối đa 500MB</p>
                                             </>
                                         )}
                                         <input
                                             id={`video-upload-${qIdx}`}
                                             type="file"
                                             accept="video/mp4,video/webm,video/mov,video/quicktime,video/avi,.mp4,.webm,.mov,.avi"
                                             className="hidden"
                                             onChange={(e) => {
                                                 const f = e.target.files?.[0];
                                                 if (f) handleVideoUpload(qIdx, f);
                                             }}
                                             disabled={isSubmitted || uploading[qIdx]}
                                         />
                                     </div>

                                     <div className="flex items-center gap-3">
                                         <div className="h-px flex-1 bg-slate-200"></div>
                                         <span className="text-xs font-bold text-slate-400 uppercase">Hoặc dán Link</span>
                                         <div className="h-px flex-1 bg-slate-200"></div>
                                     </div>

                                    <Input
                                        value={ans.video_url || ""}
                                        onChange={(e) => updateAnswer(qIdx, "video_url", e.target.value)}
                                        placeholder="Dán link video YouTube, Google Drive, Vimeo..."
                                        disabled={isSubmitted || uploading[qIdx]}
                                        className="disabled:opacity-70"
                                    />

                                    {ans.video_url && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-slate-700">Video đã đính kèm:</p>
                                                {!isSubmitted && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => updateAnswer(qIdx, "video_url", "")}
                                                        className="text-red-400 hover:text-red-600 h-7 text-xs px-2"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" /> Xóa
                                                    </Button>
                                                )}
                                            </div>
                                            {ans.video_url.includes('youtube.com') || ans.video_url.includes('youtu.be') ? (
                                                <div className="aspect-video rounded-lg overflow-hidden bg-black max-w-xl">
                                                    <iframe
                                                        className="w-full h-full"
                                                        src={`https://www.youtube.com/embed/${ans.video_url.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || ''}`}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                </div>
                                            ) : (
                                                 <a href={ans.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline p-3 bg-indigo-50 flex-wrap break-all rounded-lg border border-indigo-100 max-w-xl">
                                                    <Video className="w-4 h-4 shrink-0" />
                                                    {ans.video_url}
                                                </a>
                                            )}
                                        </div>
                                    )}
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
