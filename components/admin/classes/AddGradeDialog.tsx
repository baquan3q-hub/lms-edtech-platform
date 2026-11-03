"use client";

import { useState } from "react";
import { Plus, Layers, Loader2 } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createGrade } from "@/app/(dashboard)/admin/classes/actions";

const POPULAR_GRADES = [
    { label: "Khối 1", group: "Tiểu học" },
    { label: "Khối 2", group: "Tiểu học" },
    { label: "Khối 3", group: "Tiểu học" },
    { label: "Khối 4", group: "Tiểu học" },
    { label: "Khối 5", group: "Tiểu học" },
    { label: "Khối 6", group: "THCS" },
    { label: "Khối 7", group: "THCS" },
    { label: "Khối 8", group: "THCS" },
    { label: "Khối 9", group: "THCS" },
    { label: "Khối 10", group: "THPT" },
    { label: "Khối 11", group: "THPT" },
    { label: "Khối 12", group: "THPT" },
];

export default function AddGradeDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [gradeName, setGradeName] = useState("");
    const [mode, setMode] = useState("offline");

    async function onSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await createGrade(formData);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Tạo Khối học thành công");
            setGradeName("");
            setOpen(false);
        } catch {
            toast.error("Đã xảy ra lỗi khi tạo khối");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 font-medium shadow-sm">
                    <Layers className="w-4 h-4 mr-2 text-slate-500" />
                    Thêm Khối học
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Thêm Khối học / Chương trình mới
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">
                        Khối học là cấp quản lý chung cho các lớp (Ví dụ: Khối 1, Khối 2... hoặc Khối Song ngữ).
                    </DialogDescription>
                </DialogHeader>

                <form action={onSubmit} className="space-y-4 pt-2">
                    {/* Gợi ý chọn nhanh */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Gợi ý chọn nhanh Khối phổ thông:
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                            {POPULAR_GRADES.map((g) => (
                                <button
                                    key={g.label}
                                    type="button"
                                    onClick={() => setGradeName(g.label)}
                                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                        gradeName === g.label
                                            ? "bg-blue-600 text-white shadow-sm font-semibold"
                                            : "bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:text-blue-600"
                                    }`}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="grade_name" className="text-slate-700 font-medium text-sm">
                            Tên Khối học / Chương trình <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="grade_name"
                            name="name"
                            value={gradeName}
                            onChange={(e) => setGradeName(e.target.value)}
                            placeholder="VD: Khối 10, Khối 1, Khối Song Ngữ..."
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-blue-600"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="mode" className="text-slate-700 font-medium text-sm">
                            Hình thức đào tạo
                        </Label>
                        <Select name="mode" value={mode} onValueChange={setMode}>
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                <SelectValue placeholder="Chọn hình thức" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                <SelectItem value="offline">Trực tiếp (Tại trường)</SelectItem>
                                <SelectItem value="online">Trực tuyến (Online)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-slate-700 font-medium text-sm">
                            Mô tả / Ghi chú mục tiêu khối
                        </Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Ghi chú về chương trình hoặc tiêu chuẩn đánh giá của khối này..."
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 resize-none h-20"
                        />
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
                        <Button
                            type="submit"
                            disabled={loading || !gradeName.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                "Tạo Khối học"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
