"use client";

import { CalendarDays } from "lucide-react";
import WeeklyTimetable, { ScheduleItem } from "@/components/shared/WeeklyTimetable";
import { Card, CardContent } from "@/components/ui/card";

interface WeeklyScheduleClientProps {
    initialSchedules: ScheduleItem[];
}

export default function WeeklyScheduleClient({ initialSchedules }: WeeklyScheduleClientProps) {
    return (
        <div className="space-y-6">
            <Card className="border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <CalendarDays className="w-5 h-5" />
                            Thời khóa biểu lớp học
                        </h2>
                        <p className="opacity-90 text-sm mt-1">Lịch học hàng tuần do giáo viên và trung tâm sắp xếp</p>
                    </div>
                </div>
                <CardContent className="p-6">
                    <WeeklyTimetable
                        schedules={initialSchedules}
                        emptyMessage="Bạn chưa có lịch học nào. Vui lòng liên hệ trung tâm để được xếp lớp."
                    />
                </CardContent>
            </Card>
        </div>
    );
}
