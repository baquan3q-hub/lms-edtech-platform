"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateClassSchedule } from "@/lib/actions/academic";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface EditScheduleDialogProps {
    classId: string;
    currentSchedule: string;
}

export default function EditScheduleDialog({ classId, currentSchedule }: EditScheduleDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [scheduleStr, setScheduleStr] = useState(currentSchedule || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateClassSchedule(classId, scheduleStr);

            if (result.success) {
                toast.success("Đã cập nhật lịch học mới.");
                setIsOpen(false);
            } else {
                toast.error(result.error || "Gặp lỗi khi lưu.");
            }
        } catch (error) {
            toast.error("Mất kết nối với máy chủ.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 ml-2">
                    <Edit className="w-3 h-3 mr-1" /> Sửa lịch
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="w-5 h-5 text-indigo-500" />
                        Sắp xếp lịch học
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Nhập văn bản mô tả lịch học cho lớp này. Ví dụ: "Thứ 2, 4, 6 lúc 19:30 - 21:00"
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Textarea
                        placeholder="Thứ ... lúc ..."
                        value={scheduleStr}
                        onChange={(e) => setScheduleStr(e.target.value)}
                        rows={3}
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isSaving}
                    >
                        Hủy
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Lưu lịch học
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
