-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M5: IDENTITY, ONBOARDING & EXCEL IMPORT
-- File: supabase/migrations/202609260005_identity_import.sql
-- Mục đích:
--   1. student_identifiers: Quản lý mã học sinh duy nhất theo trường (không cần email)
--   2. guardian_identifiers: Quản lý mã phụ huynh định danh theo trường
--   3. account_activations: Quản lý token kích hoạt tài khoản lưu hash SHA-256 (mật khẩu tạm abc123)
--   4. import_jobs: Quản lý tiến trình import danh sách học vụ từ Excel
--   5. import_rows: Chi tiết từng dòng import, hỗ trợ preview, sửa lỗi tại chỗ và audit
--   6. Mở rộng parent_students: Thêm school_id, verification_status, valid_from/to
--   7. Backfill an toàn định danh cho học sinh hiện có
-- =========================================================================

-- 1. BẢNG STUDENT_IDENTIFIERS (Mã học sinh duy nhất trong phạm vi trường)
CREATE TABLE IF NOT EXISTS public.student_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'graduated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_identifiers_code UNIQUE (school_id, student_code),
    CONSTRAINT uq_student_identifiers_user UNIQUE (school_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_identifiers_lookup ON public.student_identifiers(school_id, student_code);
CREATE INDEX IF NOT EXISTS idx_student_identifiers_user ON public.student_identifiers(user_id);

-- 2. BẢNG GUARDIAN_IDENTIFIERS (Mã phụ huynh định danh)
CREATE TABLE IF NOT EXISTS public.guardian_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    guardian_code TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_guardian_identifiers_code UNIQUE (school_id, guardian_code),
    CONSTRAINT uq_guardian_identifiers_user UNIQUE (school_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guardian_identifiers_lookup ON public.guardian_identifiers(school_id, guardian_code);
CREATE INDEX IF NOT EXISTS idx_guardian_identifiers_phone ON public.guardian_identifiers(school_id, phone);

-- 3. BẢNG ACCOUNT_ACTIVATIONS (Token kích hoạt tài khoản lưu dạng hash SHA-256)
CREATE TABLE IF NOT EXISTS public.account_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activation_token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
    attempts_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'revoked')),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_activations_lookup ON public.account_activations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_account_activations_token ON public.account_activations(activation_token_hash);

-- 4. BẢNG IMPORT_JOBS (Quản lý phiên import dữ liệu Excel)
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    processed_rows INT NOT NULL DEFAULT 0,
    error_rows INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'validating', 'validated', 'committing', 'completed', 'failed')),
    summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_school ON public.import_jobs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON public.import_jobs(status);

-- 5. BẢNG IMPORT_ROWS (Lưu chi tiết từng dòng trong file import)
CREATE TABLE IF NOT EXISTS public.import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    raw_data JSONB NOT NULL,
    normalized_data JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'error', 'committed')),
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_import_rows_job_row UNIQUE (job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_import_rows_job_status ON public.import_rows(job_id, status);

-- 6. MỞ RỘNG BẢNG PARENT_STUDENTS
ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'revoked'));
ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS valid_to DATE;

CREATE INDEX IF NOT EXISTS idx_parent_students_school ON public.parent_students(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_status ON public.parent_students(verification_status);

-- 7. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.student_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "student_identifiers_read" ON public.student_identifiers;
    CREATE POLICY "student_identifiers_read" ON public.student_identifiers FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'teacher')
            OR user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid() AND m.school_id = student_identifiers.school_id AND m.status = 'active'
            )
        );

    DROP POLICY IF EXISTS "guardian_identifiers_read" ON public.guardian_identifiers;
    CREATE POLICY "guardian_identifiers_read" ON public.guardian_identifiers FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'teacher')
            OR user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.school_memberships m
                WHERE m.user_id = auth.uid() AND m.school_id = guardian_identifiers.school_id AND m.status = 'active'
            )
        );

    DROP POLICY IF EXISTS "account_activations_read" ON public.account_activations;
    CREATE POLICY "account_activations_read" ON public.account_activations FOR SELECT TO authenticated
        USING (
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            OR user_id = auth.uid()
        );

    DROP POLICY IF EXISTS "import_jobs_admin" ON public.import_jobs;
    CREATE POLICY "import_jobs_admin" ON public.import_jobs FOR ALL TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
        WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

    DROP POLICY IF EXISTS "import_rows_admin" ON public.import_rows;
    CREATE POLICY "import_rows_admin" ON public.import_rows FOR ALL TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
        WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
END $$;

-- 8. BACKFILL ĐỊNH DANH HỌC SINH HIỆN CÓ TẠI TRƯỜNG THCS NGUYỄN DU
DO $$
DECLARE
    pilot_school_id UUID := '00000000-0000-0000-0001-000000000000';
    r RECORD;
    idx INT := 1;
    st_code TEXT;
    -- Hash SHA-256 của chuỗi kích hoạt mặc định 'ACTIVATION-INIT-2026'
    default_token_hash TEXT := '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
BEGIN
    -- Gán school_id cho các bản ghi parent_students cũ
    UPDATE public.parent_students
    SET school_id = pilot_school_id
    WHERE school_id IS NULL;

    -- Tạo mã học sinh tự động HS001..HS099 cho toàn bộ học sinh trường THCS Nguyễn Du
    FOR r IN (
        SELECT u.id, u.email, u.full_name
        FROM public.users u
        JOIN public.school_memberships m ON m.user_id = u.id AND m.school_id = pilot_school_id
        WHERE u.role = 'student'
        ORDER BY u.created_at ASC
    ) LOOP
        st_code := 'HS' || LPAD(idx::TEXT, 3, '0');

        INSERT INTO public.student_identifiers (school_id, user_id, student_code, status)
        VALUES (pilot_school_id, r.id, st_code, 'active')
        ON CONFLICT (school_id, student_code) DO NOTHING;

        -- Tạo bản ghi kích hoạt tài khoản
        INSERT INTO public.account_activations (school_id, user_id, activation_token_hash, status)
        VALUES (pilot_school_id, r.id, default_token_hash, 'used')
        ON CONFLICT DO NOTHING;

        idx := idx + 1;
    END LOOP;
END $$;
