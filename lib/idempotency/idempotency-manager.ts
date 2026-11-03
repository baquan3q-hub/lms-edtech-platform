import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export interface IdempotencyContext {
  schoolId: string;
  actorId: string;
  operation: string;
  requestKey: string;
  payload?: unknown;
}

export class IdempotencyConflictError extends Error {
  constructor(message = "Idempotency key đã được sử dụng với payload khác.") {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

export function computePayloadHash(payload: unknown): string {
  if (payload === undefined || payload === null) return "empty";
  const json = JSON.stringify(payload);
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Thực thi một tác vụ ghi nhạy cảm (nộp bài, thanh toán, điểm danh) với cơ chế Idempotency
 * - Gửi lại cùng request_key và cùng payload -> trả về kết quả đã lưu (không ghi trùng)
 * - Gửi lại cùng request_key nhưng khác payload -> báo lỗi xung đột (Conflict)
 */
export async function withIdempotency<T>(
  ctx: IdempotencyContext,
  handler: () => Promise<T>
): Promise<T> {
  const db = createAdminClient();
  const requestHash = computePayloadHash(ctx.payload);

  // 1. Kiểm tra bản ghi idempotency_key đã tồn tại chưa
  const { data: existing, error: checkError } = await db
    .from("idempotency_keys")
    .select("id, request_hash, response_data, status, created_at")
    .eq("school_id", ctx.schoolId)
    .eq("actor_id", ctx.actorId)
    .eq("operation", ctx.operation)
    .eq("request_key", ctx.requestKey)
    .maybeSingle();

  if (existing) {
    if (existing.status === "completed") {
      if (existing.request_hash && existing.request_hash !== requestHash) {
        throw new IdempotencyConflictError(
          `Idempotency key '${ctx.requestKey}' đã được xử lý nhưng với nội dung dữ liệu khác.`
        );
      }
      return existing.response_data as T;
    }

    if (existing.status === "processing") {
      const ageMs = Date.now() - new Date(existing.created_at).getTime();
      // Nếu yêu cầu đang xử lý trong vòng 30s -> báo client chờ
      if (ageMs < 30000) {
        throw new Error("Yêu cầu này đang được xử lý bởi một tiến trình khác, vui lòng chờ.");
      }
      // Nếu treo quá 30s -> cho phép retry lại
    }
  }

  // 2. Tạo hoặc đặt trạng thái processing
  let keyId = existing?.id;
  if (!keyId) {
    const { data: inserted, error: insertError } = await db
      .from("idempotency_keys")
      .insert({
        school_id: ctx.schoolId,
        actor_id: ctx.actorId,
        operation: ctx.operation,
        request_key: ctx.requestKey,
        request_hash: requestHash,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError) {
      // Trường hợp cạnh tranh (race condition): một tiến trình khác vừa insert
      if (insertError.code === "23505") {
        return withIdempotency(ctx, handler);
      }
      console.warn("[Idempotency] Không thể tạo idempotency_key, tiếp tục chạy:", insertError.message);
    } else {
      keyId = inserted?.id;
    }
  }

  // 3. Thực thi nghiệp vụ gốc
  try {
    const result = await handler();

    // 4. Lưu kết quả cache và chuyển trạng thái sang completed
    if (keyId) {
      await db
        .from("idempotency_keys")
        .update({
          status: "completed",
          response_data: result as any,
        })
        .eq("id", keyId);
    }

    return result;
  } catch (err: any) {
    if (keyId) {
      await db
        .from("idempotency_keys")
        .update({
          status: "failed",
        })
        .eq("id", keyId);
    }
    throw err;
  }
}
