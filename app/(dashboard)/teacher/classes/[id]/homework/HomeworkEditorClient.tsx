"use client";

import { useState } from "react";
import { createHomework, updateHomework } from "@/lib/actions/homework";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Plus, Trash2, Save, ArrowLeft, CheckCircle2, GripVertical,
    FileText, Video, Paperclip, ListChecks, Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type QuestionType = "multiple_choice" | "essay" | "video" | "attachment";

interface MCOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface HomeworkQuestion {
    id: string;
    type: QuestionType;
    question: string;
    points: number;
    options?: MCOption[];
    instructions?: string;
    attachment_url?: string;
}

const genId = () => Math.random().toString(36).slice(2, 10);

const typeConfig: Record<QuestionType, { label: string; icon: any; color: string; bgColor: string }> = {
    multiple_choice: { label: "Trắc nghiệm", icon: ListChecks, color: "text-indigo-600", bgColor: "bg-indigo-50" },
    essay: { label: "Tự luận", icon: FileText, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    video: { label: "Nộp Video", icon: Video, color: "text-rose-600", bgColor: "bg-rose-50" },
    attachment: { label: "Đính kèm & Minh chứng", icon: Paperclip, color: "text-amber-600", bgColor: "bg-amber-50" },
};

function emptyQuestion(type: QuestionType = "multiple_choice"): HomeworkQuestion {
    const base: HomeworkQuestion = {
        id: genId(),
        type,
        question: "",
        points: 1,
    };
    if (type === "multiple_choice") {
        base.options = [
            { id: genId(), text: "", isCorrect: true },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
        ];
    }
    if (type === "essay" || type === "video" || type === "attachment") {
        base.instructions = "";
    }
    if (type === "attachment") {
        base.attachment_url = "";
    }
    return base;
}

export default function HomeworkEditorClient({
    classId,
    existingHomework,
}: {
    classId: string;
    existingHomework?: any;
}) {
    const router = useRouter();
    const isEdit = !!existingHomework;

    const [title, setTitle] = useState(existingHomework?.title || "");
    const [description, setDescription] = useState(existingHomework?.description || "");
    const [dueDate, setDueDate] = useState(existingHomework?.due_date?.slice(0, 16) || "");
    const [questions, setQuestions] = useState<HomeworkQuestion[]>(
        existingHomework?.questions || [emptyQuestion()]
    );
    const [saving, setSaving] = useState(false);

    const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);

    // Question CRUD
    const addQuestion = (type: QuestionType) => {
        setQuestions([...questions, emptyQuestion(type)]);
    };

    const removeQuestion = (idx: number) => {
        const next = [...questions];
        next.splice(idx, 1);
        setQuestions(next);
    };

    const updateQuestion = (idx: number, field: string, value: any) => {
        const next = [...questions];
        (next[idx] as any)[field] = value;
        setQuestions(next);
    };

    // MC option helpers
    const updateOption = (qIdx: number, oIdx: number, field: string, value: any) => {
        const next = [...questions];
        const opts = [...(next[qIdx].options || [])];
        (opts[oIdx] as any)[field] = value;
        next[qIdx].options = opts;
        setQuestions(next);
    };

    const setCorrect = (qIdx: number, oIdx: number) => {
        const next = [...questions];
        next[qIdx].options = next[qIdx].options?.map((o, i) => ({ ...o, isCorrect: i === oIdx }));
        setQuestions(next);
    };

    const addOption = (qIdx: number) => {
        const next = [...questions];
        next[qIdx].options = [...(next[qIdx].options || []), { id: genId(), text: "", isCorrect: false }];
        setQuestions(next);
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        const next = [...questions];
        const opts = [...(next[qIdx].options || [])];
        opts.splice(oIdx, 1);
        next[qIdx].options = opts;
        setQuestions(next);
    };

    // Save
    const handleSave = async (publish: boolean = false) => {
        if (!title.trim()) {
            toast.error("Vui lòng nhập tiêu đề bài tập");
            return;
        }
        if (questions.length === 0) {
            toast.error("Cần ít nhất 1 câu hỏi");
            return;
        }
        for (const q of questions) {
            if (!q.question.trim()) {
                toast.error("Có câu hỏi chưa nhập nội dung");
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                title,
                description,
                questions,
                total_points: totalPoints,
                due_date: dueDate || undefined,
                is_published: publish,
            };

            if (isEdit) {
                const res = await updateHomework(existingHomework.id, classId, payload);
                if (res.error) throw new Error(res.error);
                toast.success(publish ? "Đã giao bài tập!" : "Đã cập nhật bài tập");
            } else {
                const res = await createHomework(classId, payload);
                if (res.error) throw new Error(res.error);
                toast.success("Đã tạo bài tập thành công!");
            }
            router.push(`/teacher/classes/${classId}`);
            router.refresh();
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link
                    href={`/teacher/classes/${classId}`}
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại lớp học
                </Link>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="font-semibold"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Lưu nháp
                    </Button>
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {saving ? "Đang lưu..." : "Giao bài tập"}
                    </Button>
                </div>
            </div>

            {/* Title & Description */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">
                    {isEdit ? "Chỉnh sửa Bài tập" : "Tạo Bài tập về nhà"}
                </h2>
                <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tiêu đề</label>
                    <Input
                        placeholder="Ví dụ: Bài tập chương 3 - Phương trình bậc hai"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-base"
                    />
                </div>
                <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Mô tả (tùy chọn)</label>
                    <Textarea
                        placeholder="Hướng dẫn chung cho học sinh..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" /> Hạn nộp
                        </label>
                        <Input
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 w-full text-center">
                            <p className="text-2xl font-black text-indigo-600">{totalPoints}</p>
                            <p className="text-xs text-indigo-500 font-medium">Tổng điểm</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {questions.map((q, qIdx) => {
                    const cfg = typeConfig[q.type];
                    const Icon = cfg.icon;
                    return (
                        <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Question header */}
                            <div className={`flex items-center gap-3 px-5 py-3 ${cfg.bgColor} border-b border-slate-100`}>
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <Badge className={`${cfg.bgColor} ${cfg.color} border-none font-semibold text-xs`}>
                                    <Icon className="w-3 h-3 mr-1" />
                                    {cfg.label}
                                </Badge>
                                <span className="text-sm font-bold text-slate-700">Câu {qIdx + 1}</span>
                                <div className="flex-1" />
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={q.points}
                                        onChange={(e) => updateQuestion(qIdx, "points", parseInt(e.target.value) || 0)}
                                        className="w-20 h-8 text-center text-sm font-bold"
                                    />
                                    <span className="text-xs text-slate-500">điểm</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeQuestion(qIdx)}
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Question body */}
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Nội dung câu hỏi</label>
                                    <Textarea
                                        placeholder="Nhập câu hỏi..."
                                        value={q.question}
                                        onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                                        rows={2}
                                    />
                                </div>

                                {/* Multiple Choice options */}
                                {q.type === "multiple_choice" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Đáp án</label>
                                        {q.options?.map((opt, oIdx) => (
                                            <div key={opt.id} className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCorrect(qIdx, oIdx)}
                                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${opt.isCorrect
                                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                                            : "border-slate-300 hover:border-emerald-400"
                                                        }`}
                                                >
                                                    {opt.isCorrect && <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                                <Input
                                                    placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`}
                                                    value={opt.text}
                                                    onChange={(e) => updateOption(qIdx, oIdx, "text", e.target.value)}
                                                    className="flex-1"
                                                />
                                                {(q.options?.length || 0) > 2 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeOption(qIdx, oIdx)}
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addOption(qIdx)}
                                            className="text-xs mt-2"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Thêm đáp án
                                        </Button>
                                    </div>
                                )}

                                {/* Essay instructions */}
                                {q.type === "essay" && (
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Hướng dẫn (tùy chọn)</label>
                                        <Textarea
                                            placeholder="Viết hướng dẫn cho học sinh: yêu cầu về độ dài, nội dung..."
                                            value={q.instructions || ""}
                                            onChange={(e) => updateQuestion(qIdx, "instructions", e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                )}

                                {/* Video instructions */}
                                {q.type === "video" && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                                                Yêu cầu cho video (ví dụ: thời lượng, nội dung)
                                            </label>
                                            <Textarea
                                                placeholder="Ví dụ: Quay video trình bày bài thuyết trình, tối đa 5 phút..."
                                                value={q.instructions || ""}
                                                onChange={(e) => updateQuestion(qIdx, "instructions", e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                        <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-xs text-rose-600">
                                            💡 Học sinh sẽ dán link video (YouTube, Google Drive, v.v.) khi nộp bài.
                                        </div>
                                    </div>
                                )}

                                {/* Attachment instructions */}
                                {q.type === "attachment" && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                                                Link hoặc file đính kèm (giáo viên)
                                            </label>
                                            <Input
                                                placeholder="Dán link tài liệu, bài tập, hoặc file cần hoàn thành..."
                                                value={q.attachment_url || ""}
                                                onChange={(e) => updateQuestion(qIdx, "attachment_url", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                                                Hướng dẫn cho học sinh
                                            </label>
                                            <Textarea
                                                placeholder="Ví dụ: Hoàn thành bài tập trong link, chụp minh chứng rõ ràng..."
                                                value={q.instructions || ""}
                                                onChange={(e) => updateQuestion(qIdx, "instructions", e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-600">
                                            📸 Học viên sẽ làm xong và gửi link minh chứng (ảnh chụp hoặc link hoàn thành).
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add question buttons */}
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6">
                <p className="text-sm font-bold text-slate-700 mb-3 text-center">Thêm câu hỏi mới</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.entries(typeConfig) as [QuestionType, typeof typeConfig[QuestionType]][]).map(([type, cfg]) => {
                        const Icon = cfg.icon;
                        return (
                            <button
                                key={type}
                                onClick={() => addQuestion(type)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent ${cfg.bgColor} hover:border-current ${cfg.color} transition-all group cursor-pointer`}
                            >
                                <Icon className={`w-6 h-6 ${cfg.color} group-hover:scale-110 transition-transform`} />
                                <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
