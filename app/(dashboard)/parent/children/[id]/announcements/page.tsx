import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ParentAnnouncementsClient from "./ParentAnnouncementsClient";

export const dynamic = "force-dynamic";

export default async function ParentAnnouncementsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return <ParentAnnouncementsClient studentId={id} />;
}
