"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteHomework } from "@/lib/actions/homework";
import { toast } from "sonner";

export default function DeleteHomeworkButton({ homeworkId, classId }: { homeworkId: string, classId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này? Thao tác này sẽ xóa luôn điểm số của học sinh và không thể hoàn tác.")) {
            return;
        }

        startTransition(async () => {
            try {
                const res = await deleteHomework(homeworkId, classId);
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success("Đã xóa bài tập.");
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
            title="Xóa bài tập"
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    );
}
