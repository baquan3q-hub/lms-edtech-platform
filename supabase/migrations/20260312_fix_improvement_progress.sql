-- ============================================================
-- FIX: Thêm cột thiếu vào bảng improvement_progress
-- Nguyên nhân: migration gốc có thể đã chạy trước khi thêm các cột này
-- ============================================================

ALTER TABLE improvement_progress ADD COLUMN IF NOT EXISTS quiz_score integer;
ALTER TABLE improvement_progress ADD COLUMN IF NOT EXISTS quiz_total integer;
ALTER TABLE improvement_progress ADD COLUMN IF NOT EXISTS quiz_answers jsonb DEFAULT '{}';
ALTER TABLE improvement_progress ADD COLUMN IF NOT EXISTS completed_at timestamp;

-- Thêm cột advancement_suggestion cho học sinh điểm cao
ALTER TABLE quiz_individual_analysis ADD COLUMN IF NOT EXISTS advancement_suggestion text;
