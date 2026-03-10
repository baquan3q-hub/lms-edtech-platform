"use client";

import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, Clock, BookOpen, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
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
}

export default function UpcomingSessionsWidget({ sessions, limit = 4 }: { sessions: ClassSession[], limit?: number }) {
    // Lọc các buổi học từ 2 ngày trước trở đi để hiện cả lịch cũ gần nhất (xem điểm danh)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const upcoming = sessions.filter(s => new Date(s.session_date) >= twoDaysAgo)
        .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
        .filter(s => new Date(s.session_date) >= today || s.attendance_status) // Giữ lại quá khứ nếu có điểm danh/buổi học
        .slice(0, limit);

    if (upcoming.length === 0) {
        return (
            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Bạn chưa có lịch học sắp tới.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {upcoming.map((session, idx) => {
                const date = parseISO(session.session_date);
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const hasHomework = session.homework && session.homework.trim().length > 0;

                return (
                    <div key={session.id || idx} className={`relative bg-white rounded-xl border ${hasHomework ? 'border-amber-300 shadow-md shadow-amber-100/50' : 'border-slate-200 shadow-sm'} p-4 overflow-hidden`}>
                        {hasHomework && (
                            <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>
                        )}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center justify-center shrink-0 w-14 h-14 bg-indigo-50 text-indigo-700 rounded-xl">
                                <span className="text-xs font-bold uppercase">{format(date, 'EEE', { locale: vi })}</span>
                                <span className="text-xl font-black leading-none">{format(date, 'dd')}</span>
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] px-1.5 py-0 h-4">
                                        {session.class_name}
                                    </Badge>
                                    {isToday && (
                                        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 text-[10px] px-1.5 py-0 h-4">
                                            Hôm nay
                                        </Badge>
                                    )}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm truncate">
                                    {session.topic || `Buổi ${session.session_number}`}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                </p>

                                {session.attendance_status && session.attendance_status !== 'unrecorded' && (
                                    <div className="mt-2">
                                        {session.attendance_status === 'present' && (
                                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] py-0" variant="outline">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Đã đi học
                                            </Badge>
                                        )}
                                        {session.attendance_status === 'absent' && (
                                            <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] py-0" variant="outline">
                                                <XCircle className="w-3 h-3 mr-1" /> Vắng mặt
                                            </Badge>
                                        )}
                                        {session.attendance_status === 'excused' && (
                                            <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] py-0" variant="outline">
                                                <Clock className="w-3 h-3 mr-1" /> Có phép
                                            </Badge>
                                        )}
                                    </div>
                                )}
                                {session.attendance_status === 'unrecorded' && date < today && (
                                    <div className="mt-2">
                                        <Badge className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] py-0" variant="outline">
                                            Chưa điểm danh
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>

                        {hasHomework && (
                            <div className="mt-3 bg-gradient-to-r from-amber-50 to-yellow-50/30 rounded-lg p-3 border border-amber-200/60">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-bold text-amber-800 block mb-1">CÓ BÀI TẬP VỀ NHÀ!</span>
                                        <p className="text-xs text-amber-900/80 break-words whitespace-pre-wrap">
                                            {session.homework}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
