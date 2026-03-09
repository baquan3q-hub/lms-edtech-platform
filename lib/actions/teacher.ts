"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ==========================================
// THAO TÁC CƠ BẢN VỚI LỚP HỌC (CLASSES)
// ==========================================
export async function fetchTeacherClassesWithDetails() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: "Unauthorized" };

        // Dùng Admin client để bypass RLS (tránh infinite recursion)
        // Vẫn filter theo teacher_id để đảm bảo an toàn
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("classes")
            .select(`
                *,
                course:courses(name, description, mode)
            `)
            .eq("teacher_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách lớp:", error);
        return { data: null, error: error.message };
    }
}

// Lấy danh sách bài giảng trong một lớp (dùng admin client)
export async function fetchClassLessons(classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("lessons")
            .select("*")
            .eq("class_id", classId)
            .order("order", { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy bài giảng:", error);
        return { data: null, error: error.message };
    }
}

// ==========================================
// THAO TÁC VỚI CHƯƠNG / PHẦN (SECTIONS)
// ==========================================
export async function fetchClassSections(classId: string) {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("class_sections")
            .select("*")
            .eq("class_id", classId)
            .order("order", { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách chương:", error);
        return { data: null, error: error.message };
    }
}

export async function createClassSection(data: { class_id: string; title: string; order?: number }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error, data: newSection } = await adminSupabase
            .from("class_sections")
            .insert([data])
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/teacher/classes/${data.class_id}`);
        return { success: true, data: newSection, error: null };
    } catch (error: any) {
        console.error("Lỗi tạo chương:", error);
        return { success: false, error: error.message };
    }
}

export async function updateClassSection(id: string, classId: string, updates: { title?: string; order?: number }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("class_sections")
            .update(updates)
            .eq("id", id);

        if (error) throw error;

        revalidatePath(`/teacher/classes/${classId}`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi sửa chương:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteClassSection(id: string, classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("class_sections")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath(`/teacher/classes/${classId}`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi xóa chương:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// THAO TÁC VỚI BÀI GIẢNG (LESSONS)
// ==========================================
export async function fetchLessons(classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, error: "Unauthorized" };

        // Dùng admin client để bypass RLS recursion
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("lessons")
            .select("*")
            .eq("class_id", classId)
            .order("order", { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Lỗi lấy danh sách bài giảng:", error);
        return { data: null, error: error.message };
    }
}

export async function createLesson(data: {
    class_id: string;
    title: string;
    content?: string;
    video_url?: string;
    attachments?: any[];
    section_id?: string | null;
    lesson_type?: string;
    order?: number;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase.from("lessons").insert([data]);

        if (error) throw error;

        revalidatePath(`/teacher/lessons`);
        revalidatePath(`/teacher/classes/${data.class_id}`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi tạo bài giảng:", error);
        return { success: false, error: error.message };
    }
}

export async function updateLesson(id: string, classId: string, updates: any) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("lessons")
            .update(updates)
            .eq("id", id);

        if (error) throw error;

        revalidatePath(`/teacher/lessons`);
        revalidatePath(`/teacher/classes/${classId}`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi sửa bài giảng:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteLesson(id: string, classId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("lessons")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath(`/teacher/lessons`);
        revalidatePath(`/teacher/classes/${classId}`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi xóa bài giảng:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// THAO TÁC VỚI BÀI TẬP (ASSIGNMENTS)
// ==========================================
export async function fetchAssignmentsForLesson(lessonId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("assignments")
            .select("*")
            .eq("lesson_id", lessonId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function createAssignment(data: any) {
    try {
        const supabase = await createClient();
        const { error, data: newAssigment } = await supabase.from("assignments").insert([data]).select().single();

        if (error) throw error;
        revalidatePath(`/teacher/lessons`);
        return { success: true, data: newAssigment, error: null };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// THAO TÁC VỚI CÂU HỎI (QUESTIONS)
// ==========================================
export async function fetchQuestions(assignmentId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("questions")
            .select("*")
            .eq("assignment_id", assignmentId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function saveBulkQuestions(questions: any[]) {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from("questions").insert(questions);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi insert bulk questions", error);
        return { success: false, error: error.message };
    }
}
