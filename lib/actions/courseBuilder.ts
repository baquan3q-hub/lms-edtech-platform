"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireClassAccess, requireResourceAccess } from "@/lib/auth/authorize";
import { z } from "zod";
import { toStudentCourseItem } from "@/lib/modules/learning/content-dto";

const contentInput = z.object({
    content: z.string().max(200000).nullable().optional(), video_url: z.string().max(2000).nullable().optional(),
    file_url: z.string().max(2000).nullable().optional(), zoom_link: z.string().max(2000).nullable().optional(),
    deadline: z.iso.datetime().nullable().optional(), max_attempts: z.number().int().min(1).max(100).nullable().optional(),
    min_score: z.number().min(0).max(100).nullable().optional(), score_method: z.enum(["highest", "latest", "average", "first"]).nullable().optional(),
    quiz_data: z.json().nullable().optional(),
}).strict();

// ----------------------------------------------------
// 1. Fetch All Items for a Class
// ----------------------------------------------------
export async function fetchCourseItems(classId: string) {
    try {
        const actor = await requireClassAccess(classId, "read");
        const supabase = createAdminClient();

        // Lấy tất cả course_items của lớp này
        let query = supabase
            .from("course_items")
            .select(`
                *,
                content:item_contents(*)
            `)
            .eq("class_id", classId)
            .order("order_index", { ascending: true });
        if (actor.role === "student" || actor.role === "parent") query = query.eq("is_published", true);
        const { data: items, error: itemsError } = await query;

        if (itemsError) throw itemsError;

        const data = actor.role === "student" || actor.role === "parent"
            ? (items || []).map(toStudentCourseItem) : (items || []);
        return { data, error: null };
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
        await requireClassAccess(classId, "teach");
        z.object({ title: z.string().trim().min(1).max(200), orderIndex: z.number().int().min(0), type: z.enum(['folder', 'video', 'document', 'audio', 'quiz', 'assignment', 'discussion', 'zoom']) }).parse({ title, orderIndex, type });
        if (parentId) {
            const parent = await requireResourceAccess("course_items", parentId, "teach");
            if (parent.resource.class_id !== classId || parent.resource.type !== "folder") throw new Error("Thư mục cha không hợp lệ.");
        }
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
        const access = await requireResourceAccess("course_items", itemId, "teach");
        if (classId && access.resource.class_id !== classId) throw new Error("Sai lớp học.");
        title = z.string().trim().min(1).max(200).parse(title);
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
        const access = await requireResourceAccess("course_items", itemId, "teach");
        if (classId && access.resource.class_id !== classId) throw new Error("Sai lớp học.");
        const checked = contentInput.parse(updates);
        const supabase = createAdminClient();


        // Sử dụng upsert thật sự — nếu item_id đã tồn tại thì UPDATE, chưa có thì INSERT
        const { error } = await supabase
            .from("item_contents")
            .upsert(
                { ...checked, item_id: itemId },
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
        const checked = z.array(z.object({ id: z.uuid(), parent_id: z.uuid().nullable(), order_index: z.number().int().min(0) })).min(1).max(500).parse(updates);
        if (new Set(checked.map(u => u.id)).size !== checked.length) throw new Error("Mục bị trùng.");
        const access = await requireResourceAccess("course_items", checked[0].id, "teach");
        const supabase = createAdminClient();
        const { error } = await supabase.rpc("reorder_school_content", { p_actor: access.id, p_class: access.resource.class_id, p_updates: checked });
        if (error) throw error;
        revalidatePath(`/teacher/classes/${access.resource.class_id}/content`);

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
        const access = await requireResourceAccess("course_items", itemId, "teach");
        if (classId && access.resource.class_id !== classId) throw new Error("Sai lớp học.");
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
