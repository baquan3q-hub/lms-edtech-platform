-- Cập nhật bảng announcements để hỗ trợ nhiều file đính kèm, quiz, ghim và vai trò
ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_roles JSONB DEFAULT '["student", "parent"]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Cập nhật realtime cho bảng announcements nếu chưa có
alter publication supabase_realtime add table public.announcements;
