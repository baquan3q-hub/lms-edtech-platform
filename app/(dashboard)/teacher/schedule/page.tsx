import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchTeacherAllSessions } from "@/lib/actions/schedule";
import TeacherScheduleOverviewClient from "./TeacherScheduleOverviewClient";

export const dynamic = "force-dynamic";

export default async function TeacherSchedulePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch aggregated sessions across all classes
    const { data: sessions, classes: teacherClasses, schedules: weeklySchedules, error } = await fetchTeacherAllSessions(user.id);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TeacherScheduleOverviewClient
                sessions={sessions || []}
                teacherClasses={teacherClasses || []}
                weeklySchedules={weeklySchedules || []}
                error={error}
            />
        </div>
    );
}
