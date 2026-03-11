-- ============================================================
-- AI Quiz Analysis — 3 bảng phân tích bài kiểm tra
-- ============================================================

-- 1. Phân tích tổng thể lớp
CREATE TABLE IF NOT EXISTS quiz_class_analysis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id           uuid REFERENCES exams(id) ON DELETE CASCADE,
  class_id          uuid REFERENCES classes(id),
  teacher_id        uuid REFERENCES users(id),
  total_submissions integer DEFAULT 0,
  avg_score         numeric(5,2),
  pass_count        integer DEFAULT 0,
  fail_count        integer DEFAULT 0,
  strengths         text[] DEFAULT '{}',
  weaknesses        text[] DEFAULT '{}',
  knowledge_gaps    jsonb DEFAULT '[]',
  question_stats    jsonb DEFAULT '{}',
  teaching_suggestions text[] DEFAULT '{}',
  score_distribution jsonb DEFAULT '{}',
  ai_summary        text,
  generated_at      timestamp DEFAULT now(),
  status            text DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','sent')),
  UNIQUE (exam_id)
);

-- 2. Phân tích cá nhân từng học sinh
CREATE TABLE IF NOT EXISTS quiz_individual_analysis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     uuid REFERENCES exam_submissions(id) ON DELETE CASCADE,
  student_id        uuid REFERENCES users(id),
  exam_id           uuid REFERENCES exams(id),
  knowledge_gaps    text[] DEFAULT '{}',
  wrong_questions   jsonb DEFAULT '[]',
  ai_feedback       text,
  improvement_tasks jsonb DEFAULT '[]',
  teacher_edited_feedback text,
  teacher_edited_tasks    jsonb,
  status            text DEFAULT 'ai_draft'
    CHECK (status IN ('ai_draft','approved','edited','sent')),
  sent_at           timestamp,
  deadline          timestamp,
  created_at        timestamp DEFAULT now(),
  UNIQUE (submission_id)
);

-- 3. Tiến độ bài tập cải thiện
CREATE TABLE IF NOT EXISTS improvement_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       uuid REFERENCES quiz_individual_analysis(id) ON DELETE CASCADE,
  student_id        uuid REFERENCES users(id),
  task_index        integer NOT NULL,
  status            text DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed')),
  quiz_score        integer,
  quiz_total        integer,
  quiz_answers      jsonb DEFAULT '{}',
  completed_at      timestamp,
  UNIQUE (analysis_id, task_index)
);

-- 4. Bài bổ trợ (GV gửi cho HS — hỗ trợ MCQ + Tự luận)
CREATE TABLE IF NOT EXISTS supplementary_quizzes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       uuid REFERENCES quiz_individual_analysis(id) ON DELETE CASCADE,
  exam_id           uuid REFERENCES exams(id),
  student_id        uuid REFERENCES users(id),
  teacher_id        uuid REFERENCES users(id),
  title             text NOT NULL,
  questions         jsonb NOT NULL DEFAULT '[]',
  total_questions   integer NOT NULL DEFAULT 0,
  student_answers   jsonb DEFAULT '{}',
  essay_answers     jsonb DEFAULT '{}',
  score             integer,
  status            text DEFAULT 'draft'
    CHECK (status IN ('draft','pending','completed')),
  sent_at           timestamp,
  completed_at      timestamp,
  created_at        timestamp DEFAULT NOW()
);
