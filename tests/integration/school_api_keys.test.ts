import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../helpers/database";

describe("PostgreSQL school_api_keys", () => {
  let db: PGlite;
  beforeAll(async () => { db = await createTestDatabase(); }, 60000);
  afterAll(async () => { if (db) await db.close(); });

  const schoolA = "00000000-0000-4000-8000-00000000a001";
  const schoolB = "00000000-0000-4000-8000-00000000b001";
  const adminA = "10000000-0000-4000-8000-00000000a002";
  const adminB = "10000000-0000-4000-8000-00000000b002";
  const teacherA = "10000000-0000-4000-8000-00000000a003";
  const hash = (c: string) => c.repeat(64);

  beforeEach(async () => {
    await db.exec("TRUNCATE public.school_api_keys, public.users CASCADE");
    await db.query("DELETE FROM public.schools WHERE id IN ($1,$2)", [schoolA, schoolB]);
    await db.query("INSERT INTO public.schools(id,code,name) VALUES($1,'KEY-A','Trường A'),($2,'KEY-B','Trường B')", [schoolA, schoolB]);
    await db.query(`INSERT INTO public.users(id,email,full_name,role) VALUES
      ($1,'a@example.test','Admin A','admin'),($2,'b@example.test','Admin B','admin'),($3,'t@example.test','Teacher A','teacher')`, [adminA, adminB, teacherA]);
    await db.query(`INSERT INTO public.school_memberships(school_id,user_id,role) VALUES
      ($1,$2,'admin'),($3,$4,'admin'),($1,$5,'teacher')`, [schoolA, adminA, schoolB, adminB, teacherA]);
    await db.query(`INSERT INTO public.school_api_keys(school_id,key_prefix,key_hash) VALUES
      ($1,'sch_live_AAAAAAA',$2),($3,'sch_live_BBBBBBB',$4)`, [schoolA, hash("a"), schoolB, hash("b")]);
  });

  async function asUser<T>(userId: string, work: (tx: Parameters<Parameters<PGlite["transaction"]>[0]>[0]) => Promise<T>) {
    return db.transaction(async tx => {
      await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [userId]);
      await tx.exec("SET LOCAL ROLE authenticated");
      return work(tx);
    });
  }

  it("allows only one active key per school", async () => {
    await expect(db.query("INSERT INTO public.school_api_keys(school_id,key_prefix,key_hash) VALUES($1,'sch_live_CCCCCCC',$2)", [schoolA, hash("c")]))
      .rejects.toThrow(/school_api_keys_one_active|duplicate key/);
    await db.query("UPDATE public.school_api_keys SET revoked_at=now() WHERE school_id=$1", [schoolA]);
    await db.query("INSERT INTO public.school_api_keys(school_id,key_prefix,key_hash) VALUES($1,'sch_live_CCCCCCC',$2)", [schoolA, hash("c")]);
    const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM public.school_api_keys WHERE school_id=$1", [schoolA]);
    expect(rows[0].n).toBe(2);
  });

  it("rejects a raw key or malformed hash in key_hash", async () => {
    await db.query("UPDATE public.school_api_keys SET revoked_at=now() WHERE school_id=$1", [schoolA]);
    await expect(db.query("INSERT INTO public.school_api_keys(school_id,key_prefix,key_hash) VALUES($1,'sch_live_DDDDDDD','sch_live_plaintext')", [schoolA]))
      .rejects.toThrow(/check constraint/);
  });

  it("lets a school admin read only their own school's key metadata", async () => {
    const own = await asUser(adminA, tx => tx.query<{ school_id: string }>("SELECT school_id FROM public.school_api_keys"));
    expect(own.rows.map(r => r.school_id)).toEqual([schoolA]);
    const teacher = await asUser(teacherA, tx => tx.query("SELECT 1 FROM public.school_api_keys"));
    expect(teacher.rows).toHaveLength(0);
  });

  it("does not let browser roles write keys", async () => {
    await expect(asUser(adminA, tx => tx.query("INSERT INTO public.school_api_keys(school_id,key_prefix,key_hash) VALUES($1,'sch_live_EEEEEEE',$2)", [schoolB, hash("e")])))
      .rejects.toThrow("permission denied");
    await expect(asUser(adminA, tx => tx.query("UPDATE public.school_api_keys SET revoked_at=NULL"))).rejects.toThrow("permission denied");
    await expect(db.transaction(async tx => {
      await tx.exec("SET LOCAL ROLE anon");
      await tx.query("SELECT 1 FROM public.school_api_keys");
    })).rejects.toThrow("permission denied");
  });
});
