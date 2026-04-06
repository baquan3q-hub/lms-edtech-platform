"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    CheckCircle2, XCircle, Clock, Loader2, CalendarOff, User,
    Calendar, UserCheck, ArrowRightLeft, Ban, Send,
} from "lucide-react";
import {
    getTeacherLeaveRequests, reviewTeacherLeave,
    getAvailableTeachersForSubstitute,
} from "@/lib/actions/teacher-leave";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    approved: { label: "Đã duyệt", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

interface Props {
    month: number;
    year: number;
}

export default function TeacherLeaveTab({ month, year }: Props) {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [decision, setDecision] = useState<"approved" | "rejected">("approved");
    const [adminAction, setAdminAction] = useState<string>("substitute");
    const [adminNote, setAdminNote] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Substitute teacher state
    const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
    const [substituteTeacherId, setSubstituteTeacherId] = useState("");
    const [loadingTeachers, setLoadingTeachers] = useState(false);

    // Reschedule state
    const [makeupDate, setMakeupDate] = useState("");
    const [makeupStartTime, setMakeupStartTime] = useState("08:00");
    const [makeupEndTime, setMakeupEndTime] = useState("10:00");

    useEffect(() => {
        loadRequests();
    }, [month, year]);

    const loadRequests = async () => {
        setLoading(true);
        const { data } = await getTeacherLeaveRequests({ month, year });
        setRequests(data || []);
        setLoading(false);
    };

    const openReviewDialog = async (request: any) => {
        setSelectedRequest(request);
        setDecision("approved");
        setAdminAction("substitute");
        setAdminNote("");
        setSubstituteTeacherId("");
        setMakeupDate("");
        setAvailableTeachers([]);
        setReviewDialogOpen(true);

        // Load available teachers
        if (request.session?.start_time && request.session?.end_time) {
            setLoadingTeachers(true);
            const teacherObj = Array.isArray(request.teacher) ? request.teacher[0] : request.teacher;
            const { data } = await getAvailableTeachersForSubstitute(
                request.leave_date,
                request.session.start_time,
                request.session.end_time,
                teacherObj?.id || ""
            );
            setAvailableTeachers(data || []);
            setLoadingTeachers(false);
        }
    };

    const handleReview = async () => {
        if (!selectedRequest) return;

        // Validate
        if (decision === "approved") {
            if (adminAction === "substitute" && !substituteTeacherId) {
                toast.error("Vui lòng chọn GV dạy thay");
                return;
            }
            if (adminAction === "reschedule" && !makeupDate) {
                toast.error("Vui lòng chọn ngày dạy bù");
                return;
            }
        }

        setActionLoading(true);
        const { success, error } = await reviewTeacherLeave(
            selectedRequest.id,
            decision,
            decision === "approved" ? {
                admin_action: adminAction as any,
                substitute_teacher_id: adminAction === "substitute" ? substituteTeacherId : undefined,
                admin_note: adminNote || undefined,
                makeup_date: adminAction === "reschedule" ? makeupDate : undefined,
                makeup_start_time: adminAction === "reschedule" ? makeupStartTime : undefined,
                makeup_end_time: adminAction === "reschedule" ? makeupEndTime : undefined,
            } : {
                admin_note: adminNote || undefined,
            }
        );

        if (success) {
            toast.success(decision === "approved" ? "✅ Đã duyệt đơn xin nghỉ" : "❌ Đã từ chối đơn xin nghỉ");
            setReviewDialogOpen(false);
            loadRequests();
        } else {
            toast.error(`Lỗi: ${error}`);
        }
        setActionLoading(false);
    };

    const pendingRequests = requests.filter(r => r.status === "pending");
    const processedRequests = requests.filter(r => r.status !== "pending");

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-500">Đang tải đơn xin nghỉ...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Chờ duyệt</p>
                    <p className="text-3xl font-black text-amber-600">{pendingRequests.length}</p>
                    {pendingRequests.length > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] mt-1">Cần xử lý</Badge>
                    )}
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Đã xử lý</p>
                    <p className="text-3xl font-black text-emerald-600">{processedRequests.length}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Tổng đơn tháng này</p>
                    <p className="text-3xl font-black text-slate-800">{requests.length}</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="bg-white border border-gray-200 rounded-xl p-1">
                    <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800 font-semibold px-4 py-2 text-sm">
                        ⏳ Chờ duyệt ({pendingRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="processed" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        📋 Đã xử lý ({processedRequests.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                    {pendingRequests.length === 0 ? (
                        <div className="bg-white rounded-2xl border p-8 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                            <p className="text-gray-500">Không có đơn nào cần duyệt</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {pendingRequests.map((req) => renderRequestCard(req, true))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="processed" className="mt-4">
                    {processedRequests.length === 0 ? (
                        <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">Chưa có đơn được xử lý</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {processedRequests.map((req) => renderRequestCard(req, false))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Review Dialog */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarOff className="w-5 h-5 text-rose-500" />
                            Xử lý đơn xin nghỉ
                        </DialogTitle>
                        <DialogDescription>
                            Duyệt hoặc từ chối đơn xin nghỉ dạy của giáo viên
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-4">
                            {/* Request Info */}
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm space-y-1">
                                <p><strong>GV:</strong> {(Array.isArray(selectedRequest.teacher) ? selectedRequest.teacher[0] : selectedRequest.teacher)?.full_name}</p>
                                <p><strong>Lớp:</strong> {(Array.isArray(selectedRequest.class) ? selectedRequest.class[0] : selectedRequest.class)?.name}</p>
                                <p><strong>Ngày nghỉ:</strong> {new Date(selectedRequest.leave_date).toLocaleDateString("vi-VN")}</p>
                                <p><strong>Lý do:</strong> {selectedRequest.reason}</p>
                            </div>

                            {/* Decision */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Quyết định</label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={decision === "approved" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setDecision("approved")}
                                        className={decision === "approved"
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                            : "border-slate-200"
                                        }
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1" /> Duyệt
                                    </Button>
                                    <Button
                                        variant={decision === "rejected" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setDecision("rejected")}
                                        className={decision === "rejected"
                                            ? "bg-red-600 hover:bg-red-700 text-white"
                                            : "border-slate-200"
                                        }
                                    >
                                        <XCircle className="w-4 h-4 mr-1" /> Từ chối
                                    </Button>
                                </div>
                            </div>

                            {/* Admin Action (only when approved) */}
                            {decision === "approved" && (
                                <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/30 space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-indigo-800 mb-2 block">Hình thức xử lý</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { value: "substitute", label: "GV dạy thay", icon: UserCheck, color: "text-blue-600" },
                                                { value: "reschedule", label: "Dạy bù", icon: ArrowRightLeft, color: "text-indigo-600" },
                                                { value: "cancel", label: "Huỷ buổi", icon: Ban, color: "text-red-600" },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setAdminAction(opt.value)}
                                                    className={`p-3 rounded-lg border text-center transition-all ${
                                                        adminAction === opt.value
                                                            ? "bg-white border-indigo-400 ring-2 ring-indigo-200 shadow-sm"
                                                            : "bg-white/50 border-slate-200 hover:border-indigo-300"
                                                    }`}
                                                >
                                                    <opt.icon className={`w-5 h-5 mx-auto mb-1 ${opt.color}`} />
                                                    <span className="text-xs font-medium text-slate-700">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Substitute Teacher Selection */}
                                    {adminAction === "substitute" && (
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                                                Chọn GV dạy thay
                                            </label>
                                            {loadingTeachers ? (
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tìm GV rảnh...
                                                </div>
                                            ) : availableTeachers.length === 0 ? (
                                                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                                    Không có GV nào rảnh trong khung giờ này
                                                </p>
                                            ) : (
                                                <Select value={substituteTeacherId} onValueChange={setSubstituteTeacherId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn giáo viên..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableTeachers.map((t: any) => (
                                                            <SelectItem key={t.id} value={t.id}>
                                                                {t.full_name} ({t.email})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    )}

                                    {/* Reschedule Fields */}
                                    {adminAction === "reschedule" && (
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Ngày dạy bù</label>
                                                <Input
                                                    type="date"
                                                    value={makeupDate}
                                                    onChange={(e) => setMakeupDate(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Giờ bắt đầu</label>
                                                <Input
                                                    type="time"
                                                    value={makeupStartTime}
                                                    onChange={(e) => setMakeupStartTime(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Giờ kết thúc</label>
                                                <Input
                                                    type="time"
                                                    value={makeupEndTime}
                                                    onChange={(e) => setMakeupEndTime(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Cancel warning */}
                                    {adminAction === "cancel" && (
                                        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-red-700">
                                            ⚠️ Buổi học sẽ bị huỷ. Học sinh và phụ huynh sẽ nhận được thông báo.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Admin Note */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                                    Ghi chú {decision === "rejected" && <span className="text-red-500">*</span>}
                                </label>
                                <Textarea
                                    placeholder={decision === "rejected" ? "Nhập lý do từ chối..." : "Ghi chú thêm (tuỳ chọn)"}
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={actionLoading}>
                            Huỷ
                        </Button>
                        <Button
                            onClick={handleReview}
                            disabled={actionLoading || (decision === "rejected" && !adminNote.trim())}
                            className={decision === "approved"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }
                        >
                            {actionLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : decision === "approved" ? (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            ) : (
                                <XCircle className="w-4 h-4 mr-2" />
                            )}
                            {decision === "approved" ? "Duyệt & Xử lý" : "Từ chối"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    function renderRequestCard(req: any, showActions: boolean) {
        const teacherObj = Array.isArray(req.teacher) ? req.teacher[0] : req.teacher;
        const classObj = Array.isArray(req.class) ? req.class[0] : req.class;
        const substituteObj = Array.isArray(req.substitute) ? req.substitute[0] : req.substitute;
        const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
        const isToday = req.leave_date === new Date().toISOString().split("T")[0];

        const ACTION_LABELS: Record<string, { label: string; color: string }> = {
            substitute: { label: "GV thay", color: "bg-blue-100 text-blue-700 border-blue-200" },
            reschedule: { label: "Dạy bù", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
            cancel: { label: "Huỷ buổi", color: "bg-red-100 text-red-700 border-red-200" },
        };

        return (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {teacherObj?.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">{teacherObj?.full_name || "Giáo viên"}</p>
                            <p className="text-xs text-gray-400">Lớp: {classObj?.name || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isToday && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Hôm nay</Badge>}
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                    </div>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-rose-500" />
                        <span>Ngày nghỉ: <strong>{new Date(req.leave_date).toLocaleDateString("vi-VN")}</strong></span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-600">
                        <CalendarOff className="w-4 h-4 text-indigo-500 mt-0.5" />
                        <span className="line-clamp-2">{req.reason}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <User className="w-3 h-3" />
                        {new Date(req.created_at).toLocaleString("vi-VN")}
                    </div>
                </div>

                {/* Admin action result */}
                {req.status === "approved" && req.admin_action && (
                    <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-1">
                        <Badge className={ACTION_LABELS[req.admin_action]?.color || "bg-slate-100"}>
                            {ACTION_LABELS[req.admin_action]?.label || req.admin_action}
                        </Badge>
                        {substituteObj && (
                            <p className="text-emerald-700">GV thay: <strong>{substituteObj.full_name}</strong></p>
                        )}
                        {req.admin_note && <p className="text-emerald-600 italic">{req.admin_note}</p>}
                    </div>
                )}

                {req.status === "rejected" && req.admin_note && (
                    <div className="mt-3 bg-red-50 p-2.5 rounded-lg border border-red-200 text-xs text-red-700">
                        <strong>Lý do từ chối:</strong> {req.admin_note}
                    </div>
                )}

                {showActions && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                            onClick={() => openReviewDialog(req)}
                        >
                            <Send className="w-4 h-4 mr-1" /> Xử lý
                        </Button>
                    </div>
                )}
            </div>
        );
    }
}
