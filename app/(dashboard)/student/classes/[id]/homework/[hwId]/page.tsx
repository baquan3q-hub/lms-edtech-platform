import { fetchHomeworkDetail } from "@/lib/actions/homework";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import HomeworkSubmitClient from "./HomeworkSubmitClient";

export default async function StudentHomeworkPage({ params }: { params: Promise<{ id: string; hwId: string }> }) {
    const { id: classId, hwId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: homework, error } = await fetchHomeworkDetail(hwId);

    if (error || !homework) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p className="font-medium">Bài tập không tồn tại hoặc đã bị xóa.</p>
                <Link href={`/student/classes/${classId}`} className="text-blue-600 underline mt-4 inline-block">
                    Quay lại lớp
                </Link>
            </div>
        );
    }

    // Fetch existing submission
    const adminSupabase = createAdminClient();
    const { data: submission } = await adminSupabase
        .from("homework_submissions")
        .select("*")
        .eq("homework_id", hwId)
        .eq("student_id", user.id)
        .maybeSingle();

    return <HomeworkSubmitClient homework={homework} existingSubmission={submission} classId={classId} />;
}
