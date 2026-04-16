"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    CheckCircle2, XCircle, Clock, FileText, Save, Users,
    CalendarDays, History, Download, CheckCheck, Loader2,
} from "lucide-react";
import {
    getOrCreateAttendanceSession,
    saveAttendanceRecords,
    getAttendanceRecords,
    getApprovedAbsencesForDate,
} from "@/lib/actions/attendance";

// ==============================
// Types
// ==============================
interface Student {
    student_id: string;
    name: string;
    email: string;
    enrollment_id: string;
}

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceState {
    status: AttendanceStatus;
    note: string;
    hasApprovedAbsence?: boolean;
}

interface AttendanceClientProps {
    classId: string;
    className: string;
    students: Student[];
}

// ==============================
// Status Config
// ==============================
const STATUS_CONFIG: Record<AttendanceStatus, {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
}> = {
    present: {
        label: "Có mặt",
        icon: CheckCircle2,
        color: "bg-emerald-500",
        bgColor: "bg-emerald-50 hover:bg-emerald-100",
        borderColor: "border-emerald-500 ring-emerald-500/20",
        textColor: "text-emerald-700",
    },
    absent: {
        label: "Vắng",
        icon: XCircle,
        color: "bg-red-500",
        bgColor: "bg-red-50 hover:bg-red-100",
        borderColor: "border-red-500 ring-red-500/20",
        textColor: "text-red-700",
    },
    late: {
        label: "Đi trễ",
        icon: Clock,
        color: "bg-amber-500",
        bgColor: "bg-amber-50 hover:bg-amber-100",
        borderColor: "border-amber-500 ring-amber-500/20",
        textColor: "text-amber-700",
    },
    excused: {
        label: "Có phép",
        icon: FileText,
        color: "bg-blue-500",
        bgColor: "bg-blue-50 hover:bg-blue-100",
        borderColor: "border-blue-500 ring-blue-500/20",
        textColor: "text-blue-700",
    },
};

const ALL_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

