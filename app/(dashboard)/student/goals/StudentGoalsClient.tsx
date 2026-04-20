"use client";

import { useState, useEffect } from "react";
import { 
    Target, CheckSquare, Plus, Edit, Trash2, Calendar, 
    Zap, Rocket, Check, AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { 
    fetchStudentGoals, createGoal, updateGoal, deleteGoal,
    fetchStudentHabits, toggleHabitLog
} from "@/lib/actions/goals-habits";

interface StudentGoalsClientProps {
    studentId: string;
}

export default function StudentGoalsClient({ studentId }: StudentGoalsClientProps) {
    const [activeTab, setActiveTab] = useState<"goals" | "habits">("habits");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Data
    const [goals, setGoals] = useState<any[]>([]);
    const [habits, setHabits] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [gRes, hRes] = await Promise.all([
            fetchStudentGoals(studentId),
            fetchStudentHabits(studentId)
        ]);
        if (gRes.data) setGoals(gRes.data);
        if (hRes.data) setHabits(hRes.data);
        setLoading(false);
    };

    // ==== GOAL MODAL ====
    const [goalModal, setGoalModal] = useState({ open: false, mode: "add", data: null as any });
    const [goalForm, setGoalForm] = useState({ title: "", description: "", targetDate: "", status: "in_progress" });

    const handleOpenGoal = (mode: "add" | "edit", data: any = null) => {
        setGoalModal({ open: true, mode, data });
        if (mode === "edit" && data) {
            setGoalForm({ 
                title: data.title, 
                description: data.description || "", 
                targetDate: data.target_date || "", 
                status: data.status 
            });
        } else {
            setGoalForm({ title: "", description: "", targetDate: "", status: "in_progress" });
        }
    };

    const handleSaveGoal = async () => {
        if (!goalForm.title.trim()) return toast.error("Vui lòng nhập tên mục tiêu.");
        setActionLoading(true);
        try {
            if (goalModal.mode === "add") {
                const res = await createGoal({
                    studentId,
                    title: goalForm.title,
                    description: goalForm.description,
                    targetDate: goalForm.targetDate || undefined
                });
                if (res.error) throw new Error(res.error);
                toast.success("Đã tạo mục tiêu cá nhân.");
            } else {
                const res = await updateGoal(goalModal.data.id, {
                    title: goalForm.title,
                    description: goalForm.description,
                    targetDate: goalForm.targetDate || null,
                    status: goalForm.status
                });
                if (res.error) throw new Error(res.error);
                toast.success("Đã cập nhật mục tiêu.");
            }
            setGoalModal({ ...goalModal, open: false });
            const gRes = await fetchStudentGoals(studentId);
            setGoals(gRes.data || []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu này?")) return;
        setActionLoading(true);
        try {
            const res = await deleteGoal(id);
            if (res.error) throw new Error(res.error);
            toast.success("Đã xóa mục tiêu.");
            setGoals(prev => prev.filter(g => g.id !== id));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // ==== TOGGLE HABIT ====
    const handleToggleHabit = async (habitId: string, currentStatus: boolean) => {
        // Optimistic UI update
        setHabits(prev => prev.map(h => {
            if (h.id === habitId) {
                return { ...h, completedToday: !currentStatus };
            }
            return h;
        }));

        const res = await toggleHabitLog(habitId);
        if (res.error) {
            toast.error(res.error);
            // Revert on error
            setHabits(prev => prev.map(h => {
                if (h.id === habitId) {
                    return { ...h, completedToday: currentStatus };
                }
                return h;
            }));
        } else {
            // Check full completion
            const hRes = await fetchStudentHabits(studentId);
            setHabits(hRes.data || []);
            if (!currentStatus) {
                toast.success("Tuyệt vời! Bạn đã hoàn thành 1 thói quen hôm nay.", {
                    icon: "🎉"
                });
            }
        }
    };

    // Utils
    const getDaysLeft = (targetDate: string) => {
        if (!targetDate) return null;
        const diff = new Date(targetDate).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days;
    };

    const countCompletedToday = habits.filter(h => h.completedToday).length;
    const progressPercent = habits.length ? Math.round((countCompletedToday / habits.length) * 100) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center">
                        <Rocket className="w-5 h-5 text-white" />
                    </div>
                    Mục tiêu & Thói quen
                </h1>
                <p className="text-slate-500 mt-1 font-medium">Theo dõi và hoàn thành các mục tiêu rèn luyện hàng ngày của bạn.</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-max border border-slate-200/60">
                <button
                    onClick={() => setActiveTab("habits")}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                        activeTab === "habits" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                    <CheckSquare className="w-4 h-4" />
                    Thói quen (To-Do)
                </button>
                <button
                    onClick={() => setActiveTab("goals")}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                        activeTab === "goals" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                    <Target className="w-4 h-4" />
                    Mục tiêu dài hạn
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-sm text-slate-500">Đang tải biểu đồ tiến độ...</div>
            ) : (
                <>
                    {/* HABITS TAB */}
                    {activeTab === "habits" && (
                        <div className="space-y-6">
                            {/* Progress bar */}
                            {habits.length > 0 && (
                                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-6">
                                    <div className="w-16 h-16 shrink-0 rounded-full flex items-center justify-center relative">
                                        <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full transform -rotate-90">
                                            {/* Track bg */}
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-emerald-100" />
                                            {/* Progress stroke */}
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-emerald-500" strokeDasharray="176" strokeDashoffset={176 - (176 * progressPercent) / 100} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                                        </svg>
                                        <span className="text-sm font-bold text-slate-800">{progressPercent}%</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-800">Tiến độ hôm nay</h3>
                                        <p className="text-sm text-slate-500">Đã hoàn thành {countCompletedToday} / {habits.length} thói quen.</p>
                                        {progressPercent === 100 && (
                                            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> Chúc mừng! Bạn đã hoàn thành xuất sắc ngày hôm nay!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {habits.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                                    <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Bạn chưa được giao thói quen nào.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {habits.map((h) => (
                                        <div 
                                            key={h.id} 
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                                                h.completedToday 
                                                    ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" 
                                                    : "bg-white border-slate-200 hover:border-emerald-300 shadow-sm"
                                            }`}
                                            onClick={() => handleToggleHabit(h.id, h.completedToday)}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                                    h.completedToday ? "bg-emerald-500 text-white shadow-md shadow-emerald-200" : "bg-slate-100 text-slate-300 group-hover:bg-slate-200"
                                                }`}>
                                                    <Check className={`w-5 h-5 ${h.completedToday ? "opacity-100" : "opacity-0"}`} />
                                                </div>
                                                <div>
                                                    <h3 className={`font-bold text-lg transition-colors ${h.completedToday ? "text-emerald-800 line-through decoration-emerald-300/50" : "text-slate-800"}`}>
                                                        {h.title}
                                                    </h3>
                                                    {h.description && (
                                                        <p className={`text-sm ${h.completedToday ? "text-emerald-600/70" : "text-slate-500"}`}>
                                                            {h.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="shrink-0 flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-sm font-black flex items-center justify-end gap-1 text-orange-500">
                                                        🔥 {h.streak}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                                                        Streak
                                                    </div>
                                                </div>
                                                <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>
                                                <Badge variant="outline" className={`hidden sm:inline-flex text-[10px] ${h.frequency === "weekly" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                                    {h.frequency === "daily" ? "Hàng ngày" : "Hàng tuần"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* GOALS TAB */}
                    {activeTab === "goals" && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800">Mục tiêu của bạn</h2>
                                <Button onClick={() => handleOpenGoal("add")} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                                    <Plus className="w-4 h-4 mr-2" /> Tạo mục tiêu
                                </Button>
                            </div>

                            {goals.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                                    <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Chưa có mục tiêu nào được đặt ra.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {goals.map((g) => {
                                        const daysLeft = getDaysLeft(g.target_date);
                                        const isParentCreated = g.created_by_role === "parent";
                                        
                                        return (
                                            <div key={g.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                                            {g.status === "completed" && <CheckSquare className="w-5 h-5 text-emerald-500 inline" />}
                                                            {g.title}
                                                        </h3>
                                                        {g.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{g.description}</p>}
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            <Badge variant="outline" className={`text-xs ${
                                                                g.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                                : g.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200" 
                                                                : "bg-slate-100 text-slate-600"
                                                            }`}>
                                                                {g.status === "completed" ? "Đã đạt được" : g.status === "in_progress" ? "Đang tiến hành" : "Đã hủy"}
                                                            </Badge>
                                                            {g.target_date && (
                                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                                                                    <Calendar className="w-3 h-3 justify-center mr-1" />
                                                                    {new Date(g.target_date).toLocaleDateString("vi-VN")}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Countdown if in progress */}
                                                    {g.status === "in_progress" && daysLeft !== null && (
                                                        <div className="shrink-0 text-center bg-indigo-50 border border-indigo-100 rounded-xl p-2 min-w-[70px]">
                                                            <div className={`text-xl font-black ${daysLeft < 0 ? "text-red-500" : "text-indigo-600"}`}>
                                                                {Math.abs(daysLeft)}
                                                            </div>
                                                            <div className="text-[10px] font-medium text-indigo-700 uppercase tracking-wider">
                                                                {daysLeft < 0 ? "Ngày trễ" : "Ngày tới"}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Only allow edit/delete if created by student */}
                                                {!isParentCreated && (
                                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur pb-1 pl-1 flex gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenGoal("edit", g)} className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(g.id)} className="h-8 w-8 text-slate-500 hover:text-red-600">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                                
                                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                                                    {isParentCreated ? (
                                                        <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Tạo bởi: Phụ huynh (Đã khóa)</span>
                                                    ) : (
                                                        <span className="text-slate-400">Tạo bởi: Bạn</span>
                                                    )}
                                                    <span className="text-slate-400">{new Date(g.created_at).toLocaleDateString("vi-VN")}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* GOAL DIALOG (For student created goals) */}
            <Dialog open={goalModal.open} onOpenChange={(open) => setGoalModal(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{goalModal.mode === "add" ? "Tạo Mục tiêu mới" : "Chỉnh sửa Mục tiêu"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Tên mục tiêu <span className="text-red-500">*</span></label>
                            <Input placeholder="Vd: Tự học 30 từ vựng mỗi ngày" value={goalForm.title} onChange={e => setGoalForm(prev => ({ ...prev, title: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Mô tả chi tiết</label>
                            <Textarea placeholder="Vd: Ghi chú cách thực hiện..." value={goalForm.description} onChange={e => setGoalForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Ngày đạt mục tiêu (Deadline)</label>
                            <Input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(prev => ({ ...prev, targetDate: e.target.value }))} />
                        </div>
                        {goalModal.mode === "edit" && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Trạng thái</label>
                                <Select value={goalForm.status} onValueChange={val => setGoalForm(prev => ({ ...prev, status: val }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_progress">Đang tiến hành</SelectItem>
                                        <SelectItem value="completed">Đã đạt được (Hoàn thành)</SelectItem>
                                        <SelectItem value="cancelled">Đã hủy bỏ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGoalModal(prev => ({ ...prev, open: false }))}>Hủy</Button>
                        <Button onClick={handleSaveGoal} disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700">Lưu lại</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
