-- Chạy lệnh này trên Supabase SQL Editor để thêm cột Tên Lớp (VD: "Lớp A1", "Lớp Nâng cao 1")

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS name TEXT;
