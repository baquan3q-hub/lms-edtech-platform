"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function fetchClasses() {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("classes")
            .select(`
                *,
                course:courses(name, mode),
                teacher:users(full_name, email)
            `)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching classes:", error);
        return { data: null, error: error.message };
    }
}

export async function fetchDropdownData() {
    try {
        const supabase = createAdminClient();

        // Fetch courses for dropdown
        const { data: courses, error: coursesError } = await supabase
            .from("courses")
            .select("id, name")
            .order("name");

        if (coursesError) throw coursesError;

        // Fetch teachers for dropdown
        const { data: teachers, error: teachersError } = await supabase
            .from("users")
            .select("id, full_name, email")
            .eq("role", "teacher")
            .order("full_name");

        if (teachersError) throw teachersError;

        return { data: { courses, teachers }, error: null };
    } catch (error: any) {
        console.error("Error fetching dropdown data:", error);
        return { data: null, error: error.message };
    }
}

export async function createClass(formData: FormData) {
    try {
        const name = formData.get("name")?.toString() || "Lớp Mới";
        const course_id = formData.get("course_id")?.toString();
        const teacher_id = formData.get("teacher_id")?.toString();
        const room = formData.get("room")?.toString();
        const max_students = parseInt(formData.get("max_students")?.toString() || "30");

        if (!course_id || !teacher_id) {
            return { error: "Vui lòng chọn Khóa học và Giáo viên" };
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("classes")
            .insert([
                {
                    name,
                    course_id,
                    teacher_id,
                    room,
                    max_students,
                    status: 'active'
                }
            ]);

        if (error) throw error;

        revalidatePath("/admin/classes");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error creating class:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteClass(id: string) {
    try {
        const supabase = createAdminClient();

        const { error } = await supabase
            .from("classes")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/classes");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error deleting class:", error);
        return { success: false, error: error.message };
    }
}

export async function updateClass(id: string, formData: FormData) {
    try {
        const name = formData.get("name")?.toString() || "Lớp Mới";
        const course_id = formData.get("course_id")?.toString();
        const teacher_id = formData.get("teacher_id")?.toString();
        const room = formData.get("room")?.toString();
        const max_students = parseInt(formData.get("max_students")?.toString() || "30");
        const status = formData.get("status")?.toString() || "active";

        if (!course_id || !teacher_id) {
            return { error: "Vui lòng chọn Khóa học và Giáo viên" };
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("classes")
            .update({
                name,
                course_id,
                teacher_id,
                room,
                max_students,
                status
            })
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/classes");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error updating class:", error);
        return { success: false, error: error.message };
    }
}
