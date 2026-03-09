-- Thêm cột Ghi chú vào bảng Lịch Học
ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS note TEXT;
