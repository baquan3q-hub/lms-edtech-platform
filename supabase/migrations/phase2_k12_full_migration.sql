-- =========================================================================
-- LMS K12 PLATFORM - GÓI MIGRATION TỔNG HỢP PHASE 2: MÔ HÌNH HỌC VỤ K12
-- Bao gồm: M3 (k12_catalog) & M4 (k12_rosters) + Backfill an toàn
-- Ngày tạo: 26/09/2026
-- =========================================================================

-- =========================================================================
-- PHẦN 1: MIGRATION M3 (ACADEMIC_YEARS, TERMS, GRADE_LEVELS, SUBJECTS)
-- =========================================================================

-- 1. Bảng academic_years
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

-- 2. Bảng terms
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

-- 3. Bảng grade_levels
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

-- 4. Bảng subjects
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

-- =========================================================================
-- PHẦN 2: MIGRATION M4 (HOMEROOMS, ROSTERS & ASSIGNMENTS)
-- =========================================================================

-- 5. Bảng homerooms (Lớp chủ nhiệm)
CREATE TABLE IF NOT EXISTS public.homerooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    grade_level_id UUID NOT NULL REFERENCES public.grade_levels(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    room TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_homerooms_school_year_code UNIQUE (school_id, academic_year_id, code)
);

CREATE INDEX IF NOT EXISTS idx_homerooms_school ON public.homerooms(school_id);
CREATE INDEX IF NOT EXISTS idx_homerooms_year_grade ON public.homerooms(school_id, academic_year_id, grade_level_id);

-- 6. Bảng homeroom_enrollments
CREATE TABLE IF NOT EXISTS public.homeroom_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    homeroom_id UUID NOT NULL REFERENCES public.homerooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_homeroom_enrollments_student_year UNIQUE (school_id, student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_homeroom_enrollments_lookup ON public.homeroom_enrollments(homeroom_id, status);
CREATE INDEX IF NOT EXISTS idx_homeroom_enrollments_student ON public.homeroom_enrollments(student_id, academic_year_id);

-- 7. Bảng homeroom_teacher_assignments
CREATE TABLE IF NOT EXISTS public.homeroom_teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    homeroom_id UUID NOT NULL REFERENCES public.homerooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'head_teacher' CHECK (role IN ('head_teacher', 'assistant')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'former')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_homeroom_teachers_role UNIQUE (school_id, homeroom_id, academic_year_id, role)
);

CREATE INDEX IF NOT EXISTS idx_homeroom_teachers_lookup ON public.homeroom_teacher_assignments(teacher_id, status);

-- 8. Mở rộng classes (lớp bộ môn)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE RESTRICT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE RESTRICT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS homeroom_id UUID REFERENCES public.homerooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_term ON public.classes(term_id);
CREATE INDEX IF NOT EXISTS idx_classes_subject ON public.classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_homeroom ON public.classes(homeroom_id);

-- 9. Bảng class_teacher_assignments
CREATE TABLE IF NOT EXISTS public.class_teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'primary_teacher' CHECK (role IN ('primary_teacher', 'co_teacher', 'assistant')),
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_class_teachers_assignment UNIQUE (school_id, class_id, teacher_id, role)
);

CREATE INDEX IF NOT EXISTS idx_class_teachers_lookup ON public.class_teacher_assignments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_class_teachers_class ON public.class_teacher_assignments(class_id, status);

