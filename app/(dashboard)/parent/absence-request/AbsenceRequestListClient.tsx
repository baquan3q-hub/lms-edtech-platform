"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText, PlusCircle, Loader2, Clock, CheckCircle2, XCircle,
    Eye, Calendar, Undo2,
} from "lucide-react";
import Link from "next/link";
import { getAbsenceRequests, withdrawAbsenceRequest } from "@/lib/actions/attendance";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    approved: { label: "Đã duyệt", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

export default function AbsenceRequestListClient({ parentId }: { parentId: string }) {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        const { data } = await getAbsenceRequests({ parent_id: parentId });
        setRequests(data);
        setLoading(false);
    };

    const handleWithdraw = async (requestId: string) => {
        const confirmed = window.confirm("Bạn có chắc muốn thu hồi đơn xin nghỉ này?");
        if (!confirmed) return;

        const { success, error } = await withdrawAbsenceRequest(requestId);
        if (success) {
            toast.success("Đã thu hồi đơn xin nghỉ thành công");
            setSelectedRequest(null);
            loadRequests();
        } else {
            toast.error(error || "Có lỗi xảy ra khi thu hồi đơn");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-3 text-gray-500">Đang tải...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">📋 Đơn xin nghỉ</h2>
                    <p className="text-sm text-slate-500 mt-1">Quản lý tất cả đơn xin nghỉ đã gửi</p>
                </div>
                <Link href="/parent/absence-request/create">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <PlusCircle className="w-4 h-4 mr-2" /> Tạo đơn mới
                    </Button>
                </Link>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Chưa có đơn nào</h3>
                    <p className="text-gray-500 text-sm mt-1">Bấm &quot;Tạo đơn mới&quot; để gửi đơn xin nghỉ.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-gray-50/80">
                            <TableRow>
                                <TableHead className="font-medium text-gray-500">Tên con</TableHead>
                                <TableHead className="font-medium text-gray-500">Lớp</TableHead>
                                <TableHead className="font-medium text-gray-500">Ngày nghỉ</TableHead>
                                <TableHead className="font-medium text-gray-500">Lý do</TableHead>
                                <TableHead className="font-medium text-gray-500">Ngày gửi</TableHead>
                                <TableHead className="font-medium text-gray-500">Trạng thái</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req: any) => {
                                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                                const Icon = cfg.icon;
                                const studentObj = Array.isArray(req.student) ? req.student[0] : req.student;
                                const classObj = Array.isArray(req.class) ? req.class[0] : req.class;

                                return (
                                    <TableRow key={req.id} className="hover:bg-gray-50/50">
                                        <TableCell className="font-semibold text-slate-800">
                                            {studentObj?.full_name || "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {classObj?.name || "—"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(req.absence_date).toLocaleDateString("vi-VN")}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                                            {req.reason}
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-400">
                                            {new Date(req.created_at).toLocaleDateString("vi-VN")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cfg.color}>
                                                <Icon className="w-3 h-3 mr-1" /> {cfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost" size="sm"
                                                    onClick={() => setSelectedRequest(req)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {req.status === "pending" && (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        onClick={() => handleWithdraw(req.id)}
                                                    >
                                                        <Undo2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Chi tiết đơn xin nghỉ</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (() => {
                        const studentObj = Array.isArray(selectedRequest.student) ? selectedRequest.student[0] : selectedRequest.student;
                        const classObj = Array.isArray(selectedRequest.class) ? selectedRequest.class[0] : selectedRequest.class;
                        const cfg = STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.pending;
                        return (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-500">Học sinh:</span><p className="font-semibold">{studentObj?.full_name}</p></div>
                                    <div><span className="text-gray-500">Lớp:</span><p className="font-semibold">{classObj?.name}</p></div>
                                    <div><span className="text-gray-500">Ngày nghỉ:</span><p className="font-semibold">{new Date(selectedRequest.absence_date).toLocaleDateString("vi-VN")}</p></div>
                                    <div><span className="text-gray-500">Trạng thái:</span><Badge className={cfg.color}>{cfg.label}</Badge></div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Lý do:</span>
                                    <p className="text-sm mt-1 bg-gray-50 p-3 rounded-lg">{selectedRequest.reason}</p>
                                </div>
                                {selectedRequest.attachment_url && (
                                    <div>
                                        <span className="text-sm text-gray-500">File đính kèm:</span>
                                        <a href={selectedRequest.attachment_url} target="_blank" rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline block mt-1">
                                            📎 Xem file
                                        </a>
                                    </div>
                                )}
                                {selectedRequest.status === "rejected" && selectedRequest.reject_reason && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                        <span className="text-xs text-red-600 font-medium">Lý do từ chối:</span>
                                        <p className="text-sm text-red-800 mt-1">{selectedRequest.reject_reason}</p>
                                    </div>
                                )}
                                {selectedRequest.status === "pending" && (
                                    <Button
                                        variant="outline"
                                        className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                                        onClick={() => handleWithdraw(selectedRequest.id)}
                                    >
                                        <Undo2 className="w-4 h-4 mr-2" />
                                        Thu hồi đơn xin nghỉ
                                    </Button>
                                )}
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
