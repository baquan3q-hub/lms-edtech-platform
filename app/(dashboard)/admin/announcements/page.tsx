import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminAnnouncementsClient from "./AdminAnnouncementsClient";

export default async function AdminAnnouncementsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return <AdminAnnouncementsClient />;
}
