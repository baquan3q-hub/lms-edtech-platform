import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchTeacherReportData } from "@/lib/actions/student-reviews";
import TeacherReportsClient from "./TeacherReportsClient";

export const dynamic = "force-dynamic";

export default async function TeacherReportsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data, error } = await fetchTeacherReportData();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TeacherReportsClient data={data} error={error} />
        </div>
    );
}
