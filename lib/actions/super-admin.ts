"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { getCircuitState } from "@/lib/ai/quota-manager";
import crypto from "crypto";

export interface PlatformOverviewStats {
    totalSchools: number;
    activeSchools: number;
    inactiveSchools: number;
    totalUsers: number;
    userBreakdown: {
        teachers: number;
        students: number;
        parents: number;
        admins: number;
    };
    totalClasses: number;
    totalExams: number;
    totalHomework: number;
    totalInvoices: number;
    totalRevenue: number;
    aiTokenStats: {
        totalQuota: number;
        totalUsed: number;
        totalJobs: number;
        percentUsed: number;
    };
    schoolsSummary: Array<{
        id: string;
        code: string;
        name: string;
        status: string;
        ai_enabled: boolean;
        classCount: number;
        teacherCount: number;
        studentCount: number;
        parentCount: number;
        tokenQuota: number;
        tokensUsed: number;
        percentUsed: number;
        circuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
        createdAt: string;
    }>;
}

function deriveSchoolApiKey(schoolId: string, code: string): string {
    const hash = crypto
        .createHash("sha256")
        .update(`eduschool_salt_2026_${schoolId}_${code}`)
        .digest("hex")
        .slice(0, 24);
    return `sch_live_${hash}`;
}

/**
 * Lấy dữ liệu tổng quan toàn bộ nền tảng cho Super Admin (Platform Owner)
 */
export async function getSuperAdminDashboardData(): Promise<PlatformOverviewStats> {
    await requireSuperAdmin();

    const db = createAdminClient();
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    // Tối ưu hóa: Chạy song song toàn bộ 8 truy vấn dữ liệu nền tảng
    const [
        schoolsRes,
        membershipsRes,
        usersRes,
        classesRes,
        examsRes,
        hwRes,
        invRes,
        quotaRes,
    ] = await Promise.all([
        db.from("schools").select("*").order("created_at", { ascending: true }),
        db.from("school_memberships").select("school_id, role, status"),
        db.from("users").select("id, role"),
        db.from("classes").select("id, school_id"),
        db.from("exams").select("id, school_id"),
        db.from("homework").select("id, school_id"),
        db.from("invoices").select("id, school_id, amount, status"),
        db.from("school_ai_quotas").select("*").eq("month", currentMonth),
    ]);

    const safeSchools = schoolsRes.data || [];
    const safeMemberships = membershipsRes.data || [];
    const safeUsers = usersRes.data || [];
    const safeClasses = classesRes.data || [];
    const safeExams = examsRes.data || [];
    const safeHomework = hwRes.data || [];
    const safeInvoices = invRes.data || [];
    const safeQuotas = quotaRes.data || [];

    // Tính toán Breakdown người dùng
    const userBreakdown = {
        teachers: safeUsers.filter((u) => u.role === "teacher").length,
        students: safeUsers.filter((u) => u.role === "student").length,
        parents: safeUsers.filter((u) => u.role === "parent").length,
        admins: safeUsers.filter((u) => u.role === "admin" || (u.role as string) === "super_admin").length,
    };

    // Tính toán Doanh thu học phí toàn nền tảng
    const totalRevenue = safeInvoices.reduce((acc, inv) => {
        if (inv.status === "completed" || inv.status === "paid") {
            return acc + (Number(inv.amount) || 0);
        }
        return acc;
    }, 0);

    // Tính toán AI Tokens
    const totalQuota = safeQuotas.reduce((acc, q) => acc + (q.token_quota || 0), 0);
    const totalUsed = safeQuotas.reduce((acc, q) => acc + (q.tokens_used || 0), 0);
    const totalJobs = safeQuotas.reduce((acc, q) => acc + (q.job_count || 0), 0);
    const percentUsed = totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0;

    // Map data theo từng trường
    const quotaMap = new Map<string, any>();
    safeQuotas.forEach((q) => quotaMap.set(q.school_id, q));

    const schoolsSummary = safeSchools.map((s) => {
        const q = quotaMap.get(s.id);
        const tQuota = q?.token_quota || 500000;
        const tUsed = q?.tokens_used || 0;
        const pUsed = tQuota > 0 ? Math.min(100, Math.round((tUsed / tQuota) * 100)) : 0;

        const schoolMems = safeMemberships.filter((m) => m.school_id === s.id);
        const schoolClasses = safeClasses.filter((c) => c.school_id === s.id);

        return {
            id: s.id,
            code: s.code,
            name: s.name,
            status: s.status,
            ai_enabled: s.ai_enabled ?? true,
            classCount: schoolClasses.length,
            teacherCount: schoolMems.filter((m) => m.role === "teacher").length,
            studentCount: schoolMems.filter((m) => m.role === "student").length,
            parentCount: schoolMems.filter((m) => m.role === "parent").length,
            tokenQuota: tQuota,
            tokensUsed: tUsed,
            percentUsed: pUsed,
            circuitState: getCircuitState(s.id),
            createdAt: s.created_at,
        };
    });

    return {
        totalSchools: safeSchools.length,
        activeSchools: safeSchools.filter((s) => s.status === "active").length,
        inactiveSchools: safeSchools.filter((s) => s.status !== "active").length,
        totalUsers: safeUsers.length,
        userBreakdown,
        totalClasses: safeClasses.length,
        totalExams: safeExams.length,
        totalHomework: safeHomework.length,
        totalInvoices: safeInvoices.length,
        totalRevenue,
        aiTokenStats: {
            totalQuota,
            totalUsed,
            totalJobs,
            percentUsed,
        },
        schoolsSummary,
    };
}

