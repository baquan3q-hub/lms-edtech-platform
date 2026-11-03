"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { recordAuditEvent } from "@/lib/audit/audit-logger";
import { revalidatePath } from "next/cache";

export interface PlatformAccountItem {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    school_id: string | null;
    school_name: string | null;
    school_code: string | null;
    status: "active" | "suspended" | "pending";
}

export interface AuditLogItem {
    id: string;
    school_id: string | null;
    school_name: string | null;
    school_code: string | null;
    actor_id: string | null;
    actor_name: string | null;
    actor_email: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    reason: string | null;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    created_at: string;
}

/**
 * Lấy danh sách tài khoản toàn bộ nền tảng hoặc lọc theo trường, vai trò, từ khóa
 */
export async function listPlatformAccounts(filters?: {
    schoolId?: string;
    role?: string;
    search?: string;
    status?: string;
}): Promise<PlatformAccountItem[]> {
    await requireSuperAdmin();
    const db = createAdminClient();

    // 1. Lấy danh sách users
    let query = db.from("users").select("id, email, full_name, role, phone, avatar_url, created_at").order("created_at", { ascending: false });

    if (filters?.role && filters.role !== "all") {
        query = query.eq("role", filters.role);
    }

    if (filters?.search) {
        const s = filters.search.trim().toLowerCase();
        query = query.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`);
    }

    const { data: users, error: uErr } = await query;
    if (uErr || !users) return [];

    // 2. Lấy thông tin memberships & schools
    const userIds = users.map((u) => u.id);
    const { data: memberships } = await db
        .from("school_memberships")
        .select("user_id, school_id, status, role, schools:schools(id, name, code)")
        .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const membershipMap = new Map<string, any>();
    (memberships || []).forEach((m: any) => {
        if (!membershipMap.has(m.user_id) || (filters?.schoolId && m.school_id === filters.schoolId)) {
            membershipMap.set(m.user_id, m);
        }
    });

    const results: PlatformAccountItem[] = [];

    for (const u of users) {
        const mem = membershipMap.get(u.id);
        const school = mem?.schools as { id: string; name: string; code: string } | undefined;

        if (filters?.schoolId && filters.schoolId !== "all" && mem?.school_id !== filters.schoolId) {
            continue;
        }

        const currentStatus = (mem?.status as "active" | "suspended" | "pending") || "active";
        if (filters?.status && filters.status !== "all" && currentStatus !== filters.status) {
            continue;
        }

        const isSuper = u.email?.toLowerCase() === "boiquan401@gmail.com";
        const role = isSuper ? "super_admin" : (mem?.role || u.role);

        results.push({
            id: u.id,
            email: u.email,
            full_name: u.full_name || (isSuper ? "Bùi Anh Quân (Chủ sản phẩm)" : "Chưa đặt tên"),
            role: role,
            phone: u.phone || null,
            avatar_url: u.avatar_url || null,
            created_at: u.created_at || new Date().toISOString(),
            school_id: isSuper ? null : (mem?.school_id || null),
            school_name: isSuper ? "Toàn bộ nền tảng (Platform Owner)" : (school?.name || "Tài khoản tự do / Admin"),
            school_code: isSuper ? "ROOT" : (school?.code || "GLOBAL"),
            status: currentStatus,
        });
    }

    return results;
}

/**
 * Super Admin trực tiếp can thiệp đổi/reset mật khẩu tài khoản
 * Không cần email verification, cập nhật tức thì vào Supabase Auth
 */
export async function adminDirectResetPassword(
    targetUserId: string,
    newPassword: string,
    reason: string = "Super Admin trực tiếp can thiệp đổi mật khẩu"
): Promise<{ success: boolean; message: string }> {
    const admin = await requireSuperAdmin();
    const db = createAdminClient();

    if (!newPassword || newPassword.length < 6) {
        return { success: false, message: "Mật khẩu mới phải có tối thiểu 6 ký tự." };
    }

    // 1. Kiểm tra tài khoản tồn tại
    const { data: user, error: uErr } = await db
        .from("users")
        .select("id, email, full_name")
        .eq("id", targetUserId)
        .maybeSingle();

    if (uErr || !user) {
        return { success: false, message: "Không tìm thấy tài khoản người dùng." };
    }

    // 2. Can thiệp trực tiếp vào Supabase Auth
    const { error: authErr } = await db.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
    });

    if (authErr) {
        return { success: false, message: `Lỗi cập nhật mật khẩu Auth: ${authErr.message}` };
    }

    // 3. Ghi vết kiểm toán audit_events
    const { data: membership } = await db
        .from("school_memberships")
        .select("school_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

    await recordAuditEvent({
        schoolId: membership?.school_id || "00000000-0000-0000-0000-000000000000",
        actorId: admin.id,
        action: "super_admin_direct_password_override",
        entityType: "user",
        entityId: targetUserId,
        reason: reason,
        afterState: {
            target_email: user.email,
            performed_by_super_admin: admin.email,
            timestamp: new Date().toISOString(),
        },
    });

    return {
        success: true,
        message: `Đã đổi mật khẩu thành công cho tài khoản ${user.email}.`,
    };
}

/**
 * Super Admin can thiệp kích hoạt hoặc tạm dừng tài khoản
 */
export async function adminToggleUserStatus(
    targetUserId: string,
    newStatus: "active" | "suspended",
    reason: string = "Super Admin điều chỉnh trạng thái tài khoản"
): Promise<{ success: boolean; message: string }> {
    const admin = await requireSuperAdmin();
    const db = createAdminClient();

    // 1. Cập nhật trong bảng school_memberships
    const { error: memErr } = await db
        .from("school_memberships")
        .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);

    if (memErr) {
        return { success: false, message: `Lỗi cập nhật trạng thái: ${memErr.message}` };
    }

    // 2. Ghi vết kiểm toán audit_events
    const { data: user } = await db.from("users").select("email").eq("id", targetUserId).maybeSingle();
    const { data: membership } = await db.from("school_memberships").select("school_id").eq("user_id", targetUserId).maybeSingle();

    await recordAuditEvent({
        schoolId: membership?.school_id || "00000000-0000-0000-0000-000000000000",
        actorId: admin.id,
        action: newStatus === "active" ? "super_admin_activate_account" : "super_admin_suspend_account",
        entityType: "user",
        entityId: targetUserId,
        reason: reason,
        afterState: {
            new_status: newStatus,
            target_email: user?.email,
            performed_by_super_admin: admin.email,
        },
    });

    return {
        success: true,
        message: `Đã ${newStatus === "active" ? "kích hoạt" : "tạm dừng"} tài khoản thành công.`,
    };
}

/**
 * Lấy lịch sử hoạt động & sự kiện kiểm toán toàn hệ thống
 */
export async function getPlatformAuditLogs(filters?: {
    schoolId?: string;
    limit?: number;
}): Promise<AuditLogItem[]> {
    await requireSuperAdmin();
    const db = createAdminClient();

    let query = db
        .from("audit_events")
        .select(`
            id,
            school_id,
            actor_id,
            action,
            entity_type,
            entity_id,
            reason,
            before_state,
            after_state,
            created_at,
            schools:schools(id, name, code),
            actor:users!audit_events_actor_id_fkey(id, full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(filters?.limit || 50);

    if (filters?.schoolId && filters.schoolId !== "all") {
        query = query.eq("school_id", filters.schoolId);
    }

    const { data: events, error } = await query;
    if (error || !events) return [];

    return events.map((ev: any) => {
        const sch = ev.schools as { id: string; name: string; code: string } | undefined;
        const act = ev.actor as { id: string; full_name: string; email: string } | undefined;

        return {
            id: ev.id,
            school_id: ev.school_id,
            school_name: sch?.name || "Hệ thống chung",
            school_code: sch?.code || "GLOBAL",
            actor_id: ev.actor_id,
            actor_name: act?.full_name || "Hệ thống",
            actor_email: act?.email || "system@lms.local",
            action: ev.action,
            entity_type: ev.entity_type,
            entity_id: ev.entity_id,
            reason: ev.reason,
            before_state: ev.before_state,
            after_state: ev.after_state,
            created_at: ev.created_at,
        };
    });
}

/**
 * Super Admin tạo mới tài khoản và gán trực tiếp vào trường học
 */
export async function adminCreateAccountAction(data: {
    email: string;
    fullName: string;
    password: string;
    role: "admin" | "teacher" | "student" | "parent";
    schoolId?: string;
    phone?: string;
}): Promise<{ success: boolean; message: string; user?: PlatformAccountItem }> {
    const admin = await requireSuperAdmin();
    const db = createAdminClient();

    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName.trim();
    const password = data.password;
    const role = data.role;
    const schoolId = data.schoolId && data.schoolId !== "all" ? data.schoolId : null;

    if (!email || !email.includes("@")) {
        return { success: false, message: "Email không hợp lệ." };
    }
    if (!fullName) {
        return { success: false, message: "Vui lòng nhập họ và tên." };
    }
    if (!password || password.length < 6) {
        return { success: false, message: "Mật khẩu phải có tối thiểu 6 ký tự." };
    }

    // 1. Kiểm tra / Tạo Auth user
    let userId: string;
    const { data: userList } = await db.auth.admin.listUsers();
    const existingAuthUser = (userList?.users || []).find((u) => u.email === email);

    if (existingAuthUser) {
        userId = existingAuthUser.id;
        await db.auth.admin.updateUserById(userId, {
            password,
            user_metadata: { full_name: fullName, role },
        });
    } else {
        const { data: newAuth, error: authErr } = await db.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role },
        });

        if (authErr || !newAuth.user) {
            return { success: false, message: `Lỗi tạo tài khoản Auth: ${authErr?.message || "Không xác định"}` };
        }
        userId = newAuth.user.id;
    }

    // 2. Lưu vào bảng public.users
    const { error: uErr } = await db.from("users").upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
        phone: data.phone?.trim() || null,
    });

    if (uErr) {
        return { success: false, message: `Lỗi lưu thông tin người dùng: ${uErr.message}` };
    }

    // 3. Nếu có gán trường, lưu vào public.school_memberships
    let schoolName = "Tài khoản tự do / Admin";
    let schoolCode = "GLOBAL";

    if (schoolId) {
        const { data: school } = await db.from("schools").select("id, name, code").eq("id", schoolId).maybeSingle();
        if (school) {
            schoolName = school.name;
            schoolCode = school.code;
        }

        await db.from("school_memberships").upsert({
            school_id: schoolId,
            user_id: userId,
            role,
            status: "active",
            updated_at: new Date().toISOString(),
        }, { onConflict: "school_id,user_id,role" });
    }

    // 4. Ghi vết kiểm toán
    await recordAuditEvent({
        schoolId: schoolId || "00000000-0000-0000-0000-000000000000",
        actorId: admin.id,
        action: "super_admin_create_account",
        entityType: "user",
        entityId: userId,
        reason: `Super Admin tạo tài khoản ${email} vai trò ${role} tại ${schoolName}`,
        afterState: {
            email,
            full_name: fullName,
            role,
            school_id: schoolId,
            school_name: schoolName,
        },
    });

    revalidatePath("/super-admin/accounts");
    revalidatePath("/super-admin/schools");

    return {
        success: true,
        message: `Đã tạo thành công tài khoản ${email} cho ${schoolName}!`,
        user: {
            id: userId,
            email,
            full_name: fullName,
            role,
            phone: data.phone || null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            school_id: schoolId,
            school_name: schoolName,
            school_code: schoolCode,
            status: "active",
        },
    };
}
