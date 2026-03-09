"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Teacher actions

export async function fetchTeacherClasses(teacherId: string) {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("classes")
            .select(`
                *,
                course:courses(name, description, mode)
            `)
            .eq("teacher_id", teacherId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching teacher classes:", error);
        return { data: null, error: error.message };
    }
}

export async function fetchTeacherStats(teacherId: string) {
    try {
        const supabase = createAdminClient();

        // Count total classes assigned to this teacher
        const { count: classesCount, error: cErr } = await supabase
            .from("classes")
            .select("id", { count: "exact", head: true })
            .eq("teacher_id", teacherId)
            .eq("status", "active");

        if (cErr) throw cErr;

        return {
            data: {
                classesCount: classesCount || 0,
                totalStudents: 0, // Placeholder for Phase 4 (Enrollments)
                attendanceRate: "—", // Placeholder
                pendingAssignments: 0 // Placeholder
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error fetching teacher stats:", error);
        return { data: null, error: error.message };
    }
}