// ==============================
// Component
// ==============================
export default function AttendanceClient({ classId, className, students }: AttendanceClientProps) {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<"open" | "closed">("open");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceState>>({});

    // Set date only on client to avoid hydration mismatch
    useEffect(() => {
        setSelectedDate(new Date().toISOString().split("T")[0]);
    }, []);

    // Draft key for localStorage
    const draftKey = `attendance_draft_${classId}_${selectedDate}`;

    // ---- Load session + records for selected date ----
    const loadSessionData = useCallback(async (date: string) => {
        setInitialLoading(true);
        try {
            // Lấy hoặc tạo session
            const { data: session, error: sessErr } = await getOrCreateAttendanceSession(classId, date);
            if (sessErr || !session) {
                toast.error("Không thể tạo phiên điểm danh");
                return;
            }
            setSessionId(session.id);
            setSessionStatus(session.status);

            // Lấy records hiện có
            const { data: records } = await getAttendanceRecords(session.id);

            // Lấy danh sách đơn xin nghỉ đã duyệt
            const { data: approvedAbsences } = await getApprovedAbsencesForDate(classId, date);
            const approvedStudentIds = new Set(approvedAbsences.map((a: any) => a.student_id));

            // Thử load draft từ localStorage
            let draft: Record<string, AttendanceState> | null = null;
            try {
                const saved = localStorage.getItem(draftKey);
                if (saved) draft = JSON.parse(saved);
            } catch { }

            // Khởi tạo state
            const state: Record<string, AttendanceState> = {};
            students.forEach((student) => {
                const existing = records.find((r: any) => r.student_id === student.student_id);
                const hasDraft = draft && draft[student.student_id];
                const hasApproved = approvedStudentIds.has(student.student_id);

                if (existing) {
                    state[student.student_id] = {
                        status: existing.status,
                        note: existing.note || "",
                        hasApprovedAbsence: hasApproved,
                    };
                } else if (hasDraft) {
                    state[student.student_id] = {
                        ...draft![student.student_id],
                        hasApprovedAbsence: hasApproved,
                    };
                } else {
                    state[student.student_id] = {
                        status: hasApproved ? "excused" : "present",
                        note: hasApproved ? "Đơn xin nghỉ đã được duyệt" : "",
                        hasApprovedAbsence: hasApproved,
                    };
                }
            });

            setAttendanceState(state);
        } catch (err) {
            toast.error("Lỗi khi tải dữ liệu điểm danh");
        } finally {
            setInitialLoading(false);
        }
    }, [classId, students, draftKey]);

    useEffect(() => {
        if (!selectedDate) return;
        if (students.length > 0) {
            loadSessionData(selectedDate);
        } else {
            setInitialLoading(false);
        }
    }, [selectedDate, students.length, loadSessionData]);

    // ---- Auto-save draft to localStorage every 30s ----
    useEffect(() => {
        if (Object.keys(attendanceState).length === 0) return;
        const timer = setInterval(() => {
            try {
                localStorage.setItem(draftKey, JSON.stringify(attendanceState));
            } catch { }
        }, 30000);
        return () => clearInterval(timer);
    }, [attendanceState, draftKey]);

    // ---- Handlers ----
    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceState((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], status },
        }));
    };

    const handleNoteChange = (studentId: string, note: string) => {
        setAttendanceState((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], note },
        }));
    };

    const markAllPresent = () => {
        setAttendanceState((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((sid) => {
                if (!next[sid].hasApprovedAbsence) {
                    next[sid] = { ...next[sid], status: "present" };
                }
            });
            return next;
        });
        toast.info("Đã đánh dấu tất cả có mặt");
    };

    const handleSave = async () => {
        if (!sessionId) return;
        setLoading(true);
        try {
            const records = Object.entries(attendanceState).map(([student_id, data]) => ({
                student_id,
                status: data.status,
                note: data.note,
            }));

            const result = await saveAttendanceRecords(sessionId, classId, records);
            if (result.error) {
                toast.error(`Lỗi: ${result.error}`);
                return;
            }

            // Clear draft
            try { localStorage.removeItem(draftKey); } catch { }
            toast.success("✅ Đã lưu điểm danh thành công!");
        } catch {
            toast.error("Đã xảy ra sự cố khi lưu điểm danh.");
        } finally {
            setLoading(false);
        }
    };

    // ---- Stats ----
    const counts = ALL_STATUSES.reduce((acc, s) => {
        acc[s] = Object.values(attendanceState).filter((a) => a.status === s).length;
        return acc;
    }, {} as Record<AttendanceStatus, number>);

    // ---- Empty state ----
    if (students.length === 0) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm mt-6">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có học sinh</h3>
                <p className="text-gray-500">Lớp học này hiện chưa có học viên nào được xếp vào.</p>
            </div>
        );
    }

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-3 text-gray-500">Đang tải dữ liệu điểm danh...</span>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ---- Header: Date + Session Status ---- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-gray-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <Badge variant={sessionStatus === "open" ? "default" : "secondary"}
                        className={sessionStatus === "open"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }
                    >
                        {sessionStatus === "open" ? "🟢 Đang mở" : "🔒 Đã đóng"}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a href={`/teacher/classes/${classId}/attendance-history`}>
                            <History className="w-4 h-4 mr-1.5" /> Lịch sử
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={markAllPresent}>
                        <CheckCheck className="w-4 h-4 mr-1.5" /> Tất cả có mặt
                    </Button>
                </div>
            </div>

            {/* ---- Summary Stats ---- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ALL_STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                        <div key={s} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bgColor} border-gray-200`}>
                            <div className={`w-8 h-8 ${cfg.color} rounded-lg flex items-center justify-center`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{cfg.label}</p>
                                <p className={`text-lg font-bold ${cfg.textColor}`}>{counts[s]}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ---- Attendance Table (Desktop) / Cards (Mobile) ---- */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50/80">
                            <TableRow className="border-b border-gray-100">
                                <TableHead className="w-[60px] text-center font-medium text-gray-500">STT</TableHead>
                                <TableHead className="font-medium text-gray-500 w-[22%]">Học sinh</TableHead>
                                <TableHead className="font-medium text-gray-500 text-center">Trạng thái điểm danh</TableHead>
                                <TableHead className="font-medium text-gray-500 w-[20%]">Ghi chú</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student, index) => {
                                const state = attendanceState[student.student_id];
                                if (!state) return null;

                                return (
                                    <TableRow key={student.student_id} className="hover:bg-gray-50/50 group">
                                        <TableCell className="text-center font-medium text-gray-400 text-sm">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {student.name?.charAt(0) || "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{student.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{student.email}</p>
                                                </div>
                                            </div>
                                            {state.hasApprovedAbsence && (
                                                <Badge className="mt-1 bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                                    📋 Đã có đơn xin nghỉ
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {ALL_STATUSES.map((s) => {
                                                    const cfg = STATUS_CONFIG[s];
                                                    const Icon = cfg.icon;
                                                    const isActive = state.status === s;
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => handleStatusChange(student.student_id, s)}
                                                            className={`
                                                                flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
                                                                transition-all duration-200 border min-h-[44px]
                                                                ${isActive
                                                                    ? `${cfg.borderColor} ${cfg.bgColor} ${cfg.textColor} ring-2 shadow-sm`
                                                                    : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                                }
                                                            `}
                                                        >
                                                            <Icon className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">{cfg.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                placeholder="Ghi chú..."
                                                value={state.note}
                                                onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                                                className="h-8 text-xs focus-visible:ring-emerald-500 text-base md:text-xs"
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                    {students.map((student, index) => {
                        const state = attendanceState[student.student_id];
                        if (!state) return null;

                        return (
                            <div key={student.student_id} className="p-4 space-y-4 hover:bg-gray-50/50">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                            {student.name?.charAt(0) || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 text-[15px] truncate">{student.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{student.email}</p>
                                            {state.hasApprovedAbsence && (
                                                <Badge className="mt-1 bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                                    📋 Đã có đơn xin nghỉ
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {ALL_STATUSES.map((s) => {
                                        const cfg = STATUS_CONFIG[s];
                                        const Icon = cfg.icon;
                                        const isActive = state.status === s;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => handleStatusChange(student.student_id, s)}
                                                className={`
                                                    flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-medium
                                                    transition-all duration-200 border min-h-[44px]
                                                    ${isActive
                                                        ? `${cfg.borderColor} ${cfg.bgColor} ${cfg.textColor} ring-2 shadow-sm`
                                                        : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                    }
                                                `}
                                            >
                                                <Icon className="w-4 h-4 shrink-0" />
                                                <span className="truncate">{cfg.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <Input
                                    placeholder="Ghi chú (nếu có)..."
                                    value={state.note}
                                    onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                                    className="h-11 text-base focus-visible:ring-emerald-500 w-full"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ---- Footer: Save Button ---- */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-4 text-sm text-gray-500">
                    <span>Có mặt: <strong className="text-emerald-600">{counts.present}</strong></span>
                    <span>Vắng: <strong className="text-red-600">{counts.absent}</strong></span>
                    <span>Trễ: <strong className="text-amber-600">{counts.late}</strong></span>
                    <span>Có phép: <strong className="text-blue-600">{counts.excused}</strong></span>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={loading || !sessionId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
                >
                    {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /> 💾 Lưu điểm danh</>
                    )}
                </Button>
            </div>
        </div>
    );
}
