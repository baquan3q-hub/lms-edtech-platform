-- ============================================================
-- FEATURE 5 UPDATES — Migration Database
-- 1. Nâng cấp bảng announcements (multi-file + quiz + target)
-- 2. Tạo bảng user_feedback
-- 3. Tạo bảng improvement_quiz_results
-- 4. Thêm metadata vào notifications
-- ============================================================

-- ============================================================
-- PHẦN 1 — Nâng cấp bảng announcements
-- ============================================================
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS quiz_id uuid,
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{student,parent}',
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamp;

-- Thêm FK cho quiz_id → exams (dùng exams thay vì assignments vì hệ thống quiz dùng bảng exams)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'announcements_quiz_id_fkey'
    AND table_name = 'announcements'
  ) THEN
    ALTER TABLE announcements
      ADD CONSTRAINT announcements_quiz_id_fkey
      FOREIGN KEY (quiz_id) REFERENCES exams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index cho announcements mới
CREATE INDEX IF NOT EXISTS idx_announcements_class_id ON announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned ON announcements(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- ============================================================
-- PHẦN 2 — Tạo bảng user_feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS user_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('student','parent')),
  type        text NOT NULL CHECK (type IN ('bug','suggestion','complaint','praise')),
  title       text NOT NULL,
  content     text NOT NULL,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','closed')),
  admin_reply text,
  created_at  timestamp DEFAULT now(),
  resolved_at timestamp
);

-- Indexes cho user_feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- RLS cho user_feedback
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "admin_full_access_user_feedback" ON user_feedback;
CREATE POLICY "admin_full_access_user_feedback" ON user_feedback
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- User chỉ INSERT + SELECT feedback của bản thân
DROP POLICY IF EXISTS "user_insert_own_feedback" ON user_feedback;
CREATE POLICY "user_insert_own_feedback" ON user_feedback
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_select_own_feedback" ON user_feedback;
CREATE POLICY "user_select_own_feedback" ON user_feedback
FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- PHẦN 3 — Tạo bảng improvement_quiz_results
-- ============================================================
CREATE TABLE IF NOT EXISTS improvement_quiz_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     uuid REFERENCES quiz_individual_analysis(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES users(id),
  answers         jsonb DEFAULT '{}',
  score           integer DEFAULT 0,
  total           integer DEFAULT 0,
  percentage      numeric(5,2) DEFAULT 0,
  submitted_at    timestamp DEFAULT now(),
  UNIQUE (analysis_id, student_id)
);

-- Indexes cho improvement_quiz_results
CREATE INDEX IF NOT EXISTS idx_improvement_quiz_results_student ON improvement_quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_improvement_quiz_results_analysis ON improvement_quiz_results(analysis_id);

-- RLS cho improvement_quiz_results
ALTER TABLE improvement_quiz_results ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "admin_full_access_improvement_quiz" ON improvement_quiz_results;
CREATE POLICY "admin_full_access_improvement_quiz" ON improvement_quiz_results
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Student INSERT + SELECT của bản thân
DROP POLICY IF EXISTS "student_insert_own_quiz_results" ON improvement_quiz_results;
CREATE POLICY "student_insert_own_quiz_results" ON improvement_quiz_results
FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_select_own_quiz_results" ON improvement_quiz_results;
CREATE POLICY "student_select_own_quiz_results" ON improvement_quiz_results
FOR SELECT USING (student_id = auth.uid());

-- Teacher SELECT của học sinh trong lớp mình
DROP POLICY IF EXISTS "teacher_select_class_quiz_results" ON improvement_quiz_results;
CREATE POLICY "teacher_select_class_quiz_results" ON improvement_quiz_results
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'teacher'
  )
  AND EXISTS (
    SELECT 1 FROM quiz_individual_analysis qia
    JOIN exams ex ON qia.exam_id = ex.id
    JOIN classes c ON ex.class_id = c.id
    WHERE qia.id = improvement_quiz_results.analysis_id
    AND c.teacher_id = auth.uid()
  )
);

-- ============================================================
-- PHẦN 4 — Thêm metadata vào notifications
-- ============================================================
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- ============================================================
-- PHẦN 5 — RLS: Parent xem announcements của lớp con
-- ============================================================
DROP POLICY IF EXISTS "parent_view_class_announcements" ON announcements;
CREATE POLICY "parent_view_class_announcements" ON announcements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parent_students ps
    JOIN enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid()
    AND e.class_id = announcements.class_id
  )
  AND 'parent' = ANY(target_roles)
);
