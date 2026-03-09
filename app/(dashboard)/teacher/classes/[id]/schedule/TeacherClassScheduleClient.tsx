"use client";

import { useState } from "react";
import { format, isSameMonth, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, List, Eye, Edit, Trash2, Video, FileText, CheckCircle2, Clock, XCircle, File } from "lucide-react";
import { toast } from "sonner";
import { updateClassSession } from "@/lib/actions/class-sessions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";

import SessionEditSheet from "./SessionEditSheet";
import Link from "next/link";

interface ClassSession {
    id: string;
    class_id: string;
    session_number: number;
    session_date: string;
    start_time: string;
    end_time: string;
    topic: string | null;
    description: string | null;
    materials_url: string[] | null;
    homework: string | null;
    status: string;
    cancel_reason: string | null;
    teacher_notes: string | null;
}

interface TeacherClassScheduleClientProps {
    classId: string;
    initialSessions: ClassSession[];
}

export default function TeacherClassScheduleClient({ classId, initialSessions }: TeacherClassScheduleClientProps) {
    const [sessions, setSessions] = useState<ClassSession[]>(initialSessions);
    const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    // Sheet state
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'scheduled': return { label: 'Sắp tới', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200', icon: <Clock className="w-3 h-3 mr-1" /> };
            case 'ongoing': return { label: 'Đang diễn ra', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200', icon: <Video className="w-3 h-3 mr-1" /> };
            case 'completed': return { label: 'Đã hoàn thành', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> };
            case 'cancelled': return { label: 'Đã hủy', color: 'bg-red-100 text-red-700', border: 'border-red-200', icon: <XCircle className="w-3 h-3 mr-1" /> };
            default: return { label: 'Chưa rõ', color: 'bg-slate-100 text-slate-700', border: 'border-slate-200', icon: null };
        }
    };

    const handleEditSession = (session: ClassSession) => {
        setEditingSession(session);
        setIsSheetOpen(true);
    };

    const handleSaveSession = async (sessionId: string, data: any) => {
        const result = await updateClassSession(sessionId, data, classId);
        if (result.success && result.data) {
            setSessions(prev => prev.map(s => s.id === sessionId ? result.data as ClassSession : s));
            toast.success("Đã cập nhật nội dung buổi học");
            setIsSheetOpen(false);
            setEditingSession(null);
        } else {
            toast.error(result.error || "Lỗi khi lưu buổi học");
        }
    };

    // Helper for calendar custom rendering
    const sessionDays = sessions.map(s => parseISO(s.session_date));

    // Render logic cho từng ngày trên Calendar
    const renderDayContent = (day: Date) => {
        const sessionForDay = sessions.find(s => s.session_date === format(day, 'yyyy-MM-dd'));
        if (!sessionForDay) return null;

        let dotColor = "bg-blue-500";
        if (sessionForDay.status === 'completed') dotColor = "bg-emerald-500";
        if (sessionForDay.status === 'cancelled') dotColor = "bg-red-500";
        if (sessionForDay.status === 'ongoing') dotColor = "bg-amber-500";

        return (
            <div className="absolute bottom-1 flex justify-center w-full">
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
                <div className="flex justify-between items-center mb-6">
                    <TabsList className="bg-white border shadow-sm">
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

                <TabsContent value="calendar" className="mt-0 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-1 shadow-sm">
                            <CardContent className="p-4 flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    locale={vi}
                                    className="rounded-md"
                                    components={{
                                        // @ts-expect-error react-day-picker types changed but shadcn implementation might rely on old props
                                        DayContent: (props) => {
                                            return (
                                                <div className="relative w-full h-full flex items-center justify-center p-2">
                                                    <span>{props.date.getDate()}</span>
                                                    {renderDayContent(props.date)}
                                                </div>
                                            );
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 shadow-sm bg-slate-50 border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Chi tiết ngày: {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Chưa chọn'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedDate && (() => {
                                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                    const daySessions = sessions.filter(s => s.session_date === dateStr);

                                    if (daySessions.length === 0) {
                                        return <div className="text-center py-10 text-slate-500">Không có buổi học nào được lên lịch vào ngày này.</div>;
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {daySessions.map(session => {
                                                const status = getStatusConfig(session.status);
                                                return (
                                                    <div key={session.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-slate-800">
                                                                    Buổi {session.session_number}: {session.topic || "Chưa có chủ đề"}
                                                                </h3>
                                                                <p className="text-sm text-slate-500 flex items-center mt-1">
                                                                    <Clock className="w-4 h-4 mr-1.5" />
                                                                    {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                                </p>
                                                            </div>
                                                            <Badge className={`${status.color} bg-opacity-20 border-0 pointer-events-none`}>
                                                                {status.icon} {status.label}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-slate-600 mb-4 line-clamp-2">
                                                            {session.description || "Chưa có mô tả nội dung."}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button size="sm" variant="outline" onClick={() => handleEditSession(session)}>
                                                                <Edit className="w-4 h-4 mr-1.5" /> Sửa nội dung
                                                            </Button>
                                                            <Link href={`/teacher/classes/${classId}/attendance?date=${session.session_date}`}>
                                                                <Button size="sm" variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100">
                                                                    <List className="w-4 h-4 mr-1.5" /> Điểm danh
                                                                </Button>
                                                            </Link>
                                                        </div>
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

                <TabsContent value="list" className="mt-0 outline-none">
                    <div className="space-y-4">
                        {sessions.map(session => {
                            const status = getStatusConfig(session.status);
                            return (
                                <Card key={session.id} className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                    <div className={`h-1.5 w-full ${status.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                    <CardContent className="p-5">
                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-semibold text-indigo-600 text-sm bg-indigo-50 px-2 py-0.5 rounded">
                                                        Buổi {session.session_number}
                                                    </span>
                                                    <span className="text-sm text-slate-500 flex items-center font-medium">
                                                        <CalendarIcon className="w-4 h-4 mr-1.5" />
                                                        {format(parseISO(session.session_date), 'dd/MM/yyyy')}
                                                        <span className="mx-2">•</span>
                                                        {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-lg text-slate-800 mb-2">
                                                    {session.topic || "Chưa có chủ đề"}
                                                </h3>
                                                <p className="text-sm text-slate-600 mb-3">{session.description || "Chưa có mô tả."}</p>

                                                {/* Meta info */}
                                                <div className="flex flex-wrap gap-3 mt-3">
                                                    {session.materials_url && session.materials_url.length > 0 && (
                                                        <Badge variant="outline" className="text-slate-500 font-normal">
                                                            <FileText className="w-3 h-3 mr-1" /> {session.materials_url.length} tài liệu
                                                        </Badge>
                                                    )}
                                                    {session.homework && (
                                                        <Badge variant="outline" className="text-slate-500 font-normal">
                                                            <File className="w-3 h-3 mr-1" /> Có bài tập
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end justify-between min-w-[140px] border-l md:border-l-0 md:pl-0 pl-4 border-slate-100">
                                                <Badge className={`${status.color} bg-opacity-20 border-0 mb-4`}>
                                                    {status.icon} {status.label}
                                                </Badge>
                                                <div className="flex flex-col gap-2 w-full">
                                                    <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => handleEditSession(session)}>
                                                        <Edit className="w-4 h-4 mr-2" /> Sửa nội dung
                                                    </Button>
                                                    <Link href={`/teacher/classes/${classId}/attendance?date=${session.session_date}`} className="w-full">
                                                        <Button size="sm" variant="secondary" className="w-full justify-start bg-blue-50 text-blue-600 hover:bg-blue-100">
                                                            <List className="w-4 h-4 mr-2" /> Điểm danh
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {sessions.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-slate-700">Chưa có lịch dạy</h3>
                                <p className="text-slate-500">Lớp học này chưa được cấu hình lịch các buổi dạy cụ thể.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Sheet Edit Session */}
            {isSheetOpen && editingSession && (
                <SessionEditSheet
                    isOpen={isSheetOpen}
                    onClose={() => setIsSheetOpen(false)}
                    session={editingSession}
                    onSave={(data: any) => handleSaveSession(editingSession.id, data)}
                />
            )}
        </div>
    );
}
