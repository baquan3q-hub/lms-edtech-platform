"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { sendGradeReport } from "@/lib/actions/grade-notifications";
import { Loader2, Mail, Bell } from "lucide-react";

interface GradeReportDialogProps {
    classId: string;
    studentId: string | null; // null means not open, "all" means whole class, specific UUID means one student
    studentName?: string;
    onClose: () => void;
}

export default function GradeReportDialog({ classId, studentId, studentName, onClose }: GradeReportDialogProps) {
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState<"weekly" | "monthly" | "assignment">("weekly");
    const [periodLabel, setPeriodLabel] = useState("");

    const isAll = studentId === "all";

    const handleSend = async () => {
        if (!studentId) return;
        if (!periodLabel.trim()) {
            toast.error("Vui lòng nhập kỳ báo cáo (VD: Tuần 1, Tháng 3, Giữa kỳ...)");
            return;
        }

        setLoading(true);
        const res = await sendGradeReport(classId, studentId, reportType, periodLabel);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            onClose();
        } else {
            toast.error(res.error || "Gửi báo cáo thất bại");
        }
    };

    return (
        <Dialog open={!!studentId} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gửi Báo Cáo Học Tập</DialogTitle>
                    <DialogDescription>
                        Báo cáo sẽ được gửi qua Email và Thông báo trong ứng dụng cho Phụ huynh của:
                        <strong className="text-slate-900 ml-1">{isAll ? "Tất cả học sinh trong lớp" : studentName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-2 gap-2">
                        <Mail className="w-5 h-5 shrink-0" />
                        <p>Dữ liệu chuyên cần và điểm trung bình sẽ được tự động tổng hợp đính kèm trong báo cáo.</p>
                    </div>

                    <div className="grid gap-3 border rounded-lg p-4 bg-slate-50">
                        <div>
                            <Label htmlFor="report-type" className="text-slate-700">Loại báo cáo</Label>
                            <Select value={reportType} onValueChange={(val: any) => setReportType(val)}>
                                <SelectTrigger id="report-type" className="mt-1.5 bg-white">
                                    <SelectValue placeholder="Chọn loại báo cáo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="weekly">Báo cáo Hàng Tuần</SelectItem>
                                    <SelectItem value="monthly">Báo cáo Hàng Tháng</SelectItem>
                                    <SelectItem value="assignment">Báo cáo Bài Kiểm Tra / Assignment</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="period-label" className="text-slate-700">Kỳ báo cáo <span className="text-red-500">*</span></Label>
                            <Input
                                id="period-label"
                                placeholder={reportType === 'weekly' ? "VD: Tuần 1 (1/3 - 7/3)" : reportType === 'monthly' ? "VD: Tháng 3/2024" : "VD: Bài kiểm tra 15 phút"}
                                value={periodLabel}
                                onChange={(e) => setPeriodLabel(e.target.value)}
                                className="mt-1.5 bg-white"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Hủy
                    </Button>
                    <Button onClick={handleSend} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                        Gửi Phụ huynh
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
