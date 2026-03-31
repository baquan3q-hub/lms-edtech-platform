"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    CheckCircle2, XCircle, Clock, Shield,
    Mail, UserCircle, Users2, Send, Loader2,
} from "lucide-react";
import { sendAttendanceReportToParent } from "@/lib/actions/attendance";

interface StudentData {
    studentId: string;
    studentName: string;
    studentEmail: string;
    avatarUrl: string | null;
    parentLinked: boolean;
    parentName: string | null;
    parentId: string | null;
    classes: {
        classId: string;
        className: string;
        present: number;
        absent: number;
        late: number;
        excused: number;
        total: number;
        rate: number;
    }[];
    overall: {
        present: number;
        absent: number;
        late: number;
        excused: number;
        total: number;
        rate: number;
    };
    alert: "normal" | "warning" | "danger";
    consecutiveAbsent: number;
}

interface Props {
    student: StudentData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    month: number;
    year: number;
}

export default function StudentDetailDialog({ student, open, onOpenChange, month, year }: Props) {
    const [sending, setSending] = useState(false);

    if (!student) return null;

    const s = student;
    const o = s.overall;

    const handleSendReport = async () => {
        if (!s.parentId) {
            toast.error("Học sinh chưa liên kết phụ huynh");
            return;
        }
        setSending(true);
        const { success, error } = await sendAttendanceReportToParent({
            studentId: s.studentId,
            parentId: s.parentId,
            studentName: s.studentName,
            month,
            year,
            summary: o,
        });
        setSending(false);
        if (success) toast.success("Đã gửi báo cáo cho phụ huynh!");
        else toast.error(error || "Lỗi gửi báo cáo");
    };

    const alertStyles = {
        danger: "bg-red-50 border-red-200 text-red-700",
        warning: "bg-amber-50 border-amber-200 text-amber-700",
        normal: "bg-emerald-50 border-emerald-200 text-emerald-700",
    };

    const alertLabels = {
        danger: "🔴 Nghiêm trọng",
        warning: "🟡 Cần chú ý",
        normal: "🟢 Bình thường",
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-indigo-500" />
                        Chi tiết Học sinh
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Student Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {s.avatarUrl ? (
                                <img src={s.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                            ) : (
                                <UserCircle className="w-8 h-8 text-indigo-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">{s.studentName}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {s.studentEmail}
                            </p>
                            {s.parentLinked ? (
                                <p className="text-sm text-blue-600 flex items-center gap-1 mt-0.5">
                                    <Users2 className="w-3.5 h-3.5" /> PH: {s.parentName}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-400 mt-0.5">Chưa liên kết phụ huynh</p>
                            )}
                        </div>
                        <Badge className={`${alertStyles[s.alert]} text-xs`}>
                            {alertLabels[s.alert]}
                        </Badge>
                    </div>

                    {/* Consecutive Absent Alert */}
                    {s.consecutiveAbsent >= 2 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm">
                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-red-700">
                                Vắng <strong>{s.consecutiveAbsent} buổi liên tiếp</strong> gần nhất
                            </span>
                        </div>
                    )}

                    {/* Overall Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <MiniStat icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Có mặt" value={o.present} color="emerald" />
                        <MiniStat icon={<XCircle className="w-4 h-4 text-red-500" />} label="Vắng" value={o.absent} color="red" />
                        <MiniStat icon={<Clock className="w-4 h-4 text-amber-500" />} label="Trễ" value={o.late} color="amber" />
                        <MiniStat icon={<Shield className="w-4 h-4 text-blue-500" />} label="Có phép" value={o.excused} color="blue" />
                    </div>

                    {/* Overall Rate */}
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Tỷ lệ chuyên cần tổng hợp</p>
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        o.rate >= 80 ? "bg-emerald-500"
                                            : o.rate >= 60 ? "bg-amber-500"
                                            : "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(o.rate, 100)}%` }}
                                />
                            </div>
                            <span className={`text-2xl font-black ${
                                o.rate >= 80 ? "text-emerald-600"
                                    : o.rate >= 60 ? "text-amber-600"
                                    : "text-red-600"
                            }`}>
                                {o.rate}%
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Tháng {month}/{year} — {o.total} lượt điểm danh
                        </p>
                    </div>

                    {/* Per-class Breakdown */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Chi tiết từng lớp
                        </p>
                        <div className="space-y-2">
                            {s.classes.map((cls) => (
                                <div
                                    key={cls.classId}
                                    className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                        <span className="font-medium text-gray-700 text-sm">{cls.className}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-emerald-600 font-semibold">{cls.present}✓</span>
                                        <span className="text-red-500 font-semibold">{cls.absent}✗</span>
                                        <span className="text-amber-500 font-semibold">{cls.late}⏰</span>
                                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    cls.rate >= 80 ? "bg-emerald-500"
                                                        : cls.rate >= 60 ? "bg-amber-500"
                                                        : "bg-red-500"
                                                }`}
                                                style={{ width: `${Math.min(cls.rate, 100)}%` }}
                                            />
                                        </div>
                                        <Badge className={
                                            cls.rate >= 80
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                : cls.rate >= 60
                                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                                : "bg-red-100 text-red-800 border-red-200"
                                        }>
                                            {cls.rate}%
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Send Report Button */}
                    <Button
                        className="w-full gap-2"
                        variant={s.parentLinked ? "default" : "outline"}
                        disabled={!s.parentLinked || sending}
                        onClick={handleSendReport}
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        {s.parentLinked
                            ? `Gửi báo cáo cho ${s.parentName}`
                            : "Chưa liên kết phụ huynh"
                        }
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MiniStat({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: number; color: string;
}) {
    const bgMap: Record<string, string> = {
        emerald: "bg-emerald-50", red: "bg-red-50", amber: "bg-amber-50", blue: "bg-blue-50",
    };
    const textMap: Record<string, string> = {
        emerald: "text-emerald-700", red: "text-red-700", amber: "text-amber-700", blue: "text-blue-700",
    };
    return (
        <div className={`${bgMap[color]} rounded-lg p-3 text-center`}>
            <div className="flex justify-center mb-1">{icon}</div>
            <p className={`text-xl font-black ${textMap[color]}`}>{value}</p>
            <p className="text-[10px] text-gray-500">{label}</p>
        </div>
    );
}
