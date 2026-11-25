import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { freshInstallSql } from "../../scripts/db/fresh-install.mjs";
import { buildNguyenDuImport, loadSeed, NDU_SCHOOL_ID } from "../../scripts/db/nguyendu-pilot.mjs";

type Row = Record<string, unknown>;
const plan = buildNguyenDuImport(loadSeed(process.cwd()), "2026-11-25") as { accounts: Row[]; tables: [string, string, Row[]][] };

/** Same semantics as PostgREST upsert: insert the given columns, update them on conflict. */
async function upsert(db: PGlite, table: string, onConflict: string, rows: Row[]) {
  const cols = Object.keys(rows[0]);
  const keys = onConflict.split(",");
  const list = cols.map((c) => `"${c}"`).join(",");
  const updates = cols.filter((c) => !keys.includes(c)).map((c) => `"${c}"=EXCLUDED."${c}"`).join(",");
  await db.query(`INSERT INTO public.${table}(${list}) SELECT ${list} FROM jsonb_populate_recordset(null::public.${table}, $1::jsonb)
    ON CONFLICT (${onConflict}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}`, [JSON.stringify(rows)]);
}

async function importAll(db: PGlite) {
  for (const [table, onConflict, rows] of plan.tables) await upsert(db, table, onConflict, rows);
}

async function asUser(db: PGlite, email: string, sql: string) {
  const id = (await db.query<{ id: string }>("SELECT id FROM public.users WHERE email=$1", [email])).rows[0].id;
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [id]);
    await tx.exec("SET LOCAL ROLE authenticated");
    return (await tx.query<Row>(sql)).rows;
  });
}

describe("Nguyễn Du pilot import", () => {
  let db: PGlite;
  beforeAll(async () => {
    // Same schema the live project was rebuilt with on 04/11 (fresh install, no historical seeds).
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
      GRANT USAGE ON SCHEMA auth,public TO authenticated,anon,service_role;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
      CREATE TABLE storage.objects(id int);`);
    await db.exec(freshInstallSql().replace(/^CREATE EXTENSION IF NOT EXISTS "(?:uuid-ossp|pgcrypto)";\r?\n/gm, ""));
    // Auth accounts are created first with the seed ids, as the import script does.
    await db.query("INSERT INTO auth.users(id,email) SELECT id,email FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,email text)", [JSON.stringify(plan.accounts)]);
    // Another school already lives in the project; the import must leave it alone.
    await db.exec(`INSERT INTO auth.users(id,email) VALUES('11111111-1111-4111-8111-111111111111','hs0001@lms-pilot.test');
      INSERT INTO public.schools(id,code,name,status) VALUES('29f689c4-b95b-4381-8075-ae002fc3e573','LMS-THPT','THPT','active');
      INSERT INTO public.users(id,email,role,full_name) VALUES('11111111-1111-4111-8111-111111111111','hs0001@lms-pilot.test','student','HS');
      INSERT INTO public.school_memberships(school_id,user_id,role) VALUES('29f689c4-b95b-4381-8075-ae002fc3e573','11111111-1111-4111-8111-111111111111','student');`);
    await importAll(db);
    await importAll(db);
  }, 60000);
  afterAll(async () => { await db?.close(); });

  it("creates the school once with 66 members and the 9A1 class, idempotently", async () => {
    const count = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0].n);
    expect(await count(`SELECT count(*) n FROM public.school_memberships WHERE school_id='${NDU_SCHOOL_ID}'`)).toBe(66);
    expect(await count(`SELECT count(*) n FROM public.enrollments e JOIN public.classes c ON c.id=e.class_id WHERE c.school_id='${NDU_SCHOOL_ID}'`)).toBe(30);
    expect(await count(`SELECT count(*) n FROM public.parent_students WHERE school_id='${NDU_SCHOOL_ID}' AND verification_status='verified'`)).toBe(30);
    expect(await count(`SELECT count(*) n FROM public.attendance_records WHERE school_id='${NDU_SCHOOL_ID}'`)).toBe(30);
    expect(await count("SELECT count(*) n FROM public.school_memberships WHERE school_id<>'" + NDU_SCHOOL_ID + "'")).toBe(1);
  });

  it("scopes reads by role through RLS", async () => {
    expect(await asUser(db, "gv.nam@nguyendu.edu.vn", "SELECT id FROM public.classes")).toHaveLength(1);
    expect(await asUser(db, "hs101@nguyendu.edu.vn", "SELECT id FROM public.classes")).toHaveLength(1);
    expect(await asUser(db, "hs101@nguyendu.edu.vn", "SELECT id FROM public.schools")).toEqual([{ id: NDU_SCHOOL_ID }]);
    expect(await asUser(db, "thaylongcngd@gmail.com", "SELECT id FROM public.schools")).toEqual([{ id: NDU_SCHOOL_ID }]);
    expect(await asUser(db, "ph101@nguyendu.edu.vn", "SELECT student_id FROM public.parent_students")).toHaveLength(1);
    expect(await asUser(db, "hs0001@lms-pilot.test", "SELECT id FROM public.classes")).toHaveLength(0);
  });
});
