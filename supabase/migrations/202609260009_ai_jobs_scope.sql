-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M9: AI JOBS SCOPE, QUOTAS & GOVERNANCE
-- File: supabase/migrations/202609260009_ai_jobs_scope.sql
-- Mục đích:
--   1. Thêm cờ cấu hình ai_enabled vào bảng schools
--   2. Tạo bảng school_ai_quotas quản lý hạn ngạch token hàng tháng và concurrency
--   3. Mở rộng / Tạo bảng learning_ai_jobs quản lý vòng đời AI Jobs có kiểm soát
--   4. Cung cấp hàm RPC atomic kiểm tra hạn ngạch và ghi nhận token
-- =========================================================================

BEGIN;

-- 1. BỔ SUNG CỜ AI TRÊN BẢNG SCHOOLS
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2. TẠO BẢNG SCHOOL_AI_QUOTAS (Quản lý hạn mức chi phí & quota theo tháng)
CREATE TABLE IF NOT EXISTS public.school_ai_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- Ngày đầu tháng (YYYY-MM-01)
    token_quota INT NOT NULL DEFAULT 500000 CHECK (token_quota >= 0),
    tokens_used INT NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
    job_count INT NOT NULL DEFAULT 0 CHECK (job_count >= 0),
    max_parallel_jobs INT NOT NULL DEFAULT 5 CHECK (max_parallel_jobs > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(school_id, month)
);

CREATE INDEX IF NOT EXISTS idx_school_ai_quotas_lookup ON public.school_ai_quotas(school_id, month);

