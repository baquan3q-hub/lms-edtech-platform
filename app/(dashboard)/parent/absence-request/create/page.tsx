"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    ArrowLeft, Send, Loader2, Calendar, User, BookOpen,
} from "lucide-react";
import Link from "next/link";
import {
    createAbsenceRequest,
    getParentChildren,
    getStudentClasses,
} from "@/lib/actions/attendance";

export default function CreateAbsenceRequestPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [children, setChildren] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedChild, setSelectedChild] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [absenceDate, setAbsenceDate] = useState("");
    const [reason, setReason] = useState("");
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        loadChildren();
    }, []);

    const loadChildren = async () => {
        const { data } = await getParentChildren();
        setChildren(data || []);
        if (data && data.length === 1) {
            const studentObj = Array.isArray(data[0].student) ? data[0].student[0] : data[0].student;
            setSelectedChild(studentObj?.id || data[0].student_id);
        }
    };

    useEffect(() => {
        if (selectedChild) {
            loadClasses(selectedChild);
        }
    }, [selectedChild]);

    const loadClasses = async (studentId: string) => {
        const { data } = await getStudentClasses(studentId);
        setClasses(data || []);
        if (data && data.length === 1) {
            const classObj = Array.isArray(data[0].class) ? data[0].class[0] : data[0].class;
            setSelectedClass(classObj?.id || data[0].class_id);
        }
    };

    const handleSubmit = async () => {
        if (!selectedChild || !selectedClass || !absenceDate || !reason) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }
        if (reason.length < 20) {
            toast.error("Lý do phải có ít nhất 20 ký tự");
            return;
        }
        if (!confirmed) {
            toast.error("Vui lòng xác nhận thông tin");
            return;
        }

        // Validate date
        const selectedDateObj = new Date(absenceDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        if (selectedDateObj < yesterday) {
            toast.error("Không thể chọn ngày quá khứ hơn 1 ngày");
            return;
        }

        setLoading(true);
        try {
            const result = await createAbsenceRequest({
                student_id: selectedChild,
                class_id: selectedClass,
                absence_date: absenceDate,
                reason,
            });

            if (result.error) {
                toast.error(`Lỗi: ${result.error}`);
                return;
            }

            toast.success("✅ Đã gửi đơn thành công, chờ giáo viên xét duyệt");
            router.push("/parent/absence-request");
        } catch {
            toast.error("Đã xảy ra sự cố");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link
                href="/parent/absence-request"
                className="flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors w-fit"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại danh sách
            </Link>

            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 rounded-2xl text-white">
                <h2 className="text-2xl font-extrabold">📤 Tạo đơn xin nghỉ</h2>
                <p className="text-slate-300 text-sm mt-1">Gửi đơn xin nghỉ cho giáo viên duyệt</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
                {/* Chọn con */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-blue-500" /> Chọn con
                    </label>
                    <Select value={selectedChild} onValueChange={(v) => { setSelectedChild(v); setSelectedClass(""); }}>
                        <SelectTrigger><SelectValue placeholder="Chọn con..." /></SelectTrigger>
                        <SelectContent>
                            {children.map((c: any) => {
                                const studentObj = Array.isArray(c.student) ? c.student[0] : c.student;
                                return (
                                    <SelectItem key={studentObj?.id || c.student_id} value={studentObj?.id || c.student_id}>
                                        {studentObj?.full_name || "Học sinh"}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Chọn lớp */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-500" /> Chọn lớp
                    </label>
                    <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedChild}>
                        <SelectTrigger><SelectValue placeholder="Chọn lớp..." /></SelectTrigger>
                        <SelectContent>
                            {classes.map((c: any) => {
                                const classObj = Array.isArray(c.class) ? c.class[0] : c.class;
                                return (
                                    <SelectItem key={classObj?.id || c.class_id} value={classObj?.id || c.class_id}>
                                        {classObj?.name || "Lớp học"}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Ngày nghỉ */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-500" /> Ngày nghỉ
                    </label>
                    <Input
                        type="date"
                        value={absenceDate}
                        onChange={(e) => setAbsenceDate(e.target.value)}
                        className="focus-visible:ring-emerald-500"
                    />
                </div>

                {/* Lý do */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Lý do nghỉ <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                        placeholder="Nhập lý do xin nghỉ (ít nhất 20 ký tự)..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        className="focus-visible:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">{reason.length}/20 ký tự tối thiểu</p>
                </div>

                {/* Checkbox xác nhận */}
                <div className="flex items-start gap-2">
                    <Checkbox
                        id="confirm"
                        checked={confirmed}
                        onCheckedChange={(checked) => setConfirmed(!!checked)}
                    />
                    <label htmlFor="confirm" className="text-sm text-gray-600 cursor-pointer">
                        Tôi xác nhận thông tin trên là chính xác
                    </label>
                </div>

                {/* Submit */}
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !confirmed || !selectedChild || !selectedClass || !absenceDate || reason.length < 20}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                >
                    {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi...</>
                    ) : (
                        <><Send className="w-4 h-4 mr-2" /> 📤 Gửi đơn xin nghỉ</>
                    )}
                </Button>
            </div>
        </div>
    );
}
