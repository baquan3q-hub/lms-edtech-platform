import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { freshInstallSql, resetSql } from "../../scripts/db/fresh-install.mjs";
import { pilotAccounts,pilotSeedSql } from "../../scripts/db/single-school-pilot.mjs";

describe("Clean Supabase rebuild", () => {
  let db: PGlite;
  const runnable = (sql: string) => sql.replace(/^CREATE EXTENSION IF NOT EXISTS "(?:uuid-ossp|pgcrypto)";\r?\n/gm, "");
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
      GRANT USAGE ON SCHEMA auth,public TO authenticated,anon,service_role;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE TABLE auth.refresh_tokens(id int); CREATE TABLE auth.audit_log_entries(id int);
      CREATE TABLE auth.flow_state(id int); CREATE TABLE auth.one_time_tokens(id int);
      CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
      CREATE TABLE storage.objects(id int);`);
  }, 60000);
  afterAll(async () => { await db?.close(); });

  it("installs an empty application without historical school/demo seeds", async () => {
    await db.exec(runnable(freshInstallSql()));
    const result = await db.query(`SELECT
      (SELECT count(*)::int FROM public.schools) AS schools,
      (SELECT count(*)::int FROM public.homerooms) AS homerooms,
      (SELECT count(*)::int FROM public.users) AS users,
      to_regprocedure('public.get_student_today(uuid,uuid)') IS NOT NULL AS student_rpc,
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) AS unprotected_tables`);
    expect(result.rows[0]).toEqual({ schools: 0, homerooms: 0, users: 0, student_rpc: true, unprotected_tables: 0 });
  });
  it("refuses to overlay a non-empty installation", async () => {
    await expect(db.exec(runnable(freshInstallSql()))).rejects.toThrow("FRESH_DATABASE_REQUIRED");
    await db.exec("ROLLBACK");
  });
  it("aborts before deletion when storage still contains objects", async () => {
    await db.exec("INSERT INTO auth.users(id) VALUES('10000000-0000-4000-8000-000000000001'); INSERT INTO storage.objects VALUES(1)");
    await expect(db.exec(runnable(resetSql("gmufcuzswehacyarsmyq")))).rejects.toThrow("STORAGE_NOT_EMPTY");
    await db.exec("ROLLBACK");
    expect((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM auth.users")).rows[0].count).toBe(1);
    await db.exec("DELETE FROM storage.objects");
  });
  it("rebuilds app and Auth atomically while keeping platform schemas", async () => {
    await db.exec(runnable(resetSql("gmufcuzswehacyarsmyq")));
    const result = await db.query(`SELECT (SELECT count(*)::int FROM auth.users) AS users,
      (SELECT count(*)::int FROM public.schools) AS schools,
      to_regclass('public.learning_metric_projections') IS NOT NULL AS projection,
      to_regclass('auth.refresh_tokens') IS NOT NULL AS auth_preserved`);
    expect(result.rows[0]).toEqual({ users: 0, schools: 0, projection: true, auth_preserved: true });
  });
  it("seeds exactly one school, 200 students, 15 teachers, one admin, and scoped rosters",async()=>{
    const accounts=pilotAccounts();
    await db.query("INSERT INTO auth.users(id,email) SELECT gen_random_uuid(),value->>'email' FROM jsonb_array_elements($1::jsonb)",[JSON.stringify(accounts.map(({email})=>({email})))]);
    await db.exec(pilotSeedSql(accounts));
    const result=await db.query(`SELECT
      (SELECT count(*)::int FROM public.schools) AS schools,
      (SELECT count(*)::int FROM public.users WHERE role='student') AS students,
      (SELECT count(*)::int FROM public.users WHERE role='teacher') AS teachers,
      (SELECT count(*)::int FROM public.users WHERE role='admin') AS admins,
      (SELECT count(*)::int FROM public.homerooms) AS homerooms,
      (SELECT count(*)::int FROM public.classes) AS classes,
      (SELECT count(*)::int FROM public.enrollments) AS enrollments,
      (SELECT count(*)::int FROM public.class_teacher_assignments) AS teacher_assignments,
      (SELECT count(*)::int FROM public.class_schedules) AS schedules,
      (SELECT max(n)::int FROM (SELECT count(*) AS n FROM public.enrollments GROUP BY class_id) x) AS max_class_size`);
    expect(result.rows[0]).toEqual({schools:1,students:200,teachers:15,admins:1,homerooms:4,classes:12,enrollments:600,teacher_assignments:15,schedules:24,max_class_size:50});
    const feed=await db.query<{feed:{classes:unknown[];pendingCount:number}}>(`SELECT get_student_today(
      (SELECT id FROM public.users WHERE email='hs0001@lms-pilot.test'),(SELECT id FROM public.schools)) AS feed`);
    expect(feed.rows[0].feed.classes).toHaveLength(3);
    expect(feed.rows[0].feed.pendingCount).toBe(0);
  });
  it("lets a signed-in student read their school and classes after a clean schema rebuild",async()=>{
    const student=(await db.query<{id:string}>("SELECT id FROM public.users WHERE email='hs0001@lms-pilot.test'")).rows[0].id;
    await db.transaction(async tx=>{
      await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[student]);
      await tx.exec("SET LOCAL ROLE authenticated");
      expect((await tx.query("SELECT id FROM public.schools")).rows).toHaveLength(1);
      expect((await tx.query("SELECT id FROM public.classes")).rows).toHaveLength(3);
    });
    await expect(db.transaction(async tx=>{
      await tx.exec("SET LOCAL ROLE authenticated");
      await tx.query("SELECT * FROM public.exam_submissions");
    })).rejects.toThrow("permission denied");
  });
});
