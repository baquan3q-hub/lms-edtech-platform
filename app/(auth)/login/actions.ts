"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

// Map role → dashboard path
const ROLE_DASHBOARD: Record<string, string> = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
};

export async function loginAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Vui lòng nhập đầy đủ email và mật khẩu." };
    }

    const supabase = await createClient();

    // Bước 1: Đăng nhập bằng email/password qua Supabase Auth
    const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
            email,
            password,
        });

    if (authError) {
        console.error("[Login] Auth error:", authError.message);
        return { error: "Email hoặc mật khẩu không đúng. Vui lòng thử lại." };
    }

    // Bước 2: Lấy role từ bảng users bằng Admin Client (bypass RLS)
    // Sử dụng admin client để tránh bị RLS chặn
    const adminSupabase = createAdminClient();

    const { data: userData, error: userError } = await adminSupabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();

    let role = "student"; // Mặc định

    if (userError || !userData) {
        // User tồn tại trong Auth nhưng chưa có trong bảng users
        // → Tự động đồng bộ từ Auth metadata
        console.warn("[Login] User not in users table, syncing...", userError?.message);

        const { data: authUser } = await adminSupabase.auth.admin.getUserById(
            authData.user.id
        );
        const userMetadata = authUser?.user?.user_metadata || {};
        role = userMetadata.role || "student";
        const fullName = userMetadata.full_name || email.split("@")[0];

        // Dùng upsert thay vì insert để tránh lỗi trùng key
        const { error: upsertError } = await adminSupabase
            .from("users")
            .upsert(
                {
                    id: authData.user.id,
                    email: email,
                    role: role,
                    full_name: fullName,
                },
                { onConflict: "id" }
            );

        if (upsertError) {
            console.error("[Login] Upsert user failed:", upsertError.message);
            // Không block login — vẫn cho user vào dashboard với role mặc định
        }
    } else {
        role = userData.role;
    }

    // Bước 3: Redirect về dashboard tương ứng với role
    // Lưu ý: redirect() throw NEXT_REDIRECT error, PHẢI đặt ngoài try/catch
    const dashboardPath = ROLE_DASHBOARD[role] || "/student";
    redirect(dashboardPath);
}
