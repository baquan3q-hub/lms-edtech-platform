import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { bootstrapSql } from "../../scripts/db/bootstrap.mjs";

/** Real embedded PostgreSQL. Auth functions/storage catalogs are platform stubs.
 * This does not claim to test PostgREST, GoTrue, Storage HTTP or concurrent sessions.
 */
export async function createTestDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon, service_role;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
  `);
  const order = JSON.parse(readFileSync(path.resolve("supabase/migration-order.json"), "utf8")) as string[];
  for (const name of order) {
    let sql = bootstrapSql(name) as string;
    // gen_random_uuid is built in. These optional extensions aren't used by the migrations.
    sql = sql.replace(/^CREATE EXTENSION IF NOT EXISTS "(?:uuid-ossp|pgcrypto)";\r?\n/gm, "");
    try { await db.exec(sql); }
    catch (error) { await db.close(); throw new Error(`Migration ${name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return db;
}
