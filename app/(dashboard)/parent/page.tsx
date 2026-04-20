// Trigger recompile to fix hydration mismatch
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import ParentDashboardClient from "./ParentDashboardClient";

export const dynamic = "force-dynamic";

export default async function ParentDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const adminSupabase = createAdminClient();

    // Lấy danh sách con em đã liên kết
    const { data: links } = await adminSupabase
        .from("parent_students")
        .select("id, student_id, relationship, is_primary")
        .eq("parent_id", user.id);

    const studentIds = (links || []).map(l => l.student_id);

    let students: any[] = [];
    if (studentIds.length > 0) {
        const { data } = await adminSupabase
            .from("users")
            .select("id, full_name, email, avatar_url")
            .in("id", studentIds);
        students = data || [];
    }

    // Enrich with relationship + class info
    const enrichedStudents = students.map(s => {
        const link = (links || []).find(l => l.student_id === s.id);
        return {
            ...s,
            linkId: link?.id,
            relationship: link?.relationship || "Phụ huynh",
        };
    });

    return <ParentDashboardClient students={enrichedStudents} />;
}
