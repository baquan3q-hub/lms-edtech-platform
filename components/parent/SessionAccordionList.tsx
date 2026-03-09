"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Clock, MapPin, User, CheckCircle2, CircleDashed, ChevronDown, ChevronUp } from "lucide-react";

export interface SessionItem {
    id: string;
    class_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    topic?: string;
    status: string; // 'scheduled', 'completed', 'cancelled'
    class?: {
        name: string;
        teacher?: { full_name: string } | null;
        room?: { name: string } | null; // Currently not returned directly in the query, but we can structure it if needed
    } | null;
    attendance_status?: "present" | "absent" | "excused" | "unrecorded";
}

interface SessionAccordionListProps {
    sessions: SessionItem[];
    emptyMessage?: string;
}

const getDayOfWeek = (dateString: string) => {
    const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const d = new Date(dateString);
    return days[d.getDay()];
};

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function SessionAccordionList({ sessions, emptyMessage = "Chưa có buổi học nào." }: SessionAccordionListProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Ensure sessions are sorted by date
    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
    }, [sessions]);

    // Lọc ra các buổi chưa học hoặc học đúng ngày hôm nay
    const upcomingSessions = useMemo(() => {
        const todayStr = new Date().toISOString().split("T")[0];
        return sortedSessions.filter((s) => s.session_date >= todayStr && s.status !== "completed");
    }, [sortedSessions]);

    if (!sortedSessions || sortedSessions.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">{emptyMessage}</p>
            </div>
        );
    }

    // Nổi bật 2 buổi gần nhất
    const displaySessions = isExpanded ? sortedSessions : upcomingSessions.slice(0, 2);

    return (
        <div className="w-full space-y-4">
            <Accordion type="single" collapsible className="space-y-3">
                {displaySessions.map((session) => {
                    const classData = Array.isArray(session.class) ? session.class[0] : session.class;
                    const teacherData = Array.isArray(classData?.teacher) ? classData?.teacher[0] : classData?.teacher;

                    const dayStr = getDayOfWeek(session.session_date);
                    const dateStr = formatDate(session.session_date);
                    const isCompleted = session.status === "completed" || session.attendance_status === "present" || session.attendance_status === "absent" || session.attendance_status === "excused";

                    return (
                        <AccordionItem
                            key={session.id}
                            value={session.id}
                            className={`border rounded-xl px-4 py-1 shadow-sm transition-all overflow-hidden ${isCompleted ? 'bg-slate-50/80 border-slate-200' : 'bg-white border-blue-100 hover:border-blue-300'}`}
                        >
                            <AccordionTrigger className="hover:no-underline py-3 group">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="flex-1 text-left min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-bold text-base truncate ${isCompleted ? 'text-slate-700' : 'text-blue-900'}`}>
                                                {session.topic || classData?.name || "Buổi học"}
                                            </span>
                                            {classData?.name && session.topic && (
                                                <Badge variant="outline" className="hidden sm:inline-flex shrink-0 text-[10px] uppercase font-bold text-slate-500 bg-white">
                                                    {classData.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center text-xs text-slate-500 gap-x-3 gap-y-1">
                                            <span className="font-medium whitespace-nowrap">
                                                {dayStr}, {dateStr}
                                            </span>
                                            <span className="flex items-center whitespace-nowrap">
                                                <Clock className="w-3.5 h-3.5 mr-1" />
                                                {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center">
                                        {isCompleted ? (
                                            <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                Đã học
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">
                                                Chưa học
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>

                            <AccordionContent className="text-slate-600 pt-1 pb-3">
                                <div className="mt-2 p-3 bg-white/60 rounded-lg border border-slate-100 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-start gap-2">
                                            <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Giảng viên / Lớp</p>
                                                <p className="text-sm font-medium text-slate-800">
                                                    {teacherData?.full_name || "Chưa xếp GV"}
                                                    <span className="text-slate-400 font-normal"> ({classData?.name || "Khuyết danh"})</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <CircleDashed className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Trạng thái điểm danh</p>
                                                <div className="mt-0.5">
                                                    {!session.attendance_status || session.attendance_status === "unrecorded" ? (
                                                        <span className="text-sm text-slate-500">Chưa điểm danh</span>
                                                    ) : session.attendance_status === "present" ? (
                                                        <span className="inline-flex items-center text-sm font-semibold text-emerald-600">
                                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Có mặt
                                                        </span>
                                                    ) : session.attendance_status === "absent" ? (
                                                        <span className="inline-flex items-center text-sm font-semibold text-rose-600">
                                                            Vắng mặt
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-sm font-semibold text-amber-600">
                                                            Có phép
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {!isExpanded && sortedSessions.length > displaySessions.length && (
                <div className="flex justify-center mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium"
                    >
                        Xem thêm lịch học <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}

            {isExpanded && (
                <div className="flex justify-center mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(false)}
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium"
                    >
                        Thu gọn <ChevronUp className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}
