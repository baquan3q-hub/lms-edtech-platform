"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Link as LinkIcon, Plus, Trash2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClassSession {
    id: string;
    class_id: string;
    session_number: number;
    session_date: string;
    start_time: string;
    end_time: string;
    topic: string | null;
    description: string | null;
    materials_url: string[] | null;
    homework: string | null;
    status: string;
    cancel_reason: string | null;
    teacher_notes: string | null;
}

interface SessionEditSheetProps {
    isOpen: boolean;
    onClose: () => void;
    session: ClassSession;
    onSave: (data: any) => void;
}

export default function SessionEditSheet({ isOpen, onClose, session, onSave }: SessionEditSheetProps) {
    const [topic, setTopic] = useState(session.topic || "");
    const [description, setDescription] = useState(session.description || "");
    const [materials, setMaterials] = useState<string[]>(session.materials_url || []);
    const [newMaterial, setNewMaterial] = useState("");
    const [homework, setHomework] = useState(session.homework || "");
    const [teacherNotes, setTeacherNotes] = useState(session.teacher_notes || "");

    const [isCancelled, setIsCancelled] = useState(session.status === 'cancelled');
    const [cancelReason, setCancelReason] = useState(session.cancel_reason || "");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddMaterial = () => {
        if (newMaterial.trim()) {
            setMaterials([...materials, newMaterial.trim()]);
            setNewMaterial("");
        }
    };

    const handleRemoveMaterial = (index: number) => {
        setMaterials(materials.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const data = {
                topic,
                description,
                materials_url: materials,
                homework,
                teacher_notes: teacherNotes,
                status: isCancelled ? 'cancelled' : (session.status === 'cancelled' ? 'scheduled' : session.status),
                cancel_reason: isCancelled ? cancelReason : null,
            };
            await onSave(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    const dateFormatted = format(parseISO(session.session_date), 'EEEE, dd/MM/yyyy', { locale: vi });

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg flex flex-col p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>Chỉnh sửa Buổi {session.session_number}</SheetTitle>
                    <SheetDescription>
                        {dateFormatted} • {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-4">
                    <div className="space-y-6 pb-6">
                        {/* 1. Chủ đề */}
                        <div className="space-y-2">
                            <Label htmlFor="topic">Chủ đề buổi học</Label>
                            <Input
                                id="topic"
                                placeholder="VD: Module 1: Animals - Listening"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />
                        </div>

                        {/* 2. Mô tả chi tiết */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Kế hoạch / Mô tả nội dung</Label>
                            <Textarea
                                id="description"
                                placeholder="Nhập chi tiết kế hoạch dạy..."
                                className="min-h-[100px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* 3. Tài liệu đính kèm */}
                        <div className="space-y-3">
                            <Label>Tài liệu đính kèm (Links)</Label>

                            {materials.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {materials.map((mat, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 border rounded-md px-3 py-2 text-sm">
                                            <div className="flex items-center truncate mr-2">
                                                <LinkIcon className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                                                <a href={mat} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                                                    {mat}
                                                </a>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => handleRemoveMaterial(idx)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://"
                                    value={newMaterial}
                                    onChange={(e) => setNewMaterial(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddMaterial();
                                        }
                                    }}
                                />
                                <Button type="button" variant="secondary" onClick={handleAddMaterial}>
                                    <Plus className="w-4 h-4 mr-1" /> Thêm
                                </Button>
                            </div>
                        </div>

                        {/* 4. Bài tập về nhà */}
                        <div className="space-y-2">
                            <Label htmlFor="homework">Bài tập về nhà</Label>
                            <Textarea
                                id="homework"
                                placeholder="Nhập bài tập về nhà..."
                                className="min-h-[80px]"
                                value={homework}
                                onChange={(e) => setHomework(e.target.value)}
                            />
                        </div>

                        {/* 5. Ghi chú riêng */}
                        <div className="space-y-2 bg-amber-50 p-4 rounded-lg border border-amber-100">
                            <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="teacherNotes" className="text-amber-900 font-semibold">Ghi chú cá nhân</Label>
                                <Badge variant="outline" className="bg-white text-amber-700 border-amber-200">
                                    <ShieldAlert className="w-3 h-3 mr-1" /> Chỉ giáo viên thấy
                                </Badge>
                            </div>
                            <Textarea
                                id="teacherNotes"
                                placeholder="Ghi chú riêng để chuẩn bị bài..."
                                className="bg-white border-amber-200 focus-visible:ring-amber-500"
                                value={teacherNotes}
                                onChange={(e) => setTeacherNotes(e.target.value)}
                            />
                        </div>

                        {/* 6. Hủy buổi học */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <Checkbox
                                    id="cancel"
                                    checked={isCancelled}
                                    onCheckedChange={(checked) => setIsCancelled(checked as boolean)}
                                />
                                <div className="space-y-1 leading-none">
                                    <Label htmlFor="cancel" className="text-red-600 font-medium">Hủy buổi học này</Label>
                                    <p className="text-sm text-slate-500">
                                        Nếu hủy, học sinh và phụ huynh sẽ nhận được thông báo.
                                    </p>
                                </div>
                            </div>

                            {isCancelled && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="cancelReason" className="text-red-600">Lý do hủy (bắt buộc)</Label>
                                    <Input
                                        id="cancelReason"
                                        placeholder="Nhập lý do hủy buổi học..."
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="border-red-200 focus-visible:ring-red-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <SheetFooter className="px-6 py-4 border-t bg-slate-50">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (isCancelled && !cancelReason.trim())}
                        className={isCancelled ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                    >
                        {isSubmitting ? "Đang lưu..." : "💾 Lưu thay đổi"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
