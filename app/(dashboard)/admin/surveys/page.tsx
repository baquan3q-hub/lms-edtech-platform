import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSurveysClient from "./AdminSurveysClient";

export default async function AdminSurveysPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return <AdminSurveysClient />;
}
