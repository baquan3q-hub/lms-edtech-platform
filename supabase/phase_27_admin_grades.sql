-- ================================================================
-- Phase 27: Admin Grade Management — Views & Indexes
-- ================================================================

-- VIEW: Tổng hợp điểm số theo từng học sinh + lớp
-- Aggregates exam, homework scores per student per class
CREATE OR REPLACE VIEW admin_student_grade_summary AS
SELECT 
    e.student_id,
    u.full_name as student_name,
    u.email as student_email,
    c.id as class_id,
    c.name as class_name,
    co.id as course_id,
    co.name as course_name,
    -- Exam stats
    COUNT(DISTINCT es.id) as exam_submission_count,
    COALESCE(AVG(es.score), 0) as avg_exam_score,
    COALESCE(MAX(es.score), 0) as max_exam_score,
    COALESCE(MIN(CASE WHEN es.score IS NOT NULL THEN es.score END), 0) as min_exam_score,
    -- Homework stats  
    COUNT(DISTINCT hs.id) as homework_submission_count,
    COALESCE(AVG(CASE WHEN hs.status = 'graded' THEN hs.score END), 0) as avg_homework_score,
    -- Overall
    COALESCE(
        (COALESCE(AVG(es.score), 0) + COALESCE(AVG(CASE WHEN hs.status = 'graded' THEN hs.score END), 0)) / 
        NULLIF(
            (CASE WHEN AVG(es.score) IS NOT NULL THEN 1 ELSE 0 END) + 
            (CASE WHEN AVG(CASE WHEN hs.status = 'graded' THEN hs.score END) IS NOT NULL THEN 1 ELSE 0 END),
            0
        ),
        0
    ) as overall_avg_score,
    e.enrolled_at
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN classes c ON c.id = e.class_id
JOIN courses co ON co.id = c.course_id
LEFT JOIN exams ex ON ex.class_id = c.id
LEFT JOIN exam_submissions es ON es.student_id = e.student_id AND es.exam_id = ex.id
LEFT JOIN homework hw ON hw.class_id = c.id
LEFT JOIN homework_submissions hs ON hs.student_id = e.student_id AND hs.homework_id = hw.id
WHERE e.status = 'active'
GROUP BY e.student_id, u.full_name, u.email, c.id, c.name, co.id, co.name, e.enrolled_at;

-- Index hỗ trợ query nhanh
CREATE INDEX IF NOT EXISTS idx_exam_submissions_student_exam ON exam_submissions(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_hw ON homework_submissions(student_id, homework_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_status ON enrollments(class_id, status);
