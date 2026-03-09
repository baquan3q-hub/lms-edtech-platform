-- ==========================================
-- TẠO STORAGE BUCKETS CHO VIDEO VÀ TÀI LIỆU
-- ==========================================

-- 1. Tạo Supabase Storage bucket cho video (NẾU CHƯA CÓ)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true,
    524288000,  -- 500MB
    ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Tạo Supabase Storage bucket cho tài liệu / audio (NẾU CHƯA CÓ)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'documents',
    'documents',
    true,
    104857600  -- 100MB
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- POLICIES CHO BUCKET "videos"
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated uploads to videos" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to videos" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');

DROP POLICY IF EXISTS "Allow public read from videos" ON storage.objects;
CREATE POLICY "Allow public read from videos" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "Allow authenticated delete from videos" ON storage.objects;
CREATE POLICY "Allow authenticated delete from videos" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "Allow authenticated update to videos" ON storage.objects;
CREATE POLICY "Allow authenticated update to videos" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'videos');

-- ==========================================
-- POLICIES CHO BUCKET "documents"
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow public read from documents" ON storage.objects;
CREATE POLICY "Allow public read from documents" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated delete from documents" ON storage.objects;
CREATE POLICY "Allow authenticated delete from documents" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated update to documents" ON storage.objects;
CREATE POLICY "Allow authenticated update to documents" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'documents');
