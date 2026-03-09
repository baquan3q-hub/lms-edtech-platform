-- =========================================================================
--  THIẾT LẬP DATABASE BẢNG "HỌC LIỆU SỐ" (KHÓA HỌC / BÀI GIẢNG / BÀI TẬP)
-- =========================================================================

-- 1. Xóa các bảng cũ nếu tồn tại để tránh lỗi schema cữ
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;

-- 2. Bảng Lessons (Bài giảng)
-- Mỗi bài giảng thuộc về 1 lớp học (Class)
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,                                  -- Nội dung (Rich text/Markdown)
    video_url TEXT,                                -- Link Youtube/Cloudflare R2
    "order" INTEGER NOT NULL DEFAULT 0,            -- Thứ tự bài giảng trong lớp
    published_at TIMESTAMPTZ,                      -- Null tức là bản Nháp (Draft)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng Assignments (Bài tập)
-- Một bài tập có thể được giao độc lập hoặc đính kèm vào một Bài giảng
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL, -- Tùy chọn, có thể không thuộc bài giảng nào
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('quiz', 'essay', 'upload')), -- Trắc nghiệm, Tự luận, hoặc Upload file
    deadline TIMESTAMPTZ,                          -- Ngày hết hạn nộp
    max_score INTEGER DEFAULT 100,
    ai_graded BOOLEAN DEFAULT false,               -- Cờ đánh dấu có cho phép AI chấm hay không
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bảng Questions (Ngân hàng câu hỏi cho dạng Quiz)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                         -- Nội dung câu hỏi
    options JSONB,                                 -- Mảng chứa các lựa chọn trả lời (A,B,C,D...) cho Quiz
    correct_answer TEXT,                           -- Đáp án đúng để máy tự chấm
    points INTEGER DEFAULT 10,                     -- Điểm số của câu hỏi này
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Bảng Submissions (Bài nộp của học sinh)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    answers_data JSONB,                            -- Chứa mảng đáp án học sinh nhập/chọn (cho Quiz/Essay)
    content_url TEXT,                              -- Chứa link file đính kèm nếu assignment type = 'upload'
    score INTEGER,                                 -- Điểm số
    feedback TEXT,                                 -- Lời nhận xét
    graded_by UUID REFERENCES public.users(id),    -- Người chấm điểm (G/v hoặc NULL nếu AI/Máy chấm)
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(assignment_id, student_id)              -- Mỗi học sinh chỉ được nộp 1 bài cho mỗi bài tập (nếu muốn nộp nhiều lần thì bỏ Cờ này)
);

-- =========================================================================
-- TẠO CHỈ MỤC (INDEX) CHO HIỆU SUẤT TÌM KIẾM
-- =========================================================================
CREATE INDEX IF NOT EXISTS lessons_class_id_idx ON public.lessons(class_id);
CREATE INDEX IF NOT EXISTS assignments_lesson_id_idx ON public.assignments(lesson_id);
CREATE INDEX IF NOT EXISTS assignments_class_id_idx ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS questions_assignment_id_idx ON public.questions(assignment_id);
CREATE INDEX IF NOT EXISTS submissions_student_id_idx ON public.submissions(student_id);

-- Trigger cập nhật updated_at tự động (giả định hàm handle_updated_at đã có sẵn từ SQL trước)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
        CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
    END IF;
END $$;

-- =========================================================================
-- BẢO MẬT (ROW LEVEL SECURITY)
-- =========================================================================

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Hàm hỗ trợ kiểm tra Giáo viên của Lớp (Tái sử dụng)
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(target_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM classes c WHERE c.id = target_class_id AND c.teacher_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hàm hỗ trợ kiểm tra Học sinh có ghi danh Lớp (Tái sử dụng)
CREATE OR REPLACE FUNCTION public.is_student_in_class(target_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM enrollments e WHERE e.class_id = target_class_id AND e.student_id = auth.uid() AND e.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-------------------------------------------------------------------------
-- POLICIES CHO LESSONS
-------------------------------------------------------------------------
-- Admin: Full access
CREATE POLICY "Admin can full access lessons" ON public.lessons FOR ALL TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
-- Teacher: Full access các bài giảng thuộc về lớp mình quản lý
CREATE POLICY "Teacher can manage their lessons" ON public.lessons FOR ALL TO authenticated USING (
    is_teacher_of_class(class_id)
);
-- Student: Chỉ đọc (SELECT) các bài giảng ĐÃ XUẤT BẢN của lớp mình đang học
CREATE POLICY "Student can view published lessons" ON public.lessons FOR SELECT TO authenticated USING (
    published_at IS NOT NULL AND is_student_in_class(class_id)
);

-------------------------------------------------------------------------
-- POLICIES CHO ASSIGNMENTS
-------------------------------------------------------------------------
-- Admin: Full access
CREATE POLICY "Admin can full access assignments" ON public.assignments FOR ALL TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
-- Teacher: Full access các bài tập trong lớp mình dạy
CREATE POLICY "Teacher can manage assignments" ON public.assignments FOR ALL TO authenticated USING (
    is_teacher_of_class(class_id)
);
-- Student: Chỉ xem các bài tập (KHÔNG nháp) thuộc lớp mình đang học
CREATE POLICY "Student can view published assignments" ON public.assignments FOR SELECT TO authenticated USING (
    status != 'draft' AND is_student_in_class(class_id)
);

-------------------------------------------------------------------------
-- POLICIES CHO QUESTIONS
-------------------------------------------------------------------------
-- (Áp dụng ké điều kiện class_id từ bảng assignments bên trên thông qua subquery)
-- Admin: Full access
CREATE POLICY "Admin can full access questions" ON public.questions FOR ALL TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
-- Teacher: Full access do câu hỏi gắn với assignment thuộc lớp giáo viên
CREATE POLICY "Teacher can manage questions" ON public.questions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = questions.assignment_id AND is_teacher_of_class(a.class_id))
);
-- Student: Chỉ được đọc nếu bài tập chứa nó đang mở cho học viên
CREATE POLICY "Student can view questions" ON public.questions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = questions.assignment_id AND a.status != 'draft' AND is_student_in_class(a.class_id))
);

-------------------------------------------------------------------------
-- POLICIES CHO SUBMISSIONS
-------------------------------------------------------------------------
-- Admin: Full access
CREATE POLICY "Admin can full access submissions" ON public.submissions FOR ALL TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
-- Teacher: Có thể xem và cập nhật điểm cho bài tập của lớp mình
CREATE POLICY "Teacher can grade submissions" ON public.submissions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = submissions.assignment_id AND is_teacher_of_class(a.class_id))
);
-- Student: Chỉ được phép SELECT bài NỘP CỦA CHÍNH MÌNH (và INSERT bài của mình)
CREATE POLICY "Student can view own submissions" ON public.submissions FOR SELECT TO authenticated USING (
    submissions.student_id = auth.uid()
);
CREATE POLICY "Student can submit own assignments" ON public.submissions FOR INSERT TO authenticated WITH CHECK (
    submissions.student_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = submissions.assignment_id AND a.status = 'published' AND is_student_in_class(a.class_id) AND (a.deadline IS NULL OR a.deadline > now()))
);
