import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => {
  process.env.VNPAY_HASH_SECRET = "test-vnpay-secret";
  process.env.VNPAY_TMN_CODE = "TESTTMN";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  return { result: { status: "confirmed" } as Record<string, unknown> | Error, calls: [] as Record<string, unknown>[] };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/modules/payments/service", () => ({
  confirmProviderPayment: async (_db: unknown, input: Record<string, unknown>) => {
    state.calls.push(input);
    if (state.result instanceof Error) throw state.result;
    return state.result;
  },
}));

import { createVNPayUrl, formatVnpDate, newVnpTxnRef, verifyVNPayReturn } from "@/lib/vnpay";
import { stripe } from "@/lib/stripe";
import { GET as vnpayIpn } from "@/app/api/payment/vnpay/ipn/route";
import { POST as stripeWebhook } from "@/app/api/payment/stripe/webhook/route";

function signVnp(params: Record<string, string>) {
  const sorted = Object.keys(params).sort().reduce((acc, key) => ({ ...acc, [key]: params[key] }), {} as Record<string, string>);
  const data = new URLSearchParams(sorted).toString();
  return { ...params, vnp_SecureHash: crypto.createHmac("sha512", "test-vnpay-secret").update(data, "utf8").digest("hex") };
}

function ipnRequest(params: Record<string, string>) {
  return new NextRequest(`http://localhost/api/payment/vnpay/ipn?${new URLSearchParams(params).toString()}`);
}

const baseIpn = () => ({
  vnp_Amount: "250000000", vnp_ResponseCode: "00", vnp_TransactionStatus: "00",
  vnp_TxnRef: "abc123", vnp_TransactionNo: "14000001", vnp_TmnCode: "TESTTMN",
});
const okIpn = () => signVnp(baseIpn());

beforeEach(() => {
  state.result = { status: "confirmed" };
  state.calls = [];
});

describe("lib/vnpay", () => {
  it("formats dates in GMT+7", () => {
    expect(formatVnpDate(new Date("2026-11-25T17:30:05Z"))).toBe("20261126003005");
  });

  it("builds a signed URL with a unique TxnRef and a 15-minute expiry in local time", () => {
    const txnRef = newVnpTxnRef();
    expect(txnRef).toMatch(/^[0-9a-f]{32}$/);
    expect(newVnpTxnRef()).not.toBe(txnRef);
    const url = new URL(createVNPayUrl({ txnRef, amount: 2500000, orderInfo: "Thanh toán INV-1", ipAddress: "1.2.3.4", now: new Date("2026-11-25T01:00:00Z") }));
    const params = Object.fromEntries(url.searchParams);
    expect(params).toMatchObject({ vnp_TxnRef: txnRef, vnp_Amount: "250000000", vnp_CreateDate: "20261125080000", vnp_ExpireDate: "20261125081500" });
    expect(verifyVNPayReturn(params).isValid).toBe(true);
    expect(verifyVNPayReturn({ ...params, vnp_Amount: "100" }).isValid).toBe(false);
  });

  it("treats a missing or malformed hash as invalid", () => {
    const params = okIpn();
    expect(verifyVNPayReturn({ ...params, vnp_SecureHash: "" }).isValid).toBe(false);
    expect(verifyVNPayReturn({ ...params, vnp_SecureHash: "zz" }).isValid).toBe(false);
    expect(verifyVNPayReturn({ ...params, vnp_TransactionStatus: "02" }).isValid).toBe(false);
  });
});

describe("GET /api/payment/vnpay/ipn", () => {
  const code = async (res: Response) => (await res.json()).RspCode;

  it("rejects a bad signature with 97 and never touches the DB", async () => {
    expect(await code(await vnpayIpn(ipnRequest({ ...okIpn(), vnp_Amount: "1" })))).toBe("97");
    expect(state.calls).toHaveLength(0);
  });

  it("passes the provider amount (divided by 100) and a stable event id to the RPC", async () => {
    expect(await code(await vnpayIpn(ipnRequest(okIpn())))).toBe("00");
    expect(state.calls[0]).toMatchObject({ provider: "vnpay", orderId: "abc123", eventId: "abc123:14000001:00", succeeded: true, amount: 2500000, currency: "VND" });
  });

  it("maps RPC outcomes to VNPay response codes", async () => {
    for (const [result, expected] of [
      [{ status: "not_found" }, "01"],
      [{ status: "already_processed" }, "02"],
      [{ status: "duplicate", previous_outcome: "confirmed" }, "02"],
      [{ status: "amount_mismatch" }, "04"],
      [{ status: "duplicate", previous_outcome: "amount_mismatch" }, "04"],
      [{ status: "failed" }, "00"],
    ] as const) {
      state.result = { ...result };
      expect(await code(await vnpayIpn(ipnRequest(okIpn())))).toBe(expected);
    }
  });

  it("returns 99 when the DB fails so VNPay retries", async () => {
    state.result = new Error("db down");
    expect(await code(await vnpayIpn(ipnRequest(okIpn())))).toBe("99");
  });

  it("rejects an amount that is not a whole number of dong", async () => {
    expect(await code(await vnpayIpn(ipnRequest(signVnp({ ...baseIpn(), vnp_Amount: "250000050" }))))).toBe("04");
    expect(state.calls).toHaveLength(0);
  });

  it("reports a declined transaction as not succeeded", async () => {
    await vnpayIpn(ipnRequest(signVnp({ ...baseIpn(), vnp_ResponseCode: "24", vnp_TransactionStatus: "02" })));
    expect(state.calls[0]).toMatchObject({ succeeded: false });
  });
});

describe("POST /api/payment/stripe/webhook", () => {
  function stripeRequest(event: Record<string, unknown>, secret = "whsec_test_secret") {
    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return new Request("http://localhost/api/payment/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } });
  }
  const intentEvent = (type: string) => ({
    id: "evt_1", object: "event", type,
    data: { object: { id: "pi_1", object: "payment_intent", amount: 2500000, amount_received: type.endsWith("succeeded") ? 2500000 : 0, currency: "vnd", status: "succeeded" } },
  });

  it("rejects an invalid signature", async () => {
    expect((await stripeWebhook(stripeRequest(intentEvent("payment_intent.succeeded"), "whsec_wrong"))).status).toBe(400);
    expect(state.calls).toHaveLength(0);
  });

  it("confirms by PaymentIntent id with the provider's received amount", async () => {
    expect((await stripeWebhook(stripeRequest(intentEvent("payment_intent.succeeded")))).status).toBe(200);
    expect(state.calls[0]).toMatchObject({ provider: "stripe", orderId: "pi_1", eventId: "evt_1", succeeded: true, amount: 2500000, currency: "vnd" });
  });

  it("acknowledges duplicates, unknown orders and amount mismatches with 200", async () => {
    for (const status of ["duplicate", "not_found", "amount_mismatch", "already_processed"]) {
      state.result = { status };
      expect((await stripeWebhook(stripeRequest(intentEvent("payment_intent.succeeded")))).status).toBe(200);
    }
  });

  it("returns 500 on DB failure so Stripe retries", async () => {
    state.result = new Error("db down");
    expect((await stripeWebhook(stripeRequest(intentEvent("payment_intent.succeeded")))).status).toBe(500);
  });

  it("records payment_failed and ignores unrelated events", async () => {
    await stripeWebhook(stripeRequest(intentEvent("payment_intent.payment_failed")));
    expect(state.calls[0]).toMatchObject({ succeeded: false });
    expect((await stripeWebhook(stripeRequest(intentEvent("charge.refunded")))).status).toBe(200);
    expect(state.calls).toHaveLength(1);
  });
});
