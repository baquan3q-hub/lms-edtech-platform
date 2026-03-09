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
import { createClass } from "@/lib/actions/academic";

const classSchema = z.object({ course_id: z.string().min(1, "Vui lòng chọn khóa học."), teacher_id: z.string().min(1, "Vui lòng chọn giáo viên."), room: z.string().optional(), schedule: z.string().optional(), max_students: z.string().optional() });
interface ClassFormData { course_id: string; teacher_id: string; room?: string; schedule?: string; max_students?: string; }
interface SelectOption { id: string; full_name?: string; name?: string; email?: string; }

export default function CreateClassDialog({ courses, teachers }: { courses: SelectOption[]; teachers: SelectOption[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<ClassFormData>({ resolver: zodResolver(classSchema) as never, defaultValues: { max_students: "30" } });

    async function onSubmit(data: ClassFormData) {
        setIsLoading(true);
        try {
            const result = await createClass({ course_id: data.course_id, teacher_id: data.teacher_id, room: data.room || "", schedule: data.schedule || "", max_students: parseInt(data.max_students || "30", 10) });
            if (result.error) { toast.error("Mở lớp thất bại", { description: result.error }); }
            else { toast.success("Mở lớp thành công!"); reset(); setOpen(false); }
        } catch { toast.error("Đã xảy ra lỗi."); } finally { setIsLoading(false); }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm"><Plus className="w-4 h-4 mr-2" />Mở lớp mới</Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-gray-900">Mở lớp học mới</DialogTitle>
                    <DialogDescription className="text-gray-500">Tạo lớp học mới thuộc một khóa học và phân công giáo viên.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Khóa học <span className="text-red-500">*</span></Label>
                        <Select onValueChange={(val) => setValue("course_id", val)} disabled={isLoading}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900"><SelectValue placeholder="Chọn khóa học" /></SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">{courses.map((c) => (<SelectItem key={c.id} value={c.id} className="text-gray-900 focus:bg-gray-100">{c.name}</SelectItem>))}</SelectContent>
                        </Select>
                        {errors.course_id && <p className="text-xs text-red-500">{errors.course_id.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Giáo viên <span className="text-red-500">*</span></Label>
                        <Select onValueChange={(val) => setValue("teacher_id", val)} disabled={isLoading}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900"><SelectValue placeholder="Chọn giáo viên" /></SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">{teachers.map((t) => (<SelectItem key={t.id} value={t.id} className="text-gray-900 focus:bg-gray-100">{t.full_name} ({t.email})</SelectItem>))}</SelectContent>
                        </Select>
                        {errors.teacher_id && <p className="text-xs text-red-500">{errors.teacher_id.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">Phòng học</Label>
                            <Input {...register("room")} placeholder="VD: A101" disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">Sĩ số tối đa</Label>
                            <Input {...register("max_students")} type="number" min={1} max={200} disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Lịch học</Label>
                        <Input {...register("schedule")} placeholder="VD: Thứ 2, 4, 6 — 18:00-20:00" disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100">Hủy</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white">
                            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo...</>) : "Mở lớp"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
