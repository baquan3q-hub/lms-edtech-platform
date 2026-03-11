"use client";

import { format, parseISO, isBefore, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, Clock, AlertCircle, CheckCircle2, XCircle, Clock3, CalendarCheck, BookOpen, AlarmClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClassSession {
    id: string;
    class_name: string;
    course_name?: string;
    session_number: number;
    session_date: string;
    start_time: string;
    end_time: string;
    topic: string | null;
    homework: string | null;
    status?: string;
    attendance_status?: string | null;
    absence_request_status?: string | null;
}

interface UpcomingSessionsWidgetProps {
    sessions: ClassSession[];
    limit?: number;
    onSessionClick?: (session: ClassSession) => void;
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
        return (
            <Badge className="bg-sky-50 text-sky-600 border-sky-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                <BookOpen className="w-3 h-3 mr-1" />Dữ liệu sẽ được cập nhật từ điểm danh
            </Badge>
        );
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
            // Past session not recorded yet by teacher
            return (
                <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] py-0.5 px-2 font-medium" variant="outline">
                    <CalendarDays className="w-3 h-3 mr-1" />Chưa điểm danh
                </Badge>
            );
        default:
            // Past session where teacher marked attendance but status unknown
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

export default function UpcomingSessionsWidget({ sessions, limit, onSessionClick }: UpcomingSessionsWidgetProps) {
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
        // Nếu có limit từ bên ngoài (parent dùng "xem thêm"), lấy 1 past + (limit-1) sessions từ future
        const pastToShow = past.slice(-1); // Luôn lấy 1 buổi đã qua gần nhất
        const futureToShow = futureAndToday.slice(0, Math.max(1, limit - 1));
        displaySessions = [...pastToShow, ...futureToShow];
    } else {
        // Default: 1 past + 2 upcoming
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

    return (
        <div className="space-y-3">
            {displaySessions.map((session, idx) => {
                const date = parseISO(session.session_date);
                const isCurrentDay = isToday(date);
                const isPastSession = isBefore(date, today);
                const hasHomework = session.homework && session.homework.trim().length > 0;

                return (
                    <div
                        key={session.id || idx}
                        className={`relative bg-white rounded-xl border overflow-hidden transition-all
                            ${isPastSession ? "border-slate-200 opacity-80" : "border-slate-200 shadow-sm"}
                            ${hasHomework && !isPastSession ? "border-amber-300 shadow-md shadow-amber-100/50" : ""}
                            ${onSessionClick ? "cursor-pointer hover:border-indigo-300 hover:shadow-md group" : ""}`}
                        onClick={() => onSessionClick && onSessionClick(session)}
                    >
                        {/* Left accent bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            isPastSession ? "bg-slate-300"
                                : isCurrentDay ? "bg-red-500"
                                : hasHomework ? "bg-amber-400"
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
                                            {session.topic || `Buổi ${session.session_number || ""}`}
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
                                    {/* Admin Description */}
                                    {(session as any).description && (
                                        <div className="bg-slate-50/80 rounded border border-slate-100 p-2 text-xs text-slate-600">
                                            <span className="font-semibold block mb-0.5 text-slate-700">Nội dung bài học:</span>
                                            {(session as any).description}
                                        </div>
                                    )}

                                    {/* Homework Update */}
                                    {hasHomework && !isPastSession && (
                                        <div className="bg-amber-50 rounded-lg p-2 border border-amber-200/60 flex items-start gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] font-bold text-amber-800 block mb-0.5">BÀI TẬP VỀ NHÀ!</span>
                                                <p className="text-xs text-amber-900/80 leading-relaxed whitespace-pre-wrap">
                                                    {session.homework}
                                                </p>
                                            </div>
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
