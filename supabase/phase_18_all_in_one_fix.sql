-- ==============================================================================
-- BẢN SỬA LỖI TỔNG HỢP (ALL-IN-ONE FIX MIGRATION)
-- CHẠY FILE NÀY TRONG SUPABASE SQL EDITOR ĐỂ SỬA LỖI LƯU BÀI GIẢNG VÀ UPLOAD
-- ==============================================================================

-- 1. ĐẢM BẢO BẢNG course_items TỒN TẠI VÀ CHUẨN
CREATE TABLE IF NOT EXISTS public.course_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.course_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ĐẢM BẢO BẢNG item_contents TỒN TẠI MÀ KHÔNG BỊ RLS CHẶN GHI TỪ SERVER
CREATE TABLE IF NOT EXISTS public.item_contents (
    item_id UUID PRIMARY KEY REFERENCES public.course_items(id) ON DELETE CASCADE,
    content TEXT,
    video_url TEXT,
    file_url TEXT,
    zoom_link TEXT,
    deadline TIMESTAMPTZ,
    min_score NUMERIC,
    max_attempts INTEGER,
    score_method TEXT DEFAULT 'highest',
    quiz_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tắt RLS để Server Action CÓ THỂ GHI TỰ DO (Admin Client bypass được, nhưng bước này cho chắc ăn)
ALTER TABLE public.item_contents DISABLE ROW LEVEL SECURITY;

-- Cố gắng thêm cột quiz_data nếu bảng đã có nhưng thiếu cột này
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.item_contents ADD COLUMN quiz_data JSONB;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;


-- ==============================================================================
-- 3. ĐẢM BẢO BUCKET LƯU TRỮ VÀ QUYỀN UPLOAD HOẠT ĐỘNG
-- ==============================================================================

-- Xóa bucket cũ nếu bị lỗi cấu hình (Cẩn thận: sẽ mất file đã up trước đó, nhưng đằng nào cũng đang lỗi)
-- Bỏ comment dòng dưới nếu muốn reset hoàn toàn:
-- DELETE FROM storage.buckets WHERE id IN ('lesson-videos', 'lesson-files');

-- Cài đặt bucket cho Video
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-videos', 
  'lesson-videos', 
  true, 
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg']
) ON CONFLICT (id) DO UPDATE SET 
  public = true, 
  file_size_limit = 524288000, 
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/ogg'];

-- Cài đặt bucket cho Tài liệu (File PDF, Word, Excel, PPT)
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
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-rar-compressed'
  ]
) ON CONFLICT (id) DO UPDATE SET 
  public = true, 
  file_size_limit = 104857600;

-- ==============================================================================
-- 4. CHÍNH SÁCH BẢO MẬT (POLICIES) CHO STORAGE ĐỂ GIÁO VIÊN ĐƯỢC UPLOAD
-- ==============================================================================

-- Bỏ các policy cũ nếu có để tránh trùng
DROP POLICY IF EXISTS "Cho phép mọi người xem video" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép user đăng nhập upload video" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép user đăng nhập quản lý video của họ" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép mọi người xem tài liệu" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép user đăng nhập upload tài liệu" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép user đăng nhập quản lý tài liệu của họ" ON storage.objects;

-- Tạo lại Policy chuần
-- 1. Ai cũng có thể xem/tải (Vì bucket là Public)
CREATE POLICY "Public Access" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id IN ('lesson-videos', 'lesson-files') );

-- 2. Chỉ người dùng đã đăng nhập (Giáo viên) mới được Upload
CREATE POLICY "Auth Upload" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK ( bucket_id IN ('lesson-videos', 'lesson-files') );

-- 3. Chỉ chủ sở hữu file mới được sửa/xóa
CREATE POLICY "Owner Edit" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING ( bucket_id IN ('lesson-videos', 'lesson-files') AND auth.uid() = owner );

CREATE POLICY "Owner Delete" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING ( bucket_id IN ('lesson-videos', 'lesson-files') AND auth.uid() = owner );
