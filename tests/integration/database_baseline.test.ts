import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 0 Database Baseline & Seed Integration Test', () => {
  const baselinePath = path.resolve(__dirname, '../../supabase/migrations/202609240000_schema_baseline.sql');
  const seedPath = path.resolve(__dirname, '../../supabase/seed_thcs_pilot.sql');

  it('integration: baseline sql exists and contains 63 tables', () => {
    expect(fs.existsSync(baselinePath)).toBe(true);
    const sql = fs.readFileSync(baselinePath, 'utf-8');
    const tableMatches = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.([a-z0-9_]+)/g)];
    const tables = new Set(tableMatches.map(m => m[1]));
    expect(tables.size).toBe(63);
  });

  it('integration: baseline sql declares required views', () => {
    const sql = fs.readFileSync(baselinePath, 'utf-8');
    expect(sql).toContain('CREATE OR REPLACE VIEW public.admin_student_grade_summary');
    expect(sql).toContain('CREATE OR REPLACE VIEW public.student_attendance_points_summary');
  });

  it('integration: baseline enables RLS on all 63 tables', () => {
    const sql = fs.readFileSync(baselinePath, 'utf-8');
    const rlsMatches = [...sql.matchAll(/ALTER TABLE public\.([a-z0-9_]+) ENABLE ROW LEVEL SECURITY;/g)];
    const rlsTables = new Set(rlsMatches.map(m => m[1]));
    expect(rlsTables.size).toBe(63);
  });

  it('integration: seed file meets THCS pilot requirements without PII', () => {
    expect(fs.existsSync(seedPath)).toBe(true);
    const seed = fs.readFileSync(seedPath, 'utf-8');

    // Students >= 10
    const students = [...seed.matchAll(/hs\d+@thcs-pilot\.edu\.vn/g)];
    expect(students.length).toBeGreaterThanOrEqual(10);

    // Teachers >= 2
    const teachers = [...seed.matchAll(/gv\.[a-z]+\.[a-z]+@thcs-pilot\.edu\.vn/g)];
    expect(teachers.length).toBeGreaterThanOrEqual(2);

    // Parents >= 3
    const parents = [...seed.matchAll(/ph\.[a-z]+\.[a-z]+@thcs-pilot\.edu\.vn/g)];
    expect(parents.length).toBeGreaterThanOrEqual(3);

    // No personal email domains
    expect(seed).not.toMatch(/@(gmail\.com|yahoo\.com|hotmail\.com)/i);
  });
});
