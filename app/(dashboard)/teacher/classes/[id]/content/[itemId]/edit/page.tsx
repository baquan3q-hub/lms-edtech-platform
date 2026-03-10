import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3 } from "lucide-react";
import EditContentClient from "./EditContentClient";

export const dynamic = "force-dynamic";

export default async function EditItemContentPage({
    params
}: {
    params: Promise<{ id: string, itemId: string }>
}) {
    const resolvedParams = await params;
    const { id: classId, itemId } = resolvedParams;

    const supabase = createAdminClient();

    const { data: item, error } = await supabase
        .from("course_items")
        .select(`
            *,
            class:classes(name),
            content:item_contents(*)
        `)
        .eq("id", itemId)
        .single();

    if (error || !item) {
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl">
                Không tìm thấy bài học hoặc có lỗi xảy ra.
            </div>
        );
    }

    // Pass the singular content record directly (handles both array and object formats)
    const itemContent = Array.isArray(item.content)
        ? (item.content[0] || {})
        : (item.content || {});

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Link
                    href={`/teacher/classes/${classId}/content`}
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại Cấu trúc Giảng đồ
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Edit3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
                            Chỉnh sửa: {item.title}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Loại nội dung: <span className="uppercase font-bold text-indigo-600">{item.type}</span>
                        </p>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <EditContentClient
                        classId={classId}
                        item={item}
                        initialContent={itemContent}
                    />
                </div>
            </div>
        </div>
    );
}
