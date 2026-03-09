-- Script SQL tạo Hierarchy Chương và Bài học cho Khóa học

-- 1. Tạo bảng class_sections (Chương/Phần/Thư mục)
CREATE TABLE IF NOT EXISTS public.class_sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho bảng class_sections
ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;

-- Policy (bỏ qua nếu query qua admin client, nhưng nên có cho Auth Role)
CREATE POLICY "Users có thể xem class_sections"
ON public.class_sections FOR SELECT
TO authenticated USING (true);

-- 2. Cập nhật bảng lessons
-- Thêm cột section_id (Có thể NULL nếu đó là bài học độc lập nằm ngoài Thư mục)
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.class_sections(id) ON DELETE CASCADE;

-- Thêm thuộc tính lesson_type để phân biệt loại hiển thị (video, document, quiz)
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'video';
