-- ============================================================
-- RLS POLICIES ĐÃ ĐƯỢC FIX LỖI INFINITE RECURSION
-- ============================================================
-- Chạy file này trên Supabase SQL Editor
-- Ở phiên bản cũ, việc SELECT bảng users bên trong policy của 
-- chính bảng users gây ra lỗi đệ quy vô hạn (infinite recursion).
-- Giải pháp: Đọc role từ thẳng JWT metadata thay vì query bảng.
-- ============================================================

-- Bật RLS (nếu chưa bật)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ để tránh trùng lặp gậy lỗi
DROP POLICY IF EXISTS "Admin full access on users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Teachers can read all users" ON users;

DROP POLICY IF EXISTS "Admin full access on courses" ON courses;
DROP POLICY IF EXISTS "Teachers can read courses" ON courses;

DROP POLICY IF EXISTS "Admin full access on classes" ON classes;
DROP POLICY IF EXISTS "Teachers can read own classes" ON classes;

DROP POLICY IF EXISTS "Admin full access on enrollments" ON enrollments;
DROP POLICY IF EXISTS "Teachers can read class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Students can read own enrollments" ON enrollments;

DROP POLICY IF EXISTS "Admin full access on attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance for own classes" ON attendance;
DROP POLICY IF EXISTS "Students can read own attendance" ON attendance;


-- ============================================================
-- BẢNG USERS
-- ============================================================
-- 1. Admin quyền cao nhất tuyệt đối
CREATE POLICY "Admin full access on users"
  ON users FOR ALL
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' )
  WITH CHECK ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

-- 2. Cho phép user đọc chính mình
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 3. Cho phép teacher đọc danh sách users
CREATE POLICY "Teachers can read all users"
  ON users FOR SELECT
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' );

-- ============================================================
-- BẢNG COURSES
-- ============================================================
CREATE POLICY "Admin full access on courses"
  ON courses FOR ALL
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' )
  WITH CHECK ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Teachers can read courses"
  ON courses FOR SELECT
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' );

-- ============================================================
-- BẢNG CLASSES
-- ============================================================
CREATE POLICY "Admin full access on classes"
  ON classes FOR ALL
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' )
  WITH CHECK ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Teachers can read own classes"
  ON classes FOR SELECT
  USING (teacher_id = auth.uid());

-- ============================================================
-- BẢNG ENROLLMENTS
-- ============================================================
CREATE POLICY "Admin full access on enrollments"
  ON enrollments FOR ALL
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' )
  WITH CHECK ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Teachers can read class enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read own enrollments"
  ON enrollments FOR SELECT
  USING (student_id = auth.uid());

-- ============================================================
-- BẢNG ATTENDANCE
-- ============================================================
CREATE POLICY "Admin full access on attendance"
  ON attendance FOR ALL
  USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' )
  WITH CHECK ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Teachers can manage attendance for own classes"
  ON attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = attendance.class_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = attendance.class_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read own attendance"
  ON attendance FOR SELECT
  USING (student_id = auth.uid());
