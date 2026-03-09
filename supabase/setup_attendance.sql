-- ============================================================
-- SQL SCRIPT: TẠO BẢNG ĐIỂM DANH (ATTENDANCE)
-- ============================================================

-- Bảng attendance: Lưu lịch sử điểm danh của từng học sinh theo từng buổi học
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'excused', 'unexcused', 'late')),
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Ai là người điểm danh (thường là teacher)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id, date) -- Một học sinh chỉ có 1 bản ghi điểm danh mỗi ngày trong 1 lớp
);

-- Index tối ưu truy vấn điểm danh theo lớp và ngày
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- ============================================================
-- CẤU HÌNH BẢO MẬT RLS (ROW LEVEL SECURITY)
-- ============================================================

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Xóa Policy cũ (nếu có để tạo lại sạch sẽ)
DROP POLICY IF EXISTS "Admin full attendance" ON attendance;
DROP POLICY IF EXISTS "Teacher manage class attendance" ON attendance;
DROP POLICY IF EXISTS "Student read own attendance" ON attendance;

-- Admin được full quyền
CREATE POLICY "Admin full attendance" ON attendance FOR ALL 
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Teacher có thể Đọc/Thêm/Sửa điểm danh của các lớp họ phụ trách
CREATE POLICY "Teacher manage class attendance" ON attendance FOR ALL
USING ( class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );

-- Student chỉ được xem điểm danh của chính mình
CREATE POLICY "Student read own attendance" ON attendance FOR SELECT 
USING ( student_id = auth.uid() );
