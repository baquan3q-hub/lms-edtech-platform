-- =========================================================================
-- LMS EDTECH PLATFORM - DỮ LIỆU TEST MẪU ĐẦY ĐỦ ĐỂ QUAY VIDEO DEMO
-- File: supabase/seed_demo_showcase.sql
-- Mô tả: Kịch bản SQL khởi tạo toàn diện tài khoản học sinh, lớp học,
--       học liệu, bài tập, bài thi, điểm danh, hóa đơn học phí và liên kết phụ huynh.
-- Mật khẩu chung cho tất cả tài khoản test: DemoPassword123@
-- =========================================================================

-- 1. TRƯỜNG HỌC (Schools)
INSERT INTO public.schools (id, code, name, address, phone, email, status, ai_enabled)
VALUES 
  ('00000000-0000-0000-0001-000000000000', 'THCS-NDU', 'Trường THCS Nguyễn Du (Pilot)', '44 Hàng Quạt, Hoàn Kiếm, Hà Nội', '02438255555', 'c2nguyendu@hoankiem.edu.vn', 'active', true),
  ('00000000-0000-0000-0002-000000000000', 'THCS-CVA', 'Trường THCS Chu Văn An (Đối chiếu)', '17 Thụy Khuê, Tây Hồ, Hà Nội', '02438472222', 'c2chuvanan@tayho.edu.vn', 'active', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  status = EXCLUDED.status, 
  ai_enabled = EXCLUDED.ai_enabled;

-- 2. TÀI KHOẢN NGƯỜI DÙNG (public.users)
-- Lưu ý: Supabase Auth được quản trị qua schema auth.users. Các ID dưới đây khớp với auth.users.
INSERT INTO public.users (id, email, role, full_name, phone, created_at)
VALUES
  -- Super Admin
  ('e36631d0-cc6f-4a31-ba67-6485eff7232b', 'superadmin@demo.com', 'admin', 'Super Admin Hệ Thống', '0901000000', now()),
  ('55f1012a-375d-467f-b13d-5de7ca725a46', 'boiquan401@gmail.com', 'admin', 'Bùi Anh Quân (Super Admin)', '0901000001', now()),
  
  -- School Admin
  ('1edd9a19-3675-42ea-b038-da029caff4e6', 'admin.chuvanan@demo.com', 'admin', 'Admin THCS Chu Văn An', '0901000002', now()),

  -- Giáo viên (Teacher)
  ('8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', 'teacher@demo.com', 'teacher', 'Thầy Bùi Anh Quân', '0902000001', now()),

  -- Học sinh (Students)
  ('b25677eb-146c-4a4a-a153-44a7bc58a624', 'student@demo.com', 'student', 'Lê Quốc Bảo (Học sinh mẫu)', '0903000001', now()),
  ('9349ef03-17a6-4b99-ad68-0b051515a122', 'demo.student@eduschool.vn', 'student', 'Nguyễn Hoàng Nam (HS Giỏi)', '0903000002', now()),
  ('f9e5aec4-77c3-487b-8321-c2f87cfd8120', 'student01@example.com', 'student', 'Nguyễn Minh Anh', '0903000011', now()),
  ('e3a2ff37-a435-4e12-8ab6-61a64b6e6fa0', 'student02@example.com', 'student', 'Trần Gia Huy', '0903000012', now()),
  ('429635cc-c938-4024-b399-395461163f74', 'student03@example.com', 'student', 'Lê Khánh Linh', '0903000013', now()),
  ('389291d2-dbd5-445c-8f38-f58a54110354', 'hocsinh1@example.com', 'student', 'Trần Thanh Xuân', '0903000005', now()),

  -- Phụ huynh (Parents)
  ('cc254cb6-2c75-4e19-8c7d-dd0f55bc5e73', 'parent@demo.com', 'parent', 'Phạm Phụ Huynh', '0904000001', now()),
  ('79b93905-0b50-44b6-9b02-4a6a301c8912', 'parent01@example.com', 'parent', 'Nguyễn Văn Nam (Phụ huynh)', '0904000011', now())
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 3. MÃ HỌC SINH ĐỊNH DANH (student_identifiers)
-- Ràng buộc Unique là: (school_id, student_code)
INSERT INTO public.student_identifiers (school_id, user_id, student_code, status, updated_at)
VALUES
  ('00000000-0000-0000-0001-000000000000', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'HS001', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', '9349ef03-17a6-4b99-ad68-0b051515a122', 'HS999', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', 'f9e5aec4-77c3-487b-8321-c2f87cfd8120', 'HS011', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', 'e3a2ff37-a435-4e12-8ab6-61a64b6e6fa0', 'HS012', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', '429635cc-c938-4024-b399-395461163f74', 'HS013', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', '389291d2-dbd5-445c-8f38-f58a54110354', 'HS005', 'active', now())
ON CONFLICT (school_id, student_code) DO UPDATE SET 
  user_id = EXCLUDED.user_id,
  status = 'active';

-- 4. KÍCH HOẠT TÀI KHOẢN (account_activations - Đánh dấu status='used' để vào thẳng Dashboard)
-- Khóa chính: id
INSERT INTO public.account_activations (id, school_id, user_id, activation_token_hash, status, attempts_count, max_attempts, expires_at)
VALUES
  ('00000000-0000-0040-0000-000000000001', '00000000-0000-0000-0001-000000000000', 'b25677eb-146c-4a4a-a153-44a7bc58a624', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'used', 0, 5, now() + interval '365 days'),
  ('00000000-0000-0040-0000-000000000002', '00000000-0000-0000-0001-000000000000', '9349ef03-17a6-4b99-ad68-0b051515a122', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'used', 0, 5, now() + interval '365 days'),
  ('00000000-0000-0040-0000-000000000003', '00000000-0000-0000-0001-000000000000', 'f9e5aec4-77c3-487b-8321-c2f87cfd8120', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'used', 0, 5, now() + interval '365 days'),
  ('00000000-0000-0040-0000-000000000004', '00000000-0000-0000-0001-000000000000', 'e3a2ff37-a435-4e12-8ab6-61a64b6e6fa0', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'used', 0, 5, now() + interval '365 days'),
  ('00000000-0000-0040-0000-000000000005', '00000000-0000-0000-0001-000000000000', '429635cc-c938-4024-b399-395461163f74', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'used', 0, 5, now() + interval '365 days'),
  ('00000000-0000-0040-0000-000000000006', '00000000-0000-0000-0001-000000000000', '389291d2-dbd5-445c-8f38-f58a54110354', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'used', 0, 5, now() + interval '365 days')
ON CONFLICT (id) DO UPDATE SET status = 'used';

-- Cập nhật tất cả các activation record khác của các user này về 'used'
UPDATE public.account_activations 
SET status = 'used'
WHERE user_id IN (
  'b25677eb-146c-4a4a-a153-44a7bc58a624',
  '9349ef03-17a6-4b99-ad68-0b051515a122',
  'f9e5aec4-77c3-487b-8321-c2f87cfd8120',
  'e3a2ff37-a435-4e12-8ab6-61a64b6e6fa0',
  '429635cc-c938-4024-b399-395461163f74',
  '389291d2-dbd5-445c-8f38-f58a54110354'
);

-- 5. THÀNH VIÊN TRƯỜNG HỌC (school_memberships)
-- Ràng buộc Unique: (school_id, user_id, role)
INSERT INTO public.school_memberships (school_id, user_id, role, status, updated_at)
VALUES
  ('00000000-0000-0000-0001-000000000000', '55f1012a-375d-467f-b13d-5de7ca725a46', 'admin', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', 'teacher', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'student', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', '9349ef03-17a6-4b99-ad68-0b051515a122', 'student', 'active', now()),
  ('00000000-0000-0000-0001-000000000000', 'cc254cb6-2c75-4e19-8c7d-dd0f55bc5e73', 'parent', 'active', now()),
  ('00000000-0000-0000-0002-000000000000', '1edd9a19-3675-42ea-b038-da029caff4e6', 'admin', 'active', now())
ON CONFLICT (school_id, user_id, role) DO UPDATE SET status = 'active';

-- 6. LIÊN KẾT PHỤ HUYNH - HỌC SINH (parent_students - Phụ huynh xem được con em)
INSERT INTO public.parent_students (id, parent_id, student_id, relationship, is_primary, school_id, verification_status, valid_from)
VALUES
  ('00000000-0000-0002-0000-000000000991', 'cc254cb6-2c75-4e19-8c7d-dd0f55bc5e73', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified', '2026-09-01'),
  ('00000000-0000-0002-0000-000000000992', 'cc254cb6-2c75-4e19-8c7d-dd0f55bc5e73', '9349ef03-17a6-4b99-ad68-0b051515a122', 'Bố', false, '00000000-0000-0000-0001-000000000000', 'verified', '2026-09-01')
ON CONFLICT (id) DO UPDATE SET verification_status = 'verified';

-- 7. GHI DANH LỚP HỌC (enrollments)
-- Lớp K01.02 (Tiếng Anh Giao Tiếp) & Lớp 12A1 (Toán Học Nâng Cao)
INSERT INTO public.enrollments (student_id, class_id, status, enrolled_at)
VALUES
  ('b25677eb-146c-4a4a-a153-44a7bc58a624', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'active', '2026-09-01T08:00:00Z'),
  ('b25677eb-146c-4a4a-a153-44a7bc58a624', 'b2a07705-e044-4197-b7c2-7d6c4282492c', 'active', '2026-09-01T08:00:00Z'),
  ('9349ef03-17a6-4b99-ad68-0b051515a122', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'active', '2026-09-01T08:00:00Z'),
  ('9349ef03-17a6-4b99-ad68-0b051515a122', 'b2a07705-e044-4197-b7c2-7d6c4282492c', 'active', '2026-09-01T08:00:00Z'),
  ('f9e5aec4-77c3-487b-8321-c2f87cfd8120', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'active', '2026-09-01T08:00:00Z'),
  ('e3a2ff37-a435-4e12-8ab6-61a64b6e6fa0', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'active', '2026-09-01T08:00:00Z'),
  ('429635cc-c938-4024-b399-395461163f74', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'active', '2026-09-01T08:00:00Z')
ON CONFLICT (student_id, class_id) DO UPDATE SET status = 'active';

-- 8. BUỔI HỌC & ĐIỂM DANH (class_sessions & attendance_records)
INSERT INTO public.class_sessions (id, class_id, session_number, session_date, start_time, end_time, topic, description, status, teaching_status)
VALUES
  ('00000000-0000-0050-0000-000000000101', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 1, '2026-09-26', '08:00', '09:30', 'Unit 1: Introductions & Daily Conversations', 'Luyện tập phát âm chuẩn IPA và các mẫu câu giao tiếp đời sống.', 'completed', 'completed'),
  ('00000000-0000-0050-0000-000000000102', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 2, '2026-09-27', '08:00', '09:30', 'Unit 2: Expressing Opinions & Debating', 'Phương pháp trình bày quan điểm cá nhân trong tranh biện tiếng Anh.', 'completed', 'completed'),
  ('00000000-0000-0050-0000-000000000103', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 3, '2026-09-29', '08:00', '09:30', 'Unit 3: Presentation Skills & Body Language', 'Kỹ năng thuyết trình trước đám đông và sử dụng ngôn ngữ cơ thể hiệu quả.', 'scheduled', 'scheduled')
ON CONFLICT (id) DO UPDATE SET topic = EXCLUDED.topic, status = EXCLUDED.status;

INSERT INTO public.attendance_records (id, session_id, student_id, status, note, marked_by, marked_at, school_id)
VALUES
  ('00000000-0000-0060-0000-000000000201', '00000000-0000-0050-0000-000000000101', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'present', 'Đi học đúng giờ, hăng hái phát biểu xây dựng bài', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', '2026-09-26T08:05:00Z', '00000000-0000-0000-0001-000000000000'),
  ('00000000-0000-0060-0000-000000000202', '00000000-0000-0050-0000-000000000102', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'present', 'Có mặt đầy đủ, hoàn thành tốt bài tập nhóm', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', '2026-09-27T08:02:00Z', '00000000-0000-0000-0001-000000000000')
ON CONFLICT (id) DO NOTHING;

-- 9. HỌC LIỆU BÀI GIẢNG E-LEARNING (lessons)
INSERT INTO public.lessons (id, class_id, title, content, video_url, "order", published_at, lesson_type)
VALUES
  ('00000000-0000-0070-0000-000000000301', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'Bài 1: Tổng quan ngữ âm IPA & Chiến lược nghe phản xạ', '<p>Trong bài học này, chúng ta sẽ cùng nắm vững 44 âm trong bảng phiên âm quốc tế IPA và cách áp dụng vào nghe nói thực tế.</p>', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, '2026-09-10T00:00:00Z', 'video'),
  ('00000000-0000-0070-0000-000000000302', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'Bài 2: Bộ tài liệu từ vựng theo chủ đề Teen Life (PDF)', '<p>Tài liệu tổng hợp 120 từ vựng cốt lõi thường xuất hiện trong các đề thi và giao tiếp học đường.</p>', null, 2, '2026-09-15T00:00:00Z', 'document')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- 10. BÀI TẬP VỀ NHÀ & NỘP BÀI (homework & homework_submissions)
INSERT INTO public.homework (id, class_id, title, description, total_points, due_date, is_published, publication_status, created_by, school_id)
VALUES
  ('00000000-0000-0080-0000-000000000401', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'Bài tập tuần 1: Ghi âm đoạn hội thoại giới thiệu bản thân', 'Quay video hoặc ghi âm 2 phút giới thiệu sở thích và ước mơ tương lai bằng tiếng Anh.', 10, '2026-09-25T23:59:00Z', true, 'published', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', '00000000-0000-0000-0001-000000000000'),
  ('00000000-0000-0080-0000-000000000402', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'Bài tập tuần 2: Viết luận ngắn - Lợi ích của AI trong học tập', 'Viết bài luận 150-200 từ nêu quan điểm về việc ứng dụng Trí tuệ nhân tạo trong trường học.', 10, '2026-09-28T23:59:00Z', true, 'published', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', '00000000-0000-0000-0001-000000000000'),
  ('00000000-0000-0080-0000-000000000403', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'Bài tập tuần 3: Đọc hiểu văn bản học thuật & trả lời câu hỏi', 'Đọc bài báo đính kèm về Biến đổi khí hậu và hoàn thành 5 câu hỏi phân tích.', 10, '2026-10-02T23:59:00Z', true, 'published', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', '00000000-0000-0000-0001-000000000000')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Bài 1: Đã được giáo viên chấm 9.5 (grading_status: 'published')
INSERT INTO public.homework_submissions (id, homework_id, student_id, answers, score, feedback, status, grading_status, submitted_at, graded_at, graded_by)
VALUES
  ('00000000-0000-0081-0000-000000000501', '00000000-0000-0080-0000-000000000401', 'b25677eb-146c-4a4a-a153-44a7bc58a624', '{"text": "Em xin nộp file ghi âm giới thiệu bản thân."}'::jsonb, 9.5, 'Phát âm rất rõ ràng, ngữ điệu tự nhiên, từ vựng phong phú! Thầy khen ngợi tinh thần chuẩn bị chu đáo.', 'graded', 'published', '2026-09-24T15:30:00Z', '2026-09-25T10:00:00Z', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d')
ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, feedback = EXCLUDED.feedback, grading_status = 'published';

-- Bài 2: Đã nộp, Chờ chấm điểm (Dành cho việc demo vai trò Giáo viên chấm bài - grading_status: 'ungraded')
INSERT INTO public.homework_submissions (id, homework_id, student_id, answers, score, feedback, status, grading_status, submitted_at)
VALUES
  ('00000000-0000-0081-0000-000000000502', '00000000-0000-0080-0000-000000000402', 'b25677eb-146c-4a4a-a153-44a7bc58a624', '{"text": "AI helps students learn at their own pace and explore creative ideas..."}'::jsonb, null, null, 'submitted', 'ungraded', '2026-09-27T09:15:00Z')
ON CONFLICT (id) DO UPDATE SET status = 'submitted', grading_status = 'ungraded';

-- 11. ĐỀ KIỂM TRA & NỘP BÀI THI (exams & exam_submissions)
INSERT INTO public.exams (id, class_id, title, description, questions, duration_minutes, total_points, is_published, publication_status, created_by, school_id)
VALUES
  ('00000000-0000-0090-0000-000000000601', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 'Đề kiểm tra Khảo sát Năng lực Tiếng Anh Đầu năm (45 phút)', 'Đánh giá 4 kỹ năng Nghe - Đọc hiểu - Ngữ pháp - Từ vựng theo chuẩn Cambridge K12.', '[{"id": 1, "question": "Choose the correct answer", "options": ["A", "B", "C", "D"], "answer": "A"}]'::jsonb, 45, 10, true, 'published', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', '00000000-0000-0000-0001-000000000000')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.exam_submissions (id, exam_id, student_id, answers, score, total_points, started_at, submitted_at, time_taken_seconds, grading_status, ai_insight, school_id)
VALUES
  ('00000000-0000-0091-0000-000000000701', '00000000-0000-0090-0000-000000000601', 'b25677eb-146c-4a4a-a153-44a7bc58a624', '{"1": "A"}'::jsonb, 9.0, 10, '2026-09-20T08:00:00Z', '2026-09-20T08:42:00Z', 2520, 'graded', 'Học sinh thể hiện tư duy logic xuất sắc, nắm chắc cấu trúc ngữ pháp thì hoàn thành. Cần củng cố thêm phần thành ngữ (idioms).', '00000000-0000-0000-0001-000000000000')
ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, ai_insight = EXCLUDED.ai_insight;

-- 12. HÓA ĐƠN HỌC PHÍ (invoices - 1 Hóa đơn Đã thanh toán, 1 Hóa đơn Chờ thanh toán)
INSERT INTO public.invoices (id, student_id, class_id, amount, status, due_date, paid_at, invoice_number, notes, school_id)
VALUES
  ('00000000-0000-0100-0000-000000000801', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 1500000, 'paid', '2026-09-10', '2026-09-05T14:20:00Z', 'HD-2026-09-001', 'Học phí Tháng 9/2026 - Đã thanh toán chuyển khoản VNPay QR', '00000000-0000-0000-0001-000000000000'),
  ('00000000-0000-0100-0000-000000000802', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', 1500000, 'pending', '2026-10-10', null, 'HD-2026-10-001', 'Học phí Tháng 10/2026 - Chờ phụ huynh thanh toán trực tuyến', '00000000-0000-0000-0001-000000000000')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- 13. MỤC TIÊU & THÓI QUEN HỌC SINH (student_habits & student_goals)
INSERT INTO public.student_habits (id, student_id, title, description, frequency, is_active)
VALUES
  ('00000000-0000-0110-0000-000000000901', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'Đọc tài liệu tiếng Anh 20 phút mỗi ngày', 'Luyện kỹ năng đọc hiểu và tăng vốn từ vựng học thuật', 'daily', true),
  ('00000000-0000-0110-0000-000000000902', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'Luyện tập 1 bài Quiz AI Gemini', 'Khắc phục các lỗ hổng kiến thức tuần qua', 'daily', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_goals (id, student_id, created_by, created_by_role, title, description, target_date, status)
VALUES
  ('00000000-0000-0120-0000-000000000911', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'b25677eb-146c-4a4a-a153-44a7bc58a624', 'student', 'Đạt điểm GPA môn Tiếng Anh trên 9.0 trong Học kỳ I', 'Quyết tâm giành học bổng học tập xuất sắc', '2026-12-31', 'in_progress')
ON CONFLICT (id) DO NOTHING;

-- 14. THÔNG BÁO NHÀ TRƯỜNG & LỚP HỌC (announcements)
INSERT INTO public.announcements (id, class_id, teacher_id, title, content, is_pinned, scope, created_by_role, school_id)
VALUES
  ('00000000-0000-0130-0000-000000000921', 'e9b99f10-8ae4-401d-b01c-12a2e6686b52', '8dd1fdc0-21bb-4cd5-a69d-a7fb75eeb75d', 'Kế hoạch học tập và Thi đánh giá năng lực Giữa kỳ I', 'Thầy thông báo lịch thi và nội dung trọng tâm ôn tập cho toàn thể học sinh lớp K01.02. Chúc các em ôn luyện thật tốt!', true, 'class', 'teacher', '00000000-0000-0000-0001-000000000000'),
  ('00000000-0000-0130-0000-000000000922', null, null, 'Chào mừng năm học mới 2026-2027 - Triển khai nền tảng LMS thông minh', 'Nhà trường chính thức đưa vào vận hành hệ thống EdTech LMS tích hợp Trợ lý Trí tuệ nhân tạo Gemini giúp nâng cao trải nghiệm học tập.', true, 'school', 'admin', '00000000-0000-0000-0001-000000000000')
ON CONFLICT (id) DO NOTHING;
