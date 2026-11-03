-- =========================================================================
-- LMS K12 PLATFORM - CONSOLIDATED MIGRATION: PHASE 4 & PHASE 5
-- File: supabase/migrations/phase4_5_full_migration.sql
-- Bao gồm:
--   - M6: 202609260006_learning_publication.sql
--   - M7: 202609260007_school_attendance_interventions.sql
--   - M8: 202609260008_reporting_projections.sql
-- =========================================================================

BEGIN;

-- =========================================================================
-- PHẦN 1: MIGRATION M6 (LEARNING & PUBLICATION ENGINE)
-- =========================================================================

-- 1.1 Tạo bảng rubrics và rubric_criteria
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

-- 1.2 Tạo bảng score_adjustments
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

-- 1.3 Mở rộng bảng exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts >= 1);
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS questions_snapshot JSONB;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'closed'));

CREATE INDEX IF NOT EXISTS idx_exams_publication ON public.exams(class_id, publication_status);

-- 1.4 Tạo hoặc mở rộng bảng exam_attempts (Hỗ trợ cấu hình nhiều lượt làm bài)
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

-- 1.4.1 Bổ sung cột nếu bảng đã tồn tại từ migration trước
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS attempt_no INT NOT NULL DEFAULT 1;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS draft_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS draft_version INT NOT NULL DEFAULT 0;

-- 1.4.2 Xóa bỏ ràng buộc UNIQUE cũ (exam_id, student_id) nếu có một cách an toàn
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

-- 1.4.3 Tạo ràng buộc UNIQUE mới trên (exam_id, student_id, attempt_no)
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

-- 1.5 Cập nhật bảng exam_submissions
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE SET NULL;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS objective_score NUMERIC;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS rubric_grades JSONB;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS ai_rubric_draft JSONB;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.users(id);
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- 1.5.1 Xóa unique index cũ (exam_id, student_id) nếu có để cho phép nộp theo từng lượt làm bài
DO $$
BEGIN
    ALTER TABLE public.exam_submissions DROP CONSTRAINT IF EXISTS one_exam_submission_per_student;
    DROP INDEX IF EXISTS public.one_exam_submission_per_student;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 1.5.2 Ràng buộc 1 attempt_id chỉ có tối đa 1 bản nộp
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_submissions_attempt_id ON public.exam_submissions(attempt_id) WHERE attempt_id IS NOT NULL;

