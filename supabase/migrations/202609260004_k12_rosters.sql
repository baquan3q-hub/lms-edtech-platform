-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M4: K12 ROSTERS (LỚP CHỦ NHIỆM, LỚP MÔN, PHÂN CÔNG)
-- File: supabase/migrations/202609260004_k12_rosters.sql
-- Mục đích:
--   1. Phân biệt lớp chủ nhiệm (homerooms) và lớp môn học (classes)
--   2. Gắn kết học sinh vào lớp chủ nhiệm theo năm học (homeroom_enrollments)
--   3. Phân công giáo viên chủ nhiệm (homeroom_teacher_assignments)
--   4. Mở rộng classes với term_id, subject_id, homeroom_id
--   5. Phân công giáo viên bộ môn (class_teacher_assignments)
--   6. Quản trị đa vai trò theo phạm vi (role_assignments)
--   7. Backfill an toàn dữ liệu lịch sử
-- =========================================================================

-- 1. TẠO BẢNG HOMEROOMS (Lớp hành chính / chủ nhiệm)
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

-- 2. TẠO BẢNG HOMEROOM_ENROLLMENTS (Học sinh thuộc lớp chủ nhiệm theo năm học)
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

-- 3. TẠO BẢNG HOMEROOM_TEACHER_ASSIGNMENTS (Phân công giáo viên chủ nhiệm)
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

-- 4. MỞ RỘNG BẢNG CLASSES (Lớp môn học) VỚI TERM, SUBJECT, HOMEROOM
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE RESTRICT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE RESTRICT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS homeroom_id UUID REFERENCES public.homerooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_term ON public.classes(term_id);
CREATE INDEX IF NOT EXISTS idx_classes_subject ON public.classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_homeroom ON public.classes(homeroom_id);

-- 5. TẠO BẢNG CLASS_TEACHER_ASSIGNMENTS (Phân công giáo viên bộ môn)
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

-- 6. TẠO BẢNG ROLE_ASSIGNMENTS (Quản trị đa vai trò có phạm vi)
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

-- 7. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.homerooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeroom_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeroom_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "homerooms_read_school" ON public.homerooms;
    CREATE POLICY "homerooms_read_school" ON public.homerooms
        FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid()
                  AND m.school_id = homerooms.school_id
                  AND m.status = 'active'
            )
        );

    DROP POLICY IF EXISTS "homeroom_enrollments_read_school" ON public.homeroom_enrollments;
    CREATE POLICY "homeroom_enrollments_read_school" ON public.homeroom_enrollments
        FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR student_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid()
                  AND m.school_id = homeroom_enrollments.school_id
                  AND m.status = 'active'
            )
        );

    DROP POLICY IF EXISTS "class_teachers_read_school" ON public.class_teacher_assignments;
    CREATE POLICY "class_teachers_read_school" ON public.class_teacher_assignments
        FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR teacher_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid()
                  AND m.school_id = class_teacher_assignments.school_id
                  AND m.status = 'active'
            )
        );
END $$;

-- 8. SEED VÀ BACKFILL DỮ LIỆU THCS NGUYỄN DU
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
    -- 8.1. Khởi tạo 4 Lớp chủ nhiệm mẫu: 6A, 7A, 8A, 9A
    INSERT INTO public.homerooms (id, school_id, academic_year_id, grade_level_id, code, name, room, status)
    VALUES
        (hr_6a_id, pilot_school_id, year_id, grade_6_id, '6A', 'Lớp 6A (Chủ nhiệm)', 'P.101', 'active'),
        (hr_7a_id, pilot_school_id, year_id, grade_7_id, '7A', 'Lớp 7A (Chủ nhiệm)', 'P.102', 'active'),
        (hr_8a_id, pilot_school_id, year_id, grade_8_id, '8A', 'Lớp 8A (Chủ nhiệm)', 'P.201', 'active'),
        (hr_9a_id, pilot_school_id, year_id, grade_9_id, '9A', 'Lớp 9A (Chủ nhiệm)', 'P.202', 'active')
    ON CONFLICT (school_id, academic_year_id, code) DO UPDATE
    SET name = EXCLUDED.name, room = EXCLUDED.room;

    -- Lấy 1 giáo viên thật trong trường để gán chủ nhiệm & bộ môn
    SELECT id INTO first_teacher_id FROM public.users WHERE role = 'teacher' LIMIT 1;

    IF first_teacher_id IS NOT NULL THEN
        -- Gán giáo viên chủ nhiệm lớp 8A
        INSERT INTO public.homeroom_teacher_assignments (school_id, homeroom_id, teacher_id, academic_year_id, role, status)
        VALUES (pilot_school_id, hr_8a_id, first_teacher_id, year_id, 'head_teacher', 'active')
        ON CONFLICT (school_id, homeroom_id, academic_year_id, role) DO NOTHING;
    END IF;

    -- 8.2. Backfill cột term_id, subject_id, homeroom_id trên bảng classes
    -- Gán term_id là HK1 cho tất cả các lớp chưa có term_id
    UPDATE public.classes
    SET term_id = term_hk1_id
    WHERE term_id IS NULL AND (school_id = pilot_school_id OR school_id IS NULL);

    -- Gán subject_id dựa trên tên lớp hoặc default sang Toán
    UPDATE public.classes
    SET subject_id = CASE
        WHEN lower(name) LIKE '%văn%' OR lower(name) LIKE '%ngữ văn%' THEN subject_van_id
        WHEN lower(name) LIKE '%anh%' OR lower(name) LIKE '%english%' THEN subject_eng_id
        ELSE subject_toan_id
    END
    WHERE subject_id IS NULL;

    -- Gán homeroom_id cho lớp môn học dựa theo khối hoặc lớp 8A
    UPDATE public.classes
    SET homeroom_id = hr_8a_id
    WHERE homeroom_id IS NULL;

    -- 8.3. Backfill class_teacher_assignments từ classes.teacher_id
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

    -- 8.4. Backfill học sinh từ enrollments sang homeroom_enrollments
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
