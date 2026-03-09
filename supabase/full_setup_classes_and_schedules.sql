-- ============================================================
-- SQL SCRIPT: DATABASE SCHEMA CHO KHÓA HỌC, LỚP HỌC & XẾP LỊCH
-- ============================================================
-- Hướng dẫn: Copy toàn bộ nội dung file này và chạy trong SQL Editor trên Supabase.
-- Script này bao gồm cả Bảng Lớp Học cũ (nếu chưa có) và các bảng Mới (Phòng học, Lịch học)

-- 1. Bật UUID extension mềm
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PHẦN 1: KHÓA HỌC & LỚP HỌC (Nền tảng)
-- ============================================================

-- Bảng courses: Khóa học / Môn học
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng classes: Lớp học cụ thể 
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  room TEXT,
  schedule JSONB,
  max_students INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')) 
);

-- Bảng enrollments: Ghi danh học viên
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  UNIQUE(student_id, class_id) 
);

-- ============================================================
-- PHẦN 2: QUẢN LÝ PHÒNG HỌC & LỊCH HỌC CHI TIẾT
-- ============================================================

-- Bảng Phòng học
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, 
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng Lịch học (Nối lớp học với phòng học theo ca)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), 
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ĐÁNH INDEX TỐI ƯU TRUY VẤN
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_classes_course_id ON public.classes(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON public.enrollments(class_id);

-- ============================================================
-- BẬT VÀ CẤU HÌNH BẢO MẬT RLS
-- ============================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Tạo các Policy cơ bản cho Admin & Teacher
DO $$ 
BEGIN
    -- Courses Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full courses' AND tablename = 'courses') THEN
        CREATE POLICY "Admin full courses" ON public.courses FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teacher read courses' AND tablename = 'courses') THEN
        CREATE POLICY "Teacher read courses" ON public.courses FOR SELECT USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' );
    END IF;

    -- Classes Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full classes' AND tablename = 'classes') THEN
        CREATE POLICY "Admin full classes" ON public.classes FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teacher read own classes' AND tablename = 'classes') THEN
        CREATE POLICY "Teacher read own classes" ON public.classes FOR SELECT USING ( teacher_id = auth.uid() );
    END IF;

    -- Enrollments Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full enrollments' AND tablename = 'enrollments') THEN
        CREATE POLICY "Admin full enrollments" ON public.enrollments FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teacher read class enrollments' AND tablename = 'enrollments') THEN
        CREATE POLICY "Teacher read class enrollments" ON public.enrollments FOR SELECT USING ( class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()) );
    END IF;

    -- Rooms & Schedules
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cho phép đọc phòng học' AND tablename = 'rooms') THEN
        CREATE POLICY "Cho phép đọc phòng học" ON public.rooms FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cho phép đọc lịch học' AND tablename = 'class_schedules') THEN
        CREATE POLICY "Cho phép đọc lịch học" ON public.class_schedules FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Mọi thao tác quản lý lịch' AND tablename = 'class_schedules') THEN
        CREATE POLICY "Mọi thao tác quản lý lịch" ON public.class_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Mọi thao tác quản lý phòng' AND tablename = 'rooms') THEN
        CREATE POLICY "Mọi thao tác quản lý phòng" ON public.rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Insert sẵn dữ liệu phòng học mẫu
INSERT INTO public.rooms (name, capacity) VALUES 
('Phòng 101', 30),
('Phòng 102', 30),
('Phòng 103 (Lab)', 20),
('Phòng 201', 40),
('Phòng 202', 40)
ON CONFLICT (name) DO NOTHING;
