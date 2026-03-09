-- HOMEWORK SYSTEM: Bài tập về nhà
-- Hỗ trợ 4 dạng: trắc nghiệm, tự luận, video, đính kèm link/file + minh chứng
-- Chạy trong Supabase SQL Editor

-- 1. Bảng homework (Bài tập do giáo viên tạo)
CREATE TABLE IF NOT EXISTS homework (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    -- questions: JSONB array, mỗi phần tử có dạng:
    -- { id, type: 'multiple_choice'|'essay'|'video'|'attachment',
    --   question: string, points: number,
    --   options?: [{id, text, isCorrect}],      (cho multiple_choice)
    --   instructions?: string,                   (cho essay/video/attachment)
    --   attachment_url?: string                   (link/file giáo viên đính kèm)
    -- }
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_points INTEGER DEFAULT 0,
    due_date TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng homework_submissions (Bài nộp của học sinh)
CREATE TABLE IF NOT EXISTS homework_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    -- answers: JSONB array tương ứng questions, mỗi phần tử:
    -- { question_id: string,
    --   type: 'multiple_choice'|'essay'|'video'|'attachment',
    --   selected_option_id?: string,           (multiple_choice)
    --   essay_text?: string,                   (tự luận)
    --   video_url?: string,                    (video)
    --   attachment_url?: string,               (link file)
    --   proof_image_url?: string               (ảnh minh chứng cho attachment)
    -- }
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    score NUMERIC,
    feedback TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES users(id),
    UNIQUE(homework_id, student_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_homework_class_id ON homework(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework_id ON homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON homework_submissions(student_id);

-- Tắt RLS (admin client sử dụng service_role key đã bypass)
ALTER TABLE homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions DISABLE ROW LEVEL SECURITY;
