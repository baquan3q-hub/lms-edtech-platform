import "server-only";
import { getCurrentUserProfile } from "@/lib/supabase/auth";
import { AccessError } from "@/lib/auth/actor-context";
import { requireActorContext } from "@/lib/auth/actor-context";


// Re-export để giữ nguyên đường import cũ của các module đang dùng
export { SUPER_ADMIN_EMAILS } from "@/lib/constants/super-admin-emails";

export interface SuperAdminProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    isSuperAdmin: boolean;
}

/**
 * Kiểm tra xem một đối tượng người dùng có quyền Super Admin hay không
 */
export function checkIsSuperAdmin(user: {
    email?: string | null;
    role?: string | null;
    authUser?: { user_metadata?: Record<string, unknown> };
} | null): boolean {
    return user?.role === "super_admin";
}

/**
 * Bắt buộc người dùng đăng nhập phải có quyền Super Admin
 */
export async function requireSuperAdmin(): Promise<SuperAdminProfile> {
    await requireActorContext(["super_admin"]);
    const profile = await getCurrentUserProfile();

    if (!profile) {
        throw new AccessError(401, "Vui lòng đăng nhập để tiếp tục.", "UNAUTHENTICATED");
    }

    const isSuper = checkIsSuperAdmin(profile);

    if (!isSuper) {
        throw new AccessError(
            403,
            "Từ chối quyền truy cập: Tính năng này chỉ dành riêng cho Super Admin (Chủ sở hữu nền tảng).",
            "FORBIDDEN_SUPER_ADMIN_ONLY"
        );
    }

    return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: "super_admin",
        isSuperAdmin: true,
    };
}
