"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
    Star, Plus, Minus, Trash2, Search, Trophy, Flame,
    Loader2, ArrowUpDown, History, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    getClassAttendancePoints,
    adjustAttendancePoints,
    deleteAttendancePoint,
} from "@/lib/actions/attendance-points";

interface TeacherPointsTabProps {
    classId: string;
}

const REASON_LABELS: Record<string, string> = {
    present: "Có mặt",
    late: "Đi trễ",
    excused: "Có phép",
    absent: "Vắng mặt",
    streak_3: "🥉 Streak 3",
    streak_5: "🥈 Streak 5",
    streak_10: "🥇 Streak 10",
    bonus: "Thưởng GV",
    penalty: "Trừ GV",
    manual: "Điều chỉnh",
};

export default function TeacherPointsTab({ classId }: TeacherPointsTabProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [adjustDialog, setAdjustDialog] = useState<{
        open: boolean;
        studentId: string;
        studentName: string;
        mode: "add" | "subtract";
    }>({ open: false, studentId: "", studentName: "", mode: "add" });
    const [historyDialog, setHistoryDialog] = useState<{
        open: boolean;
        student: any;
    }>({ open: false, student: null });
    const [adjustPoints, setAdjustPoints] = useState<number>(5);
    const [adjustReason, setAdjustReason] = useState<string>("");
    const [isPending, startTransition] = useTransition();

    const loadData = async () => {
        setLoading(true);
        const res = await getClassAttendancePoints(classId);
        if (res.error) {
            toast.error(res.error);
        } else {
            setData(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [classId]);

    const handleAdjust = () => {
        if (!adjustDialog.studentId || adjustPoints <= 0 || !adjustReason.trim()) {
            toast.error("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        const finalPoints = adjustDialog.mode === "subtract" ? -adjustPoints : adjustPoints;
        const reason = adjustDialog.mode === "subtract" ? `penalty: ${adjustReason}` : `bonus: ${adjustReason}`;

        startTransition(async () => {
            const res = await adjustAttendancePoints({
                studentId: adjustDialog.studentId,
                classId,
                points: finalPoints,
                reason,
            });

            if (res.success) {
                toast.success(
                    adjustDialog.mode === "add"
                        ? `Đã cộng ${adjustPoints} điểm cho ${adjustDialog.studentName}`
                        : `Đã trừ ${adjustPoints} điểm từ ${adjustDialog.studentName}`
                );
                setAdjustDialog({ open: false, studentId: "", studentName: "", mode: "add" });
                setAdjustPoints(5);
                setAdjustReason("");
                loadData();
            } else {
                toast.error(res.error || "Có lỗi xảy ra");
            }
        });
    };

    const handleDeletePoint = (pointId: string) => {
        startTransition(async () => {
            const res = await deleteAttendancePoint(pointId, classId);
            if (res.success) {
                toast.success("Đã xóa bản ghi điểm");
                loadData();
            } else {
                toast.error(res.error || "Có lỗi xảy ra");
            }
        });
    };

    const filteredData = data.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-black text-indigo-600">
                            {data.length}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Học sinh</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-black text-amber-600">
                            {data.reduce((sum, s) => sum + s.totalPoints, 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Tổng điểm lớp</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-black text-emerald-600">
                            {data.length > 0 ? Math.round(data.reduce((sum, s) => sum + s.totalPoints, 0) / data.length) : 0}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">TB điểm/HS</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-black text-purple-600">
                            {data.reduce((sum, s) => sum + s.achievements.length, 0)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Thành tựu</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search + Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm học sinh..."
                        className="pl-9 bg-slate-50 border-transparent focus:bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Student Points Table */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium w-12 text-center">Hạng</th>
                                <th className="px-4 py-3 font-medium">Học sinh</th>
                                <th className="px-4 py-3 font-medium text-center">Tổng điểm</th>
                                <th className="px-4 py-3 font-medium text-center">Thành tựu</th>
                                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((student, index) => (
                                <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 text-center">
                                        {index < 3 ? (
                                            <span className="text-lg">
                                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                                            </span>
                                        ) : (
                                            <span className="text-sm font-bold text-slate-400">#{index + 1}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">
                                                    {student.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-slate-900">{student.name}</p>
                                                <p className="text-xs text-slate-400">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xl font-black ${student.totalPoints >= 50 ? "text-amber-600" :
                                                student.totalPoints >= 20 ? "text-indigo-600" :
                                                    "text-slate-600"
                                            }`}>
                                            {student.totalPoints}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1">
                                            {student.achievements.includes("streak_3") && <span title="Streak 3">🥉</span>}
                                            {student.achievements.includes("streak_5") && <span title="Streak 5">🥈</span>}
                                            {student.achievements.includes("streak_10") && <span title="Streak 10">🥇</span>}
                                            {student.achievements.length === 0 && (
                                                <span className="text-xs text-slate-300">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                                title="Cộng điểm"
                                                onClick={() => setAdjustDialog({
                                                    open: true,
                                                    studentId: student.studentId,
                                                    studentName: student.name,
                                                    mode: "add",
                                                })}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                title="Trừ điểm"
                                                onClick={() => setAdjustDialog({
                                                    open: true,
                                                    studentId: student.studentId,
                                                    studentName: student.name,
                                                    mode: "subtract",
                                                })}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                title="Xem lịch sử"
                                                onClick={() => setHistoryDialog({
                                                    open: true,
                                                    student,
                                                })}
                                            >
                                                <History className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        {data.length === 0
                                            ? "Chưa có dữ liệu điểm chuyên cần. Điểm danh lần đầu để bắt đầu."
                                            : "Không tìm thấy học sinh phù hợp."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dialog: Cộng/Trừ điểm */}
            <Dialog open={adjustDialog.open} onOpenChange={(open) => {
                if (!open) setAdjustDialog({ open: false, studentId: "", studentName: "", mode: "add" });
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {adjustDialog.mode === "add" ? (
                                <><Plus className="w-5 h-5 text-emerald-500" /> Cộng điểm</>
                            ) : (
                                <><Minus className="w-5 h-5 text-red-500" /> Trừ điểm</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-slate-50 rounded-lg border">
                            <p className="text-sm font-medium text-slate-700">
                                Học sinh: <span className="text-slate-900 font-semibold">{adjustDialog.studentName}</span>
                            </p>
                        </div>
                        <div>
                            <Label>Số điểm</Label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={adjustPoints}
                                onChange={(e) => setAdjustPoints(Number(e.target.value))}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Lý do</Label>
                            <Textarea
                                placeholder={adjustDialog.mode === "add"
                                    ? "VD: Tham gia tích cực, trả lời đúng..."
                                    : "VD: Vi phạm nội quy, đi trễ nhiều lần..."}
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                                className="mt-1.5"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Hủy</Button>
                        </DialogClose>
                        <Button
                            onClick={handleAdjust}
                            disabled={isPending || !adjustReason.trim() || adjustPoints <= 0}
                            className={adjustDialog.mode === "add"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-red-600 hover:bg-red-700"
                            }
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : adjustDialog.mode === "add" ? (
                                <Plus className="w-4 h-4 mr-2" />
                            ) : (
                                <Minus className="w-4 h-4 mr-2" />
                            )}
                            {adjustDialog.mode === "add" ? `Cộng ${adjustPoints} điểm` : `Trừ ${adjustPoints} điểm`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Lịch sử điểm */}
            <Dialog open={historyDialog.open} onOpenChange={(open) => {
                if (!open) setHistoryDialog({ open: false, student: null });
            }}>
                <DialogContent className="sm:max-w-lg max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-500" />
                            Lịch sử điểm — {historyDialog.student?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
                        {historyDialog.student?.history?.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Chưa có bản ghi điểm.</p>
                        ) : (
                            (historyDialog.student?.history || []).map((item: any) => {
                                const reasonLabel = REASON_LABELS[item.reason] || item.reason;
                                const isNegative = item.points < 0;
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${isNegative ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700">{reasonLabel}</p>
                                            <p className="text-xs text-slate-400">
                                                {item.date ? new Date(item.date).toLocaleString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                }) : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-lg font-black ${isNegative ? "text-red-600" : "text-emerald-600"}`}>
                                                {isNegative ? "" : "+"}{item.points}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-slate-300 hover:text-red-600 hover:bg-red-50"
                                                title="Xóa bản ghi"
                                                onClick={() => handleDeletePoint(item.id)}
                                                disabled={isPending}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Đóng</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
