"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveManualGrades } from "@/lib/actions/exam";
import { toast } from "sonner";
import { CheckCircle2, Save, FileText } from "lucide-react";

export default function ManualGradingModal({
    open,
    onOpenChange,
    submission,
    exam
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    submission: any;
    exam: any;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const questions = exam.questions || [];
    const essayQuestions = questions.filter((q: any) => q.type === "ESSAY");
    
    // We store manual grades separately in state before saving
    const [manualGrades, setManualGrades] = useState<Record<number, number>>({});

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // Tính lại tổng điểm (điểm đánh trắc nghiệm tự động + điểm tự luận)
            // submission.answers is an array of {selectedOptionId, textAnswer} matching `questions`.
            let newTotalScore = 0;
            questions.forEach((q: any, idx: number) => {
                if (q.type !== "ESSAY") {
                    const correctOption = (q.options || []).find((o: any) => o.isCorrect);
                    const studentAnswer = submission.answers[idx];
                    if (studentAnswer?.selectedOptionId === correctOption?.id) {
                        newTotalScore += (q.points || 1);
                    }
                } else {
                    // It's an essay question, check if graded manually
                    const manualScore = manualGrades[idx] ?? 0;
                    newTotalScore += manualScore;
                }
            });

            // Call server action to update score and mark status as 'graded'
            const res = await saveManualGrades(submission.id, newTotalScore);
            if (res.error) throw new Error(res.error);
            
            toast.success("Chấm điểm thành công!");
            onOpenChange(false);
            window.location.reload(); // Refresh to update list
        } catch (error: any) {
            toast.error("Lỗi: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const studentName = Array.isArray(submission.student) ? submission.student[0]?.full_name : submission.student?.full_name;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 rounded-2xl shadow-2xl">
                <DialogHeader className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white sticky top-0 z-10">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-200" />
                        Chấm bài Tự luận
                    </DialogTitle>
                    <DialogDescription className="text-indigo-100 font-medium opacity-90">
                        Học viên: {studentName || "Ẩn danh"}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
                    {essayQuestions.length === 0 ? (
                        <div className="text-center text-slate-500 p-8">Không có câu hỏi tự luận nào.</div>
                    ) : (
                        essayQuestions.map((q: any) => {
                            // Find corresponding answer index
                            const qIdx = questions.findIndex((origQ: any) => origQ.id === q.id);
                            const studentAnswer = submission.answers[qIdx]?.textAnswer || "Học sinh không nhập nội dung.";

                            return (
                                <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-slate-800 text-sm">{q.question}</h3>
                                        <span className="text-xs font-semibold text-slate-400 shrink-0 ml-4 max-w-24 text-right">Tối đa: {q.points} điểm</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
                                        {studentAnswer}
                                    </div>
                                    
                                    <div className="mt-4 flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-700">Chấm điểm:</span>
                                        <input 
                                            type="number" 
                                            min={0} 
                                            max={q.points} 
                                            step={0.5}
                                            value={manualGrades[qIdx] !== undefined ? manualGrades[qIdx] : ""}
                                            onChange={(e) => {
                                                let val = parseFloat(e.target.value);
                                                if (isNaN(val) || val < 0) val = 0;
                                                if (val > q.points) val = q.points;
                                                setManualGrades(prev => ({...prev, [qIdx]: val}));
                                            }}
                                            className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                        />
                                        <span className="text-sm text-slate-500 font-semibold">/ {q.points}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button onClick={handleSave} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {isSubmitting ? "Đang lưu..." : "Lưu điểm"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
