import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 2 K12 Catalog & Rosters Integration Tests', () => {
  const m3Path = path.resolve(__dirname, '../../supabase/migrations/202609260003_k12_catalog.sql');
  const m4Path = path.resolve(__dirname, '../../supabase/migrations/202609260004_k12_rosters.sql');

  it('integration: M3 defines academic_years, terms, grade_levels, subjects with RLS', () => {
    expect(fs.existsSync(m3Path)).toBe(true);
    const sql = fs.readFileSync(m3Path, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.academic_years');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.terms');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.grade_levels');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.subjects');

    expect(sql).toContain('ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;');

    expect(sql).toContain('uq_academic_years_school_code');
    expect(sql).toContain('uq_terms_school_year_code');
    expect(sql).toContain('uq_grade_levels_school_level');
    expect(sql).toContain('uq_subjects_school_code');
  });

  it('integration: M3 seeds pilot data for THCS Nguyễn Du', () => {
    const sql = fs.readFileSync(m3Path, 'utf-8');
    expect(sql).toContain('2026-2027');
    expect(sql).toContain('HK1');
    expect(sql).toContain('HK2');
    expect(sql).toContain('TOAN');
    expect(sql).toContain('VAN');
    expect(sql).toContain('ENG');
  });

  it('integration: M4 defines homerooms, enrollments, and teacher assignments', () => {
    expect(fs.existsSync(m4Path)).toBe(true);
    const sql = fs.readFileSync(m4Path, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.homerooms');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.homeroom_enrollments');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.homeroom_teacher_assignments');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.class_teacher_assignments');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.role_assignments');

    // Mở rộng classes
    expect(sql).toContain('ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS term_id');
    expect(sql).toContain('ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS subject_id');
    expect(sql).toContain('ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS homeroom_id');

    expect(sql).toContain('uq_homeroom_enrollments_student_year');
    expect(sql).toContain('uq_class_teachers_assignment');
  });

  it('integration: M4 performs safe backfill on classes and enrollments', () => {
    const sql = fs.readFileSync(m4Path, 'utf-8');
    expect(sql).toContain('UPDATE public.classes');
    expect(sql).toContain('SET term_id');
    expect(sql).toContain('SET subject_id');
    expect(sql).toContain('INSERT INTO public.class_teacher_assignments');
    expect(sql).toContain('INSERT INTO public.homeroom_enrollments');
  });
});
