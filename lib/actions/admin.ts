"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function fetchUserDetails(userId: string) {
    try {
        const supabase = createAdminClient();

        // 1. Fetch Basic Profile
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

        if (userError) throw userError;

        // 1b. Fetch extended profile data
        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

        let additionalData: any = { profile: profileData || null };

        // 2. Fetch Role-specific Data
        if (user.role === "teacher") {
            // Danh sách lớp GV dạy
            const { data: classes } = await supabase
                .from("classes")
                .select(`
                    *,
                    course:courses(name, description)
                `)
                .eq("teacher_id", userId)
                .order("created_at", { ascending: false });
            additionalData = { ...additionalData, classes };

        } else if (user.role === "student") {
            // Danh sách lớp HS đăng ký học
            const { data: enrollments } = await supabase
                .from("enrollments")
                .select(`
                    status, enrolled_at,
                    class:classes(
                        id, name, room, schedule, status,
                        course:courses(name),
                        teacher:users!classes_teacher_id_fkey(full_name)
                    )
                `)
                .eq("student_id", userId)
                .order("enrolled_at", { ascending: false });

            // Phụ huynh đã liên kết
            const { data: parentLinks } = await supabase
                .from("parent_students")
                .select("id, parent_id, relationship, is_primary, created_at")
                .eq("student_id", userId);

            let parents: any[] = [];
            if (parentLinks && parentLinks.length > 0) {
                const parentIds = parentLinks.map(l => l.parent_id);
                const { data: parentUsers } = await supabase
                    .from("users")
                    .select("id, full_name, email, phone, avatar_url")
                    .in("id", parentIds);

                parents = (parentLinks || []).map(link => ({
                    ...link,
                    parent: (parentUsers || []).find(p => p.id === link.parent_id),
                }));
            }

            additionalData = { ...additionalData, enrollments, parents };
        }

        return { data: { user, ...additionalData }, error: null };
    } catch (error: any) {
        console.error("Lỗi fetch user chi tiết:", error);
        return { data: null, error: error.message };
    }
}

export async function deleteUser(userId: string) {
    try {
        const supabase = createAdminClient();

        // 1. Xóa Auth (Tài khoản Đăng nhập đăng ký trên hệ thống)
        // Việc xóa Auth User trên Supabase sẽ MỚI là cách xóa triệt để. 
        // Khi xóa file auth user có thể Trigger (nếu bạn có RLS FK) để xóa luôn Profile trong bảng Users.
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("Lỗi xóa Auth:", authError);
            throw authError;
        }

        // 2. (Phòng hờ nếu trigger ko tự xóa) Xóa bản ghi trong Bảng Users
        const { error: dbError } = await supabase
            .from("users")
            .delete()
            .eq("id", userId);

        if (dbError) throw dbError;

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi xóa tài khoản:", error);
        return { success: false, error: error.message };
    }
}

export async function updateUser(userId: string, data: { full_name?: string; phone?: string; role?: string }) {
    try {
        const supabase = createAdminClient();

        // Cập nhật CSDL
        const { error: dbError } = await supabase
            .from("users")
            .update({
                full_name: data.full_name,
                phone: data.phone,
                role: data.role
            })
            .eq("id", userId);

        if (dbError) throw dbError;

        // Cập nhật Metadata trên Auth (tùy chọn nhưng khuyến nghị để đồng bộ JWT)
        if (data.full_name || data.role) {
            const { error: authError } = await supabase.auth.admin.updateUserById(
                userId,
                { user_metadata: { full_name: data.full_name, role: data.role } }
            );
            if (authError) {
                console.warn("Cập nhật auth metadata lỗi (không quá nghiêm trọng):", authError);
            }
        }

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Lỗi cập nhật user:", error);
        return { success: false, error: error.message };
    }
}