-- 10. Bảng role_assignments
CREATE TABLE IF NOT EXISTS public.role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'head_teacher', 'subject_teacher', 'student', 'parent')),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('school', 'homeroom', 'class', 'subject')),
    scope_id UUID,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_assignments_scope UNIQUE (school_id, user_id, role, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON public.role_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_role_assignments_scope ON public.role_assignments(school_id, scope_type, scope_id);

-- =========================================================================
-- PHẦN 3: BẬT RLS & POLICY
-- =========================================================================
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homerooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeroom_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeroom_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "academic_years_read_school" ON public.academic_years;
    CREATE POLICY "academic_years_read_school" ON public.academic_years FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.school_memberships m WHERE m.user_id = auth.uid() AND m.school_id = academic_years.school_id AND m.status = 'active'));

    DROP POLICY IF EXISTS "terms_read_school" ON public.terms;
    CREATE POLICY "terms_read_school" ON public.terms FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.school_memberships m WHERE m.user_id = auth.uid() AND m.school_id = terms.school_id AND m.status = 'active'));

    DROP POLICY IF EXISTS "grade_levels_read_school" ON public.grade_levels;
    CREATE POLICY "grade_levels_read_school" ON public.grade_levels FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.school_memberships m WHERE m.user_id = auth.uid() AND m.school_id = grade_levels.school_id AND m.status = 'active'));

    DROP POLICY IF EXISTS "subjects_read_school" ON public.subjects;
    CREATE POLICY "subjects_read_school" ON public.subjects FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.school_memberships m WHERE m.user_id = auth.uid() AND m.school_id = subjects.school_id AND m.status = 'active'));

    DROP POLICY IF EXISTS "homerooms_read_school" ON public.homerooms;
    CREATE POLICY "homerooms_read_school" ON public.homerooms FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.school_memberships m WHERE m.user_id = auth.uid() AND m.school_id = homerooms.school_id AND m.status = 'active'));

    DROP POLICY IF EXISTS "homeroom_enrollments_read_school" ON public.homeroom_enrollments;
    CREATE POLICY "homeroom_enrollments_read_school" ON public.homeroom_enrollments FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.school_memberships m WHERE m.user_id = auth.uid() AND m.school_id = homeroom_enrollments.school_id AND m.status = 'active'));

    DROP POLICY IF EXISTS "class_teachers_read_school" ON public.class_teacher_assignments;
    CREATE POLICY "class_teachers_read_school" ON public.class_teacher_assignments FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.school_memberships m WHERE m.user_id = auth.uid() AND m.school_id = class_teacher_assignments.school_id AND m.status = 'active'));
END $$;

-- =========================================================================
-- PHẦN 4: SEED & BACKFILL DỮ LIỆU THCS NGUYỄN DU (PILOT)
-- =========================================================================
DO $$
DECLARE
    pilot_school_id UUID := '00000000-0000-0000-0001-000000000000';
    year_id UUID := '00000000-0000-0000-0003-000000000001';
    term_hk1_id UUID := '00000000-0000-0000-0003-000000000011';
    grade_6_id UUID := '00000000-0000-0000-0003-000000000006';
    grade_7_id UUID := '00000000-0000-0000-0003-000000000007';
    grade_8_id UUID := '00000000-0000-0000-0003-000000000008';
    grade_9_id UUID := '00000000-0000-0000-0003-000000000009';
    subject_toan_id UUID := '00000000-0000-0000-0003-000000000101';
    subject_van_id UUID := '00000000-0000-0000-0003-000000000102';
    subject_eng_id UUID := '00000000-0000-0000-0003-000000000103';

    hr_6a_id UUID := '00000000-0000-0000-0004-000000000006';
    hr_7a_id UUID := '00000000-0000-0000-0004-000000000007';
    hr_8a_id UUID := '00000000-0000-0000-0004-000000000008';
    hr_9a_id UUID := '00000000-0000-0000-0004-000000000009';

    first_teacher_id UUID;
