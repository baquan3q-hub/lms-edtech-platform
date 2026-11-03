"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

import { isStudentCode, resolveStudentIdentifier } from "@/lib/auth/student-auth";
import { checkAccountActivationStatus } from "@/lib/auth/activation";

import { checkIsSuperAdmin } from "@/lib/auth/super-admin";
import { cookies } from "next/headers";
import { z } from "zod";

// Map role → dashboard path
const ROLE_DASHBOARD: Record<string, string> = {
    super_admin: "/super-admin",
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
};

export async function loginAction(formData: FormData) {
    const parsed=z.object({identifier:z.string().trim().min(1).max(200),password:z.string().min(1).max(200)}).safeParse({identifier:formData.get("email"),password:formData.get("password")});
    if(!parsed.success)return {error:"Vui lòng nhập tài khoản và mật khẩu hợp lệ."};
    const rawIdentifier=parsed.data.identifier;
    const password=parsed.data.password;

    if (!rawIdentifier || !password) {
        return { error: "Vui lòng nhập đầy đủ tài khoản/mã học sinh và mật khẩu." };
    }

    let authEmail = rawIdentifier;
    let identifierSchoolId: string | undefined;

    // Bước 0: Nếu là mã học sinh, phân giải sang email định danh nội bộ
    if (isStudentCode(rawIdentifier)) {
        const resolved = await resolveStudentIdentifier(rawIdentifier);
        if (!resolved) {
            return { error: "Thông tin đăng nhập không đúng hoặc thiếu mã trường. Vui lòng kiểm tra lại." };
        }
        authEmail = resolved.email;
        identifierSchoolId=resolved.schoolId;
    }

    const supabase = await createClient();

    // Bước 1: Đăng nhập qua Supabase Auth
    const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
        });

    if (authError) {
        console.error("[Login] Auth error:", authError.message);
        return { error: "Thông tin đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại." };
    }

    // Bước 1.5 & Bước 2: Tối ưu chạy song song kiểm tra kích hoạt và lấy role từ DB
    const adminSupabase = createAdminClient();

    const [activationStatus, userRes] = await Promise.all([
        checkAccountActivationStatus(authData.user.id),
        adminSupabase.from("users").select("role").eq("id", authData.user.id).single(),
    ]);

    if (!activationStatus.isActivated) {
        redirect(`/activate?user=${authData.user.id}`);
    }

    const { data: userData, error: userError } = userRes;

    if(userError || !userData) {
        await supabase.auth.signOut();
        return {error:"Tài khoản chưa có hồ sơ hợp lệ. Vui lòng liên hệ quản trị viên nhà trường."};
    }
    let role = userData.role;
    const {data:memberships,error:membershipError}=await adminSupabase.from("school_memberships")
        .select("school_id,role").eq("user_id",authData.user.id).eq("status","active").order("created_at").order("id");
    if(membershipError) { await supabase.auth.signOut(); return {error:"Chưa xác minh được quyền truy cập. Vui lòng thử lại."}; }
    if(role!=="super_admin") {
        const available=identifierSchoolId ? (memberships||[]).filter(m=>m.school_id===identifierSchoolId) : memberships||[];
        if(!available.length) redirect("/access-denied");
        const selected=available.find(m=>m.role===role)||available[0];
        role=selected.role;
        const store=await cookies();
        const options={httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:21600};
        store.set("lms-school-id",selected.school_id,options);
        store.set("lms-role",role,options);
    }

    // Kiểm tra nếu là Super Admin thì điều hướng trực tiếp đến trang Quản lý trường học & API
    const isSuper = checkIsSuperAdmin({
        email: authEmail,
        role,
        authUser: authData.user,
    });

    if (isSuper) {
        redirect("/super-admin");
    }

    // Bước 3: Redirect về dashboard tương ứng với role
    // Lưu ý: redirect() throw NEXT_REDIRECT error, PHẢI đặt ngoài try/catch
    const dashboardPath = ROLE_DASHBOARD[role] || "/student";
    redirect(dashboardPath);
}
