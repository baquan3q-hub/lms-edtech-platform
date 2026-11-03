import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditEventInput {
  schoolId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId?: string;
  ipAddress?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  reason?: string;
}

const REDACTED_KEYS = new Set([
  "password",
  "password_hash",
  "token",
  "refresh_token",
  "secret",
  "activation_code",
  "invite_code",
  "credit_card",
]);

/**
 * Lọc bỏ thông tin định danh nhạy cảm (PII/secrets) trước khi ghi audit log
 */
export function sanitizeAuditState(state: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!state || typeof state !== "object") return null;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey) || lowerKey.includes("password") || lowerKey.includes("secret")) {
      sanitized[key] = "[REDACTED]";
    } else if (Array.isArray(value)) {
      // Giới hạn mảng câu hỏi / bài làm lớn để tránh phình dung lượng log
      sanitized[key] = value.length > 20 ? `[Array of ${value.length} items]` : value;
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      sanitized[key] = sanitizeAuditState(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Ghi vết kiểm toán (Audit Event) vào bảng public.audit_events
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<{ id?: string; error?: string }> {
  try {
    const db = createAdminClient();

    const payload = {
      school_id: input.schoolId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      request_id: input.requestId || null,
      ip_address: input.ipAddress || null,
      before_state: sanitizeAuditState(input.beforeState),
      after_state: sanitizeAuditState(input.afterState),
      reason: input.reason || null,
    };

    const { data, error } = await db
      .from("audit_events")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[AuditLogger] Lỗi ghi audit_events:", error.message);
      return { error: error.message };
    }

    return { id: data?.id };
  } catch (err: any) {
    console.error("[AuditLogger] Ngoại lệ khi ghi audit event:", err);
    return { error: err.message };
  }
}
