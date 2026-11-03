-- =========================================================================
-- LMS K12 PLATFORM - SCHEMA BASELINE (M0)
-- Baseline phục hồi đầy đủ 63 bảng, 2 views, RPC functions, RLS & Storage
-- Nguồn: DB_SCHEMA_SNAPSHOT_2026-09-24 & Live Supabase PostgREST OpenAPI
-- Tạo ngày: 26/09/2026
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. HELPER & UTILITY FUNCTIONS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(target_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.classes c WHERE c.id = target_class_id AND c.teacher_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_student_in_class(target_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.enrollments e WHERE e.class_id = target_class_id AND e.student_id = auth.uid() AND e.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_all_students_stats(p_class_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.student_class_stats (
        student_id,
        class_id,
        attendance_rate,
        avg_homework_score,
        avg_exam_score,
        completion_rate,
        last_updated
    )
    SELECT
        e.student_id,
        e.class_id,
        0 as attendance_rate,
        0 as avg_homework_score,
        0 as avg_exam_score,
        0 as completion_rate,
        now() as last_updated
    FROM public.enrollments e
    WHERE e.class_id = p_class_id
    ON CONFLICT (student_id, class_id) DO UPDATE
    SET last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    seq INT;
    num TEXT;
BEGIN
    seq := floor(random() * 900000 + 100000)::INT;
    num := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || seq::TEXT;
    RETURN num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS VOID AS $$
BEGIN
    UPDATE public.invoices
    SET status = 'overdue'
    WHERE status = 'pending' AND due_date < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_page_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 2. CORE SCHEMA TABLES (63 TABLES)
-- =========================================================================

-- Table: public.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  invite_code TEXT,
  invite_code_expires_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

-- Table: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bio TEXT,
  date_of_birth DATE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  gender TEXT,
  phone_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  grade_level TEXT,
  school_name TEXT,
  subject_specialty TEXT,
  years_of_experience INTEGER,
  occupation TEXT,
  PRIMARY KEY (id)
);

-- Table: public.parent_students
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  relationship TEXT DEFAULT 'Phụ huynh',
  is_primary BOOLEAN DEFAULT true,
  PRIMARY KEY (id)
);

-- Table: public.courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  mode TEXT DEFAULT 'offline',
  PRIMARY KEY (id)
);

-- Table: public.classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  room TEXT,
  schedule JSONB,
  max_students INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  name TEXT,
  PRIMARY KEY (id)
);

-- Table: public.enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  PRIMARY KEY (id)
);

-- Table: public.absence_requests
CREATE TABLE IF NOT EXISTS public.absence_requests (
  id UUID DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  absence_date DATE NOT NULL,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.ai_analyses
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  type TEXT NOT NULL,
  result_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.announcement_reads
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

-- Table: public.announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resource_id UUID,
  resource_type TEXT,
  file_url TEXT,
  video_url TEXT,
  link_url TEXT,
  quiz_data JSONB,
  attachments JSONB,
  quiz_id UUID,
  target_roles JSONB,
  is_pinned BOOLEAN DEFAULT false,
  updated_at TIMESTAMP,
  scope TEXT DEFAULT 'class',
  course_id UUID,
  target_user_ids JSONB,
  created_by_role TEXT DEFAULT 'teacher',
  PRIMARY KEY (id)
);

-- Table: public.assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  lesson_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  ai_graded BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_strict_mode BOOLEAN DEFAULT false,
  strict_mode_limit INTEGER DEFAULT 0,
  show_answers BOOLEAN DEFAULT true,
  PRIMARY KEY (id)
);

