import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PRIVATE_BUCKETS } from '@/lib/storage/secure-storage';

describe('Phase 1 Security & Migration Verification Tests', () => {
  const m1Path = path.resolve(__dirname, '../../supabase/migrations/202609260001_school_scope.sql');
  const m2Path = path.resolve(__dirname, '../../supabase/migrations/202609260002_audit_outbox_idempotency.sql');

  it('integration: M1 defines schools and school_memberships with RLS', () => {
    expect(fs.existsSync(m1Path)).toBe(true);
    const sql = fs.readFileSync(m1Path, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.schools');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.school_memberships');
    expect(sql).toContain('ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id');
    expect(sql).toContain('ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS school_id');
    expect(sql).toContain('ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS school_id');
    expect(sql).toContain('ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;');
  });

  it('integration: M1 includes backfill for pilot school THCS-NDU', () => {
    const sql = fs.readFileSync(m1Path, 'utf-8');
    expect(sql).toContain('THCS-NDU');
    expect(sql).toContain('UPDATE public.classes SET school_id');
    expect(sql).toContain('INSERT INTO public.school_memberships');
  });

  it('integration: M2 defines audit_events, outbox_events, and idempotency_keys', () => {
    expect(fs.existsSync(m2Path)).toBe(true);
    const sql = fs.readFileSync(m2Path, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.audit_events');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.outbox_events');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.idempotency_keys');
    expect(sql).toContain('event_key TEXT NOT NULL UNIQUE');
    expect(sql).toContain('UNIQUE(school_id, actor_id, operation, request_key)');
  });

  it('integration: secure storage designates sensitive buckets as private', () => {
    expect(PRIVATE_BUCKETS).toContain('homework');
    expect(PRIVATE_BUCKETS).toContain('exams');
    expect(PRIVATE_BUCKETS).toContain('materials');
  });
});
