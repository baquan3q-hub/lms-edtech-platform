"use client";

import { useState, useMemo, useCallback } from "react";
import {
    FileBarChart, CalendarDays, BookOpen, Users, ChevronDown,
    CheckCircle2, Send, Clock, Loader2, MessageSquare, AlertCircle,
    ThumbsUp, AlertTriangle, Star, CalendarRange, FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    createStudentReview, createBulkReviews, fetchReviewsByClass,
    generatePeriodicSummary
} from "@/lib/actions/student-reviews";
import { POSITIVE_TAGS, IMPROVEMENT_TAGS } from "@/lib/constants/review-tags";

type ReviewType = "session" | "weekly" | "monthly" | "quarterly" | "course_end";

const REVIEW_TYPE_LABELS: Record<ReviewType, { label: string; icon: any; color: string }> = {
    session: { label: "Nhận xét Buổi học", icon: CalendarDays, color: "text-blue-600" },
    weekly: { label: "Nhận xét Tuần", icon: CalendarRange, color: "text-emerald-600" },
    monthly: { label: "Nhận xét Tháng", icon: CalendarDays, color: "text-purple-600" },
    quarterly: { label: "Nhận xét Quý", icon: Star, color: "text-amber-600" },
    course_end: { label: "Báo cáo Hết khóa", icon: FileText, color: "text-rose-600" },
};

interface TeacherReportsClientProps {
    data: any;
    error?: string | null;
}

