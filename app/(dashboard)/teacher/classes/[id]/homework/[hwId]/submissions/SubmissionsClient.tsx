"use client";

import { useState } from "react";
import { gradeSubmission } from "@/lib/actions/homework";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    CheckCircle2, Clock, FileText, Video, Paperclip, ListChecks,
    ChevronDown, ChevronUp, ExternalLink, Mail, User
} from "lucide-react";

const typeIcons: Record<string, any> = {
    multiple_choice: ListChecks,
    essay: FileText,
    video: Video,
    attachment: Paperclip,
};

export default function SubmissionsClient({
    homework,
    submissions,
    classId,
}: {
    homework: any;
    submissions: any[];
    classId: string;
}) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [grading, setGrading] = useState<Record<string, { score: string; feedback: string }>>({});
    const [saving, setSaving] = useState<string | null>(null);

    const handleGrade = async (submissionId: string) => {
        const g = grading[submissionId];
        if (!g || g.score === "") {
            toast.error("Vui lòng nhập điểm");
            return;
        }
        setSaving(submissionId);
        const res = await gradeSubmission(submissionId, {
            score: parseFloat(g.score),
            feedback: g.feedback,
        });
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã chấm điểm thành công!");
        }
        setSaving(null);
    };

    const statusConfig: Record<string, { label: string; color: string }> = {
        pending: { label: "Chưa nộp", color: "bg-slate-100 text-slate-500 border-slate-200" },
        submitted: { label: "Đã nộp", color: "bg-amber-50 text-amber-600 border-amber-200" },
        graded: { label: "Đã chấm", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-xl font-extrabold text-slate-900">{homework?.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{homework?.description}</p>
                <div className="flex gap-4 mt-3 text-sm text-slate-500">
                    <span>Tổng điểm: <strong className="text-indigo-600">{homework?.total_points}</strong></span>
                    <span>Bài nộp: <strong className="text-emerald-600">{submissions.length}</strong></span>
                    <span>Đã chấm: <strong>{submissions.filter(s => s.status === "graded").length}</strong></span>
                </div>
            </div>

            {/* Submissions */}
            {submissions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Chưa có bài nộp nào.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {submissions.map((sub) => {
                        const isExpanded = expandedId === sub.id;
                        const st = statusConfig[sub.status] || statusConfig.pending;

                        return (
                            <div key={sub.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div
                                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {sub.student?.full_name?.charAt(0) || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-900">{sub.student?.full_name || "Ẩn danh"}</p>
                                        <p className="text-xs text-slate-400">{sub.student?.email}</p>
                                    </div>
                                    <Badge variant="outline" className={st.color}>{st.label}</Badge>
                                    {sub.attempts > 1 && (
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hidden sm:inline-flex">
                                            {sub.attempts} lần nộp
                                        </Badge>
                                    )}
                                    {sub.score !== null && sub.status === "graded" && (
                                        <span className="text-lg font-black text-emerald-600">{sub.score}/{homework?.total_points}</span>
                                    )}
                                    {sub.submitted_at && (
                                        <span className="text-xs text-slate-400 hidden sm:block">
                                            {new Date(sub.submitted_at).toLocaleString("vi-VN")}
                                        </span>
                                    )}
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>

                                {isExpanded && (
                                    <div className="px-5 pb-5 border-t border-slate-100 space-y-4 pt-4 animate-in slide-in-from-top-2 duration-200">
                                        {/* Render answers */}
                                        {(sub.answers || []).map((ans: any, idx: number) => {
                                            const q = (homework?.questions || []).find((qu: any) => qu.id === ans.question_id);
                                            const Icon = typeIcons[ans.type] || FileText;
                                            return (
                                                <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Icon className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm font-bold text-slate-700">Câu {idx + 1}: {q?.question || ""}</span>
                                                    </div>
                                                    {ans.type === "multiple_choice" && (
                                                        <p className="text-sm text-slate-600 ml-6">
                                                            Đáp án: <strong>{q?.options?.find((o: any) => o.id === ans.selected_option_id)?.text || "N/A"}</strong>
                                                        </p>
                                                    )}
                                                    {ans.type === "essay" && (
                                                        <div className="ml-6 p-3 bg-white rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                                                            {ans.essay_text || "Chưa trả lời"}
                                                        </div>
                                                    )}
                                                    {ans.type === "video" && ans.video_url && (
                                                        <a href={ans.video_url} target="_blank" rel="noopener noreferrer"
                                                            className="ml-6 flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                                            <ExternalLink className="w-4 h-4" /> Xem Video
                                                        </a>
                                                    )}
                                                    {ans.type === "attachment" && (
                                                        <div className="ml-6 space-y-1">
                                                            {ans.attachment_url && (
                                                                <a href={ans.attachment_url} target="_blank" rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                                                    <ExternalLink className="w-4 h-4" /> Link bài làm
                                                                </a>
                                                            )}
                                                            {ans.proof_image_url && (
                                                                <a href={ans.proof_image_url} target="_blank" rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-sm text-amber-600 hover:underline">
                                                                    <ExternalLink className="w-4 h-4" /> Xem minh chứng
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Grading form */}
                                        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                                            <p className="text-sm font-bold text-emerald-800">
                                                Chấm điểm {sub.status !== 'graded' && sub.score !== null ? `(Điểm trắc nghiệm tạm tính: ${sub.score})` : ''}
                                            </p>
                                            <div className="flex gap-3">
                                                <div className="w-32">
                                                    <label className="text-xs text-emerald-600 font-medium block mb-1">Điểm / {homework?.total_points}</label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={homework?.total_points}
                                                        value={grading[sub.id]?.score ?? (sub.score !== null ? sub.score : "")}
                                                        onChange={(e) => setGrading({ ...grading, [sub.id]: { ...grading[sub.id], score: e.target.value, feedback: grading[sub.id]?.feedback || sub.feedback || "" } })}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-emerald-600 font-medium block mb-1">Nhận xét</label>
                                                    <Textarea
                                                        rows={1}
                                                        value={grading[sub.id]?.feedback ?? (sub.feedback || "")}
                                                        onChange={(e) => setGrading({ ...grading, [sub.id]: { score: grading[sub.id]?.score ?? (sub.score !== null ? String(sub.score) : ""), feedback: e.target.value } })}
                                                        placeholder="Nhận xét..."
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleGrade(sub.id)}
                                                disabled={saving === sub.id}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9"
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                {saving === sub.id ? "Đang lưu..." : "Xác nhận chấm điểm"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
