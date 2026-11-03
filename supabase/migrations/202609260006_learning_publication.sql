-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M6: LEARNING & PUBLICATION ENGINE
-- File: supabase/migrations/202609260006_learning_publication.sql
-- Mục đích: 
--   1. Tạo bảng rubrics & rubric_criteria (tiêu chí chấm tự luận)
--   2. Tạo bảng score_adjustments (lịch sử sửa điểm đã công bố kèm lý do)
--   3. Mở rộng exams: max_attempts, questions_snapshot, publication_status
--   4. Tạo/Mở rộng exam_attempts: attempt_no, UNIQUE(exam_id, student_id, attempt_no)
--   5. Cập nhật exam_submissions: UNIQUE(attempt_id), grading_status phân tách nháp/công bố
--   6. Tạo bảng grade_audit nếu chưa có
--   7. Mở rộng homework & homework_submissions: publication_status, grading_status
--   8. Cập nhật RPC submit_learning_exam & approve_learning_grade
-- =========================================================================

BEGIN;

-- 1. TẠO BẢNG RUBRICS VÀ RUBRIC_CRITERIA
CREATE TABLE IF NOT EXISTS public.rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    total_points NUMERIC NOT NULL DEFAULT 10.0 CHECK (total_points > 0),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_id UUID NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    max_points NUMERIC NOT NULL CHECK (max_points > 0),
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rubrics_school ON public.rubrics(school_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric ON public.rubric_criteria(rubric_id, order_index);

-- 2. TẠO BẢNG SCORE_ADJUSTMENTS (Lưu vết sửa điểm thi/bài tập sau công bố)
CREATE TABLE IF NOT EXISTS public.score_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('exam', 'homework')),
    submission_id UUID NOT NULL,
    actor_id UUID NOT NULL REFERENCES public.users(id),
    old_score NUMERIC,
    new_score NUMERIC NOT NULL,
    reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
    rubric_breakdown JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_adjustments_submission ON public.score_adjustments(submission_type, submission_id);
CREATE INDEX IF NOT EXISTS idx_score_adjustments_school ON public.score_adjustments(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_adjustments_actor ON public.score_adjustments(actor_id);

-- 3. MỞ RỘNG BẢNG EXAMS
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts >= 1);
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS questions_snapshot JSONB;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'closed'));

CREATE INDEX IF NOT EXISTS idx_exams_publication ON public.exams(class_id, publication_status);

-- 4. TẠO HOẶC MỞ RỘNG BẢNG EXAM_ATTEMPTS (Hỗ trợ cấu hình nhiều lượt làm bài)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attempt_no INT NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    draft_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    draft_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.1 Bổ sung cột nếu bảng đã tồn tại từ migration trước
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS attempt_no INT NOT NULL DEFAULT 1;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS draft_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS draft_version INT NOT NULL DEFAULT 0;

-- 4.2 Xóa bỏ ràng buộc UNIQUE cũ (exam_id, student_id) nếu có một cách an toàn
DO $$
DECLARE
    r RECORD;
    v_colnames text[];
BEGIN
    IF to_regclass('public.exam_attempts') IS NOT NULL THEN
        FOR r IN 
            SELECT c.conname, c.conkey
            FROM pg_constraint c
            WHERE c.conrelid = to_regclass('public.exam_attempts') 
              AND c.contype = 'u'
        LOOP
            SELECT array_agg(a.attname ORDER BY a.attnum)
            INTO v_colnames
            FROM pg_attribute a
            WHERE a.attrelid = to_regclass('public.exam_attempts')
              AND a.attnum = ANY(r.conkey);

            IF v_colnames @> ARRAY['exam_id','student_id'] 
               AND array_length(r.conkey, 1) = 2 THEN
                EXECUTE format('ALTER TABLE public.exam_attempts DROP CONSTRAINT %I', r.conname);
            END IF;
        END LOOP;
    END IF;
END $$;

