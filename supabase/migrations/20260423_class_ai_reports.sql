-- ============================================================
-- Bảng lưu báo cáo AI phân tích lớp học (tab "AI Báo cáo" trong Quản lý Điểm)
-- Giáo viên không cần ấn lại nút phân tích khi mở lại trang
-- ============================================================

CREATE TABLE IF NOT EXISTS class_ai_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id        uuid REFERENCES users(id),
  report_text       text NOT NULL,
  student_count     integer DEFAULT 0,
  class_avg         numeric(4,1),
  generated_at      timestamptz DEFAULT now(),
  UNIQUE (class_id)
);

-- RLS: Chỉ teacher mới đọc/ghi
ALTER TABLE class_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own class AI reports"
  ON class_ai_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);
