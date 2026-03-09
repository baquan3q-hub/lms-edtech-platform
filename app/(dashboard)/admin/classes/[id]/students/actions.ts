"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function fetchClassEnrollments(classId: string) {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("enrollments")
            .select(`
                id,
                student_id,
                enrolled_at,
                status,
                student:users!student_id(id, full_name, email)
            `)
            .eq("class_id", classId)
            .order("enrolled_at", { ascending: false });

        if (error) throw error;

        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Error fetching class enrollments:", error);
        return { data: null, error: error.message };
    }
}

export async function fetchAvailableStudents(classId: string) {
    try {
        const supabase = createAdminClient();

        // 1. Lấy danh sách ID học sinh đã có trong lớp
        const { data: enrolledStudents } = await supabase
            .from("enrollments")
            .select("student_id")
            .eq("class_id", classId);

        const enrolledIds = enrolledStudents?.map(e => e.student_id) || [];

        // 2. Lấy danh sách học sinh (role = student) chưa nằm trong mảng enrolledIds
        let query = supabase
            .from("users")
            .select("id, full_name, email")
            .eq("role", "student")
            .order("full_name");

        if (enrolledIds.length > 0) {
            // Loại bỏ những người đã add rồi
            query = query.not("id", "in", `(${enrolledIds.join(',')})`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { data: data || [], error: null };
    } catch (error: any) {
        console.error("Error fetching available students:", error);
        return { data: null, error: error.message };
    }
}

export async function addStudentToClass(classId: string, studentId: string) {
    try {
        if (!studentId) return { success: false, error: "Vui lòng chọn Học sinh để thêm" };

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("enrollments")
            .insert({
                class_id: classId,
                student_id: studentId,
                status: 'active'
            });

        if (error) throw error;

        revalidatePath(`/admin/classes/${classId}/students`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error adding student to class:", error);
        if (error.code === '23505') return { success: false, error: "Học sinh này đã có trong lớp" };
        return { success: false, error: error.message };
    }
}

export async function removeStudentFromClass(classId: string, enrollmentId: string) {
    try {
        const supabase = createAdminClient();

        const { error } = await supabase
            .from("enrollments")
            .delete()
            .eq("id", enrollmentId);

        if (error) throw error;

        revalidatePath(`/admin/classes/${classId}/students`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error removing student from class:", error);
        return { success: false, error: error.message };
    }
}

export async function updateEnrollmentStatus(classId: string, enrollmentId: string, status: string) {
    try {
        const supabase = createAdminClient();

        const { error } = await supabase
            .from("enrollments")
            .update({ status })
            .eq("id", enrollmentId);

        if (error) throw error;

        revalidatePath(`/admin/classes/${classId}/students`);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error updating enrollment status:", error);
        return { success: false, error: error.message };
    }
}

// Bulk import students to a class from Excel data (match by email)
export async function bulkEnrollStudents(
    classId: string,
    students: { email: string; fullName?: string }[]
) {
    const supabase = createAdminClient();
    const results: { email: string; fullName?: string; success: boolean; error?: string }[] = [];

    // Get existing enrollments for this class
    const { data: existingEnrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId);

    const enrolledIds = new Set((existingEnrollments || []).map(e => e.student_id));

    for (const student of students) {
        try {
            if (!student.email) {
                results.push({ email: "N/A", fullName: student.fullName, success: false, error: "Thiếu email" });
                continue;
            }

            // Look up user by email
            const { data: userData, error: lookupError } = await supabase
                .from("users")
                .select("id, full_name, role")
                .eq("email", student.email.trim().toLowerCase())
                .single();

            if (lookupError || !userData) {
                results.push({
                    email: student.email,
                    fullName: student.fullName,
                    success: false,
                    error: "Không tìm thấy tài khoản với email này"
                });
                continue;
            }

            if (userData.role !== "student") {
                results.push({
                    email: student.email,
                    fullName: userData.full_name,
                    success: false,
                    error: `Tài khoản này có vai trò "${userData.role}", không phải học sinh`
                });
                continue;
            }

            // Check if already enrolled
            if (enrolledIds.has(userData.id)) {
                results.push({
                    email: student.email,
                    fullName: userData.full_name,
                    success: false,
                    error: "Học sinh đã có trong lớp"
                });
                continue;
            }

            // Enroll
            const { error: enrollError } = await supabase
                .from("enrollments")
                .insert({
                    class_id: classId,
                    student_id: userData.id,
                    status: "active",
                });

            if (enrollError) {
                results.push({
                    email: student.email,
                    fullName: userData.full_name,
                    success: false,
                    error: enrollError.code === "23505" ? "Đã có trong lớp" : enrollError.message
                });
                continue;
            }

            enrolledIds.add(userData.id);
            results.push({ email: student.email, fullName: userData.full_name, success: true });
        } catch (err: any) {
            results.push({ email: student.email, fullName: student.fullName, success: false, error: err.message });
        }
    }

    revalidatePath(`/admin/classes/${classId}/students`);
    return { results };
}

