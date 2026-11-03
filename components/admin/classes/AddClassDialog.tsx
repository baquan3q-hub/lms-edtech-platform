"use client";

import { useState } from "react";
import { Plus, School, Loader2 } from "lucide-react";
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

interface AddClassDialogProps {
    courses: any[];
    teachers: any[];
    initialCourseId?: string;
    customTrigger?: React.ReactNode;
}

export default function AddClassDialog({
    courses,
    teachers,
    initialCourseId,
    customTrigger,
}: AddClassDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || "");

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
        } catch {
            toast.error("Đã xảy ra lỗi không xác định");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val && initialCourseId) {
                setSelectedCourseId(initialCourseId);
            }
        }}>
            <DialogTrigger asChild>
                {customTrigger || (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Mở Lớp mới
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <School className="w-5 h-5 text-blue-600" />
                        Mở Lớp học mới
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">
                        Khởi tạo lớp học trực thuộc khối và phân công giáo viên chủ nhiệm / phụ trách.
                    </DialogDescription>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="course" className="text-slate-700 font-medium text-sm">
                            Thuộc Khối / Chương trình học <span className="text-rose-500">*</span>
                        </Label>
                        <Select
                            name="course_id"
                            value={selectedCourseId}
                            onValueChange={setSelectedCourseId}
                            required
                        >
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                <SelectValue placeholder="Chọn Khối học (VD: Khối 10, Khối 1...)" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 max-h-56">
                                {courses?.map((course) => (
                                    <SelectItem key={course.id} value={course.id} className="text-slate-900">
                                        {course.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {courses?.length === 0 && (
                            <p className="text-xs text-amber-600">Chưa có Khối học nào. Vui lòng bấm &quot;Thêm Khối học&quot; trước.</p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-slate-700 font-medium text-sm">
                            Tên lớp học <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="VD: 10A1, 1A2, Lớp Chuyên Toán..."
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-blue-600"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="teacher" className="text-slate-700 font-medium text-sm">
                            Giáo viên chủ nhiệm / Phụ trách <span className="text-rose-500">*</span>
                        </Label>
                        <Select name="teacher_id" required>
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                <SelectValue placeholder="Chọn giáo viên..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 max-h-56">
                                {teachers?.map((teacher) => (
                                    <SelectItem key={teacher.id} value={teacher.id} className="text-slate-900">
                                        {teacher.full_name} ({teacher.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="room" className="text-slate-700 font-medium text-sm">Phòng học cố định</Label>
                            <Input
                                id="room"
                                name="room"
                                placeholder="VD: P.201, Nhà A"
                                className="bg-white border-slate-200 text-slate-900"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="max_students" className="text-slate-700 font-medium text-sm">Sĩ số tối đa</Label>
                            <Input
                                id="max_students"
                                name="max_students"
                                type="number"
                                defaultValue="40"
                                min={1}
                                max={200}
                                className="bg-white border-slate-200 text-slate-900"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="text-slate-600 hover:text-slate-900"
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                "Mở Lớp học"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
