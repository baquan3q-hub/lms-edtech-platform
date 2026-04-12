import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchAdminGradeOverview } from "@/lib/actions/admin-grades";
import AdminGradesClient from "./AdminGradesClient";

export const dynamic = "force-dynamic";

export default async function AdminGradesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data, error } = await fetchAdminGradeOverview();

    return (
        <div>
            <AdminGradesClient data={data} />
        </div>
    );
}
