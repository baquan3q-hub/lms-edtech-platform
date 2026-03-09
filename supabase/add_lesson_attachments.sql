-- ============================================================
-- SCRIPT THÊM CỘT TÀI LIỆU ĐÍNH KÈM CHO MODULE BÀI GIẢNG
-- ============================================================
-- Hành động: Copy và chạy script này trong cửa sổ SQL Editor của Supabase
-- Tính năng: E-Learning (Quản lý nội dung học liệu đa phương tiện)

-- Thêm cột attachments (Lưu danh sách file PDF, Word, Link tham khảo...)
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
