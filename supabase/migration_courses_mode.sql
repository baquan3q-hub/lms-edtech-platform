-- ============================================================
-- SQL MIGRATION: Cập nhật bảng COURSES
-- Bỏ cột teacher_id (giáo viên quản lý ở cấp Lớp, không phải Khóa học)
-- Thêm cột mode: hình thức tổ chức (online / offline)
-- ============================================================
-- Hành động: Copy toàn bộ Script này dán vào SQL Editor trên Supabase Dashboard và bấm RUN.
-- ============================================================

-- 1. Bỏ cột teacher_id khỏi bảng courses
ALTER TABLE courses DROP COLUMN IF EXISTS teacher_id;

-- 2. Thêm cột mode (hình thức tổ chức)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'mode'
    ) THEN
        ALTER TABLE courses ADD COLUMN mode TEXT DEFAULT 'offline'
            CHECK (mode IN ('online', 'offline'));
    END IF;
END
$$;
