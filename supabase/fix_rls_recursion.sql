-- ============================================================
-- SCRIPT SỬA LỖI INFINITE RECURSION TRÊN BẢNG CLASSES & ENROLLMENTS
-- ============================================================
-- Hành động: Copy và chạy script này trong cửa sổ SQL Editor của Supabase
-- Vấn đề cũ: Bảng classes và enrollments query chéo lẫn nhau trong RLS
-- Giải pháp: Dùng hàm SECURITY DEFINER để bypass RLS cấp thấp.

-- 1. Xóa các Policy cũ gây lỗi khóa vòng (Infinite recursion)
DROP POLICY IF EXISTS "Teacher read own classes" ON public.classes;
DROP POLICY IF EXISTS "Student read own classes" ON public.classes;
DROP POLICY IF EXISTS "Teacher read class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Student read own enrollments" ON public.enrollments;

-- 2. Tạo policy mới sử dụng hàm an toàn

-- Giáo viên đọc lớp mình dạy (Đơn giản, không cần subquery)
CREATE POLICY "Teacher read own classes" ON public.classes FOR SELECT TO authenticated USING (
    teacher_id = auth.uid()
);

-- Học sinh đọc các lớp mình có tham gia 
-- Dùng hàm public.is_student_in_class (SECURITY DEFINER) để không bị kẹt lặp RLS với bảng enrollments
CREATE POLICY "Student read own classes" ON public.classes FOR SELECT TO authenticated USING (
    public.is_student_in_class(id)
);

-- Giáo viên đọc danh sách học sinh enroll vào CÁC LỚP MÌNH DẠY 
-- Dùng public.is_teacher_of_class (SECURITY DEFINER) để không bị kẹt lặp RLS với bảng classes
CREATE POLICY "Teacher read class enrollments" ON public.enrollments FOR SELECT TO authenticated USING (
    public.is_teacher_of_class(class_id)
);

-- Học sinh chỉ đọc danh sách enroll CỦA MÌNH
CREATE POLICY "Student read own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (
    student_id = auth.uid()
);
