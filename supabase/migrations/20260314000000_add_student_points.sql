-- Navigation: Database > Migrations > 20260314000000_add_student_points.sql
-- Description: Create table for tracking student points (rewards/penalties)

CREATE TABLE IF NOT EXISTS public.student_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points SMALLINT NOT NULL,
    reason TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('attendance', 'participation', 'behavior', 'homework', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bật RLS
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;

-- Policy: Admin có toàn quyền
CREATE POLICY "Admins have full access to student_points" ON public.student_points
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Policy: Giáo viên có thể xem/thêm/sửa/xoá điểm của học sinh trong lớp mình dạy
CREATE POLICY "Teachers can manage points for their classes" ON public.student_points
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = student_points.class_id AND classes.teacher_id = auth.uid()
        )
    );

-- Policy: Học sinh chỉ có thể xem điểm của chính mình
CREATE POLICY "Students can view their own points" ON public.student_points
    FOR SELECT
    USING (
        student_id = auth.uid()
    );

-- Policy: Phụ huynh có thể xem điểm của con mình
CREATE POLICY "Parents can view their children's points" ON public.student_points
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.parent_students
            WHERE parent_students.student_id = student_points.student_id AND parent_students.parent_id = auth.uid()
        )
    );

-- Index để tối ưu hoá việc query theo lớp và học sinh
CREATE INDEX IF NOT EXISTS student_points_class_id_idx ON public.student_points(class_id);
CREATE INDEX IF NOT EXISTS student_points_student_id_idx ON public.student_points(student_id);
CREATE INDEX IF NOT EXISTS student_points_teacher_id_idx ON public.student_points(teacher_id);
