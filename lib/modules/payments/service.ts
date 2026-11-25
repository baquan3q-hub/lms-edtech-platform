import "server-only";
import { z } from "zod";
import { AccessError, requireActor } from "@/lib/auth/authorize";
import { isVerifiedGuardian } from "@/lib/auth/policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createVNPayUrl, newVnpTxnRef } from "@/lib/vnpay";
import { createStripePaymentIntent } from "@/lib/stripe";

type AdminDb = ReturnType<typeof createAdminClient>;

/** Hoá đơn còn nhận thanh toán online. `pending` = phụ huynh báo đã chuyển khoản, admin chưa duyệt. */
const PAYABLE_STATUSES = ["unpaid", "overdue", "pending"];
const TRANSFERABLE_STATUSES = ["unpaid", "overdue"];

export const createPaymentSchema = z.object({
  invoiceId: z.uuid(),
  provider: z.enum(["vnpay", "stripe"]),
});
export const invoiceIdSchema = z.object({ invoiceId: z.uuid() });

/**
 * Phụ huynh đang đăng nhập phải là người giám hộ đã xác minh, còn hiệu lực, của học sinh
 * trên hoá đơn, và hoá đơn phải thuộc trường hiện tại. Hoá đơn trường khác trả 404.
 */
export async function requireInvoicePayer(invoiceId: string) {
  const actor = await requireActor(["parent"]);
  const { data: invoice, error } = await actor.db.from("invoices")
    .select("id, school_id, student_id, amount, status, invoice_number, fee_plans ( name )")
    .eq("id", invoiceId).maybeSingle();
  if (error) throw error;
  if (!invoice || invoice.school_id !== actor.schoolId) throw new AccessError(404, "Hóa đơn không tồn tại.", "NOT_FOUND");

  const { data: links, error: linkError } = await actor.db.from("parent_students")
    .select("verification_status, valid_from, valid_to")
    .eq("school_id", actor.schoolId).eq("parent_id", actor.id).eq("student_id", invoice.student_id);
  if (linkError) throw linkError;
  if (!links?.some(link => isVerifiedGuardian(link))) throw new AccessError(403);
  return { actor, invoice };
}

function clientIp(forwardedFor: string | null) {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first && first.length <= 45 ? first : "127.0.0.1";
}

/** Tạo một lần thanh toán online. Số tiền luôn lấy từ hoá đơn trong DB. */
export async function createPaymentAttempt(input: z.infer<typeof createPaymentSchema>, forwardedFor: string | null) {
  const { actor, invoice } = await requireInvoicePayer(input.invoiceId);
  if (!PAYABLE_STATUSES.includes(invoice.status)) {
    throw new AccessError(409, invoice.status === "paid" ? "Hóa đơn đã được thanh toán." : "Hóa đơn không còn nhận thanh toán.", "INVOICE_NOT_PAYABLE");
  }
  const amount = Number(invoice.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new AccessError(409, "Số tiền hóa đơn không hợp lệ.", "INVALID_AMOUNT");
  const ipAddress = clientIp(forwardedFor);
  const feePlan = (Array.isArray(invoice.fee_plans) ? invoice.fee_plans[0] : invoice.fee_plans) as { name?: string } | null;

  const insertPayment = async (orderId: string) => {
    const { error } = await actor.db.from("payments").insert({
      invoice_id: invoice.id, school_id: invoice.school_id, user_id: actor.id, amount, currency: "VND",
      provider: input.provider, provider_order_id: orderId, status: "pending", ip_address: ipAddress,
    });
    if (error) throw error;
  };

  if (input.provider === "vnpay") {
    const txnRef = newVnpTxnRef();
    await insertPayment(txnRef);
    const payUrl = createVNPayUrl({ txnRef, amount, orderInfo: `Thanh toan ${invoice.invoice_number ?? ""}`, ipAddress });
    return { provider: "vnpay" as const, payUrl };
  }

  // Stripe: PaymentIntent id là mã đơn, webhook tra theo đúng id này.
  const intent = await createStripePaymentIntent({
    amount, currency: "vnd", invoiceId: invoice.id,
    description: `${feePlan?.name ?? "Học phí"} - ${invoice.invoice_number ?? ""}`,
  });
  await insertPayment(intent.id);
  return { provider: "stripe" as const, clientSecret: intent.client_secret };
}

/** Phụ huynh báo đã chuyển khoản; admin mới là người duyệt `paid` (B19). */
export async function confirmBankTransfer(invoiceId: string) {
  const { invoice } = await requireInvoicePayer(invoiceId);
  if (!TRANSFERABLE_STATUSES.includes(invoice.status)) {
    throw new AccessError(409, "Hóa đơn đã được ghi nhận hoặc đã thanh toán.", "INVOICE_NOT_PAYABLE");
  }
  const at = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const { data, error } = await createAdminClient().from("invoices")
    .update({ status: "pending", notes: `Phụ huynh xác nhận đã chuyển khoản lúc ${at}` })
    .eq("id", invoice.id).eq("school_id", invoice.school_id).in("status", TRANSFERABLE_STATUSES)
    .select("id");
  if (error) throw error;
  // Hai yêu cầu đến cùng lúc: chỉ một cái đổi được trạng thái.
  if (!data?.length) throw new AccessError(409, "Hóa đơn đã được ghi nhận hoặc đã thanh toán.", "INVOICE_NOT_PAYABLE");
  return { message: "Đã ghi nhận chuyển khoản. Admin sẽ xác nhận sớm." };
}

export type ProviderPaymentOutcome =
  | "not_found" | "duplicate" | "amount_mismatch" | "already_processed" | "confirmed" | "failed";

export interface ProviderPaymentResult {
  status: ProviderPaymentOutcome;
  previous_outcome?: ProviderPaymentOutcome;
  payment_id?: string;
  invoice_id?: string;
  invoice_already_paid?: boolean;
}

/**
 * Gọi RPC `confirm_provider_payment`: khoá payment, kiểm số tiền, cập nhật payments và
 * invoices trong một transaction và chống xử lý trùng theo event id. Chỉ gọi sau khi đã
 * xác thực chữ ký của cổng thanh toán. Lỗi DB được ném ra để webhook trả mã cho phép gửi lại.
 */
export async function confirmProviderPayment(db: AdminDb, input: {
  provider: "vnpay" | "stripe";
  orderId: string;
  eventId: string;
  succeeded: boolean;
  amount: number;
  currency: string;
  txnId: string | null;
  raw: Record<string, unknown>;
}): Promise<ProviderPaymentResult> {
  const { data, error } = await db.rpc("confirm_provider_payment", {
    p_provider: input.provider, p_order_id: input.orderId, p_event_id: input.eventId,
    p_succeeded: input.succeeded, p_amount: input.amount, p_currency: input.currency,
    p_txn_id: input.txnId, p_raw: input.raw,
  });
  if (error) throw error;
  return data as ProviderPaymentResult;
}
