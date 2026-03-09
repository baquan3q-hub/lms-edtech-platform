"use client";

import { useState } from "react";
import { MoreHorizontal, Trash, Edit, Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { deleteClass, updateClass } from "@/app/(dashboard)/admin/classes/actions";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ClassActions({
    cls,
    courses,
    teachers
}: {
    cls: any;
    courses: { id: string, name: string }[];
    teachers: { id: string, full_name: string, email: string }[];
}) {
    const [loading, setLoading] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    async function handleDelete() {
        if (!confirm(`Bạn có chắc chắn muốn xóa Lớp học này (${cls.course?.name})? Hành động này sẽ xóa dữ liệu học sinh trong lớp.`)) return;

        setLoading(true);
        try {
            const result = await deleteClass(cls.id);
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Đã xóa lớp học");
        } catch (error) {
            toast.error("Đã xảy ra lỗi khi xóa");
        } finally {
            setLoading(false);
        }
    }

    async function handleEditSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await updateClass(cls.id, formData);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Đã cập nhật lớp học");
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
                    <DropdownMenuItem asChild className="cursor-pointer text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50">
                        <Link href={`/admin/classes/${cls.id}/students`}>
                            <Users className="w-4 h-4 mr-2" />
                            Danh sách học sinh
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Chỉnh sửa thông tin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash className="w-4 h-4 mr-2" />
                        Xóa lớp học
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa Lớp học</DialogTitle>
                        <DialogDescription>
                            Thay đổi giáo viên, phòng học hoặc trạng thái của lớp này.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleEditSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Tên lớp học <span className="text-red-500">*</span></Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    placeholder="VD: Lớp A1, Lớp Nâng cao..."
                                    defaultValue={cls.name || ""}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-course">Khóa học thuộc về <span className="text-red-500">*</span></Label>
                                <Select name="course_id" required defaultValue={cls.course_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn Khóa học" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map(course => (
                                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-teacher">Giáo viên phụ trách <span className="text-red-500">*</span></Label>
                                <Select name="teacher_id" required defaultValue={cls.teacher_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn Giáo viên" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map(teacher => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                                {teacher.full_name} ({teacher.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-room">Phòng học</Label>
                                    <Input
                                        id="edit-room"
                                        name="room"
                                        placeholder="VD: Phòng 101"
                                        defaultValue={cls.room || ""}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-max">Sĩ số tối đa</Label>
                                    <Input
                                        id="edit-max"
                                        name="max_students"
                                        type="number"
                                        min="1"
                                        defaultValue={cls.max_students}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2 mt-2">
                                <Label htmlFor="edit-status">Trạng thái lớp học</Label>
                                <Select name="status" defaultValue={cls.status || "active"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Đang hoạt động</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="completed">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Đã kết thúc</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Đã hủy</Badge>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
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
                            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                                {loading ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
