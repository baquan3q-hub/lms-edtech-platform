import { ArrowLeft, MessageSquare, AlertCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchClassDetails } from "../../actions";
import { createClient } from "@/lib/supabase/server";
import RealtimeDiscussion from "@/components/shared/RealtimeDiscussion";
import { Button } from "@/components/ui/button";

export default async function TeacherDiscussionPage({
    params
}: {
    params: Promise<{ id: string; itemId: string }>
}) {
    const resolvedParams = await params;
    const classId = resolvedParams.id;
    const itemId = resolvedParams.itemId;

    const supabase = await createClient();

    // Lấy thông tin lớp học và course item
    const [
        { data: classInfo },
        { data: courseItem },
        { data: { user } }
    ] = await Promise.all([
        fetchClassDetails(classId),
        supabase.from('course_items').select('*, content:item_contents(*)').eq('id', itemId).single(),
        supabase.auth.getUser()
    ]);

    if (!classInfo || !courseItem || courseItem.type !== 'discussion') {
        notFound();
    }

    if (!user) {
        return <div>Unauthorized</div>;
    }

    // Lấy profile thực tế để làm thông tin người gửi
    const { data: profile } = await supabase.from('users').select('id, full_name, avatar_url, role').eq('id', user.id).single();

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/teacher/classes/${classId}?tab=lessons`}>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <MessageSquare className="w-6 h-6 mr-2 text-indigo-500" />
                        Quản lý Chủ đề Thảo luận
                    </h1>
                    <p className="text-slate-500 text-sm">Lớp: {classInfo.name} • {courseItem.title}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    {/* Thông tin chủ đề */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-3 text-lg border-b border-slate-100 pb-3">{courseItem.title}</h3>
                        <div className="prose prose-sm prose-slate max-w-none">
                            {courseItem.content?.[0]?.[0]?.content ? (
                                <div dangerouslySetInnerHTML={{ __html: courseItem.content[0].content }} />
                            ) : courseItem.content?.content ? (
                                <div dangerouslySetInnerHTML={{ __html: courseItem.content.content }} />
                            ) : (
                                <p className="text-slate-500 italic">Không có mô tả chi tiết cho chủ đề này.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-indigo-900 text-sm">Hướng dẫn Giáo viên</h4>
                                <ul className="text-xs text-indigo-700 mt-2 space-y-1.5 list-disc pl-4 marker:text-indigo-400">
                                    <li>Giáo viên có toàn quyền xem các tin nhắn theo thời gian thực.</li>
                                    <li>Khi rê chuột vào một tin nhắn của học sinh, biểu tượng <b>Thùng rác</b> sẽ xuất hiện.</li>
                                    <li>Bạn có thể xóa các tin nhắn vi phạm quy định (Spam, nội dung không phù hợp).</li>
                                    <li>Hãy gửi tin nhắn khuyến khích, hoặc chốt lại ý chính để định hướng học sinh.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {/* Component Realtime Chat */}
                    <RealtimeDiscussion
                        classId={classId}
                        itemId={itemId}
                        currentUser={{
                            id: profile?.id || user.id,
                            full_name: profile?.full_name || "Giáo viên",
                            role: profile?.role || "teacher",
                            avatar_url: profile?.avatar_url
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
