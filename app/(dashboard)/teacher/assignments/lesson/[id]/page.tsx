import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAssignmentsForLesson } from "@/lib/actions/teacher";
// Component tạo bài tập (AI)
import AddAssignmentDialog from "@/app/(dashboard)/teacher/assignments/lesson/[id]/AddAssignmentDialog";
import { Badge } from "@/components/ui/badge";

export default async function TeacherLessonAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Xác thực lớp học và bài giảng
    const { data: lesson, error } = await supabase
        .from('lessons')
        .select('*, class:classes(name, course:courses(name))')
        .eq('id', id)
        .single();

    if (error || !lesson) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p className="font-medium text-lg">Không tìm thấy bài giảng</p>
                <Link href="/teacher/lessons" className="text-blue-600 underline mt-4 inline-block">Quay lại danh sách</Link>
            </div>
        );
    }

    const { data: assignments } = await fetchAssignmentsForLesson(id);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Back Navigation */}
            <div className="flex flex-col gap-4">
                <Link
                    href={`/teacher/lessons/${id}`}
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại Chi tiết Bài giảng
                </Link>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs py-0.5">
                                Quản lý Bài tập / Trắc nghiệm
                            </Badge>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-2">
                            {lesson.title}
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium text-sm">
                            {lesson.class?.name || "Ẩn danh"} - {lesson.class?.course?.name}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Gọi AI Dialog */}
                        <AddAssignmentDialog lessonId={id} classId={lesson.class_id} title={lesson.title} />
                    </div>
                </div>
            </div>

            {/* Danh sách Bài tập hiển thị ở đây */}
            {!assignments || assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center mt-6">
                    <BrainCircuit className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có bài tập nào</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">Bạn chưa tạo hoặc giao bài tập/đề thi nào cho bài giảng này. Hãy sử dụng trợ lý AI phân tích đoạn văn để tự động sinh 5 câu trắc nghiệm nhanh chóng!</p>
                    <AddAssignmentDialog lessonId={id} classId={lesson.class_id} title={lesson.title} showAsMainButton={true} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {assignments.map(a => (
                        <div key={a.id} className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{a.title}</h3>
                            <p className="text-sm text-slate-500 flex-1">{a.description || "Không có mô tả"}</p>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <Badge variant="outline" className="bg-slate-50">{a.type}</Badge>
                                <span className="text-xs text-slate-400 font-medium">Hạn chót: {a.deadline ? new Date(a.deadline).toLocaleDateString() : 'Không có'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
