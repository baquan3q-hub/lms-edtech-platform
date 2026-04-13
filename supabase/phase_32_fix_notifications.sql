-- ================================================================
-- Phase 32: Fix notifications table — mở rộng type + thêm metadata
-- ================================================================

-- 1. Xoá CHECK constraint cũ trên cột 'type' (chỉ cho phép info/warning/success/error)
--    Các module mới cần dùng: announcement, survey, attendance, absence_request, 
--    attendance_completed, attendance_report, grade, review, feedback, leave...
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Thêm cột metadata (JSONB) nếu chưa có — để lưu thông tin bổ sung
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Đổi cột 'read' (nếu seed.sql dùng) sang 'is_read' (phase_20 dùng) 
--    Đảm bảo cả hai trường hợp đều hoạt động
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'read'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
    END IF;
END $$;

-- 4. Đảm bảo cột link tồn tại
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
