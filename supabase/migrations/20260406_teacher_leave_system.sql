-- =============================================
-- Migration: Teacher Leave System + Teaching Status Tracking
-- Date: 2026-04-06
-- =============================================

-- =============================================
-- 1. NEW TABLE: teacher_leave_requests
-- Đơn xin nghỉ dạy của giáo viên
-- =============================================
CREATE TABLE IF NOT EXISTS teacher_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
    leave_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_action TEXT CHECK (admin_action IN ('substitute', 'reschedule', 'cancel')),
    substitute_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    makeup_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
    admin_note TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_leave_teacher ON teacher_leave_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_leave_status ON teacher_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_teacher_leave_date ON teacher_leave_requests(leave_date);
CREATE INDEX IF NOT EXISTS idx_teacher_leave_class ON teacher_leave_requests(class_id);

-- RLS 
ALTER TABLE teacher_leave_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Admin full access
CREATE POLICY "admin_full_access_teacher_leave" ON teacher_leave_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Teacher can read own + insert own
CREATE POLICY "teacher_read_own_leave" ON teacher_leave_requests
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "teacher_insert_own_leave" ON teacher_leave_requests
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "teacher_delete_own_pending_leave" ON teacher_leave_requests
    FOR DELETE USING (teacher_id = auth.uid() AND status = 'pending');

-- Comments
COMMENT ON TABLE teacher_leave_requests IS 'Đơn xin nghỉ dạy của giáo viên';
COMMENT ON COLUMN teacher_leave_requests.admin_action IS 'Quyết định Admin: substitute (gán GV thay), reschedule (dạy bù), cancel (huỷ buổi)';
COMMENT ON COLUMN teacher_leave_requests.substitute_teacher_id IS 'GV dạy thay khi Admin chọn substitute';
COMMENT ON COLUMN teacher_leave_requests.makeup_session_id IS 'Buổi học bù khi Admin chọn reschedule';

-- =============================================
-- 2. ALTER TABLE: class_sessions — Thêm cột tracking
-- =============================================

-- teaching_status: trạng thái dạy thực tế
ALTER TABLE class_sessions 
    ADD COLUMN IF NOT EXISTS teaching_status TEXT DEFAULT 'pending' 
        CHECK (teaching_status IN ('pending', 'taught', 'cancelled', 'substitute'));

-- actual_teacher_id: GV thực sự dạy buổi đó (null = chưa dạy hoặc GV chính)
ALTER TABLE class_sessions 
    ADD COLUMN IF NOT EXISTS actual_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- taught_at: thời điểm GV xác nhận điểm danh (để admin thấy rõ)
ALTER TABLE class_sessions 
    ADD COLUMN IF NOT EXISTS taught_at TIMESTAMPTZ;

-- is_makeup: buổi học bù
ALTER TABLE class_sessions 
    ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN DEFAULT FALSE;

-- original_session_id: reference đến buổi gốc bị cancel (nếu là buổi bù)
ALTER TABLE class_sessions 
    ADD COLUMN IF NOT EXISTS original_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_sessions_teaching_status ON class_sessions(teaching_status);
CREATE INDEX IF NOT EXISTS idx_class_sessions_actual_teacher ON class_sessions(actual_teacher_id);

-- Comments
COMMENT ON COLUMN class_sessions.teaching_status IS 'pending=chưa dạy, taught=đã dạy (GV xác nhận ĐD), cancelled=huỷ, substitute=GV thay dạy';
COMMENT ON COLUMN class_sessions.actual_teacher_id IS 'GV thực sự dạy buổi này (set khi saveAttendanceRecords)';
COMMENT ON COLUMN class_sessions.taught_at IS 'Thời điểm GV xác nhận lưu điểm danh — dùng cho admin tracking';
COMMENT ON COLUMN class_sessions.is_makeup IS 'TRUE nếu là buổi học bù';
COMMENT ON COLUMN class_sessions.original_session_id IS 'Buổi gốc bị cancel khi đây là buổi bù';
