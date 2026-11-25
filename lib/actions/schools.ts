"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { checkSchoolAiAccess, getCircuitState } from "@/lib/ai/quota-manager";
import { getSchoolApiKeyInfo, revokeSchoolApiKey, rotateSchoolApiKey, type SchoolApiKeyInfo } from "@/lib/modules/school-api-keys/service";

export interface SchoolWithQuota {
    id: string;
    code: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    status: "active" | "inactive" | "archived";
    ai_enabled: boolean;
    /** Metadata của key đang hiệu lực; key gốc chỉ trả về một lần lúc tạo. */
    apiKey: SchoolApiKeyInfo | null;
    createdAt: string;
    quota?: {
        id: string;
        month: string;
        token_quota: number;
        tokens_used: number;
        job_count: number;
        max_parallel_jobs: number;
        percentUsed: number;
    };
    classCount: number;
    memberCount: number;
    circuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
}

/**
 * Lấy danh sách toàn bộ trường học cùng Quota API và trạng thái
 */
export async function getSchoolsWithApiQuotas(): Promise<SchoolWithQuota[]> {
    await requireSuperAdmin();

    const db = createAdminClient();
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    // 1. Lấy danh sách trường
    const { data: schools, error: schoolErr } = await db
        .from("schools")
        .select("*")
        .order("created_at", { ascending: true });

    if (schoolErr) {
        console.error("Lỗi lấy danh sách schools:", schoolErr.message);
        return [];
    }

    if (!schools || schools.length === 0) return [];

    const apiKeys = await getSchoolApiKeyInfo(db, schools.map((s) => s.id));

    // 2. Lấy quota tháng hiện tại
    const { data: quotas } = await db
        .from("school_ai_quotas")
        .select("*")
        .eq("month", currentMonth);

    const quotaMap = new Map<string, any>();
    quotas?.forEach((q) => quotaMap.set(q.school_id, q));

    // 3. Đếm số lớp học theo trường
    const { data: classes } = await db
        .from("classes")
        .select("id, school_id");

    const classCountMap = new Map<string, number>();
    classes?.forEach((c) => {
        if (c.school_id) {
            classCountMap.set(c.school_id, (classCountMap.get(c.school_id) || 0) + 1);
        }
    });

    // 4. Đếm số thành viên (memberships) theo trường
    const { data: memberships } = await db
        .from("school_memberships")
        .select("id, school_id")
        .eq("status", "active");

    const memberCountMap = new Map<string, number>();
    memberships?.forEach((m) => {
        if (m.school_id) {
            memberCountMap.set(m.school_id, (memberCountMap.get(m.school_id) || 0) + 1);
        }
    });

    return schools.map((s) => {
        const q = quotaMap.get(s.id);
        const tokenQuota = q?.token_quota ?? 500000;
        const tokensUsed = q?.tokens_used ?? 0;
        const percent = tokenQuota > 0 ? Math.min(100, Math.round((tokensUsed / tokenQuota) * 100)) : 0;

        return {
            id: s.id,
            code: s.code,
            name: s.name,
            address: s.address,
            phone: s.phone,
            email: s.email,
            status: s.status,
            ai_enabled: s.ai_enabled ?? true,
            apiKey: apiKeys.get(s.id) ?? null,
            createdAt: s.created_at,
            quota: {
                id: q?.id || "",
                month: currentMonth,
                token_quota: tokenQuota,
                tokens_used: tokensUsed,
                job_count: q?.job_count ?? 0,
                max_parallel_jobs: q?.max_parallel_jobs ?? 5,
                percentUsed: percent,
            },
            classCount: classCountMap.get(s.id) || 0,
            memberCount: memberCountMap.get(s.id) || 0,
            circuitState: getCircuitState(s.id),
        };
    });
}

/**
 * Thêm một trường học mới vào hệ thống
 */
export async function createSchoolAction(data: {
    code: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    ai_enabled?: boolean;
    token_quota?: number;
    max_parallel_jobs?: number;
}) {
    await requireSuperAdmin();

    const db = createAdminClient();
    const cleanCode = data.code.trim().toUpperCase();

    // Kiểm tra trùng mã trường
    const { data: existing } = await db
        .from("schools")
        .select("id")
        .eq("code", cleanCode)
        .maybeSingle();

    if (existing) {
        return { success: false, error: `Mã trường '${cleanCode}' đã tồn tại trong hệ thống!` };
    }

    const { data: newSchool, error: insertErr } = await db
        .from("schools")
        .insert({
            code: cleanCode,
            name: data.name.trim(),
            address: data.address?.trim() || null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            status: "active",
            ai_enabled: data.ai_enabled ?? true,
        })
        .select("*")
        .single();

    if (insertErr || !newSchool) {
        return { success: false, error: insertErr?.message || "Không thể tạo trường học." };
    }

    // Khởi tạo Quota tháng hiện tại cho trường mới
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    await db.from("school_ai_quotas").insert({
        school_id: newSchool.id,
        month: currentMonth,
        token_quota: data.token_quota || 500000,
        tokens_used: 0,
        job_count: 0,
        max_parallel_jobs: data.max_parallel_jobs || 5,
    });

    revalidatePath("/admin/schools");
    return { success: true, school: newSchool };
}

