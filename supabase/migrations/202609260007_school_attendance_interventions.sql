-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M7: ATTENDANCE POLICIES & EARLY INTERVENTIONS
-- File: supabase/migrations/202609260007_school_attendance_interventions.sql
-- Mục đích:
--   1. Tạo bảng attendance_policies (chính sách chuyên cần, ngưỡng đi trễ, cảnh báo)
--   2. Mở rộng absence_requests (gắn school_id, term_id, evidence_url, review_note)
--   3. Tạo bảng intervention_cases (quản lý ca can thiệp sớm học tập / chuyên cần)
--   4. Tạo bảng intervention_actions (nhật ký hành động hỗ trợ append-only)
-- =========================================================================

BEGIN;

-- 1. TẠO BẢNG ATTENDANCE_POLICIES (Chính sách chuyên cần K12 theo trường và kỳ)
CREATE TABLE IF NOT EXISTS public.attendance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    late_threshold_minutes INT NOT NULL DEFAULT 15 CHECK (late_threshold_minutes >= 0),
    absence_warning_count INT NOT NULL DEFAULT 3 CHECK (absence_warning_count > 0),
    grade_drop_threshold NUMERIC NOT NULL DEFAULT 2.0 CHECK (grade_drop_threshold > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(school_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_policies_school ON public.attendance_policies(school_id);

-- 2. MỞ RỘNG BẢNG ABSENCE_REQUESTS (Đơn xin nghỉ phép của phụ huynh)
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL;
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS evidence_url TEXT;
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_absence_requests_school_class ON public.absence_requests(school_id, class_id, absence_date);
CREATE INDEX IF NOT EXISTS idx_absence_requests_student_status ON public.absence_requests(student_id, status);

-- 3. TẠO BẢNG INTERVENTION_CASES (Hồ sơ can thiệp sớm)
CREATE TABLE IF NOT EXISTS public.intervention_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    homeroom_id UUID REFERENCES public.homerooms(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    case_type TEXT NOT NULL CHECK (case_type IN ('attendance', 'academic', 'behavior', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    evidence JSONB NOT NULL DEFAULT '{}',
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    review_deadline TIMESTAMPTZ,
    resolution_summary TEXT,
    closed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intervention_cases_school ON public.intervention_cases(school_id, status);
CREATE INDEX IF NOT EXISTS idx_intervention_cases_student ON public.intervention_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_intervention_cases_homeroom ON public.intervention_cases(homeroom_id);
CREATE INDEX IF NOT EXISTS idx_intervention_cases_assigned ON public.intervention_cases(assigned_to);

-- 4. TẠO BẢNG INTERVENTION_ACTIONS (Nhật ký hành động can thiệp - Append-Only)
CREATE TABLE IF NOT EXISTS public.intervention_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.intervention_cases(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL CHECK (action_type IN ('parent_contact', 'counseling', 'tutoring', 'review_note', 'status_change')),
    note TEXT NOT NULL CHECK (length(trim(note)) > 0),
    outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intervention_actions_case ON public.intervention_actions(case_id, created_at ASC);

-- 5. RÀNG BUỘC KHI ĐÓNG CA CAN THIỆP (Bảo đảm có người xử lý và kết quả xem lại)
CREATE OR REPLACE FUNCTION public.check_intervention_case_closure()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('resolved', 'closed') THEN
        IF NEW.closed_by IS NULL THEN
            RAISE EXCEPTION 'CANNOT_CLOSE_WITHOUT_RESOLVER: Cần có người đóng ca can thiệp.';
        END IF;
        IF NEW.resolution_summary IS NULL OR length(trim(NEW.resolution_summary)) = 0 THEN
            RAISE EXCEPTION 'CANNOT_CLOSE_WITHOUT_SUMMARY: Cần có tóm tắt kết quả xử lý khi đóng ca.';
        END IF;
        IF NEW.closed_at IS NULL THEN
            NEW.closed_at := now();
        END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_intervention_case_closure ON public.intervention_cases;
CREATE TRIGGER trg_check_intervention_case_closure
    BEFORE UPDATE ON public.intervention_cases
    FOR EACH ROW
    EXECUTE FUNCTION public.check_intervention_case_closure();

-- 6. PHÂN QUYỀN RLS VÀ SERVICE ROLE
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['attendance_policies', 'intervention_cases', 'intervention_actions'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END LOOP;
END $$;

COMMIT;
