-- EXAM SYSTEM: Bài tập - Kiểm tra (tách biệt khỏi quiz trong bài học)
-- Chạy trong Supabase SQL Editor

-- 1. Bảng exams (Đề kiểm tra do giáo viên tạo)
CREATE TABLE IF NOT EXISTS exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_minutes INTEGER DEFAULT 30,
    total_points INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng exam_submissions (Bài làm của học sinh)
CREATE TABLE IF NOT EXISTS exam_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    score NUMERIC DEFAULT 0,
    total_points NUMERIC DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INTEGER DEFAULT 0,
    UNIQUE(exam_id, student_id)
);

-- Tắt RLS (admin client sử dụng service_role key đã bypass)
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions DISABLE ROW LEVEL SECURITY;
