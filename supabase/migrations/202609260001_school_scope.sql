-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M1: SCHOOL SCOPE & MULTI-TENANCY
-- File: supabase/migrations/202609260001_school_scope.sql
-- Mục đích: Thiết lập bảng schools, school_memberships, gắn school_id vào các bảng lõi
--           và backfill an toàn toàn bộ dữ liệu hiện có về trường thí điểm.
-- =========================================================================

-- 1. TẠO BẢNG SCHOOLS (Trường học)
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TẠO BẢNG SCHOOL_MEMBERSHIPS (Thành viên trường học)
CREATE TABLE IF NOT EXISTS public.school_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(school_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_school_memberships_user ON public.school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_school_memberships_school ON public.school_memberships(school_id);
CREATE INDEX IF NOT EXISTS idx_school_memberships_lookup ON public.school_memberships(school_id, user_id, role);

-- 3. BỔ SUNG CỘT school_id (NULLABLE) VÀO CÁC BẢNG HỌC VỤ LÕI
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.student_activity_logs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;

-- 4. TẠO CÁC CHỈ MỤC THEO TRƯỜNG ĐỂ TỐI ƯU HIỆU NĂNG VÀ CÁCH LY
CREATE INDEX IF NOT EXISTS idx_courses_school ON public.courses(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_homework_school ON public.homework(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school ON public.exams(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_school ON public.attendance_records(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON public.announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_school ON public.student_activity_logs(school_id);

-- 5. TẠO TRƯỜNG THÍ ĐIỂM (PILOT) VÀ TRƯỜNG THỨ HAI ĐỂ KIỂM THỬ CÁCH LY
INSERT INTO public.schools (id, code, name, address, status)
VALUES 
  ('00000000-0000-0000-0001-000000000000', 'THCS-NDU', 'Trường THCS Nguyễn Du (Pilot)', 'Hà Nội', 'active'),
  ('00000000-0000-0000-0002-000000000000', 'THCS-CVA', 'Trường THCS Chu Văn An (Đối chiếu)', 'Hà Nội', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

-- 6. BACKFILL DỮ LIỆU HIỆN CÓ VỀ TRƯỜNG THÍ ĐIỂM MẶC ĐỊNH
-- 6.1 Gán school_id cho các bảng nghiệp vụ
UPDATE public.courses SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.classes SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.rooms SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.homework SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.exams SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.attendance SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.attendance_records SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.announcements SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.student_activity_logs SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.invoices SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;
UPDATE public.payments SET school_id = '00000000-0000-0000-0001-000000000000' WHERE school_id IS NULL;

-- 6.2 Backfill school_memberships cho toàn bộ người dùng hiện có
INSERT INTO public.school_memberships (school_id, user_id, role, status)
SELECT 
    '00000000-0000-0000-0001-000000000000' as school_id,
    u.id as user_id,
    u.role as role,
    'active' as status
FROM public.users u
WHERE u.role IN ('admin', 'teacher', 'student', 'parent')
ON CONFLICT (school_id, user_id, role) DO NOTHING;

-- 7. HELPER FUNCTIONS CHO PHÂN QUYỀN TRƯỜNG HỌC
CREATE OR REPLACE FUNCTION public.get_user_primary_school(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_school_id UUID;
BEGIN
    SELECT school_id INTO v_school_id
    FROM public.school_memberships
    WHERE user_id = p_user_id AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;
    RETURN v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_school_role(p_user_id UUID, p_school_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.school_memberships
        WHERE user_id = p_user_id 
          AND school_id = p_school_id 
          AND (role = p_role OR role = 'admin')
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ROW LEVEL SECURITY POLICIES CHO SCHOOLS & MEMBERSHIPS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

-- Mọi người dùng đã đăng nhập có thể xem thông tin trường mình thuộc về
DROP POLICY IF EXISTS "Users can read own schools" ON public.schools;
CREATE POLICY "Users can read own schools" ON public.schools FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.school_memberships sm 
        WHERE sm.school_id = schools.id AND sm.user_id = auth.uid()
    ) OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Người dùng xem memberships của chính mình hoặc admin trường xem toàn bộ
DROP POLICY IF EXISTS "Users can read own memberships" ON public.school_memberships;
CREATE POLICY "Users can read own memberships" ON public.school_memberships FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.user_has_school_role(auth.uid(), school_id, 'admin')
);
