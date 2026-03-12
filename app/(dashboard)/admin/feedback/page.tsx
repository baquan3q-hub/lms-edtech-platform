import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminFeedbackClient from "@/app/(dashboard)/admin/feedback/AdminFeedbackClient";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
    if (userData?.role !== "admin") redirect("/");

    return <AdminFeedbackClient />;
}
