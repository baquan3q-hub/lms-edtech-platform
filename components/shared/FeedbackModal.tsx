"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Bug, Lightbulb, AlertCircle, Heart, Send, Users } from "lucide-react";
import { submitUserFeedback } from "@/lib/actions/feedback";
import { createClient } from "@/lib/supabase/client";

const FEEDBACK_TYPES = [
    { value: "bug", label: "Lỗi hệ thống", icon: Bug, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    { value: "suggestion", label: "Đề xuất tính năng", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    { value: "complaint", label: "Khiếu nại", icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
    { value: "praise", label: "Khen ngợi", icon: Heart, color: "text-pink-600", bg: "bg-pink-50 border-pink-200" },
];

type TargetOption = "admin" | "teacher";

interface ClassTeacher {
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
}

interface FeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId?: string;
}

export default function FeedbackModal({ open, onOpenChange, userId }: FeedbackModalProps) {
    const [type, setType] = useState("suggestion");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);

    // Teacher targeting
    const [target, setTarget] = useState<TargetOption>("admin");
    const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [loadingClasses, setLoadingClasses] = useState(false);

    // Load classes + teachers for student/parent users
    useEffect(() => {
        if (open && userId) {
            loadClassTeachers();
        }
    }, [open, userId]);

    const loadClassTeachers = async () => {
        setLoadingClasses(true);
        try {
            const supabase = createClient();

            // Check if user is student → get from enrollments
            const { data: enrollments } = await supabase
                .from("enrollments")
                .select("class_id, classes(name, teacher_id, teacher:users!classes_teacher_id_fkey(full_name))")
                .eq("student_id", userId!)
                .eq("status", "active");

            if (enrollments && enrollments.length > 0) {
                const items = enrollments.map((e: any) => {
                    const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes;
                    const teacher = Array.isArray(cls?.teacher) ? cls.teacher[0] : cls?.teacher;
                    return {
                        classId: e.class_id,
                        className: cls?.name || "Lớp học",
                        teacherId: cls?.teacher_id || "",
                        teacherName: teacher?.full_name || "Giáo viên",
                    };
                }).filter((i: ClassTeacher) => i.teacherId);
                setClassTeachers(items);
                if (items.length > 0) setSelectedClassId(items[0].classId);
                setLoadingClasses(false);
                return;
            }

            // Check if user is parent → get from parent_students → enrollments
            const { data: links } = await supabase
                .from("parent_students")
                .select("student_id")
                .eq("parent_id", userId!);

            const studentIds = links?.map((l: any) => l.student_id) || [];
            if (studentIds.length > 0) {
                const { data: studentEnrollments } = await supabase
                    .from("enrollments")
                    .select("class_id, classes(name, teacher_id, teacher:users!classes_teacher_id_fkey(full_name))")
                    .in("student_id", studentIds)
                    .eq("status", "active");

                if (studentEnrollments && studentEnrollments.length > 0) {
                    // Deduplicate by classId
                    const seen = new Set<string>();
                    const items = studentEnrollments
                        .map((e: any) => {
                            const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes;
                            const teacher = Array.isArray(cls?.teacher) ? cls.teacher[0] : cls?.teacher;
                            return {
                                classId: e.class_id,
                                className: cls?.name || "Lớp học",
                                teacherId: cls?.teacher_id || "",
                                teacherName: teacher?.full_name || "Giáo viên",
                            };
                        })
                        .filter((i: ClassTeacher) => {
                            if (seen.has(i.classId)) return false;
                            seen.add(i.classId);
                            return i.teacherId;
                        });
                    setClassTeachers(items);
                    if (items.length > 0) setSelectedClassId(items[0].classId);
                }
            }
        } catch (err) {
            console.error("Error loading class teachers:", err);
        } finally {
            setLoadingClasses(false);
        }
    };

    const selectedTeacher = classTeachers.find(c => c.classId === selectedClassId);

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Vui lòng nhập tiêu đề!");
            return;
        }
        if (!content.trim()) {
            toast.error("Vui lòng nhập nội dung phản hồi!");
            return;
        }

        setSending(true);
        const res = await submitUserFeedback({
            type,
            title: title.trim(),
            content: content.trim(),
            targetTeacherId: target === "teacher" ? selectedTeacher?.teacherId : undefined,
            classId: target === "teacher" ? selectedClassId : undefined,
        });

        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            const targetLabel = target === "teacher" ? `Giáo viên ${selectedTeacher?.teacherName}` : "Admin";
            toast.success(`Đã gửi phản hồi đến ${targetLabel} thành công! 💙`);
            setType("suggestion");
            setTitle("");
            setContent("");
            setTarget("admin");
            onOpenChange(false);
        }
        setSending(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        📝 Gửi phản hồi
                    </DialogTitle>
                    <DialogDescription>
                        Ý kiến của bạn giúp chúng tôi cải thiện hệ thống. Hãy chia sẻ nhé!
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Gửi đến ai? */}
                    <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Gửi đến</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setTarget("admin")}
                                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-left ${
                                    target === "admin"
                                        ? "bg-blue-50 border-blue-300 text-blue-700"
                                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                                }`}
                            >
                                <Users className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-semibold">Trung tâm (Admin)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTarget("teacher")}
                                disabled={classTeachers.length === 0}
                                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-left ${
                                    target === "teacher"
                                        ? "bg-purple-50 border-purple-300 text-purple-700"
                                        : classTeachers.length === 0
                                            ? "border-slate-100 text-slate-300 cursor-not-allowed"
                                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                                }`}
                            >
                                <Send className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-semibold">Giáo viên</span>
                            </button>
                        </div>
                    </div>

                    {/* Teacher class selector */}
                    {target === "teacher" && classTeachers.length > 0 && (
                        <div>
                            <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Chọn lớp / Giáo viên</Label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                            >
                                {classTeachers.map(ct => (
                                    <option key={ct.classId} value={ct.classId}>
                                        {ct.className} — GV: {ct.teacherName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Loại phản hồi */}
                    <div>
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Loại phản hồi</Label>
                        <RadioGroup value={type} onValueChange={setType} className="grid grid-cols-2 gap-2">
                            {FEEDBACK_TYPES.map((ft) => (
                                <label
                                    key={ft.value}
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                        type === ft.value
                                            ? ft.bg + " border-2"
                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                    }`}
                                >
                                    <RadioGroupItem value={ft.value} className="sr-only" />
                                    <ft.icon className={`w-4 h-4 ${ft.color}`} />
                                    <span className={`text-xs font-semibold ${type === ft.value ? ft.color : "text-slate-600"}`}>
                                        {ft.label}
                                    </span>
                                </label>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Tiêu đề */}
                    <div>
                        <Label htmlFor="feedback-title" className="text-sm font-semibold text-slate-700 mb-1.5 block">
                            Tiêu đề *
                        </Label>
                        <Input
                            id="feedback-title"
                            placeholder="VD: Không thể tải file PDF..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                        />
                    </div>

                    {/* Nội dung */}
                    <div>
                        <Label htmlFor="feedback-content" className="text-sm font-semibold text-slate-700 mb-1.5 block">
                            Nội dung chi tiết *
                        </Label>
                        <Textarea
                            id="feedback-content"
                            placeholder="Mô tả chi tiết vấn đề hoặc ý tưởng..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            maxLength={2000}
                        />
                        <p className="text-[10px] text-slate-400 mt-1 text-right">{content.length}/2000</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={sending || !title.trim() || !content.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Gửi phản hồi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
