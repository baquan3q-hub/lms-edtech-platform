import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ParentSurveysClient from "./ParentSurveysClient";

export default async function ParentSurveysPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();

    // Lấy danh sách con
    const { data: children } = await adminSupabase
        .from("parent_students")
        .select("student_id, student:users!parent_students_student_id_fkey(id, full_name)")
        .eq("parent_id", user.id);

    const studentIds = children?.map((c: any) => c.student_id) || [];

    return <ParentSurveysClient studentIds={studentIds} />;
}
