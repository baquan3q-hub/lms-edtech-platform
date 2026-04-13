-- ================================================================
-- Phase 30: Survey System — Khảo sát
-- ================================================================

-- 1. Bảng khảo sát chính
CREATE TABLE IF NOT EXISTS surveys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    description     TEXT,
    -- Phạm vi: 'system' (toàn hệ thống), 'course' (khóa học), 'class' (lớp)
    scope           TEXT NOT NULL DEFAULT 'class' CHECK (scope IN ('system', 'course', 'class')),
    course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
    class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_role TEXT NOT NULL DEFAULT 'admin', -- 'admin' | 'teacher'
    is_active       BOOLEAN DEFAULT true,
    deadline        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Câu hỏi khảo sát
CREATE TABLE IF NOT EXISTS survey_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    -- Loại: 'single_choice', 'multiple_choice', 'text', 'rating'
    question_type   TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'text', 'rating')),
    options         JSONB DEFAULT '[]', -- ["Lựa chọn A", "Lựa chọn B", ...]
    is_required     BOOLEAN DEFAULT true,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Câu trả lời khảo sát
CREATE TABLE IF NOT EXISTS survey_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Trả lời: {"selected": ["A"], "text": "...", "rating": 5}
    answer          JSONB NOT NULL DEFAULT '{}',
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, user_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_surveys_scope ON surveys(scope);
CREATE INDEX IF NOT EXISTS idx_surveys_course ON surveys(course_id);
CREATE INDEX IF NOT EXISTS idx_surveys_class ON surveys(class_id);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON surveys(created_by);
CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON survey_questions(sort_order);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_question ON survey_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id);

-- 5. RLS Policies
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- === SURVEYS ===
-- Admin full access
DROP POLICY IF EXISTS "admin_full_access_surveys" ON surveys;
CREATE POLICY "admin_full_access_surveys" ON surveys
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Teacher: quản lý survey mình tạo
DROP POLICY IF EXISTS "teacher_manage_own_surveys" ON surveys;
CREATE POLICY "teacher_manage_own_surveys" ON surveys
FOR ALL USING (
    created_by = auth.uid()
);

-- Student/Parent: xem survey active
DROP POLICY IF EXISTS "users_view_active_surveys" ON surveys;
CREATE POLICY "users_view_active_surveys" ON surveys
FOR SELECT USING (
    is_active = true
);

-- === SURVEY QUESTIONS ===
-- Admin full access
DROP POLICY IF EXISTS "admin_full_access_survey_questions" ON survey_questions;
CREATE POLICY "admin_full_access_survey_questions" ON survey_questions
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Teacher: quản lý câu hỏi survey mình tạo
DROP POLICY IF EXISTS "teacher_manage_own_questions" ON survey_questions;
CREATE POLICY "teacher_manage_own_questions" ON survey_questions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = survey_questions.survey_id
        AND surveys.created_by = auth.uid()
    )
);

-- Users: xem câu hỏi survey active
DROP POLICY IF EXISTS "users_view_active_questions" ON survey_questions;
CREATE POLICY "users_view_active_questions" ON survey_questions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = survey_questions.survey_id
        AND surveys.is_active = true
    )
);

-- === SURVEY RESPONSES ===
-- Admin: xem tất cả
DROP POLICY IF EXISTS "admin_full_access_responses" ON survey_responses;
CREATE POLICY "admin_full_access_responses" ON survey_responses
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Teacher: xem responses survey mình tạo
DROP POLICY IF EXISTS "teacher_view_own_survey_responses" ON survey_responses;
CREATE POLICY "teacher_view_own_survey_responses" ON survey_responses
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = survey_responses.survey_id
        AND surveys.created_by = auth.uid()
    )
);

-- Users: tạo và xem response của mình
DROP POLICY IF EXISTS "users_manage_own_responses" ON survey_responses;
CREATE POLICY "users_manage_own_responses" ON survey_responses
FOR ALL USING (
    user_id = auth.uid()
);

-- 6. Enable Realtime
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE surveys; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE survey_responses; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
