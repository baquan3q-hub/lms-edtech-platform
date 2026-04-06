"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    CalendarOff, CheckCircle2, XCircle, Clock, Loader2,
    Send, FileText, ArrowRightLeft, UserCheck, Ban, Trash2,
} from "lucide-react";
import { createTeacherLeaveRequest, getMyLeaveRequests, withdrawTeacherLeave } from "@/lib/actions/teacher-leave";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    approved: { label: "Đã duyệt", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    substitute: { label: "GV dạy thay", icon: UserCheck, color: "text-blue-600" },
    reschedule: { label: "Dạy bù", icon: ArrowRightLeft, color: "text-indigo-600" },
    cancel: { label: "Huỷ buổi", icon: Ban, color: "text-red-600" },
};

interface Props {
    classId: string;
    className: string;
    sessions: any[]; // class_sessions list
}

export default function TeacherLeaveClient({ classId, className, sessions }: Props) {
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadLeaveRequests();
    }, []);

    const loadLeaveRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await getMyLeaveRequests();
            if (error) {
                console.warn("Chưa có bảng teacher_leave_requests hoặc lỗi:", error);
                setLeaveRequests([]);
                setLoading(false);
                return;
            }
            // Filter for this class
            const classLeaves = (data || []).filter((lr: any) => {
                const cls = Array.isArray(lr.class) ? lr.class[0] : lr.class;
                return cls?.id === classId;
            });
            setLeaveRequests(classLeaves);
        } catch (e) {
            console.warn("Lỗi load leave requests:", e);
            setLeaveRequests([]);
        }
        setLoading(false);
    };

    // Sessions sắp tới (chưa dạy) — candidate cho xin nghỉ
    const today = new Date().toISOString().split("T")[0];
    const upcomingSessions = sessions.filter(s =>
        s.session_date >= today &&
        s.status !== "cancelled" &&
        (s.teaching_status || "pending") !== "taught" &&
        (s.teaching_status || "pending") !== "substitute"
    );

    // Check if session already has a leave request (by date, not just session_id)
    const hasLeaveRequest = (session: any) => {
        return leaveRequests.some((lr: any) =>
            (lr.session_id === session.id || lr.leave_date === session.session_date) &&
            lr.status !== "rejected"
        );
    };

    const handleOpenDialog = (session: any) => {
        setSelectedSession(session);
        setReason("");
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedSession || !reason.trim()) {
            toast.error("Vui lòng nhập lý do xin nghỉ");
            return;
        }

        setSubmitting(true);
        const { success, error } = await createTeacherLeaveRequest({
            class_id: classId,
            session_id: selectedSession.id,
            leave_date: selectedSession.session_date,
            reason: reason.trim(),
        });

        if (success) {
            toast.success("Đã gửi đơn xin nghỉ! Admin sẽ xem xét.");
            setDialogOpen(false);
            loadLeaveRequests();
        } else {
            toast.error(`Lỗi: ${error}`);
        }
        setSubmitting(false);
    };

    const handleWithdraw = async (requestId: string) => {
        if (!confirm("Bạn có chắc muốn rút đơn xin nghỉ này?")) return;
        const { success, error } = await withdrawTeacherLeave(requestId);
        if (success) {
            toast.success("Đã rút đơn xin nghỉ");
            loadLeaveRequests();
        } else {
            toast.error(`Lỗi: ${error}`);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CalendarOff className="w-5 h-5 text-rose-500" />
                        Xin nghỉ dạy — {className}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Chọn buổi học cần xin nghỉ. Admin sẽ sắp xếp GV thay hoặc dạy bù.
                    </p>
                </div>
            </div>

            {/* Upcoming Sessions — Có thể xin nghỉ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        Buổi dạy sắp tới
                    </h4>
                </div>
                {upcomingSessions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Không có buổi dạy sắp tới</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {upcomingSessions.slice(0, 10).map((session) => {
                            const hasRequest = hasLeaveRequest(session);
                            const isToday = session.session_date === today;
                            const dateStr = new Date(session.session_date + "T00:00:00").toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                            });

                            return (
                                <div key={session.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                            isToday ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                                        }`}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800 text-sm">{dateStr}</span>
                                                {isToday && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 h-4">
                                                        Hôm nay
                                                    </Badge>
                                                )}
                                                {session.is_makeup && (
                                                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] py-0 h-4">
                                                        Học bù
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {session.start_time?.substring(0, 5)} — {session.end_time?.substring(0, 5)}
                                                {session.topic && <span className="ml-2">• {session.topic}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        {hasRequest ? (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                                <Clock className="w-3 h-3 mr-1" /> Đã gửi đơn
                                            </Badge>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDialog(session)}
                                                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-8"
                                            >
                                                <CalendarOff className="w-3.5 h-3.5 mr-1" />
                                                Xin nghỉ
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Leave Request History */}
            {!loading && leaveRequests.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-500" />
                            Đơn xin nghỉ đã gửi
                            <Badge className="ml-auto bg-slate-100 text-slate-600 border-0 text-xs">
                                {leaveRequests.length}
                            </Badge>
                        </h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {leaveRequests.map((lr: any) => {
                            const cfg = STATUS_CONFIG[lr.status] || STATUS_CONFIG.pending;
                            const actionCfg = lr.admin_action ? ACTION_CONFIG[lr.admin_action] : null;
                            const substituteObj = Array.isArray(lr.substitute) ? lr.substitute[0] : lr.substitute;
                            const makeupObj = Array.isArray(lr.makeup_session) ? lr.makeup_session[0] : lr.makeup_session;
                            const StatusIcon = cfg.icon;

                            return (
                                <div key={lr.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                lr.status === "approved" ? "bg-emerald-100" :
                                                lr.status === "rejected" ? "bg-red-100" : "bg-amber-100"
                                            }`}>
                                                <StatusIcon className={`w-4 h-4 ${
                                                    lr.status === "approved" ? "text-emerald-600" :
                                                    lr.status === "rejected" ? "text-red-600" : "text-amber-600"
                                                }`} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">
                                                    Ngày {new Date(lr.leave_date).toLocaleDateString("vi-VN")}
                                                </p>
                                                <p className="text-xs text-slate-500 line-clamp-1">{lr.reason}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={cfg.color + " text-xs"}>{cfg.label}</Badge>
                                            {lr.status === "pending" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleWithdraw(lr.id)}
                                                    className="text-red-500 hover:text-red-600 h-7 w-7 p-0"
                                                    title="Rút đơn"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Admin action info */}
                                    {lr.status === "approved" && actionCfg && (
                                        <div className="mt-2 ml-11 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <actionCfg.icon className={`w-3.5 h-3.5 ${actionCfg.color}`} />
                                                <span className={`font-semibold ${actionCfg.color}`}>{actionCfg.label}</span>
                                            </div>
                                            {substituteObj && (
                                                <p className="text-slate-600 mt-1">
                                                    GV thay: <strong>{substituteObj.full_name}</strong>
                                                </p>
                                            )}
                                            {makeupObj && (
                                                <p className="text-slate-600 mt-1">
                                                    Dạy bù: <strong>{new Date(makeupObj.session_date).toLocaleDateString("vi-VN")}</strong>
                                                    {makeupObj.start_time && ` ${makeupObj.start_time.substring(0, 5)}`}
                                                </p>
                                            )}
                                            {lr.admin_note && (
                                                <p className="text-slate-500 mt-1 italic">
                                                    Admin: {lr.admin_note}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {lr.status === "rejected" && lr.admin_note && (
                                        <div className="mt-2 ml-11 p-2.5 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
                                            <strong>Lý do từ chối:</strong> {lr.admin_note}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            )}

            {/* Leave Request Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarOff className="w-5 h-5 text-rose-500" />
                            Xin nghỉ dạy
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <p className="text-sm font-semibold text-slate-800">
                                    Lớp: {className}
                                </p>
                                <p className="text-sm text-slate-600">
                                    Ngày: {new Date(selectedSession.session_date + "T00:00:00").toLocaleDateString("vi-VN", {
                                        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
                                    })}
                                </p>
                                <p className="text-sm text-slate-600">
                                    Giờ: {selectedSession.start_time?.substring(0, 5)} — {selectedSession.end_time?.substring(0, 5)}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                                    Lý do xin nghỉ <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    placeholder="VD: Có việc gia đình đột xuất, xin phép nghỉ dạy buổi này..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                            Huỷ
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !reason.trim()}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Gửi đơn xin nghỉ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
