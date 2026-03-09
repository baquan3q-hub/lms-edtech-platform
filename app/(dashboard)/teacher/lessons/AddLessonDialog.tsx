"use client";

import { useState } from "react";
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
import { PlusCircle, Loader2, Link as LinkIcon, Trash2 } from "lucide-react";
import { createLesson } from "@/lib/actions/teacher";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AddLessonDialog({ classes, showAsButton = false }: { classes: any[], showAsButton?: boolean }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState([{ title: "", url: "" }]);

    const addAttachmentRow = () => {
        setAttachments([...attachments, { title: "", url: "" }]);
    };

    const removeAttachmentRow = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const updateAttachment = (index: number, field: "title" | "url", value: string) => {
        const newAtts = [...attachments];
        newAtts[index][field] = value;
        setAttachments(newAtts);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const classId = formData.get("classId") as string;
        const title = formData.get("title") as string;
        const videoUrl = formData.get("videoUrl") as string;
        const content = formData.get("content") as string;

        if (!classId || !title) {
            toast.error("Vui lòng điền đủ thông tin Lớp học và Tiêu đề bài giảng");
            setLoading(false);
            return;
        }

        // Lọc các attachment trống
        const validAttachments = attachments.filter(a => a.title.trim() !== "" && a.url.trim() !== "");

        const result = await createLesson({
            class_id: classId,
            title,
            video_url: videoUrl,
            content,
            attachments: validAttachments
        });

        if (result.success) {
            toast.success("Tạo bài giảng mới thành công!");
            setOpen(false);
        } else {
            toast.error(result.error || "Có lỗi xảy ra");
        }

        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {showAsButton ? (
                    <Button className="mx-auto flex items-center bg-indigo-600 hover:bg-indigo-700 text-white">
                        <PlusCircle className="w-4 h-4 mr-2" /> Tạo bài giảng đầu tiên
                    </Button>
                ) : (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        <PlusCircle className="w-4 h-4 mr-2" /> Tạo Bài giảng
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl">Mở Bài giảng mới</DialogTitle>
                        <DialogDescription>
                            Tạo bài giảng và chọn lớp học sẽ được phân phối bài giảng này.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="classId" className="text-slate-700 font-semibold">Chọn Lớp học *</Label>
                            <Select name="classId" required>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn lớp học bạn đang phụ trách" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.name ? `${cls.name} - ` : ""}{cls.course?.name || "Lớp ẩn danh"}
                                            ({cls.room || "Chưa xếp phòng"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-slate-700 font-semibold">Tiêu đề bài giảng *</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="VD: Bài 1 - Giới thiệu về HTML/CSS"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="videoUrl" className="text-slate-700 font-semibold">Đường dẫn Video (Tuỳ chọn)</Label>
                            <Input
                                id="videoUrl"
                                name="videoUrl"
                                placeholder="VD: https://youtube.com/watch?v=..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content" className="text-slate-700 font-semibold">Nội dung tóm tắt (Tuỳ chọn)</Label>
                            <Textarea
                                id="content"
                                name="content"
                                placeholder="Nhập một vài ghi chú ngắn cho bài giảng này..."
                                rows={3}
                            />
                        </div>

                        {/* ATTACHMENTS */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-700 font-semibold flex items-center">
                                    <LinkIcon className="w-4 h-4 mr-1 text-slate-500" /> Tài liệu đính kèm (Tuỳ chọn)
                                </Label>
                                <Button type="button" variant="outline" size="sm" onClick={addAttachmentRow} className="h-7 text-xs">
                                    <PlusCircle className="w-3 h-3 mr-1" /> Thêm file/link
                                </Button>
                            </div>

                            {attachments.map((att, idx) => (
                                <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                        <Input
                                            placeholder="Tên tài liệu (VD: Slide PDF)"
                                            value={att.title}
                                            onChange={(e) => updateAttachment(idx, "title", e.target.value)}
                                            className="h-8 text-sm bg-white"
                                        />
                                        <Input
                                            placeholder="Đường dẫn Link (Google Drive...)"
                                            value={att.url}
                                            onChange={(e) => updateAttachment(idx, "url", e.target.value)}
                                            className="h-8 text-sm bg-white"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => removeAttachmentRow(idx)}
                                        disabled={attachments.length === 1 && !att.title && !att.url}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <p className="text-xs text-slate-500">Dán đường dẫn thư mục bộ nhớ đám mây hoặc link file trực tuyến để học sinh có thể tải về.</p>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Lưu bài giảng
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
