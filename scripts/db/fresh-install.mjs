import { migrationOrder, bootstrapSql } from "./bootstrap.mjs";

// Historical seeds/backfills are for the old demo, never for a clean installation.
const seedMarkers = {
  "202609260001_school_scope.sql": "-- 5. TẠO TRƯỜNG THÍ ĐIỂM",
  "202609260003_k12_catalog.sql": "-- 6. KHỞI TẠO DANH MỤC HỌC VỤ MẪU",
  "202609260004_k12_rosters.sql": "-- 8. SEED VÀ BACKFILL",
  "202609260005_identity_import.sql": "-- 8. BACKFILL ĐỊNH DANH",
};

export function freshMigrationSql(name) {
  let sql = bootstrapSql(name);
  const marker = seedMarkers[name];
  if (marker) {
    const position = sql.indexOf(marker);
    if (position < 0 || sql.indexOf(marker, position + 1) >= 0) throw new Error(`Review fresh-install boundary: ${name}`);
    if (name === "202609260001_school_scope.sql") {
      const resume = sql.indexOf("-- 7. HELPER FUNCTIONS CHO PHÂN QUYỀN TRƯỜNG HỌC", position);
      if (resume < 0) throw new Error("Review school-scope helper boundary");
      sql = sql.slice(0, position) + sql.slice(resume);
    } else sql = sql.slice(0, position);
  }
  // The entire generated install/reset is one transaction, including old migrations.
  return sql.replace(/^(?:begin|commit);\s*$/gim, "");
}

export function freshInstallBody() {
  return migrationOrder().map(name => `-- SOURCE: ${name}\n${freshMigrationSql(name)}`).join("\n\n");
}

export function freshInstallSql() {
  return `BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public')
    OR EXISTS(SELECT 1 FROM auth.users)
    OR EXISTS(SELECT 1 FROM storage.objects)
  THEN RAISE EXCEPTION 'FRESH_DATABASE_REQUIRED'; END IF;
END $$;
${freshInstallBody()}
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
COMMIT;`;
}

export function resetSql(projectRef) {
  if (!/^[a-z]{20}$/.test(projectRef)) throw new Error("A validated Supabase project ref is required");
  return `-- DESTRUCTIVE. Reviewed target project: ${projectRef}.
-- Clears application data and user authentication, preserving API URL/keys/config.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM storage.objects) THEN
    RAISE EXCEPTION 'STORAGE_NOT_EMPTY_USE_STORAGE_API_FIRST';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE n.nspname='public') THEN
    RAISE EXCEPTION 'PUBLIC_EXTENSIONS_REQUIRE_REVIEW';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
    JOIN pg_namespace fn ON fn.oid=p.pronamespace
    JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace tn ON tn.oid=c.relnamespace
    WHERE fn.nspname='public' AND tn.nspname<>'public' AND NOT t.tgisinternal) THEN
    RAISE EXCEPTION 'EXTERNAL_TRIGGER_REQUIRES_REVIEW';
  END IF;
END $$;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
GRANT ALL ON SCHEMA public TO postgres,service_role;
-- Auth migrations/config remain intact. Revoke sessions and clear user-owned state.
TRUNCATE auth.users,auth.refresh_tokens,auth.audit_log_entries,auth.flow_state,auth.one_time_tokens CASCADE;
${freshInstallBody()}
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;`;
}
