"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Lấy danh sách tất cả users
export async function fetchUsers() {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[fetchUsers] Error:", error);
        return { error: error.message, data: null };
    }

    return { data, error: null };
}

// Admin tạo user mới — dùng SERVICE_ROLE_KEY (admin API)
export async function createUser(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const role = formData.get("role") as string;
    const phone = (formData.get("phone") as string) || null;
    const sendEmail = formData.get("sendEmail") === "true";

    // Validate input
    if (!email || !password || !fullName || !role) {
        return { error: "Vui lòng điền đầy đủ thông tin bắt buộc." };
    }

    if (password.length < 6) {
        return { error: "Mật khẩu phải có ít nhất 6 ký tự." };
    }

    const validRoles = ["admin", "teacher", "student", "parent"];
    if (!validRoles.includes(role)) {
        return { error: "Role không hợp lệ." };
    }

    try {
        // Dùng Admin Client (SERVICE_ROLE_KEY) để tạo user
        const adminSupabase = createAdminClient();

        // Bước 1: Tạo Auth user bằng admin API
        console.log("[createUser] Creating auth user:", email, role);

        const { data: authData, error: authError } =
            await adminSupabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Không cần xác thực email
                user_metadata: {
                    full_name: fullName,
                    role: role,
                },
            });

        if (authError) {
            console.error("[createUser] Auth error:", authError);
            if (authError.message.includes("already been registered") ||
                authError.message.includes("already exists")) {
                return { error: "Email này đã được đăng ký trong hệ thống." };
            }
            return { error: `Lỗi tạo tài khoản Auth: ${authError.message}` };
        }

        if (!authData.user) {
            console.error("[createUser] No user returned from auth");
            return { error: "Không thể tạo tài khoản. Vui lòng thử lại." };
        }

        console.log("[createUser] Auth user created:", authData.user.id);

        // Bước 2: Insert vào bảng public.users (dùng admin client để bypass RLS)
        const { error: insertError } = await adminSupabase
            .from("users")
            .insert({
                id: authData.user.id,
                email,
                role,
                full_name: fullName,
                phone,
            });

        if (insertError) {
            console.error("[createUser] Insert error:", insertError);
            return { error: `Lỗi lưu thông tin user: ${insertError.message}` };
        }

        console.log("[createUser] User inserted into public.users successfully");

        // Revalidate trang users
        revalidatePath("/admin/users");

        // TODO: Gửi email thông báo tài khoản qua Resend
        if (sendEmail) {
            console.log(`[createUser] TODO: Gửi email thông báo tài khoản đến ${email}`);
            // Khi tích hợp Resend, gọi API ở đây:
            // await resend.emails.send({
            //     from: 'E-Learning Platform <noreply@yourdomain.com>',
            //     to: email,
            //     subject: 'Tài khoản E-Learning của bạn đã được tạo',
            //     html: `<p>Xin chào ${fullName},</p><p>Tài khoản đã được tạo. Email: ${email}, Mật khẩu: ${password}</p>`
            // });
        }

        return { error: null, success: true };
    } catch (err) {
        console.error("[createUser] Unexpected error:", err);
        return {
            error: `Lỗi không mong muốn: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

// Bulk import users from Excel data
export async function bulkCreateUsers(
    users: { email: string; fullName: string; role: string; phone?: string; password: string }[]
) {
    const adminSupabase = createAdminClient();
    const validRoles = ["admin", "teacher", "student", "parent"];

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const user of users) {
        try {
            // Validate
            if (!user.email || !user.fullName || !user.role || !user.password) {
                results.push({ email: user.email || "N/A", success: false, error: "Thiếu thông tin bắt buộc" });
                continue;
            }

            if (user.password.length < 6) {
                results.push({ email: user.email, success: false, error: "Mật khẩu phải >= 6 ký tự" });
                continue;
            }

            if (!validRoles.includes(user.role)) {
                results.push({ email: user.email, success: false, error: `Role "${user.role}" không hợp lệ` });
                continue;
            }

            // Create Auth user
            const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    full_name: user.fullName,
                    role: user.role,
                },
            });

            if (authError) {
                const msg = authError.message.includes("already")
                    ? "Email đã tồn tại"
                    : authError.message;
                results.push({ email: user.email, success: false, error: msg });
                continue;
            }

            if (!authData.user) {
                results.push({ email: user.email, success: false, error: "Không tạo được Auth user" });
                continue;
            }

            // Insert to public.users
            const { error: insertError } = await adminSupabase.from("users").insert({
                id: authData.user.id,
                email: user.email,
                role: user.role,
                full_name: user.fullName,
                phone: user.phone || null,
            });

            if (insertError) {
                results.push({ email: user.email, success: false, error: insertError.message });
                continue;
            }

            results.push({ email: user.email, success: true });
        } catch (err: any) {
            results.push({ email: user.email || "N/A", success: false, error: err.message });
        }
    }

    revalidatePath("/admin/users");
    return { results };
}
