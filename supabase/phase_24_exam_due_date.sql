-- PHASE 24: EXAM DUE DATE

-- 1. Thêm cột due_date vào bảng exams (deadline/hạn chót)
ALTER TABLE exams  COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
