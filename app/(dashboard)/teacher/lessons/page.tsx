import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTeacherClassesWithDetails } from "@/lib/actions/teacher";
import { BookOpen, Search, PlusCircle, Video, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import AddLessonDialog from "./AddLessonDialog"; // We will create this client component next

export default async function TeacherLessonsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Lấy danh sách Lớp học mà g/v này quản lý
    const { data: classesData, error: classesError } = await fetchTeacherClassesWithDetails();

    if (classesError) {
        return <div className="p-8 text-center text-red-500">Lỗi tải danh sách lớp học: {classesError}</div>;
    }

    if (!classesData || classesData.length === 0) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có lớp học</h3>
                <p className="text-gray-500">Bạn cần được phân công ít nhất 1 lớp học để quản lý bài giảng.</p>
            </div>
        )
    }

    // Lấy bài giảng cho tất cả các lớp - dùng admin client để bypass RLS
    const classIds = classesData.map(c => c.id);
    const adminSupabase = createAdminClient();
    const { data: allLessons } = await adminSupabase
        .from('lessons')
        .select('*, class:classes(name, course:courses(name))')
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Quản lý Bài giảng & Học liệu
                    </h2>
                    <p className="text-slate-600 mt-2 font-medium">
                        Tạo bài giảng mới và giao bài tập/quiz trắc nghiệm cho học viên.
                    </p>
                </div>

                <AddLessonDialog classes={classesData} />
            </div>

            {!allLessons || allLessons.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có bài giảng nào</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">Bạn chưa tạo bài giảng nào cho các lớp học của mình. Hãy bắt đầu bằng cách thêm bài giảng đầu tiên.</p>
                    <AddLessonDialog classes={classesData} showAsButton={true} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allLessons.map((lesson: any) => (
                        <div key={lesson.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
                                <div>
                                    <Badge variant="outline" className="mb-2 bg-white text-indigo-700 border-indigo-200 font-medium">
                                        {lesson.class?.name || "Lớp học ẩn danh"} • {lesson.class?.course?.name}
                                    </Badge>
                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2" title={lesson.title}>
                                        {lesson.title}
                                    </h3>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Video className="w-4 h-4 mr-2 text-rose-500" />
                                        <span className="truncate">{lesson.video_url ? "Có đính kèm Video" : "Không có Video"}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <ListTodo className="w-4 h-4 mr-2 text-emerald-500" />
                                        <span>Quản lý Bài tập / Quiz đính kèm</span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100 mt-auto">
                                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                                        <Link href={`/teacher/lessons/${lesson.id}`} className="flex w-full justify-center">
                                            Chi tiết Biên soạn
                                        </Link>
                                    </Button>
                                    <Button variant="outline" className="w-full mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                        <Link href={`/teacher/assignments/lesson/${lesson.id}`} className="flex w-full justify-center">
                                            Bài tập & Đề thi AI
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
