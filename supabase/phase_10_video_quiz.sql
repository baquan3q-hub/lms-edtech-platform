-- ==========================================
-- PHASE 10: VIDEO UPLOAD & QUIZ BUILDER
-- ==========================================

-- 1. Thêm cột quiz_data vào item_contents để lưu câu hỏi trắc nghiệm dạng JSON
-- (thay vì dùng bảng quiz_questions riêng, giúp đơn giản hóa thao tác CRUD trong 1 lần save)
ALTER TABLE public.item_contents
ADD COLUMN IF NOT EXISTS quiz_data JSONB;

-- 2. Tạo Supabase Storage bucket cho video
-- (Chạy trong SQL Editor hoặc tạo thủ công qua Dashboard > Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true,
    524288000,  -- 500MB
    ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy cho phép mọi authenticated user upload video
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos');

-- 4. Policy cho phép đọc public
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'videos');

-- 5. Policy cho phép update/delete cho authenticated users
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
CREATE POLICY "Allow authenticated update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'videos');
