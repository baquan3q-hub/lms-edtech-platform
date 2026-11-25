import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../helpers/database";

describe("PostgreSQL confirm_provider_payment", () => {
  let db: PGlite;
  beforeAll(async () => { db = await createTestDatabase(); }, 60000);
  afterAll(async () => { if (db) await db.close(); });

  const school = "00000000-0000-4000-8000-00000000c001";
  const parent = "10000000-0000-4000-8000-00000000c002";
  const student = "10000000-0000-4000-8000-00000000c003";
  const revokedParent = "10000000-0000-4000-8000-00000000c004";
  const invoice = "20000000-0000-4000-8000-00000000c005";
  const payment = "30000000-0000-4000-8000-00000000c006";

  beforeEach(async () => {
    await db.exec("TRUNCATE public.payment_provider_events, public.payments, public.invoices, public.notifications, public.audit_events, public.users CASCADE");
    await db.query("DELETE FROM public.schools WHERE id=$1", [school]);
    await db.query("INSERT INTO public.schools(id,code,name) VALUES($1,'PAY-A','Trường A')", [school]);
    await db.query(`INSERT INTO public.users(id,email,full_name,role) VALUES
      ($1,'p@example.test','Parent','parent'),($2,'s@example.test','Student','student'),($3,'r@example.test','Old parent','parent')`,
      [parent, student, revokedParent]);
    await db.query(`INSERT INTO public.parent_students(parent_id,student_id,school_id,verification_status) VALUES
      ($1,$2,$3,'verified'),($4,$2,$3,'revoked')`, [parent, student, school, revokedParent]);
    await db.query(`INSERT INTO public.invoices(id,student_id,school_id,amount,status,due_date,invoice_number)
      VALUES($1,$2,$3,2500000,'unpaid',CURRENT_DATE+7,'INV-1')`, [invoice, student, school]);
    await db.query(`INSERT INTO public.payments(id,invoice_id,school_id,user_id,amount,currency,provider,provider_order_id,status)
      VALUES($1,$2,$3,$4,2500000,'VND','vnpay','TXN1','pending')`, [payment, invoice, school, parent]);
  });

  async function confirm(eventId: string, succeeded: boolean, amount = 2500000, orderId = "TXN1", provider = "vnpay") {
    const { rows } = await db.query<{ r: { status: string; previous_outcome?: string; invoice_already_paid?: boolean } }>(
      "SELECT public.confirm_provider_payment($1,$2,$3,$4,$5,'VND','VNP1','{}'::jsonb) AS r",
      [provider, orderId, eventId, succeeded, amount]);
    return rows[0].r;
  }
  async function state() {
    const { rows } = await db.query<{ payment: string; invoice: string; paid: boolean; notes: number; events: number; audits: number }>(`SELECT
      (SELECT status FROM public.payments WHERE id=$1) AS payment,
      (SELECT status FROM public.invoices WHERE id=$2) AS invoice,
      (SELECT paid_at IS NOT NULL FROM public.invoices WHERE id=$2) AS paid,
      (SELECT count(*)::int FROM public.notifications) AS notes,
      (SELECT count(*)::int FROM public.payment_provider_events) AS events,
      (SELECT count(*)::int FROM public.audit_events WHERE entity_id=$1) AS audits`, [payment, invoice]);
    return rows[0];
  }

  it("confirms payment and invoice together and notifies only verified guardians", async () => {
    expect((await confirm("TXN1:1:00", true)).status).toBe("confirmed");
    expect(await state()).toEqual({ payment: "succeeded", invoice: "paid", paid: true, notes: 1, events: 1, audits: 1 });
    const { rows } = await db.query<{ user_id: string }>("SELECT user_id FROM public.notifications");
    expect(rows.map(r => r.user_id)).toEqual([parent]);
  });

  it("replaying the same event changes nothing and reports the earlier outcome", async () => {
    await confirm("TXN1:1:00", true);
    expect(await confirm("TXN1:1:00", true)).toMatchObject({ status: "duplicate", previous_outcome: "confirmed" });
    expect(await state()).toMatchObject({ notes: 1, events: 1, audits: 1 });
  });

  it("a different event for an already confirmed payment is already_processed", async () => {
    await confirm("TXN1:1:00", true);
    expect((await confirm("TXN1:2:00", true)).status).toBe("already_processed");
    expect((await confirm("TXN1:3:24", false)).status).toBe("already_processed");
    expect(await state()).toMatchObject({ payment: "succeeded", invoice: "paid", notes: 1 });
  });

  it("rejects a wrong amount without touching payment or invoice", async () => {
    expect((await confirm("TXN1:1:00", true, 1000)).status).toBe("amount_mismatch");
    expect(await state()).toMatchObject({ payment: "pending", invoice: "unpaid", paid: false, notes: 0, audits: 1 });
  });

  it("records a failed payment without changing the invoice, and a later success still confirms", async () => {
    expect((await confirm("evt_fail", false)).status).toBe("failed");
    expect(await state()).toMatchObject({ payment: "failed", invoice: "unpaid" });
    expect((await confirm("evt_ok", true)).status).toBe("confirmed");
    expect(await state()).toMatchObject({ payment: "succeeded", invoice: "paid" });
  });

  it("returns not_found for an unknown order or another provider's order", async () => {
    expect((await confirm("x", true, 2500000, "TXN-unknown")).status).toBe("not_found");
    expect((await confirm("y", true, 2500000, "TXN1", "stripe")).status).toBe("not_found");
    expect(await state()).toMatchObject({ payment: "pending", events: 0 });
  });

  it("keeps one row per provider order and blocks browser roles from the RPC", async () => {
    await expect(db.query(`INSERT INTO public.payments(invoice_id,amount,provider,provider_order_id) VALUES($1,1,'vnpay','TXN1')`, [invoice]))
      .rejects.toThrow(/payments_provider_order_unique|duplicate key/);
    for (const role of ["authenticated", "anon"]) {
      await expect(db.transaction(async tx => {
        await tx.exec(`SET LOCAL ROLE ${role}`);
        await tx.query("SELECT public.confirm_provider_payment('vnpay','TXN1','e',true,2500000,'VND',null,'{}'::jsonb)");
      })).rejects.toThrow("permission denied");
    }
  });
});
