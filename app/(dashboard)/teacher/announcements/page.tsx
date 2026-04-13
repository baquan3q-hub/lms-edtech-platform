import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeacherAnnouncementsClient from "./TeacherAnnouncementsClient";

export default async function TeacherAnnouncementsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();

    // Lấy danh sách lớp mà GV dạy
    const { data: classes } = await adminSupabase
        .from("classes")
        .select("id, name, course:courses(name)")
        .eq("teacher_id", user.id)
        .order("name");

    return <TeacherAnnouncementsClient classes={classes || []} />;
}