/**
 * Cập nhật thông tin cơ bản trường học
 */
export async function updateSchoolAction(
    schoolId: string,
    data: {
        name: string;
        code: string;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
        status?: "active" | "inactive" | "archived";
        ai_enabled?: boolean;
    }
) {
    await requireSuperAdmin();

    const db = createAdminClient();
    const { error } = await db
        .from("schools")
        .update({
            name: data.name.trim(),
            code: data.code.trim().toUpperCase(),
            address: data.address?.trim() || null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            status: data.status || "active",
            ai_enabled: data.ai_enabled ?? true,
            updated_at: new Date().toISOString(),
        })
        .eq("id", schoolId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/schools");
    return { success: true };
}

/**
 * Tạo API key mới cho trường (thu hồi key cũ). Key gốc chỉ trả về đúng lần này.
 */
export async function rotateSchoolApiKeyAction(schoolId: string): Promise<{ success: boolean; key?: string; info?: SchoolApiKeyInfo; error?: string }> {
    try {
        const { key, info } = await rotateSchoolApiKey(schoolId);
        revalidatePath("/admin/schools");
        revalidatePath("/super-admin/api-gateway");
        revalidatePath(`/super-admin/schools/${schoolId}`);
        return { success: true, key, info };
    } catch (error: any) {
        console.error("Lỗi tạo API key trường:", error?.code || error?.name);
        return { success: false, error: error?.name === "AccessError" ? error.message : "Không tạo được API key mới." };
    }
}

/**
 * Thu hồi API key đang dùng của trường.
 */
export async function revokeSchoolApiKeyAction(schoolId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await revokeSchoolApiKey(schoolId);
        revalidatePath("/admin/schools");
        revalidatePath("/super-admin/api-gateway");
        revalidatePath(`/super-admin/schools/${schoolId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi thu hồi API key trường:", error?.code || error?.name);
        return { success: false, error: error?.name === "AccessError" ? error.message : "Không thu hồi được API key." };
    }
}

/**
 * Bật / Tắt trực tiếp quyền gọi AI API của trường
 */
export async function toggleSchoolAiAction(schoolId: string, enabled: boolean) {
    await requireSuperAdmin();

    const db = createAdminClient();
    const { error } = await db
        .from("schools")
        .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("id", schoolId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/schools");
    return { success: true };
}

/**
 * Cập nhật hạn mức API / AI Token Quota cho trường học
 */
export async function updateSchoolQuotaAction(
    schoolId: string,
    data: {
        token_quota: number;
        max_parallel_jobs: number;
        resetTokensUsed?: boolean;
    }
) {
    await requireSuperAdmin();

    const db = createAdminClient();
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    const updatePayload: Record<string, any> = {
        token_quota: data.token_quota,
        max_parallel_jobs: data.max_parallel_jobs,
        updated_at: new Date().toISOString(),
    };

    if (data.resetTokensUsed) {
        updatePayload.tokens_used = 0;
        updatePayload.job_count = 0;
    }

    // 1. Thử cập nhật bản ghi tháng hiện tại
    const { data: existingQuota } = await db
        .from("school_ai_quotas")
        .select("id")
        .eq("school_id", schoolId)
        .eq("month", currentMonth)
        .maybeSingle();

    if (existingQuota) {
        const { error } = await db
            .from("school_ai_quotas")
            .update(updatePayload)
            .eq("id", existingQuota.id);

        if (error) return { success: false, error: error.message };
    } else {
        // Tạo mới nếu chưa có
        const { error } = await db.from("school_ai_quotas").insert({
            school_id: schoolId,
            month: currentMonth,
            token_quota: data.token_quota,
            tokens_used: 0,
            job_count: 0,
            max_parallel_jobs: data.max_parallel_jobs,
        });

        if (error) return { success: false, error: error.message };
    }

    revalidatePath("/admin/schools");
    return { success: true };
}

/**
 * Kiểm tra thử nghiệm kết nối API & AI Quota trực tiếp (Ping test)
 */
export async function testSchoolAiApiAction(schoolId: string) {
    await requireSuperAdmin();

    const startTime = Date.now();
    try {
        const checkResult = await checkSchoolAiAccess(schoolId, 100);
        const latencyMs = Date.now() - startTime;
        const circuitState = getCircuitState(schoolId);

        return {
            success: true,
            latencyMs,
            circuitState,
            allowed: checkResult.allowed,
            reason: checkResult.reason,
            tokensUsed: checkResult.tokensUsed,
            tokenQuota: checkResult.tokenQuota,
            message: checkResult.message || (checkResult.allowed ? "Kết nối API & Quota hoạt động ổn định!" : "Hạn ngạch không khả dụng."),
        };
    } catch (err: any) {
        return {
            success: false,
            latencyMs: Date.now() - startTime,
            circuitState: getCircuitState(schoolId),
            allowed: false,
            message: err?.message || "Lỗi kiểm tra API.",
        };
    }
}
