"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCourse } from "@/lib/actions/academic";

const courseSchema = z.object({ name: z.string().min(1, "Tên khóa học là bắt buộc."), description: z.string().optional(), teacher_id: z.string().min(1, "Vui lòng chọn giáo viên.") });
interface CourseFormData { name: string; description?: string; teacher_id: string; }
interface Teacher { id: string; full_name: string; email: string; }

export default function CreateCourseDialog({ teachers }: { teachers: Teacher[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CourseFormData>({ resolver: zodResolver(courseSchema) as never });

    async function onSubmit(data: CourseFormData) {
        setIsLoading(true);
        try {
            const result = await createCourse(data);
            if (result.error) { toast.error("Tạo khóa học thất bại", { description: result.error }); }
            else { toast.success("Tạo khóa học thành công!"); reset(); setOpen(false); }
        } catch { toast.error("Đã xảy ra lỗi."); } finally { setIsLoading(false); }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm"><Plus className="w-4 h-4 mr-2" />Tạo khóa học mới</Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-gray-900">Tạo khóa học mới</DialogTitle>
                    <DialogDescription className="text-gray-500">Điền thông tin để tạo khóa học / môn học mới.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Tên khóa học <span className="text-red-500">*</span></Label>
                        <Input {...register("name")} placeholder="Ví dụ: Toán nâng cao" disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500" />
                        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Mô tả</Label>
                        <Input {...register("description")} placeholder="Mô tả ngắn gọn..." disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Giáo viên phụ trách <span className="text-red-500">*</span></Label>
                        <Select onValueChange={(val) => setValue("teacher_id", val)} disabled={isLoading}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500"><SelectValue placeholder="Chọn giáo viên" /></SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                                {teachers.map((t) => (<SelectItem key={t.id} value={t.id} className="text-gray-900 focus:bg-gray-100">{t.full_name} ({t.email})</SelectItem>))}
                            </SelectContent>
                        </Select>
                        {errors.teacher_id && <p className="text-xs text-red-500">{errors.teacher_id.message}</p>}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100">Hủy</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white">
                            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo...</>) : "Tạo khóa học"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
