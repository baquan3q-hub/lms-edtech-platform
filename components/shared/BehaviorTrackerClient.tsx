"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Send, Clock, AlertTriangle, CheckCircle2, User, Activity } from "lucide-react";
import { toast } from "sonner";
import { notifyParentAboutBehavior, fetchStudentActivityDetail } from "@/lib/actions/behavior-analysis";

export default function BehaviorTrackerClient({ students }: { students: any[] }) {
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [customMessage, setCustomMessage] = useState("");
    const [sending, setSending] = useState(false);
    
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [studentDetails, setStudentDetails] = useState<{ alerts: any[], logs: any[] } | null>(null);

    const handleOpenDetail = async (student: any) => {
        setSelectedStudent(student);
        setCustomMessage("");
        setModalOpen(true);
        
        // Fetch chi tiết hành vi
        setLoadingDetails(true);
        const res = await fetchStudentActivityDetail(student.student_id || student.id, student.class_id);
        if (res) {
            setStudentDetails({ alerts: res.alerts || [], logs: res.logs || [] });
        }
        setLoadingDetails(false);
    };

    const handleNotifyParent = async () => {
        if (!selectedStudent || !customMessage.trim()) return;
        setSending(true);
        
        const res = await notifyParentAboutBehavior(selectedStudent.student_id || selectedStudent.id, customMessage.trim());
        
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Đã gửi thông báo cho phụ huynh thành công!");
            setModalOpen(false);
        }
        setSending(false);
    };

    const getRiskColor = (level: string) => {
        if (level === "high_risk") return "bg-red-50 text-red-600 border-red-200";
        if (level === "warning") return "bg-amber-50 text-amber-600 border-amber-200";
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
    };

    const getRiskLabel = (level: string) => {
        if (level === "high_risk") return "Nguy cơ cao";
        if (level === "warning") return "Cần theo dõi";
        return "Bình thường";
    };

    return (
        <div className="space-y-4">
            {students.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Không có học sinh nào cấu thành rủi ro hành vi trong hệ thống.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((st, idx) => (
                        <Card key={idx} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                            {st.avatar_url ? (
                                                <img src={st.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <User className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{st.student_name}</h4>
                                            {st.class_name && <p className="text-[11px] text-slate-500">Lớp: {st.class_name}</p>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-slate-50 rounded-lg p-2 text-center border">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Mức cảnh báo</p>
                                        <Badge variant="outline" className={`text-[10px] ${getRiskColor(st.risk_level || st.behavior?.risk_level)} px-1.5 py-0`}>
                                            {getRiskLabel(st.risk_level || st.behavior?.risk_level)}
                                        </Badge>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 text-center border">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Điểm đánh giá</p>
                                        <p className="font-bold text-slate-700 text-xs">{st.gaming_score ?? st.behavior?.gaming_score ?? 0} đ</p>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full rounded-xl" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleOpenDetail(st)}
                                >
                                    <ShieldAlert className="w-4 h-4 mr-2 text-violet-500" /> Xem chi tiết
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal Chi tiết Hành vi */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0">
                    <DialogHeader className="p-5 border-b bg-slate-50 shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Chi tiết Hành vi làm bài kiểm tra
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-5 flex-1 overflow-y-auto space-y-5">
                        {loadingDetails ? (
                            <div className="py-10 text-center animate-pulse text-slate-400">Đang tải dữ liệu chi tiết...</div>
                        ) : (
                            <>
                                {/* Thông tin học sinh */}
                                <div className="flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-base">{selectedStudent?.student_name}</p>
                                        <Badge variant="outline" className={`text-[10px] mt-1 ${getRiskColor(selectedStudent?.risk_level || selectedStudent?.behavior?.risk_level)} px-1.5 py-0`}>
                                            {getRiskLabel(selectedStudent?.risk_level || selectedStudent?.behavior?.risk_level)}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Bảng Thông số chi tiết */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <Activity className="w-4 h-4 text-emerald-500" /> Thống kê Khách quan
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tương tác</p>
                                            <p className="text-base font-black text-slate-800">
                                                {selectedStudent?.total_active_time_s ?? selectedStudent?.behavior?.total_active_time_s ?? 0}s
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Rảnh tay (Idle)</p>
                                            <p className="text-base font-black text-slate-800">
                                                {selectedStudent?.total_idle_time_s ?? selectedStudent?.behavior?.total_idle_time_s ?? 0}s
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tốc độ / Câu</p>
                                            <p className="text-base font-black text-slate-800 whitespace-nowrap">
                                                {((selectedStudent?.avg_answer_speed_ms ?? selectedStudent?.behavior?.avg_answer_speed_ms ?? 0) / 1000).toFixed(1)}s
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Lịch sử Cảnh báo Gần nhất */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-rose-500" /> Cảnh báo hệ thống ghi nhận
                                    </h4>
                                    {studentDetails?.alerts?.length === 0 ? (
                                        <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg italic">Chưa có cảnh báo nào trong hệ thống.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {studentDetails?.alerts?.map((alert: any) => (
                                                <div key={alert.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                                                    <p className="text-xs font-semibold text-slate-800 mb-1">{alert.description}</p>
                                                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap">{alert.ai_analysis}</p>
                                                    <p className="text-[10px] text-slate-400 text-right mt-2">{new Date(alert.created_at).toLocaleString('vi-VN')}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Form gửi thông báo phụ huynh */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <Send className="w-4 h-4 text-violet-500" /> Nhắc nhở Phụ huynh
                                    </h4>
                                    <div className="bg-violet-50/50 p-4 border border-violet-100 rounded-xl space-y-3">
                                        <p className="text-xs text-slate-600">Những nhắc nhở này sẽ được gửi trực tiếp đến ứng dụng của phụ huynh học sinh để cùng phối hợp theo dõi.</p>
                                        <Textarea 
                                            placeholder="Nhập lời nhắc nhở (Ví dụ: Em có dấu hiệu làm bài quá nhanh/chuyển tab nhiều lần khi thi...)"
                                            className="bg-white text-sm"
                                            rows={4}
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t bg-white shrink-0">
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Đóng lại</Button>
                        <Button 
                            className="bg-violet-600 hover:bg-violet-700 text-white" 
                            disabled={sending || customMessage.trim().length === 0}
                            onClick={handleNotifyParent}
                        >
                            {sending ? "Đang gửi..." : "Gửi Phụ huynh"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