-- 3. TẠO HOẶC MỞ RỘNG BẢNG LEARNING_AI_JOBS
CREATE TABLE IF NOT EXISTS public.learning_ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    submission_id UUID REFERENCES public.exam_submissions(id) ON DELETE SET NULL,
    homework_id UUID REFERENCES public.homework(id) ON DELETE SET NULL,
    intervention_case_id UUID REFERENCES public.intervention_cases(id) ON DELETE SET NULL,
    source_data_hash TEXT NOT NULL,
    prompt_version TEXT NOT NULL DEFAULT 'v1',
    model_name TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    status TEXT NOT NULL DEFAULT 'queued',
    review_status TEXT NOT NULL DEFAULT 'draft',
    reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    raw_output JSONB,
    approved_payload JSONB,
    estimated_tokens INT NOT NULL DEFAULT 0,
    actual_tokens INT NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
    actual_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,
    attempts INT NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- Bổ sung các cột nếu bảng đã tồn tại từ trước
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS homework_id UUID REFERENCES public.homework(id) ON DELETE SET NULL;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS intervention_case_id UUID REFERENCES public.intervention_cases(id) ON DELETE SET NULL;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS prompt_version TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS model_name TEXT NOT NULL DEFAULT 'gemini-2.5-flash';
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS raw_output JSONB;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS approved_payload JSONB;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS estimated_tokens INT NOT NULL DEFAULT 0;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS actual_tokens INT NOT NULL DEFAULT 0;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(10, 6) NOT NULL DEFAULT 0;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Nới lỏng hoặc chuẩn hóa các constraints cho bảng learning_ai_jobs
DO $$
BEGIN
    -- Ràng buộc kind cho 3 tác vụ pilot và các dạng cũ nếu có
    ALTER TABLE public.learning_ai_jobs DROP CONSTRAINT IF EXISTS learning_ai_jobs_kind_check;
    ALTER TABLE public.learning_ai_jobs ADD CONSTRAINT learning_ai_jobs_kind_check 
        CHECK (kind IN ('question_generation', 'rubric_grading_feedback', 'early_intervention_recommendation', 'individual', 'class'));

    -- Ràng buộc review_status
    ALTER TABLE public.learning_ai_jobs DROP CONSTRAINT IF EXISTS learning_ai_jobs_review_status_check;
    ALTER TABLE public.learning_ai_jobs ADD CONSTRAINT learning_ai_jobs_review_status_check 
        CHECK (review_status IN ('draft', 'approved', 'rejected'));

    -- Ràng buộc status
    ALTER TABLE public.learning_ai_jobs DROP CONSTRAINT IF EXISTS learning_ai_jobs_status_check;
    ALTER TABLE public.learning_ai_jobs ADD CONSTRAINT learning_ai_jobs_status_check 
        CHECK (status IN ('queued', 'running', 'ready', 'failed', 'circuit_broken'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Tạo các Index phục vụ truy vấn và đối soát
CREATE INDEX IF NOT EXISTS idx_learning_ai_jobs_school_status ON public.learning_ai_jobs(school_id, status);
CREATE INDEX IF NOT EXISTS idx_learning_ai_jobs_review ON public.learning_ai_jobs(school_id, review_status);
CREATE INDEX IF NOT EXISTS idx_learning_ai_jobs_requested ON public.learning_ai_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_learning_ai_jobs_target ON public.learning_ai_jobs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_learning_ai_jobs_hash ON public.learning_ai_jobs(source_data_hash);

-- Phân quyền RLS an toàn
ALTER TABLE public.learning_ai_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_ai_jobs FROM anon, authenticated;
GRANT ALL ON public.learning_ai_jobs TO service_role;

ALTER TABLE public.school_ai_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_ai_quotas FROM anon, authenticated;
GRANT ALL ON public.school_ai_quotas TO service_role;

-- 4. ATOMIC FUNCTION: KIỂM TRA HẠN NGẠCH VÀ CONCURRENCY
CREATE OR REPLACE FUNCTION public.check_and_consume_ai_quota(
    p_school_id UUID,
    p_estimated_tokens INT DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ai_enabled BOOLEAN;
    v_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
    v_quota_rec RECORD;
    v_active_jobs INT;
BEGIN
    -- 1. Kiểm tra cờ AI của trường
    SELECT ai_enabled INTO v_ai_enabled FROM public.schools WHERE id = p_school_id;
    IF v_ai_enabled IS NOT TRUE THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'AI_DISABLED_FOR_SCHOOL');
    END IF;

    -- 2. Đảm bảo bản ghi quota tháng tồn tại
    INSERT INTO public.school_ai_quotas (school_id, month, token_quota, tokens_used, job_count, max_parallel_jobs)
    VALUES (p_school_id, v_month, 500000, 0, 0, 5)
    ON CONFLICT (school_id, month) DO NOTHING;

    -- 3. Khóa hàng quota để kiểm tra
    SELECT * INTO v_quota_rec 
    FROM public.school_ai_quotas 
    WHERE school_id = p_school_id AND month = v_month 
    FOR UPDATE;

    -- Kiểm tra hạn mức token
    IF (v_quota_rec.tokens_used + p_estimated_tokens) > v_quota_rec.token_quota THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'reason', 'QUOTA_EXCEEDED', 
            'tokens_used', v_quota_rec.tokens_used, 
            'token_quota', v_quota_rec.token_quota
        );
    END IF;

    -- Kiểm tra concurrency (số job đang chạy)
    SELECT count(*) INTO v_active_jobs 
    FROM public.learning_ai_jobs 
    WHERE school_id = p_school_id AND status = 'running';

    IF v_active_jobs >= v_quota_rec.max_parallel_jobs THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'reason', 'CONCURRENCY_LIMIT_REACHED', 
            'active_jobs', v_active_jobs, 
            'max_parallel', v_quota_rec.max_parallel_jobs
        );
    END IF;

    -- Tạm giữ quota / tăng job_count
    UPDATE public.school_ai_quotas
    SET job_count = job_count + 1,
        updated_at = now()
    WHERE school_id = p_school_id AND month = v_month;

    RETURN jsonb_build_object(
        'allowed', true, 
        'tokens_used', v_quota_rec.tokens_used, 
        'token_quota', v_quota_rec.token_quota
    );
END;
$$;

-- 5. ATOMIC FUNCTION: GHI NHẬN TOKEN THỰC TẾ
CREATE OR REPLACE FUNCTION public.record_ai_token_usage(
    p_school_id UUID,
    p_actual_tokens INT,
    p_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.school_ai_quotas
    SET tokens_used = tokens_used + GREATEST(p_actual_tokens, 0),
        updated_at = now()
    WHERE school_id = p_school_id AND month = p_month;
END;
$$;

COMMIT;
