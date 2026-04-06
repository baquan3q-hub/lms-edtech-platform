-- =============================================
-- Migration: Thêm ngày bắt đầu/kết thúc cho lịch học cố định
-- và GV dạy thay cho buổi học
-- =============================================

-- 1. Thêm start_date, end_date vào class_schedules
ALTER TABLE class_schedules 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. Thêm substitute_teacher_id vào class_sessions (GV dạy thay)
ALTER TABLE class_sessions 
  ADD COLUMN IF NOT EXISTS substitute_teacher_id UUID REFERENCES users(id);

-- 3. Index cho performance khi query class_sessions theo ngày
CREATE INDEX IF NOT EXISTS idx_class_sessions_class_date 
  ON class_sessions(class_id, session_date);

CREATE INDEX IF NOT EXISTS idx_class_sessions_date 
  ON class_sessions(session_date);

-- 4. Comment giải thích
COMMENT ON COLUMN class_schedules.start_date IS 'Ngày bắt đầu áp dụng lịch cố định';
COMMENT ON COLUMN class_schedules.end_date IS 'Ngày kết thúc lịch cố định';
COMMENT ON COLUMN class_sessions.substitute_teacher_id IS 'GV dạy thay khi GV chính nghỉ';
