-- ============================================================
-- PHASE 19: HỆ THỐNG ĐIỂM DANH (ATTENDANCE SYSTEM)
-- 3 bảng: attendance_sessions, attendance_records, absence_requests
-- ============================================================

-- ========================================
-- 1. BẢNG PHIÊN ĐIỂM DANH (ATTENDANCE SESSIONS)
-- Mỗi buổi học = 1 session
-- ========================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id    UUID REFERENCES users(id),
  session_date  DATE NOT NULL,
  start_time    TIME,
  end_time      TIME,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Mỗi lớp chỉ có 1 buổi điểm danh / ngày
  UNIQUE (class_id, session_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_att_sessions_class ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_att_sessions_teacher ON attendance_sessions(teacher_id);

-- ========================================
-- 2. BẢNG CHI TIẾT ĐIỂM DANH (ATTENDANCE RECORDS)
-- Trạng thái từng học sinh trong 1 session
-- ========================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note          TEXT,
  marked_by     UUID REFERENCES users(id),
  marked_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_by    UUID REFERENCES users(id),
  updated_at    TIMESTAMPTZ,

  -- Mỗi học sinh chỉ có 1 record / session
  UNIQUE (session_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_att_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_records_student ON attendance_records(student_id);

-- ========================================
-- 3. BẢNG ĐƠN XIN NGHỈ (ABSENCE REQUESTS)
-- Phụ huynh gửi, Giáo viên duyệt
-- ========================================
CREATE TABLE IF NOT EXISTS absence_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID NOT NULL REFERENCES users(id),
  student_id      UUID NOT NULL REFERENCES users(id),
  class_id        UUID NOT NULL REFERENCES classes(id),
  absence_date    DATE NOT NULL,
  reason          TEXT NOT NULL,
  attachment_url  TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_abs_requests_parent ON absence_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_abs_requests_student ON absence_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_abs_requests_class ON absence_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_abs_requests_date ON absence_requests(absence_date);
CREATE INDEX IF NOT EXISTS idx_abs_requests_status ON absence_requests(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ----- attendance_sessions -----
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access attendance_sessions" ON attendance_sessions;
CREATE POLICY "Admin full access attendance_sessions" ON attendance_sessions FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Teacher manage own class sessions" ON attendance_sessions;
CREATE POLICY "Teacher manage own class sessions" ON attendance_sessions FOR ALL
USING ( teacher_id = auth.uid() OR class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );

DROP POLICY IF EXISTS "Student read own class sessions" ON attendance_sessions;
CREATE POLICY "Student read own class sessions" ON attendance_sessions FOR SELECT
USING (
  class_id IN (
    SELECT class_id FROM enrollments WHERE student_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Parent read child class sessions" ON attendance_sessions;
CREATE POLICY "Parent read child class sessions" ON attendance_sessions FOR SELECT
USING (
  class_id IN (
    SELECT e.class_id FROM enrollments e
    JOIN parent_students psl ON psl.student_id = e.student_id
    WHERE psl.parent_id = auth.uid()
  )
);

-- ----- attendance_records -----
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access attendance_records" ON attendance_records;
CREATE POLICY "Admin full access attendance_records" ON attendance_records FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Teacher manage own class records" ON attendance_records;
CREATE POLICY "Teacher manage own class records" ON attendance_records FOR ALL
USING (
  session_id IN (
    SELECT id FROM attendance_sessions
    WHERE teacher_id = auth.uid()
      OR class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Student read own records" ON attendance_records;
CREATE POLICY "Student read own records" ON attendance_records FOR SELECT
USING ( student_id = auth.uid() );

DROP POLICY IF EXISTS "Parent read child records" ON attendance_records;
CREATE POLICY "Parent read child records" ON attendance_records FOR SELECT
USING (
  student_id IN (
    SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
  )
);

-- ----- absence_requests -----
ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access absence_requests" ON absence_requests;
CREATE POLICY "Admin full access absence_requests" ON absence_requests FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Teacher view and review absence_requests" ON absence_requests;
CREATE POLICY "Teacher view and review absence_requests" ON absence_requests FOR ALL
USING (
  class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Parent manage own absence_requests" ON absence_requests;
CREATE POLICY "Parent manage own absence_requests" ON absence_requests FOR ALL
USING ( parent_id = auth.uid() );

DROP POLICY IF EXISTS "Student view own absence_requests" ON absence_requests;
CREATE POLICY "Student view own absence_requests" ON absence_requests FOR SELECT
USING ( student_id = auth.uid() );

-- ============================================================
-- ENABLE REALTIME (cho notifications)
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE absence_requests; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
