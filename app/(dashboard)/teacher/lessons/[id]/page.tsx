import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Edit, FileText, Video, Trash, Plus, Link as LinkIcon, Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TeacherLessonDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Lấy thông tin bài giảng
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Back Navigation */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/teacher/lessons"
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại Quản lý Học liệu
                </Link>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-0.5">
                                Bản nháp (Đang soạn)
                            </Badge>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
                            {lesson.title}
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium text-sm">
                            Đang soạn cho lớp: <span className="text-slate-800 font-bold">{lesson.class?.name || "Ẩn danh"}</span> - Thuộc môn: {lesson.class?.course?.name}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                            <Edit className="w-4 h-4 mr-2" /> Sửa thông tin
                        </Button>
                        <Button variant="destructive" className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-none">
                            <Trash className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                            Nội dung Bài giảng
                        </h3>
                        <div className="prose prose-slate max-w-none text-slate-700">
                            {lesson.content ? (
                                <p className="whitespace-pre-wrap">{lesson.content}</p>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-500">Chưa có nội dung văn bản cho bài giảng này.</p>
                                    <Button variant="link" className="text-indigo-600 mt-2">Bấm để soạn nội dung</Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center">
                            <Video className="w-5 h-5 mr-2 text-rose-500" />
                            Video Đính kèm
                        </h3>
                        {lesson.video_url ? (
                            <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden">
                                {lesson.video_url.includes("youtube") ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={lesson.video_url.replace("watch?v=", "embed/")}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen>
                                    </iframe>
                                ) : (
                                    <a href={lesson.video_url} target="_blank" rel="noreferrer" className="text-indigo-400 underline w-full h-full flex items-center justify-center p-4 text-center break-all">
                                        Mở Link Video Bên Ngoài
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-500">Bài giảng này không có video đính kèm.</p>
                                <Button variant="link" className="text-rose-600 mt-2">Thêm đường dẫn Video</Button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center">
                            <LinkIcon className="w-5 h-5 mr-2 text-emerald-500" />
                            Tài nguyên Đính kèm (Học liệu)
                        </h3>
                        {lesson.attachments && Array.isArray(lesson.attachments) && lesson.attachments.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {lesson.attachments.map((att: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 mr-3 flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 truncate">{att.title || "Tài liệu không tên"}</p>
                                            <p className="text-xs text-slate-500 truncate group-hover:text-emerald-600">Bấm để tải về / xem</p>
                                        </div>
                                        <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 ml-2 flex-shrink-0" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-500 text-sm">Chưa có tài liệu đính kèm (Slide, PDF, File bài tập) nào tải lên.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center">
                            Bài tập & Đánh giá
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Đính kèm một bài tập hoặc tạo bộ câu hỏi trắc nghiệm (Quiz) đánh giá tự động cho bài giảng này.
                        </p>

                        <div className="space-y-3">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm p-0">
                                <Link href={`/teacher/assignments/lesson/${lesson.id}/create`} className="flex w-full h-full items-center justify-center font-medium">
                                    <Plus className="w-4 h-4 mr-2" /> Thêm Bài tập mới
                                </Link>
                            </Button>
                            <Button variant="outline" className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50 p-0">
                                <Link href={`/teacher/assignments/lesson/${lesson.id}`} className="flex w-full h-full items-center justify-center font-medium">
                                    Quản lý Bài tập đã giao
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
