"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { approveAiJobAction, rejectAiJobAction } from "@/lib/actions/ai-review";
import { CheckCircle2, XCircle, AlertTriangle, Eye, Sparkles } from "lucide-react";

export interface HumanReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    reviewerId: string;
    kind: "question_generation" | "rubric_grading_feedback" | "early_intervention_recommendation";
    draftContent: any;
    sourceHash?: string;
    onSuccess?: (status: "approved" | "rejected", payload?: any) => void;
}

export function HumanReviewModal({
    isOpen,
    onClose,
    jobId,
    reviewerId,
    kind,
    draftContent,
    sourceHash,
    onSuccess,
}: HumanReviewModalProps) {
    const [editableText, setEditableText] = useState<string>(
        JSON.stringify(draftContent, null, 2)
    );
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const kindTitles: Record<string, string> = {
        question_generation: "Duyệt bản nháp câu hỏi ôn tập do AI sinh",
        rubric_grading_feedback: "Duyệt gợi ý nhận xét & điểm Rubric do AI đề xuất",
        early_intervention_recommendation: "Duyệt kế hoạch can thiệp sớm do AI đề xuất",
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            let modifiedPayload = null;
            try {
                modifiedPayload = JSON.parse(editableText);
            } catch {
                setErrorMsg("Nội dung chỉnh sửa phải là định dạng JSON hợp lệ.");
                setIsSubmitting(false);
                return;
            }

            const res = await approveAiJobAction({
                jobId,
                reviewerId,
                modifiedPayload,
            });

            if (!res.success) {
                setErrorMsg(res.error || "Không thể phê duyệt bản nháp.");
                setIsSubmitting(false);
                return;
            }

            onSuccess?.("approved", res.payload);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || "Đã xảy ra lỗi khi duyệt.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setErrorMsg("Vui lòng nhập lý do từ chối bản nháp.");
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            const res = await rejectAiJobAction({
                jobId,
                reviewerId,
                rejectionReason,
            });

            if (!res.success) {
                setErrorMsg(res.error || "Không thể bác bỏ bản nháp.");
                setIsSubmitting(false);
                return;
            }

            onSuccess?.("rejected");
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || "Đã xảy ra lỗi khi bác bỏ.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <DialogTitle className="text-xl font-bold">
                            {kindTitles[kind] || "Phê duyệt nội dung AI (Human-in-the-loop)"}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Nguyên tắc sống còn: AI chỉ đóng vai trò trợ lý sinh nháp. Giáo viên là người quyết định cuối cùng trước khi lưu chính thức.
                    </DialogDescription>
                    {sourceHash && (
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs font-mono">
                                Hash đối soát: {sourceHash.slice(0, 16)}...
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                Review Status: Draft
                            </Badge>
                        </div>
                    )}
                </DialogHeader>

                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="space-y-4 my-2">
                    {!showRejectForm ? (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-semibold flex items-center gap-1.5">
                                    <Eye className="w-4 h-4 text-slate-500" />
                                    Nội dung AI đề xuất (Giáo viên có thể trực tiếp biên tập lại):
                                </label>
                            </div>
                            <Textarea
                                value={editableText}
                                onChange={e => setEditableText(e.target.value)}
                                rows={14}
                                className="font-mono text-xs leading-relaxed bg-slate-50 dark:bg-slate-900 border-slate-300"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-md">
                            <label className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-amber-600" />
                                Lý do bác bỏ bản nháp AI (Bắt buộc để kiểm toán):
                            </label>
                            <Textarea
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Ví dụ: Nội dung câu hỏi chưa sát với chương trình học kỳ 1, độ khó chưa phù hợp..."
                                rows={4}
                                className="bg-white dark:bg-slate-900 border-amber-300"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center sm:justify-between">
                    <div>
                        {!showRejectForm ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-rose-600 border-rose-300 hover:bg-rose-50"
                                onClick={() => setShowRejectForm(true)}
                                disabled={isSubmitting}
                            >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Bác bỏ bản nháp
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowRejectForm(false)}
                                disabled={isSubmitting}
                            >
                                Quay lại biên tập
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                            Đóng
                        </Button>
                        {showRejectForm ? (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleReject}
                                disabled={isSubmitting}
                            >
                                Xác nhận Bác bỏ
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={handleApprove}
                                disabled={isSubmitting}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                Phê duyệt & Áp dụng
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
