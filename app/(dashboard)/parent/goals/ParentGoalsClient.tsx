"use client";

import { useState, useEffect } from "react";
import { 
    Target, CheckSquare, Plus, Edit, Trash2, User,
    Calendar, TrendingUp, AlertTriangle, Clock
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
    fetchStudentHabits, createHabit, updateHabit, deleteHabit 
} from "@/lib/actions/goals-habits";

interface ParentGoalsClientProps {
    childrenList: any[];
}

export default function ParentGoalsClient({ childrenList }: ParentGoalsClientProps) {
    const [selectedChildId, setSelectedChildId] = useState<string>(childrenList[0]?.id || "");
    const [activeTab, setActiveTab] = useState<"goals" | "habits">("goals");
    const [loading, setLoading] = useState(false);

    // Data
    const [goals, setGoals] = useState<any[]>([]);
    const [habits, setHabits] = useState<any[]>([]);

    // Load data khi đổi child
    useEffect(() => {
        if (!selectedChildId) return;
        const load = async () => {
            setLoading(true);
            const [gRes, hRes] = await Promise.all([
                fetchStudentGoals(selectedChildId),
                fetchStudentHabits(selectedChildId)
            ]);
            if (gRes.data) setGoals(gRes.data);
            if (hRes.data) setHabits(hRes.data);
            setLoading(false);
        };
        load();
    }, [selectedChildId]);

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
        setLoading(true);
        try {
            if (goalModal.mode === "add") {
                const res = await createGoal({
                    studentId: selectedChildId,
                    title: goalForm.title,
                    description: goalForm.description,
                    targetDate: goalForm.targetDate || undefined
                });
                if (res.error) throw new Error(res.error);
                toast.success("Đã tạo mục tiêu.");
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
            const gRes = await fetchStudentGoals(selectedChildId);
            setGoals(gRes.data || []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu này?")) return;
        setLoading(true);
        try {
            const res = await deleteGoal(id);
            if (res.error) throw new Error(res.error);
            toast.success("Đã xóa mục tiêu.");
            setGoals(prev => prev.filter(g => g.id !== id));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ==== HABIT MODAL ====
    const [habitModal, setHabitModal] = useState({ open: false, mode: "add", data: null as any });
    const [habitForm, setHabitForm] = useState({ title: "", description: "", frequency: "daily" as "daily"|"weekly", isActive: true });

    const handleOpenHabit = (mode: "add" | "edit", data: any = null) => {
        setHabitModal({ open: true, mode, data });
        if (mode === "edit" && data) {
            setHabitForm({ 
                title: data.title, 
                description: data.description || "", 
                frequency: data.frequency || "daily", 
                isActive: data.is_active 
            });
        } else {
            setHabitForm({ title: "", description: "", frequency: "daily", isActive: true });
        }
    };

    const handleSaveHabit = async () => {
        if (!habitForm.title.trim()) return toast.error("Vui lòng nhập tên thói quen.");
        setLoading(true);
        try {
            if (habitModal.mode === "add") {
                const res = await createHabit({
                    studentId: selectedChildId,
                    title: habitForm.title,
                    description: habitForm.description,
                    frequency: habitForm.frequency
                });
                if (res.error) throw new Error(res.error);
                toast.success("Đã tạo thói quen.");
            } else {
                const res = await updateHabit(habitModal.data.id, {
                    title: habitForm.title,
                    description: habitForm.description,
                    frequency: habitForm.frequency,
                    isActive: habitForm.isActive
                });
                if (res.error) throw new Error(res.error);
                toast.success("Đã cập nhật thói quen.");
            }
            setHabitModal({ ...habitModal, open: false });
            const hRes = await fetchStudentHabits(selectedChildId);
            setHabits(hRes.data || []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHabit = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa thói quen này? Hành động này sẽ xóa toàn bộ lịch sử check của học sinh.")) return;
        setLoading(true);
        try {
            const res = await deleteHabit(id);
            if (res.error) throw new Error(res.error);
            toast.success("Đã xóa thói quen.");
            setHabits(prev => prev.filter(h => h.id !== id));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Utils
    const getDaysLeft = (targetDate: string) => {
        if (!targetDate) return null;
        const diff = new Date(targetDate).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days;
    };

    if (!childrenList.length) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-800">Chưa có học sinh liên kết</h3>
                <p className="text-slate-500 mt-1">Bạn cần liên kết với học sinh trước khi có thể đặt mục tiêu.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Child Selector */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        Mục tiêu & Thói quen
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Định hướng và theo dõi sự phát triển của con em.</p>
                </div>
                
                {childrenList.length > 1 && (
                    <div className="w-full md:w-64">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Học sinh</label>
                        <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {childrenList.map((child: any) => (
                                    <SelectItem key={child.id} value={child.id}>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            {child.full_name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-max border border-slate-200/60">
                <button
                    onClick={() => setActiveTab("goals")}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                        activeTab === "goals" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                    <Target className="w-4 h-4" />
                    Mục tiêu
                </button>
                <button
                    onClick={() => setActiveTab("habits")}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                        activeTab === "habits" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                    <CheckSquare className="w-4 h-4" />
                    Thói quen
                </button>
            </div>

            {loading && <div className="text-center py-4 text-sm text-slate-500">Đang tải dữ liệu...</div>}

            {/* GOALS TAB */}
            {!loading && activeTab === "goals" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">Danh sách Mục tiêu</h2>
                        <Button onClick={() => handleOpenGoal("add")} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                            <Plus className="w-4 h-4 mr-2" /> Thêm mục tiêu
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
                                        
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur pb-1 pl-1 flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenGoal("edit", g)} className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(g.id)} className="h-8 w-8 text-slate-500 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                            <span>Tạo bởi: {g.created_by_role === "parent" ? "Bạn" : "Học sinh"}</span>
                                            <span>{new Date(g.created_at).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* HABITS TAB */}
            {!loading && activeTab === "habits" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">Danh sách Thói quen</h2>
                        <Button onClick={() => handleOpenHabit("add")} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
                            <Plus className="w-4 h-4 mr-2" /> Thêm thói quen
                        </Button>
                    </div>
                    
                    {habits.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Chưa có thói quen nào. Hãy tạo thói quen để con rèn luyện hàng ngày!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {habits.map((h) => (
                                <div key={h.id} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                                    <div className="flex justify-between pr-10">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                                {h.completedToday ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded" />}
                                                {h.title}
                                            </h3>
                                            {h.description && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{h.description}</p>}
                                        </div>
                                        <div className="text-center absolute top-4 right-4 group-hover:hidden">
                                            <div className="text-lg font-black text-orange-500 flex items-center gap-1 justify-center">
                                                🔥 {h.streak}
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 hidden group-hover:flex bg-white pb-1 pl-1 gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenHabit("edit", h)} className="h-8 w-8 text-slate-500 hover:text-emerald-600">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteHabit(h.id)} className="h-8 w-8 text-slate-500 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="flex justify-between text-xs text-slate-500 font-medium mb-2">
                                            <span>
                                                {h.frequency === "daily" ? "Lịch sử tuần qua:" : "Bốn tuần gần nhất:"}
                                            </span>
                                            <span>Tần suất: <strong className="text-slate-800">{h.frequency === "daily" ? "Hàng ngày" : "Hàng tuần"}</strong></span>
                                        </div>
                                        {/* Activity Tracker */}
                                        <div className="flex gap-2 justify-between">
                                            {h.recentDays?.map((day: any, idx: number) => {
                                                const dt = new Date(day.date);
                                                return (
                                                    <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                                                        <div className={`w-full aspect-square rounded-md ${day.completed ? "bg-emerald-500 shadow-inner shadow-emerald-700/20" : "bg-slate-100"}`} title={day.date} />
                                                        <span className="text-[10px] text-slate-400">
                                                            {h.frequency === "daily" ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dt.getDay()] : `T.${dt.getMonth()+1}`}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Dialogs */}
            {/* GOAL DIALOG */}
            <Dialog open={goalModal.open} onOpenChange={(open) => setGoalModal(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{goalModal.mode === "add" ? "Thêm Mục tiêu mới" : "Chỉnh sửa Mục tiêu"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Tên mục tiêu <span className="text-red-500">*</span></label>
                            <Input placeholder="Vd: Đạt IELTS 6.5" value={goalForm.title} onChange={e => setGoalForm(prev => ({ ...prev, title: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Mô tả chi tiết</label>
                            <Textarea placeholder="Vd: Cần đạt band 6.5 để apply đại học..." value={goalForm.description} onChange={e => setGoalForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
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
                        <Button onClick={handleSaveGoal} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">Lưu lại</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* HABIT DIALOG */}
            <Dialog open={habitModal.open} onOpenChange={(open) => setHabitModal(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{habitModal.mode === "add" ? "Thêm Thói quen mới" : "Chỉnh sửa Thói quen"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Tên thói quen <span className="text-red-500">*</span></label>
                            <Input placeholder="Vd: Đọc sách 30 phút" value={habitForm.title} onChange={e => setHabitForm(prev => ({ ...prev, title: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Mô tả (tùy chọn)</label>
                            <Input placeholder="Vd: Đọc trước khi đi ngủ" value={habitForm.description} onChange={e => setHabitForm(prev => ({ ...prev, description: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Tần suất báo cáo</label>
                            <Select value={habitForm.frequency} onValueChange={(val: any) => setHabitForm(prev => ({ ...prev, frequency: val }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Hàng ngày (Daily)</SelectItem>
                                    <SelectItem value="weekly">Hàng tuần (Weekly)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">Học sinh sẽ cần vào check hoàn thành theo tần suất này.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHabitModal(prev => ({ ...prev, open: false }))}>Hủy</Button>
                        <Button onClick={handleSaveHabit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">Lưu lại</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
