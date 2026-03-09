"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------
// 1. Fetch All Items for a Class
// ----------------------------------------------------
export async function fetchCourseItems(classId: string) {
    try {
        const supabase = createAdminClient();

        // Lấy tất cả course_items của lớp này
        const { data: items, error: itemsError } = await supabase
            .from("course_items")
            .select(`
                *,
                content:item_contents(*)
            `)
            .eq("class_id", classId)
            .order("order_index", { ascending: true });

        if (itemsError) throw itemsError;

        return { data: items || [], error: null };
    } catch (error: any) {
        console.error("Error fetching course items:", error);
        return { data: [], error: error.message };
    }
}

// ----------------------------------------------------
// 2. Create Node (Folder or Leaf Item)
// ----------------------------------------------------
export async function createCourseItem({
    classId,
    parentId,
    title,
    type,
    orderIndex
}: {
    classId: string;
    parentId: string | null;
    title: string;
    type: 'folder' | 'video' | 'document' | 'audio' | 'quiz' | 'assignment' | 'discussion' | 'zoom';
    orderIndex: number;
}) {
    try {
        const supabase = createAdminClient();

        // Tạo Node
        const { data: newItem, error: insertError } = await supabase
            .from("course_items")
            .insert({
                class_id: classId,
                parent_id: parentId,
                title,
                type,
                order_index: orderIndex,
                is_published: false
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Nếu KHÔNG PHẢI FOLDER, tạo 1 empty content record
        if (type !== 'folder') {
            const { error: contentError } = await supabase
                .from("item_contents")
                .insert({
                    item_id: newItem.id
                });
            if (contentError) {
                console.error("Error creating empty content for item:", contentError);
                // Nhưng Node đã tạo, nên ta không throw để văng lỗi catch
            }
        }

        revalidatePath(`/teacher/classes/${classId}`);
        return { data: newItem, error: null };
    } catch (error: any) {
        console.error("Error creating course item:", error);
        return { data: null, error: error.message };
    }
}

// ----------------------------------------------------
// 3. Update Item Metadata (Title, Publish status)
// ----------------------------------------------------
export async function updateCourseItemTitle(itemId: string, title: string, isPublished?: boolean, classId?: string) {
    try {
        const supabase = createAdminClient();
        const updates: any = { title };
        if (isPublished !== undefined) updates.is_published = isPublished;

        const { error } = await supabase
            .from("course_items")
            .update(updates)
            .eq("id", itemId);

        if (error) throw error;

        // Revalidate student paths khi publish/unpublish
        if (classId) {
            revalidatePath(`/teacher/classes/${classId}/content`);
            revalidatePath(`/student/classes/${classId}/learn`);
            revalidatePath(`/student/classes/${classId}`);
        }

        return { error: null };
    } catch (error: any) {
        console.error("Error updating course item:", error);
        return { error: error.message };
    }
}

// ----------------------------------------------------
// 4. Update Detailed Item Content (Upsert)
// ----------------------------------------------------
export async function updateItemContent(itemId: string, updates: any, classId?: string) {
    try {
        const supabase = createAdminClient();

        console.log('📝 updateItemContent:', { itemId, updates: JSON.stringify(updates).slice(0, 200) });

        // Sử dụng upsert thật sự — nếu item_id đã tồn tại thì UPDATE, chưa có thì INSERT
        const { error } = await supabase
            .from("item_contents")
            .upsert(
                { item_id: itemId, ...updates },
                { onConflict: "item_id" }
            );

        if (error) {
            console.error('❌ updateItemContent error:', error);
            throw error;
        }

        console.log('✅ updateItemContent success for', itemId);

        // Revalidate cả teacher và student paths
        if (classId) {
            revalidatePath(`/teacher/classes/${classId}/content`);
            revalidatePath(`/teacher/classes/${classId}/content/${itemId}`);
            revalidatePath(`/teacher/classes/${classId}/content/${itemId}/edit`);
            revalidatePath(`/student/classes/${classId}/learn`);
            revalidatePath(`/student/classes/${classId}/learn/${itemId}`);
            revalidatePath(`/student/classes/${classId}`);
        }
        // Revalidate tổng quát
        revalidatePath('/student', 'layout');
        revalidatePath('/teacher', 'layout');

        return { error: null };
    } catch (error: any) {
        console.error("Error updating item content:", error);
        return { error: error.message };
    }
}

// ----------------------------------------------------
// 5. Bulk Update Tree Order (drag and drop)
// ----------------------------------------------------
// updates: array of { id, parent_id, order_index }
export async function updateCourseItemsOrder(updates: { id: string; parent_id: string | null; order_index: number }[]) {
    try {
        const supabase = createAdminClient();

        // Cần update từng dòng (upsert hoặc update vòng lặp)
        // Vì Supabase ko có bulk update dễ dàng, dùng vòng lặp tạm thời
        const promises = updates.map(update =>
            supabase.from("course_items").update({
                parent_id: update.parent_id,
                order_index: update.order_index
            }).eq("id", update.id)
        );

        await Promise.all(promises);

        return { error: null };
    } catch (error: any) {
        console.error("Error updating items order:", error);
        return { error: error.message };
    }
}

// ----------------------------------------------------
// 6. Delete Item (recursive via DB CASCADE)
// ----------------------------------------------------
export async function deleteCourseItem(itemId: string, classId?: string) {
    try {
        const supabase = createAdminClient();

        const { error } = await supabase
            .from("course_items")
            .delete()
            .eq("id", itemId);

        if (error) throw error;

        if (classId) {
            revalidatePath(`/teacher/classes/${classId}`);
        }
        return { error: null };
    } catch (error: any) {
        console.error("Error deleting course item:", error);
        return { error: error.message };
    }
}
