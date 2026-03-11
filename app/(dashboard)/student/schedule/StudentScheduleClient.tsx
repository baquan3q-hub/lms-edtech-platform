"use client";

import { useState, useEffect } from "react";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, List, Clock, BookOpen, AlertCircle, CalendarDays, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import AbsenceRequestModal from "@/components/shared/AbsenceRequestModal";
import { createClient } from "@/lib/supabase/client";

interface ClassSession {
    id: string;
    class_id: string;
    class_name: string;
    course_name: string;
    session_number: number;
    session_date: string;
    start_time: string;
    end_time: string;
    topic: string | null;
    description: string | null;
    materials_url: string[] | null;
    homework: string | null;
    status: string; // teacher's session status
    attendance_status: string | null; // present, absent, late, excused
    attendance_notes: string | null;
}

interface StudentScheduleClientProps {
    sessions: ClassSession[];
    initialSchedules?: any[];
}

export default function StudentScheduleClient({ sessions, initialSchedules }: StudentScheduleClientProps) {
    const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [studentId, setStudentId] = useState<string>("");

    // Absence Request State
    const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
    const [selectedSessionForAbsence, setSelectedSessionForAbsence] = useState<{ class_id: string, class_name: string, session_date: string } | null>(null);

    const [localSessions, setLocalSessions] = useState<ClassSession[]>(sessions);

    useEffect(() => {
        const now = new Date();
        const start = startOfMonth(now);
        // generate for current and next month
        const end = endOfMonth(addMonths(now, 1));
        const days = eachDayOfInterval({ start, end });

        const generatedSessions: ClassSession[] = [];
        if (initialSchedules && initialSchedules.length > 0) {
            days.forEach(day => {
                const dayOfWeek = getDay(day); // 0 = Sunday, 1 = Monday
                const schedulesForDay = initialSchedules.filter(s => s.day_of_week === dayOfWeek);
                
                schedulesForDay.forEach(s => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    // check if a real session already exists for this class and date
                    const exists = sessions.some(realSession => 
                        realSession.class_id === s.class_id && 
                        realSession.session_date === dateStr
                    );
                    
                    if (!exists) {
                        generatedSessions.push({
                            id: `fixed-${s.id || s.class_id}-${dateStr}`,
                            class_id: s.class_id,
                            class_name: s.class?.name || (Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name) || 'Lớp học',
                            course_name: s.class?.course?.name || '',
                            session_number: 0,
                            session_date: dateStr,
                            start_time: s.start_time,
                            end_time: s.end_time,
                            topic: 'Lịch học dự kiến',
                            description: 'Giáo viên chưa tạo nội dung chi tiết cho buổi học này. Đây là lịch học cố định hàng tuần.',
                            materials_url: [],
                            homework: null,
                            status: 'scheduled',
                            attendance_status: null,
                            attendance_notes: null
                        });
                    }
                });
            });
        }

        const allSessions = [...sessions, ...generatedSessions];
        allSessions.sort((a, b) => {
            if (a.session_date !== b.session_date) return a.session_date.localeCompare(b.session_date);
            return a.start_time.localeCompare(b.start_time);
        });

        setLocalSessions(allSessions);
    }, [sessions, initialSchedules]);

    useEffect(() => {
        const fetchUserAndSubscribe = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setStudentId(user.id);
                
                // Realtime subscription for attendance
                const subscription = supabase
                    .channel('public:attendance')
                    .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'attendance', filter: `student_id=eq.${user.id}` },
                        (payload) => {
                            updateSessionAttendance(payload.new as any);
                        }
                    )
                    .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'attendance', filter: `student_id=eq.${user.id}` },
                        (payload) => {
                            updateSessionAttendance(payload.new as any);
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(subscription);
                };
            }
        };

        fetchUserAndSubscribe();
    }, []);

    const updateSessionAttendance = (newAttendance: any) => {
        setLocalSessions(prev => prev.map(session => {
            if (session.class_id === newAttendance.class_id && session.session_date === newAttendance.date) {
                return { ...session, attendance_status: newAttendance.status, attendance_notes: newAttendance.note };
            }
            return session;
        }));
    };

    const getAttendanceConfig = (status: string | null, sessionStatus: string, sessionNumber: number) => {
        if (sessionStatus === 'cancelled') return { label: 'Lớp hủy', color: 'bg-red-100 text-red-700' };

        switch (status) {
            case 'present': return { label: 'Có mặt', color: 'bg-emerald-100 text-emerald-700' };
            case 'absent': return { label: 'Vắng mặt', color: 'bg-red-100 text-red-700' };
            case 'late': return { label: 'Đi trễ', color: 'bg-amber-100 text-amber-700' };
            case 'excused': return { label: 'Có phép', color: 'bg-blue-100 text-blue-700' };
            default:
                if (sessionStatus === 'completed') return { label: 'Chưa ĐD', color: 'bg-slate-100 text-slate-700' };
                if (sessionNumber === 0) return { label: 'Dự kiến', color: 'bg-slate-100 text-slate-500 border border-slate-200' };
                return { label: 'Sắp tới', color: 'bg-indigo-50 text-indigo-700' };
        }
    };

    const handleOpenAbsenceModal = (session: ClassSession) => {
        setSelectedSessionForAbsence({
            class_id: session.class_id,
            class_name: session.class_name,
            session_date: session.session_date
        });
        setIsAbsenceModalOpen(true);
    };

    const renderDayContent = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const daySessions = localSessions.filter(s => s.session_date === dateStr);

        if (daySessions.length === 0) return null;

        return (
            <div className="absolute bottom-1 flex justify-center w-full gap-0.5 px-1">
                {daySessions.map((session, i) => {
                    if (i > 2) return null; // hide if more than 3

                    let dotColor = "bg-slate-300"; // default sắp tới
                    if (session.status === 'cancelled') dotColor = "bg-red-700";
                    else if (session.attendance_status === 'present') dotColor = "bg-emerald-500";
                    else if (session.attendance_status === 'absent') dotColor = "bg-red-500";
                    else if (session.attendance_status === 'late') dotColor = "bg-amber-500";
                    else if (session.attendance_status === 'excused') dotColor = "bg-blue-500";

                    return <div key={i} className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>;
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
                <div className="flex justify-between items-center mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    <TabsList className="bg-white border shadow-sm min-w-max">
                        <TabsTrigger value="list" className="data-[state=active]:bg-slate-100 min-h-[44px]">
                            <List className="w-4 h-4 mr-2" />
                            Danh sách
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-100 min-h-[44px]">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Lịch (Tháng)
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="calendar" className="mt-0 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-1 shadow-sm h-fit">
                            <CardContent className="p-4 flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    locale={vi}
                                    className="rounded-md"
                                    components={{
                                        // @ts-expect-error react-day-picker types changed but shadcn implementation might rely on old props
                                        DayContent: (props: any) => (
                                            <div className="relative w-full h-full flex items-center justify-center p-2">
                                                <span>{props.date.getDate()}</span>
                                                {renderDayContent(props.date)}
                                            </div>
                                        )
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 shadow-sm bg-slate-50 border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                    Lịch chi tiết: {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Chưa chọn'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedDate && (() => {
                                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                    const daySessions = localSessions.filter(s => s.session_date === dateStr);

                                    if (daySessions.length === 0) {
                                        return <div className="text-center py-10 text-slate-500">Không có cấu hình lịch học nào (buổi học) trong ngày này.</div>;
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {daySessions.map(session => {
                                                const attConfig = getAttendanceConfig(session.attendance_status, session.status, session.session_number);
                                                const isUpcoming = new Date(session.session_date) >= new Date(new Date().setHours(0, 0, 0, 0));

                                                return (
                                                    <div key={session.id} className="bg-white border rounded-xl p-5 shadow-sm">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <span className="text-xs font-semibold text-indigo-600 mb-1 block uppercase tracking-wider">
                                                                    {session.class_name}
                                                                </span>
                                                                <h3 className={`font-bold text-lg ${session.session_number === 0 ? 'text-slate-600' : 'text-slate-800'}`}>
                                                                    {session.session_number === 0 ? session.topic : `Buổi ${session.session_number}: ${session.topic || "Nội dung đang cập nhật"}`}
                                                                </h3>
                                                                <p className="text-sm text-slate-500 flex items-center mt-1">
                                                                    <Clock className="w-4 h-4 mr-1.5" />
                                                                    {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-2 items-end">
                                                                <Badge className={`${attConfig.color} border-0`}>
                                                                    {attConfig.label}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                            {session.description || "Chưa có mô tả chi tiết cho buổi học này."}
                                                        </div>

                                                        {session.homework && (
                                                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex gap-3 text-sm mt-3">
                                                                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="font-semibold text-indigo-900 mb-1">Bài tập về nhà</p>
                                                                    <p className="text-indigo-800/80 whitespace-pre-wrap">{session.homework}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="list" className="mt-0 outline-none space-y-4">
                    {localSessions.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-slate-700">Chưa có lịch học</h3>
                            <p className="text-slate-500">Bạn chưa được xếp lịch học chi tiết nào.</p>
                        </div>
                    ) : (
                        (() => {
                            const nowStr = format(new Date(), 'yyyy-MM-dd');
                            const timeStr = format(new Date(), 'HH:mm');
                            const sorted = [...localSessions].sort((a, b) => {
                                if (a.session_date !== b.session_date) return a.session_date.localeCompare(b.session_date);
                                return a.start_time.localeCompare(b.start_time);
                            });
                            const past = sorted.filter(s => s.session_date < nowStr || (s.session_date === nowStr && s.end_time < timeStr));
                            const future = sorted.filter(s => s.session_date > nowStr || (s.session_date === nowStr && s.end_time >= timeStr));
                            const mostRecentPast = past[past.length - 1];
                            const nextTwoFuture = future.slice(0, 2);
                            const nearest3 = [];
                            if (mostRecentPast) nearest3.push(mostRecentPast);
                            nearest3.push(...nextTwoFuture);

                            return nearest3.map(session => {
                                const attConfig = getAttendanceConfig(session.attendance_status, session.status, session.session_number);
                                const isUpcoming = new Date(session.session_date) >= new Date(new Date().setHours(0, 0, 0, 0));

                                return (
                                    <Card key={session.id} className="shadow-sm overflow-hidden border-l-4 transition-all hover:shadow-md" style={{ borderLeftColor: attConfig.color.includes('emerald') ? '#10b981' : attConfig.color.includes('red') ? '#ef4444' : attConfig.color.includes('amber') ? '#f59e0b' : attConfig.color.includes('blue') ? '#3b82f6' : '#6366f1' }}>
                                        <CardContent className="p-0 flex flex-col md:flex-row">
                                            {/* Cột trái: Ngày tháng */}
                                            <div className="bg-slate-50/80 md:w-56 p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center items-center text-center shrink-0">
                                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                                    {format(parseISO(session.session_date), 'EEEE', { locale: vi })}
                                                </div>
                                                <div className="text-4xl font-black text-indigo-700 mb-1">
                                                    {format(parseISO(session.session_date), 'dd')}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-500 mb-4">
                                                    Tháng {format(parseISO(session.session_date), 'MM, yyyy')}
                                                </div>
                                                <Badge variant="outline" className="bg-white px-3.5 py-1.5 text-slate-700 font-semibold border-slate-200 shadow-sm rounded-full">
                                                    <Clock className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                                                    {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                </Badge>
                                            </div>

                                            {/* Cột phải: Nội dung bài học */}
                                            <div className="flex-1 p-6 lg:p-8 flex flex-col relative justify-center">
                                                <div className="absolute top-6 right-6 flex gap-2">
                                                    <Badge className={`${attConfig.color} border-0 shadow-sm px-3 py-1 font-medium`}>
                                                        {attConfig.label}
                                                    </Badge>
                                                </div>

                                                <div className="mb-4 pr-24">
                                                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 mb-3 px-2.5 py-0.5">
                                                        Lớp: {session.class_name}
                                                    </Badge>
                                                    <h3 className={`font-extrabold text-xl mb-1.5 leading-tight ${session.session_number === 0 ? 'text-slate-600' : 'text-slate-900'}`}>
                                                        {session.session_number === 0 ? session.topic : `Buổi ${session.session_number}: ${session.topic || "Đang cập nhật chủ đề..."}`}
                                                    </h3>
                                                    {session.course_name && <p className="text-sm text-slate-500 font-medium">{session.course_name}</p>}
                                                </div>

                                                <div className="bg-slate-50/50 rounded-xl p-4 md:p-5 border border-slate-100 text-slate-700 text-sm leading-relaxed mb-2 transition-colors hover:bg-slate-50">
                                                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-indigo-500" /> Nội dung bài học (Admin giao):
                                                    </div>
                                                    <div className="text-slate-600">
                                                        {session.description || <span className="italic text-slate-400">Chưa có mô tả chi tiết bài học. Nội dung sẽ được cập nhật sau.</span>}
                                                    </div>
                                                </div>

                                                {session.homework && (
                                                    <div className="bg-indigo-50/50 p-4 md:p-5 rounded-xl border border-indigo-100 flex gap-3.5 text-sm mt-3 transition-colors hover:bg-indigo-50">
                                                        <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-bold text-indigo-900 mb-1.5">Bài tập về nhà:</p>
                                                            <p className="text-indigo-800/80 whitespace-pre-wrap leading-relaxed">{session.homework}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                        });
                    })()
                    )}
                </TabsContent>
            </Tabs>

            <AbsenceRequestModal
                isOpen={isAbsenceModalOpen}
                onClose={() => setIsAbsenceModalOpen(false)}
                session={selectedSessionForAbsence}
                studentId={studentId}
            />
        </div>
    );
}

