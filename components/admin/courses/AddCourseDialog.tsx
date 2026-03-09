"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCourse } from "@/app/(dashboard)/admin/courses/actions";

export default function AddCourseDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function onSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await createCourse(formData);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Tạo khóa học thành công");
            setOpen(false);
        } catch (error) {
            toast.error("Đã xảy ra lỗi không xác định");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm Khóa học
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Tạo Khóa học mới</DialogTitle>
                    <DialogDescription>
                        Điền thông tin cơ bản về khóa học. Các lớp học cụ thể (Classes) sẽ được tạo và gán với khóa học này sau.
                    </DialogDescription>
                </DialogHeader>
                <form action={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Tên khóa học <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="VD: Lập trình Web Cơ bản"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Mô tả khóa học</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Mô tả ngắn gọn về khóa học..."
                                rows={3}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="mode">Hình thức tổ chức <span className="text-red-500">*</span></Label>
                            <select
                                id="mode"
                                name="mode"
                                defaultValue="offline"
                                className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="offline">🏫 Offline — Học tại phòng</option>
                                <option value="online">💻 Online — Học trực tuyến</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? "Đang tạo..." : "Tạo khóa học"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
