"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";
import { generateStudentInsight } from "@/lib/actions/gemini-analysis";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

interface AIInsightModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    submission: any;
    exam: any;
    strengths: any[];
    weaknesses: any[];
}

export default function AIInsightModal({ open, onOpenChange, submission, exam, strengths, weaknesses }: AIInsightModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [insightText, setInsightText] = useState(submission?.ai_insight || "");

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const studentObj = Array.isArray(submission.student) ? submission.student[0] : submission.student;
            const res = await generateStudentInsight(
                submission.id,
                studentObj?.full_name || "Học sinh Ẩn danh",
                exam.title,
                submission.score,
                exam.total_points,
                submission.time_taken_seconds || 0,
                exam.duration_minutes,
                strengths,
                weaknesses
            );
            
            if (res.error) throw new Error(res.error);
            if (res.data) {
                setInsightText(res.data);
                toast.success("AI đã tạo đánh giá mới!");
            }
        } catch (error: any) {
            toast.error("Lỗi khi tạo đánh giá AI: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-900 text-xl font-bold">
                            <Sparkles className="w-5 h-5 text-purple-600" /> Phân tích bởi Gia Sư AI
                        </DialogTitle>
                        <DialogDescription className="text-indigo-700/70">
                            Nhận xét hành vi học tập và gợi ý bài tập từ Gemini cho học viên này.
                        </DialogDescription>
                    </DialogHeader>

                    {insightText && !isLoading && (
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" onClick={handleGenerate} className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                <Sparkles className="w-3.5 h-3.5 mr-2" /> Tạo lại phân tích khác
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden p-6 relative bg-white">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
                            <p className="text-slate-600 font-medium">Gemini đang phân tích báo cáo...</p>
                            <p className="text-sm text-slate-400 mt-1 max-w-xs text-center">AI đang xem xét thời gian làm bài, điểm mạnh, và lổ hổng kiến thức để đưa ra nhận xét tốt nhất.</p>
                        </div>
                    ) : null}

                    <ScrollArea className="h-full pr-4">
                        {insightText ? (
                            <div className="prose prose-sm prose-indigo max-w-none prose-p:leading-relaxed prose-li:my-1">
                                <ReactMarkdown>{insightText}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-full text-slate-400">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                                    <Sparkles className="w-8 h-8 text-indigo-300" />
                                </div>
                                <h3 className="font-bold text-slate-700 text-lg mb-2">Chưa có phân tích</h3>
                                <p className="max-w-xs mx-auto text-sm">Hệ thống chưa tạo báo cáo tự động cho học viên này. Hãy bấm nút bên dưới để nhờ AI phân tích.</p>
                                <Button onClick={handleGenerate} className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md">
                                    <Sparkles className="w-4 h-4 mr-2" /> Bắt đầu phân tích
                                </Button>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
