"use client";

import { useState } from "react";
import { createExam, updateExam } from "@/lib/actions/exam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    Plus, Trash2, Save, ArrowLeft, CheckCircle2, XCircle, GripVertical, Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type QuizOption = { id: string; text: string; isCorrect: boolean };
type QuizQuestion = { id: string; question: string; options: QuizOption[]; points: number };

function genId() { return Math.random().toString(36).substring(2, 10); }

function emptyQuestion(): QuizQuestion {
    return {
        id: genId(),
        question: "",
        options: [
            { id: genId(), text: "", isCorrect: true },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
        ],
        points: 1,
    };
}

export default function ExamEditorClient({
    classId, existingExam
}: {
    classId: string;
    existingExam?: any;
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [title, setTitle] = useState(existingExam?.title || "");
    const [description, setDescription] = useState(existingExam?.description || "");
    const [duration, setDuration] = useState(existingExam?.duration_minutes || 30);
    const [isPublished, setIsPublished] = useState(existingExam?.is_published || false);
    const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
        if (existingExam?.questions && Array.isArray(existingExam.questions)) {
            return existingExam.questions;
        }
        return [emptyQuestion()];
    });

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    const addQuestion = () => setQuestions([...questions, emptyQuestion()]);

    const removeQuestion = (idx: number) => {
        if (questions.length <= 1) { toast.error("Phải có ít nhất 1 câu hỏi."); return; }
        setQuestions(questions.filter((_, i) => i !== idx));
    };

    const updateQuestion = (idx: number, field: string, value: any) => {
        const updated = [...questions];
        (updated[idx] as any)[field] = value;
        setQuestions(updated);
    };

    const updateOption = (qIdx: number, oIdx: number, field: string, value: any) => {
        const updated = [...questions];
        (updated[qIdx].options[oIdx] as any)[field] = value;
        setQuestions(updated);
    };

    const setCorrect = (qIdx: number, oIdx: number) => {
        const updated = [...questions];
        updated[qIdx].options.forEach((o, i) => { o.isCorrect = i === oIdx; });
        setQuestions(updated);
    };

    const addOption = (qIdx: number) => {
        const updated = [...questions];
        updated[qIdx].options.push({ id: genId(), text: "", isCorrect: false });
        setQuestions(updated);
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        const updated = [...questions];
        if (updated[qIdx].options.length <= 2) { toast.error("Cần ít nhất 2 đáp án."); return; }
        updated[qIdx].options.splice(oIdx, 1);
        setQuestions(updated);
    };

    const handleSave = async () => {
        if (!title.trim()) { toast.error("Nhập tiêu đề bài kiểm tra."); return; }
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) { toast.error(`Câu ${i + 1}: Chưa nhập nội dung.`); return; }
            const hasCorrect = q.options.some(o => o.isCorrect);
            if (!hasCorrect) { toast.error(`Câu ${i + 1}: Chưa chọn đáp án đúng.`); return; }
            const filled = q.options.filter(o => o.text.trim());
            if (filled.length < 2) { toast.error(`Câu ${i + 1}: Cần ít nhất 2 đáp án.`); return; }
        }

        setIsLoading(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                questions,
                duration_minutes: duration,
                total_points: totalPoints,
                is_published: isPublished
            };

            if (existingExam) {
                const res = await updateExam(existingExam.id, classId, payload);
                if (res.error) throw new Error(res.error);
            } else {
                const res = await createExam(classId, payload);
                if (res.error) throw new Error(res.error);
            }

            toast.success(existingExam ? "Cập nhật thành công!" : "Tạo bài kiểm tra thành công!");
            router.push(`/teacher/classes/${classId}`);
            router.refresh();
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const letters = "ABCDEFGHIJKLMNOP";

    return (
        <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link href={`/teacher/classes/${classId}`} className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại lớp học
            </Link>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <h1 className="text-2xl font-extrabold">{existingExam ? "Sửa bài kiểm tra" : "Tạo bài kiểm tra mới"}</h1>
                    <p className="text-indigo-100 text-sm mt-1">Tạo đề trắc nghiệm và giao cho học sinh</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-bold text-slate-700 mb-1.5 block">Tiêu đề *</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Kiểm tra giữa kỳ" />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Label className="text-sm font-bold text-slate-700 mb-1.5 block">
                                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Thời gian (phút)
                                </Label>
                                <Input type="number" min={1} max={180} value={duration} onChange={e => setDuration(parseInt(e.target.value) || 30)} />
                            </div>
                            <div className="flex items-end gap-2 pb-1">
                                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                                <Label className="text-sm text-slate-600 font-medium">{isPublished ? "Đã giao" : "Chưa giao"}</Label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-bold text-slate-700 mb-1.5 block">Mô tả</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Hướng dẫn, lưu ý..." rows={2} />
                    </div>

                    {/* Summary bar */}
                    <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-xl text-sm font-semibold text-indigo-700">
                        <span>{questions.length} câu hỏi</span>
                        <span className="text-slate-400">•</span>
                        <span>{totalPoints} điểm</span>
                        <span className="text-slate-400">•</span>
                        <span>{duration} phút</span>
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        {questions.map((q, qIdx) => (
                            <div key={q.id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors">
                                <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="w-4 h-4 text-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">Câu {qIdx + 1}</span>
                                        <span className="text-xs text-slate-400">({q.points} điểm)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number" min={1} max={10}
                                            value={q.points}
                                            onChange={e => updateQuestion(qIdx, "points", parseInt(e.target.value) || 1)}
                                            className="w-16 h-8 text-xs text-center"
                                        />
                                        <span className="text-xs text-slate-400">điểm</span>
                                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)} className="text-red-400 hover:text-red-600 h-7 w-7 p-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 space-y-3">
                                    <Textarea
                                        value={q.question}
                                        onChange={e => updateQuestion(qIdx, "question", e.target.value)}
                                        placeholder="Nhập nội dung câu hỏi..."
                                        rows={2}
                                        className="font-medium"
                                    />

                                    <div className="space-y-2">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={opt.id} className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCorrect(qIdx, oIdx)}
                                                    className={`shrink-0 rounded-full p-0.5 transition-colors ${opt.isCorrect ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                                                >
                                                    {opt.isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                </button>
                                                <span className={`text-sm font-bold w-6 ${opt.isCorrect ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {letters[oIdx]}
                                                </span>
                                                <Input
                                                    value={opt.text}
                                                    onChange={e => updateOption(qIdx, oIdx, "text", e.target.value)}
                                                    placeholder={`Đáp án ${letters[oIdx]}`}
                                                    className={`flex-1 text-sm ${opt.isCorrect ? 'border-emerald-300 bg-emerald-50/50' : ''}`}
                                                />
                                                <Button variant="ghost" size="sm" onClick={() => removeOption(qIdx, oIdx)} className="text-slate-300 hover:text-red-500 h-7 w-7 p-0">
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button variant="ghost" size="sm" className="text-indigo-500 text-xs h-7" onClick={() => addOption(qIdx)}>
                                            <Plus className="w-3 h-3 mr-1" /> Thêm đáp án
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <Button variant="outline" onClick={addQuestion} className="text-indigo-600 border-indigo-200">
                            <Plus className="w-4 h-4 mr-2" /> Thêm câu hỏi
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                            <Save className="w-4 h-4 mr-2" /> {isLoading ? "Đang lưu..." : "Lưu bài kiểm tra"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
