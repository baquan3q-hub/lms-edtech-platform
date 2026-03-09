-- Chạy lệnh này trên Supabase SQL Editor nếu bạn gặp lỗi "status does not exist" ở phần Lớp học

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'));
