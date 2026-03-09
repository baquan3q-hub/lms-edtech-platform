-- ============================================================
-- E-Learning Platform — Database Schema
-- Khởi tạo toàn bộ bảng, quan hệ khóa ngoại, indexes, RLS
-- ============================================================

-- Bật UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CORE — Người dùng & Hồ sơ
-- ============================================================

-- Bảng users: Thông tin chính của tất cả người dùng
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng profiles: Thông tin bổ sung (mở rộng từ users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  date_of_birth DATE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng parent_students: Liên kết phụ huynh - học sinh
-- (Được đề cập trong phần RLS của README.md)
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- ============================================================
-- 2. ACADEMIC — Khoá học & Lớp học
-- ============================================================

-- Bảng courses: Khóa học / Môn học
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng classes: Lớp học cụ thể (thuộc 1 khóa học)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  room TEXT,
  schedule JSONB, -- Lưu lịch học dạng JSON (ngày, giờ bắt đầu, giờ kết thúc)
  max_students INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng enrollments: Ghi danh học sinh vào lớp
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  UNIQUE(student_id, class_id)
);

-- ============================================================
-- 3. CONTENT — Bài giảng, Bài tập, Câu hỏi
-- ============================================================

-- Bảng lessons: Bài giảng thuộc 1 lớp
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  "order" INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng assignments: Bài tập / Bài kiểm tra
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'homework' CHECK (type IN ('homework', 'quiz', 'exam')),
  deadline TIMESTAMPTZ,
  max_score NUMERIC(5,2) DEFAULT 100,
  ai_graded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng questions: Câu hỏi trong bài tập/kiểm tra
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  options JSONB, -- Các lựa chọn trắc nghiệm dạng JSON array
  correct_answer TEXT,
  points NUMERIC(5,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. STUDENT ACTIVITY — Nộp bài & Điểm danh
-- ============================================================

-- Bảng submissions: Bài nộp của học sinh
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  content_url TEXT,
  score NUMERIC(5,2),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  UNIQUE(student_id, assignment_id)
);

-- Bảng attendance: Điểm danh học sinh
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, date)
);

-- ============================================================
-- 5. COMMUNICATION — Thông báo, Công bố, Phản hồi
-- ============================================================

-- Bảng notifications: Thông báo cho từng user
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng announcements: Thông báo lớp học từ giáo viên
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng feedback: Phản hồi từ phụ huynh
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'complaint', 'suggestion', 'praise')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng leave_requests: Đơn xin phép nghỉ học (phụ huynh gửi)
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. FINANCIAL — Thanh toán & Hóa đơn
-- ============================================================

-- Bảng payments: Giao dịch thanh toán
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'VND',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  provider TEXT CHECK (provider IN ('stripe', 'vnpay')),
  provider_payment_id TEXT, -- ID giao dịch từ payment gateway
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng invoices: Hóa đơn
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. AI — Phân tích & Báo cáo
-- ============================================================

-- Bảng ai_analyses: Kết quả phân tích AI
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grade_analysis', 'churn_prediction', 'performance_report')),
  result_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng grade_reports: Bảng điểm tự động gửi
CREATE TABLE IF NOT EXISTS grade_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- Ví dụ: "2024-Q1", "2024-semester1"
  report_json JSONB,
  sent_at TIMESTAMPTZ
);

