-- ==========================================
-- PHASE 20: NOTIFICATIONS SYSTEM
-- ==========================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'attendance', 'absence_request', 'system', v.v.
    link TEXT, -- URL để click chuyển đến màn hình tương ứng
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "admin_full_access" ON notifications;
CREATE POLICY "admin_full_access" ON notifications
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Users can only see and update their own notifications
DROP POLICY IF EXISTS "user_read_own_notifications" ON notifications;
CREATE POLICY "user_read_own_notifications" ON notifications
FOR SELECT USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "user_update_own_notifications" ON notifications;
CREATE POLICY "user_update_own_notifications" ON notifications
FOR UPDATE USING (
    user_id = auth.uid()
);

-- Enable Realtime
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications; 
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;
