-- ================================================================
-- Phase 29: Announcement Reads + Extended Announcement Scope
-- ================================================================

-- 1. Mở rộng announcements table để hỗ trợ đa phạm vi
-- scope: 'class' (mặc định), 'course' (toàn khóa), 'system' (toàn hệ thống), 'individual' (cá nhân)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'class';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_user_ids UUID[] DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'teacher';

-- 2. Bảng tracking đọc + xác nhận thông báo
CREATE TABLE IF NOT EXISTS announcement_reads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at    TIMESTAMPTZ,  -- Thời điểm PH bấm "Đã xem"
    UNIQUE(announcement_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_scope ON announcements(scope);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by_role ON announcements(created_by_role);

-- 3. RLS Policies cho announcement_reads
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "admin_full_access_reads" ON announcement_reads;
CREATE POLICY "admin_full_access_reads" ON announcement_reads
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- User: tạo và xem record đọc của chính mình
DROP POLICY IF EXISTS "user_manage_own_reads" ON announcement_reads;
CREATE POLICY "user_manage_own_reads" ON announcement_reads
FOR ALL USING (
    user_id = auth.uid()
);

-- Teacher: xem ai đã đọc thông báo mình tạo
DROP POLICY IF EXISTS "teacher_view_reads" ON announcement_reads;
CREATE POLICY "teacher_view_reads" ON announcement_reads
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM announcements
        WHERE announcements.id = announcement_reads.announcement_id
        AND announcements.teacher_id = auth.uid()
    )
);

-- 4. Cập nhật RLS cho announcements để admin có thể tạo thông báo
-- (Giữ nguyên policies cũ, thêm mới cho admin scope)
DROP POLICY IF EXISTS "admin_manage_announcements" ON announcements;
CREATE POLICY "admin_manage_announcements" ON announcements
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- 5. Enable Realtime cho bảng mới
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE announcement_reads; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
