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
    Plus, Trash2, Save, ArrowLeft, CheckCircle2, XCircle, GripVertical, Clock, Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AIGenerateModal from "@/components/teacher/AIGenerateModal";
import ImportFromBankModal from "@/components/teacher/ImportFromBankModal";

type QuizOption = { id: string; text: string; isCorrect: boolean };
type QuizQuestion = { 
    id: string; 
    type?: "MULTIPLE_CHOICE" | "ESSAY";
    question: string; 
    options: QuizOption[]; 
    points: number; 
    tags?: string[];
    isPointsLocked?: boolean;
};

function genId() { return Math.random().toString(36).substring(2, 10); }

function emptyQuestion(): QuizQuestion {
    return {
        id: genId(),
        type: "MULTIPLE_CHOICE",
        question: "",
        options: [
            { id: genId(), text: "", isCorrect: true },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
        ],
        points: 1,
        tags: [],
        isPointsLocked: false
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
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);

    const [title, setTitle] = useState(existingExam?.title || "");
    const [description, setDescription] = useState(existingExam?.description || "");
    const [duration, setDuration] = useState(existingExam?.duration_minutes || 30);
    const [dueDate, setDueDate] = useState(existingExam?.due_date?.slice(0, 16) || "");
    const [isPublished, setIsPublished] = useState(existingExam?.is_published || false);
    const [isStrictMode, setIsStrictMode] = useState(existingExam?.is_strict_mode || false);
    const [strictModeLimit, setStrictModeLimit] = useState(existingExam?.strict_mode_limit || 0);
    const [showAnswers, setShowAnswers] = useState(existingExam?.show_answers ?? true);
    const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
        if (existingExam?.questions && Array.isArray(existingExam.questions)) {
            return existingExam.questions;
        }
        return [emptyQuestion()];
    });

    // Force total points to be exactly 10
    const totalPoints = 10;

    // Distribute remaining points among unlocked questions
    const distributePoints = (qs: QuizQuestion[]) => {
        const N = qs.length;
        if (N === 0) return qs;

        let lockedPoints = 0;
        let unlockedCount = 0;

        qs.forEach(q => {
            if (q.isPointsLocked) {
                lockedPoints += q.points;
            } else {
                unlockedCount++;
            }
        });

        // If all are locked or locked points exceed 10, don't change anything (or might need warning)
        if (unlockedCount === 0 || lockedPoints > 10) return qs;

        const pointsRemaining = 10 - lockedPoints;
        const basePoints = Math.floor((pointsRemaining / unlockedCount) * 100) / 100;
        const remainder = pointsRemaining - (basePoints * unlockedCount);

        let remainderDistributed = false;

        return qs.map(q => {
            if (q.isPointsLocked) return q;
            let pts = basePoints;
            if (!remainderDistributed) {
                pts += remainder;
                remainderDistributed = true;
            }
            return { ...q, points: Number(pts.toFixed(2)) };
        });
    };

    const resetPointsDistribution = () => {
        const unlocked = questions.map(q => ({ ...q, isPointsLocked: false }));
        setQuestions(distributePoints(unlocked));
    };

    const addQuestion = () => setQuestions(distributePoints([...questions, emptyQuestion()]));

    const removeQuestion = (idx: number) => {
        if (questions.length <= 1) { toast.error("Phải có ít nhất 1 câu hỏi."); return; }
        setQuestions(distributePoints(questions.filter((_, i) => i !== idx)));
    };

    const handleAIGenerated = (generatedQuestions: any[]) => {
        const N = generatedQuestions.length;
        if (N === 0) return;

        // Distribute 10 points among the generated questions
        const basePoints = Math.floor(10 / N);
        let remainder = 10 % N;

        const formatted = generatedQuestions.map((gq, idx) => {
            const pts = basePoints + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;

            return {
                id: genId(),
                type: "MULTIPLE_CHOICE" as const,
                question: gq.question,
                options: (gq.options || []).map((optLabel: string, oIdx: number) => ({
                    id: genId(),
                    text: optLabel,
                    isCorrect: oIdx === gq.correctIndex
                })),
                points: pts || 1,
                tags: [],
                isPointsLocked: false
            };
        });

        // If the current list only has 1 empty question, replace it. Otherwise append.
        if (questions.length === 1 && !questions[0].question.trim() && (questions[0].options || []).every(o => !o.text.trim())) {
            setQuestions(distributePoints(formatted as unknown as QuizQuestion[]));
        } else {
            setQuestions(distributePoints([...questions, ...formatted] as unknown as QuizQuestion[]));
        }
    };

    const handleBankImport = (importedQuestions: any[]) => {
        const formatted = importedQuestions.map(q => ({
            ...q,
            type: "MULTIPLE_CHOICE" as const,
            tags: [],
            isPointsLocked: false,
        }));
        if (questions.length === 1 && !questions[0].question.trim() && questions[0].options.every(o => !o.text.trim())) {
            setQuestions(distributePoints(formatted));
        } else {
            setQuestions(distributePoints([...questions, ...formatted]));
        }
    };

    const updateQuestion = (idx: number, field: string, value: any) => {
        const updated = [...questions];
        (updated[idx] as any)[field] = value;
        setQuestions(updated); // We don't distribute here unless points change manually
    };

    const handlePointChange = (idx: number, val: string) => {
        let numericVal = parseFloat(val);
        if (isNaN(numericVal) || numericVal < 0) numericVal = 0;
        
        const updated = [...questions];
        updated[idx].points = numericVal;
        updated[idx].isPointsLocked = true;
        setQuestions(distributePoints(updated));
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
            
            if (q.type !== "ESSAY") {
                const hasCorrect = q.options.some(o => o.isCorrect);
                if (!hasCorrect) { toast.error(`Câu ${i + 1}: Chưa chọn đáp án đúng.`); return; }
                const filled = q.options.filter(o => o.text.trim());
                if (filled.length < 2) { toast.error(`Câu ${i + 1}: Cần ít nhất 2 đáp án.`); return; }
            }
        }
        
        let currentTotal = questions.reduce((sum, q) => sum + q.points, 0);
        if (Math.abs(currentTotal - 10) > 0.1) {
            toast.error(`Tổng số điểm phải bằng 10. Hiện tại là ${currentTotal.toFixed(2)}.`);
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                questions,
                duration_minutes: duration,
                due_date: dueDate || undefined,
                total_points: totalPoints,
                is_published: isPublished,
                is_strict_mode: isStrictMode,
                strict_mode_limit: strictModeLimit,
                show_answers: showAnswers
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
                            <div className="flex-1">
                                <Label className="text-sm font-bold text-slate-700 mb-1.5 block">
                                    Hạn chót (Deadline)
                                </Label>
                                <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                            </div>
                            <div className="flex items-end gap-2 pb-1">
                                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                                <Label className="text-sm text-slate-600 font-medium">{isPublished ? "Đã giao" : "Chưa giao"}</Label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch checked={isStrictMode} onCheckedChange={setIsStrictMode} />
                                <Label className="text-sm font-bold text-slate-700">Chế độ thi an toàn</Label>
                            </div>
                            {isStrictMode && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium text-slate-600">Số lần cảnh báo:</Label>
                                    <Input 
                                        type="number" 
                                        min={0} 
                                        max={10} 
                                        value={strictModeLimit} 
                                        onChange={e => setStrictModeLimit(parseInt(e.target.value) || 0)} 
                                        className="w-20"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={showAnswers} onCheckedChange={setShowAnswers} />
                            <Label className="text-sm font-bold text-slate-700">Hiển thị đáp án sau khi nộp</Label>
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
                                        <select 
                                            value={q.type || "MULTIPLE_CHOICE"} 
                                            onChange={(e) => updateQuestion(qIdx, "type", e.target.value)}
                                            className="text-xs font-bold text-slate-700 bg-transparent outline-none border-b border-dashed border-slate-300 pb-0.5"
                                        >
                                            <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
                                            <option value="ESSAY">Tự luận</option>
                                        </select>
                                        <span className="text-sm font-bold text-slate-700 ml-2">Câu {qIdx + 1}</span>
                                        <span className="text-xs text-slate-400">({q.points} điểm)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number" min={0} max={10} step="0.5"
                                            value={q.points === 0 ? '' : q.points}
                                            onChange={(e) => handlePointChange(qIdx, e.target.value)}
                                            className={`w-16 h-8 text-xs text-center font-bold ${q.isPointsLocked ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700'}`}
                                            title="Nhập số để gán điểm thủ công"
                                        />
                                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">điểm {q.isPointsLocked && '(Đã khóa)'}</span>
                                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)} className="text-red-400 hover:text-red-600 h-7 w-7 p-0 ml-2">
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

                                    <div>
                                        <Input
                                            value={(q.tags || []).join(", ")}
                                            onChange={e => updateQuestion(qIdx, "tags", e.target.value.split(",").map(t => t.trim()).filter(t => t))}
                                            placeholder="Gắn thẻ/Nhãn (cách nhau dấu phẩy, VD: Ngữ pháp, Từ vựng)..."
                                            className="text-xs text-indigo-600 bg-indigo-50/30 border-dashed border-indigo-200"
                                        />
                                    </div>

                                    {q.type !== "ESSAY" && (
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
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={addQuestion} className="text-indigo-600 border-indigo-200">
                                <Plus className="w-4 h-4 mr-2" /> Thêm câu hỏi
                            </Button>
                            <Button variant="outline" onClick={resetPointsDistribution} className="text-slate-600 border-slate-200" title="Chia đều lại điểm số">
                                Chia đều 10 điểm
                            </Button>
                            <Button variant="secondary" onClick={() => setIsBankModalOpen(true)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                                <Plus className="w-4 h-4 mr-2" /> Nhập từ Ngân hàng đề
                            </Button>
                            <Button variant="secondary" onClick={() => setIsAIModalOpen(true)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                                <Sparkles className="w-4 h-4 mr-2" /> Sinh bằng AI
                            </Button>
                        </div>
                        <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                            <Save className="w-4 h-4 mr-2" /> {isLoading ? "Đang lưu..." : "Lưu bài kiểm tra"}
                        </Button>
                    </div>
                </div>
            </div>

            <AIGenerateModal
                open={isAIModalOpen}
                onOpenChange={setIsAIModalOpen}
                onQuestionsGenerated={handleAIGenerated}
            />
            <ImportFromBankModal
                open={isBankModalOpen}
                onOpenChange={setIsBankModalOpen}
                onImport={handleBankImport}
            />
        </div>
    );
}
