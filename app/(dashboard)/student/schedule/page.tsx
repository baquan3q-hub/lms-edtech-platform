import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getStudentWeeklySchedule, getOwnStudentSchedule } from "@/lib/actions/schedule";
import StudentScheduleClient from "./StudentScheduleClient";

export const dynamic = "force-dynamic";

export default async function StudentSchedulePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Role check and student details are handled by layout, but we fetch schedule here
    // Fetch fixed weekly schedule
    const { data: scheduleData } = await getStudentWeeklySchedule();

    // Fetch specific generated sessions and attendance
    const { data: sessionsData } = await getOwnStudentSchedule();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Lịch học cố định
                </h1>
                <p className="text-slate-500 font-medium">
                    Thời khóa biểu hàng tuần của bạn. Học sinh hãy chú ý theo dõi lịch học để tham gia đúng giờ.
                </p>
            </div>

            <StudentScheduleClient
                initialSchedules={scheduleData || []}
                sessions={sessionsData || []}
            />
        </div>
    );
}
