"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, List, Clock, BookOpen, AlertCircle, FileText, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";
import WeeklyTimetable, { ScheduleItem } from "@/components/shared/WeeklyTimetable";

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

interface ParentScheduleClientProps {
    studentId: string;
    studentName: string;
    sessions: ClassSession[];
    weeklySchedules: ScheduleItem[];
}

export default function ParentScheduleClient({ studentId, studentName, sessions, weeklySchedules }: ParentScheduleClientProps) {
    const [viewMode, setViewMode] = useState<"weekly" | "calendar" | "list">("weekly");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const getAttendanceConfig = (status: string | null, sessionStatus: string) => {
        if (sessionStatus === 'cancelled') return { label: 'Lớp hủy', color: 'bg-red-100 text-red-700' };

        switch (status) {
            case 'present': return { label: 'Có mặt', color: 'bg-emerald-100 text-emerald-700' };
            case 'absent': return { label: 'Vắng mặt', color: 'bg-red-100 text-red-700' };
            case 'late': return { label: 'Đi trễ', color: 'bg-amber-100 text-amber-700' };
            case 'excused': return { label: 'Có phép', color: 'bg-blue-100 text-blue-700' };
            default:
                if (sessionStatus === 'completed') return { label: 'Chưa ĐD', color: 'bg-slate-100 text-slate-700' };
                return { label: 'Sắp tới', color: 'bg-slate-100 text-slate-700' };
        }
    };

    const renderDayContent = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const daySessions = sessions.filter(s => s.session_date === dateStr);

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm text-slate-600">
                        Chọn ngày để xem chi tiết buổi học và tạo đơn xin phép nghỉ.
                    </span>
                </div>
                <Link href={`/parent/absence-request/create`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Send className="w-4 h-4 mr-2" /> Xin phép nghỉ học
                    </Button>
                </Link>
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "weekly" | "calendar" | "list")}>
                <div className="flex justify-between items-center mb-6">
                    <TabsList className="bg-white border shadow-sm">
                        <TabsTrigger value="weekly" className="data-[state=active]:bg-slate-100">
                            <Clock className="w-4 h-4 mr-2" />
                            Thời khóa biểu
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-100">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Lịch (Tháng)
                        </TabsTrigger>
                        <TabsTrigger value="list" className="data-[state=active]:bg-slate-100">
                            <List className="w-4 h-4 mr-2" />
                            Danh sách
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="weekly" className="mt-0 outline-none">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">
                                Thời khóa biểu cố định
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 pl-4">
                                Lịch học hàng tuần do trung tâm sắp xếp cho con bạn.
                            </p>
                        </div>
                        <WeeklyTimetable
                            schedules={weeklySchedules || []}
                            emptyMessage="Học sinh chưa có lịch học nào. Vui lòng liên hệ trung tâm để được xếp lớp."
                        />
                    </div>
                </TabsContent>

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
                                    const daySessions = sessions.filter(s => s.session_date === dateStr);

                                    if (daySessions.length === 0) {
                                        return <div className="text-center py-10 text-slate-500">Khong có lịch học nào ngày này.</div>;
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {daySessions.map(session => {
                                                const attConfig = getAttendanceConfig(session.attendance_status, session.status);
                                                return (
                                                    <div key={session.id} className="bg-white border rounded-xl p-5 shadow-sm">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <span className="text-xs font-semibold text-indigo-600 mb-1 block uppercase tracking-wider">
                                                                    {session.class_name}
                                                                </span>
                                                                <h3 className="font-bold text-lg text-slate-800">
                                                                    Buổi {session.session_number}: {session.topic || "Nội dung đang cập nhật"}
                                                                </h3>
                                                                <p className="text-sm text-slate-500 flex items-center mt-1">
                                                                    <Clock className="w-4 h-4 mr-1.5" />
                                                                    {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                                </p>
                                                            </div>
                                                            <Badge className={`${attConfig.color} border-0`}>
                                                                {attConfig.label}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-slate-600 mb-4">
                                                            {session.description || "Chưa có mô tả chi tiết cho buổi học này."}
                                                        </div>

                                                        {session.homework && (
                                                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex gap-3 text-sm">
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
                    {sessions.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-slate-700">Chưa có lịch học</h3>
                            <p className="text-slate-500">Học sinh chưa được xếp lịch học nào.</p>
                        </div>
                    ) : (
                        sessions.map(session => {
                            const attConfig = getAttendanceConfig(session.attendance_status, session.status);
                            return (
                                <Card key={session.id} className="shadow-sm overflow-hidden">
                                    <div className={`h-1.5 w-full ${attConfig.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                    <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                                    {session.class_name}
                                                </Badge>
                                                <span className="text-sm text-slate-500 flex items-center font-medium">
                                                    <CalendarIcon className="w-4 h-4 mr-1.5" />
                                                    {format(parseISO(session.session_date), 'dd/MM/yyyy')}
                                                    <span className="mx-2">•</span>
                                                    {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-800 mb-1">
                                                Buổi {session.session_number}: {session.topic || "Chưa có chủ đề"}
                                            </h3>
                                            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{session.description || "Chưa có mô tả."}</p>

                                            {session.homework && (
                                                <div className="flex items-start gap-2 mt-3 bg-slate-50 p-2 rounded text-sm text-slate-600">
                                                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <span className="font-medium text-slate-700">BTVN:</span>
                                                    <span className="truncate">{session.homework}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end md:justify-center border-t md:border-l md:border-t-0 border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                                            <Badge className={`${attConfig.color} border-0 mb-2 py-1 px-3 text-sm rounded-full`}>
                                                {attConfig.label}
                                            </Badge>
                                            {session.attendance_notes && (
                                                <p className="text-xs text-slate-500 italic max-w-[150px] text-right">
                                                    "{session.attendance_notes}"
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
