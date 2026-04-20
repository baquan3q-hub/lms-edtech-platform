import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentGoalsClient from "./StudentGoalsClient";

export const revalidate = 0;

export default async function StudentGoalsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) redirect("/login");

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <StudentGoalsClient studentId={user.id} />
        </div>
    );
}