BEGIN
    -- 4.1. Năm học 2026 - 2027
    INSERT INTO public.academic_years (id, school_id, code, name, start_date, end_date, is_current, status)
    VALUES (year_id, pilot_school_id, '2026-2027', 'Năm học 2026 - 2027', '2026-09-01', '2027-05-31', true, 'active')
    ON CONFLICT (school_id, code) DO UPDATE SET is_current = true;

    -- 4.2. Học kỳ 1 & 2
    INSERT INTO public.terms (id, school_id, academic_year_id, code, name, semester_order, start_date, end_date, is_active)
    VALUES
        (term_hk1_id, pilot_school_id, year_id, 'HK1', 'Học kỳ 1 (2026 - 2027)', 1, '2026-09-01', '2027-01-15', true),
        ('00000000-0000-0000-0003-000000000012', pilot_school_id, year_id, 'HK2', 'Học kỳ 2 (2026 - 2027)', 2, '2027-01-16', '2027-05-31', false)
    ON CONFLICT (school_id, academic_year_id, code) DO UPDATE SET is_active = EXCLUDED.is_active;

    -- 4.3. Khối 6, 7, 8, 9
    INSERT INTO public.grade_levels (id, school_id, level, code, name, is_active)
    VALUES
        (grade_6_id, pilot_school_id, 6, 'K6', 'Khối 6', true),
        (grade_7_id, pilot_school_id, 7, 'K7', 'Khối 7', true),
        (grade_8_id, pilot_school_id, 8, 'K8', 'Khối 8', true),
        (grade_9_id, pilot_school_id, 9, 'K9', 'Khối 9', true)
    ON CONFLICT (school_id, level) DO UPDATE SET is_active = true;

    -- 4.4. Môn học chuẩn THCS
    INSERT INTO public.subjects (id, school_id, code, name, department, is_active)
    VALUES
        (subject_toan_id, pilot_school_id, 'TOAN', 'Toán học', 'Toán - Tin', true),
        (subject_van_id, pilot_school_id, 'VAN', 'Ngữ văn', 'Khoa học xã hội', true),
        (subject_eng_id, pilot_school_id, 'ENG', 'Tiếng Anh', 'Ngoại ngữ', true),
        ('00000000-0000-0000-0003-000000000104', pilot_school_id, 'KHTN', 'Khoa học tự nhiên', 'Khoa học tự nhiên', true),
        ('00000000-0000-0000-0003-000000000105', pilot_school_id, 'LSDL', 'Lịch sử và Địa lý', 'Khoa học xã hội', true),
        ('00000000-0000-0000-0003-000000000106', pilot_school_id, 'TIN', 'Tin học', 'Toán - Tin', true),
        ('00000000-0000-0000-0003-000000000107', pilot_school_id, 'GDCD', 'Giáo dục công dân', 'Khoa học xã hội', true)
    ON CONFLICT (school_id, code) DO UPDATE SET is_active = true;

    -- 4.5. Lớp chủ nhiệm 6A, 7A, 8A, 9A
    INSERT INTO public.homerooms (id, school_id, academic_year_id, grade_level_id, code, name, room, status)
    VALUES
        (hr_6a_id, pilot_school_id, year_id, grade_6_id, '6A', 'Lớp 6A (Chủ nhiệm)', 'P.101', 'active'),
        (hr_7a_id, pilot_school_id, year_id, grade_7_id, '7A', 'Lớp 7A (Chủ nhiệm)', 'P.102', 'active'),
        (hr_8a_id, pilot_school_id, year_id, grade_8_id, '8A', 'Lớp 8A (Chủ nhiệm)', 'P.201', 'active'),
        (hr_9a_id, pilot_school_id, year_id, grade_9_id, '9A', 'Lớp 9A (Chủ nhiệm)', 'P.202', 'active')
    ON CONFLICT (school_id, academic_year_id, code) DO NOTHING;

    -- 4.6. Phân công chủ nhiệm
    SELECT id INTO first_teacher_id FROM public.users WHERE role = 'teacher' LIMIT 1;
    IF first_teacher_id IS NOT NULL THEN
        INSERT INTO public.homeroom_teacher_assignments (school_id, homeroom_id, teacher_id, academic_year_id, role, status)
        VALUES (pilot_school_id, hr_8a_id, first_teacher_id, year_id, 'head_teacher', 'active')
        ON CONFLICT (school_id, homeroom_id, academic_year_id, role) DO NOTHING;
    END IF;

    -- 4.7. Backfill classes: gán term_id, subject_id, homeroom_id
    UPDATE public.classes
    SET term_id = term_hk1_id
    WHERE term_id IS NULL;

    UPDATE public.classes
    SET subject_id = CASE
        WHEN lower(name) LIKE '%văn%' OR lower(name) LIKE '%ngữ văn%' THEN subject_van_id
        WHEN lower(name) LIKE '%anh%' OR lower(name) LIKE '%english%' THEN subject_eng_id
        ELSE subject_toan_id
    END
    WHERE subject_id IS NULL;

    UPDATE public.classes
    SET homeroom_id = hr_8a_id
    WHERE homeroom_id IS NULL;

    -- 4.8. Backfill class_teacher_assignments
    INSERT INTO public.class_teacher_assignments (school_id, class_id, teacher_id, role, status)
    SELECT
        COALESCE(c.school_id, pilot_school_id),
        c.id,
        c.teacher_id,
        'primary_teacher',
        'active'
    FROM public.classes c
    WHERE c.teacher_id IS NOT NULL
    ON CONFLICT (school_id, class_id, teacher_id, role) DO NOTHING;

    -- 4.9. Backfill học sinh vào lớp chủ nhiệm
    INSERT INTO public.homeroom_enrollments (school_id, homeroom_id, student_id, academic_year_id, status)
    SELECT DISTINCT
        pilot_school_id,
        hr_8a_id,
        e.student_id,
        year_id,
        'active'
    FROM public.enrollments e
    JOIN public.users u ON u.id = e.student_id
    WHERE u.role = 'student'
    ON CONFLICT (school_id, student_id, academic_year_id) DO NOTHING;
END $$;
