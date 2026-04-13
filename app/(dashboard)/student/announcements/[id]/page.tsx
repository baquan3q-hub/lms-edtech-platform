import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Bell, Calendar, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

export default async function StudentAnnouncementDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: announcement } = await supabase
        .from("announcements")
        .select("*, classes(name), author_id")
        .eq("id", id)
        .single();

    if (!announcement) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
            <Link href="/student" className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại Tổng quan
            </Link>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-8 sm:p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="relative z-10 flex flex-col items-start gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                            <Bell className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight drop-shadow-md">
                            {announcement.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-amber-50 text-sm font-medium">
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

                {/* Content Section */}
                <div className="p-8 sm:p-10 text-slate-700 leading-relaxed prose prose-slate max-w-none">
                    {/* Render as markdown in case there are links or basic formatting */}
                    <ReactMarkdown>
                        {announcement.content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
