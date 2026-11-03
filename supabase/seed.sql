-- =========================================================================
-- LMS K12 PLATFORM - SEED DỮ LIỆU MẪU CHO TRƯỜNG THCS THÍ ĐIỂM
-- File: supabase/seed_thcs_pilot.sql
-- Mục đích: Dùng cho kiểm thử, staging và tái tạo môi trường độc lập.
-- Tiêu chuẩn: KHÔNG CHỨA DỮ LIỆU CÁ NHÂN THẬT (Anonymized / Synthetic Data)
-- Phạm vi: 1 Trường THCS, 2 năm học, khối 6-9, 2 lớp, 3 môn, 2 GV, 10 HS, 3 PH
-- =========================================================================

-- 1. USERS & PROFILES
-- IDs cố định để bảo đảm tính tất định (deterministic) khi seed

-- 1.1 Admin
INSERT INTO public.users (id, email, role, full_name, phone, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@thcs-pilot.edu.vn', 'admin', 'Quản trị viên THCS Nguyễn Du', '0900000001', now())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.profiles (id, user_id, bio, school_name, created_at)
VALUES 
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Quản trị hệ thống LMS K12', 'THCS Nguyễn Du', now())
ON CONFLICT (id) DO NOTHING;

-- 1.2 Giáo viên (2 giáo viên)
INSERT INTO public.users (id, email, role, full_name, phone, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000011', 'gv.toan.an@thcs-pilot.edu.vn', 'teacher', 'Nguyễn Văn An', '0900000011', now()),
  ('00000000-0000-0000-0000-000000000012', 'gv.van.mai@thcs-pilot.edu.vn', 'teacher', 'Trần Thị Mai', '0900000012', now())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.profiles (id, user_id, subject_specialty, years_of_experience, school_name, created_at)
VALUES 
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000011', 'Toán học', 8, 'THCS Nguyễn Du', now()),
  ('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-000000000012', 'Ngữ văn', 6, 'THCS Nguyễn Du', now())
ON CONFLICT (id) DO NOTHING;

-- 1.3 Học sinh (10 học sinh)
INSERT INTO public.users (id, email, role, full_name, phone, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000101', 'hs001@thcs-pilot.edu.vn', 'student', 'Lê Quốc Bảo', '0900000101', now()),
  ('00000000-0000-0000-0000-000000000102', 'hs002@thcs-pilot.edu.vn', 'student', 'Phạm Thùy Linh', '0900000102', now()),
  ('00000000-0000-0000-0000-000000000103', 'hs003@thcs-pilot.edu.vn', 'student', 'Hoàng Minh Đức', '0900000103', now()),
  ('00000000-0000-0000-0000-000000000104', 'hs004@thcs-pilot.edu.vn', 'student', 'Vũ Thu Trang', '0900000104', now()),
  ('00000000-0000-0000-0000-000000000105', 'hs005@thcs-pilot.edu.vn', 'student', 'Đặng Tuấn Kiệt', '0900000105', now()),
  ('00000000-0000-0000-0000-000000000106', 'hs006@thcs-pilot.edu.vn', 'student', 'Bùi Gia Hưng', '0900000106', now()),
  ('00000000-0000-0000-0000-000000000107', 'hs007@thcs-pilot.edu.vn', 'student', 'Đỗ Khánh Vy', '0900000107', now()),
  ('00000000-0000-0000-0000-000000000108', 'hs008@thcs-pilot.edu.vn', 'student', 'Ngô Phương Thảo', '0900000108', now()),
  ('00000000-0000-0000-0000-000000000109', 'hs009@thcs-pilot.edu.vn', 'student', 'Phan Anh Tuấn', '0900000109', now()),
  ('00000000-0000-0000-0000-000000000110', 'hs010@thcs-pilot.edu.vn', 'student', 'Trịnh Hải Nam', '0900000110', now())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.profiles (id, user_id, grade_level, school_name, date_of_birth, created_at)
VALUES 
  ('00000000-0000-0000-0001-000000000101', '00000000-0000-0000-0000-000000000101', '6', 'THCS Nguyễn Du', '2014-03-15', now()),
  ('00000000-0000-0000-0001-000000000102', '00000000-0000-0000-0000-000000000102', '6', 'THCS Nguyễn Du', '2014-07-22', now()),
  ('00000000-0000-0000-0001-000000000103', '00000000-0000-0000-0000-000000000103', '6', 'THCS Nguyễn Du', '2014-11-05', now()),
  ('00000000-0000-0000-0001-000000000104', '00000000-0000-0000-0000-000000000104', '6', 'THCS Nguyễn Du', '2014-01-18', now()),
  ('00000000-0000-0000-0001-000000000105', '00000000-0000-0000-0000-000000000105', '6', 'THCS Nguyễn Du', '2014-09-30', now()),
  ('00000000-0000-0000-0001-000000000106', '00000000-0000-0000-0000-000000000106', '7', 'THCS Nguyễn Du', '2013-04-12', now()),
  ('00000000-0000-0000-0001-000000000107', '00000000-0000-0000-0000-000000000107', '7', 'THCS Nguyễn Du', '2013-08-25', now()),
  ('00000000-0000-0000-0001-000000000108', '00000000-0000-0000-0000-000000000108', '7', 'THCS Nguyễn Du', '2013-12-14', now()),
  ('00000000-0000-0000-0001-000000000109', '00000000-0000-0000-0000-000000000109', '7', 'THCS Nguyễn Du', '2013-06-03', now()),
  ('00000000-0000-0000-0001-000000000110', '00000000-0000-0000-0000-000000000110', '7', 'THCS Nguyễn Du', '2013-10-19', now())
ON CONFLICT (id) DO NOTHING;

-- 1.4 Phụ huynh (3 phụ huynh)
INSERT INTO public.users (id, email, role, full_name, phone, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000201', 'ph.hung.le@thcs-pilot.edu.vn', 'parent', 'Lê Quốc Hùng', '0900000201', now()),
  ('00000000-0000-0000-0000-000000000202', 'ph.tuan.pham@thcs-pilot.edu.vn', 'parent', 'Phạm Văn Tuấn', '0900000202', now()),
  ('00000000-0000-0000-0000-000000000203', 'ph.long.bui@thcs-pilot.edu.vn', 'parent', 'Bùi Văn Long', '0900000203', now())
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 1.5 Liên kết Phụ huynh - Học sinh (parent_students)
INSERT INTO public.parent_students (id, parent_id, student_id, relationship, is_primary, created_at)
VALUES 
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Bố', true, now()),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'Bố', true, now()),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', 'Bố', true, now()), -- Phụ huynh có 2 con
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000106', 'Bố', true, now())
ON CONFLICT (id) DO NOTHING;

-- 2. ACADEMIC CATALOG (Khóa học / Môn học)
-- 3 môn học: Toán THCS, Ngữ văn THCS, Tiếng Anh THCS
INSERT INTO public.courses (id, name, description, created_at)
VALUES 
  ('00000000-0000-0000-0010-000000000001', 'Toán học THCS', 'Chương trình môn Toán THCS theo khung chuẩn GDPT 2018', now()),
  ('00000000-0000-0000-0010-000000000002', 'Ngữ văn THCS', 'Chương trình môn Ngữ văn THCS theo khung chuẩn GDPT 2018', now()),
  ('00000000-0000-0000-0010-000000000003', 'Tiếng Anh THCS', 'Chương trình môn Tiếng Anh THCS theo khung chuẩn GDPT 2018', now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. PHÒNG HỌC (Rooms)
INSERT INTO public.rooms (id, name, capacity, room_type, status, created_at)
VALUES 
  ('00000000-0000-0000-0020-000000000001', 'Phòng 101 - Khối 6', 40, 'standard', 'active', now()),
  ('00000000-0000-0000-0020-000000000002', 'Phòng 201 - Khối 7', 40, 'standard', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- 4. LỚP HỌC (Classes)
-- 2 lớp môn mẫu: Lớp 6A1 (Môn Toán) và Lớp 7A1 (Môn Ngữ Văn)
INSERT INTO public.classes (id, name, course_id, teacher_id, room, max_students, status, created_at)
VALUES 
  ('00000000-0000-0000-0030-000000000001', 'Lớp 6A1 - Toán', '00000000-0000-0000-0010-000000000001', '00000000-0000-0000-0000-000000000011', 'Phòng 101 - Khối 6', 35, 'active', now()),
  ('00000000-0000-0000-0030-000000000002', 'Lớp 7A1 - Ngữ văn', '00000000-0000-0000-0010-000000000002', '00000000-0000-0000-0000-000000000012', 'Phòng 201 - Khối 7', 35, 'active', now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. GHI DANH HỌC VIÊN (Enrollments)
-- 5 học sinh vào Lớp 6A1
INSERT INTO public.enrollments (id, class_id, student_id, status, enrolled_at)
VALUES 
  ('00000000-0000-0000-0040-000000000001', '00000000-0000-0000-0030-000000000001', '00000000-0000-0000-0000-000000000101', 'active', now()),
  ('00000000-0000-0000-0040-000000000002', '00000000-0000-0000-0030-000000000001', '00000000-0000-0000-0000-000000000102', 'active', now()),
  ('00000000-0000-0000-0040-000000000003', '00000000-0000-0000-0030-000000000001', '00000000-0000-0000-0000-000000000103', 'active', now()),
  ('00000000-0000-0000-0040-000000000004', '00000000-0000-0000-0030-000000000001', '00000000-0000-0000-0000-000000000104', 'active', now()),
  ('00000000-0000-0000-0040-000000000005', '00000000-0000-0000-0030-000000000001', '00000000-0000-0000-0000-000000000105', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- 5 học sinh vào Lớp 7A1
INSERT INTO public.enrollments (id, class_id, student_id, status, enrolled_at)
VALUES 
  ('00000000-0000-0000-0040-000000000006', '00000000-0000-0000-0030-000000000002', '00000000-0000-0000-0000-000000000106', 'active', now()),
  ('00000000-0000-0000-0040-000000000007', '00000000-0000-0000-0030-000000000002', '00000000-0000-0000-0000-000000000107', 'active', now()),
  ('00000000-0000-0000-0040-000000000008', '00000000-0000-0000-0030-000000000002', '00000000-0000-0000-0000-000000000108', 'active', now()),
  ('00000000-0000-0000-0040-000000000009', '00000000-0000-0000-0030-000000000002', '00000000-0000-0000-0000-000000000109', 'active', now()),
  ('00000000-0000-0000-0040-000000000010', '00000000-0000-0000-0030-000000000002', '00000000-0000-0000-0000-000000000110', 'active', now())
ON CONFLICT (id) DO NOTHING;

-- 6. BUỔI HỌC VÀ LỊCH HỌC (Class Sessions & Attendance)
INSERT INTO public.class_sessions (id, class_id, session_date, title, created_at)
VALUES 
  ('00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0030-000000000001', current_date, 'Tiết 1-2: Số tự nhiên và phép cộng', now()),
  ('00000000-0000-0000-0050-000000000002', '00000000-0000-0000-0030-000000000002', current_date, 'Tiết 3-4: Đọc hiểu văn bản văn học', now())
ON CONFLICT (id) DO NOTHING;

-- Điểm danh mẫu cho buổi học 1
INSERT INTO public.attendance_records (id, session_id, student_id, status, notes, recorded_at)
VALUES 
  ('00000000-0000-0000-0060-000000000001', '00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0000-000000000101', 'present', 'Đúng giờ', now()),
  ('00000000-0000-0000-0060-000000000002', '00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0000-000000000102', 'present', 'Đúng giờ', now()),
  ('00000000-0000-0000-0060-000000000003', '00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0000-000000000103', 'late', 'Đến muộn 5 phút', now()),
  ('00000000-0000-0000-0060-000000000004', '00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0000-000000000104', 'present', 'Đúng giờ', now()),
  ('00000000-0000-0000-0060-000000000005', '00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0000-000000000105', 'excused', 'Nghỉ có phép từ phụ huynh', now())
ON CONFLICT (id) DO NOTHING;

-- 7. BÀI TẬP VỀ NHÀ (Homework & Submissions)
INSERT INTO public.homework (id, class_id, title, description, due_date, status, created_by, created_at)
VALUES 
  ('00000000-0000-0000-0070-000000000001', '00000000-0000-0000-0030-000000000001', 'Bài tập tuần 1: Ôn tập tập hợp số tự nhiên', 'Làm các bài tập 1, 2, 3 trang 12 SGK Toán 6', now() + interval '3 days', 'published', '00000000-0000-0000-0000-000000000011', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.homework_submissions (id, homework_id, student_id, content, score, feedback, status, submitted_at)
VALUES 
  ('00000000-0000-0000-0080-000000000001', '00000000-0000-0000-0070-000000000001', '00000000-0000-0000-0000-000000000101', 'Em đã hoàn thành các bài tập trong vở bài tập.', 9.0, 'Trình bày sạch đẹp, cách giải rõ ràng.', 'graded', now())
ON CONFLICT (id) DO NOTHING;

-- 8. ĐỀ KIỂM TRA ĐÁNH GIÁ NỘI BỘ (Exams & Submissions)
INSERT INTO public.exams (id, class_id, title, description, duration_minutes, total_points, is_published, created_by, created_at)
VALUES 
  ('00000000-0000-0000-0090-000000000001', '00000000-0000-0000-0030-000000000001', 'Kiểm tra 15 phút: Tập hợp và phần tử', 'Kiểm tra đánh giá nhanh sự hiểu bài trên lớp', 15, 10, true, '00000000-0000-0000-0000-000000000011', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.exam_submissions (id, exam_id, student_id, answers, score, total_points, started_at, submitted_at, time_taken_seconds, grading_status)
VALUES 
  ('00000000-0000-0000-0100-000000000001', '00000000-0000-0000-0090-000000000001', '00000000-0000-0000-0000-000000000101', '{"q1": "A", "q2": "C", "q3": "B"}'::jsonb, 10, 10, now() - interval '15 minutes', now(), 720, 'graded')
ON CONFLICT (id) DO NOTHING;

-- 9. THÔNG BÁO NHÀ TRƯỜNG (Announcements)
INSERT INTO public.announcements (id, title, content, author_id, priority, target_role, created_at)
VALUES 
  ('00000000-0000-0000-0110-000000000001', 'Thông báo khai giảng năm học mới', 'Chào mừng toàn thể thầy cô, phụ huynh và học sinh bước vào năm học mới 2026-2027.', '00000000-0000-0000-0000-000000000001', 'normal', 'all', now())
ON CONFLICT (id) DO NOTHING;
