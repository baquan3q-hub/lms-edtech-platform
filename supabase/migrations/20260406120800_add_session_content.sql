-- Bổ sung trường quản lý nội dung bài học theo phân quyền Giáo Viên
-- Admin xếp lịch rỗng, GV sẽ vào điền

ALTER TABLE public.class_sessions
ADD COLUMN IF NOT EXISTS lesson_title TEXT,
ADD COLUMN IF NOT EXISTS lesson_content TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
