"use client";

import { useMemo } from "react";
import { Clock, MapPin, User, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ScheduleItem {
    id: string;
    class_id: string;
    room_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    note?: string;
    room?: { name: string } | null;
    class?: {
        name: string;
        course?: { name: string } | null;
        teacher?: { full_name: string } | null;
    } | null;
}

interface WeeklyTimetableProps {
    schedules: ScheduleItem[];
    emptyMessage?: string;
}

const DAYS = [
    { value: 1, label: "Thứ 2", shortLabel: "T2" },
    { value: 2, label: "Thứ 3", shortLabel: "T3" },
    { value: 3, label: "Thứ 4", shortLabel: "T4" },
    { value: 4, label: "Thứ 5", shortLabel: "T5" },
    { value: 5, label: "Thứ 6", shortLabel: "T6" },
    { value: 6, label: "Thứ 7", shortLabel: "T7" },
    { value: 0, label: "Chủ Nhật", shortLabel: "CN" },
];

export default function WeeklyTimetable({ schedules, emptyMessage = "Chưa có lịch học nào được xếp." }: WeeklyTimetableProps) {
    // Group schedules by day
    const groupedSchedules = useMemo(() => {
        const grouped: Record<number, ScheduleItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

        schedules.forEach(schedule => {
            if (grouped[schedule.day_of_week]) {
                grouped[schedule.day_of_week].push(schedule);
            }
        });

        // Sort each day by start time
        Object.keys(grouped).forEach(day => {
            const dayNum = parseInt(day);
            grouped[dayNum].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });

        return grouped;
    }, [schedules]);

    if (!schedules || schedules.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">Lịch trống</h3>
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    // Color variants based on some hash of the class name or course name
    const colors = [
        "bg-blue-50 border-blue-200 text-blue-900 border-l-blue-500",
        "bg-emerald-50 border-emerald-200 text-emerald-900 border-l-emerald-500",
        "bg-indigo-50 border-indigo-200 text-indigo-900 border-l-indigo-500",
        "bg-amber-50 border-amber-200 text-amber-900 border-l-amber-500",
        "bg-rose-50 border-rose-200 text-rose-900 border-l-rose-500",
        "bg-purple-50 border-purple-200 text-purple-900 border-l-purple-500",
        "bg-cyan-50 border-cyan-200 text-cyan-900 border-l-cyan-500",
    ];

    const getColorForClass = (classId: string) => {
        let hash = 0;
        for (let i = 0; i < classId.length; i++) {
            hash = classId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            {/* Desktop Grid View */}
            <div className="hidden lg:grid grid-cols-7 divide-x divide-slate-200 border-b border-slate-200">
                {DAYS.map(day => (
                    <div key={`header-${day.value}`} className="bg-white py-3 px-2 text-center">
                        <span className="font-bold text-slate-700">{day.label}</span>
                        {groupedSchedules[day.value]?.length > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 font-bold px-1.5 min-w-[20px]">
                                {groupedSchedules[day.value].length}
                            </Badge>
                        )}
                    </div>
                ))}
            </div>

            <div className="hidden lg:grid grid-cols-7 divide-x divide-slate-200 min-h-[500px]">
                {DAYS.map(day => (
                    <div key={`col-${day.value}`} className="bg-slate-50/50 p-3 flex flex-col gap-4">
                        {groupedSchedules[day.value]?.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center min-h-[120px]">
                                <span className="text-slate-300 text-sm font-medium">—</span>
                            </div>
                        ) : (
                            groupedSchedules[day.value].map(item => {
                                const classData = Array.isArray(item.class) ? item.class[0] : item.class;
                                const courseData = Array.isArray(classData?.course) ? classData?.course[0] : classData?.course;
                                const teacherData = Array.isArray(classData?.teacher) ? classData?.teacher[0] : classData?.teacher;
                                const roomData = Array.isArray(item.room) ? item.room[0] : item.room;

                                const colorClass = getColorForClass(item.class_id);

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-4 rounded-xl border border-l-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${colorClass}`}
                                    >
                                        <div className="font-bold text-base mb-1.5 line-clamp-2">
                                            {courseData?.name || "Khóa học"}
                                        </div>
                                        <div className="text-sm font-semibold opacity-80 mb-3 truncate">
                                            Lớp: {classData?.name || "Khuyết danh"}
                                        </div>

                                        <div className="space-y-2 mt-4 bg-white/40 p-2 rounded-lg">
                                            <div className="flex items-center text-sm font-bold text-slate-800">
                                                <Clock className="w-4 h-4 mr-2 text-slate-500" />
                                                <span>{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</span>
                                            </div>

                                            {roomData?.name && (
                                                <div className="flex items-center text-sm text-slate-700 font-medium">
                                                    <MapPin className="w-4 h-4 mr-2 text-slate-500" />
                                                    <span className="truncate">{roomData.name}</span>
                                                </div>
                                            )}

                                            {teacherData?.full_name && (
                                                <div className="flex items-center text-sm text-slate-700">
                                                    <User className="w-4 h-4 mr-2 text-slate-500" />
                                                    <span className="truncate">{teacherData.full_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {item.note && (
                                            <div className="mt-2 pt-2 border-t border-black/5 text-[10px] italic opacity-80 leading-tight line-clamp-2">
                                                "{item.note}"
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                ))}
            </div>

            {/* Mobile / Tablet List View */}
            <div className="lg:hidden flex flex-col divide-y divide-slate-200">
                {DAYS.map(day => {
                    const daySchedules = groupedSchedules[day.value];
                    if (daySchedules?.length === 0) return null; // Hide empty days on mobile

                    return (
                        <div key={`mob-${day.value}`} className="bg-white">
                            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                                <h4 className="font-bold text-slate-800">{day.label}</h4>
                                <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-300">{daySchedules.length} ca học</Badge>
                            </div>
                            <div className="p-4 space-y-4">
                                {daySchedules.map(item => {
                                    const classData = Array.isArray(item.class) ? item.class[0] : item.class;
                                    const courseData = Array.isArray(classData?.course) ? classData?.course[0] : classData?.course;
                                    const teacherData = Array.isArray(classData?.teacher) ? classData?.teacher[0] : classData?.teacher;
                                    const roomData = Array.isArray(item.room) ? item.room[0] : item.room;

                                    const colorClass = getColorForClass(item.class_id);

                                    return (
                                        <div
                                            key={`mob-item-${item.id}`}
                                            className={`p-4 rounded-xl border-l-4 shadow-sm flex flex-col sm:flex-row gap-4 ${colorClass.replace('bg-', 'bg-white hover:bg-')}`}
                                        >
                                            <div className="shrink-0 sm:w-28 flex flex-col border-b sm:border-b-0 sm:border-r border-black/10 pb-3 sm:pb-0 sm:pr-4">
                                                <span className="text-xl font-black">{item.start_time.substring(0, 5)}</span>
                                                <span className="text-sm font-medium opacity-60">đến {item.end_time.substring(0, 5)}</span>
                                                {roomData?.name && (
                                                    <Badge variant="outline" className="mt-2 w-fit bg-white/50 border-black/20 text-black/70">
                                                        {roomData.name}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <h5 className="font-bold text-base mb-1">{courseData?.name || "Khóa học"}</h5>
                                                <p className="text-sm font-semibold opacity-80 mb-3">Lớp: {classData?.name || "Khuyết danh"}</p>

                                                {teacherData?.full_name && (
                                                    <div className="flex items-center text-sm mb-1">
                                                        <User className="w-4 h-4 mr-2 opacity-70" />
                                                        <span>GV: {teacherData.full_name}</span>
                                                    </div>
                                                )}

                                                {item.note && (
                                                    <div className="mt-3 pt-3 border-t border-black/5 text-xs italic opacity-80 bg-black/5 p-2 rounded">
                                                        Ghi chú: {item.note}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
