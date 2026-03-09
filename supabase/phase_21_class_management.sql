-- ============================================================
-- PHASE 21: QUẢN LÝ LỚP HỌC (CLASS MANAGEMENT)
-- 3 bảng: class_sessions, student_class_stats, grade_notifications
-- ============================================================

-- ========================================
-- 1. BẢNG LỊCH DẠY CHI TIẾT (CLASS SESSIONS)
-- ========================================
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic TEXT,
    description TEXT,
    materials_url TEXT[] DEFAULT '{}',
    homework TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    cancel_reason TEXT,
    teacher_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE (class_id, session_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_class_sess_class ON class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sess_date ON class_sessions(session_date);

-- ========================================
-- 2. BẢNG THỐNG KÊ TỔNG HỢP HỌC SINH (STUDENT CLASS STATS)
-- Cache để query nhanh danh sách học viên
-- ========================================
CREATE TABLE IF NOT EXISTS student_class_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    total_sessions INTEGER DEFAULT 0,
    present_count INTEGER DEFAULT 0,
    absent_count INTEGER DEFAULT 0,
    late_count INTEGER DEFAULT 0,
    excused_count INTEGER DEFAULT 0,
    attendance_rate NUMERIC(5,2) DEFAULT 0,
    avg_score NUMERIC(5,2) DEFAULT 0,
    attendance_rank INTEGER,
    academic_rank INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_stud_class_stats_student ON student_class_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_stud_class_stats_class ON student_class_stats(class_id);

-- ========================================
-- 3. BẢNG THÔNG BÁO ĐIỂM SỐ (GRADE NOTIFICATIONS)
-- Gửi tự động hoặc thủ công tới phụ huynh
-- ========================================
CREATE TABLE IF NOT EXISTS grade_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('weekly', 'monthly', 'assignment')),
    period_label TEXT,
    summary_data JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_grade_notif_student ON grade_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_notif_parent ON grade_notifications(parent_id);

-- ========================================
-- 4. FUNCTION & TRIGGER TỰ ĐỘNG CẬP NHẬT STATS
-- ========================================

