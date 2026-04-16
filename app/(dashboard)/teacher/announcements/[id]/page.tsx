import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Bell, Calendar, User, Pin } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import AnnouncementTracker from "@/components/shared/AnnouncementTracker";
import AnnouncementConfirmation from "@/components/shared/AnnouncementConfirmation";

export default async function TeacherAnnouncementDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: announcement } = await supabase
        .from("announcements")
        .select("*, classes(name), author_id")
        .eq("id", id)
        .single();

    if (!announcement) {
        notFound();
    }

    // Kiểm tra xem đã xác nhận chưa
    const { data: readInfo } = await supabase
        .from("announcement_reads")
        .select("confirmed_at")
        .eq("announcement_id", id)
        .eq("user_id", user.id)
        .single();

    const isConfirmed = !!readInfo?.confirmed_at;

    return (
        <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
            <AnnouncementTracker announcementId={id} />

            <Link href="/teacher/announcements" className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại Quản lý Thông báo
            </Link>

            <div className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden ${announcement.is_pinned ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"}`}>
                {/* Header Section */}
                <div className={`p-8 sm:p-10 text-white relative overflow-hidden ${
                    announcement.is_pinned 
                        ? "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" 
                        : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                }`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                                <Bell className="w-7 h-7 text-white" />
                            </div>
                            {announcement.is_pinned && (
                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                    <Pin className="w-3 h-3 text-yellow-300 fill-yellow-300" /> QUAN TRỌNG
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight drop-shadow-md">
                            {announcement.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-white/90 text-sm font-medium">
                            <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-lg border border-white/10">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(announcement.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {(announcement.classes as any)?.name && (
                                <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-lg border border-white/10">
                                    <User className="w-4 h-4" />
                                    <span>Lớp: {(announcement.classes as any).name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3">
                    {/* Content Section */}
                    <div className="lg:col-span-2 p-8 sm:p-10 space-y-8 border-r border-slate-100">
                        <div className="text-slate-700 leading-relaxed prose prose-slate max-w-none prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-indigo-600">
                            <ReactMarkdown>
                                {announcement.content || "*Không có nội dung chi tiết.*"}
                            </ReactMarkdown>
                        </div>

                        {/* Attachments Section */}
                        {(announcement.attachments?.length > 0 || announcement.video_url || announcement.link_url) && (
                            <div className="border-t border-slate-100 pt-8 space-y-5">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                    Tài nguyên đính kèm
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Liên kết link */}
                                    {announcement.link_url && (
                                        <a
                                            href={announcement.link_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-3 p-4 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-2xl transition-all group hover:-translate-y-1 shadow-sm"
                                        >
                                            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-xl group-hover:scale-110 transition-transform">🔗</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-extrabold text-violet-900 truncate">Liên kết bên ngoài</p>
                                                <p className="text-[11px] text-violet-500 truncate">{announcement.link_url}</p>
                                            </div>
                                        </a>
                                    )}

                                    {/* Video */}
                                    {announcement.video_url && (
                                        <a
                                            href={announcement.video_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-3 p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl transition-all group hover:-translate-y-1 shadow-sm"
                                        >
                                            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-xl group-hover:scale-110 transition-transform">🎥</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-extrabold text-rose-900 truncate">Video hướng dẫn</p>
                                                <p className="text-[11px] text-rose-500 truncate">Nhấn để xem phim</p>
                                            </div>
                                        </a>
                                    )}

                                    {/* Files */}
                                    {announcement.attachments?.map((file: any, idx: number) => {
                                        const isPdf = file.type?.includes("pdf") || file.name?.endsWith(".pdf");
                                        const isImage = file.type?.includes("image") || file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                        
                                        return (
                                            <a
                                                key={idx}
                                                href={file.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl transition-all group hover:-translate-y-1 shadow-sm"
                                            >
                                                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-xl group-hover:scale-110 transition-transform">
                                                    {isPdf ? "📄" : isImage ? "🖼️" : "📎"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-extrabold text-blue-900 truncate">{file.name}</p>
                                                    <p className="text-[11px] text-blue-500 font-medium capitalize">
                                                        {file.size < 1024 * 1024 
                                                            ? (file.size / 1024).toFixed(1) + " KB" 
                                                            : (file.size / (1024 * 1024)).toFixed(1) + " MB"}
                                                    </p>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Confirmation & Info */}
                    <div className="p-8 bg-slate-50/50 space-y-6">
                        <AnnouncementConfirmation 
                            announcementId={id} 
                            initialConfirmed={isConfirmed}
                        />

                        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Thông tin khác</h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Người gửi</p>
                                        <p className="text-sm font-bold text-slate-800">Ban quản lý hệ thống</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                        <Calendar className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Thời gian đăng</p>
                                        <p className="text-sm font-bold text-slate-800">{new Date(announcement.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} ngày {new Date(announcement.created_at).toLocaleDateString("vi-VN")}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
