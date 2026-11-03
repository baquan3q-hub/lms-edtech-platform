import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export function migrationOrder() { return JSON.parse(readFileSync(path.join(root, "supabase/migration-order.json"), "utf8")); }
export function bootstrapSql(name) {
  let sql = readFileSync(path.join(root, "supabase/migrations", name), "utf8");
  if (name === "202609240000_schema_baseline.sql") {
    // Repair the fresh-install recipe without rewriting a historical migration:
    // homework never had a status column; publication uses is_published.
    const broken = "status != 'draft' AND (is_student_in_class(class_id)";
    if (!sql.includes(broken)) throw new Error("Historical baseline changed; review bootstrap repair.");
    sql = sql.replace(broken, "is_published = true AND (is_student_in_class(class_id)");
  }
  if (name === "202609260009_ai_jobs_scope.sql") {
    // Earlier tracking schema has source_hash; this migration indexes the new name
    // but only defines it in CREATE TABLE IF NOT EXISTS, which cannot evolve a table.
    sql = 'ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS source_data_hash text;\n' + sql;
  }
  return sql;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Generate a separate local-only project; never touch production migration history.
  const digest=createHash("sha256").update(migrationOrder().map(name=>name+bootstrapSql(name)).join("\n")).digest("hex").slice(0,10);
  const project=path.join(".local",`lms-db-${digest}`);
  const target = path.join(root, project,"supabase");
  mkdirSync(path.join(target, "migrations"), { recursive: true });
  for (const [i, name] of migrationOrder().entries()) writeFileSync(path.join(target, "migrations", `${String(20261103000000 + i)}_${name.replace(/^\d+_/, "")}`), bootstrapSql(name));
  writeFileSync(path.join(target, "config.toml"), `project_id = "lms-k12-${digest}"\n[api]\nport = 54321\n[db]\nport = 54322\nmajor_version = 17\n[db.seed]\nenabled = false\n`);
  console.log(`Local bootstrap prepared. With Docker available: supabase start --workdir ${project}`);
}
