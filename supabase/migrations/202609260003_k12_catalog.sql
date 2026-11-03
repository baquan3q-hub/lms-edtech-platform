-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M3: K12 CATALOG (NĂM HỌC, HỌC KỲ, KHỐI, MÔN)
-- File: supabase/migrations/202609260003_k12_catalog.sql
-- Mục đích: Thiết lập danh mục học vụ chuẩn K12 gồm:
--           1. academic_years (Năm học)
--           2. terms (Học kỳ)
--           3. grade_levels (Khối học 1–12, pilot kích hoạt khối 6–9)
--           4. subjects (Môn học theo chuẩn Bộ GD&ĐT)
-- =========================================================================

-- 1. TẠO BẢNG ACADEMIC_YEARS (Năm học)
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_academic_years_school_code UNIQUE (school_id, code),
    CONSTRAINT ck_academic_years_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_academic_years_school ON public.academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON public.academic_years(school_id, is_current) WHERE is_current = true;

-- 2. TẠO BẢNG TERMS (Học kỳ)
CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    semester_order INT NOT NULL CHECK (semester_order IN (1, 2, 3)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_terms_school_year_code UNIQUE (school_id, academic_year_id, code),
    CONSTRAINT ck_terms_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_terms_school ON public.terms(school_id);
CREATE INDEX IF NOT EXISTS idx_terms_year ON public.terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_terms_active ON public.terms(school_id, is_active) WHERE is_active = true;

-- 3. TẠO BẢNG GRADE_LEVELS (Khối học 1–12)
CREATE TABLE IF NOT EXISTS public.grade_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    level INT NOT NULL CHECK (level BETWEEN 1 AND 12),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_grade_levels_school_level UNIQUE (school_id, level)
);

CREATE INDEX IF NOT EXISTS idx_grade_levels_school ON public.grade_levels(school_id);

-- 4. TẠO BẢNG SUBJECTS (Môn học)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_subjects_school_code UNIQUE (school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_school ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON public.subjects(school_id, is_active);

-- 5. BẬT ROW LEVEL SECURITY (RLS) VÀ TẠO CHÍNH SÁCH BẢO MẬT
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Policy: Đọc danh mục trong phạm vi trường học (hoặc Admin hệ thống)
DO $$
BEGIN
    DROP POLICY IF EXISTS "academic_years_read_school" ON public.academic_years;
    CREATE POLICY "academic_years_read_school" ON public.academic_years
        FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid()
                  AND m.school_id = academic_years.school_id
                  AND m.status = 'active'
            )
        );

    DROP POLICY IF EXISTS "terms_read_school" ON public.terms;
    CREATE POLICY "terms_read_school" ON public.terms
        FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid()
                  AND m.school_id = terms.school_id
                  AND m.status = 'active'
            )
        );

    DROP POLICY IF EXISTS "grade_levels_read_school" ON public.grade_levels;
    CREATE POLICY "grade_levels_read_school" ON public.grade_levels
        FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid()
                  AND m.school_id = grade_levels.school_id
                  AND m.status = 'active'
            )
        );

    DROP POLICY IF EXISTS "subjects_read_school" ON public.subjects;
    CREATE POLICY "subjects_read_school" ON public.subjects
        FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid()
                  AND m.school_id = subjects.school_id
                  AND m.status = 'active'
            )
        );
END $$;

-- 6. KHỞI TẠO DANH MỤC HỌC VỤ MẪU CHO TRƯỜNG THCS NGUYỄN DU (PILOT)
DO $$
DECLARE
    pilot_school_id UUID := '00000000-0000-0000-0001-000000000000';
    year_id UUID := '00000000-0000-0000-0003-000000000001';
BEGIN
    -- 6.1. Năm học 2026 - 2027
    INSERT INTO public.academic_years (id, school_id, code, name, start_date, end_date, is_current, status)
    VALUES (
        year_id,
        pilot_school_id,
        '2026-2027',
        'Năm học 2026 - 2027',
        '2026-09-01',
        '2027-05-31',
        true,
        'active'
    )
    ON CONFLICT (school_id, code) DO UPDATE
    SET name = EXCLUDED.name, is_current = EXCLUDED.is_current, status = EXCLUDED.status;

    -- 6.2. Học kỳ 1 & Học kỳ 2
    INSERT INTO public.terms (id, school_id, academic_year_id, code, name, semester_order, start_date, end_date, is_active)
    VALUES
        ('00000000-0000-0000-0003-000000000011', pilot_school_id, year_id, 'HK1', 'Học kỳ 1 (2026 - 2027)', 1, '2026-09-01', '2027-01-15', true),
        ('00000000-0000-0000-0003-000000000012', pilot_school_id, year_id, 'HK2', 'Học kỳ 2 (2026 - 2027)', 2, '2027-01-16', '2027-05-31', false)
    ON CONFLICT (school_id, academic_year_id, code) DO UPDATE
    SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

    -- 6.3. Khối học 6, 7, 8, 9 (Kích hoạt cho pilot THCS)
    INSERT INTO public.grade_levels (id, school_id, level, code, name, is_active)
    VALUES
        ('00000000-0000-0000-0003-000000000006', pilot_school_id, 6, 'K6', 'Khối 6', true),
        ('00000000-0000-0000-0003-000000000007', pilot_school_id, 7, 'K7', 'Khối 7', true),
        ('00000000-0000-0000-0003-000000000008', pilot_school_id, 8, 'K8', 'Khối 8', true),
        ('00000000-0000-0000-0003-000000000009', pilot_school_id, 9, 'K9', 'Khối 9', true)
    ON CONFLICT (school_id, level) DO UPDATE
    SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

    -- 6.4. Môn học chuẩn THCS
    INSERT INTO public.subjects (id, school_id, code, name, department, is_active)
    VALUES
        ('00000000-0000-0000-0003-000000000101', pilot_school_id, 'TOAN', 'Toán học', 'Toán - Tin', true),
        ('00000000-0000-0000-0003-000000000102', pilot_school_id, 'VAN', 'Ngữ văn', 'Khoa học xã hội', true),
        ('00000000-0000-0000-0003-000000000103', pilot_school_id, 'ENG', 'Tiếng Anh', 'Ngoại ngữ', true),
        ('00000000-0000-0000-0003-000000000104', pilot_school_id, 'KHTN', 'Khoa học tự nhiên', 'Khoa học tự nhiên', true),
        ('00000000-0000-0000-0003-000000000105', pilot_school_id, 'LSDL', 'Lịch sử và Địa lý', 'Khoa học xã hội', true),
        ('00000000-0000-0000-0003-000000000106', pilot_school_id, 'TIN', 'Tin học', 'Toán - Tin', true),
        ('00000000-0000-0000-0003-000000000107', pilot_school_id, 'GDCD', 'Giáo dục công dân', 'Khoa học xã hội', true)
    ON CONFLICT (school_id, code) DO UPDATE
    SET name = EXCLUDED.name, department = EXCLUDED.department, is_active = EXCLUDED.is_active;
END $$;
