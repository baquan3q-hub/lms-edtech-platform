-- ================================================================
-- Phase 31: Teacher Feedback Hub
-- ================================================================

-- 1. Thêm cột target_teacher_id và class_id vào user_feedback
ALTER TABLE user_feedback
  ADD COLUMN IF NOT EXISTS target_teacher_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_feedback_teacher ON user_feedback(target_teacher_id);

-- 2. Cập nhật RLS: Cho phép teacher view các feedback có target_teacher_id là mình
DROP POLICY IF EXISTS "teacher_view_targeted_feedback" ON user_feedback;
CREATE POLICY "teacher_view_targeted_feedback" ON user_feedback
FOR SELECT USING (
  target_teacher_id = auth.uid()
);

-- Teacher update: được phép thêm reply nhưng chỉ đối với feedback của mình
DROP POLICY IF EXISTS "teacher_update_targeted_feedback" ON user_feedback;
CREATE POLICY "teacher_update_targeted_feedback" ON user_feedback
FOR UPDATE USING (
  target_teacher_id = auth.uid()
);

DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE user_feedback; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
