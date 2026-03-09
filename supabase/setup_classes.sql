-- ============================================================
-- SQL SCRIPT: TẠO BẢNG QUẢN LÝ KHÓA HỌC & LỚP HỌC (CRUD)
-- ============================================================
-- Hành động: Copy toàn bộ Script này dán vào phần SQL Editor 
-- trên Supabase Dashboard và bấm RUN.
-- Script này sử dụng RLS an toàn (JWT metadata) chống lỗi Đệ quy vô hạn.
-- ============================================================

-- 1. Bật UUID extension mềm (phòng trường hợp chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TẠO BẢNG DỮ LIỆU
-- ============================================================

-- Bảng courses: Khóa học / Môn học
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Tùy chọn: Giáo viên phụ trách môn
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng classes: Lớp học cụ thể (thuộc 1 khóa học, do 1 giáo viên dạy)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  room TEXT,
  schedule JSONB, -- Lưu lịch học dạng JSON (vd: ["T2-07:00", "T4-09:00"])
  max_students INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')) 
);

-- Bảng enrollments: Ghi danh học sinh vào lớp học
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  UNIQUE(student_id, class_id) -- Một học sinh chỉ được tham gia 1 lớp 1 lần
);

-- ============================================================
-- 3. ĐÁNH INDEX TỐI ƯU TRUY VẤN
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_classes_course_id ON classes(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);

-- ============================================================
-- 4. BẤT VÀ CẤU HÌNH BẢO MẬT RLS (ROW LEVEL SECURITY)
-- ============================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Xóa Policy cũ (nếu có để tạo lại sạch sẽ)
DROP POLICY IF EXISTS "Admin full courses" ON courses;
DROP POLICY IF EXISTS "Teacher read courses" ON courses;
DROP POLICY IF EXISTS "Admin full classes" ON classes;
DROP POLICY IF EXISTS "Teacher read own classes" ON classes;
DROP POLICY IF EXISTS "Student read own classes" ON classes;
DROP POLICY IF EXISTS "Admin full enrollments" ON enrollments;
DROP POLICY IF EXISTS "Teacher read class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Student read own enrollments" ON enrollments;

-- --- BẢNG COURSES ---
-- Admin được full quyền (Create, Read, Update, Delete)
CREATE POLICY "Admin full courses" ON courses FOR ALL 
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Teacher được Read (Xem danh sách môn học)
CREATE POLICY "Teacher read courses" ON courses FOR SELECT 
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' );

-- --- BẢNG CLASSES ---
-- Admin được full quyền
CREATE POLICY "Admin full classes" ON classes FOR ALL 
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Teacher chỉ được đọc các lớp do chính mình được phân công (Read real data)
CREATE POLICY "Teacher read own classes" ON classes FOR SELECT 
USING ( teacher_id = auth.uid() );

-- Student chỉ được đọc các lớp mình đã enroll
CREATE POLICY "Student read own classes" ON classes FOR SELECT 
USING ( id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid()) );

-- --- BẢNG ENROLLMENTS ---
-- Admin được full quyền (thêm/xóa học sinh khỏi lớp)
CREATE POLICY "Admin full enrollments" ON enrollments FOR ALL 
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- Teacher chỉ xem danh sách học sinh (enrollments) trong lớp CỦA MÌNH
CREATE POLICY "Teacher read class enrollments" ON enrollments FOR SELECT 
USING ( class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );

-- Student chỉ xem enrollments của chính mình
CREATE POLICY "Student read own enrollments" ON enrollments FOR SELECT 
USING ( student_id = auth.uid() );
