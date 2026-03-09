-- STORAGE SETUP: Tạo buckets và policies cho upload video & file
-- Chạy trong Supabase SQL Editor

-- ============================================================
-- 1. Tạo Storage Buckets
-- ============================================================

-- Bucket cho video bài giảng (public, 500MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lesson-videos',
    'lesson-videos',
    true,
    524288000, -- 500MB
    ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket cho file tài liệu (public, 100MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lesson-files',
    'lesson-files',
    true,
    104857600, -- 100MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'image/jpeg',
        'image/png',
        'image/gif'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. Storage Policies — lesson-videos
-- ============================================================

-- Authenticated users can read (xem video)
DROP POLICY IF EXISTS "lesson-videos: Authenticated Read" ON storage.objects;
CREATE POLICY "lesson-videos: Authenticated Read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lesson-videos');

-- Authenticated users can upload (teacher upload)
DROP POLICY IF EXISTS "lesson-videos: Authenticated Upload" ON storage.objects;
CREATE POLICY "lesson-videos: Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-videos');

-- Owner can update their files
DROP POLICY IF EXISTS "lesson-videos: Owner Update" ON storage.objects;
CREATE POLICY "lesson-videos: Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-videos');

-- Owner can delete their files
DROP POLICY IF EXISTS "lesson-videos: Owner Delete" ON storage.objects;
CREATE POLICY "lesson-videos: Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-videos');

-- Public read (vì bucket public)
DROP POLICY IF EXISTS "lesson-videos: Public Read" ON storage.objects;
CREATE POLICY "lesson-videos: Public Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-videos');

-- ============================================================
-- 3. Storage Policies — lesson-files
-- ============================================================

-- Authenticated users can read
DROP POLICY IF EXISTS "lesson-files: Authenticated Read" ON storage.objects;
CREATE POLICY "lesson-files: Authenticated Read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lesson-files');

-- Authenticated users can upload
DROP POLICY IF EXISTS "lesson-files: Authenticated Upload" ON storage.objects;
CREATE POLICY "lesson-files: Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-files');

-- Owner can update
DROP POLICY IF EXISTS "lesson-files: Owner Update" ON storage.objects;
CREATE POLICY "lesson-files: Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-files');

-- Owner can delete
DROP POLICY IF EXISTS "lesson-files: Owner Delete" ON storage.objects;
CREATE POLICY "lesson-files: Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-files');

-- Public read
DROP POLICY IF EXISTS "lesson-files: Public Read" ON storage.objects;
CREATE POLICY "lesson-files: Public Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-files');