-- Table: public.attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  status TEXT DEFAULT 'present',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.attendance_points
CREATE TABLE IF NOT EXISTS public.attendance_points (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID,
  class_id UUID,
  session_id UUID,
  points_earned INTEGER DEFAULT 0 NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.attendance_records
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  marked_by UUID,
  marked_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

-- Table: public.attendance_sessions
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  teacher_id UUID,
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT DEFAULT 'open',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.behavior_alerts
CREATE TABLE IF NOT EXISTS public.behavior_alerts (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'low',
  description TEXT NOT NULL,
  details_json JSONB,
  is_resolved BOOLEAN DEFAULT false,
  notified_teacher BOOLEAN DEFAULT false,
  notified_parent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.class_ai_reports
CREATE TABLE IF NOT EXISTS public.class_ai_reports (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID,
  teacher_id UUID,
  report_text TEXT NOT NULL,
  student_count INTEGER DEFAULT 0,
  class_avg NUMERIC,
  generated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.class_schedules
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  room_id UUID,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  note TEXT,
  start_date DATE,
  end_date DATE,
  PRIMARY KEY (id)
);

-- Table: public.class_sections
CREATE TABLE IF NOT EXISTS public.class_sections (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  title TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: public.class_sessions
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  session_number INTEGER NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  topic TEXT,
  description TEXT,
  materials_url JSONB,
  homework TEXT,
  status TEXT DEFAULT 'scheduled',
  cancel_reason TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  substitute_teacher_id UUID,
  teaching_status TEXT DEFAULT 'pending',
  actual_teacher_id UUID,
  taught_at TIMESTAMPTZ,
  is_makeup BOOLEAN DEFAULT false,
  original_session_id UUID,
  lesson_title TEXT,
  lesson_content TEXT,
  attachments JSONB,
  PRIMARY KEY (id)
);

-- Table: public.course_items
CREATE TABLE IF NOT EXISTS public.course_items (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  parent_id UUID,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  is_published BOOLEAN DEFAULT false,
  unlock_after UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.discussion_messages
CREATE TABLE IF NOT EXISTS public.discussion_messages (
  id UUID DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  class_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.exam_submissions
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID DEFAULT gen_random_uuid(),
  exam_id UUID,
  student_id UUID,
  answers JSONB NOT NULL,
  score NUMERIC DEFAULT 0,
  total_points NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_taken_seconds INTEGER DEFAULT 0,
  ai_insight TEXT,
  grading_status TEXT DEFAULT 'graded',
  PRIMARY KEY (id)
);

-- Table: public.exams
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  total_points INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  is_strict_mode BOOLEAN DEFAULT false,
  strict_mode_limit INTEGER DEFAULT 0,
  show_answers BOOLEAN DEFAULT true,
  PRIMARY KEY (id)
);

-- Table: public.fee_plans
CREATE TABLE IF NOT EXISTS public.fee_plans (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL,
  currency TEXT DEFAULT 'VND',
  due_date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.fee_schedules
CREATE TABLE IF NOT EXISTS public.fee_schedules (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID,
  amount BIGINT NOT NULL,
  day_of_month INTEGER DEFAULT 1,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.grade_notifications
CREATE TABLE IF NOT EXISTS public.grade_notifications (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  class_id UUID NOT NULL,
  type TEXT,
  period_label TEXT,
  summary_data JSONB,
  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

-- Table: public.grade_reports
CREATE TABLE IF NOT EXISTS public.grade_reports (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  period TEXT NOT NULL,
  report_json JSONB,
  sent_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

-- Table: public.homework
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  total_points INTEGER DEFAULT 0,
  due_date TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.homework_submissions
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id UUID DEFAULT gen_random_uuid(),
  homework_id UUID,
  student_id UUID,
  answers JSONB NOT NULL,
  score NUMERIC,
  feedback TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID,
  attempts INTEGER DEFAULT 1,
  attempt_history JSONB,
  PRIMARY KEY (id)
);

-- Table: public.improvement_progress
CREATE TABLE IF NOT EXISTS public.improvement_progress (
  id UUID DEFAULT gen_random_uuid(),
  analysis_id UUID,
  student_id UUID,
  task_index INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP,
  quiz_score INTEGER,
  quiz_total INTEGER,
  quiz_answers JSONB,
  PRIMARY KEY (id)
);

-- Table: public.improvement_quiz_results
CREATE TABLE IF NOT EXISTS public.improvement_quiz_results (
  id UUID DEFAULT gen_random_uuid(),
  analysis_id UUID,
  student_id UUID,
  answers JSONB,
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid(),
  fee_plan_id UUID,
  student_id UUID,
  class_id UUID,
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'unpaid',
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.item_contents
CREATE TABLE IF NOT EXISTS public.item_contents (
  id UUID DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  content TEXT,
  video_url TEXT,
  file_url TEXT,
  zoom_link TEXT,
  deadline TIMESTAMPTZ,
  max_attempts INTEGER,
  min_score NUMERIC,
  score_method TEXT,
  quiz_data JSONB,
  PRIMARY KEY (id)
);

-- Table: public.leave_requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  class_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.lessons
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  "order" INTEGER DEFAULT 0 NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  attachments JSONB,
  section_id UUID,
  lesson_type TEXT DEFAULT 'video',
  PRIMARY KEY (id)
);

-- Table: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB,
  link TEXT,
  PRIMARY KEY (id)
);

-- Table: public.payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid(),
  invoice_id UUID,
  user_id UUID,
  amount BIGINT NOT NULL,
  currency TEXT DEFAULT 'VND',
  provider TEXT NOT NULL,
  provider_txn_id TEXT,
  provider_order_id TEXT,
  status TEXT DEFAULT 'pending',
  raw_response JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  points INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: public.quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  item_id UUID NOT NULL,
  answers JSONB NOT NULL,
  score NUMERIC,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  passed BOOLEAN,
  PRIMARY KEY (id)
);

-- Table: public.quiz_class_analysis
CREATE TABLE IF NOT EXISTS public.quiz_class_analysis (
  id UUID DEFAULT gen_random_uuid(),
  exam_id UUID,
  class_id UUID,
  teacher_id UUID,
  total_submissions INTEGER DEFAULT 0,
  avg_score NUMERIC,
  pass_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  strengths JSONB,
  weaknesses JSONB,
  knowledge_gaps JSONB,
  question_stats JSONB,
  teaching_suggestions JSONB,
  score_distribution JSONB,
  ai_summary TEXT,
  generated_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'draft',
  PRIMARY KEY (id)
);

-- Table: public.quiz_individual_analysis
CREATE TABLE IF NOT EXISTS public.quiz_individual_analysis (
  id UUID DEFAULT gen_random_uuid(),
  submission_id UUID,
  student_id UUID,
  exam_id UUID,
  knowledge_gaps JSONB,
  wrong_questions JSONB,
  ai_feedback TEXT,
  improvement_tasks JSONB,
  teacher_edited_feedback TEXT,
  teacher_edited_tasks JSONB,
  status TEXT DEFAULT 'ai_draft',
  sent_at TIMESTAMP,
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  advancement_suggestion TEXT,
  PRIMARY KEY (id)
);

-- Table: public.quiz_questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  content TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_options JSONB NOT NULL,
  points NUMERIC DEFAULT 1,
  order_index INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (id)
);

-- Table: public.rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.student_achievements
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID,
  class_id UUID,
  achievement_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.student_activity_logs
CREATE TABLE IF NOT EXISTS public.student_activity_logs (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  context_type TEXT NOT NULL,
  context_id TEXT,
  class_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.student_behavior_scores
CREATE TABLE IF NOT EXISTS public.student_behavior_scores (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  period TEXT NOT NULL,
  avg_answer_speed_ms DOUBLE PRECISION DEFAULT 0,
  tab_switch_count INTEGER DEFAULT 0,
  total_active_time_s INTEGER DEFAULT 0,
  total_idle_time_s INTEGER DEFAULT 0,
  rapid_guess_count INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  gaming_score DOUBLE PRECISION DEFAULT 0,
  risk_level TEXT DEFAULT 'normal',
  ai_analysis_json JSONB,
  avg_score_recent DOUBLE PRECISION,
  score_trend TEXT,
  anomaly_detected BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.student_class_stats
CREATE TABLE IF NOT EXISTS public.student_class_stats (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  excused_count INTEGER DEFAULT 0,
  attendance_rate NUMERIC DEFAULT 0,
  avg_score NUMERIC DEFAULT 0,
  attendance_rank INTEGER,
  academic_rank INTEGER,
  last_updated TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.student_goals
CREATE TABLE IF NOT EXISTS public.student_goals (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_by_role TEXT DEFAULT 'parent' NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.student_habit_logs
CREATE TABLE IF NOT EXISTS public.student_habit_logs (
  id UUID DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL,
  student_id UUID NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

-- Table: public.student_habits
CREATE TABLE IF NOT EXISTS public.student_habits (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT DEFAULT 'daily' NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.student_points
CREATE TABLE IF NOT EXISTS public.student_points (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  points SMALLINT NOT NULL,
  reason TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: public.student_progress
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  item_id UUID NOT NULL,
  status TEXT DEFAULT 'not_started' NOT NULL,
  score NUMERIC,
  attempts INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

-- Table: public.student_reviews
CREATE TABLE IF NOT EXISTS public.student_reviews (
  id UUID DEFAULT gen_random_uuid(),
  class_id UUID,
  student_id UUID,
  teacher_id UUID,
  review_type TEXT NOT NULL,
  review_date DATE NOT NULL,
  week_start DATE,
  period_label TEXT,
  session_id UUID,
  positive_tags JSONB,
  improvement_tags JSONB,
  teacher_comment TEXT,
  score_data JSONB,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  answers_data JSONB,
  content_url TEXT,
  score INTEGER,
  feedback TEXT,
  graded_by UUID,
  submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: public.supplementary_quizzes
CREATE TABLE IF NOT EXISTS public.supplementary_quizzes (
  id UUID DEFAULT gen_random_uuid(),
  analysis_id UUID,
  exam_id UUID,
  student_id UUID,
  teacher_id UUID,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  total_questions INTEGER DEFAULT 0 NOT NULL,
  student_answers JSONB,
  score INTEGER,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.survey_questions
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.survey_responses
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL,
  question_id UUID NOT NULL,
  user_id UUID NOT NULL,
  answer JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.surveys
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scope TEXT DEFAULT 'class' NOT NULL,
  course_id UUID,
  class_id UUID,
  created_by UUID NOT NULL,
  created_by_role TEXT DEFAULT 'admin' NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.teacher_leave_requests
CREATE TABLE IF NOT EXISTS public.teacher_leave_requests (
  id UUID DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  class_id UUID NOT NULL,
  session_id UUID,
  leave_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  admin_action TEXT,
  substitute_teacher_id UUID,
  makeup_session_id UUID,
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.teacher_resources
CREATE TABLE IF NOT EXISTS public.teacher_resources (
  id UUID DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB,
  file_url TEXT,
  video_url TEXT,
  link_url TEXT,
  tags JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.user_feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID,
  role TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_reply TEXT,
  created_at TIMESTAMP DEFAULT now(),
  resolved_at TIMESTAMP,
  target_teacher_id UUID,
  class_id UUID,
  PRIMARY KEY (id)
);

-- =========================================================================
-- 3. FOREIGN KEY CONSTRAINTS (139 CONSTRAINTS)
-- =========================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_user_id_users') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_user_id_users
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_parent_students_parent_id_users') THEN
    ALTER TABLE public.parent_students ADD CONSTRAINT fk_parent_students_parent_id_users
      FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_parent_students_student_id_users') THEN
    ALTER TABLE public.parent_students ADD CONSTRAINT fk_parent_students_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_classes_course_id_courses') THEN
    ALTER TABLE public.classes ADD CONSTRAINT fk_classes_course_id_courses
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_classes_teacher_id_users') THEN
    ALTER TABLE public.classes ADD CONSTRAINT fk_classes_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_enrollments_student_id_users') THEN
    ALTER TABLE public.enrollments ADD CONSTRAINT fk_enrollments_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_enrollments_class_id_classes') THEN
    ALTER TABLE public.enrollments ADD CONSTRAINT fk_enrollments_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_absence_requests_parent_id_users') THEN
    ALTER TABLE public.absence_requests ADD CONSTRAINT fk_absence_requests_parent_id_users
      FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_absence_requests_student_id_users') THEN
    ALTER TABLE public.absence_requests ADD CONSTRAINT fk_absence_requests_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_absence_requests_class_id_classes') THEN
    ALTER TABLE public.absence_requests ADD CONSTRAINT fk_absence_requests_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_absence_requests_reviewed_by_users') THEN
    ALTER TABLE public.absence_requests ADD CONSTRAINT fk_absence_requests_reviewed_by_users
      FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_analyses_student_id_users') THEN
    ALTER TABLE public.ai_analyses ADD CONSTRAINT fk_ai_analyses_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcement_reads_announcement_id_announcements') THEN
    ALTER TABLE public.announcement_reads ADD CONSTRAINT fk_announcement_reads_announcement_id_announcements
      FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcement_reads_user_id_users') THEN
    ALTER TABLE public.announcement_reads ADD CONSTRAINT fk_announcement_reads_user_id_users
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcements_class_id_classes') THEN
    ALTER TABLE public.announcements ADD CONSTRAINT fk_announcements_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcements_teacher_id_users') THEN
    ALTER TABLE public.announcements ADD CONSTRAINT fk_announcements_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcements_resource_id_teacher_resources') THEN
    ALTER TABLE public.announcements ADD CONSTRAINT fk_announcements_resource_id_teacher_resources
      FOREIGN KEY (resource_id) REFERENCES public.teacher_resources(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcements_quiz_id_exams') THEN
    ALTER TABLE public.announcements ADD CONSTRAINT fk_announcements_quiz_id_exams
      FOREIGN KEY (quiz_id) REFERENCES public.exams(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcements_course_id_courses') THEN
    ALTER TABLE public.announcements ADD CONSTRAINT fk_announcements_course_id_courses
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assignments_class_id_classes') THEN
    ALTER TABLE public.assignments ADD CONSTRAINT fk_assignments_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assignments_lesson_id_lessons') THEN
    ALTER TABLE public.assignments ADD CONSTRAINT fk_assignments_lesson_id_lessons
      FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_student_id_users') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT fk_attendance_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_class_id_classes') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT fk_attendance_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_points_student_id_users') THEN
    ALTER TABLE public.attendance_points ADD CONSTRAINT fk_attendance_points_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_points_class_id_classes') THEN
    ALTER TABLE public.attendance_points ADD CONSTRAINT fk_attendance_points_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_points_session_id_attendance_sessions') THEN
    ALTER TABLE public.attendance_points ADD CONSTRAINT fk_attendance_points_session_id_attendance_sessions
      FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_session_id_attendance_sessions') THEN
    ALTER TABLE public.attendance_records ADD CONSTRAINT fk_attendance_records_session_id_attendance_sessions
      FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_student_id_users') THEN
    ALTER TABLE public.attendance_records ADD CONSTRAINT fk_attendance_records_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_marked_by_users') THEN
    ALTER TABLE public.attendance_records ADD CONSTRAINT fk_attendance_records_marked_by_users
      FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_updated_by_users') THEN
    ALTER TABLE public.attendance_records ADD CONSTRAINT fk_attendance_records_updated_by_users
      FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_sessions_class_id_classes') THEN
    ALTER TABLE public.attendance_sessions ADD CONSTRAINT fk_attendance_sessions_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_sessions_teacher_id_users') THEN
    ALTER TABLE public.attendance_sessions ADD CONSTRAINT fk_attendance_sessions_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_behavior_alerts_student_id_users') THEN
    ALTER TABLE public.behavior_alerts ADD CONSTRAINT fk_behavior_alerts_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_behavior_alerts_class_id_classes') THEN
    ALTER TABLE public.behavior_alerts ADD CONSTRAINT fk_behavior_alerts_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_ai_reports_class_id_classes') THEN
    ALTER TABLE public.class_ai_reports ADD CONSTRAINT fk_class_ai_reports_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_ai_reports_teacher_id_users') THEN
    ALTER TABLE public.class_ai_reports ADD CONSTRAINT fk_class_ai_reports_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_schedules_class_id_classes') THEN
    ALTER TABLE public.class_schedules ADD CONSTRAINT fk_class_schedules_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_schedules_room_id_rooms') THEN
    ALTER TABLE public.class_schedules ADD CONSTRAINT fk_class_schedules_room_id_rooms
      FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_sections_class_id_classes') THEN
    ALTER TABLE public.class_sections ADD CONSTRAINT fk_class_sections_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_sessions_class_id_classes') THEN
    ALTER TABLE public.class_sessions ADD CONSTRAINT fk_class_sessions_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_sessions_substitute_teacher_id_users') THEN
    ALTER TABLE public.class_sessions ADD CONSTRAINT fk_class_sessions_substitute_teacher_id_users
      FOREIGN KEY (substitute_teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_sessions_actual_teacher_id_users') THEN
    ALTER TABLE public.class_sessions ADD CONSTRAINT fk_class_sessions_actual_teacher_id_users
      FOREIGN KEY (actual_teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_sessions_original_session_id_class_sessions') THEN
    ALTER TABLE public.class_sessions ADD CONSTRAINT fk_class_sessions_original_session_id_class_sessions
      FOREIGN KEY (original_session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_course_items_class_id_classes') THEN
    ALTER TABLE public.course_items ADD CONSTRAINT fk_course_items_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_course_items_parent_id_course_items') THEN
    ALTER TABLE public.course_items ADD CONSTRAINT fk_course_items_parent_id_course_items
      FOREIGN KEY (parent_id) REFERENCES public.course_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_course_items_unlock_after_course_items') THEN
    ALTER TABLE public.course_items ADD CONSTRAINT fk_course_items_unlock_after_course_items
      FOREIGN KEY (unlock_after) REFERENCES public.course_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_discussion_messages_item_id_course_items') THEN
    ALTER TABLE public.discussion_messages ADD CONSTRAINT fk_discussion_messages_item_id_course_items
      FOREIGN KEY (item_id) REFERENCES public.course_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_discussion_messages_class_id_classes') THEN
    ALTER TABLE public.discussion_messages ADD CONSTRAINT fk_discussion_messages_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_discussion_messages_user_id_users') THEN
    ALTER TABLE public.discussion_messages ADD CONSTRAINT fk_discussion_messages_user_id_users
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_submissions_exam_id_exams') THEN
    ALTER TABLE public.exam_submissions ADD CONSTRAINT fk_exam_submissions_exam_id_exams
      FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_submissions_student_id_users') THEN
    ALTER TABLE public.exam_submissions ADD CONSTRAINT fk_exam_submissions_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exams_class_id_classes') THEN
    ALTER TABLE public.exams ADD CONSTRAINT fk_exams_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exams_created_by_users') THEN
    ALTER TABLE public.exams ADD CONSTRAINT fk_exams_created_by_users
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_plans_class_id_classes') THEN
    ALTER TABLE public.fee_plans ADD CONSTRAINT fk_fee_plans_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_plans_created_by_users') THEN
    ALTER TABLE public.fee_plans ADD CONSTRAINT fk_fee_plans_created_by_users
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_schedules_class_id_classes') THEN
    ALTER TABLE public.fee_schedules ADD CONSTRAINT fk_fee_schedules_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_feedback_parent_id_users') THEN
    ALTER TABLE public.feedback ADD CONSTRAINT fk_feedback_parent_id_users
      FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_grade_notifications_student_id_users') THEN
    ALTER TABLE public.grade_notifications ADD CONSTRAINT fk_grade_notifications_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_grade_notifications_parent_id_users') THEN
    ALTER TABLE public.grade_notifications ADD CONSTRAINT fk_grade_notifications_parent_id_users
      FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_grade_notifications_class_id_classes') THEN
    ALTER TABLE public.grade_notifications ADD CONSTRAINT fk_grade_notifications_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_grade_reports_student_id_users') THEN
    ALTER TABLE public.grade_reports ADD CONSTRAINT fk_grade_reports_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_grade_reports_class_id_classes') THEN
    ALTER TABLE public.grade_reports ADD CONSTRAINT fk_grade_reports_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_homework_class_id_classes') THEN
    ALTER TABLE public.homework ADD CONSTRAINT fk_homework_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_homework_created_by_users') THEN
    ALTER TABLE public.homework ADD CONSTRAINT fk_homework_created_by_users
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_homework_submissions_homework_id_homework') THEN
    ALTER TABLE public.homework_submissions ADD CONSTRAINT fk_homework_submissions_homework_id_homework
      FOREIGN KEY (homework_id) REFERENCES public.homework(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_homework_submissions_student_id_users') THEN
    ALTER TABLE public.homework_submissions ADD CONSTRAINT fk_homework_submissions_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_homework_submissions_graded_by_users') THEN
    ALTER TABLE public.homework_submissions ADD CONSTRAINT fk_homework_submissions_graded_by_users
      FOREIGN KEY (graded_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_improvement_progress_analysis_id_quiz_individual_analysis') THEN
    ALTER TABLE public.improvement_progress ADD CONSTRAINT fk_improvement_progress_analysis_id_quiz_individual_analysis
      FOREIGN KEY (analysis_id) REFERENCES public.quiz_individual_analysis(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_improvement_progress_student_id_users') THEN
    ALTER TABLE public.improvement_progress ADD CONSTRAINT fk_improvement_progress_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_improvement_quiz_results_analysis_id_quiz_individual_analysis') THEN
    ALTER TABLE public.improvement_quiz_results ADD CONSTRAINT fk_improvement_quiz_results_analysis_id_quiz_individual_analysis
      FOREIGN KEY (analysis_id) REFERENCES public.quiz_individual_analysis(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_improvement_quiz_results_student_id_users') THEN
    ALTER TABLE public.improvement_quiz_results ADD CONSTRAINT fk_improvement_quiz_results_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_fee_plan_id_fee_plans') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_fee_plan_id_fee_plans
      FOREIGN KEY (fee_plan_id) REFERENCES public.fee_plans(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_student_id_users') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_class_id_classes') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_item_contents_item_id_course_items') THEN
    ALTER TABLE public.item_contents ADD CONSTRAINT fk_item_contents_item_id_course_items
      FOREIGN KEY (item_id) REFERENCES public.course_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_requests_student_id_users') THEN
    ALTER TABLE public.leave_requests ADD CONSTRAINT fk_leave_requests_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_requests_parent_id_users') THEN
    ALTER TABLE public.leave_requests ADD CONSTRAINT fk_leave_requests_parent_id_users
      FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_requests_class_id_classes') THEN
    ALTER TABLE public.leave_requests ADD CONSTRAINT fk_leave_requests_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lessons_class_id_classes') THEN
    ALTER TABLE public.lessons ADD CONSTRAINT fk_lessons_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lessons_section_id_class_sections') THEN
    ALTER TABLE public.lessons ADD CONSTRAINT fk_lessons_section_id_class_sections
      FOREIGN KEY (section_id) REFERENCES public.class_sections(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user_id_users') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user_id_users
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_invoice_id_invoices') THEN
    ALTER TABLE public.payments ADD CONSTRAINT fk_payments_invoice_id_invoices
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_user_id_users') THEN
    ALTER TABLE public.payments ADD CONSTRAINT fk_payments_user_id_users
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_questions_assignment_id_assignments') THEN
    ALTER TABLE public.questions ADD CONSTRAINT fk_questions_assignment_id_assignments
      FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_attempts_student_id_users') THEN
    ALTER TABLE public.quiz_attempts ADD CONSTRAINT fk_quiz_attempts_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_attempts_item_id_course_items') THEN
    ALTER TABLE public.quiz_attempts ADD CONSTRAINT fk_quiz_attempts_item_id_course_items
      FOREIGN KEY (item_id) REFERENCES public.course_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_class_analysis_exam_id_exams') THEN
    ALTER TABLE public.quiz_class_analysis ADD CONSTRAINT fk_quiz_class_analysis_exam_id_exams
      FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_class_analysis_class_id_classes') THEN
    ALTER TABLE public.quiz_class_analysis ADD CONSTRAINT fk_quiz_class_analysis_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_class_analysis_teacher_id_users') THEN
    ALTER TABLE public.quiz_class_analysis ADD CONSTRAINT fk_quiz_class_analysis_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_individual_analysis_submission_id_exam_submissions') THEN
    ALTER TABLE public.quiz_individual_analysis ADD CONSTRAINT fk_quiz_individual_analysis_submission_id_exam_submissions
      FOREIGN KEY (submission_id) REFERENCES public.exam_submissions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_individual_analysis_student_id_users') THEN
    ALTER TABLE public.quiz_individual_analysis ADD CONSTRAINT fk_quiz_individual_analysis_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_individual_analysis_exam_id_exams') THEN
    ALTER TABLE public.quiz_individual_analysis ADD CONSTRAINT fk_quiz_individual_analysis_exam_id_exams
      FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_questions_item_id_course_items') THEN
    ALTER TABLE public.quiz_questions ADD CONSTRAINT fk_quiz_questions_item_id_course_items
      FOREIGN KEY (item_id) REFERENCES public.course_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_achievements_student_id_users') THEN
    ALTER TABLE public.student_achievements ADD CONSTRAINT fk_student_achievements_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_achievements_class_id_classes') THEN
    ALTER TABLE public.student_achievements ADD CONSTRAINT fk_student_achievements_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_activity_logs_student_id_users') THEN
    ALTER TABLE public.student_activity_logs ADD CONSTRAINT fk_student_activity_logs_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_activity_logs_class_id_classes') THEN
    ALTER TABLE public.student_activity_logs ADD CONSTRAINT fk_student_activity_logs_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_behavior_scores_student_id_users') THEN
    ALTER TABLE public.student_behavior_scores ADD CONSTRAINT fk_student_behavior_scores_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_behavior_scores_class_id_classes') THEN
    ALTER TABLE public.student_behavior_scores ADD CONSTRAINT fk_student_behavior_scores_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_class_stats_student_id_users') THEN
    ALTER TABLE public.student_class_stats ADD CONSTRAINT fk_student_class_stats_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_class_stats_class_id_classes') THEN
    ALTER TABLE public.student_class_stats ADD CONSTRAINT fk_student_class_stats_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_goals_student_id_users') THEN
    ALTER TABLE public.student_goals ADD CONSTRAINT fk_student_goals_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_goals_created_by_users') THEN
    ALTER TABLE public.student_goals ADD CONSTRAINT fk_student_goals_created_by_users
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_habit_logs_habit_id_student_habits') THEN
    ALTER TABLE public.student_habit_logs ADD CONSTRAINT fk_student_habit_logs_habit_id_student_habits
      FOREIGN KEY (habit_id) REFERENCES public.student_habits(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_habit_logs_student_id_users') THEN
    ALTER TABLE public.student_habit_logs ADD CONSTRAINT fk_student_habit_logs_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_habits_student_id_users') THEN
    ALTER TABLE public.student_habits ADD CONSTRAINT fk_student_habits_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_habits_parent_id_users') THEN
    ALTER TABLE public.student_habits ADD CONSTRAINT fk_student_habits_parent_id_users
      FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_points_student_id_users') THEN
    ALTER TABLE public.student_points ADD CONSTRAINT fk_student_points_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_points_class_id_classes') THEN
    ALTER TABLE public.student_points ADD CONSTRAINT fk_student_points_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_points_teacher_id_users') THEN
    ALTER TABLE public.student_points ADD CONSTRAINT fk_student_points_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_progress_student_id_users') THEN
    ALTER TABLE public.student_progress ADD CONSTRAINT fk_student_progress_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_progress_item_id_course_items') THEN
    ALTER TABLE public.student_progress ADD CONSTRAINT fk_student_progress_item_id_course_items
      FOREIGN KEY (item_id) REFERENCES public.course_items(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_reviews_class_id_classes') THEN
    ALTER TABLE public.student_reviews ADD CONSTRAINT fk_student_reviews_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_reviews_student_id_users') THEN
    ALTER TABLE public.student_reviews ADD CONSTRAINT fk_student_reviews_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_reviews_teacher_id_users') THEN
    ALTER TABLE public.student_reviews ADD CONSTRAINT fk_student_reviews_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_reviews_session_id_class_sessions') THEN
    ALTER TABLE public.student_reviews ADD CONSTRAINT fk_student_reviews_session_id_class_sessions
      FOREIGN KEY (session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_submissions_assignment_id_assignments') THEN
    ALTER TABLE public.submissions ADD CONSTRAINT fk_submissions_assignment_id_assignments
      FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_submissions_student_id_users') THEN
    ALTER TABLE public.submissions ADD CONSTRAINT fk_submissions_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_submissions_graded_by_users') THEN
    ALTER TABLE public.submissions ADD CONSTRAINT fk_submissions_graded_by_users
      FOREIGN KEY (graded_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplementary_quizzes_analysis_id_quiz_individual_analysis') THEN
    ALTER TABLE public.supplementary_quizzes ADD CONSTRAINT fk_supplementary_quizzes_analysis_id_quiz_individual_analysis
      FOREIGN KEY (analysis_id) REFERENCES public.quiz_individual_analysis(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplementary_quizzes_exam_id_exams') THEN
    ALTER TABLE public.supplementary_quizzes ADD CONSTRAINT fk_supplementary_quizzes_exam_id_exams
      FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplementary_quizzes_student_id_users') THEN
    ALTER TABLE public.supplementary_quizzes ADD CONSTRAINT fk_supplementary_quizzes_student_id_users
      FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplementary_quizzes_teacher_id_users') THEN
    ALTER TABLE public.supplementary_quizzes ADD CONSTRAINT fk_supplementary_quizzes_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_questions_survey_id_surveys') THEN
    ALTER TABLE public.survey_questions ADD CONSTRAINT fk_survey_questions_survey_id_surveys
      FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_responses_survey_id_surveys') THEN
    ALTER TABLE public.survey_responses ADD CONSTRAINT fk_survey_responses_survey_id_surveys
      FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_responses_question_id_survey_questions') THEN
    ALTER TABLE public.survey_responses ADD CONSTRAINT fk_survey_responses_question_id_survey_questions
      FOREIGN KEY (question_id) REFERENCES public.survey_questions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_responses_user_id_users') THEN
    ALTER TABLE public.survey_responses ADD CONSTRAINT fk_survey_responses_user_id_users
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_surveys_course_id_courses') THEN
    ALTER TABLE public.surveys ADD CONSTRAINT fk_surveys_course_id_courses
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_surveys_class_id_classes') THEN
    ALTER TABLE public.surveys ADD CONSTRAINT fk_surveys_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_surveys_created_by_users') THEN
    ALTER TABLE public.surveys ADD CONSTRAINT fk_surveys_created_by_users
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_leave_requests_teacher_id_users') THEN
    ALTER TABLE public.teacher_leave_requests ADD CONSTRAINT fk_teacher_leave_requests_teacher_id_users
      FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_leave_requests_class_id_classes') THEN
    ALTER TABLE public.teacher_leave_requests ADD CONSTRAINT fk_teacher_leave_requests_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_leave_requests_session_id_class_sessions') THEN
    ALTER TABLE public.teacher_leave_requests ADD CONSTRAINT fk_teacher_leave_requests_session_id_class_sessions
      FOREIGN KEY (session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_leave_requests_substitute_teacher_id_users') THEN
    ALTER TABLE public.teacher_leave_requests ADD CONSTRAINT fk_teacher_leave_requests_substitute_teacher_id_users
      FOREIGN KEY (substitute_teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_leave_requests_makeup_session_id_class_sessions') THEN
    ALTER TABLE public.teacher_leave_requests ADD CONSTRAINT fk_teacher_leave_requests_makeup_session_id_class_sessions
      FOREIGN KEY (makeup_session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_leave_requests_reviewed_by_users') THEN
    ALTER TABLE public.teacher_leave_requests ADD CONSTRAINT fk_teacher_leave_requests_reviewed_by_users
      FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_feedback_user_id_users') THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT fk_user_feedback_user_id_users
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_feedback_target_teacher_id_users') THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT fk_user_feedback_target_teacher_id_users
      FOREIGN KEY (target_teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_feedback_class_id_classes') THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT fk_user_feedback_class_id_classes
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =========================================================================
-- 4. UNIQUE CONSTRAINTS & PERFORMANCE INDEXES
-- =========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_invite_code_key ON public.users(invite_code) WHERE invite_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS parent_students_pair_key ON public.parent_students(parent_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_class_student_key ON public.enrollments(class_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS submissions_assign_student_key ON public.submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS classes_course_id_idx ON public.classes(course_id);
CREATE INDEX IF NOT EXISTS class_sessions_class_date_idx ON public.class_sessions(class_id, session_date);
CREATE INDEX IF NOT EXISTS attendance_records_session_student_idx ON public.attendance_records(session_id, student_id);
CREATE INDEX IF NOT EXISTS homework_submissions_hw_student_idx ON public.homework_submissions(homework_id, student_id);
CREATE INDEX IF NOT EXISTS exam_submissions_exam_student_idx ON public.exam_submissions(exam_id, student_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS activity_logs_student_class_time_idx ON public.student_activity_logs(student_id, class_id, created_at);
CREATE INDEX IF NOT EXISTS invoices_student_status_idx ON public.invoices(student_id, status);
CREATE INDEX IF NOT EXISTS payments_invoice_status_idx ON public.payments(invoice_id, status);

-- =========================================================================
-- 5. VIEWS
-- =========================================================================

CREATE OR REPLACE VIEW public.admin_student_grade_summary AS
SELECT 
    e.student_id,
    u.full_name as student_name,
    u.email as student_email,
    c.id as class_id,
    c.name as class_name,
    co.id as course_id,
    co.name as course_name,
    COUNT(DISTINCT es.id) as exam_submission_count,
    COALESCE(AVG(es.score), 0) as avg_exam_score,
    COALESCE(MAX(es.score), 0) as max_exam_score,
    COALESCE(MIN(CASE WHEN es.score IS NOT NULL THEN es.score END), 0) as min_exam_score,
    COUNT(DISTINCT hs.id) as homework_submission_count,
    COALESCE(AVG(CASE WHEN hs.status = 'graded' THEN hs.score END), 0) as avg_homework_score,
    COALESCE(
        (COALESCE(AVG(es.score), 0) + COALESCE(AVG(CASE WHEN hs.status = 'graded' THEN hs.score END), 0)) / 
        NULLIF(
            (CASE WHEN AVG(es.score) IS NOT NULL THEN 1 ELSE 0 END) + 
            (CASE WHEN AVG(CASE WHEN hs.status = 'graded' THEN hs.score END) IS NOT NULL THEN 1 ELSE 0 END),
            0
        ),
        0
    ) as overall_avg_score,
    e.enrolled_at
FROM public.enrollments e
JOIN public.users u ON u.id = e.student_id
JOIN public.classes c ON c.id = e.class_id
JOIN public.courses co ON co.id = c.course_id
LEFT JOIN public.exams ex ON ex.class_id = c.id
LEFT JOIN public.exam_submissions es ON es.student_id = e.student_id AND es.exam_id = ex.id
LEFT JOIN public.homework h ON h.class_id = c.id
LEFT JOIN public.homework_submissions hs ON hs.student_id = e.student_id AND hs.homework_id = h.id
GROUP BY e.student_id, u.full_name, u.email, c.id, c.name, co.id, co.name, e.enrolled_at;

CREATE OR REPLACE VIEW public.student_attendance_points_summary AS
SELECT
    student_id,
    class_id,
    SUM(points_earned) as total_points,
    COUNT(*) as total_sessions_rewarded
FROM public.attendance_points
GROUP BY student_id, class_id;

-- =========================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_class_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_individual_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_behavior_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplementary_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Standard RLS Policies
DROP POLICY IF EXISTS "Admin full access on users" ON public.users;
CREATE POLICY "Admin full access on users" ON public.users FOR ALL TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT TO authenticated USING (
    id = auth.uid()
);

DROP POLICY IF EXISTS "Teachers can read all users" ON public.users;
CREATE POLICY "Teachers can read all users" ON public.users FOR SELECT TO authenticated USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
);

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Courses read access" ON public.courses;
CREATE POLICY "Courses read access" ON public.courses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Classes read access" ON public.classes;
CREATE POLICY "Classes read access" ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enrollments read own or teacher" ON public.enrollments;
CREATE POLICY "Enrollments read own or teacher" ON public.enrollments FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR is_teacher_of_class(class_id) OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Homework view published" ON public.homework;
CREATE POLICY "Homework view published" ON public.homework FOR SELECT TO authenticated USING (
    status != 'draft' AND (is_student_in_class(class_id) OR is_teacher_of_class(class_id) OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
);

DROP POLICY IF EXISTS "Homework submissions own or teacher" ON public.homework_submissions;
CREATE POLICY "Homework submissions own or teacher" ON public.homework_submissions FOR ALL TO authenticated USING (
    student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.homework h WHERE h.id = homework_submissions.homework_id AND is_teacher_of_class(h.class_id))
);

DROP POLICY IF EXISTS "Exams view published" ON public.exams;
CREATE POLICY "Exams view published" ON public.exams FOR SELECT TO authenticated USING (
    is_published = true OR is_teacher_of_class(class_id) OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Exam submissions own or teacher" ON public.exam_submissions;
CREATE POLICY "Exam submissions own or teacher" ON public.exam_submissions FOR ALL TO authenticated USING (
    student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.exams ex WHERE ex.id = exam_submissions.exam_id AND is_teacher_of_class(ex.class_id))
);

-- =========================================================================
-- 7. STORAGE BUCKETS SETUP
-- =========================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('videos', 'videos', true, 524288000),
  ('documents', 'documents', true, 104857600),
  ('lesson-videos', 'lesson-videos', true, 524288000),
  ('lesson-files', 'lesson-files', true, 104857600),
  ('avatars', 'avatars', true, 10485760),
  ('homework', 'homework', true, 52428800),
  ('exams', 'exams', true, 52428800),
  ('materials', 'materials', true, 104857600)
ON CONFLICT (id) DO NOTHING;
