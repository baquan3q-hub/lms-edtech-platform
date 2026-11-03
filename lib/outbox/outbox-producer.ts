import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OutboxEventInput {
  schoolId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  eventKey: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
}

/**
 * Phát hành sự kiện ra bảng hàng đợi outbox_events theo mô hình Transactional Outbox.
 * Sử dụng event_key UNIQUE để chống phát trùng lặp.
 */
export async function produceOutboxEvent(input: OutboxEventInput): Promise<{ id?: string; duplicated?: boolean; error?: string }> {
  try {
    const db = createAdminClient();

    const { data, error } = await db
      .from("outbox_events")
      .insert({
        school_id: input.schoolId,
        event_type: input.eventType,
        aggregate_type: input.aggregateType,
        aggregate_id: input.aggregateId,
        event_key: input.eventKey,
        payload: input.payload,
        status: "pending",
        attempts: 0,
        max_attempts: input.maxAttempts || 5,
        available_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      // 23505 là mã lỗi PostgreSQL unique_violation cho event_key
      if (error.code === "23505" || error.message?.includes("duplicate key")) {
        return { duplicated: true };
      }
      console.error("[OutboxProducer] Lỗi ghi outbox_events:", error.message);
      return { error: error.message };
    }

    return { id: data?.id, duplicated: false };
  } catch (err: any) {
    console.error("[OutboxProducer] Ngoại lệ khi ghi outbox:", err);
    return { error: err.message };
  }
}
