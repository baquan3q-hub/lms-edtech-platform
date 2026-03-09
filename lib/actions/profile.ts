"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ProfileData = {
    bio?: string | null;
    date_of_birth?: string | null;
    address?: string | null;
    gender?: string | null;
    phone_number?: string | null;
    grade_level?: string | null;
    school_name?: string | null;
    subject_specialty?: string | null;
    years_of_experience?: number | null;
    occupation?: string | null;
};

// =====================================================================
// Lấy Profile của User đang đăng nhập (kèm thông tin cơ bản từ users)
// =====================================================================
export async function fetchMyProfile() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: "Chưa đăng nhập" };
        }

        // Lấy thông tin user (users table)
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, full_name, email, role, phone, avatar_url")
            .eq("id", user.id)
            .single();

        if (userError) throw userError;

        // Lấy profile
        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

        return {
            data: {
                user: userData,
                profile: profileData || null // Có thể null nếu chưa khởi tạo
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error fetching my profile:", error);
        return { data: null, error: error.message };
    }
}

// =====================================================================
// Cập nhật Profile của User đang đăng nhập
// =====================================================================
export async function updateMyProfile(
    userData: { full_name?: string; phone?: string },
    profileData: ProfileData
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Chưa đăng nhập" };
        }

        // 1. Cập nhật bảng users (nếu có update full_name, phone)
        if (Object.keys(userData).length > 0) {
            const { error: userError } = await supabase
                .from("users")
                .update(userData)
                .eq("id", user.id);
            if (userError) throw userError;
        }

        // 2. Cập nhật bảng profiles (Insert hoặc Update)
        if (Object.keys(profileData).length > 0) {
            // Kiểm tra profile đã tồn tại chưa
            const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (existingProfile) {
                // Update
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({
                        ...profileData,
                        updated_at: new Date().toISOString()
                    })
                    .eq("user_id", user.id);
                if (profileError) throw profileError;
            } else {
                // Insert
                const { error: profileError } = await supabase
                    .from("profiles")
                    .insert({
                        user_id: user.id,
                        ...profileData
                    });
                if (profileError) throw profileError;
            }
        }

        revalidatePath("/", "layout"); // Revalidate toàn bộ layout để cập nhật sidebar/navbar
        return { error: null };
    } catch (error: any) {
        console.error("Error updating my profile:", error);
        return { error: error.message };
    }
}

// =====================================================================
// ADMIN: Lấy Profile của 1 User bất kỳ
// =====================================================================
export async function fetchUserProfile(userId: string) {
    try {
        const adminSupabase = createAdminClient();

        // Lấy thông tin user
        const { data: userData, error: userError } = await adminSupabase
            .from("users")
            .select("id, full_name, email, role, phone, avatar_url")
            .eq("id", userId)
            .single();

        if (userError) throw userError;

        // Lấy profile
        const { data: profileData } = await adminSupabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

        return {
            data: {
                user: userData,
                profile: profileData || null
            },
            error: null
        };
    } catch (error: any) {
        console.error("Error fetching user profile:", error);
        return { data: null, error: error.message };
    }
}

// =====================================================================
// ADMIN: Cập nhật Profile của 1 User bất kỳ
// =====================================================================
export async function updateUserProfile(
    userId: string,
    userData: { full_name?: string; phone?: string },
    profileData: ProfileData
) {
    try {
        const adminSupabase = createAdminClient();

        // 1. Cập nhật bảng users
        if (Object.keys(userData).length > 0) {
            const { error: userError } = await adminSupabase
                .from("users")
                .update(userData)
                .eq("id", userId);
            if (userError) throw userError;
        }

        // 2. Cập nhật bảng profiles
        if (Object.keys(profileData).length > 0) {
            const { data: existingProfile } = await adminSupabase
                .from("profiles")
                .select("id")
                .eq("user_id", userId)
                .single();

            if (existingProfile) {
                const { error: profileError } = await adminSupabase
                    .from("profiles")
                    .update({
                        ...profileData,
                        updated_at: new Date().toISOString()
                    })
                    .eq("user_id", userId);
                if (profileError) throw profileError;
            } else {
                const { error: profileError } = await adminSupabase
                    .from("profiles")
                    .insert({
                        user_id: userId,
                        ...profileData
                    });
                if (profileError) throw profileError;
            }
        }

        revalidatePath(`/admin/users`);
        return { error: null };
    } catch (error: any) {
        console.error("Error updating user profile (admin):", error);
        return { error: error.message };
    }
}
