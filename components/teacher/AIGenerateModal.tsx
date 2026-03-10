"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AIUsageIndicator from "@/components/teacher/AIUsageIndicator";

interface AIGenerateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQuestionsGenerated: (questions: any[]) => void;
}

export default function AIGenerateModal({ open, onOpenChange, onQuestionsGenerated }: AIGenerateModalProps) {
    const [prompt, setPrompt] = useState("");
    const [numQuestions, setNumQuestions] = useState(5);
    const [file, setFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCountdown, setRetryCountdown] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (retryCountdown > 0) {
            interval = setInterval(() => {
                setRetryCountdown((prev) => prev - 1);
            }, 1000);
        } else if (retryCountdown === 0) {
            setError(null);
        }
        return () => clearInterval(interval);
    }, [retryCountdown]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            // Validate size (e.g. max 5MB)
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast.error("File quá lớn. Vui lòng chọn file dưới 5MB.");
                return;
            }
            setFile(selectedFile);
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleGenerate = async () => {
        if (!prompt && !file) {
            toast.error("Vui lòng nhập yêu cầu hoặc tải lên tài liệu.");
            return;
        }

        setIsGenerating(true);

        try {
            let fileData = "";
            let fileMimeType = "";

            if (file) {
                fileData = await convertFileToBase64(file);
                fileMimeType = file.type;
            }

            const res = await fetch("/api/ai/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    numQuestions,
                    fileData,
                    fileMimeType
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 429) {
                    setRetryCountdown(60);
                    throw new Error("429: AI đang quá tải");
                }
                throw new Error(data.error || "Lỗi không xác định từ máy chủ.");
            }

            if (data.questions && data.questions.length > 0) {
                toast.success(`Đã tạo thành công ${data.questions.length} câu hỏi!`);
                onQuestionsGenerated(data.questions);
                // Reset form
                setPrompt("");
                setFile(null);
                setNumQuestions(5);
                setError(null);
                onOpenChange(false);
            } else {
                throw new Error("Không có câu hỏi nào được tạo. Vui lòng thử lại yêu cầu khác.");
            }

        } catch (err: unknown) {
            console.error("AI Generate Error:", err);

            const message = err instanceof Error ? err.message : "Lỗi không xác định";

            if (message.includes("429") || message.includes("quota") || message.includes("Too Many Requests")) {
                setError("AI đang bận, vui lòng thử lại sau 1 phút. Nếu lỗi tiếp tục, hãy liên hệ quản trị viên.");
                if (retryCountdown === 0) setRetryCountdown(60);
            } else if (message.includes("401") || message.includes("API key")) {
                setError("Lỗi xác thực API. Vui lòng liên hệ quản trị viên.");
            } else if (message.includes("network") || message.includes("fetch")) {
                setError("Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.");
            } else {
                setError(`Đã xảy ra lỗi: ${message}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={isGenerating ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-indigo-700">
                            <Sparkles className="w-5 h-5" /> Trợ lý AI Sinh Câu Hỏi
                        </DialogTitle>
                        <AIUsageIndicator
                            status={retryCountdown > 0 ? "recovering" : (error ? "overloaded" : "ready")}
                            countdown={retryCountdown}
                        />
                    </div>
                    <DialogDescription>
                        Cung cấp mô tả hoặc tải lên tài liệu bài học. AI sẽ tự động phân tích và sinh câu hỏi trắc nghiệm cho bạn.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription className="font-medium text-sm">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Tài liệu tham khảo (Tùy chọn)</Label>
                        <div className="flex items-center gap-3">
                            {file ? (
                                <div className="flex-1 flex items-center justify-between p-3 flex items-center bg-indigo-50 border border-indigo-100 rounded-lg">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileUp className="w-4 h-4 text-indigo-500 shrink-0" />
                                        <span className="text-sm font-medium text-indigo-900 truncate">
                                            {file.name}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 shrink-0"
                                        onClick={() => setFile(null)}
                                        disabled={isGenerating}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative flex-1">
                                    <input
                                        type="file"
                                        accept=".pdf, .txt, .docx"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                        disabled={isGenerating}
                                    />
                                    <div className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-slate-50">
                                        <FileUp className="w-4 h-4" /> Chọn file PDF, TXT... (Tối đa 5MB)
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Yêu cầu tạo câu hỏi (Prompt) *</Label>
                        <Textarea
                            placeholder="Ví dụ: Tạo các câu hỏi về các định luật chuyển động của Newton mức độ vận dụng..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            disabled={isGenerating}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Số lượng câu hỏi</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                                className="w-24 text-center font-bold"
                                disabled={isGenerating}
                            />
                            <span className="text-sm text-slate-500">câu hỏi</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || (!prompt.trim() && !file) || retryCountdown > 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...
                            </>
                        ) : retryCountdown > 0 ? (
                            `Thử lại sau ${retryCountdown}s`
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" /> Tạo câu hỏi
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
