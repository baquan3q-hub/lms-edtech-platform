-- ==========================================
-- NGÂN HÀNG TÀI LIỆU SỐ — RESOURCE BANK
-- Bảng lưu trữ tài nguyên giáo viên tạo sẵn
-- ==========================================

CREATE TABLE IF NOT EXISTS teacher_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('quiz','essay','document','video','file','link')),
    title TEXT NOT NULL,
    description TEXT,
    -- Nội dung tuỳ loại
    content JSONB DEFAULT '{}',       -- quiz: { questions: [...] }, essay: { prompt, instructions }
    file_url TEXT,                     -- document/file/video upload → Supabase Storage
    video_url TEXT,                    -- video link (YouTube, Vimeo) hoặc upload
    link_url TEXT,                     -- link tài liệu ngoài
    tags TEXT[] DEFAULT '{}',          -- gắn thẻ phân loại
    is_public BOOLEAN DEFAULT false,   -- giáo viên khác có thể dùng không
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index theo teacher_id và type để query nhanh
CREATE INDEX IF NOT EXISTS idx_teacher_resources_teacher ON teacher_resources(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_resources_type ON teacher_resources(type);
CREATE INDEX IF NOT EXISTS idx_teacher_resources_teacher_type ON teacher_resources(teacher_id, type);

-- Thêm cột resource_id vào bảng announcements để liên kết tài nguyên chia sẻ
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES teacher_resources(id) ON DELETE SET NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS resource_type TEXT; -- quiz, essay, document, video, file, link
