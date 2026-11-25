/** Generate an offline fresh-install candidate. Never connect to a database. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root, migrationOrder, bootstrapSql } from "./bootstrap.mjs";

const proposal = "supabase/proposals/20261104_performance_indexes.sql";
const output = path.join(root, ".local/lms-k12-schema-candidate.sql");
const sections = migrationOrder().map(name => `-- SOURCE: supabase/migrations/${name}\n${bootstrapSql(name)}`);
sections.push(`-- SOURCE: ${proposal}\n${readFileSync(path.join(root, proposal), "utf8")}`);
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, [
  "-- GENERATED CANDIDATE: FRESH SUPABASE LOCAL / EMPTY STAGING DATABASE ONLY.",
  "-- Never execute against an existing database. This is not an upgrade script.",
  "-- Requires Supabase Auth/Storage schemas and platform roles.",
  "-- Includes canonical bootstrap repairs and UNBENCHMARKED candidate indexes.",
  "-- Seed/catalog and legacy policy compatibility still require review; not production approval.",
  ...sections,
].join("\n\n"));
console.log(JSON.stringify({ output: path.relative(root, output), canonicalMigrations: sections.length - 1, includesUnbenchmarkedIndexes: true, databaseConnected: false }));
