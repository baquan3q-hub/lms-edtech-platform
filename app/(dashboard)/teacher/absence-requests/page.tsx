import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTeacherClassIds } from "@/lib/actions/attendance";
import TeacherAbsenceRequestsClient from "./TeacherAbsenceRequestsClient";

export default async function TeacherAbsenceRequestsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: classes } = await getTeacherClassIds();
    const classIds = (classes || []).map((c: any) => c.id);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <TeacherAbsenceRequestsClient teacherClassIds={classIds} />
        </div>
    );
}
