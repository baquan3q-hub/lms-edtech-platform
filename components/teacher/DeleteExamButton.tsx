"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteExam } from "@/lib/actions/exam";
import { toast } from "sonner";

export default function DeleteExamButton({ examId, classId }: { examId: string, classId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bài kiểm tra này? Thao tác này sẽ xóa luôn điểm số của học sinh và không thể hoàn tác.")) {
            return;
        }

        startTransition(async () => {
            try {
                const res = await deleteExam(examId, classId);
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success("Đã xóa bài kiểm tra.");
                }
            } catch (e: any) {
                toast.error("Lỗi: " + e.message);
            }
        });
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete}
            disabled={isPending}
            title="Xóa bài thi"
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    );
}
