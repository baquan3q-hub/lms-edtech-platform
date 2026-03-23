import { createAdminClient } from "@/lib/supabase/admin";
import ContentViewerClient from "./ContentViewerClient";
import RealtimeDiscussion from "@/components/shared/RealtimeDiscussion";

export const dynamic = "force-dynamic";

export default async function StudentContentViewerPage({
    params
}: {
    params: Promise<{ id: string, itemId: string }>
}) {
    const resolvedParams = await params;
    const { id: classId, itemId } = resolvedParams;

    const supabase = createAdminClient();

    // 1. Fetch Item Data & Content
    const { data: item, error } = await supabase
        .from("course_items")
        .select(`
            *,
            content:item_contents(*)
        `)
        .eq("id", itemId)
        .single();

    if (error || !item) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center h-full">
                <div className="text-rose-500 bg-rose-50 p-4 rounded-full mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy nội dung</h3>
                <p className="text-slate-500 max-w-sm">Học liệu này có thể đã bị xóa, bị ẩn hoặc bạn không có quyền truy cập.</p>
            </div>
        );
    }

    // Handle cases where item.content might be an object (1-to-1) or array
    const itemContent = Array.isArray(item.content)
        ? (item.content[0] || null)
        : (item.content || null);

    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();

    // 2. Tạm thời: Ghi nhận đã xem (progress tracking) - server side tracking logic
    let currentProgress = null;
    let userProfile = null;
    if (user) {
        const { data: progress } = await supabase
            .from('student_progress')
            .select('*')
            .eq('student_id', user.id)
            .eq('item_id', itemId)
            .single();
        if (progress) currentProgress = progress;

        // Lấy profile user cho phần thảo luận
        const { data: profile } = await supabase
            .from('users')
            .select('id, full_name, avatar_url, role')
            .eq('id', user.id)
            .single();
        if (profile) userProfile = profile;
    }

    // 3. Tìm item tiếp theo (next item) để chuyển hướng sau khi hoàn thành
    const { data: allItems } = await supabase
        .from("course_items")
        .select("id, parent_id, order_index, type")
        .eq("class_id", classId)
        .eq("is_published", true)
        .order("order_index", { ascending: true });

    let nextItemId = null;
    let prevItemId = null;

    if (allItems && allItems.length > 0) {
        const flatLeafItems = allItems
             .filter(i => i.type !== 'folder')
             .sort((a, b) => a.order_index - b.order_index);

        const currentIndex = flatLeafItems.findIndex(i => i.id === itemId);

        if (currentIndex > -1) {
            if (currentIndex > 0) prevItemId = flatLeafItems[currentIndex - 1].id;
            if (currentIndex < flatLeafItems.length - 1) nextItemId = flatLeafItems[currentIndex + 1].id;
        }
    }

    return (
        <div className="h-full bg-white relative overflow-y-auto">
            <ContentViewerClient
                item={item}
                contentData={itemContent}
                classId={classId}
                progress={currentProgress}
                nextItemId={nextItemId}
                prevItemId={prevItemId}
            />

            {/* Phần thảo luận bài học */}
            {userProfile && (
                <div className="max-w-4xl mx-auto px-6 pb-8 mt-6">
                    <RealtimeDiscussion
                        itemId={itemId}
                        classId={classId}
                        currentUser={{
                            id: userProfile.id,
                            role: userProfile.role,
                            full_name: userProfile.full_name,
                            avatar_url: userProfile.avatar_url || undefined,
                        }}
                    />
                </div>
            )}
        </div>
    );
}

