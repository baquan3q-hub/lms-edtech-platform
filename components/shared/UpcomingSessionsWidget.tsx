"use client";

import { format, parseISO, isBefore, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, Clock, AlertCircle, CheckCircle2, XCircle, Clock3, CalendarCheck, BookOpen, AlarmClock, MapPin, FileText, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ClassSession {
    id: string;
    class_name: string;
    course_name?: string;
    session_number: number;
    session_date: string;
    start_time: string;
    end_time: string;
    lesson_title: string | null;
    lesson_content: string | null;
    attachments?: any[] | null;
    status?: string;
    attendance_status?: string | null;
    absence_request_status?: string | null;
    room_name?: string | null;
}

interface UpcomingSessionsWidgetProps {
    sessions: ClassSession[];
    limit?: number;
    onSessionClick?: (session: ClassSession) => void;
    onRecallAbsence?: (session: ClassSession) => void;
    compact?: boolean;
}

/**
 * Render trạng thái điểm danh của mỗi buổi học với đầy đủ các loại:
 * - Đã học, Vắng, Đi muộn, Xin nghỉ (chờ duyệt), Có phép (đã duyệt), Chưa học
 */
function AttendanceBadge({ status, sessionDate, absenceRequestStatus }: { status: string | null | undefined, sessionDate: string, absenceRequestStatus?: string | null }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = parseISO(sessionDate);
    const isPast = isBefore(date, today);
    const isCurrentDay = isToday(date);

    // Future session with no attendance yet
    if (!isPast && !isCurrentDay && status !== "excused" && status !== "absence_requested") {
        return null; // Compact mode: hide "data will be updated" for future
    }

    switch (status) {
        case "present":
            return (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Đã học
                </Badge>
            );
        case "absent":
            return (
                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                    <XCircle className="w-3 h-3 mr-1" />Vắng
                </Badge>
            );
        case "late":
            return (
                <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                    <AlarmClock className="w-3 h-3 mr-1" />Đi muộn
                </Badge>
            );
        case "excused":
            return (
                <Badge className="bg-purple-50 text-purple-600 border-purple-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                    <CalendarCheck className="w-3 h-3 mr-1" />Có phép
                </Badge>
            );
        case "absence_requested":
            return (
                <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                    <Clock3 className="w-3 h-3 mr-1" />Xin nghỉ (chờ duyệt)
                </Badge>
            );
        case "unrecorded":
            return (
                <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                    <CalendarDays className="w-3 h-3 mr-1" />Chưa điểm danh
                </Badge>
            );
        default:
            if (isPast || isCurrentDay) {
                return (
                    <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                        <CalendarDays className="w-3 h-3 mr-1" />Chưa điểm danh
                    </Badge>
                );
            }
            return null;
    }
}

/** Chuyển day_of_week sang tên tiếng Việt */
function getDayName(dateStr: string): string {
    const date = parseISO(dateStr);
    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    return dayNames[date.getDay()];
}

export default function UpcomingSessionsWidget({ sessions, limit, onSessionClick, onRecallAbsence, compact = false }: UpcomingSessionsWidgetProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sắp xếp tất cả sessions theo ngày, giờ
    const sorted = [...sessions].sort((a, b) => {
        if (a.session_date !== b.session_date) return a.session_date.localeCompare(b.session_date);
        return a.start_time.localeCompare(b.start_time);
    });

    // Tách quá khứ và tương lai
    const past = sorted.filter(s => isBefore(parseISO(s.session_date), today));
    const futureAndToday = sorted.filter(s => !isBefore(parseISO(s.session_date), today));

    // Mặc định: 1 buổi gần nhất đã qua + 2 buổi sắp tới
    let displaySessions: ClassSession[];
    if (limit !== undefined) {
        const pastToShow = past.slice(-1);
        const futureToShow = futureAndToday.slice(0, Math.max(1, limit - 1));
        displaySessions = [...pastToShow, ...futureToShow];
    } else {
        const pastToShow = past.slice(-1);
        const futureToShow = futureAndToday.slice(0, 2);
        displaySessions = [...pastToShow, ...futureToShow];
    }

    if (displaySessions.length === 0) {
        return (
            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Bạn chưa có lịch học sắp tới.</p>
            </div>
        );
    }

    // Compact mode: giống ảnh mẫu (gọn nhẹ, hiển thị thứ/giờ/phòng/nội dung)
    if (compact) {
        return (
            <div className="space-y-4">
                {displaySessions.map((session, idx) => {
                    const date = parseISO(session.session_date);
                    const isCurrentDay = isToday(date);
                    const isPastSession = isBefore(date, today);
                    const dayName = getDayName(session.session_date);
                    const dateFormatted = format(date, 'dd/MM', { locale: vi });
                    const hasAbsenceRequest = session.attendance_status === "absence_requested";

                    return (
                        <div
                            key={session.id || idx}
                            className={`relative rounded-xl border bg-white transition-all
                                ${isPastSession ? "border-slate-200 opacity-70" : "border-slate-200"}
                                ${isCurrentDay ? "border-emerald-300 shadow-sm shadow-emerald-100/50 ring-1 ring-emerald-200" : ""}
                                ${onSessionClick && !hasAbsenceRequest ? "cursor-pointer hover:border-indigo-300 hover:shadow-sm" : ""}
                            `}
                            onClick={() => onSessionClick && !hasAbsenceRequest && onSessionClick(session)}
                        >
                            {/* Divider line at top */}
                            <div className={`h-1 rounded-t-xl ${
                                isPastSession ? "bg-slate-200"
                                    : isCurrentDay ? "bg-emerald-400"
                                    : "bg-amber-400"
                            }`} />

                            <div className="px-4 py-3">
                                {/* Header: Day name + date */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                                            <CalendarDays className="w-4 h-4 text-amber-500" />
                                            {dayName}
                                        </span>
                                        {isCurrentDay && (
                                            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0 h-4 border-none font-semibold">
                                                Hôm nay
                                            </Badge>
                                        )}
                                        <span className="text-xs text-slate-400">({dateFormatted})</span>
                                    </div>
                                    {/* Attendance Status */}
                                    <AttendanceBadge
                                        status={session.attendance_status}
                                        sessionDate={session.session_date}
                                        absenceRequestStatus={session.absence_request_status}
                                    />
                                </div>

                                {/* Time + Room */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mb-2">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="font-semibold">{session.start_time?.substring(0, 5)} – {session.end_time?.substring(0, 5)}</span>
                                    </span>
                                    {session.room_name && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                            <span className="font-medium">Phòng: {session.room_name}</span>
                                        </span>
                                    )}
                                </div>

                                {/* Topic / Nội dung */}
                                {session.lesson_title && (
                                    <div className="bg-amber-50/80 border border-amber-200/60 rounded-lg px-3 py-2 flex items-start gap-2">
                                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-bold text-amber-700">Tên bài học / Chủ đề: </span>
                                            <span className="text-xs text-amber-900/80">{session.lesson_title}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Homework alert */}
                                {session.lesson_content && session.lesson_content.trim().length > 0 && (
                                    <div className="bg-rose-50 rounded-lg px-3 py-2 border border-rose-200/60 flex items-start gap-2 mt-2">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-[10px] font-bold text-rose-800 block mb-0.5">NỘI DUNG / DẶN DÒ BÀI HỌC</span>
                                            <p className="text-xs text-rose-900/80 leading-relaxed whitespace-pre-wrap">
                                                {session.lesson_content}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Attachments */}
                                {session.attachments && session.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2 py-1">
                                        {session.attachments.map((file: any, i: number) => (
                                            <a 
                                                key={i} 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium rounded-md text-[10px] hover:bg-indigo-100 transition-colors"
                                            >
                                                <FileText className="w-3 h-3" />
                                                <span className="max-w-[120px] truncate">{file.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Thu hồi đơn xin nghỉ */}
                                {hasAbsenceRequest && onRecallAbsence && (
                                    <div className="mt-2 flex items-center justify-between bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200">
                                        <span className="text-xs text-amber-700 font-medium">Đã gửi đơn xin nghỉ</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 px-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRecallAbsence(session);
                                            }}
                                        >
                                            <Undo2 className="w-3 h-3 mr-1" />
                                            Thu hồi
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Default mode (for student dashboard - original layout)
    return (
        <div className="space-y-3">
            {displaySessions.map((session, idx) => {
                const date = parseISO(session.session_date);
                const isCurrentDay = isToday(date);
                const isPastSession = isBefore(date, today);
                const hasContent = session.lesson_content && session.lesson_content.trim().length > 0;

                return (
                    <div
                        key={session.id || idx}
                        className={`relative bg-white rounded-xl border overflow-hidden transition-all
                            ${isPastSession ? "border-slate-200 opacity-80" : "border-slate-200 shadow-sm"}
                            ${hasContent && !isPastSession ? "border-amber-300 shadow-md shadow-amber-100/50" : ""}
                            ${onSessionClick ? "cursor-pointer hover:border-indigo-300 hover:shadow-md group" : ""}`}
                        onClick={() => onSessionClick && onSessionClick(session)}
                    >
                        {/* Left accent bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            isPastSession ? "bg-slate-300"
                                : isCurrentDay ? "bg-red-500"
                                : hasContent ? "bg-amber-400"
                                : "bg-indigo-400"
                        }`} />

                        <div className="flex gap-3 p-3 pl-4">
                            {/* Date Block */}
                            <div className={`flex flex-col items-center justify-center shrink-0 w-12 h-12 rounded-lg text-center
                                ${isPastSession ? "bg-slate-100 text-slate-500"
                                    : isCurrentDay ? "bg-red-50 text-red-700"
                                    : "bg-indigo-50 text-indigo-700"}`}>
                                <span className="text-[10px] font-bold uppercase">{format(date, 'EEE', { locale: vi })}</span>
                                <span className="text-lg font-black leading-tight">{format(date, 'dd')}</span>
                                <span className="text-[9px] font-medium">{format(date, 'MM/yy')}</span>
                            </div>

                            {/* Session Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0 h-4">
                                                {session.class_name}
                                            </Badge>
                                            {isCurrentDay && (
                                                <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-4">
                                                    Hôm nay
                                                </Badge>
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-slate-800 text-sm truncate">
                                            {session.lesson_title || `Buổi ${session.session_number || ""}`}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                        </p>
                                    </div>
                                    {/* Status Badge */}
                                    <div className="shrink-0">
                                        <AttendanceBadge
                                            status={session.attendance_status}
                                            sessionDate={session.session_date}
                                            absenceRequestStatus={session.absence_request_status}
                                        />
                                    </div>
                                </div>

                                {/* Homework & Admin Content */}
                                <div className="mt-2 space-y-2">
                                    {/* Homework Update */}
                                    {hasContent && (
                                        <div className="bg-amber-50 rounded-lg p-2 border border-amber-200/60 flex items-start gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] font-bold text-amber-800 block mb-0.5">NỘI DUNG / DẶN DÒ BÀI HỌC</span>
                                                <p className="text-xs text-amber-900/80 leading-relaxed whitespace-pre-wrap">
                                                    {session.lesson_content}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Attachments */}
                                    {session.attachments && session.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {session.attachments.map((file: any, i: number) => (
                                                <a 
                                                    key={i} 
                                                    href={file.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium rounded-md text-[10px] hover:bg-indigo-100 transition-colors"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
