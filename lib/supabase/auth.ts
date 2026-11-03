import "server-only";
import { cache } from "react";
import { createClient } from "./server";

// React cache chỉ dùng chung kết quả trong một lần render phía server.
// Không lưu phiên đăng nhập vào cache toàn cục giữa các request/người dùng.
export const getCurrentUser = cache(async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
});

export const getCurrentUserProfile = cache(async () => {
    const user = await getCurrentUser();
    if (!user) return null;
    const { createAdminClient } = await import("./admin");
    const adminSupabase = createAdminClient();
    const { data: userData } = await adminSupabase
        .from("users")
        .select("id, full_name, email, role, avatar_url, phone")
        .eq("id", user.id)
        .single();
    return userData ? { ...userData, authUser: user } : null;
});
