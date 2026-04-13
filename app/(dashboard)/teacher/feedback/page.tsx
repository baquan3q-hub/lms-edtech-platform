import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeacherFeedbackClient from "./TeacherFeedbackClient";

export default async function TeacherFeedbackPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return <TeacherFeedbackClient />;
}
