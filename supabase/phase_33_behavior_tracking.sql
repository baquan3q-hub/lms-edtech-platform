-- ============================================================
-- Phase 33: Student Behavior Tracking & AI Gaming Detection
-- Tạo bảng theo dõi hành vi học sinh, scoring, alerts
-- ============================================================

-- ===== 1. RAW ACTIVITY LOGS =====
-- Bảng lưu trữ raw events từ client (high-volume)
CREATE TABLE IF NOT EXISTS student_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'lesson_view', 'quiz_answer', 'quiz_submit', 'exam_start', 'exam_submit', 'homework_submit', 'tab_switch', 'idle_detected', 'video_play', 'page_focus', 'page_blur'
  context_type TEXT NOT NULL,  -- 'lesson', 'quiz', 'exam', 'homework', 'video'
  context_id TEXT,             -- ID của bài học/quiz/exam cụ thể
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}', -- { duration_seconds, question_index, answer_speed_ms, idle_duration_s, tab_away_count, warnings_count... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 2. AGGREGATED BEHAVIOR SCORES =====
-- Bảng tổng hợp hành vi theo từng học sinh/lớp/tuần
CREATE TABLE IF NOT EXISTS student_behavior_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  period TEXT NOT NULL,           -- '2026-W15', '2026-04-14'
  
  -- Raw metrics (tính từ activity_logs)
  avg_answer_speed_ms FLOAT DEFAULT 0,    -- Trung bình ms/câu trả lời
  tab_switch_count INT DEFAULT 0,          -- Tổng số lần chuyển tab
  total_active_time_s INT DEFAULT 0,       -- Tổng thời gian hoạt động thực tế (giây)
  total_idle_time_s INT DEFAULT 0,         -- Tổng thời gian idle (giây)
  rapid_guess_count INT DEFAULT 0,         -- Số lần đoán nhanh (< 5s/câu)
  total_sessions INT DEFAULT 0,            -- Tổng số session
  
  -- AI computed scores
  gaming_score FLOAT DEFAULT 0,            -- 0.0 → 1.0 (AI computed)
  risk_level TEXT DEFAULT 'normal' CHECK (risk_level IN ('normal', 'warning', 'high_risk')),
  ai_analysis_json JSONB DEFAULT '{}',     -- Chi tiết phân tích từ Gemini
  
  -- Score comparison (so sánh với điểm số thực tế)
  avg_score_recent FLOAT,                  -- Điểm trung bình gần đây
  score_trend TEXT,                        -- 'improving', 'stable', 'declining', 'volatile'
  anomaly_detected BOOLEAN DEFAULT FALSE, -- Có phát hiện bất thường điểm số không
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, period)
);

-- ===== 3. BEHAVIOR ALERTS =====
-- Bảng lưu các cảnh báo khi phát hiện hành vi bất thường
CREATE TABLE IF NOT EXISTS behavior_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,        -- 'gaming_detected', 'excessive_idle', 'rapid_guessing', 'tab_switching', 'score_anomaly'
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  description TEXT NOT NULL,
  details_json JSONB DEFAULT '{}', -- Chi tiết chi tiết hành vi
  is_resolved BOOLEAN DEFAULT FALSE,
  notified_teacher BOOLEAN DEFAULT FALSE,
  notified_parent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 4. INDEXES =====
CREATE INDEX IF NOT EXISTS idx_activity_logs_student ON student_activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_class ON student_activity_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_context ON student_activity_logs(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON student_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON student_activity_logs(activity_type);

CREATE INDEX IF NOT EXISTS idx_behavior_scores_student ON student_behavior_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_behavior_scores_class ON student_behavior_scores(class_id);
CREATE INDEX IF NOT EXISTS idx_behavior_scores_risk ON student_behavior_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_behavior_scores_period ON student_behavior_scores(period);

CREATE INDEX IF NOT EXISTS idx_behavior_alerts_student ON behavior_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_behavior_alerts_class ON behavior_alerts(class_id);
CREATE INDEX IF NOT EXISTS idx_behavior_alerts_type ON behavior_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_behavior_alerts_resolved ON behavior_alerts(is_resolved);

-- ===== 5. RLS POLICIES =====
ALTER TABLE student_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_behavior_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_alerts ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY "admin_full_access_activity_logs" ON student_activity_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_full_access_behavior_scores" ON student_behavior_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_full_access_behavior_alerts" ON behavior_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Student: Chỉ insert log của bản thân
CREATE POLICY "student_insert_own_logs" ON student_activity_logs
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "student_read_own_logs" ON student_activity_logs
  FOR SELECT USING (student_id = auth.uid());

-- Teacher: Đọc logs & scores của học sinh trong lớp mình dạy
CREATE POLICY "teacher_read_activity_logs" ON student_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = student_activity_logs.class_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "teacher_read_behavior_scores" ON student_behavior_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = student_behavior_scores.class_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "teacher_read_behavior_alerts" ON behavior_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = behavior_alerts.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Parent: Đọc alerts của con em
CREATE POLICY "parent_read_child_alerts" ON behavior_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.student_id = behavior_alerts.student_id
      AND ps.parent_id = auth.uid()
    )
  );

CREATE POLICY "parent_read_child_scores" ON student_behavior_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.student_id = student_behavior_scores.student_id
      AND ps.parent_id = auth.uid()
    )
  );
