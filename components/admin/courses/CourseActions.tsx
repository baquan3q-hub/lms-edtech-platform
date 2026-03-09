"use client";

import { useState } from "react";
import { MoreHorizontal, Trash, Edit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCourse, updateCourse } from "@/app/(dashboard)/admin/courses/actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CourseActions({ course }: { course: any }) {
    const [loading, setLoading] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    async function handleDelete() {
        if (!confirm(`Bạn có chắc chắn muốn xóa khóa học "${course.name}"? Hành động này sẽ xóa tất cả lớp học và dữ liệu liên quan.`)) return;

        setLoading(true);
        try {
            const result = await deleteCourse(course.id);
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Đã xóa khóa học");
        } catch (error) {
            toast.error("Đã xảy ra lỗi khi xóa");
        } finally {
            setLoading(false);
        }
    }

    async function handleEditSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await updateCourse(course.id, formData);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Đã cập nhật khóa học");
            setIsEditOpen(false);
        } catch (error) {
            toast.error("Đã xảy ra lỗi khi cập nhật");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
                        <span className="sr-only">Mở menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash className="w-4 h-4 mr-2" />
                        Xóa khóa học
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa Khóa học</DialogTitle>
                        <DialogDescription>
                            Chỉnh sửa thông tin tên và mô tả khóa học.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleEditSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Tên khóa học <span className="text-red-500">*</span></Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    defaultValue={course.name}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Mô tả khóa học</Label>
                                <Textarea
                                    id="edit-description"
                                    name="description"
                                    defaultValue={course.description || ""}
                                    rows={4}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-mode">Hình thức tổ chức</Label>
                                <select
                                    id="edit-mode"
                                    name="mode"
                                    defaultValue={course.mode || "offline"}
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
                                onClick={() => setIsEditOpen(false)}
                                disabled={loading}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                {loading ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