export interface SchoolDeepDiveData {
    school: {
        id: string;
        code: string;
        name: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        status: string;
        ai_enabled: boolean;
        apiKey: string;
        created_at: string;
        updated_at: string;
    };
    quota: {
        token_quota: number;
        tokens_used: number;
        job_count: number;
        max_parallel_jobs: number;
        month: string;
        percentUsed: number;
    };
    circuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
    members: Array<{
        id: string;
        user_id: string;
        full_name: string;
        email: string;
        role: string;
        status: string;
        created_at: string;
    }>;
    classes: Array<{
        id: string;
        name: string | null;
        schedule: string | null;
        status: string | null;
        max_students: number;
        created_at: string;
    }>;
    exams: Array<{
        id: string;
        title: string;
        description: string | null;
        total_points: number;
        duration_minutes: number;
        is_published: boolean;
        created_at: string;
    }>;
    homework: Array<{
        id: string;
        title: string;
        total_points: number;
        due_date: string | null;
        is_published: boolean;
        created_at: string;
    }>;
    invoices: Array<{
        id: string;
        amount: number;
        status: string;
    }>;
    recentAiJobs: Array<{
        id: string;
        kind: string;
        model_name: string;
        status: string;
        actual_tokens: number;
        created_at: string;
    }>;
}

/**
 * Đào sâu toàn bộ dữ liệu chi tiết của 1 trường học cụ thể (School Deep Dive)
 */
export async function getSchoolDeepDiveData(schoolId: string): Promise<SchoolDeepDiveData | null> {
    await requireSuperAdmin();

    const db = createAdminClient();
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    // 1. Lấy thông tin trường
    const { data: school, error: sErr } = await db
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .maybeSingle();

    if (sErr || !school) return null;

    // 2. Lấy quota tháng hiện tại
    const { data: quota } = await db
        .from("school_ai_quotas")
        .select("*")
        .eq("school_id", schoolId)
        .eq("month", currentMonth)
        .maybeSingle();

    const tokenQuota = quota?.token_quota ?? 500000;
    const tokensUsed = quota?.tokens_used ?? 0;
    const percentUsed = tokenQuota > 0 ? Math.min(100, Math.round((tokensUsed / tokenQuota) * 100)) : 0;

    // 3. Lấy thành viên trường + Join users
    const { data: memberships } = await db
        .from("school_memberships")
        .select("id, user_id, role, status, created_at, user:users!school_memberships_user_id_fkey(full_name, email)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

    const members = (memberships || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        full_name: m.user?.full_name || "Chưa có tên",
        email: m.user?.email || "Chưa có email",
        role: m.role,
        status: m.status,
        created_at: m.created_at,
    }));

    // 4. Lấy lớp học của trường
    const { data: classes } = await db
        .from("classes")
        .select("id, name, schedule, status, max_students, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

    // 5. Lấy bài kiểm tra của trường
    const { data: exams } = await db
        .from("exams")
        .select("id, title, description, total_points, duration_minutes, is_published, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

    // 6. Lấy bài tập về nhà của trường
    const { data: homework } = await db
        .from("homework")
        .select("id, title, total_points, due_date, is_published, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

    // 7. Lấy hóa đơn tài chính của trường
    const { data: invoices } = await db
        .from("invoices")
        .select("id, amount, status")
        .eq("school_id", schoolId);

    // 8. Lấy 15 AI jobs gần nhất của trường
    const { data: jobs } = await db
        .from("learning_ai_jobs")
        .select("id, kind, model_name, status, actual_tokens, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(15);

    return {
        school: {
            ...school,
            apiKey: deriveSchoolApiKey(school.id, school.code),
        },
        quota: {
            token_quota: tokenQuota,
            tokens_used: tokensUsed,
            job_count: quota?.job_count ?? 0,
            max_parallel_jobs: quota?.max_parallel_jobs ?? 5,
            month: currentMonth,
            percentUsed,
        },
        circuitState: getCircuitState(schoolId),
        members,
        classes: classes || [],
        exams: exams || [],
        homework: homework || [],
        invoices: invoices || [],
        recentAiJobs: jobs || [],
    };
}
