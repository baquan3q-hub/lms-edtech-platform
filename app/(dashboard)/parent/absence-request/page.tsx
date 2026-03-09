import { createClient } from "@/lib/supabase/server";
import AbsenceRequestListClient from "./AbsenceRequestListClient";
import { redirect } from "next/navigation";

export default async function AbsenceRequestPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <AbsenceRequestListClient parentId={user.id} />
        </div>
    );
}
