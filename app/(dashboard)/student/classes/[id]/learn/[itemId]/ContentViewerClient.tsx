"use client";

import { useEffect, useState } from "react";
import { FileText, Music, ClipboardList, MessageSquare, VideoIcon, Youtube, Download, CheckCircle, Clock, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuizViewerClient from "./QuizViewerClient";
import RealtimeDiscussion from "@/components/shared/RealtimeDiscussion";
import { createClient } from "@/lib/supabase/client";

import { useRouter } from "next/navigation";
import { markItemCompleted } from "../../actions";

// Helper: extract YouTube video ID from URL
function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
    return match ? match[1] : null;
}

export default function ContentViewerClient({
    item,
    contentData,
    classId,
    progress,
    nextItemId,
    prevItemId
}: {
    item: any;
    contentData: any;
    classId: string;
    progress: any;
    nextItemId: string | null;
    prevItemId: string | null;
}) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isCompleted = progress?.status === 'completed';

    if (!item) return null;

    // Helper render iframe cho document/file
    const renderDocumentFrame = (url: string) => {
        if (!url) return <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-xl">Chưa có liên kết tài liệu.</div>;

        let embedUrl = url;

        // Google Drive → preview mode
        if (url.includes("drive.google.com/file/d/")) {
            embedUrl = url.replace(/\/view.*$/, "/preview");
        }

        // Check if it's a PDF (from Supabase Storage or direct link)
        const isPDF = url.toLowerCase().endsWith('.pdf') || url.includes('/lesson-files/') && url.includes('.pdf');

        // Check if it's a Supabase Storage URL (non-PDF docs like DOCX, PPTX)
        const isSupabaseFile = url.includes('supabase.co/storage');
        const isOfficeDoc = /\.(docx?|pptx?|xlsx?)(\?|$)/i.test(url);

        return (
            <div className="space-y-3">
                <div className="w-full h-[600px] border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex flex-col relative">
                    {isPDF ? (
                        // PDF viewer via object tag (works for Supabase Storage PDFs)
                        <object
                            data={url}
                            type="application/pdf"
                            className="w-full h-full flex-1"
                        >
                            <iframe
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                                className="w-full h-full flex-1"
                                allowFullScreen
                            />
                        </object>
                    ) : isOfficeDoc && isSupabaseFile ? (
                        // Office docs from Supabase → use Google Docs Viewer
                        <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                            className="w-full h-full flex-1"
                            allowFullScreen
                        />
                    ) : (
                        // Google Drive, OneDrive,etc → direct iframe
                        <iframe
                            src={embedUrl}
                            className="w-full h-full flex-1"
                            allowFullScreen
                        />
                    )}
                    {/* Download button */}
                    <div className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <Button variant="secondary" size="sm" className="shadow-lg font-semibold h-9">
                                <Download className="w-4 h-4 mr-2" /> Mở tab mới
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Fallback download link */}
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm text-slate-600 flex-1">Nếu không xem được, hãy tải về:</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Tải về
                        </Button>
                    </a>
                </div>
            </div>
        );
    };

    // Helper render video (YouTube/Vimeo embed hoặc HTML5 video)
    const renderVideo = (url: string) => {
        if (!url) return <div className="flex items-center justify-center w-full h-full text-slate-500">Chưa có Link Video.</div>;

        const ytId = getYouTubeId(url);
        if (ytId) {
            return (
                <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${ytId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video bài giảng"
                />
            );
        }

        // Vimeo support
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) {
            return (
                <iframe
                    className="w-full h-full"
                    src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Video bài giảng"
                />
            );
        }

        // HTML5 video for uploaded files or direct links
        return (
            <video
                controls
                className="w-full h-full object-contain"
                src={url}
                onEnded={async () => {
                    // Auto-mark as completed when video finishes
                    if (!isCompleted) {
                        await markItemCompleted(classId, item.id);
                        router.refresh();
                    }
                }}
                onError={() => {
                    console.error('Video load error:', url);
                }}
            >
                Trình duyệt của bạn không hỗ trợ phát video.
            </video>
        );
    };

    const renderContentByType = () => {
        switch (item.type) {
            case 'video':
                return (
                    <div className="bg-black aspect-video rounded-xl overflow-hidden shadow-xl mb-6 relative">
                        {contentData?.video_url ? (
                            renderVideo(contentData.video_url)
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-slate-500">
                                Chưa có Link Video.
                            </div>
                        )}
                    </div>
                );

            case 'document':
                return (
                    <div className="mb-6">
                        {renderDocumentFrame(contentData?.file_url)}
                    </div>
                );

            case 'audio':
                return (
                    <div className="mb-6 p-6 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                        {contentData?.file_url ? (
                            <audio controls className="w-full max-w-lg" src={contentData.file_url}>
                                Trình duyệt của bạn không hỗ trợ audio element.
                            </audio>
                        ) : (
                            <div className="text-slate-500">Chưa có file Audio.</div>
                        )}
                    </div>
                );

            case 'zoom':
                return (
                    <div className="mb-6 p-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl shadow-lg border border-sky-400 text-center text-white">
                        <VideoIcon className="w-16 h-16 mx-auto mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold mb-2">Phòng học trực tuyến</h3>
                        <p className="text-sky-100 mb-6 max-w-md mx-auto">Nhấn vào nút bên dưới để mở Zoom / Google Meet và tham gia buổi học cùng giáo viên.</p>
                        {contentData?.zoom_link ? (
                            <a href={contentData.zoom_link} target="_blank" rel="noopener noreferrer">
                                <Button size="lg" className="bg-white text-sky-600 hover:bg-slate-50 font-bold px-8 shadow-xl">
                                    Tham Gia Ngay
                                </Button>
                            </a>
                        ) : (
                            <div className="text-sky-200">Giáo viên chưa cập nhật link phòng học.</div>
                        )}
                    </div>
                );

            case 'assignment':
                return (
                    <div className="mb-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="flex items-start justify-between border-b pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                    <ClipboardList className="w-5 h-5 mr-2 text-orange-500" /> Bài Tập Về Nhà
                                </h3>
                                {contentData?.deadline && (
                                    <p className="text-sm font-medium text-rose-500 mt-1 flex items-center">
                                        <Clock className="w-4 h-4 mr-1" /> Hạn chót: {new Date(contentData.deadline).toLocaleString('vi-VN')}
                                    </p>
                                )}
                            </div>
                            {contentData?.file_url && (
                                <a href={contentData.file_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                        <Download className="w-4 h-4 mr-2" /> Tải đề bài
                                    </Button>
                                </a>
                            )}
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl flex flex-col items-center justify-center text-center">
                            <CheckCircle className="w-12 h-12 text-slate-300 mb-3" />
                            <h4 className="font-semibold text-slate-700">Khu vực Nộp bài</h4>
                            <p className="text-sm text-slate-500 mb-4 max-w-sm">Chức năng upload file nộp bài cho học viên đang được phát triển.</p>
                            <Button disabled className="bg-slate-800 text-white">
                                Nộp bài (Coming Soon)
                            </Button>
                        </div>
                    </div>
                );

            case 'quiz':
                return (
                    <QuizViewerClient
                        classId={classId}
                        itemId={item.id}
                        contentData={contentData}
                        nextItemId={nextItemId}
                        progress={progress}
                    />
                );

            case 'discussion':
                return (
                    <div className="mb-6">
                        <div className="mb-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center mb-2">
                                <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" /> Thảo Luận Lớp
                            </h3>
                            <p className="text-slate-600 text-sm">Trao đổi và đặt câu hỏi trực tiếp với giáo viên và các bạn học trong lớp về chủ đề này.</p>
                        </div>

                        <DiscussionWrapper itemId={item.id} classId={classId} />
                    </div>
                )

            default:
                return null;
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            {/* H1 Title */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md self-start">
                        {item.type}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {item.title}
                    </h1>
                </div>
            </div>

            {/* Dynamic Content Types */}
            {renderContentByType()}

            {/* Text description (HTML theory) - Always at bottom or below media */}
            {contentData?.content && (
                <div className="prose prose-slate max-w-none text-slate-700 mt-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    {contentData.content.split('\n').map((paragraph: string, idx: number) => (
                        <p key={idx} className="mb-4 last:mb-0">{paragraph}</p>
                    ))}
                </div>
            )}

            {/* Footer with Mark Complete & Navigation */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center">
                <Button
                    variant="outline"
                    className="text-slate-600 border-slate-300"
                    disabled={!prevItemId}
                    onClick={() => prevItemId && router.push(`/student/classes/${classId}/learn/${prevItemId}`)}
                >
                    Bài trước
                </Button>

                <div className="flex gap-3">
                    {item.type !== 'quiz' && (
                        <Button
                            className={`${isCompleted ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-semibold`}
                            disabled={isSubmitting}
                            onClick={async () => {
                                if (!isCompleted) {
                                    setIsSubmitting(true);
                                    const result = await markItemCompleted(classId, item.id);
                                    if (result?.success) {
                                        // Optional: Add toast here if a toast library is available in the project, e.g., toast.success("Đã hoàn thành bài học")
                                    }
                                    setIsSubmitting(false);
                                }
                                if (nextItemId) {
                                    router.push(`/student/classes/${classId}/learn/${nextItemId}`);
                                } else {
                                    // Navigate back to the course overview if it's the last item
                                    router.push(`/student/classes/${classId}`);
                                }
                            }}
                        >
                            {isSubmitting ? "Đang xử lý..." : isCompleted ? (nextItemId ? "Bài tiếp theo" : "Đã hoàn thành khóa học") : "Đánh dấu đã học & Đi tiếp"}
                        </Button>
                    )}

                    {item.type === 'quiz' && nextItemId && (
                        <Button
                            variant="secondary"
                            onClick={() => router.push(`/student/classes/${classId}/learn/${nextItemId}`)}
                        >
                            Bỏ qua & Bài tiếp theo
                        </Button>
                    )}
                    {item.type === 'quiz' && !nextItemId && (
                        <Button
                            variant="secondary"
                            onClick={() => router.push(`/student/classes/${classId}`)}
                        >
                            Đóng
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Wrapper component to load current user details on client side
function DiscussionWrapper({ itemId, classId }: { itemId: string; classId: string }) {
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        async function fetchUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('id, full_name, avatar_url, role')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUser(profile);
                } else {
                    // Fallback
                    setUser({
                        id: session.user.id,
                        full_name: session.user.email?.split('@')[0] || "Học viên",
                        role: 'student'
                    });
                }
            }
        }
        fetchUser();
    }, [supabase]);

    if (!user) {
        return <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-2xl animate-pulse">Đang kết nối phòng thảo luận...</div>;
    }

    return <RealtimeDiscussion itemId={itemId} classId={classId} currentUser={user} />;
}
