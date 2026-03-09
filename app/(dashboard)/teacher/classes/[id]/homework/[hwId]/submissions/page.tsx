import { fetchHomeworkSubmissions } from "@/lib/actions/homework";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SubmissionsClient from "./SubmissionsClient";

export default async function HomeworkSubmissionsPage({ params }: { params: Promise<{ id: string; hwId: string }> }) {
    const { id: classId, hwId } = await params;

    const { data, error } = await fetchHomeworkSubmissions(hwId);

    if (error || !data) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p>Không thể tải dữ liệu bài nộp.</p>
                <Link href={`/teacher/classes/${classId}`} className="text-blue-600 underline mt-4 inline-block">
                    Quay lại lớp
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link
                href={`/teacher/classes/${classId}`}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors w-fit"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại lớp học
            </Link>

            <SubmissionsClient homework={data.homework} submissions={data.submissions} classId={classId} />
        </div>
    );
}