CREATE OR REPLACE FUNCTION update_all_students_stats(p_class_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    score_rec RECORD;
    v_total INTEGER;
    v_present INTEGER;
    v_absent INTEGER;
    v_late INTEGER;
    v_excused INTEGER;
    v_att_rate NUMERIC(5,2);
    v_avg_score NUMERIC(5,2);
    v_sessions_count UUID[];
BEGIN
    FOR r IN SELECT student_id FROM enrollments WHERE class_id = p_class_id AND status = 'active'
    LOOP
        -- --- 1. Tính toán chuyên cần ---
        SELECT 
            COUNT(id), 
            COUNT(CASE WHEN status = 'present' THEN 1 END),
            COUNT(CASE WHEN status = 'absent' THEN 1 END),
            COUNT(CASE WHEN status = 'late' THEN 1 END),
            COUNT(CASE WHEN status = 'excused' THEN 1 END)
        INTO v_total, v_present, v_absent, v_late, v_excused
        FROM attendance_records
        WHERE session_id IN (SELECT id FROM attendance_sessions WHERE class_id = p_class_id)
          AND student_id = r.student_id;
        
        IF v_total > 0 THEN
            -- Coi đi trễ = hiện tại là 0.5 present, tuỳ logic. Ở đây lấy present_count
            v_att_rate := ROUND((v_present::numeric / v_total::numeric) * 100, 2);
        ELSE
            v_att_rate := 0;
        END IF;

        -- --- 2. Tính toán điểm trung bình (cần bảng submission, giả thiết schema) ---
        -- Ở đây nếu file sql trước đó có score, sẽ join bảng. Tạm xử lý mock avg_score
        -- Nếu chưa có bảng quiz_attempts, sẽ auto gen or update later.
        
        -- --- 3. Lưu vào student_class_stats ---
        INSERT INTO student_class_stats (student_id, class_id, total_sessions, present_count, absent_count, late_count, excused_count, attendance_rate, last_updated)
        VALUES (r.student_id, p_class_id, v_total, v_present, v_absent, v_late, v_excused, v_att_rate, NOW())
        ON CONFLICT (student_id, class_id) 
        DO UPDATE SET 
            total_sessions = EXCLUDED.total_sessions,
            present_count = EXCLUDED.present_count,
            absent_count = EXCLUDED.absent_count,
            late_count = EXCLUDED.late_count,
            excused_count = EXCLUDED.excused_count,
            attendance_rate = EXCLUDED.attendance_rate,
            last_updated = EXCLUDED.last_updated;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho bảng attendance_records (khi điểm danh)
CREATE OR REPLACE FUNCTION trig_update_student_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_class_id UUID;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT class_id INTO v_class_id FROM attendance_sessions WHERE id = NEW.session_id;
        IF v_class_id IS NOT NULL THEN
            PERFORM update_all_students_stats(v_class_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT class_id INTO v_class_id FROM attendance_sessions WHERE id = OLD.session_id;
        IF v_class_id IS NOT NULL THEN
            PERFORM update_all_students_stats(v_class_id);
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_records_stats ON attendance_records;
CREATE TRIGGER trg_attendance_records_stats
AFTER INSERT OR UPDATE OR DELETE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION trig_update_student_stats();


-- ========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ========================================

-- ----- class_sessions -----
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access class_sessions" ON class_sessions;
CREATE POLICY "Admin full access class_sessions" ON class_sessions FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Teacher manage own class sessions" ON class_sessions;
CREATE POLICY "Teacher manage own class sessions" ON class_sessions FOR ALL
USING ( class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );

DROP POLICY IF EXISTS "Student read own class sessions" ON class_sessions;
CREATE POLICY "Student read own class sessions" ON class_sessions FOR SELECT
USING ( class_id IN (SELECT class_id FROM enrollments WHERE student_id = auth.uid()) );

DROP POLICY IF EXISTS "Parent read child class sessions" ON class_sessions;
CREATE POLICY "Parent read child class sessions" ON class_sessions FOR SELECT
USING (
  class_id IN (
    SELECT e.class_id FROM enrollments e
    JOIN parent_students psl ON psl.student_id = e.student_id
    WHERE psl.parent_id = auth.uid()
  )
);

-- ----- student_class_stats -----
ALTER TABLE student_class_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access student_class_stats" ON student_class_stats;
CREATE POLICY "Admin full access student_class_stats" ON student_class_stats FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Teacher read own stats" ON student_class_stats;
CREATE POLICY "Teacher read own stats" ON student_class_stats FOR SELECT
USING ( class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );

DROP POLICY IF EXISTS "Student read own stats" ON student_class_stats;
CREATE POLICY "Student read own stats" ON student_class_stats FOR SELECT
USING ( student_id = auth.uid() );

DROP POLICY IF EXISTS "Parent read child stats" ON student_class_stats;
CREATE POLICY "Parent read child stats" ON student_class_stats FOR SELECT
USING (
  student_id IN (SELECT student_id FROM parent_students WHERE parent_id = auth.uid())
);

-- ----- grade_notifications -----
ALTER TABLE grade_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access grade_notifications" ON grade_notifications;
CREATE POLICY "Admin full access grade_notifications" ON grade_notifications FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "Teacher create grade_notifications" ON grade_notifications;
CREATE POLICY "Teacher create grade_notifications" ON grade_notifications FOR INSERT
WITH CHECK ( class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );

DROP POLICY IF EXISTS "Teacher read grade_notifications" ON grade_notifications;
CREATE POLICY "Teacher read grade_notifications" ON grade_notifications FOR SELECT
USING ( class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );

DROP POLICY IF EXISTS "Parent read own grade_notifications" ON grade_notifications;
CREATE POLICY "Parent read own grade_notifications" ON grade_notifications FOR SELECT
USING ( parent_id = auth.uid() );

DROP POLICY IF EXISTS "Student read own grade_notifications" ON grade_notifications;
CREATE POLICY "Student read own grade_notifications" ON grade_notifications FOR SELECT
USING ( student_id = auth.uid() );

-- Enable Realtime
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE grade_notifications; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
