-- ================================================================
-- Phase 22: Data Flow Sync — Notifications metadata + Attendance Points
-- ================================================================

-- 1. Bổ sung cột metadata và type cho bảng notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS type text DEFAULT 'general';

-- Index cho query theo type
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);

-- ================================================================
-- 2. Bảng Điểm Chuyên Cần (Gamification)
-- ================================================================
CREATE TABLE IF NOT EXISTS attendance_points (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid REFERENCES users(id) ON DELETE CASCADE,
    class_id        uuid REFERENCES classes(id) ON DELETE CASCADE,
    session_id      uuid REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    points_earned   integer NOT NULL DEFAULT 0,
    reason          text NOT NULL,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_points_student ON attendance_points(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_points_class ON attendance_points(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_points_student_class ON attendance_points(student_id, class_id);

-- ================================================================
-- 3. Bảng Thành tựu / Huy hiệu Học sinh
-- ================================================================
CREATE TABLE IF NOT EXISTS student_achievements (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       uuid REFERENCES users(id) ON DELETE CASCADE,
    class_id         uuid REFERENCES classes(id) ON DELETE CASCADE,
    achievement_type text NOT NULL,
    earned_at        timestamptz DEFAULT now(),
    UNIQUE (student_id, class_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON student_achievements(student_id);

-- ================================================================
-- 4. View tổng điểm chuyên cần
-- ================================================================
CREATE OR REPLACE VIEW student_attendance_points_summary AS
SELECT
    student_id,
    class_id,
    SUM(points_earned) as total_points,
    COUNT(*) as total_sessions_rewarded
FROM attendance_points
GROUP BY student_id, class_id;

-- ================================================================
-- 5. RLS Policies
-- ================================================================

-- attendance_points
ALTER TABLE attendance_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_view_own_points" ON attendance_points;
CREATE POLICY "students_view_own_points" ON attendance_points
FOR SELECT USING (
    student_id = auth.uid()
);

DROP POLICY IF EXISTS "teachers_view_class_points" ON attendance_points;
CREATE POLICY "teachers_view_class_points" ON attendance_points
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = attendance_points.class_id
        AND classes.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "teachers_insert_points" ON attendance_points;
CREATE POLICY "teachers_insert_points" ON attendance_points
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = attendance_points.class_id
        AND classes.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "parents_view_children_points" ON attendance_points;
CREATE POLICY "parents_view_children_points" ON attendance_points
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM parent_students
        WHERE parent_students.student_id = attendance_points.student_id
        AND parent_students.parent_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "admin_full_access_points" ON attendance_points;
CREATE POLICY "admin_full_access_points" ON attendance_points
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- student_achievements
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_view_own_achievements" ON student_achievements;
CREATE POLICY "students_view_own_achievements" ON student_achievements
FOR SELECT USING (
    student_id = auth.uid()
);

DROP POLICY IF EXISTS "teachers_manage_achievements" ON student_achievements;
CREATE POLICY "teachers_manage_achievements" ON student_achievements
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = student_achievements.class_id
        AND classes.teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "parents_view_children_achievements" ON student_achievements;
CREATE POLICY "parents_view_children_achievements" ON student_achievements
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM parent_students
        WHERE parent_students.student_id = student_achievements.student_id
        AND parent_students.parent_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "admin_full_access_achievements" ON student_achievements;
CREATE POLICY "admin_full_access_achievements" ON student_achievements
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ================================================================
-- 6. Đăng ký Realtime cho các bảng mới
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_points;
ALTER PUBLICATION supabase_realtime ADD TABLE student_achievements;
