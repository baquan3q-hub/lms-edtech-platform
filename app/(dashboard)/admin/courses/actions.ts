"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function fetchCourses() {
    try {
        const supabase = createAdminClient();

        // Fetch courses with classes
        const { data, error } = await supabase
            .from("courses")
            .select(`
                *,
                classes(id, name, room, status, max_students, teacher:users(full_name, email))
            `)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching courses:", error);
        return { data: null, error: error.message };
    }
}

export async function createCourse(formData: FormData) {
    try {
        const name = formData.get("name")?.toString();
        const description = formData.get("description")?.toString();
        const mode = formData.get("mode")?.toString() || "offline";

        if (!name) {
            return { error: "Tên khóa học không được để trống" };
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("courses")
            .insert([
                {
                    name,
                    description,
                    mode,
                }
            ]);

        if (error) {
            console.error("Supabase error during course creation:", error);
            throw error;
        }

        revalidatePath("/admin/courses");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error creating course catch block:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteCourse(id: string) {
    try {
        const supabase = createAdminClient();

        const { error } = await supabase
            .from("courses")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/courses");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error deleting course:", error);
        return { success: false, error: error.message };
    }
}

export async function updateCourse(id: string, formData: FormData) {
    try {
        const name = formData.get("name")?.toString();
        const description = formData.get("description")?.toString();
        const mode = formData.get("mode")?.toString() || "offline";

        if (!name) {
            return { error: "Tên khóa học không được để trống" };
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("courses")
            .update({
                name,
                description,
                mode,
            })
            .eq("id", id);

        if (error) {
            console.error("Supabase error during course update:", error);
            throw error;
        }

        revalidatePath("/admin/courses");
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error updating course catch block:", error);
        return { success: false, error: error.message };
    }
}