-- 1.5.3 Mở rộng grading_status: 'ungraded', 'draft', 'published', 'locked', kèm tương thích 'pending', 'graded'
DO $$
BEGIN
    ALTER TABLE public.exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_grading_status_check;
    ALTER TABLE public.exam_submissions ADD CONSTRAINT exam_submissions_grading_status_check 
        CHECK (grading_status IN ('ungraded', 'draft', 'published', 'locked', 'pending', 'graded'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 1.5.4 Tạo bảng grade_audit (Audit vết điểm bài thi)
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

-- 1.6 Mở rộng bảng homework và homework_submissions
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('draft', 'published', 'closed'));
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 1 CHECK (max_attempts >= 1);
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS grading_status TEXT NOT NULL DEFAULT 'ungraded' CHECK (grading_status IN ('ungraded', 'draft', 'published', 'locked'));

CREATE INDEX IF NOT EXISTS idx_homework_submissions_grading ON public.homework_submissions(homework_id, grading_status);

-- 1.7 Stored Procedure submit_learning_exam
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

-- 1.8 Stored Procedure approve_learning_grade
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

-- =========================================================================
-- PHẦN 2: MIGRATION M7 (ATTENDANCE POLICIES & EARLY INTERVENTIONS)
-- =========================================================================

-- 2.1 Tạo bảng attendance_policies
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

-- 2.2 Mở rộng absence_requests
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL;
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS evidence_url TEXT;
ALTER TABLE public.absence_requests ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_absence_requests_school_class ON public.absence_requests(school_id, class_id, absence_date);
CREATE INDEX IF NOT EXISTS idx_absence_requests_student_status ON public.absence_requests(student_id, status);

-- 2.3 Tạo bảng intervention_cases
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

-- 2.4 Tạo bảng intervention_actions (Append-only)
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

-- 2.5 Trigger kiểm tra đóng ca can thiệp
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

-- =========================================================================
-- PHẦN 3: MIGRATION M8 (REPORTING PROJECTIONS & RPCS)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_school_attendance_summary(
    p_school_id UUID,
    p_term_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_page INT DEFAULT 1,
    p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_total_records BIGINT := 0;
    v_present BIGINT := 0;
    v_absent BIGINT := 0;
    v_late BIGINT := 0;
    v_excused BIGINT := 0;
    v_rate NUMERIC := 0;
    v_total_classes BIGINT := 0;
    v_offset INT := GREATEST(0, (COALESCE(p_page, 1) - 1) * COALESCE(p_limit, 50));
    v_class_data JSONB;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE ar.status = 'present'),
        COUNT(*) FILTER (WHERE ar.status = 'absent'),
        COUNT(*) FILTER (WHERE ar.status = 'late'),
        COUNT(*) FILTER (WHERE ar.status = 'excused')
    INTO 
        v_total_records,
        v_present,
        v_absent,
        v_late,
        v_excused
    FROM public.attendance_records ar
    JOIN public.attendance_sessions s ON s.id = ar.session_id
    JOIN public.classes c ON c.id = s.class_id
    WHERE (c.school_id = p_school_id OR ar.school_id = p_school_id)
      AND (p_term_id IS NULL OR c.term_id = p_term_id)
      AND (p_start_date IS NULL OR s.session_date >= p_start_date)
      AND (p_end_date IS NULL OR s.session_date <= p_end_date);

    IF v_total_records > 0 THEN
        v_rate := ROUND(((v_present::NUMERIC + v_late::NUMERIC * 0.5 + v_excused::NUMERIC) / v_total_records::NUMERIC) * 100, 2);
    ELSE
        v_rate := 0;
    END IF;

    SELECT COUNT(DISTINCT c.id)
    INTO v_total_classes
    FROM public.classes c
    JOIN public.attendance_sessions s ON s.class_id = c.id
    WHERE c.school_id = p_school_id
      AND (p_term_id IS NULL OR c.term_id = p_term_id)
      AND (p_start_date IS NULL OR s.session_date >= p_start_date)
      AND (p_end_date IS NULL OR s.session_date <= p_end_date);

    SELECT COALESCE(jsonb_agg(class_row), '[]'::jsonb)
    INTO v_class_data
    FROM (
        SELECT 
            c.id AS class_id,
            c.name AS class_name,
            sub.name AS subject,
            c.homeroom_id,
            COUNT(ar.id) AS total_records,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS present_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS absent_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS late_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'excused') AS excused_count,
            CASE 
                WHEN COUNT(ar.id) > 0 THEN 
                    ROUND(((COUNT(ar.id) FILTER (WHERE ar.status = 'present')::NUMERIC + 
                            COUNT(ar.id) FILTER (WHERE ar.status = 'late')::NUMERIC * 0.5 + 
                            COUNT(ar.id) FILTER (WHERE ar.status = 'excused')::NUMERIC) / COUNT(ar.id)::NUMERIC) * 100, 2)
                ELSE 0 
            END AS attendance_rate
        FROM public.classes c
        LEFT JOIN public.subjects sub ON sub.id = c.subject_id
        JOIN public.attendance_sessions s ON s.class_id = c.id
        LEFT JOIN public.attendance_records ar ON ar.session_id = s.id
        WHERE c.school_id = p_school_id
          AND (p_term_id IS NULL OR c.term_id = p_term_id)
          AND (p_start_date IS NULL OR s.session_date >= p_start_date)
          AND (p_end_date IS NULL OR s.session_date <= p_end_date)
        GROUP BY c.id, c.name, sub.name, c.homeroom_id
        ORDER BY c.name ASC
        LIMIT COALESCE(p_limit, 50)
        OFFSET v_offset
    ) class_row;

    RETURN jsonb_build_object(
        'school_id', p_school_id,
        'term_id', p_term_id,
        'summary', jsonb_build_object(
            'total_records', v_total_records,
            'present_count', v_present,
            'absent_count', v_absent,
            'late_count', v_late,
            'excused_count', v_excused,
            'overall_attendance_rate', v_rate
        ),
        'pagination', jsonb_build_object(
            'page', COALESCE(p_page, 1),
            'limit', COALESCE(p_limit, 50),
            'total_classes', v_total_classes,
            'total_pages', CEIL(v_total_classes::NUMERIC / GREATEST(1, COALESCE(p_limit, 50))::NUMERIC)
        ),
        'classes', v_class_data
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_class_academic_summary(
    p_class_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_class RECORD;
    v_total_exam_subs BIGINT := 0;
    v_avg_exam_score NUMERIC := 0;
    v_highest_score NUMERIC := 0;
    v_lowest_score NUMERIC := 0;
    v_pass_count BIGINT := 0;
    v_fail_count BIGINT := 0;
    v_exam_summaries JSONB;
BEGIN
    SELECT c.*, sub.name AS subject_name 
    INTO v_class 
    FROM public.classes c
    LEFT JOIN public.subjects sub ON sub.id = c.subject_id
    WHERE c.id = p_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CLASS_NOT_FOUND';
    END IF;

    SELECT 
        COUNT(s.id),
        COALESCE(ROUND(AVG(s.score), 2), 0),
        COALESCE(MAX(s.score), 0),
        COALESCE(MIN(s.score), 0),
        COUNT(s.id) FILTER (WHERE s.score >= (s.total_points * 0.5)),
        COUNT(s.id) FILTER (WHERE s.score < (s.total_points * 0.5))
    INTO 
        v_total_exam_subs,
        v_avg_exam_score,
        v_highest_score,
        v_lowest_score,
        v_pass_count,
        v_fail_count
    FROM public.exam_submissions s
    JOIN public.exams e ON e.id = s.exam_id
    WHERE e.class_id = p_class_id
      AND s.grading_status = 'published';

    SELECT COALESCE(jsonb_agg(exam_row), '[]'::jsonb)
    INTO v_exam_summaries
    FROM (
        SELECT 
            e.id AS exam_id,
            e.title,
            e.total_points,
            e.publication_status,
            COUNT(s.id) FILTER (WHERE s.grading_status = 'published') AS published_submissions,
            COUNT(s.id) FILTER (WHERE s.grading_status IN ('draft', 'ungraded', 'pending')) AS pending_submissions,
            COALESCE(ROUND(AVG(s.score) FILTER (WHERE s.grading_status = 'published'), 2), 0) AS avg_score
        FROM public.exams e
        LEFT JOIN public.exam_submissions s ON s.exam_id = e.id
        WHERE e.class_id = p_class_id
        GROUP BY e.id, e.title, e.total_points, e.publication_status
        ORDER BY e.created_at DESC
    ) exam_row;

    RETURN jsonb_build_object(
        'class_id', p_class_id,
        'class_name', v_class.name,
        'subject', v_class.subject_name,
        'summary', jsonb_build_object(
            'total_published_submissions', v_total_exam_subs,
            'average_score', v_avg_exam_score,
            'highest_score', v_highest_score,
            'lowest_score', v_lowest_score,
            'pass_count', v_pass_count,
            'fail_count', v_fail_count
        ),
        'exams', v_exam_summaries
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_homeroom_student_overview(
    p_homeroom_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_homeroom RECORD;
    v_students JSONB;
BEGIN
    SELECT h.*, gl.name AS grade_level_name 
    INTO v_homeroom 
    FROM public.homerooms h
    LEFT JOIN public.grade_levels gl ON gl.id = h.grade_level_id
    WHERE h.id = p_homeroom_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'HOMEROOM_NOT_FOUND';
    END IF;

    SELECT COALESCE(jsonb_agg(student_row), '[]'::jsonb)
    INTO v_students
    FROM (
        SELECT 
            u.id AS student_id,
            u.full_name AS student_name,
            u.email AS student_email,
            si.student_code,
            -- Chuyên cần từ attendance_records
            COALESCE((
                SELECT COUNT(*) FROM public.attendance_records ar 
                WHERE ar.student_id = u.id AND ar.status = 'absent'
            ), 0) AS unexcused_absences,
            COALESCE((
                SELECT COUNT(*) FROM public.attendance_records ar 
                WHERE ar.student_id = u.id AND ar.status = 'excused'
            ), 0) AS excused_absences,
            COALESCE((
                SELECT COUNT(*) FROM public.attendance_records ar 
                WHERE ar.student_id = u.id AND ar.status = 'late'
            ), 0) AS late_count,
            -- Điểm kiểm tra trung bình (chỉ tính điểm đã công bố)
            (
                SELECT ROUND(AVG(es.score), 2) FROM public.exam_submissions es 
                WHERE es.student_id = u.id AND es.grading_status = 'published'
            ) AS avg_published_exam_score,
            -- Số ca can thiệp sớm đang mở
            COALESCE((
                SELECT COUNT(*) FROM public.intervention_cases ic 
                WHERE ic.student_id = u.id AND ic.status IN ('open', 'in_progress')
            ), 0) AS active_interventions_count
        FROM public.homeroom_enrollments he
        JOIN public.users u ON u.id = he.student_id
        LEFT JOIN public.student_identifiers si ON si.user_id = u.id AND si.school_id = he.school_id
        WHERE he.homeroom_id = p_homeroom_id
          AND he.status = 'active'
        ORDER BY u.full_name ASC
    ) student_row;

    RETURN jsonb_build_object(
        'homeroom_id', p_homeroom_id,
        'homeroom_name', v_homeroom.name,
        'grade_level', v_homeroom.grade_level_name,
        'students', v_students
    );
END;
$$;

-- Phân quyền RLS và EXECUTE cho Phase 4 & 5
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'exam_attempts', 'grade_audit', 'rubrics', 'rubric_criteria', 'score_adjustments',
        'attendance_policies', 'intervention_cases', 'intervention_actions'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
            EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
        END IF;
    END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.submit_learning_exam(uuid, uuid, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_learning_grade(uuid, uuid, numeric, text, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_school_attendance_summary(UUID, UUID, DATE, DATE, INT, INT) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_class_academic_summary(UUID) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_homeroom_student_overview(UUID) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_learning_exam(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_learning_grade(uuid, uuid, numeric, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_school_attendance_summary(UUID, UUID, DATE, DATE, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_class_academic_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_homeroom_student_overview(UUID) TO service_role;

COMMIT;