-- 4.3 Tạo ràng buộc UNIQUE mới trên (exam_id, student_id, attempt_no)
DO $$
BEGIN
    IF to_regclass('public.exam_attempts') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = to_regclass('public.exam_attempts') 
              AND conname = 'exam_attempts_exam_student_attempt_key'
        ) THEN
            ALTER TABLE public.exam_attempts 
            ADD CONSTRAINT exam_attempts_exam_student_attempt_key UNIQUE(exam_id, student_id, attempt_no);
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_lookup ON public.exam_attempts(exam_id, student_id, attempt_no);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_active ON public.exam_attempts(student_id, submitted_at, expires_at);

-- 5. CẬP NHẬT BẢNG EXAM_SUBMISSIONS
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE SET NULL;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS objective_score NUMERIC;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS rubric_grades JSONB;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS ai_rubric_draft JSONB;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.users(id);
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- 5.1 Xóa unique index cũ (exam_id, student_id) nếu có để cho phép nộp theo từng lượt làm bài
DO $$
BEGIN
    ALTER TABLE public.exam_submissions DROP CONSTRAINT IF EXISTS one_exam_submission_per_student;
    DROP INDEX IF EXISTS public.one_exam_submission_per_student;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5.2 Ràng buộc 1 attempt_id chỉ có tối đa 1 bản nộp
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_submissions_attempt_id ON public.exam_submissions(attempt_id) WHERE attempt_id IS NOT NULL;

-- 5.3 Mở rộng grading_status: 'ungraded', 'draft', 'published', 'locked', kèm tương thích 'pending', 'graded'
DO $$
BEGIN
    ALTER TABLE public.exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_grading_status_check;
    ALTER TABLE public.exam_submissions ADD CONSTRAINT exam_submissions_grading_status_check 
        CHECK (grading_status IN ('ungraded', 'draft', 'published', 'locked', 'pending', 'graded'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 6. TẠO BẢNG GRADE_AUDIT (Audit vết điểm bài thi)
CREATE TABLE IF NOT EXISTS public.grade_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.exam_submissions(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.users(id),
    previous_score NUMERIC,
    new_score NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    rubric_grades JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grade_audit_submission ON public.grade_audit(submission_id);

-- 7. MỞ RỘNG BẢNG HOMEWORK VÀ HOMEWORK_SUBMISSIONS
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'closed'));
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts >= 1);

ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS grading_status TEXT NOT NULL DEFAULT 'ungraded' CHECK (grading_status IN ('ungraded', 'draft', 'published', 'locked'));

CREATE INDEX IF NOT EXISTS idx_homework_submissions_grading ON public.homework_submissions(homework_id, grading_status);

-- 8. NÂNG CẤP STORED PROCEDURE SUBMIT_LEARNING_EXAM (Bảo đảm Server-Side Clock & Idempotency)
CREATE OR REPLACE FUNCTION public.submit_learning_exam(
    p_student UUID, 
    p_attempt UUID, 
    p_answers JSONB
)
RETURNS public.exam_submissions 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
DECLARE 
    a exam_attempts; 
    s exam_submissions; 
    q jsonb; 
    ans jsonb; 
    correct text; 
    pts numeric := 0; 
    essay boolean := false; 
    idx integer := 0; 
    chosen jsonb;
    v_time_taken integer;
