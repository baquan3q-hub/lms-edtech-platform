-- Run with a PostgreSQL read-only login against the intended environment.
-- Catalog/statistics only: no application rows, query text, RPC calls or DDL.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';

SELECT relname AS table_name, n_live_tup AS estimated_rows,
       n_dead_tup AS estimated_dead_rows, last_analyze, last_autoanalyze,
       pg_total_relation_size(relid) AS total_bytes
FROM pg_stat_user_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

SELECT tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
ORDER BY p.proname;

SELECT c.relname AS table_name, t.tgname AS trigger_name,
       t.tgenabled AS enabled, p.proname AS function_name
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

SELECT con.conrelid::regclass AS table_name, con.conname AS constraint_name,
       con.contype AS kind, con.convalidated AS validated,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_namespace n ON n.oid = con.connamespace
WHERE n.nspname = 'public' AND con.contype IN ('p', 'u', 'f')
ORDER BY con.conrelid::regclass::text, con.conname;

SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pg_stat_statements', 'index_advisor');
COMMIT;

-- After identifying a specific slow SELECT, inspect EXPLAIN (FORMAT JSON) first.
-- Run EXPLAIN (ANALYZE, BUFFERS) only on bounded, read-only SELECTs in staging.
-- Do not ANALYZE write RPCs: READ ONLY is a guard, not a replacement for review.
