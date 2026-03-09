"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Loader2, Save, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createAssignment, saveBulkQuestions } from "@/lib/actions/teacher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddAssignmentDialog({
    lessonId,
    classId,
    title,
    showAsMainButton = false
}: {
    lessonId: string,
    classId: string,
    title: string,
    showAsMainButton?: boolean
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // State quản lý luồng AI
    const [promptText, setPromptText] = useState("");
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
    const [assignmentTitle, setAssignmentTitle] = useState(`Đề kiểm tra nhanh: ${title}`);

    async function handleGenerateAI() {
        if (!promptText.trim()) {
            toast.error("Vui lòng nhập nội dung đoạn văn/chủ đề để AI phân tích!");
            return;
        }

        setLoading(true);
        toast("AI đang phân tích tài liệu...", { icon: <BrainCircuit className="w-4 h-4 text-indigo-500 animate-pulse" /> });

        try {
            const res = await fetch("/api/ai/generate-quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: promptText, amount: 5, difficulty: "Lớp học" })
            });

            const result = await res.json();

            if (result.success && Array.isArray(result.data)) {
                setGeneratedQuestions(result.data);
                toast.success("AI đã tạo xong bộ 5 câu hỏi!");
            } else {
                toast.error(result.error || "Không thể parse dữ liệu JSON từ AI.");
            }
        } catch (error) {
            toast.error("Mất kết nối với AI Server.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveToDatabase() {
        if (generatedQuestions.length === 0) return;

        setLoading(true);

        try {
            // 1. Tạo Assignment (Bài Tập cha)
            const assignmentResult = await createAssignment({
                lesson_id: lessonId,
                class_id: classId,
                title: assignmentTitle,
                description: `Bài tập trắc nghiệm tự động tạo bởi AI ngày ${new Date().toLocaleDateString('vi-VN')}`,
                type: 'quiz',
                status: 'published',
                ai_graded: true,
                max_score: 100
            });

            if (!assignmentResult.success || !assignmentResult.data) {
                toast.error("Không thể lưu Bài tập mới vào thư viện.");
                setLoading(false);
                return;
            }

            const newAssignmentId = assignmentResult.data.id;

            // 2. Gắn Assignment ID vào từng câu hỏi AI và map đúng format Database
            const questionsToInsert = generatedQuestions.map((q) => ({
                assignment_id: newAssignmentId,
                content: q.content,
                options: q.options,
                correct_answer: q.correct_answer,
                points: 20 // 100 điểm chia cho 5 câu
            }));

            // 3. Gọi Bulk Insert vào DB
            const saveResult = await saveBulkQuestions(questionsToInsert);

            if (saveResult.success) {
                toast.success("Đã nạp toàn bộ câu hỏi vào Ngân hàng!");
                setOpen(false);
                setGeneratedQuestions([]);
                setPromptText("");
            } else {
                toast.error(saveResult.error || "Gặp lỗi khi lưu câu hỏi.");
            }
        } catch (error) {
            toast.error("Lỗi giao tiếp CSDL.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {showAsMainButton ? (
                    <Button className="mx-auto flex items-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-4">
                        <BrainCircuit className="w-4 h-4 mr-2" /> Tạo bộ câu hỏi trắc nghiệm bằng AI
                    </Button>
                ) : (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        <BrainCircuit className="w-4 h-4 mr-2" /> ✨ Tạo câu hỏi bằng AI
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <BrainCircuit className="w-6 h-6 text-indigo-500" />
                        Trợ lý AI tạo Đề thi
                    </DialogTitle>
                    <DialogDescription>
                        Dán một phần nội dung bài giảng để AI tự động phân tích và sinh ra 5 câu trắc nghiệm.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-slate-700 font-semibold">Tên Bài tập sẽ hiển thị với Học sinh</Label>
                        <Input
                            id="title"
                            value={assignmentTitle}
                            onChange={(e) => setAssignmentTitle(e.target.value)}
                            disabled={loading || generatedQuestions.length > 0}
                        />
                    </div>

                    {!generatedQuestions.length ? (
                        <div className="space-y-2">
                            <Label htmlFor="prompt" className="text-slate-700 font-semibold">Nội dung đoạn văn / Chủ đề kiến thức</Label>
                            <Textarea
                                id="prompt"
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder="Dán nội dung sách giáo khoa hoặc tóm tắt kiến thức vào đây để AI đọc hiểu..."
                                rows={6}
                                className="resize-none"
                                disabled={loading}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h4 className="font-semibold flex items-center text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                AI đã tạo thành công {generatedQuestions.length} câu hỏi! Vui lòng duyệt qua:
                            </h4>
                            <div className="space-y-4">
                                {generatedQuestions.map((q, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                        <p className="font-bold text-slate-800 mb-3">Câu {idx + 1}: {q.content}</p>
                                        <div className="space-y-2 pl-4">
                                            {q.options.map((opt: string, i: number) => (
                                                <div key={i} className={`text-sm py-1 px-3 rounded text-slate-700 ${opt === q.correct_answer ? 'bg-indigo-100 font-bold border border-indigo-200' : 'bg-white border border-slate-200'}`}>
                                                    {opt === q.correct_answer ? "✅ " : "⚪ "} {opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 pt-4 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Hủy
                    </Button>

                    {!generatedQuestions.length ? (
                        <Button onClick={handleGenerateAI} disabled={loading || !promptText} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            ✨ AI Tự động sinh đề
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSaveToDatabase}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lưu {generatedQuestions.length} câu vào Ngân hàng
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
