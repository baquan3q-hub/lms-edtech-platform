"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
    CalendarDays, Calendar as CalendarIcon, List, Clock, MapPin,
    BookOpen, ChevronLeft, ChevronRight, ArrowRight, FileText,
    AlertCircle, CheckCircle2, Filter, CalendarOff, Sparkles,
    Sun, Moon, Sunrise, Upload, X, Loader2, Save, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateSessionContent, syncTeacherSessions } from "@/lib/actions/schedule";
import { useRouter } from "next/navigation";

// ============ TYPES ============

interface SessionData {
    id: string;
    class_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    session_number: number;
    status: string;
    teaching_status: string;
    lesson_title: string | null;
    lesson_content: string | null;
    attachments: any;
    class_name: string;
    course_name: string;
    room_name: string | null;
    leave_status: string | null;
}

interface ClassInfo {
    id: string;
    name: string;
    courses: any;
}

// ============ HELPERS ============

const DAYS_VI = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const MONTHS_VI = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

function formatDateVN(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return {
        day: d.getDate(),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        weekday: DAYS_VI[d.getDay()],
        full: d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }),
        short: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    };
}

function getToday() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function getWeekRange(refDate: Date) {
    const d = new Date(refDate);
    const day = d.getDay(); // 0=CN
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (dt: Date) => {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    return { start: fmt(monday), end: fmt(sunday), monday, sunday };
}

function getMonthRange(refDate: Date) {
    const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const last = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);

    const fmt = (dt: Date) => {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    return { start: fmt(first), end: fmt(last) };
}

function getTimeIcon(time: string | null) {
    if (!time) return <Sun className="w-3.5 h-3.5" />;
    const hour = parseInt(time.substring(0, 2));
    if (hour < 12) return <Sunrise className="w-3.5 h-3.5" />;
    if (hour < 18) return <Sun className="w-3.5 h-3.5" />;
    return <Moon className="w-3.5 h-3.5" />;
}

// Color palette for class badges
const CLASS_COLORS = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
    { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
];

// ============ MAIN COMPONENT ============

export default function TeacherScheduleOverviewClient({
    sessions,
    teacherClasses,
    weeklySchedules = [],
    error,
}: {
    sessions: SessionData[];
    teacherClasses: ClassInfo[];
    weeklySchedules?: any[];
    error: string | null;
}) {
    const router = useRouter();
    const today = getToday();
    const [viewMode, setViewMode] = useState<"week" | "month">("week");
    const [refDate, setRefDate] = useState(new Date());
    const [filterClassId, setFilterClassId] = useState<string>("all");
    const [viewType, setViewType] = useState<"timeline" | "calendar">("timeline");

    // Local state for sessions to update immediately after saving lesson planning
    const [localSessions, setLocalSessions] = useState<SessionData[]>(sessions || []);

    // Sync state
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncTeacherSessions(""); // teacherId will be resolved server-side
            if (res.error) {
                toast.error("Lỗi đồng bộ: " + res.error);
            } else if (res.totalGenerated > 0) {
                toast.success(`Đã tạo ${res.totalGenerated} buổi học mới!`);
                router.refresh();
            } else {
                toast.info("Tất cả buổi học đã được đồng bộ rồi.");
            }
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // Lesson Planning Modal States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleEditLesson = (session: SessionData) => {
        setSelectedSession(session);
        setTitle(session.lesson_title || "");
        setContent(session.lesson_content || "");
        setExistingAttachments(session.attachments || []);
        setFiles([]);
        setIsDialogOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const valid = newFiles.every(f => f.size <= 50 * 1024 * 1024);
            if (!valid) {
                toast.error("Một số file vượt quá dung lượng 50MB.");
            }
            setFiles(prev => [...prev, ...newFiles.filter(f => f.size <= 50 * 1024 * 1024)]);
        }
    };

    const removeNewFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));
    const removeExistingFile = (index: number) => setExistingAttachments(prev => prev.filter((_, i) => i !== index));

    const handleSaveLesson = async () => {
        if (!selectedSession) return;
        setIsSaving(true);
        setUploadProgress(0);

        try {
            let uploadedNewAttachments: any[] = [];

            if (files.length > 0) {
                const supabase = createClient();
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const ext = file.name.split(".").pop();
                    const fileName = `${selectedSession.class_id}/${selectedSession.id}_${Date.now()}_${i}.${ext}`;

                    const { error } = await supabase.storage
                        .from("lesson-files")
                        .upload(`sessions/${fileName}`, file, { cacheControl: "3600", upsert: false });

                    if (error) throw error;

                    const { data: urlData } = supabase.storage
                        .from("lesson-files")
                        .getPublicUrl(`sessions/${fileName}`);

                    uploadedNewAttachments.push({
                        url: urlData.publicUrl,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                    });
                    setUploadProgress((i + 1) / files.length * 100);
                }
            }

            const finalAttachments = [...existingAttachments, ...uploadedNewAttachments];
            const res = await updateSessionContent(selectedSession.id, {
                lesson_title: title.trim() || null,
                lesson_content: content.trim() || null,
                attachments: finalAttachments
            });

            if (res.error) throw new Error(res.error);

            setLocalSessions(prev => prev.map(s => s.id === selectedSession.id ? {
                ...s,
                lesson_title: title.trim() || null,
                lesson_content: content.trim() || null,
                attachments: finalAttachments
            } : s));

            toast.success("Đã cập nhật giáo án buổi học!");
            setIsDialogOpen(false);
        } catch (err: any) {
            toast.error(`Lỗi: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Build class color map
    const classColorMap = useMemo(() => {
        const map = new Map<string, typeof CLASS_COLORS[0]>();
        teacherClasses.forEach((cls, idx) => {
            map.set(cls.id, CLASS_COLORS[idx % CLASS_COLORS.length]);
        });
        return map;
    }, [teacherClasses]);

    // Current range
    const range = useMemo(() => {
        if (viewMode === "week") return getWeekRange(refDate);
        return getMonthRange(refDate);
    }, [viewMode, refDate]);

    // Filtered sessions
    const filteredSessions = useMemo(() => {
        let result = localSessions.filter(
            s => s.session_date >= range.start && s.session_date <= range.end
        );
        if (filterClassId !== "all") {
            result = result.filter(s => s.class_id === filterClassId);
        }
        return result;
    }, [localSessions, range, filterClassId]);

    // Group by date
    const groupedByDate = useMemo(() => {
        const groups: Record<string, SessionData[]> = {};
        filteredSessions.forEach(s => {
            if (!groups[s.session_date]) groups[s.session_date] = [];
            groups[s.session_date].push(s);
        });
        return groups;
    }, [filteredSessions]);

    // Today's sessions (always from all sessions, ignoring filter)
    const todaySessions = useMemo(() => {
        return localSessions.filter(s => s.session_date === today);
    }, [localSessions, today]);

    // Stats
    const upcomingCount = useMemo(() => {
        return filteredSessions.filter(s => s.session_date >= today).length;
    }, [filteredSessions, today]);

    const hasLessonCount = useMemo(() => {
        return filteredSessions.filter(s => s.lesson_title).length;
    }, [filteredSessions]);

    // Navigation
    const navigate = (direction: -1 | 1) => {
        const d = new Date(refDate);
        if (viewMode === "week") {
            d.setDate(d.getDate() + direction * 7);
        } else {
            d.setMonth(d.getMonth() + direction);
        }
        setRefDate(d);
    };

    const goToToday = () => setRefDate(new Date());

    // Range label
    const rangeLabel = useMemo(() => {
        if (viewMode === "week") {
            const w = getWeekRange(refDate);
            const ms = formatDateVN(w.start);
            const me = formatDateVN(w.end);
            return `${ms.short} — ${me.short}`;
        }
        return `${MONTHS_VI[refDate.getMonth()]} ${refDate.getFullYear()}`;
    }, [viewMode, refDate]);

    // ============ CALENDAR VIEW HELPERS ============

    const calendarDays = useMemo(() => {
        if (viewMode !== "month" && viewType !== "calendar") return [];

        const year = refDate.getFullYear();
        const month = refDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0
        const totalDays = lastDay.getDate();

        const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

        // Fill previous month
        for (let i = startDay - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: formatDateStr(d), day: d.getDate(), isCurrentMonth: false });
        }

        // Current month
        for (let i = 1; i <= totalDays; i++) {
            const d = new Date(year, month, i);
            days.push({ date: formatDateStr(d), day: i, isCurrentMonth: true });
        }

        // Next month to fill 6 rows (42 cells)
        while (days.length < 42) {
            const d = new Date(year, month + 1, days.length - totalDays - startDay + 1);
            days.push({ date: formatDateStr(d), day: d.getDate(), isCurrentMonth: false });
        }

        return days;
    }, [refDate, viewMode, viewType]);

    function formatDateStr(d: Date) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    // ============ RENDER ============

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">Lỗi tải lịch dạy: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ===== HEADER ===== */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        Lịch dạy tổng hợp
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium ml-[52px]">
                        Tổng hợp lịch dạy từ tất cả {teacherClasses.length} lớp bạn phụ trách • Soạn giáo án & dặn dò trực tiếp
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0"
                >
                    {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {isSyncing ? "Đang đồng bộ..." : "Đồng bộ buổi học"}
                </Button>
            </div>

            {/* ===== TODAY BANNER ===== */}
            {todaySessions.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50 relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            <span className="font-bold text-lg">Hôm nay — {formatDateVN(today).full}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {todaySessions.map(session => (
                                <Link key={session.id} href={`/teacher/classes/${session.class_id}`}>
                                    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3.5 hover:bg-white/25 transition-all cursor-pointer border border-white/10">
                                        <div className="flex items-start justify-between mb-1.5">
                                            <span className="font-bold text-sm">{session.class_name}</span>
                                            <span className="text-xs opacity-80">Buổi {session.session_number}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs opacity-90">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {(session.start_time || "00:00:00").substring(0, 5)} - {(session.end_time || "00:00:00").substring(0, 5)}
                                            </span>
                                            {session.room_name && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {session.room_name}
                                                </span>
                                            )}
                                        </div>
                                        {session.lesson_title && (
                                            <p className="text-xs mt-2 opacity-80 line-clamp-1 border-t border-white/10 pt-1.5">
                                                📝 {session.lesson_title}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CONTROLS BAR ===== */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                {/* Left: Navigation */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="h-9 w-9 p-0 border-slate-200">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToToday} className="h-9 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
                        Hôm nay
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(1)} className="h-9 w-9 p-0 border-slate-200">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-bold text-slate-800 ml-2 hidden sm:inline">{rangeLabel}</span>
                </div>

                {/* Right: Filters + View toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Class filter */}
                    <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={filterClassId}
                            onChange={e => setFilterClassId(e.target.value)}
                            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="all">Tất cả lớp</option>
                            {teacherClasses.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Week/Month toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode("week")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Tuần
                        </button>
                        <button
                            onClick={() => setViewMode("month")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Tháng
                        </button>
                    </div>

                    {/* Timeline/Calendar toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewType("timeline")}
                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewType === "timeline" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <List className="w-3.5 h-3.5" /> Timeline
                        </button>
                        <button
                            onClick={() => { setViewType("calendar"); setViewMode("month"); }}
                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewType === "calendar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <CalendarIcon className="w-3.5 h-3.5" /> Lịch
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile range label */}
            <div className="sm:hidden text-center">
                <span className="text-sm font-bold text-slate-700">{rangeLabel}</span>
            </div>

            {/* ===== STATS ROW ===== */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
                    <p className="text-2xl font-black text-slate-900">{filteredSessions.length}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Tổng buổi</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
                    <p className="text-2xl font-black text-indigo-600">{upcomingCount}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Sắp tới</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
                    <p className="text-2xl font-black text-emerald-600">{hasLessonCount}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Đã soạn giáo án</p>
                </div>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            {viewType === "timeline" ? (
                // ===== TIMELINE VIEW =====
                <div className="space-y-1">
                    {Object.keys(groupedByDate).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                            <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Không có buổi dạy nào trong khoảng thời gian này.</p>
                            <p className="text-sm text-slate-400 mt-1 mb-4">Thử chuyển sang tuần/tháng khác hoặc bỏ bộ lọc.</p>
                            {localSessions.length === 0 && teacherClasses.length > 0 && (
                                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-md mx-auto">
                                    <p className="text-sm text-amber-800 font-medium mb-3">💡 Lớp của bạn chưa có buổi học cụ thể. Nhấn nút bên dưới để hệ thống tự tạo từ lịch dạy đã cài.</p>
                                    <Button
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        {isSyncing ? "Đang tạo buổi học..." : "Tạo buổi học từ lịch dạy"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedByDate).map(([dateStr, daySessions]) => {
                            const dateInfo = formatDateVN(dateStr);
                            const isToday = dateStr === today;
                            const isPast = dateStr < today;

                            return (
                                <div key={dateStr} className={`relative ${isPast && !isToday ? "opacity-60" : ""}`}>
                                    {/* Date Header */}
                                    <div className={`sticky top-0 z-10 flex items-center gap-3 py-3 px-1 ${isToday ? "" : ""}`}>
                                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-sm ${isToday
                                            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-400 shadow-indigo-200"
                                            : isPast
                                                ? "bg-slate-100 text-slate-400 border-slate-200"
                                                : "bg-white text-slate-700 border-slate-200"
                                            }`}>
                                            <span className="text-[9px] font-bold uppercase opacity-70">
                                                T{dateInfo.month}
                                            </span>
                                            <span className="text-xl font-black leading-none">{dateInfo.day}</span>
                                            <span className={`text-[9px] font-bold ${isToday ? "text-indigo-200" : "text-slate-400"}`}>
                                                {dateInfo.weekday.substring(0, 2) === "Ch" ? "CN" : dateInfo.weekday.substring(dateInfo.weekday.length - 1) === "i" ? dateInfo.weekday.substring(0, 6) : dateInfo.weekday}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-base ${isToday ? "text-indigo-700" : "text-slate-700"}`}>
                                                    {dateInfo.weekday}
                                                </span>
                                                {isToday && (
                                                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] py-0 h-5 font-bold">
                                                        HÔM NAY
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">{daySessions.length} buổi dạy</span>
                                        </div>
                                    </div>

                                    {/* Session Cards */}
                                    <div className="ml-[70px] space-y-3 pb-4">
                                        {daySessions.map(session => {
                                            const color = classColorMap.get(session.class_id) || CLASS_COLORS[0];
                                            const hasLesson = !!session.lesson_title;
                                            const isOnLeave = session.leave_status === "approved" || session.leave_status === "pending";

                                            return (
                                                <div
                                                    key={session.id}
                                                    className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 group relative overflow-hidden ${isOnLeave
                                                        ? "border-rose-200 opacity-70"
                                                        : `border-slate-200 hover:${color.border}`
                                                        }`}
                                                >
                                                    {/* Left color accent */}
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${color.dot} rounded-l-xl`} />

                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-3">
                                                        <div className="flex-1 min-w-0">
                                                            {/* Class name + session number */}
                                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                                <Badge className={`${color.bg} ${color.text} ${color.border} text-[10px] px-2 py-0 h-5 font-bold`}>
                                                                    {session.class_name}
                                                                </Badge>
                                                                <span className="text-xs font-semibold text-slate-400">
                                                                    Buổi {session.session_number}
                                                                </span>
                                                                {session.course_name && (
                                                                    <span className="text-xs text-slate-400 hidden lg:inline">
                                                                        • {session.course_name}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Time & Room */}
                                                            <div className="flex items-center gap-4 text-sm mb-1.5">
                                                                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                                                                    {getTimeIcon(session.start_time)}
                                                                    {(session.start_time || "00:00:00").substring(0, 5)} — {(session.end_time || "00:00:00").substring(0, 5)}
                                                                </span>
                                                                {session.room_name && (
                                                                    <span className="flex items-center gap-1 text-slate-500">
                                                                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                                                        {session.room_name}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Giáo án preview */}
                                                            {hasLesson ? (
                                                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    <span className="font-medium truncate max-w-[250px]">{session.lesson_title}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">Chưa soạn giáo án</span>
                                                            )}

                                                            {/* Leave status */}
                                                            {isOnLeave && (
                                                                <div className="flex items-center gap-1.5 text-xs mt-1.5">
                                                                    <CalendarOff className="w-3 h-3 text-rose-500" />
                                                                    <span className={`font-medium ${session.leave_status === "approved" ? "text-rose-600" : "text-amber-600"}`}>
                                                                        {session.leave_status === "approved" ? "Đã xin nghỉ (duyệt)" : "Đã gửi đơn xin nghỉ"}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 mt-3 sm:mt-0">
                                                            <Button
                                                                variant={session.lesson_title ? "outline" : "default"}
                                                                size="sm"
                                                                onClick={() => handleEditLesson(session)}
                                                                className={`h-8 text-xs ${!session.lesson_title ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}
                                                            >
                                                                <BookOpen className="w-4 h-4 mr-1.5" />
                                                                {session.lesson_title ? "Sửa giáo án" : "Soạn giáo án"}
                                                            </Button>
                                                            <Link href={`/teacher/classes/${session.class_id}`}>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 text-xs border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 w-full sm:w-auto"
                                                                >
                                                                    Vào lớp <ArrowRight className="w-3 h-3 ml-1" />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                // ===== CALENDAR VIEW =====
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
                            <div key={d} className="py-3 text-center text-xs font-bold text-slate-500">{d}</div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, idx) => {
                            const daySessions = sessions.filter(s => s.session_date === day.date);
                            const isToday = day.date === today;

                            return (
                                <div
                                    key={idx}
                                    className={`min-h-[100px] border-b border-r border-slate-100 p-2 transition-colors ${!day.isCurrentMonth ? "bg-slate-50/50" : "bg-white"
                                        } ${isToday ? "bg-indigo-50/50 ring-1 ring-inset ring-indigo-200" : ""}`}
                                >
                                    {/* Day number */}
                                    <div className={`text-xs font-bold mb-1 ${isToday
                                        ? "w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center"
                                        : day.isCurrentMonth ? "text-slate-700" : "text-slate-300"
                                        }`}>
                                        {day.day}
                                    </div>

                                    {/* Session dots */}
                                    <div className="space-y-1">
                                        {daySessions.slice(0, 3).map(session => {
                                            const color = classColorMap.get(session.class_id) || CLASS_COLORS[0];
                                            
                                            return (
                                                <Link key={session.id} href={`/teacher/classes/${session.class_id}`}>
                                                    <div className={`text-[10px] px-1.5 py-0.5 rounded ${color.bg} ${color.text} font-medium truncate cursor-pointer hover:opacity-80 transition-opacity leading-tight`}>
                                                        {(session.start_time || "00:00:00").substring(0, 5)} {session.class_name}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                        {daySessions.length > 3 && (
                                            <div className="text-[10px] text-slate-400 font-medium pl-1">
                                                +{daySessions.length - 3} buổi
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== CLASS LEGEND ===== */}
            {teacherClasses.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Chú thích lớp</p>
                    <div className="flex flex-wrap gap-2">
                        {teacherClasses.map(cls => {
                            const color = classColorMap.get(cls.id) || CLASS_COLORS[0];
                            const courseName = Array.isArray(cls.courses) ? cls.courses[0]?.name : (cls.courses as any)?.name;
                            return (
                                <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color.border} ${color.bg} hover:shadow-sm transition-shadow cursor-pointer`}>
                                        <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                                        <span className={`text-xs font-bold ${color.text}`}>{cls.name}</span>
                                        {courseName && <span className="text-[10px] text-slate-400">({courseName})</span>}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== DIALOG SOẠN GIÁO ÁN ===== */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Cập nhật nội dung buổi học</DialogTitle>
                        <DialogDescription>
                            Chủ đề, tài liệu đính kèm và dặn dò sẽ được lưu lại cho lớp <strong>{selectedSession?.class_name}</strong> (Buổi {selectedSession?.session_number}).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tên bài học / Chủ đề</label>
                            <Input 
                                placeholder="VD: Unit 1 - Greetings" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nội dung / Dặn dò</label>
                            <Textarea 
                                placeholder="Ghi chú nội dung chính hoặc bài tập về nhà..." 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700 block mb-1.5 flex justify-between items-center">
                                <span>Tài liệu đính kèm</span>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-3 h-3 mr-1.5" /> Thêm File
                                </Button>
                            </label>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                multiple 
                                className="hidden" 
                                onChange={handleFileChange} 
                            />
                            
                            <div className="space-y-2 mt-2">
                                {existingAttachments.map((f, i) => (
                                    <div key={`ext-${i}`} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden text-sm">
                                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                            <span className="truncate text-slate-700">{f.name}</span>
                                            <span className="text-[10px] text-slate-400 shrink-0">({formatFileSize(f.size)})</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <a href={f.url} target="_blank" rel="noopener noreferrer">
                                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                                </Button>
                                            </a>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => removeExistingFile(i)}>
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {files.map((f, i) => (
                                    <div key={`new-${i}`} className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden text-sm">
                                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span className="truncate text-blue-800 font-medium">{f.name}</span>
                                            <span className="text-[10px] text-blue-400 shrink-0">({formatFileSize(f.size)}) - Chưa lưu</span>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0" onClick={() => removeNewFile(i)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                
                                {existingAttachments.length === 0 && files.length === 0 && (
                                    <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">
                                        Chưa có tài liệu đính kèm
                                    </div>
                                )}
                            </div>
                        </div>

                        {isSaving && files.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    <span className="text-xs font-semibold text-blue-700">Đang tải file lên... {Math.round(uploadProgress)}%</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-1.5">
                                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Hủy</Button>
                        <Button onClick={handleSaveLesson} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang cập nhật...</> : <><Save className="w-4 h-4 mr-2" /> Lưu giáo án</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