BEGIN
    SELECT * INTO a FROM public.exam_attempts 
    WHERE id = p_attempt AND student_id = p_student 
    FOR UPDATE;
    
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'ATTEMPT_NOT_FOUND'; 
    END IF;
    
    SELECT * INTO s FROM public.exam_submissions WHERE attempt_id = a.id;
    IF FOUND THEN 
        RETURN s; 
    END IF;
    
    IF now() > a.expires_at THEN
        chosen := a.draft_answers;
    ELSE
        chosen := COALESCE(p_answers, a.draft_answers);
    END IF;
    
    FOR q IN SELECT value FROM jsonb_array_elements(a.snapshot->'questions') LOOP
        ans := chosen->idx;
        IF q->>'type' = 'ESSAY' THEN 
            essay := true;
        ELSE
            SELECT value->>'id' INTO correct 
            FROM jsonb_array_elements(q->'options') 
            WHERE (value->>'isCorrect')::boolean = true OR value->>'isCorrect' = 'true' 
            LIMIT 1;
            
            IF correct IS NOT NULL AND ans->>'selectedOptionId' = correct THEN 
                pts := pts + COALESCE((q->>'points')::numeric, 1); 
            END IF;
        END IF; 
        idx := idx + 1;
    END LOOP;
    
    v_time_taken := GREATEST(0, EXTRACT(EPOCH FROM LEAST(now(), a.expires_at) - a.started_at)::integer);
    
    INSERT INTO public.exam_submissions (
        exam_id,
        student_id,
        attempt_id,
        answers,
        score,
        objective_score,
        total_points,
        started_at,
        submitted_at,
        time_taken_seconds,
        grading_status,
        school_id
    )
    VALUES (
        a.exam_id,
        p_student,
        a.id,
        chosen,
        CASE WHEN essay THEN NULL ELSE pts END,
        pts,
        (a.snapshot->>'total_points')::numeric,
        a.started_at,
        now(),
        v_time_taken,
        CASE WHEN essay THEN 'ungraded' ELSE 'draft' END,
        a.school_id
    ) 
    RETURNING * INTO s;
    
    UPDATE public.exam_attempts 
    SET submitted_at = now(), 
        draft_answers = chosen 
    WHERE id = a.id;
    
    RETURN s;
END $$;

-- 9. NÂNG CẤP STORED PROCEDURE APPROVE_LEARNING_GRADE (Ghi vết vào score_adjustments)
CREATE OR REPLACE FUNCTION public.approve_learning_grade(
    p_submission UUID,
    p_actor UUID,
    p_score NUMERIC,
    p_reason TEXT,
    p_rubric JSONB
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
DECLARE 
    s exam_submissions; 
    v_school_id UUID;
BEGIN
    SELECT * INTO s FROM public.exam_submissions WHERE id = p_submission FOR UPDATE;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'SUBMISSION_NOT_FOUND'; 
    END IF;
    
    IF p_score < 0 OR p_score > s.total_points THEN 
        RAISE EXCEPTION 'INVALID_SCORE_RANGE'; 
    END IF;
    
    IF length(trim(p_reason)) = 0 THEN 
        RAISE EXCEPTION 'REASON_REQUIRED_FOR_GRADE_UPDATE'; 
    END IF;
    
    v_school_id := s.school_id;
    IF v_school_id IS NULL THEN
        SELECT school_id INTO v_school_id FROM public.exams WHERE id = s.exam_id;
    END IF;
    IF v_school_id IS NULL THEN
        v_school_id := '00000000-0000-0000-0001-000000000000'::uuid;
    END IF;
    
    INSERT INTO public.grade_audit (
        submission_id,
        actor_id,
        previous_score,
        new_score,
        reason,
        rubric_grades
    ) 
    VALUES (
        s.id,
        p_actor,
        s.score,
        p_score,
        p_reason,
        p_rubric
    );
    
    INSERT INTO public.score_adjustments (
        school_id,
        submission_type,
        submission_id,
        actor_id,
        old_score,
        new_score,
        reason,
        rubric_breakdown
    )
    VALUES (
        v_school_id,
        'exam',
        s.id,
        p_actor,
        s.score,
        p_score,
        p_reason,
        p_rubric
    );
    
    UPDATE public.exam_submissions 
    SET score = p_score, 
        rubric_grades = p_rubric, 
        grading_status = 'published',
        graded_at = now(),
        graded_by = p_actor 
    WHERE id = s.id;
END $$;

-- 10. PHÂN QUYỀN RLS VÀ SERVICE ROLE
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['exam_attempts', 'grade_audit', 'rubrics', 'rubric_criteria', 'score_adjustments'] LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
            EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
        END IF;
    END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.submit_learning_exam(uuid, uuid, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_learning_grade(uuid, uuid, numeric, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_learning_exam(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_learning_grade(uuid, uuid, numeric, text, jsonb) TO service_role;

COMMIT;
