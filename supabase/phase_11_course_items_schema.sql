-- COMPREHENSIVE SQL: Tạo tất cả các bảng cần thiết cho LMS
-- Chạy trong Supabase SQL Editor

-- 1. Bảng course_items (Cấu trúc thư mục + bài học)
CREATE TABLE IF NOT EXISTS course_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES course_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng item_contents (Nội dung bài học: video, quiz, tài liệu)
CREATE TABLE IF NOT EXISTS item_contents (
    item_id UUID PRIMARY KEY REFERENCES course_items(id) ON DELETE CASCADE,
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

-- 3. Bảng student_progress (Tiến độ học tập)
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES course_items(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started',
    score NUMERIC,
    attempts INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE(student_id, item_id)
);

-- 4. Bảng quiz_attempts (Lịch sử nộp bài quiz)
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES course_items(id) ON DELETE CASCADE,
    answers JSONB,
    score NUMERIC,
    passed BOOLEAN,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Bảng attendance (Điểm danh)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT DEFAULT 'present',
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(class_id, student_id, date)
);

-- Tắt RLS cho tất cả bảng (Admin client dùng service_role key đã bypass RLS)
ALTER TABLE course_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

-- Thêm cột quiz_data nếu bảng item_contents đã tồn tại nhưng thiếu cột
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE item_contents ADD COLUMN quiz_data JSONB;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;
