import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 3 Identity & Import Integration Tests", () => {
  const m5Path = path.resolve(__dirname, "../../supabase/migrations/202609260005_identity_import.sql");

  it("integration: M5 defines student_identifiers and guardian_identifiers", () => {
    expect(fs.existsSync(m5Path)).toBe(true);
    const sql = fs.readFileSync(m5Path, "utf-8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.student_identifiers");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.guardian_identifiers");
    expect(sql).toContain("uq_student_identifiers_code");
    expect(sql).toContain("uq_guardian_identifiers_code");
  });

  it("integration: M5 defines account_activations with SHA-256 token hash", () => {
    const sql = fs.readFileSync(m5Path, "utf-8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.account_activations");
    expect(sql).toContain("activation_token_hash TEXT NOT NULL");
    expect(sql).toContain("attempts_count INT NOT NULL DEFAULT 0");
    expect(sql).toContain("max_attempts INT NOT NULL DEFAULT 5");
    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'pending'");
  });

  it("integration: M5 defines import_jobs and import_rows for staging & error review", () => {
    const sql = fs.readFileSync(m5Path, "utf-8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.import_jobs");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.import_rows");
    expect(sql).toContain("raw_data JSONB NOT NULL");
    expect(sql).toContain("normalized_data JSONB");
    expect(sql).toContain("uq_import_rows_job_row");
  });

  it("integration: M5 extends parent_students and enables RLS on all Phase 3 tables", () => {
    const sql = fs.readFileSync(m5Path, "utf-8");

    expect(sql).toContain("ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS school_id");
    expect(sql).toContain("ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS verification_status");
    expect(sql).toContain("ALTER TABLE public.student_identifiers ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.guardian_identifiers ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.account_activations ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;");
  });

  it("integration: M5 backfills student identifiers for pilot school THCS-NDU", () => {
    const sql = fs.readFileSync(m5Path, "utf-8");
    expect(sql).toContain("st_code := 'HS' || LPAD(idx::TEXT, 3, '0');");
    expect(sql).toContain("INSERT INTO public.student_identifiers");
    expect(sql).toContain("INSERT INTO public.account_activations");
  });
});
