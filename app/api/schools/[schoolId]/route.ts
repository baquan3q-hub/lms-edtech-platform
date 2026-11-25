import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { api } from "@/lib/api/http";
import { AccessError } from "@/lib/auth/actor-context";
import { readPresentedApiKey, verifySchoolApiKey } from "@/lib/modules/school-api-keys/service";

/**
 * Tra cứu trạng thái và hạn ngạch AI của trường cho hệ thống tích hợp.
 * Xác thực bằng API key của trường (header `x-school-api-key` hoặc `Authorization: Bearer`).
 * Không dùng session/cookie, nên không cần requireSameOrigin.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ schoolId: string }> }) {
  return api(async () => {
    const { schoolId } = await context.params;
    const db = createAdminClient();

    // Kiểm key trước khi tra trường: trường không tồn tại và key sai trả cùng một lỗi,
    // để không dò được school_id.
    if (!(await verifySchoolApiKey(db, schoolId, readPresentedApiKey(request.headers)))) {
      throw new AccessError(401, "API Key không hợp lệ, đã bị thu hồi hoặc bị thiếu trong header 'x-school-api-key'.", "INVALID_API_KEY");
    }

    const { data: school, error } = await db
      .from("schools")
      .select("id, code, name, status, ai_enabled")
      .eq("id", schoolId)
      .maybeSingle();
    if (error) throw error;
    if (!school) throw new AccessError(404, "Trường học không tồn tại.", "NOT_FOUND");

    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: quota } = await db
      .from("school_ai_quotas")
      .select("token_quota, tokens_used, job_count, max_parallel_jobs, updated_at")
      .eq("school_id", schoolId)
      .eq("month", currentMonth)
      .maybeSingle();

    const tokenQuota = quota?.token_quota ?? 500000;
    const tokensUsed = quota?.tokens_used ?? 0;
    return {
      school: { id: school.id, code: school.code, name: school.name, status: school.status, ai_enabled: school.ai_enabled },
      api_quota: {
        month: currentMonth,
        token_quota: tokenQuota,
        tokens_used: tokensUsed,
        remaining_tokens: Math.max(0, tokenQuota - tokensUsed),
        max_parallel_jobs: quota?.max_parallel_jobs ?? 5,
        job_count: quota?.job_count ?? 0,
      },
      gateway_status: "online",
      timestamp: new Date().toISOString(),
    };
  });
}
