import { fetchStudentLessonDetails } from "@/lib/actions/student";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, FileText, Download, PlayCircle, Target, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StudentLessonPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data, error } = await fetchStudentLessonDetails(id);

    if (error || !data || !data.lesson) {
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-200 mt-8 max-w-2xl mx-auto">
                <h2>Bài giảng không tồn tại hoặc bạn không có quyền truy cập.</h2>
                <Link href="/student" className="underline mt-2 inline-block">Về trang chủ</Link>
            </div>
        );
    }

    const { lesson, assignments } = data;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto space-y-6 pb-12">

            {/* Nav */}
            <Link
                href={`/student/classes/${lesson.class_id}`}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit pt-2"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Về Lộ trình lớp {lesson.class?.name || "học"}
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Video & Text) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* VIDEO PLAYER SECTION */}
                    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 relative">
                        {lesson.video_url ? (
                            <div className="aspect-video w-full">
                                {lesson.video_url.includes("youtube") ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={lesson.video_url.replace("watch?v=", "embed/")}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                    ></iframe>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-800">
                                        <PlayCircle className="w-16 h-16 text-indigo-400 mb-4 opacity-80" />
                                        <h3 className="text-white text-lg font-bold mb-2">Video Bài Giảng Mở Rộng</h3>
                                        <p className="text-slate-400 text-sm mb-6 max-w-sm">Dữ liệu video được lưu trữ tại máy chủ nền tảng khác. Vui lòng nhấn vào nút bên dưới để xem.</p>
                                        <a href={lesson.video_url} target="_blank" rel="noreferrer">
                                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8">
                                                Mở cửa sổ xem video
                                            </Button>
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-video w-full flex flex-col items-center justify-center bg-slate-800">
                                <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
                                <h3 className="text-slate-300 text-lg font-bold">Bài giảng không có video</h3>
                            </div>
                        )}

                        {/* Title overlay on video bottom */}
                        <div className="bg-slate-900 p-6 border-t border-slate-800">
                            <Badge className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-none mb-3">
                                {lesson.class?.course?.name}
                            </Badge>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                                {lesson.title}
                            </h1>
                            {lesson.created_at && (
                                <p className="text-slate-400 mt-2 flex items-center text-sm font-medium">
                                    <Clock className="w-4 h-4 mr-2" /> Đăng ngày {new Date(lesson.created_at).toLocaleDateString('vi-VN')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* LÝ THUYẾT SECTION */}
                    {lesson.content && (
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center border-b border-slate-100 pb-4">
                                <FileText className="w-6 h-6 mr-2 text-indigo-500" /> Lý thuyết trọng tâm
                            </h3>
                            <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-900 prose-a:text-indigo-600">
                                {lesson.content.split('\\n').map((paragraph: string, idx: number) => (
                                    <p key={idx} className="whitespace-pre-wrap text-slate-700 text-[15px]">{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar (Tài liệu & Bài tập) */}
                <div className="lg:col-span-1 space-y-6">

                    {/* FILES & ATTACHMENTS */}
                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100/50">
                        <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center">
                            <Download className="w-5 h-5 mr-2 text-emerald-600" />
                            Tài nguyên học tập
                        </h3>

                        {lesson.attachments && Array.isArray(lesson.attachments) && lesson.attachments.length > 0 ? (
                            <div className="space-y-3">
                                {lesson.attachments.map((att: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200/60 hover:border-emerald-400 hover:shadow-sm transition-all group"
                                    >
                                        <div className="flex items-center min-w-0 pr-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <p className="font-semibold text-slate-700 text-sm truncate group-hover:text-emerald-700 transition-colors">
                                                {att.title || "Tài liệu đính kèm"}
                                            </p>
                                        </div>
                                        <Download className="w-4 h-4 text-emerald-500 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-4 bg-white/50 rounded-xl rounded-2xl border border-dashed border-emerald-200">
                                <p className="text-sm text-emerald-600/70">Không có file đính kèm</p>
                            </div>
                        )}
                    </div>

                    {/* ASSIGNMENTS / QUIZ */}
                    <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100/50">
                        <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center">
                            <Target className="w-5 h-5 mr-2 text-indigo-600" />
                            Bài tập / Thực hành
                        </h3>

                        {assignments && assignments.length > 0 ? (
                            <div className="space-y-3">
                                {assignments.map((asm: any) => (
                                    <div key={asm.id} className="bg-white p-4 rounded-xl border border-indigo-200 hover:border-indigo-400 transition-all hover:shadow-md group">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className={`text-[10px] ${asm.type === 'quiz' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                {asm.type === 'quiz' ? 'Trắc nghiệm AI' : 'Tự luận'}
                                            </Badge>
                                            <span className="text-[11px] font-bold text-slate-500 flex items-center bg-slate-100 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Mới
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-indigo-700 transition-colors">
                                            {asm.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 mb-3 font-medium">
                                            Deadline: {asm.deadline ? new Date(asm.deadline).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                                        </p>
                                        <Link href={`#`} className="w-full">
                                            <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold h-8 rounded-lg">
                                                {/* TODO: Route to assignment taking page later */}
                                                Bắt đầu làm bài
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-6 bg-white/50 rounded-xl rounded-2xl border border-dashed border-indigo-200">
                                <p className="text-sm text-indigo-600/70">Bài kiểm tra sẽ được cập nhật sau.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
