import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function deriveSchoolApiKey(schoolId: string, code: string): string {
    const hash = crypto
        .createHash("sha256")
        .update(`eduschool_salt_2026_${schoolId}_${code}`)
        .digest("hex")
        .slice(0, 24);
    return `sch_live_${hash}`;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ schoolId: string }> }
) {
    const { schoolId } = await context.params;
    const apiKeyHeader = request.headers.get("x-school-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");

    if (!schoolId) {
        return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
    }

    const db = createAdminClient();

    // 1. Lấy thông tin trường
    const { data: school, error } = await db
        .from("schools")
        .select("id, code, name, address, phone, email, status, ai_enabled, created_at")
        .eq("id", schoolId)
        .maybeSingle();

    if (error || !school) {
        return NextResponse.json({ error: "Trường học không tồn tại." }, { status: 404 });
    }

    // 2. Xác thực API Key
    const expectedKey = deriveSchoolApiKey(school.id, school.code);
    if (!apiKeyHeader || apiKeyHeader !== expectedKey) {
        return NextResponse.json(
            { error: "API Key không hợp lệ hoặc bị thiếu trong header 'x-school-api-key'." },
            { status: 401 }
        );
    }

    // 3. Lấy quota tháng hiện tại
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: quota } = await db
        .from("school_ai_quotas")
        .select("token_quota, tokens_used, job_count, max_parallel_jobs, updated_at")
        .eq("school_id", schoolId)
        .eq("month", currentMonth)
        .maybeSingle();

    return NextResponse.json({
        success: true,
        data: {
            school: {
                id: school.id,
                code: school.code,
                name: school.name,
                status: school.status,
                ai_enabled: school.ai_enabled,
            },
            api_quota: {
                month: currentMonth,
                token_quota: quota?.token_quota ?? 500000,
                tokens_used: quota?.tokens_used ?? 0,
                remaining_tokens: Math.max(0, (quota?.token_quota ?? 500000) - (quota?.tokens_used ?? 0)),
                max_parallel_jobs: quota?.max_parallel_jobs ?? 5,
                job_count: quota?.job_count ?? 0,
            },
            gateway_status: "online",
            timestamp: new Date().toISOString(),
        }
    });
}
