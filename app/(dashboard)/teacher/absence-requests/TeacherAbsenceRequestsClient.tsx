"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    CheckCircle2, XCircle, Clock, Loader2, FileText,
    Calendar, User, ExternalLink,
} from "lucide-react";
import { getAbsenceRequests, reviewAbsenceRequest } from "@/lib/actions/attendance";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    approved: { label: "Đã duyệt", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

export default function TeacherAbsenceRequestsClient({ teacherClassIds }: { teacherClassIds: string[] }) {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        const allRequests: any[] = [];
        for (const classId of teacherClassIds) {
            const { data } = await getAbsenceRequests({ class_id: classId });
            allRequests.push(...data);
        }
        // Remove duplicates by id
        const unique = Array.from(new Map(allRequests.map((r) => [r.id, r])).values());
        setRequests(unique);
        setLoading(false);
    };

    const handleApprove = async (requestId: string) => {
        setActionLoading(true);
        const result = await reviewAbsenceRequest(requestId, "approved");
        if (result.error) {
            toast.error(`Lỗi: ${result.error}`);
        } else {
            const studentName = result.data?.student?.full_name || "Học sinh";
            toast.success(`✅ Đã duyệt đơn xin nghỉ của ${studentName}`);
            loadRequests();
        }
        setActionLoading(false);
    };

    const handleReject = async () => {
        if (!selectedRequestId || !rejectReason.trim()) {
            toast.error("Vui lòng nhập lý do từ chối");
            return;
        }
        setActionLoading(true);
        const result = await reviewAbsenceRequest(selectedRequestId, "rejected", rejectReason);
        if (result.error) {
            toast.error(`Lỗi: ${result.error}`);
        } else {
            toast.success("❌ Đã từ chối đơn xin nghỉ");
            setRejectDialogOpen(false);
            setRejectReason("");
            setSelectedRequestId(null);
            loadRequests();
        }
        setActionLoading(false);
    };

    const pendingRequests = requests.filter((r) => r.status === "pending");
    const approvedRequests = requests.filter((r) => r.status === "approved");
    const rejectedRequests = requests.filter((r) => r.status === "rejected");

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-3 text-gray-500">Đang tải...</span>
            </div>
        );
    }

    const renderRequestCard = (req: any, showActions: boolean) => {
        const studentObj = Array.isArray(req.student) ? req.student[0] : req.student;
        const parentObj = Array.isArray(req.parent) ? req.parent[0] : req.parent;
        const classObj = Array.isArray(req.class) ? req.class[0] : req.class;
        const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
        const isToday = req.absence_date === new Date().toISOString().split("T")[0];
        const isTomorrow = (() => {
            const tmr = new Date();
            tmr.setDate(tmr.getDate() + 1);
            return req.absence_date === tmr.toISOString().split("T")[0];
        })();

        return (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {studentObj?.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">{studentObj?.full_name || "Học sinh"}</p>
                            <p className="text-xs text-gray-400">Lớp: {classObj?.name || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isToday && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Hôm nay</Badge>}
                        {isTomorrow && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Ngày mai</Badge>}
                        <Badge className={cfg.color}>
                            {cfg.label}
                        </Badge>
                    </div>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>Ngày nghỉ: <strong>{new Date(req.absence_date).toLocaleDateString("vi-VN")}</strong></span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-600">
                        <FileText className="w-4 h-4 text-indigo-500 mt-0.5" />
                        <span className="line-clamp-2">{req.reason}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <User className="w-3 h-3" />
                        Phụ huynh: {parentObj?.full_name || "—"} • {new Date(req.created_at).toLocaleDateString("vi-VN")}
                    </div>
                    {req.attachment_url && (
                        <a href={req.attachment_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Xem file đính kèm
                        </a>
                    )}
                </div>

                {showActions && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Duyệt
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 flex-1"
                            onClick={() => {
                                setSelectedRequestId(req.id);
                                setRejectDialogOpen(true);
                            }}
                            disabled={actionLoading}
                        >
                            <XCircle className="w-4 h-4 mr-1" /> Từ chối
                        </Button>
                    </div>
                )}

                {req.status === "rejected" && req.reject_reason && (
                    <div className="mt-3 bg-red-50 p-2.5 rounded-lg border border-red-200 text-xs text-red-700">
                        <strong>Lý do từ chối:</strong> {req.reject_reason}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 rounded-2xl text-white">
                <h2 className="text-2xl font-extrabold">📋 Duyệt đơn xin nghỉ</h2>
                <p className="text-slate-300 text-sm mt-1">Xem và xử lý đơn xin nghỉ từ phụ huynh</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Chờ duyệt</p>
                    <p className="text-2xl font-black text-amber-600">{pendingRequests.length}</p>
                    {pendingRequests.length > 0 && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] mt-1">Cần xử lý</Badge>}
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Đã duyệt tháng này</p>
                    <p className="text-2xl font-black text-emerald-600">{approvedRequests.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Từ chối tháng này</p>
                    <p className="text-2xl font-black text-red-600">{rejectedRequests.length}</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="bg-white border border-gray-200 rounded-xl p-1">
                    <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        ⏳ Chờ duyệt ({pendingRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        ✅ Đã duyệt ({approvedRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        ❌ Từ chối ({rejectedRequests.length})
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
                            {pendingRequests.map((r) => renderRequestCard(r, true))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="approved" className="mt-4">
                    {approvedRequests.length === 0 ? (
                        <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">Chưa có đơn được duyệt</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {approvedRequests.map((r) => renderRequestCard(r, false))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="rejected" className="mt-4">
                    {rejectedRequests.length === 0 ? (
                        <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">Chưa có đơn bị từ chối</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {rejectedRequests.map((r) => renderRequestCard(r, false))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lý do từ chối</DialogTitle>
                    </DialogHeader>
                    <Textarea
                        placeholder="Nhập lý do từ chối đơn xin nghỉ..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Hủy</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleReject}
                            disabled={actionLoading || !rejectReason.trim()}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Từ chối
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