export default function TeacherReportsClient({ data, error }: TeacherReportsClientProps) {
    const [activeTab, setActiveTab] = useState<ReviewType>("session");
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [reviewDate, setReviewDate] = useState(new Date().toISOString().split("T")[0]);
    const [weekStart, setWeekStart] = useState("");
    const [periodLabel, setPeriodLabel] = useState("");

    // Per-student review data
    const [studentReviews, setStudentReviews] = useState<Record<string, {
        positiveTags: string[];
        improvementTags: string[];
        comment: string;
        scoreData?: any;
    }>>({});

    const [isSaving, setIsSaving] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState<string | null>(null);

    if (!data || error) {
        return (
            <div className="text-center py-20">
                <FileBarChart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Không tải được dữ liệu</h3>
                <p className="text-sm text-slate-500">{error || "Vui lòng thử lại sau."}</p>
            </div>
        );
    }

    const classes = data.classes || [];
    const students = selectedClassId ? (data.students[selectedClassId] || []) : [];
    const sessions = selectedClassId ? (data.sessions[selectedClassId] || []) : [];

    // Initialize student reviews when class changes
    const handleClassChange = (classId: string) => {
        setSelectedClassId(classId);
        setSelectedSessionId("");
        setStudentReviews({});
        setHistory([]);
        setShowHistory(false);
    };

    // Toggle tag for a student
    const toggleTag = (studentId: string, tag: string, type: "positive" | "improvement") => {
        setStudentReviews(prev => {
            const current = prev[studentId] || { positiveTags: [], improvementTags: [], comment: "" };
            const field = type === "positive" ? "positiveTags" : "improvementTags";
            const tags = current[field].includes(tag)
                ? current[field].filter(t => t !== tag)
                : [...current[field], tag];
            return { ...prev, [studentId]: { ...current, [field]: tags } };
        });
    };

    // Set comment for a student
    const setComment = (studentId: string, comment: string) => {
        setStudentReviews(prev => {
            const current = prev[studentId] || { positiveTags: [], improvementTags: [], comment: "" };
            return { ...prev, [studentId]: { ...current, comment } };
        });
    };

    // Apply same tags to all students
    const applyToAll = (tag: string, type: "positive" | "improvement") => {
        const updates: typeof studentReviews = {};
        students.forEach((s: any) => {
            const current = studentReviews[s.id] || { positiveTags: [], improvementTags: [], comment: "" };
            const field = type === "positive" ? "positiveTags" : "improvementTags";
            if (!current[field].includes(tag)) {
                updates[s.id] = { ...current, [field]: [...current[field], tag] };
            }
        });
        setStudentReviews(prev => ({ ...prev, ...updates }));
        toast.success(`Đã áp dụng "${tag}" cho ${Object.keys(updates).length} HS`);
    };

    // Load history
    const loadHistory = async () => {
        if (!selectedClassId) return;
        setLoadingHistory(true);
        try {
            const { data: reviews } = await fetchReviewsByClass(selectedClassId, activeTab);
            setHistory(reviews || []);
            setShowHistory(true);
        } catch (e) {
            toast.error("Không tải được lịch sử");
        } finally {
            setLoadingHistory(false);
        }
    };

    // Load periodic summary for a student
    const loadPeriodicSummary = async (studentId: string) => {
        if (!selectedClassId || !reviewDate) return;
        setLoadingSummary(studentId);
        try {
            const { data: summary } = await generatePeriodicSummary(selectedClassId, studentId, reviewDate, reviewDate);
            if (summary) {
                setStudentReviews(prev => ({
                    ...prev,
                    [studentId]: {
                        ...prev[studentId] || { positiveTags: [], improvementTags: [], comment: "" },
                        scoreData: summary,
                    }
                }));
                toast.success("Đã tải dữ liệu tổng hợp");
            }
        } catch (e) {
            toast.error("Lỗi tải dữ liệu");
        } finally {
            setLoadingSummary(null);
        }
    };

    // Submit all reviews
    const handleSubmit = async (autoSend: boolean) => {
        if (!selectedClassId) {
            toast.error("Vui lòng chọn lớp.");
            return;
        }

        const reviewEntries = Object.entries(studentReviews).filter(([_, r]) =>
            r.positiveTags.length > 0 || r.improvementTags.length > 0 || r.comment.trim()
        );

        if (reviewEntries.length === 0) {
            toast.error("Chưa có nhận xét nào. Hãy tick checkbox hoặc nhập comment.");
            return;
        }

        setIsSaving(true);
        try {
            const result = await createBulkReviews({
                classId: selectedClassId,
                reviewType: activeTab,
                reviewDate,
                weekStart: weekStart || undefined,
                periodLabel: periodLabel || undefined,
                sessionId: selectedSessionId || undefined,
                reviews: reviewEntries.map(([studentId, r]) => ({
                    studentId,
                    positiveTags: r.positiveTags,
                    improvementTags: r.improvementTags,
                    teacherComment: r.comment,
                    scoreData: r.scoreData,
                })),
                autoSend,
            });

            if (result.success) {
                toast.success(`Đã tạo ${result.count} nhận xét ${autoSend ? "và gửi tới phụ huynh" : ""} thành công!`);
                setStudentReviews({});
            } else {
                toast.error(result.error || "Có lỗi xảy ra");
            }
        } catch (e: any) {
            toast.error("Lỗi: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Review type needs periodic fields?
    const isPeriodic = activeTab === "monthly" || activeTab === "quarterly" || activeTab === "course_end";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <FileBarChart className="w-5 h-5 text-white" />
                        </div>
                        Báo cáo & Nhận xét
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Tạo nhận xét nhanh cho học sinh và gửi tới phụ huynh
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 bg-white rounded-xl border border-slate-200 p-2">
                {(Object.entries(REVIEW_TYPE_LABELS) as [ReviewType, any][]).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                        <button
                            key={key}
                            onClick={() => { setActiveTab(key); setShowHistory(false); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === key
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {meta.label}
                        </button>
                    );
                })}
            </div>

            {/* Class Selector + Date Pickers */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
                {/* Chọn lớp */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">Chọn lớp *</label>
                    <div className="relative">
                        <select
                            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            value={selectedClassId}
                            onChange={e => handleClassChange(e.target.value)}
                        >
                            <option value="">— Chọn lớp —</option>
                            {classes.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({(c.course as any)?.name || ""})
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Chọn buổi (nếu nhận xét buổi) */}
                {activeTab === "session" && sessions.length > 0 && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">Chọn buổi học</label>
                        <div className="relative">
                            <select
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                value={selectedSessionId}
                                onChange={e => {
                                    setSelectedSessionId(e.target.value);
                                    const session = sessions.find((s: any) => s.id === e.target.value);
                                    if (session) setReviewDate(session.session_date);
                                }}
                            >
                                <option value="">— Chọn buổi —</option>
                                {sessions.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        Buổi {s.session_number} — {new Date(s.session_date).toLocaleDateString("vi-VN")}
                                        {s.lesson_title ? ` (${s.lesson_title})` : ""}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* Ngày nhận xét */}
                <div className="min-w-[160px]">
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">
                        {activeTab === "weekly" ? "Bắt đầu tuần" : "Ngày đánh giá"}
                    </label>
                    <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        value={activeTab === "weekly" ? weekStart : reviewDate}
                        onChange={e => {
                            if (activeTab === "weekly") {
                                setWeekStart(e.target.value);
                                setReviewDate(e.target.value);
                            } else {
                                setReviewDate(e.target.value);
                            }
                        }}
                    />
                </div>

                {/* Period label (cho định kỳ) */}
                {isPeriodic && (
                    <div className="min-w-[200px]">
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">Tên kỳ đánh giá</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder={activeTab === "monthly" ? "VD: Tháng 4/2026" : activeTab === "quarterly" ? "VD: Quý 1/2026" : "VD: Khóa TOEIC A1"}
                            value={periodLabel}
                            onChange={e => setPeriodLabel(e.target.value)}
                        />
                    </div>
                )}

                {/* History button */}
                <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-600 h-10"
                    onClick={loadHistory}
                    disabled={!selectedClassId || loadingHistory}
                >
                    {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Clock className="w-4 h-4 mr-1" />}
                    Lịch sử
                </Button>
            </div>

            {/* History Panel */}
            {showHistory && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" /> Lịch sử nhận xét ({history.length})
                    </h3>
                    {history.length > 0 ? (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {history.map((r: any) => (
                                <div key={r.id} className="bg-white rounded-lg border border-slate-200 p-3 text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-slate-800">{r.student?.full_name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400">{new Date(r.review_date).toLocaleDateString("vi-VN")}</span>
                                            {r.is_sent ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">Đã gửi</Badge>
                                            ) : (
                                                <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">Chưa gửi</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(r.positive_tags || []).map((tag: string) => (
                                            <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-medium">{tag}</span>
                                        ))}
                                        {(r.improvement_tags || []).map((tag: string) => (
                                            <span key={tag} className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-medium">{tag}</span>
                                        ))}
                                    </div>
                                    {r.teacher_comment && (
                                        <p className="text-xs text-slate-500 mt-1 italic">"{r.teacher_comment}"</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-4">Chưa có nhận xét nào cho loại này.</p>
                    )}
                </div>
            )}

            {/* Student Review Cards */}
            {selectedClassId && students.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-500" />
                            Danh sách Học sinh ({students.length})
                        </h3>
                        <div className="flex gap-2 text-xs">
                            <span className="text-slate-400">Thao tác nhanh:</span>
                            {POSITIVE_TAGS.slice(0, 3).map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => applyToAll(tag, "positive")}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors font-medium"
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {students.map((student: any) => {
                        const review = studentReviews[student.id] || { positiveTags: [], improvementTags: [], comment: "" };
                        const hasContent = review.positiveTags.length > 0 || review.improvementTags.length > 0 || review.comment.trim();

                        return (
                            <div
                                key={student.id}
                                className={`bg-white rounded-xl border transition-all ${
                                    hasContent ? "border-emerald-200 shadow-md shadow-emerald-50" : "border-slate-200 shadow-sm"
                                }`}
                            >
                                {/* Student Header */}
                                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {student.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{student.full_name}</h4>
                                        <p className="text-[10px] text-slate-400">{student.email}</p>
                                    </div>
                                    {hasContent && (
                                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã nhận xét
                                        </Badge>
                                    )}
                                    {isPeriodic && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs border-indigo-200 text-indigo-600 h-7"
                                            onClick={() => loadPeriodicSummary(student.id)}
                                            disabled={loadingSummary === student.id}
                                        >
                                            {loadingSummary === student.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileBarChart className="w-3 h-3 mr-1" />}
                                            Tải dữ liệu
                                        </Button>
                                    )}
                                </div>

                                {/* Score Data Preview (for periodic reviews) */}
                                {review.scoreData && (
                                    <div className="px-5 py-3 border-b border-slate-100 bg-indigo-50/50">
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Dữ liệu tổng hợp</p>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                            <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                                                <p className="text-slate-400">Chuyên cần</p>
                                                <p className="font-black text-indigo-700 text-base">{review.scoreData.attendanceRate}%</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                                                <p className="text-slate-400">ĐTB Kiểm tra</p>
                                                <p className="font-black text-emerald-700 text-base">{review.scoreData.avgExamScore}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                                                <p className="text-slate-400">ĐTB Bài tập</p>
                                                <p className="font-black text-amber-700 text-base">{review.scoreData.avgHwScore}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                                                <p className="text-slate-400">ĐTB Chung</p>
                                                <p className="font-black text-purple-700 text-base">{review.scoreData.overallAvg}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2 text-center border border-indigo-100">
                                                <p className="text-slate-400">Xếp loại</p>
                                                <p className={`font-black text-base ${
                                                    review.scoreData.rank === "Giỏi" ? "text-emerald-600" :
                                                    review.scoreData.rank === "Khá" ? "text-indigo-600" :
                                                    review.scoreData.rank === "Trung bình" ? "text-amber-600" :
                                                    "text-red-600"
                                                }`}>{review.scoreData.rank}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tag Selection */}
                                <div className="px-5 py-4 space-y-3">
                                    {/* Positive Tags */}
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 mb-2">
                                            <ThumbsUp className="w-3 h-3" /> Điểm tốt
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {POSITIVE_TAGS.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleTag(student.id, tag, "positive")}
                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                        review.positiveTags.includes(tag)
                                                            ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                                                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                                                    }`}
                                                >
                                                    {review.positiveTags.includes(tag) && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Improvement Tags */}
                                    <div>
                                        <p className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1 mb-2">
                                            <AlertTriangle className="w-3 h-3" /> Cần cải thiện
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {IMPROVEMENT_TAGS.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleTag(student.id, tag, "improvement")}
                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                        review.improvementTags.includes(tag)
                                                            ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                                                            : "bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50"
                                                    }`}
                                                >
                                                    {review.improvementTags.includes(tag) && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Comment */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1.5">
                                            <MessageSquare className="w-3 h-3" /> Nhận xét riêng
                                        </p>
                                        <Textarea
                                            placeholder="Ghi nhận xét riêng cho học sinh này (tùy chọn)..."
                                            value={review.comment}
                                            onChange={e => setComment(student.id, e.target.value)}
                                            rows={2}
                                            className="text-sm resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Submit Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 bg-white rounded-xl p-5 shadow-sm border sticky bottom-0 z-10">
                        <div className="flex-1">
                            <p className="text-sm text-slate-500">
                                <span className="font-bold text-slate-700">
                                    {Object.values(studentReviews).filter(r => r.positiveTags.length > 0 || r.improvementTags.length > 0 || r.comment.trim()).length}
                                </span> / {students.length} HS đã nhận xét
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleSubmit(false)}
                            disabled={isSaving}
                            className="border-slate-300 text-slate-700"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
                            Lưu nháp
                        </Button>
                        <Button
                            onClick={() => handleSubmit(true)}
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Lưu & Gửi tới Phụ huynh
                        </Button>
                    </div>
                </div>
            ) : selectedClassId ? (
                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Lớp chưa có học sinh nào.</p>
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Vui lòng chọn lớp để bắt đầu nhận xét.</p>
                </div>
            )}
        </div>
    );
}
