import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Quota & Circuit Breaker Manager (Phase 6)
 * Giám sát hạn mức token, concurrency và cờ bật/tắt AI theo trường học.
 */

export interface QuotaCheckResult {
    allowed: boolean;
    reason?: "AI_DISABLED_FOR_SCHOOL" | "QUOTA_EXCEEDED" | "CONCURRENCY_LIMIT_REACHED" | "CIRCUIT_OPEN" | "SYSTEM_ERROR";
    tokensUsed?: number;
    tokenQuota?: number;
    message?: string;
}

// In-memory circuit breaker state (theo trường)
interface CircuitState {
    failureCount: number;
    lastFailureTime: number;
    state: "CLOSED" | "OPEN" | "HALF_OPEN";
}

const circuitMap = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 3;
const COOLDOWN_PERIOD_MS = 30000; // 30s sau khi mở mạch sẽ thử lại (half-open)

export function getCircuitState(schoolId: string): "CLOSED" | "OPEN" | "HALF_OPEN" {
    const state = circuitMap.get(schoolId);
    if (!state) return "CLOSED";

    if (state.state === "OPEN") {
        if (Date.now() - state.lastFailureTime > COOLDOWN_PERIOD_MS) {
            state.state = "HALF_OPEN";
            return "HALF_OPEN";
        }
        return "OPEN";
    }

    return state.state;
}

export function recordAiFailure(schoolId: string) {
    const now = Date.now();
    const state = circuitMap.get(schoolId) || { failureCount: 0, lastFailureTime: 0, state: "CLOSED" };
    state.failureCount += 1;
    state.lastFailureTime = now;

    if (state.failureCount >= FAILURE_THRESHOLD) {
        state.state = "OPEN";
    }
    circuitMap.set(schoolId, state);
}

export function recordAiSuccess(schoolId: string) {
    circuitMap.delete(schoolId);
}

/**
 * Kiểm tra quyền truy cập AI và hạn mức Token của trường
 */
export async function checkSchoolAiAccess(
    schoolId: string,
    estimatedTokens = 1000
): Promise<QuotaCheckResult> {
    // 1. Kiểm tra Circuit Breaker in-memory
    const circuit = getCircuitState(schoolId);
    if (circuit === "OPEN") {
        return {
            allowed: false,
            reason: "CIRCUIT_OPEN",
            message: "Hệ thống AI của trường đang tạm ngắt mạch an toàn do sự cố từ nhà cung cấp. Vui lòng thử lại sau.",
        };
    }

    const supabase = createAdminClient();

    try {
        // 2. Gọi RPC atomic trên Supabase nếu có
        const { data: rpcData, error: rpcError } = await supabase.rpc("check_and_consume_ai_quota", {
            p_school_id: schoolId,
            p_estimated_tokens: estimatedTokens,
        });

        if (!rpcError && rpcData) {
            const res = rpcData as { allowed: boolean; reason?: string; tokens_used?: number; token_quota?: number };
            if (!res.allowed) {
                return {
                    allowed: false,
                    reason: res.reason as any,
                    tokensUsed: res.tokens_used,
                    tokenQuota: res.token_quota,
                    message: res.reason === "AI_DISABLED_FOR_SCHOOL" 
                        ? "Tính năng AI đã bị tắt theo chính sách của nhà trường."
                        : res.reason === "QUOTA_EXCEEDED"
                        ? "Hạn mức AI tháng này của trường đã đạt giới hạn."
                        : "Đã vượt quá số lượng tác vụ AI đồng thời cho phép.",
                };
            }
            return {
                allowed: true,
                tokensUsed: res.tokens_used,
                tokenQuota: res.token_quota,
            };
        }

        // 3. Fallback trực tiếp nếu RPC chưa được nạp (trong Unit Test / Môi trường mock)
        const { data: school, error: sErr } = await supabase
            .from("schools")
            .select("id, ai_enabled")
            .eq("id", schoolId)
            .maybeSingle();

        if (sErr || !school) {
            return { allowed: false, reason: "SYSTEM_ERROR", message: "Không tìm thấy dữ liệu trường học." };
        }

        // Nếu trường có cờ ai_enabled và giá trị là false
        if ((school as any).ai_enabled === false) {
            return {
                allowed: false,
                reason: "AI_DISABLED_FOR_SCHOOL",
                message: "Tính năng AI đã bị tắt theo chính sách của nhà trường.",
            };
        }

        const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
        const { data: quota } = await supabase
            .from("school_ai_quotas")
            .select("*")
            .eq("school_id", schoolId)
            .eq("month", currentMonth)
            .maybeSingle();

        if (quota) {
            if ((quota.tokens_used + estimatedTokens) > quota.token_quota) {
                return {
                    allowed: false,
                    reason: "QUOTA_EXCEEDED",
                    tokensUsed: quota.tokens_used,
                    tokenQuota: quota.token_quota,
                    message: "Hạn mức AI tháng này của trường đã đạt giới hạn.",
                };
            }
        }

        return { allowed: true };
    } catch (err: any) {
        return {
            allowed: false,
            reason: "SYSTEM_ERROR",
            message: err?.message || "Lỗi kiểm tra hạn ngạch AI.",
        };
    }
}

/**
 * Ghi nhận số Token thực tế đã sử dụng sau khi AI hoàn tất
 */
export async function recordSchoolAiTokenUsage(
    schoolId: string,
    actualTokens: number
): Promise<void> {
    const supabase = createAdminClient();
    try {
        const { error } = await supabase.rpc("record_ai_token_usage", {
            p_school_id: schoolId,
            p_actual_tokens: actualTokens,
        });

        if (error) {
            // Fallback trực tiếp nếu chưa có RPC
            const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
            const { data: q } = await supabase
                .from("school_ai_quotas")
                .select("id, tokens_used")
                .eq("school_id", schoolId)
                .eq("month", currentMonth)
                .maybeSingle();

            if (q) {
                await supabase
                    .from("school_ai_quotas")
                    .update({ tokens_used: q.tokens_used + actualTokens, updated_at: new Date().toISOString() })
                    .eq("id", q.id);
            }
        }
    } catch {
        // Không làm fail nghiệp vụ nếu log token gặp lỗi
    }
}
