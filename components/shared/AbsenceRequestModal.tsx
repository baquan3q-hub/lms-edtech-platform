"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAbsenceRequest } from "@/lib/actions/attendance";

interface AbsenceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: {
        class_id: string;
        class_name: string;
        session_date: string;
    } | null;
    studentId: string;
}

export default function AbsenceRequestModal({ isOpen, onClose, session, studentId }: AbsenceRequestModalProps) {
    const [reason, setReason] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!session) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            toast.error("Vui lòng nhập lý do xin nghỉ");
            return;
        }

        setIsSubmitting(true);

        // This expects the logged in user to be the Parent. 
        // If the logged in user is a Student, createAbsenceRequest will use their ID as parent_id.
        // We need to bypass or handle this in the backend, but since the schema REQUIRES parent_id, 
        // we'll pass it and rely on the backend (we might need to tweak `createAbsenceRequest` later to allow students to request).
        const { success, error } = await createAbsenceRequest({
            student_id: studentId,
            class_id: session.class_id,
            absence_date: session.session_date,
            reason: reason.trim(),
            attachment_url: attachmentUrl || undefined
        });

        setIsSubmitting(false);

        if (success) {
            toast.success("Đã gửi đơn xin nghỉ thành công");
            setReason("");
            setAttachmentUrl("");
            onClose();
        } else {
            toast.error(error || "Có lỗi xảy ra khi gửi đơn");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Đơn Xin Nghỉ Học</DialogTitle>
                        <DialogDescription>
                            Gửi đơn xin phép nghỉ cho buổi học sắp tới.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Lớp học</Label>
                            <Input value={session.class_name} disabled className="bg-slate-50" />
                        </div>

                        <div className="grid gap-2">
                            <Label>Ngày nghỉ</Label>
                            <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-slate-50 text-sm">
                                <CalendarIcon className="w-4 h-4 text-slate-500" />
                                {format(new Date(session.session_date), 'dd/MM/yyyy', { locale: vi })}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason">Lý do xin nghỉ <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="reason"
                                placeholder="Ví dụ: Cháu bị ốm không thể tham gia lớp học..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                required
                            />
                        </div>

                        {/* Optional: Add attachment input here later */}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Gửi đơn
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
