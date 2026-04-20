"use client";

import { useState, useEffect } from "react";
import {
    createSurvey, fetchSurveys, fetchSurveyAnalytics,
    toggleSurveyActive, deleteSurvey, updateSurvey,
} from "@/lib/actions/surveys";
import { fetchCoursesAndClasses } from "@/lib/actions/admin-announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Send, Loader2, ClipboardList, Trash2, Plus, X,
    GripVertical, Globe, GraduationCap, BookOpen,
    BarChart3, ChevronDown, Star,
    CheckCircle2, ListChecks, Minus,
    CalendarClock, Power, PowerOff, Type, Edit2, Clock,
    Download, Users
} from "lucide-react";
import * as XLSX from "xlsx";

type ScopeType = "system" | "course" | "class";
type QuestionType = "single_choice" | "multiple_choice" | "text" | "rating";

const SCOPE_META: Record<ScopeType, { label: string; icon: any; color: string }> = {
    system: { label: "Toàn hệ thống", icon: Globe, color: "bg-rose-500" },
    course: { label: "Khóa học", icon: GraduationCap, color: "bg-purple-500" },
    class: { label: "Lớp cụ thể", icon: BookOpen, color: "bg-blue-500" },
};

const QTYPE_META: Record<QuestionType, { label: string; icon: any; color: string }> = {
    single_choice: { label: "Một đáp án", icon: CheckCircle2, color: "text-blue-600" },
    multiple_choice: { label: "Nhiều đáp án", icon: ListChecks, color: "text-purple-600" },
    text: { label: "Văn bản", icon: Type, color: "text-emerald-600" },
    rating: { label: "Đánh giá sao", icon: Star, color: "text-amber-600" },
};

interface DraftQuestion {
    id: string;
    question_text: string;
    question_type: QuestionType;
    options: string[];
    is_required: boolean;
}

