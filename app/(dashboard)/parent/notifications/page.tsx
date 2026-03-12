import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ParentNotificationsClient from "./ParentNotificationsClient";

export const dynamic = "force-dynamic";

export default async function ParentNotificationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Lấy danh sách con em
    const { data: links } = await supabase
        .from("parent_students")
        .select("student_id, relationship, student:users!parent_students_student_id_fkey(id, full_name, email)")
        .eq("parent_id", user.id);

    const students = (links || []).map((l: any) => ({
        id: Array.isArray(l.student) ? l.student[0]?.id : l.student?.id,
        full_name: Array.isArray(l.student) ? l.student[0]?.full_name : l.student?.full_name,
        email: Array.isArray(l.student) ? l.student[0]?.email : l.student?.email,
        relationship: l.relationship,
    }));

    return <ParentNotificationsClient students={students} parentId={user.id} />;
}
