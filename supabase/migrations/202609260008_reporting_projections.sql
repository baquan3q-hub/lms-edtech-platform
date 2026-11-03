-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M8: REPORTING PROJECTIONS & RECONCILIATION RPCS
-- File: supabase/migrations/202609260008_reporting_projections.sql
-- Mục đích:
--   1. RPC get_school_attendance_summary: Báo cáo chuyên cần đối soát được 100%
--   2. RPC get_class_academic_summary: Tổng hợp học lực theo lớp từ điểm công bố
--   3. RPC get_homeroom_student_overview: Báo cáo chủ nhiệm chi tiết từng học sinh
-- =========================================================================

BEGIN;

-- 1. RPC TỔNG HỢP CHUYÊN CẦN TOÀN TRƯỜNG / HỌC KỲ CÓ PHÂN TRANG
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
    -- 1.1 Tính toán tổng hợp toàn trường từ dữ liệu gốc attendance_records
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

    -- 1.2 Đếm tổng số lớp có dữ liệu điểm danh thỏa mãn bộ lọc
    SELECT COUNT(DISTINCT c.id)
    INTO v_total_classes
    FROM public.classes c
    JOIN public.attendance_sessions s ON s.class_id = c.id
    WHERE c.school_id = p_school_id
      AND (p_term_id IS NULL OR c.term_id = p_term_id)
      AND (p_start_date IS NULL OR s.session_date >= p_start_date)
      AND (p_end_date IS NULL OR s.session_date <= p_end_date);

    -- 1.3 Lấy danh sách tổng hợp từng lớp có phân trang
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

-- 2. RPC TỔNG HỢP KẾT QUẢ HỌC LỰC THEO LỚP HỌC (CHỈ TÍNH ĐIỂM ĐÃ CÔNG BỐ)
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

    -- Thống kê các bài nộp kiểm tra đã công bố
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

    -- Thống kê theo từng bài kiểm tra trong lớp
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

-- 3. RPC BÁO CÁO TỔNG QUAN HỌC SINH LỚP CHỦ NHIỆM
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

-- 4. PHÂN QUYỀN
REVOKE ALL ON FUNCTION public.get_school_attendance_summary(UUID, UUID, DATE, DATE, INT, INT) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_class_academic_summary(UUID) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_homeroom_student_overview(UUID) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_school_attendance_summary(UUID, UUID, DATE, DATE, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_class_academic_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_homeroom_student_overview(UUID) TO service_role;

COMMIT;
