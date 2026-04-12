-- ================================================================
-- Phase 28: Student Reviews — Nhận xét từ Giáo viên
-- ================================================================

-- Bảng nhận xét học sinh (buổi / tuần / tháng / quý / khóa)
CREATE TABLE IF NOT EXISTS student_reviews (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id        uuid REFERENCES classes(id) ON DELETE CASCADE,
    student_id      uuid REFERENCES users(id) ON DELETE CASCADE,
    teacher_id      uuid REFERENCES users(id) ON DELETE CASCADE,
    
    -- Loại nhận xét: session (buổi), weekly (tuần), monthly (tháng), quarterly (quý), course_end (hết khóa)
    review_type     text NOT NULL CHECK (review_type IN ('session', 'weekly', 'monthly', 'quarterly', 'course_end')),
    
    -- Thời gian tham chiếu
    review_date     date NOT NULL,
    week_start      date,
    period_label    text,
    session_id      uuid REFERENCES class_sessions(id) ON DELETE SET NULL,
    
    -- Đánh giá nhanh bằng checkbox tags
    positive_tags   text[] DEFAULT '{}',
    improvement_tags text[] DEFAULT '{}',
    
    -- Nhận xét chi tiết
    teacher_comment text,
    
    -- Dữ liệu điểm số tổng hợp (cho báo cáo định kỳ)
    score_data      jsonb DEFAULT '{}',
    
    -- Trạng thái gửi tới phụ huynh
    is_sent         boolean DEFAULT false,
    sent_at         timestamptz,
    
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_reviews_class ON student_reviews(class_id);
CREATE INDEX IF NOT EXISTS idx_student_reviews_student ON student_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_student_reviews_teacher ON student_reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_reviews_type ON student_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_student_reviews_date ON student_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_student_reviews_sent ON student_reviews(is_sent);

-- ================================================================
-- RLS Policies
-- ================================================================
ALTER TABLE student_reviews ENABLE ROW LEVEL SECURITY;

-- Giáo viên: Quản lý nhận xét lớp mình dạy
DROP POLICY IF EXISTS "teachers_manage_reviews" ON student_reviews;
CREATE POLICY "teachers_manage_reviews" ON student_reviews
FOR ALL USING (
    teacher_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = student_reviews.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- Học sinh: Xem nhận xét của bản thân
DROP POLICY IF EXISTS "students_view_own_reviews" ON student_reviews;
CREATE POLICY "students_view_own_reviews" ON student_reviews
FOR SELECT USING (
    student_id = auth.uid() AND is_sent = true
);

-- Phụ huynh: Xem nhận xét con em (đã gửi)
DROP POLICY IF EXISTS "parents_view_children_reviews" ON student_reviews;
CREATE POLICY "parents_view_children_reviews" ON student_reviews
FOR SELECT USING (
    is_sent = true AND EXISTS (
        SELECT 1 FROM parent_students
        WHERE parent_students.student_id = student_reviews.student_id
        AND parent_students.parent_id = auth.uid()
    )
);

-- Admin: Full access
DROP POLICY IF EXISTS "admin_full_access_reviews" ON student_reviews;
CREATE POLICY "admin_full_access_reviews" ON student_reviews
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Đăng ký Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE student_reviews;
