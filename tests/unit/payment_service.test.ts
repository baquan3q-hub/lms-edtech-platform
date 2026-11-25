import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const state = vi.hoisted(() => {
  process.env.VNPAY_HASH_SECRET = "test-vnpay-secret";
  return {
    tables: {} as Record<string, Row[]>,
    actor: { id: "parent-1", schoolId: "school-a", roles: ["parent"] } as Row,
    stripeCalls: [] as Row[],
  };
});

function fakeDb() {
  return {
    from(table: string) {
      const rows = (state.tables[table] ||= []);
      const filters: ((row: Row) => boolean)[] = [];
      let op: "select" | "update" | "insert" = "select";
      let patch: Row = {};
      const matching = () => rows.filter(row => filters.every(f => f(row)));
      const run = () => {
        if (op === "update") { const hit = matching(); hit.forEach(r => Object.assign(r, patch)); return { data: hit.map(r => ({ id: r.id })), error: null }; }
        return { data: op === "insert" ? null : matching(), error: null };
      };
      const query = {
        select: () => query,
        insert: (values: Row) => { op = "insert"; rows.push(values); return query; },
        update: (values: Row) => { op = "update"; patch = values; return query; },
        eq: (field: string, value: unknown) => { filters.push(r => r[field] === value); return query; },
        in: (field: string, values: unknown[]) => { filters.push(r => values.includes(r[field])); return query; },
        maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(run()).then(resolve),
      };
      return query;
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeDb() }));
vi.mock("@/lib/auth/authorize", () => {
  class AccessError extends Error {
    constructor(public status: number, message = "Không có quyền truy cập.", public code = "FORBIDDEN") { super(message); }
  }
  return {
    AccessError,
    requireActor: async (roles?: string[]) => {
      if (roles && !roles.some(r => (state.actor.roles as string[]).includes(r))) throw new AccessError(403, "role", "FORBIDDEN_ROLE");
      return { ...state.actor, db: fakeDb() };
    },
  };
});
vi.mock("@/lib/stripe", () => ({
  createStripePaymentIntent: async (params: Row) => { state.stripeCalls.push(params); return { id: "pi_test_1", client_secret: "pi_test_1_secret" }; },
}));

import { confirmBankTransfer, createPaymentAttempt } from "@/lib/modules/payments/service";
import { schoolDate } from "@/lib/auth/policy";

const invoice = (over: Row = {}) => ({ id: "inv-1", school_id: "school-a", student_id: "student-1", amount: 2500000, status: "unpaid", invoice_number: "INV-1", fee_plans: { name: "Học phí T11" }, ...over });

beforeEach(() => {
  state.actor = { id: "parent-1", schoolId: "school-a", roles: ["parent"] };
  state.stripeCalls = [];
  state.tables = {
    invoices: [invoice()],
    parent_students: [{ school_id: "school-a", parent_id: "parent-1", student_id: "student-1", verification_status: "verified", valid_from: schoolDate(), valid_to: null }],
    payments: [],
  };
});

describe("createPaymentAttempt", () => {
  it("creates a VNPay attempt with a unique TxnRef, the DB amount and the school id", async () => {
    const result = await createPaymentAttempt({ invoiceId: "inv-1", provider: "vnpay" }, "203.0.113.5, 10.0.0.1");
    const payment = state.tables.payments[0];
    expect(payment).toMatchObject({ invoice_id: "inv-1", school_id: "school-a", user_id: "parent-1", amount: 2500000, provider: "vnpay", status: "pending", ip_address: "203.0.113.5" });
    expect(payment.provider_order_id).toMatch(/^[0-9a-f]{32}$/);
    expect(result.provider).toBe("vnpay");
    expect(new URL((result as { payUrl: string }).payUrl).searchParams.get("vnp_TxnRef")).toBe(payment.provider_order_id);
    // Thử lần hai cho cùng hoá đơn: mã đơn khác.
    await createPaymentAttempt({ invoiceId: "inv-1", provider: "vnpay" }, null);
    expect(state.tables.payments[1].provider_order_id).not.toBe(payment.provider_order_id);
    // Không đổi trạng thái hoá đơn khi mới tạo lần thanh toán.
    expect(state.tables.invoices[0].status).toBe("unpaid");
  });

  it("uses the PaymentIntent id as the Stripe order id and sends no student name", async () => {
    const result = await createPaymentAttempt({ invoiceId: "inv-1", provider: "stripe" }, null);
    expect(result).toEqual({ provider: "stripe", clientSecret: "pi_test_1_secret" });
    expect(state.tables.payments[0].provider_order_id).toBe("pi_test_1");
    expect(state.stripeCalls[0]).not.toHaveProperty("studentName");
  });

  it("hides another school's invoice (404) and rejects unverified, revoked or expired guardians (403)", async () => {
    state.tables.invoices = [invoice({ school_id: "school-b" })];
    await expect(createPaymentAttempt({ invoiceId: "inv-1", provider: "vnpay" }, null)).rejects.toMatchObject({ status: 404 });
    state.tables.invoices = [invoice()];
    for (const link of [{ verification_status: "pending" }, { verification_status: "revoked" }, { valid_to: "2000-01-01" }]) {
      Object.assign(state.tables.parent_students[0], { verification_status: "verified", valid_to: null }, link);
      await expect(createPaymentAttempt({ invoiceId: "inv-1", provider: "vnpay" }, null)).rejects.toMatchObject({ status: 403 });
    }
    expect(state.tables.payments).toHaveLength(0);
  });

  it("rejects non-parents and paid invoices", async () => {
    state.actor = { id: "teacher-1", schoolId: "school-a", roles: ["teacher"] };
    await expect(createPaymentAttempt({ invoiceId: "inv-1", provider: "vnpay" }, null)).rejects.toMatchObject({ status: 403 });
    state.actor = { id: "parent-1", schoolId: "school-a", roles: ["parent"] };
    state.tables.invoices = [invoice({ status: "paid" })];
    await expect(createPaymentAttempt({ invoiceId: "inv-1", provider: "vnpay" }, null)).rejects.toMatchObject({ status: 409 });
  });
});

describe("confirmBankTransfer", () => {
  it("moves an unpaid invoice to pending once", async () => {
    await confirmBankTransfer("inv-1");
    expect(state.tables.invoices[0].status).toBe("pending");
    await expect(confirmBankTransfer("inv-1")).rejects.toMatchObject({ status: 409 });
  });

  it("requires a verified guardian in the same school", async () => {
    state.tables.parent_students[0].school_id = "school-b";
    await expect(confirmBankTransfer("inv-1")).rejects.toMatchObject({ status: 403 });
    expect(state.tables.invoices[0].status).toBe("unpaid");
  });
});
