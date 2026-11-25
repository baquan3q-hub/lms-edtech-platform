/** Low-impact live audit: metadata GET and bounded HEAD requests only. No RPC/DDL/rows. */
import nextEnv from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { root } from "./bootstrap.mjs";

nextEnv.loadEnvConfig(root, false);
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Supabase server configuration is required");
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function request(resource, { method = "HEAD", select, plannedCount = false } = {}) {
  const url = new URL(`/rest/v1/${resource}`, base);
  if (select) {
    url.searchParams.set("select", select);
    url.searchParams.set("limit", "1");
  }
  const start = performance.now();
  try {
    const response = await fetch(url, {
      method, cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { ...headers, Accept: method === "GET" ? "application/openapi+json" : "application/json", ...(plannedCount ? { Prefer: "count=planned" } : {}) },
    });
    const schema = method === "GET" && response.ok ? await response.json() : undefined;
    // Do not retain error bodies, response headers, connection details or record contents.
    if (method !== "HEAD" && !response.ok) await response.body?.cancel();
    const total = response.headers.get("content-range")?.split("/")[1];
    return {
      status: response.status, elapsedMs: Math.round(performance.now() - start),
      ...(plannedCount && response.ok && total && /^\d+$/.test(total) ? { estimatedRows: Number(total) } : {}),
      ...(schema ? { schema } : {}),
    };
  } catch {
    // fetch errors can contain connection details; save only a generic classification.
    return { status: null, elapsedMs: Math.round(performance.now() - start), error: "NETWORK_OR_TIMEOUT" };
  }
}

const metadata = await request("", { method: "GET" });
if (!metadata.schema) throw new Error(`Metadata unavailable (HTTP ${metadata.status ?? "network error"})`);
const { definitions = {}, paths = {} } = metadata.schema;
const functions = Object.keys(paths).filter(name => name.startsWith("/rpc/")).map(name => name.slice(5));
const required = {
  courses: ["teacher_id"],
  learning_metric_projections: ["school_id", "student_id", "class_id", "computed_at", "support_count"],
  exam_submissions: ["revision"],
  exam_attempts: ["snapshot", "draft_answers", "draft_version"],
  homework_submissions: ["revision", "total_points", "questions_snapshot"],
  outbox_events: ["schema_version", "claim_token", "locked_until"],
};
const compatibility = {
  missingResources: Object.keys(required).filter(name => !definitions[name]),
  missingColumns: Object.fromEntries(Object.entries(required)
    .filter(([name]) => definitions[name])
    .map(([name, columns]) => [name, columns.filter(column => !definitions[name].properties?.[column])])
    .filter(([, columns]) => columns.length)),
  missingFunctions: ["get_student_today", "get_teaching_classes", "learning_activity_summary_scoped", "set_school_grade", "begin_school_exam", "submit_school_homework", "enroll_school_student", "reorder_school_content"]
    .filter(name => !functions.includes(name)),
};

const probes = [];
for (const table of ["classes", "enrollments", "attendance_records", "exam_submissions", "homework_submissions", "student_activity_logs"]) {
  if (!definitions[table]?.properties?.id) continue;
  const samples = [];
  // Sequential, tiny reads avoid adding a parallel load spike to the live database.
  for (let attempt = 0; attempt < 3; attempt++) samples.push(await request(table, { select: "id" }));
  const estimate = await request(table, { select: "id", plannedCount: true });
  probes.push({ table, samples, estimate });
}

const audit = {
  capturedAt: new Date().toISOString(), metadataMs: metadata.elapsedMs,
  resourceCount: Object.keys(definitions).length, functionCount: functions.length,
  compatibility, probes,
  limitations: [
    "Metadata absence means not exposed to this API role/schema cache; it is not a migration ledger or catalog audit.",
    "HEAD limit=1 timings include client network, TLS, gateway and database; they do not measure SQL execution time or dashboard latency.",
    "Service role bypasses RLS. These probes do not measure authenticated-user RLS cost.",
    "Three samples are diagnostic observations, not a p50/p95 benchmark. Planned counts are estimates and may be stale.",
    "No records, credentials, project URL, RPC execution or database writes are saved or performed.",
  ],
};
mkdirSync(path.join(root, ".local"), { recursive: true });
writeFileSync(path.join(root, ".local/live-performance-audit.json"), JSON.stringify(audit, null, 2));
console.log(JSON.stringify(audit, null, 2));
