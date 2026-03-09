import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function StudentLearnIndex({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id: classId } = resolvedParams;

    const supabase = createAdminClient();

    // Tìm item ĐẦU TIÊN (không phải folder) có is_published = true để redirect người dùng vào học
    const { data: firstItem } = await supabase
        .from("course_items")
        .select("id")
        .eq("class_id", classId)
        .eq("is_published", true)
        .neq("type", "folder")
        .order("order_index", { ascending: true })
        .limit(1)
        .single();

    if (firstItem) {
        redirect(`/student/classes/${classId}/learn/${firstItem.id}`);
    } else {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center h-full">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có bài học nào</h3>
                <p className="text-slate-500 max-w-sm">
                    Khóa học này hiện chưa có bài học nào được đăng tải. Vui lòng quay lại sau!
                </p>
            </div>
        );
    }
}
