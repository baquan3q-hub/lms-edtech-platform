import { fetchHomeworkDetail } from "@/lib/actions/homework";
import HomeworkEditorClient from "../../HomeworkEditorClient";
import Link from "next/link";

export default async function EditHomeworkPage({ params }: { params: Promise<{ id: string; hwId: string }> }) {
    const { id: classId, hwId } = await params;

    const { data: homework, error } = await fetchHomeworkDetail(hwId);

    if (error || !homework) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p>Bài tập không tồn tại hoặc đã bị xóa.</p>
                <Link href={`/teacher/classes/${classId}`} className="text-blue-600 underline mt-4 inline-block">
                    Quay lại lớp
                </Link>
            </div>
        );
    }

    return <HomeworkEditorClient classId={classId} existingHomework={homework} />;
}
