-- ============================================================
-- SEED DEMO ACCOUNTS
-- ============================================================
-- Chạy file này trên Supabase SQL Editor SAU KHI đã tạo
-- 4 user qua Authentication > Add User với email/password:
--   admin@demo.com / 123456
--   teacher@demo.com / 123456
--   student@demo.com / 123456
--   parent@demo.com / 123456
--
-- Sau đó copy UID từ Authentication > Users và thay vào bên dưới.
-- ============================================================

-- Thay các UUID bên dưới bằng UID thực từ Supabase Auth
-- Ví dụ: nếu admin@demo.com có UID = 'abc-123' thì thay '<ADMIN_UID>' = 'abc-123'

INSERT INTO users (id, email, role, full_name, phone) VALUES
  ('<ADMIN_UID>', 'admin@demo.com', 'admin', 'Nguyễn Admin', '0901000001'),
  ('<TEACHER_UID>', 'teacher@demo.com', 'teacher', 'Trần Giáo Viên', '0901000002'),
  ('<STUDENT_UID>', 'student@demo.com', 'student', 'Lê Học Sinh', '0901000003'),
  ('<PARENT_UID>', 'parent@demo.com', 'parent', 'Phạm Phụ Huynh', '0901000004')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;
