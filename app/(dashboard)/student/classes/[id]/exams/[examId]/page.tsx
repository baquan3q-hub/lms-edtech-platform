import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchExamQuestions } from "@/lib/actions/exam";
import { redirect } from "next/navigation";
import ExamTakingClient from "./ExamTakingClient";
import { requireResourceAccess } from "@/lib/auth/authorize";
import { toStudentSubmission } from "@/lib/modules/assessment/dto";
import { notFound } from "next/navigation";

export default async function StudentExamPage({ params }: { params: Promise<{ id: string; examId: string }> }) {
    const { id: classId, examId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const access = await requireResourceAccess("exams", examId, "read");
    if (access.resource.class_id !== classId || access.role !== "student") notFound();

    // Kiểm tra đã nộp chưa
    const adminSupabase = createAdminClient();
    const { data: existingSubmission } = await adminSupabase
        .from("exam_submissions")
        .select("id, exam_id, attempt_id, answers, score, total_points, time_taken_seconds, submitted_at, grading_status")
        .eq("exam_id", examId)
        .eq("student_id", user.id)
        .order("submitted_at", { ascending: false }).limit(1).maybeSingle();

    // Lấy đề (đã strip đáp án đúng nếu chưa nộp)
    const { data: exam, error } = await fetchExamQuestions(examId, user.id);

    if (error || !exam) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200 max-w-lg mx-auto mt-12">
                <p className="font-medium text-lg">Không tìm thấy bài kiểm tra.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <ExamTakingClient
                exam={exam}
                classId={classId}
                draftOwner={`${access.schoolId}:${user.id}`}
                alreadySubmitted={existingSubmission ? toStudentSubmission(existingSubmission) : null}
            />
        </div>
    );
}