export default function AdminSurveysClient() {
    const [surveys, setSurveys] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [scopeFilter, setScopeFilter] = useState("all");

    // Composer
    const [showComposer, setShowComposer] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [scope, setScope] = useState<ScopeType>("system");
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [deadline, setDeadline] = useState("");
    const [questions, setQuestions] = useState<DraftQuestion[]>([]);
    const [sending, setSending] = useState(false);

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState<any>(null);
    const [editForm, setEditForm] = useState({ title: "", description: "", deadline: "" });
    const [editSaving, setEditSaving] = useState(false);

    // Analytics modal
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsTitle, setAnalyticsTitle] = useState("");
    const [analyticsTab, setAnalyticsTab] = useState<"results" | "respondents">("results");

    useEffect(() => { loadData(); }, [scopeFilter]);

    const loadData = async () => {
        setLoading(true);
        const [sResult, refResult] = await Promise.all([
            fetchSurveys({ scope: scopeFilter }),
            fetchCoursesAndClasses(),
        ]);
        if (sResult.data) setSurveys(sResult.data);
        setCourses(refResult.courses);
        setClasses(refResult.classes);
        setLoading(false);
    };

    const filteredClasses = selectedCourseId
        ? classes.filter((c: any) => c.course_id === selectedCourseId)
        : classes;

    // === Question Management ===
    const addQuestion = () => {
        setQuestions(prev => [...prev, {
            id: Math.random().toString(36).slice(2),
            question_text: "",
            question_type: "single_choice",
            options: ["", ""],
            is_required: true,
        }]);
    };

    const updateQuestion = (id: string, field: string, value: any) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const removeQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const addOption = (qId: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, options: [...q.options, ""] } : q));
    };

    const updateOption = (qId: string, idx: number, value: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== qId) return q;
            const opts = [...q.options];
            opts[idx] = value;
            return { ...q, options: opts };
        }));
    };

    const removeOption = (qId: string, idx: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== qId) return q;
            return { ...q, options: q.options.filter((_, i) => i !== idx) };
        }));
    };

    // === Submit ===
    const handleSubmit = async () => {
        if (!title.trim()) { toast.error("Vui lòng nhập tên khảo sát"); return; }
        if (questions.length === 0) { toast.error("Cần ít nhất 1 câu hỏi"); return; }
        if (scope === "course" && !selectedCourseId) { toast.error("Chọn khóa học"); return; }
        if (scope === "class" && !selectedClassId) { toast.error("Chọn lớp"); return; }

        for (const q of questions) {
            if (!q.question_text.trim()) { toast.error("Câu hỏi không được để trống"); return; }
            if (["single_choice", "multiple_choice"].includes(q.question_type)) {
                if (q.options.filter(o => o.trim()).length < 2) {
                    toast.error(`"${q.question_text}" cần ít nhất 2 lựa chọn`);
                    return;
                }
            }
        }

        setSending(true);
        const res = await createSurvey({
            title: title.trim(),
            description: description.trim() || undefined,
            scope,
            courseId: selectedCourseId || undefined,
            classId: selectedClassId || undefined,
            deadline: deadline || undefined,
            questions: questions.map((q, idx) => ({
                question_text: q.question_text.trim(),
                question_type: q.question_type,
                options: ["single_choice", "multiple_choice"].includes(q.question_type)
                    ? q.options.filter(o => o.trim())
                    : undefined,
                is_required: q.is_required,
                sort_order: idx,
            })),
        });

        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã tạo khảo sát thành công!");
            setTitle(""); setDescription(""); setScope("system");
            setSelectedCourseId(""); setSelectedClassId("");
            setDeadline(""); setQuestions([]); setShowComposer(false);
            loadData();
        }
        setSending(false);
    };

    const handleEditClick = (s: any) => {
        setEditingSurvey(s);
        setEditForm({
            title: s.title || "",
            description: s.description || "",
            deadline: s.deadline ? new Date(s.deadline).toISOString().slice(0, 16) : "",
        });
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingSurvey) return;
        setEditSaving(true);
        const res = await updateSurvey(editingSurvey.id, {
            title: editForm.title,
            description: editForm.description,
            deadline: editForm.deadline || undefined,
        });
        setEditSaving(false);

        if (res.error) {
            toast.error("Sửa thất bại: " + res.error);
        } else {
            toast.success("Sửa khảo sát thành công!");
            setEditOpen(false);
            loadData();
        }
    };

    const openAnalytics = async (survey: any) => {
        setAnalyticsOpen(true);
        setAnalyticsTitle(survey.title);
        setAnalyticsLoading(true);
        setAnalyticsTab("results");
        const res = await fetchSurveyAnalytics(survey.id);
        setAnalyticsData(res.data || null);
        setAnalyticsLoading(false);
    };

    // === Export Excel ===
    const handleExportSurvey = () => {
        if (!analyticsData) return;

        const wb = XLSX.utils.book_new();

        // Sheet 1: Kết quả thống kê
        const resultRows: any[] = [];
        analyticsData.questions?.forEach((q: any, idx: number) => {
            if (q.question_type === "single_choice" || q.question_type === "multiple_choice") {
                Object.entries(q.option_counts || {}).forEach(([opt, count]) => {
                    const pct = q.total_responses > 0 ? Math.round(((count as number) / q.total_responses) * 100) : 0;
                    resultRows.push({
                        "Câu hỏi": q.question_text,
                        "Loại": q.question_type === "single_choice" ? "Một đáp án" : "Nhiều đáp án",
                        "Lựa chọn": opt,
                        "Số lượng": count as number,
                        "Tỷ lệ (%)": pct,
                    });
                });
            } else if (q.question_type === "rating") {
                resultRows.push({
                    "Câu hỏi": q.question_text,
                    "Loại": "Đánh giá sao",
                    "Lựa chọn": `Trung bình: ${q.average_rating}/5`,
                    "Số lượng": q.total_responses,
                    "Tỷ lệ (%)": "",
                });
            } else if (q.question_type === "text") {
                (q.text_answers || []).forEach((text: string) => {
                    resultRows.push({
                        "Câu hỏi": q.question_text,
                        "Loại": "Văn bản",
                        "Lựa chọn": text,
                        "Số lượng": "",
                        "Tỷ lệ (%)": "",
                    });
                });
            }
        });

        const ws1 = XLSX.utils.json_to_sheet(resultRows.length > 0 ? resultRows : [{ "Thông báo": "Chưa có dữ liệu" }]);
        XLSX.utils.book_append_sheet(wb, ws1, "Kết quả");

        // Sheet 2: Danh sách người tham gia
        const roleLabel: Record<string, string> = {
            parent: "Phụ huynh", student: "Học sinh",
            teacher: "Giáo viên", admin: "Admin"
        };
        const respondentRows = (analyticsData.respondents || []).map((r: any, idx: number) => ({
            "STT": idx + 1,
            "Họ và tên": r.full_name,
            "Email": r.email,
            "Vai trò": roleLabel[r.role] || r.role,
            "Thời gian nộp": r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN") : "",
        }));

        const ws2 = XLSX.utils.json_to_sheet(respondentRows.length > 0 ? respondentRows : [{ "Thông báo": "Chưa có ai tham gia" }]);
        XLSX.utils.book_append_sheet(wb, ws2, "Người tham gia");

        const safeName = analyticsTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, "").trim().substring(0, 50);
        XLSX.writeFile(wb, `Khao_sat_${safeName || "export"}.xlsx`);
        toast.success("Đã xuất file Excel thành công!");
    };

    const handleToggle = async (survey: any) => {
        const res = await toggleSurveyActive(survey.id, !survey.is_active);
        if (res.error) toast.error(res.error);
        else { toast.success(survey.is_active ? "Đã đóng khảo sát" : "Đã mở lại khảo sát"); loadData(); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa khảo sát này? Tất cả câu trả lời sẽ bị mất.")) return;
        const res = await deleteSurvey(id);
        if (res.error) toast.error(res.error);
        else { toast.success("Đã xóa"); loadData(); }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        Quản lý Khảo sát
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Tạo khảo sát, theo dõi kết quả và phân tích phản hồi</p>
                </div>
                <Button onClick={() => { setShowComposer(!showComposer); if (!showComposer && questions.length === 0) addQuestion(); }}
                    className={showComposer ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"}>
                    {showComposer ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    {showComposer ? "Đóng" : "Tạo khảo sát mới"}
                </Button>
            </div>

            {showComposer && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3 border-b border-indigo-100">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-indigo-500" /> Tạo khảo sát mới
                        </h3>
                    </div>

                    <div className="p-5 space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Phạm vi *</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(Object.entries(SCOPE_META) as [ScopeType, any][]).map(([key, meta]) => {
                                    const Icon = meta.icon;
                                    return (
                                        <button key={key} onClick={() => { setScope(key); setSelectedCourseId(""); setSelectedClassId(""); }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                scope === key ? "border-indigo-400 bg-indigo-50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                                            }`}>
                                            <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-800">{meta.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {scope === "course" && (
                            <div className="relative">
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Khóa học *</label>
                                <select className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm"
                                    value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                                    <option value="">— Chọn khóa —</option>
                                    {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 bottom-3 pointer-events-none" />
                            </div>
                        )}
                        {scope === "class" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Khóa (lọc)</label>
                                    <select className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm"
                                        value={selectedCourseId} onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedClassId(""); }}>
                                        <option value="">— Tất cả —</option>
                                        {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 bottom-3 pointer-events-none" />
                                </div>
                                <div className="relative">
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Lớp *</label>
                                    <select className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm"
                                        value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                                        <option value="">— Chọn lớp —</option>
                                        {filteredClasses.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name} {c.course ? `(${(c.course as any).name})` : ""}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 bottom-3 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tên khảo sát *</label>
                            <Input placeholder="VD: Khảo sát mức độ hài lòng..." value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Mô tả</label>
                            <Textarea placeholder="Mô tả ngắn gọn về khảo sát..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Hạn trả lời</label>
                            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="max-w-xs" />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Câu hỏi ({questions.length})</label>
                                <Button variant="outline" size="sm" onClick={addQuestion} className="text-xs h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm câu hỏi
                                </Button>
                            </div>

                            {questions.map((q, qIdx) => {
                                return (
                                    <div key={q.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                                            <span className="text-xs font-black text-slate-400 shrink-0">#{qIdx + 1}</span>
                                            <Input placeholder="Nội dung câu hỏi..."
                                                value={q.question_text} onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)}
                                                className="flex-1 font-medium"
                                            />
                                            <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)}
                                                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {(Object.entries(QTYPE_META) as [QuestionType, any][]).map(([key, meta]) => {
                                                const Icon = meta.icon;
                                                return (
                                                    <button key={key} onClick={() => updateQuestion(q.id, "question_type", key)}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                            q.question_type === key
                                                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                                                : "border-slate-200 text-slate-500 hover:bg-slate-100"
                                                        }`}>
                                                        <Icon className={`w-3.5 h-3.5 ${q.question_type === key ? meta.color : ""}`} />
                                                        {meta.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {["single_choice", "multiple_choice"].includes(q.question_type) && (
                                            <div className="space-y-2 pl-6">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-${q.question_type === "single_choice" ? "full" : "sm"} border-2 border-slate-300 shrink-0`} />
                                                        <Input placeholder={`Lựa chọn ${optIdx + 1}`}
                                                            value={opt} onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                                                            className="flex-1 h-8 text-sm" />
                                                        {q.options.length > 2 && (
                                                            <Button variant="ghost" size="sm" onClick={() => removeOption(q.id, optIdx)}
                                                                className="h-7 w-7 p-0 text-red-300 hover:text-red-500">
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button variant="ghost" size="sm" onClick={() => addOption(q.id)}
                                                    className="text-xs text-indigo-500 hover:text-indigo-700 h-7">
                                                    <Plus className="w-3 h-3 mr-1" /> Thêm lựa chọn
                                                </Button>
                                            </div>
                                        )}

                                        {q.question_type === "rating" && (
                                            <div className="flex items-center gap-1 pl-6">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className="w-6 h-6 text-amber-300" fill="currentColor" />
                                                ))}
                                                <span className="text-xs text-slate-400 ml-2">Thang 1-5 sao</span>
                                            </div>
                                        )}

                                        {q.question_type === "text" && (
                                            <div className="pl-6">
                                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-400 italic">
                                                    Người trả lời sẽ nhập dạng văn bản tự do...
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 pl-6">
                                            <Switch checked={q.is_required} onCheckedChange={(v) => updateQuestion(q.id, "is_required", v)} id={`req-${q.id}`} />
                                            <label htmlFor={`req-${q.id}`} className="text-xs text-slate-500 cursor-pointer">Bắt buộc</label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSubmit} disabled={sending || !title.trim() || questions.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Tạo khảo sát
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                {[
                    { key: "all", label: "Tất cả", icon: ClipboardList },
                    { key: "system", label: "Toàn hệ thống", icon: Globe },
                    { key: "course", label: "Theo khóa", icon: GraduationCap },
                    { key: "class", label: "Theo lớp", icon: BookOpen },
                ].map((f) => {
                    const Icon = f.icon;
                    return (
                        <button key={f.key} onClick={() => setScopeFilter(f.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                scopeFilter === f.key
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}>
                            <Icon className="w-4 h-4" /> {f.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                </div>
            ) : surveys.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có khảo sát nào</h3>
                    <p className="text-sm text-slate-400">Tạo khảo sát đầu tiên bằng nút phía trên.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-700">{surveys.length} khảo sát</h3>

                    {surveys.map((s: any) => {
                        const scopeMeta = SCOPE_META[s.scope as ScopeType] || SCOPE_META.system;
                        const ScopeIcon = scopeMeta.icon;
                        const isExpired = s.deadline && new Date(s.deadline) < new Date();

                        return (
                            <div key={s.id} className={`border rounded-xl p-4 bg-white group transition-all hover:shadow-sm ${
                                !s.is_active ? "opacity-60 border-slate-200" : "border-slate-200"
                            }`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-lg ${scopeMeta.color} flex items-center justify-center shrink-0`}>
                                        <ScopeIcon className="w-4 h-4 text-white" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h4 className="font-bold text-slate-900 text-sm">{s.title}</h4>
                                            {!s.is_active && (
                                                <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px]" variant="outline">
                                                    <PowerOff className="w-2.5 h-2.5 mr-0.5" /> Đã đóng
                                                </Badge>
                                            )}
                                            {isExpired && s.is_active && (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px]" variant="outline">
                                                    <CalendarClock className="w-2.5 h-2.5 mr-0.5" /> Hết hạn
                                                </Badge>
                                            )}
                                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px]" variant="outline">
                                                {scopeMeta.label}
                                            </Badge>
                                        </div>

                                        {s.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{s.description}</p>}

                                        <div className="flex items-center gap-4 mt-2 text-[10px]">
                                            <button onClick={() => openAnalytics(s)}
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold">
                                                <BarChart3 className="w-3 h-3" /> {s.response_count} phản hồi
                                            </button>
                                            {s.deadline && (
                                                <span className="text-slate-400 flex items-center gap-1">
                                                    <CalendarClock className="w-3 h-3" />
                                                    Hạn: {new Date(s.deadline).toLocaleDateString("vi-VN")}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(s)}
                                            className="h-8 w-8 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-50" title="Sửa khảo sát">
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleToggle(s)}
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600" title={s.is_active ? "Đóng" : "Mở"}>
                                            {s.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}
                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" /> Kết quả khảo sát
                        </DialogTitle>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-slate-500 truncate">{analyticsTitle}</p>
                            {analyticsData && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExportSurvey()}
                                    className="text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50 shrink-0 ml-2"
                                >
                                    <Download className="w-3 h-3 mr-1" /> Xuất Excel
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    {/* Analytics Tabs */}
                    {!analyticsLoading && analyticsData && (
                        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg mb-2">
                            <button
                                onClick={() => setAnalyticsTab("results")}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    analyticsTab === "results"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                <BarChart3 className="w-3 h-3" /> Kết quả thống kê
                            </button>
                            <button
                                onClick={() => setAnalyticsTab("respondents")}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    analyticsTab === "respondents"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                <Users className="w-3 h-3" /> Người tham gia ({analyticsData.total_respondents})
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto min-h-0 max-h-[500px] space-y-4 py-2">
                        {analyticsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            </div>
                        ) : !analyticsData ? (
                            <p className="text-center text-slate-400 py-12">Không có dữ liệu</p>
                        ) : analyticsTab === "results" ? (
                            <>
                                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-center">
                                    <p className="text-3xl font-black text-indigo-600">{analyticsData.total_respondents}</p>
                                    <p className="text-xs text-indigo-400 font-semibold">Người đã trả lời</p>
                                </div>

                                {analyticsData.questions?.map((q: any, idx: number) => (
                                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xs font-black text-indigo-400">#{idx + 1}</span>
                                            <h4 className="text-sm font-bold text-slate-900">{q.question_text}</h4>
                                            <Badge className="bg-slate-100 text-slate-500 border-none text-[9px] ml-auto">
                                                {q.total_responses} trả lời
                                            </Badge>
                                        </div>

                                        {(q.question_type === "single_choice" || q.question_type === "multiple_choice") && q.option_counts && (
                                            <div className="space-y-2">
                                                {Object.entries(q.option_counts).map(([opt, count]) => {
                                                    const pct = q.total_responses > 0 ? Math.round(((count as number) / q.total_responses) * 100) : 0;
                                                    return (
                                                        <div key={opt} className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-600 min-w-[100px] truncate">{opt}</span>
                                                            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                                                <div className="bg-gradient-to-r from-indigo-400 to-violet-500 h-full rounded-full transition-all flex items-center justify-end pr-2"
                                                                    style={{ width: `${Math.max(pct, 5)}%` }}>
                                                                    <span className="text-[9px] font-bold text-white">{pct}%</span>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-500 min-w-[30px] text-right">{count as number}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {q.question_type === "rating" && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <Star key={s} className={`w-5 h-5 ${s <= Math.round(q.average_rating) ? "text-amber-400" : "text-slate-200"}`}
                                                                fill={s <= Math.round(q.average_rating) ? "currentColor" : "none"} />
                                                        ))}
                                                    </div>
                                                    <span className="text-lg font-black text-amber-600">{q.average_rating}</span>
                                                    <span className="text-xs text-slate-400">/ 5.0</span>
                                                </div>
                                                {q.rating_distribution && Object.entries(q.rating_distribution).reverse().map(([star, count]) => (
                                                    <div key={star} className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500 min-w-[40px]">{star} ⭐</span>
                                                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                                            <div className="bg-gradient-to-r from-amber-300 to-amber-500 h-full rounded-full"
                                                                style={{ width: `${q.total_responses > 0 ? Math.max(((count as number) / q.total_responses) * 100, 3) : 0}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-500 min-w-[20px] text-right">{count as number}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Text Results */}
                                        {q.question_type === "text" && q.text_answers && (
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                {q.text_answers.length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic">Chưa có câu trả lời</p>
                                                ) : q.text_answers.map((text: string, tIdx: number) => (
                                                    <div key={tIdx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                        <p className="text-xs text-slate-700">&quot;{text}&quot;</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        ) : (
                            /* Tab: Người tham gia */
                            <>
                                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 text-center">
                                    <p className="text-3xl font-black text-violet-600">{analyticsData.total_respondents}</p>
                                    <p className="text-xs text-violet-400 font-semibold">Người đã tham gia</p>
                                </div>

                                {analyticsData.respondents?.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                        <p className="text-sm">Chưa có ai tham gia khảo sát này.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">#</th>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Họ và tên</th>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Email</th>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Vai trò</th>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs">Thời gian nộp</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analyticsData.respondents?.map((r: any, idx: number) => {
                                                    const roleLabel: Record<string, string> = {
                                                        parent: "Phụ huynh",
                                                        student: "Học sinh",
                                                        teacher: "Giáo viên",
                                                        admin: "Admin",
                                                    };
                                                    return (
                                                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                                            <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                                                            <td className="px-4 py-2.5 font-medium text-slate-800">{r.full_name}</td>
                                                            <td className="px-4 py-2.5 text-slate-500 text-xs">{r.email}</td>
                                                            <td className="px-4 py-2.5">
                                                                <Badge variant="outline" className={`text-[10px] ${
                                                                    r.role === "parent" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                    r.role === "student" ? "bg-blue-50 text-blue-600 border-blue-200" :
                                                                    r.role === "teacher" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                                    "bg-red-50 text-red-600 border-red-200"
                                                                }`}>
                                                                    {roleLabel[r.role] || r.role}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-slate-400 text-xs">
                                                                {r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN", {
                                                                    day: "2-digit", month: "2-digit", year: "numeric",
                                                                    hour: "2-digit", minute: "2-digit"
                                                                }) : "—"}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sửa thông tin khảo sát</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Tiêu đề</label>
                            <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Tên khảo sát..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Mô tả (tùy chọn)</label>
                            <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Ghi chú thêm..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Hạn chót nộp
                            </label>
                            <Input
                                type="datetime-local"
                                value={editForm.deadline}
                                onChange={(e) => setEditForm(prev => ({ ...prev, deadline: e.target.value }))}
                            />
                        </div>
                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
                            <Button onClick={handleUpdate} disabled={editSaving || !editForm.title.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {editSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
