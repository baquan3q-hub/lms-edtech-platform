"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import {
    CalendarDays,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    FileText,
    CheckCircle2,
    Filter,
    CalendarOff,
    Upload,
    X,
    Loader2,
    Save,
    Download,
    RotateCw,
    Paperclip,
    Layers,
    List,
    AlertCircle,
    Info,
    Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateSessionContent, syncTeacherSessions } from "@/lib/actions/schedule";

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

function getTodayStr() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function getWeekRange(refDate: Date) {
    const d = new Date(refDate);
    const day = d.getDay(); // 0=CN
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2
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

// Bảng màu lớp học (Curated pastel palette, chuẩn WCAG, đồng bộ thiết kế LMS)
const CLASS_COLORS = [
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500", badge: "bg-sky-100 text-sky-800 border-sky-300" },
    { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500", badge: "bg-violet-100 text-violet-800 border-violet-300" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 border-amber-300" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-800 border-rose-300" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-800 border-indigo-300" },
    { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500", badge: "bg-teal-100 text-teal-800 border-teal-300" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-800 border-cyan-300" },
];

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
    const today = getTodayStr();
    const [viewMode, setViewMode] = useState<"week" | "month">("week");
    const [refDate, setRefDate] = useState(new Date());
    const [filterClassId, setFilterClassId] = useState<string>("all");
    const [filterLessonStatus, setFilterLessonStatus] = useState<"all" | "missing_plan" | "has_plan">("all");
    const [viewType, setViewType] = useState<"timeline" | "calendar">("timeline");

    // Local state quản lý sessions tại chỗ, cập nhật mượt mà không load lại trang
    const [localSessions, setLocalSessions] = useState<SessionData[]>(sessions || []);

    // Sync state
    const [isSyncing, startSyncTransition] = useTransition();

    const handleSync = () => {
        startSyncTransition(async () => {
            try {
                const res = await syncTeacherSessions("");
                if (res.error) {
                    toast.error("Lỗi đồng bộ: " + res.error);
                } else if (res.totalGenerated > 0) {
                    toast.success(`Đã tự động tạo thêm ${res.totalGenerated} buổi học mới từ khung lịch cố định!`);
                } else {
                    toast.info("Tất cả buổi học đã được cập nhật đầy đủ.");
                }
            } catch (err: any) {
                toast.error("Lỗi: " + err.message);
            }
        });
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
                toast.error("Một số file vượt quá dung lượng cho phép (tối đa 50MB).");
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
            const uploadedNewAttachments: any[] = [];

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
                    setUploadProgress(((i + 1) / files.length) * 100);
                }
            }

            const finalAttachments = [...existingAttachments, ...uploadedNewAttachments];
            const res = await updateSessionContent(selectedSession.id, {
                lesson_title: title.trim() || null,
                lesson_content: content.trim() || null,
                attachments: finalAttachments
            });

            if (res.error) throw new Error(res.error);

            // Cập nhật tại chỗ ngay lập tức
            setLocalSessions(prev => prev.map(s => s.id === selectedSession.id ? {
                ...s,
                lesson_title: title.trim() || null,
                lesson_content: content.trim() || null,
                attachments: finalAttachments
            } : s));

            toast.success("Đã lưu giáo án buổi học thành công!");
            setIsDialogOpen(false);
        } catch (err: any) {
            toast.error(`Lỗi: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Bản đồ màu sắc ổn định cho từng lớp
    const classColorMap = useMemo(() => {
        const map = new Map<string, typeof CLASS_COLORS[0]>();
        teacherClasses.forEach((cls, idx) => {
            map.set(cls.id, CLASS_COLORS[idx % CLASS_COLORS.length]);
        });
        return map;
    }, [teacherClasses]);

    // Khoảng thời gian hiện tại
    const range = useMemo(() => {
        if (viewMode === "week") return getWeekRange(refDate);
        return getMonthRange(refDate);
    }, [viewMode, refDate]);

    // Danh sách lọc
    const filteredSessions = useMemo(() => {
        let result = localSessions.filter(
            s => s.session_date >= range.start && s.session_date <= range.end
        );
        if (filterClassId !== "all") {
            result = result.filter(s => s.class_id === filterClassId);
        }
        if (filterLessonStatus === "missing_plan") {
            result = result.filter(s => !s.lesson_title);
        } else if (filterLessonStatus === "has_plan") {
            result = result.filter(s => !!s.lesson_title);
        }
        return result;
    }, [localSessions, range, filterClassId, filterLessonStatus]);

    // Gom nhóm theo ngày
    const groupedByDate = useMemo(() => {
        const groups: Record<string, SessionData[]> = {};
        filteredSessions.forEach(s => {
            if (!groups[s.session_date]) groups[s.session_date] = [];
            groups[s.session_date].push(s);
        });
        return groups;
    }, [filteredSessions]);

    // Ca dạy hôm nay (tập trung xem ngay)
    const todaySessions = useMemo(() => {
        return localSessions.filter(s => s.session_date === today);
    }, [localSessions, today]);

    // Thống kê nhanh
    const totalInRange = filteredSessions.length;
    const upcomingCount = useMemo(() => {
        return filteredSessions.filter(s => s.session_date >= today).length;
    }, [filteredSessions, today]);

    const hasLessonCount = useMemo(() => {
        return filteredSessions.filter(s => !!s.lesson_title).length;
    }, [filteredSessions]);

    const lessonPercentage = totalInRange > 0 ? Math.round((hasLessonCount / totalInRange) * 100) : 0;

    // Điều hướng thời gian
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

    // Nhãn hiển thị khoảng thời gian
    const rangeLabel = useMemo(() => {
        if (viewMode === "week") {
            const w = getWeekRange(refDate);
            const ms = formatDateVN(w.start);
            const me = formatDateVN(w.end);
            return `${ms.short} — ${me.short}/${w.monday.getFullYear()}`;
        }
        return `${MONTHS_VI[refDate.getMonth()]}, ${refDate.getFullYear()}`;
    }, [viewMode, refDate]);

    // ============ CALENDAR VIEW CALCULATION ============
    const calendarDays = useMemo(() => {
        if (viewMode !== "month" && viewType !== "calendar") return [];

        const year = refDate.getFullYear();
        const month = refDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Thứ 2 = 0
        const totalDays = lastDay.getDate();

        const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

        // Ngày tháng trước
        for (let i = startDay - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: formatDateStr(d), day: d.getDate(), isCurrentMonth: false });
        }

        // Ngày tháng hiện tại
        for (let i = 1; i <= totalDays; i++) {
            const d = new Date(year, month, i);
            days.push({ date: formatDateStr(d), day: i, isCurrentMonth: true });
        }

        // Ngày tháng sau để đủ 35 hoặc 42 ô
        const totalCells = days.length > 35 ? 42 : 35;
        while (days.length < totalCells) {
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

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="font-semibold text-base">Không thể tải dữ liệu lịch dạy</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ===== HEADER TIÊU CHUẨN CỦA TEACHER PORTAL ===== */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
                        <CalendarDays className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                            Lịch dạy & Kế hoạch bài giảng
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 font-medium">
                            Thời khóa biểu tổng hợp {teacherClasses.length} lớp học • Quản lý giáo án và tài liệu từng ca dạy
                        </p>
                    </div>
                </div>

                {/* Nút tác vụ phụ: Đồng bộ lịch học kỳ */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 h-9 px-3 text-xs font-semibold"
                        title="Tự động kiểm tra và sinh buổi học từ khung giờ cố định"
                    >
                        <RotateCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
                        {isSyncing ? "Đang đồng bộ..." : "Đồng bộ lịch học kỳ"}
                    </Button>
                </div>
            </div>

            {/* ===== TIÊU ĐIỂM: CA DẠY HÔM NAY (TODAY'S SESSIONS FOCUS) ===== */}
            {todaySessions.length > 0 ? (
                <div className="bg-slate-900 rounded-2xl p-5 text-slate-50 shadow-sm border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="font-bold text-sm md:text-base text-white tracking-wide">
                                Lịch giảng dạy Hôm nay — {formatDateVN(today).full}
                            </span>
                        </div>
                        <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[11px] font-semibold px-2.5 py-0.5">
                            {todaySessions.length} ca dạy
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {todaySessions.map((session) => {
                            const hasLesson = !!session.lesson_title;
                            const color = classColorMap.get(session.class_id) || CLASS_COLORS[0];

                            return (
                                <div
                                    key={session.id}
                                    className="bg-slate-800/90 hover:bg-slate-800 rounded-xl p-4 border border-slate-700/80 flex flex-col justify-between transition-all"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="font-bold text-sm text-white line-clamp-1">
                                                {session.class_name}
                                            </span>
                                            <Badge className={`${color.badge} text-[10px] px-1.5 py-0 font-bold shrink-0`}>
                                                Buổi {session.session_number}
                                            </Badge>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mb-3">
                                            <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                                {(session.start_time || "00:00:00").substring(0, 5)} - {(session.end_time || "00:00:00").substring(0, 5)}
                                            </span>
                                            {session.room_name && (
                                                <span className="flex items-center gap-1 text-slate-300">
                                                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                                    {session.room_name}
                                                </span>
                                            )}
                                        </div>

                                        {hasLesson ? (
                                            <div className="text-xs text-emerald-300/90 line-clamp-1 bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-700 mb-3">
                                                <span className="font-semibold text-emerald-400 mr-1.5">Bài:</span>
                                                {session.lesson_title}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-amber-300/90 italic bg-amber-950/40 px-2 py-1.5 rounded-lg border border-amber-900/50 mb-3">
                                                Chưa lưu giáo án ca này
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons: Phân cấp rõ ràng */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditLesson(session)}
                                            className="h-8 text-xs border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white flex-1"
                                        >
                                            <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                            {hasLesson ? "Sửa giáo án" : "Soạn giáo án"}
                                        </Button>

                                        <Link href={`/teacher/classes/${session.class_id}`} className="flex-1">
                                            <Button
                                                size="sm"
                                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full shadow-xs"
                                            >
                                                Vào lớp
                                                <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {/* ===== THANH ĐIỀU KHIỂN & BỘ LỌC (INTEGRATED TOOLBAR) ===== */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* 1. Nhóm Điều hướng thời gian */}
                <div className="flex items-center justify-between sm:justify-start gap-2">
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="h-8 w-8 p-0 text-slate-600 hover:bg-white hover:text-slate-900"
                            title="Khoảng thời gian trước"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToToday}
                            className="h-8 px-2.5 text-xs font-bold text-emerald-700 hover:bg-white"
                        >
                            Hôm nay
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(1)}
                            className="h-8 w-8 p-0 text-slate-600 hover:bg-white hover:text-slate-900"
                            title="Khoảng thời gian tiếp theo"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    <span className="text-sm font-bold text-slate-800 ml-1">
                        {rangeLabel}
                    </span>
                </div>

                {/* 2. Nhóm Bộ Lọc & Chế độ xem */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Bộ lọc lớp */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={filterClassId}
                            onChange={(e) => setFilterClassId(e.target.value)}
                            className="text-xs font-medium bg-transparent text-slate-700 focus:outline-none cursor-pointer pr-1"
                        >
                            <option value="all">Tất cả lớp ({teacherClasses.length})</option>
                            {teacherClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Bộ lọc trạng thái giáo án */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={filterLessonStatus}
                            onChange={(e) => setFilterLessonStatus(e.target.value as any)}
                            className="text-xs font-medium bg-transparent text-slate-700 focus:outline-none cursor-pointer pr-1"
                        >
                            <option value="all">Tất cả bài học</option>
                            <option value="missing_plan">Chưa soạn bài</option>
                            <option value="has_plan">Đã soạn giáo án</option>
                        </select>
                    </div>

                    {/* Toggle Tuần / Tháng */}
                    <div className="flex bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/60">
                        <button
                            onClick={() => setViewMode("week")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                viewMode === "week"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Tuần
                        </button>
                        <button
                            onClick={() => setViewMode("month")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                viewMode === "month"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Tháng
                        </button>
                    </div>

                    {/* Toggle Dạng Timeline / Lưới Lịch */}
                    <div className="flex bg-slate-100/90 rounded-xl p-0.5 border border-slate-200/60">
                        <button
                            onClick={() => setViewType("timeline")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                viewType === "timeline"
                                    ? "bg-white text-emerald-800 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                            title="Xem theo danh sách thời gian"
                        >
                            <List className="w-3.5 h-3.5 text-emerald-600" />
                            Timeline
                        </button>
                        <button
                            onClick={() => {
                                setViewType("calendar");
                                setViewMode("month");
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                viewType === "calendar"
                                    ? "bg-white text-emerald-800 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                            title="Xem dạng bàn cờ tháng"
                        >
                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
                            Lịch bàn cờ
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== KHỐI BỐ CỤC CHÍNH (MAIN LAYOUT: 2 CỘT) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* CỘT CHÍNH (3/4): TIMELINE HOẶC CALENDAR GRID */}
                <div className="lg:col-span-3 space-y-4">
                    {viewType === "timeline" ? (
                        /* ===== TIMELINE VIEW ===== */
                        <div className="space-y-4">
                            {Object.keys(groupedByDate).length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
                                    <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-700 font-bold text-base">Không tìm thấy ca dạy nào</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                        Không có ca học nào thỏa mãn điều kiện lọc trong khoảng thời gian này.
                                    </p>
                                    {(filterClassId !== "all" || filterLessonStatus !== "all") && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setFilterClassId("all");
                                                setFilterLessonStatus("all");
                                            }}
                                            className="mt-4 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                        >
                                            Đặt lại bộ lọc
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                Object.entries(groupedByDate).map(([dateStr, daySessions]) => {
                                    const dateInfo = formatDateVN(dateStr);
                                    const isCurrentDay = dateStr === today;
                                    const isPast = dateStr < today;

                                    return (
                                        <div
                                            key={dateStr}
                                            className={`bg-white rounded-2xl border ${
                                                isCurrentDay
                                                    ? "border-emerald-300 ring-2 ring-emerald-500/10 shadow-sm"
                                                    : "border-slate-200/90 shadow-xs"
                                            } p-4 md:p-5 transition-all`}
                                        >
                                            {/* Date Header Row */}
                                            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ${
                                                            isCurrentDay
                                                                ? "bg-emerald-600 text-white shadow-xs"
                                                                : isPast
                                                                ? "bg-slate-100 text-slate-400"
                                                                : "bg-slate-50 text-slate-700 border border-slate-200"
                                                        }`}
                                                    >
                                                        <span className="text-[10px] leading-none uppercase opacity-80">
                                                            T{dateInfo.month}
                                                        </span>
                                                        <span className="text-lg leading-tight font-extrabold">{dateInfo.day}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-extrabold text-sm md:text-base text-slate-900">
                                                                {dateInfo.weekday}
                                                            </span>
                                                            {isCurrentDay && (
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold px-2 py-0">
                                                                    Hôm nay
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            {dateInfo.full}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="text-xs text-slate-400 font-medium">
                                                    {daySessions.length} ca học
                                                </span>
                                            </div>

                                            {/* List of Sessions in this day */}
                                            <div className="space-y-3">
                                                {daySessions.map((session) => {
                                                    const color = classColorMap.get(session.class_id) || CLASS_COLORS[0];
                                                    const hasLesson = !!session.lesson_title;
                                                    const isOnLeave =
                                                        session.leave_status === "approved" ||
                                                        session.leave_status === "pending";

                                                    return (
                                                        <div
                                                            key={session.id}
                                                            className={`rounded-xl border p-3.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                                                isOnLeave
                                                                    ? "bg-rose-50/40 border-rose-200 opacity-75"
                                                                    : isCurrentDay
                                                                    ? "bg-emerald-50/20 border-emerald-200 hover:border-emerald-300"
                                                                    : "bg-slate-50/50 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300"
                                                            }`}
                                                        >
                                                            {/* Session Details */}
                                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <Badge className={`${color.badge} text-[10px] px-2 py-0 font-bold`}>
                                                                        {session.class_name}
                                                                    </Badge>
                                                                    <span className="text-xs font-semibold text-slate-500">
                                                                        Buổi {session.session_number}
                                                                    </span>
                                                                    {session.course_name && (
                                                                        <span className="text-xs text-slate-400 hidden sm:inline">
                                                                            • {session.course_name}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                                                                    <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                                                                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                                                        {(session.start_time || "00:00:00").substring(0, 5)} — {(session.end_time || "00:00:00").substring(0, 5)}
                                                                    </span>
                                                                    {session.room_name && (
                                                                        <span className="flex items-center gap-1 text-slate-500">
                                                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                            {session.room_name}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Trạng thái giáo án */}
                                                                <div className="pt-0.5">
                                                                    {hasLesson ? (
                                                                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                            <span className="truncate max-w-[320px]">
                                                                                {session.lesson_title}
                                                                            </span>
                                                                            {session.attachments?.length > 0 && (
                                                                                <span className="flex items-center gap-0.5 text-[11px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                                                                                    <Paperclip className="w-3 h-3" />
                                                                                    {session.attachments.length}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md inline-block">
                                                                            Chưa lưu giáo án
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Thông báo xin nghỉ nếu có */}
                                                                {isOnLeave && (
                                                                    <div className="flex items-center gap-1 text-xs text-rose-600 font-medium pt-1">
                                                                        <CalendarOff className="w-3.5 h-3.5" />
                                                                        <span>
                                                                            {session.leave_status === "approved"
                                                                                ? "Đã duyệt đơn nghỉ dạy"
                                                                                : "Đang chờ duyệt đơn nghỉ dạy"}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Hành động (Actions) */}
                                                            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEditLesson(session)}
                                                                    className={`h-8 text-xs font-semibold ${
                                                                        !hasLesson
                                                                            ? "border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                                                                            : "border-slate-200 text-slate-700 hover:bg-white"
                                                                    }`}
                                                                >
                                                                    <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                                                    {hasLesson ? "Sửa bài" : "Soạn bài"}
                                                                </Button>

                                                                <Link href={`/teacher/classes/${session.class_id}`}>
                                                                    <Button
                                                                        size="sm"
                                                                        className={`h-8 text-xs font-bold ${
                                                                            isCurrentDay
                                                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                                                : "bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                                                                        }`}
                                                                    >
                                                                        Vào lớp
                                                                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                                                                    </Button>
                                                                </Link>
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
                        /* ===== CALENDAR GRID VIEW ===== */
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                            {/* Thứ trong tuần */}
                            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                                {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map((d) => (
                                    <div key={d} className="py-2.5 text-center text-xs font-bold text-slate-600">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Lưới ngày */}
                            <div className="grid grid-cols-7">
                                {calendarDays.map((day, idx) => {
                                    const daySessions = localSessions.filter(
                                        (s) => s.session_date === day.date && (filterClassId === "all" || s.class_id === filterClassId)
                                    );
                                    const isCurrentDay = day.date === today;

                                    return (
                                        <div
                                            key={idx}
                                            className={`min-h-[110px] border-b border-r border-slate-100 p-2 transition-colors ${
                                                !day.isCurrentMonth ? "bg-slate-50/50" : "bg-white"
                                            } ${isCurrentDay ? "bg-emerald-50/30" : ""}`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span
                                                    className={`text-xs font-bold ${
                                                        isCurrentDay
                                                            ? "w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center"
                                                            : day.isCurrentMonth
                                                            ? "text-slate-800"
                                                            : "text-slate-300"
                                                    }`}
                                                >
                                                    {day.day}
                                                </span>
                                                {daySessions.length > 0 && (
                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                        {daySessions.length} ca
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                {daySessions.slice(0, 3).map((session) => {
                                                    const color = classColorMap.get(session.class_id) || CLASS_COLORS[0];
                                                    return (
                                                        <div
                                                            key={session.id}
                                                            onClick={() => handleEditLesson(session)}
                                                            className={`text-[10px] px-1.5 py-0.5 rounded-md ${color.bg} ${color.text} border ${color.border} font-medium truncate cursor-pointer hover:opacity-85 transition-opacity leading-tight`}
                                                            title={`${session.class_name} (${(session.start_time || "").slice(0, 5)}) - Bấm để xem giáo án`}
                                                        >
                                                            {(session.start_time || "00:00:00").substring(0, 5)} {session.class_name}
                                                        </div>
                                                    );
                                                })}
                                                {daySessions.length > 3 && (
                                                    <div className="text-[10px] text-slate-500 font-semibold pl-1">
                                                        +{daySessions.length - 3} ca khác
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* CỘT PHỤ (1/4): KHỐI TIỆN ÍCH, THỐNG KÊ & CHÚ THÍCH (GOM THÔNG TIN VÀO 1 KHỐI GỌN GÀNG) */}
                <div className="space-y-4">
                    {/* KHỐI 1: BẢNG TỔNG QUAN TIỆN ÍCH (BENTO UTILITY CARD) */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <Layers className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                Tổng quan tiến độ
                            </h2>
                        </div>

                        {/* Thống kê 3 chỉ số */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500">Ca dạy kỳ này</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">{totalInRange}</p>
                            </div>
                            <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                                <p className="text-xs font-semibold text-emerald-800">Sắp diễn ra</p>
                                <p className="text-2xl font-black text-emerald-700 mt-1">{upcomingCount}</p>
                            </div>
                        </div>

                        {/* Tiến độ soạn bài */}
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-600">Đã soạn giáo án</span>
                                <span className="font-bold text-emerald-700">
                                    {hasLessonCount}/{totalInRange} ({lessonPercentage}%)
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${lessonPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Chú thích màu sắc các lớp */}
                        <div className="pt-2 border-t border-slate-100 space-y-2.5">
                            <p className="text-xs font-bold text-slate-600">Lớp học bạn phụ trách</p>
                            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                                {teacherClasses.map((cls) => {
                                    const color = classColorMap.get(cls.id) || CLASS_COLORS[0];
                                    const isSelected = filterClassId === cls.id;

                                    return (
                                        <button
                                            key={cls.id}
                                            onClick={() => setFilterClassId(isSelected ? "all" : cls.id)}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                                                isSelected
                                                    ? `${color.bg} ${color.border} font-bold shadow-xs`
                                                    : "border-slate-100 hover:bg-slate-50 text-slate-700"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                                                <span className="truncate font-medium">{cls.name}</span>
                                            </div>
                                            {isSelected && (
                                                <span className="text-[10px] text-emerald-700 font-bold shrink-0">
                                                    Đang lọc
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Thông tin hỗ trợ */}
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60 text-xs text-slate-500 flex items-start gap-2">
                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                Bấm nút <span className="font-semibold text-slate-700">"Soạn bài"</span> để đính kèm slide/tài liệu. Học sinh sẽ xem được tài liệu này trong trang học tập của lớp.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== DIALOG SOẠN / SỬA GIÁO ÁN ===== */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto w-[95vw] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-emerald-600" />
                            Giáo án & Dặn dò buổi học
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Cập nhật nội dung cho lớp <strong>{selectedSession?.class_name}</strong> (Buổi {selectedSession?.session_number} — ngày {selectedSession ? formatDateVN(selectedSession.session_date).short : ""}).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                Tên bài học / Chủ đề trọng tâm
                            </label>
                            <Input
                                placeholder="VD: Bài 3 — Cấu trúc dữ liệu mảng & Danh sách liên kết"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                Ghi chú nội dung & Dặn dò học sinh
                            </label>
                            <Textarea
                                placeholder="Tóm tắt nội dung chính cần ghi nhớ, dặn dò chuẩn bị bài hoặc bài tập về nhà..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                                className="text-sm"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Tài liệu buổi học đính kèm
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-3 h-3 mr-1" /> Thêm file (PDF/Slide)
                                </Button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            <div className="space-y-2 mt-2">
                                {existingAttachments.map((f, i) => (
                                    <div
                                        key={`ext-${i}`}
                                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden text-xs">
                                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span className="truncate text-slate-800 font-medium">{f.name}</span>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                ({formatFileSize(f.size)})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <a href={f.url} target="_blank" rel="noopener noreferrer">
                                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-700">
                                                    <Download className="w-3.5 h-3.5" />
                                                </Button>
                                            </a>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => removeExistingFile(i)}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {files.map((f, i) => (
                                    <div
                                        key={`new-${i}`}
                                        className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden text-xs">
                                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span className="truncate text-emerald-900 font-semibold">{f.name}</span>
                                            <span className="text-[10px] text-emerald-600 shrink-0">
                                                ({formatFileSize(f.size)}) - File mới
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 shrink-0"
                                            onClick={() => removeNewFile(i)}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}

                                {existingAttachments.length === 0 && files.length === 0 && (
                                    <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                                        Chưa có tài liệu đính kèm nào cho ca dạy này
                                    </div>
                                )}
                            </div>
                        </div>

                        {isSaving && files.length > 0 && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Loader2 className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
                                    <span className="text-xs font-semibold text-emerald-800">
                                        Đang tải file lên kho lưu trữ... {Math.round(uploadProgress)}%
                                    </span>
                                </div>
                                <div className="w-full bg-emerald-200/60 rounded-full h-1.5">
                                    <div
                                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isSaving}
                            className="text-xs border-slate-200"
                        >
                            Hủy
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveLesson}
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Đang lưu giáo án...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                    Lưu giáo án
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
