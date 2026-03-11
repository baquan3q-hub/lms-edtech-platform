import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import StudentFeedbackClient from "./StudentFeedbackClient";

export default async function StudentFeedbackPage({ params }: { params: Promise<{ id: string; examId: string }> }) {
    const { id: classId, examId } = await params;

    // Lấy tên bài kiểm tra
    const adminSupabase = createAdminClient();
    const { data: exam } = await adminSupabase
        .from("exams")
        .select("title")
        .eq("id", examId)
        .single();

    return (
        <div className="max-w-2xl mx-auto pb-12 animate-in fade-in duration-500">
            <Link href={`/student/classes/${classId}`} className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại lớp học
            </Link>

            <div className="mb-6">
                <h1 className="text-xl font-extrabold text-slate-900">📝 Nhận xét bài kiểm tra</h1>
                <p className="text-sm text-slate-500 mt-1">{exam?.title || "Bài kiểm tra"}</p>
            </div>

            <StudentFeedbackClient
                examId={examId}
                classId={classId}
                examTitle={exam?.title || ""}
            />
        </div>
    );
}
