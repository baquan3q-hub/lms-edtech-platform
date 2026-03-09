"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ============================================================
// COURSES
// ============================================================

// Lấy danh sách khóa học (join tên giáo viên)
export async function fetchCourses() {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("courses")
        .select("*, teacher:users!courses_teacher_id_fkey(id, full_name)")
        .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Tạo khóa học mới
export async function createCourse(formData: {
    name: string;
    description?: string;
    teacher_id: string;
}) {
    if (!formData.name || !formData.teacher_id) {
        return { error: "Vui lòng điền đầy đủ thông tin bắt buộc." };
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("courses").insert({
        name: formData.name,
        description: formData.description || null,
        teacher_id: formData.teacher_id,
    });

    if (error) return { error: `Lỗi tạo khóa học: ${error.message}` };
    revalidatePath("/admin/courses");
    return { error: null, success: true };
}

// ============================================================
// CLASSES
// ============================================================

// Lấy danh sách lớp học (join khóa học + giáo viên)
export async function fetchClasses() {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("classes")
        .select(
            "*, course:courses!classes_course_id_fkey(id, name), teacher:users!classes_teacher_id_fkey(id, full_name)"
        )
        .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Tạo lớp học mới
export async function createClass(formData: {
    course_id: string;
    teacher_id: string;
    room: string;
    schedule: string;
    max_students: number;
}) {
    if (!formData.course_id || !formData.teacher_id) {
        return { error: "Vui lòng chọn khóa học và giáo viên." };
    }

    // Parse schedule thành JSON
    let scheduleJson = null;
    if (formData.schedule) {
        try {
            scheduleJson = JSON.parse(formData.schedule);
        } catch {
            // Nếu không parse được, lưu dưới dạng text
            scheduleJson = { text: formData.schedule };
        }
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("classes").insert({
        course_id: formData.course_id,
        teacher_id: formData.teacher_id,
        room: formData.room || null,
        schedule: scheduleJson,
        max_students: formData.max_students || 30,
    });

    if (error) return { error: `Lỗi tạo lớp: ${error.message}` };
    revalidatePath("/admin/classes");
    return { error: null, success: true };
}

// Lấy chi tiết 1 lớp học
export async function fetchClassDetail(classId: string) {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("classes")
        .select(
            "*, course:courses!classes_course_id_fkey(id, name, mode), teacher:users!classes_teacher_id_fkey(id, full_name, email)"
        )
        .eq("id", classId)
        .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Cập nhật lịch học
export async function updateClassSchedule(classId: string, scheduleText: string) {
    if (!classId) return { error: "Thiếu ID lớp học." };

    const adminSupabase = createAdminClient();

    // Lưu lịch học trực tiếp dạng object json có key text
    const scheduleData = { text: scheduleText };

    const { error } = await adminSupabase
        .from("classes")
        .update({ schedule: scheduleData })
        .eq("id", classId);

    if (error) return { error: `Lỗi cập nhật lịch học: ${error.message}` };

    revalidatePath(`/admin/classes/${classId}`);
    return { error: null, success: true };
}

// ============================================================
// ENROLLMENTS
// ============================================================

// Lấy danh sách học sinh đã enroll trong 1 lớp
export async function fetchEnrollments(classId: string) {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("enrollments")
        .select("*, student:users!enrollments_student_id_fkey(id, full_name, email, phone)")
        .eq("class_id", classId)
        .order("enrolled_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Thêm học sinh vào lớp
export async function enrollStudent(classId: string, studentId: string) {
    if (!classId || !studentId) {
        return { error: "Thiếu thông tin lớp học hoặc học sinh." };
    }

    const adminSupabase = createAdminClient();

    // Kiểm tra sĩ số tối đa
    const { data: classData } = await adminSupabase
        .from("classes")
        .select("max_students")
        .eq("id", classId)
        .single();

    const { count } = await adminSupabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId)
        .eq("status", "active");

    if (classData && count !== null && count >= classData.max_students) {
        return { error: "Lớp học đã đạt sĩ số tối đa." };
    }

    const { error } = await adminSupabase.from("enrollments").insert({
        student_id: studentId,
        class_id: classId,
        status: "active",
    });

    if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
            return { error: "Học sinh này đã có trong lớp." };
        }
        return { error: `Lỗi thêm học sinh: ${error.message}` };
    }

    revalidatePath(`/admin/classes/${classId}`);
    return { error: null, success: true };
}

// Xóa học sinh khỏi lớp (cập nhật status)
export async function unenrollStudent(enrollmentId: string, classId: string) {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
        .from("enrollments")
        .update({ status: "dropped" })
        .eq("id", enrollmentId);

    if (error) return { error: `Lỗi xóa học sinh: ${error.message}` };
    revalidatePath(`/admin/classes/${classId}`);
    return { error: null, success: true };
}

// ============================================================
// HELPERS
// ============================================================

// Lấy danh sách giáo viên (cho select dropdown)
export async function fetchTeachers() {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "teacher")
        .order("full_name");

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Lấy danh sách học sinh (cho combobox enrollment)
export async function fetchStudents() {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "student")
        .order("full_name");

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

// Lấy danh sách khóa học (cho select dropdown)
export async function fetchCoursesForSelect() {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("courses")
        .select("id, name")
        .order("name");

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}
