"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAllFeedback, updateFeedbackStatus } from "@/lib/actions/feedback";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
    MessageSquare, Loader2, CheckCircle2, Clock, AlertCircle,
    Bug, Lightbulb, Heart, Filter, RefreshCw, Send
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "Chờ xử lý", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    in_progress: { label: "Đang xử lý", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Loader2 },
    resolved: { label: "Đã giải quyết", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

const TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
    bug: { label: "Lỗi hệ thống", icon: Bug, color: "text-red-600" },
    suggestion: { label: "Đề xuất", icon: Lightbulb, color: "text-amber-600" },
    complaint: { label: "Khiếu nại", icon: AlertCircle, color: "text-orange-600" },
    praise: { label: "Khen ngợi", icon: Heart, color: "text-pink-600" },
};

export default function AdminFeedbackClient() {
    const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    // Detail modal
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [adminReply, setAdminReply] = useState("");
    const [replying, setReplying] = useState(false);

    const loadFeedback = useCallback(async () => {
        setLoading(true);
        const res = await fetchAllFeedback({ status: statusFilter, type: typeFilter });
        if (res.data) {
            setFeedbackItems(res.data.items);
            setTotal(res.data.total);
        }
        setLoading(false);
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        loadFeedback();
    }, [loadFeedback]);

    // ====== Realtime subscription ======
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel("admin-feedback-realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "user_feedback" },
                () => {
                    loadFeedback();
                    toast.info("📝 Có phản hồi mới từ người dùng!", { duration: 4000 });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadFeedback]);

    const openDetail = (item: any) => {
        setSelectedItem(item);
        setAdminReply(item.admin_reply || "");
        setModalOpen(true);
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        const res = await updateFeedbackStatus(id, { status });
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã cập nhật trạng thái!");
            loadFeedback();
            if (selectedItem?.id === id) {
                setSelectedItem({ ...selectedItem, status });
            }
        }
    };

    const handleReply = async () => {
        if (!selectedItem || !adminReply.trim()) return;
        setReplying(true);
        const res = await updateFeedbackStatus(selectedItem.id, {
            admin_reply: adminReply.trim(),
            status: "resolved"
        });
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã gửi phản hồi và đánh dấu đã giải quyết!");
            setModalOpen(false);
            loadFeedback();
        }
        setReplying(false);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-indigo-600" /> Quản lý Phản hồi & Feedback
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Tổng cộng: <span className="font-bold text-indigo-600">{total}</span> phản hồi
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadFeedback} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Làm mới
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">Trạng thái:</span>
                </div>
                {["all", "pending", "in_progress", "resolved"].map(s => (
                    <Button
                        key={s}
                        variant={statusFilter === s ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setStatusFilter(s)}
                    >
                        {s === "all" ? "Tất cả" : STATUS_MAP[s]?.label || s}
                    </Button>
                ))}
                <span className="mx-2 text-slate-200">|</span>
                <span className="text-xs font-semibold text-slate-500">Loại:</span>
                {["all", "bug", "suggestion", "complaint", "praise"].map(t => (
                    <Button
                        key={t}
                        variant={typeFilter === t ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setTypeFilter(t)}
                    >
                        {t === "all" ? "Tất cả" : TYPE_MAP[t]?.label || t}
                    </Button>
                ))}
            </div>

            {/* Feedback List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : feedbackItems.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Chưa có phản hồi nào.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {feedbackItems.map((item: any) => {
                        const typeInfo = TYPE_MAP[item.type] || TYPE_MAP.suggestion;
                        const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
                        const userInfo = Array.isArray(item.user) ? item.user[0] : item.user;
                        const TypeIcon = typeInfo.icon;

                        return (
                            <Card
                                key={item.id}
                                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => openDetail(item)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${statusInfo.color}`}>
                                                <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-slate-800 truncate">{item.title}</h4>
                                                    <Badge className={`text-[9px] border shrink-0 ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-1">{item.content}</p>
                                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                                    <span>👤 {userInfo?.full_name || "Ẩn danh"}</span>
                                                    <span>📧 {userInfo?.email || "—"}</span>
                                                    <span>🏷️ {item.role === "student" ? "Học sinh" : "Phụ huynh"}</span>
                                                    <span>📅 {new Date(item.created_at).toLocaleDateString("vi-VN")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            {item.status === "pending" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-blue-600"
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, "in_progress"); }}
                                                >
                                                    Xử lý
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Detail Dialog */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-5 bg-white border-b shrink-0">
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            📝 Chi tiết Phản hồi
                        </DialogTitle>
                    </DialogHeader>

                    {selectedItem && (() => {
                        const typeInfo = TYPE_MAP[selectedItem.type] || TYPE_MAP.suggestion;
                        const statusInfo = STATUS_MAP[selectedItem.status] || STATUS_MAP.pending;
                        const userInfo = Array.isArray(selectedItem.user) ? selectedItem.user[0] : selectedItem.user;
                        const TypeIcon = typeInfo.icon;

                        return (
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                                    <span className="text-sm font-bold text-slate-900">{selectedItem.title}</span>
                                    <Badge className={`text-[10px] border ml-auto ${statusInfo.color}`}>{statusInfo.label}</Badge>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 border">
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedItem.content}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <span className="text-slate-500 block mb-0.5">Người gửi</span>
                                        <span className="font-bold text-slate-800">{userInfo?.full_name || "—"}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <span className="text-slate-500 block mb-0.5">Vai trò</span>
                                        <span className="font-bold text-slate-800">{selectedItem.role === "student" ? "Học sinh" : "Phụ huynh"}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <span className="text-slate-500 block mb-0.5">Ngày gửi</span>
                                        <span className="font-bold text-slate-800">{new Date(selectedItem.created_at).toLocaleString("vi-VN")}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <span className="text-slate-500 block mb-0.5">Loại</span>
                                        <span className="font-bold text-slate-800">{typeInfo.label}</span>
                                    </div>
                                </div>

                                {/* Admin Reply */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 block">Phản hồi của Admin</label>
                                    <Textarea
                                        placeholder="Nhập phản hồi cho người dùng..."
                                        value={adminReply}
                                        onChange={(e) => setAdminReply(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    <DialogFooter className="p-4 border-t bg-white shrink-0 gap-2">
                        {selectedItem?.status !== "resolved" && (
                            <Button
                                onClick={handleReply}
                                disabled={replying || !adminReply.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {replying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                                Gửi phản hồi & Hoàn tất
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