-- ============================================================
-- 8. INDEXES — Tối ưu truy vấn
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_classes_course_id ON classes(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class_id ON lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON parent_students(student_id);

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Bật RLS cho tất cả bảng
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_reports ENABLE ROW LEVEL SECURITY;

-- Helper function: Lấy role của user hiện tại
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- === ADMIN: Full access ===
CREATE POLICY "admin_full_access" ON users
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON profiles
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON courses
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON classes
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON enrollments
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON lessons
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON assignments
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON questions
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON submissions
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON attendance
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON notifications
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON announcements
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON feedback
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON leave_requests
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON payments
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON invoices
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON ai_analyses
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON grade_reports
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "admin_full_access" ON parent_students
  FOR ALL USING (get_user_role() = 'admin');

-- === USERS: Xem thông tin bản thân ===
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- === TEACHER: CRUD data thuộc classes mình dạy ===
CREATE POLICY "teacher_read_classes" ON classes
  FOR SELECT USING (
    get_user_role() = 'teacher' AND teacher_id = auth.uid()
  );
CREATE POLICY "teacher_manage_lessons" ON lessons
  FOR ALL USING (
    get_user_role() = 'teacher'
    AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
  );
CREATE POLICY "teacher_manage_assignments" ON assignments
  FOR ALL USING (
    get_user_role() = 'teacher'
    AND lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN classes c ON l.class_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
CREATE POLICY "teacher_manage_attendance" ON attendance
  FOR ALL USING (
    get_user_role() = 'teacher'
    AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
  );
CREATE POLICY "teacher_read_enrollments" ON enrollments
  FOR SELECT USING (
    get_user_role() = 'teacher'
    AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
  );
CREATE POLICY "teacher_manage_announcements" ON announcements
  FOR ALL USING (
    get_user_role() = 'teacher' AND teacher_id = auth.uid()
  );
CREATE POLICY "teacher_read_submissions" ON submissions
  FOR SELECT USING (
    get_user_role() = 'teacher'
    AND assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN lessons l ON a.lesson_id = l.id
      JOIN classes c ON l.class_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
CREATE POLICY "teacher_grade_submissions" ON submissions
  FOR UPDATE USING (
    get_user_role() = 'teacher'
    AND assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN lessons l ON a.lesson_id = l.id
      JOIN classes c ON l.class_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- === STUDENT: Read data classes enrolled, CRUD submissions ===
CREATE POLICY "student_read_classes" ON classes
  FOR SELECT USING (
    get_user_role() = 'student'
    AND id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid())
  );
CREATE POLICY "student_read_lessons" ON lessons
  FOR SELECT USING (
    get_user_role() = 'student'
    AND class_id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid())
  );
CREATE POLICY "student_read_assignments" ON assignments
  FOR SELECT USING (
    get_user_role() = 'student'
    AND lesson_id IN (
      SELECT l.id FROM lessons l
      JOIN enrollments e ON l.class_id = e.class_id
      WHERE e.student_id = auth.uid()
    )
  );
CREATE POLICY "student_manage_submissions" ON submissions
  FOR ALL USING (
    get_user_role() = 'student' AND student_id = auth.uid()
  );
CREATE POLICY "student_read_attendance" ON attendance
  FOR SELECT USING (
    get_user_role() = 'student' AND student_id = auth.uid()
  );
CREATE POLICY "student_read_enrollments" ON enrollments
  FOR SELECT USING (
    get_user_role() = 'student' AND student_id = auth.uid()
  );
CREATE POLICY "student_read_announcements" ON announcements
  FOR SELECT USING (
    get_user_role() = 'student'
    AND class_id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid())
  );
CREATE POLICY "student_read_grade_reports" ON grade_reports
  FOR SELECT USING (
    get_user_role() = 'student' AND student_id = auth.uid()
  );

-- === PARENT: Read-only data con em ===
CREATE POLICY "parent_read_students" ON users
  FOR SELECT USING (
    get_user_role() = 'parent'
    AND id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid())
  );
CREATE POLICY "parent_read_attendance" ON attendance
  FOR SELECT USING (
    get_user_role() = 'parent'
    AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid())
  );
CREATE POLICY "parent_read_grade_reports" ON grade_reports
  FOR SELECT USING (
    get_user_role() = 'parent'
    AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid())
  );
CREATE POLICY "parent_read_submissions" ON submissions
  FOR SELECT USING (
    get_user_role() = 'parent'
    AND student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid())
  );
CREATE POLICY "parent_manage_feedback" ON feedback
  FOR ALL USING (
    get_user_role() = 'parent' AND parent_id = auth.uid()
  );
CREATE POLICY "parent_manage_leave_requests" ON leave_requests
  FOR ALL USING (
    get_user_role() = 'parent' AND parent_id = auth.uid()
  );
CREATE POLICY "parent_read_own_payments" ON payments
  FOR SELECT USING (
    get_user_role() = 'parent' AND user_id = auth.uid()
  );
CREATE POLICY "parent_read_own_link" ON parent_students
  FOR SELECT USING (parent_id = auth.uid());
