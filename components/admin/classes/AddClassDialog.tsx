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
import { createClass } from "@/app/(dashboard)/admin/classes/actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AddClassDialog({ courses, teachers }: { courses: any[], teachers: any[] }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function onSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await createClass(formData);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Mở lớp học thành công");
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
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Mở Lớp mới
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Mở Lớp học mới</DialogTitle>
                    <DialogDescription>
                        Phân công giáo viên và thiết lập phòng học cho môn học.
                    </DialogDescription>
                </DialogHeader>
                <form action={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Tên lớp học <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="VD: Lớp A1, Lớp Nâng cao..."
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="course">Khóa học thuộc về <span className="text-red-500">*</span></Label>
                            <Select name="course_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn môn học..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses?.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="teacher">Giáo viên phụ trách <span className="text-red-500">*</span></Label>
                            <Select name="teacher_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn giáo viên..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers?.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                            {teacher.full_name} ({teacher.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="room">Phòng học</Label>
                                <Input
                                    id="room"
                                    name="room"
                                    placeholder="VD: P.101"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="max_students">Sĩ số tối đa</Label>
                                <Input
                                    id="max_students"
                                    name="max_students"
                                    type="number"
                                    defaultValue="30"
                                />
                            </div>
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
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                            {loading ? "Đang lưu..." : "Mở Lớp"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
