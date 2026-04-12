import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchReviewsForStudent } from "@/lib/actions/student-reviews";
import { canParentViewStudent } from "@/lib/actions/parentStudent";
import ParentReviewsClient from "./ParentReviewsClient";

export const dynamic = "force-dynamic";

export default async function ParentReviewsPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const studentId = params.id;

    // Kiểm tra quyền PH
    const hasAccess = await canParentViewStudent(user.id, studentId);
    if (!hasAccess) redirect("/parent");

    const { data: reviews } = await fetchReviewsForStudent(studentId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ParentReviewsClient reviews={reviews || []} studentId={studentId} />
        </div>
    );
}
