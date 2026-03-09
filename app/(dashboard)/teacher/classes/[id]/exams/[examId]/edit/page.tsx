import { createAdminClient } from "@/lib/supabase/admin";
import ExamEditorClient from "../../ExamEditorClient";

export default async function EditExamPage({ params }: { params: Promise<{ id: string; examId: string }> }) {
    const { id: classId, examId } = await params;

    const supabase = createAdminClient();
    const { data: exam } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

    if (!exam) {
        return <div className="p-8 text-center text-red-500">Không tìm thấy bài kiểm tra.</div>;
    }

    return <ExamEditorClient classId={classId} existingExam={exam} />;
}
