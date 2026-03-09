-- PHASE 9: QUẢN LÝ PHÒNG HỌC VÀ LỊCH HỌC

-- 1. Bảng Phòng học
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- vd: "Phòng 101", "Phòng 202"
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng Lịch học cấu trúc cụ thể cho từng lớp
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bật RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Các Policy đơn giản (API Server Actions sẽ bypass hoặc có check authorization chi tiết)
DO $$ 
BEGIN
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
