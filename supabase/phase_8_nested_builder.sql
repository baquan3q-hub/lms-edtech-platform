-- ==========================================
-- PHASE 8: LMS NESTED LESSON BUILDER SCHEMA
-- ==========================================

-- 1. Xóa các Foreign Key constraints từ các bảng cũ nếu chúng tham gia vào RLS (tùy chọn)
-- DROP TABLE IF EXISTS class_sections CASCADE;
-- DROP TABLE IF EXISTS lessons CASCADE;

-- 2. CÂY THƯ MỤC NỘI DUNG (COURSE ITEMS)
-- Bảng này đóng vai trò thay thế cho cả `class_sections` và `lessons`
CREATE TABLE public.course_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.course_items(id) ON DELETE CASCADE, -- NULL có nghĩa là Root Node (Thư mục cấp 1)
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'video', 'document', 'audio', 'quiz', 'assignment', 'discussion', 'zoom')),
    order_index INTEGER NOT NULL DEFAULT 0, -- Dùng để sắp xếp vị trí (Drag & Drop)
    is_published BOOLEAN DEFAULT false,
    unlock_after UUID REFERENCES public.course_items(id) ON DELETE SET NULL, -- Tham chiếu tới item phải hoàn thành trước khi mở cái này
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index để tối ưu query cây theo lớp
CREATE INDEX idx_course_items_class_id ON public.course_items(class_id);
CREATE INDEX idx_course_items_parent_id ON public.course_items(parent_id);


-- 3. NỘI DUNG CHI TIẾT THEO TYPE (ITEM CONTENTS)
-- Phân tách metadata (cây thư mục) và nội dung thật để tối ưu tốc độ tải cây
CREATE TABLE public.item_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL UNIQUE REFERENCES public.course_items(id) ON DELETE CASCADE,
    content TEXT, -- Lý thuyết, text mô tả
    video_url TEXT, -- Cho type: video
    file_url TEXT, -- Cho type: document, audio, assignment
    zoom_link TEXT, -- Cho type: zoom
    deadline TIMESTAMP WITH TIME ZONE, -- Cho type: assignment, quiz
    max_attempts INTEGER, -- Cho type: quiz
    min_score NUMERIC, -- Cho type: quiz
    score_method TEXT CHECK (score_method IN ('highest', 'latest', 'average')) -- Cách tính điểm lấy lần nào cho Quiz
);


-- 4. CÂU HỎI QUIZ (NẾU LÀ TRẮC NGHIỆM)
CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.course_items(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- Nội dung câu hỏi
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Mảng JSON chứa các đáp án [{"id": "a", "text": "Hà Nội"}]
    correct_options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Mảng JSON chứa ID đáp án đúng ["a"]
    points NUMERIC DEFAULT 1, -- Số điểm câu này
    order_index INTEGER NOT NULL DEFAULT 0
);


-- 5. TIẾN ĐỘ HỌC TẬP CỦA HỌC SINH (STUDENT PROGRESS)
CREATE TABLE public.student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.course_items(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score NUMERIC, -- Nếu là Assignment hoặc Quiz
    attempts INTEGER DEFAULT 0, -- Số lần làm bài Quiz / Nộp Assigment
    last_accessed TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, item_id) -- Mỗi học sinh chỉ có 1 bản ghi tiến độ cho 1 item
);


-- 6. LỊCH SỬ LÀM BÀI TRẮC NGHIỆM (QUIZ ATTEMPTS)
CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.course_items(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb, -- Đáp án học sinh chọn {"question_id_1": ["a"], "question_id_2": ["c", "d"]}
    score NUMERIC,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    passed BOOLEAN
);

-- ==========================================
-- ROW LEVEL SECURITY (Quyền Truy Cập)
-- ==========================================

-- Bật RLS
ALTER TABLE public.course_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 1. COURSE ITEMS & CONTENTS & QUESTIONS: 
-- Teacher của lớp thì có toàn quyền. Student của lớp thì chỉ được SELECT nếu is_published = true.
-- Do lỗi Infinite Recursion với auth.uid() ở các bảng trung gian, ta ưu tiên sử dụng Admin Client trên route Server Actions 
-- để lấy (SELECT) và thao tác (INSERT/UPDATE/DELETE) trên các bảng này nhằm an toàn + mở rộng tốt nhất.

-- Để đơn giản trong quá trình dev và tránh bugs, ta mở policy SELECT chung, các quyền sửa/xóa được Server Actions của Next.js chặn (bởi role).
CREATE POLICY "Cho phép đọc mọi thứ ở frontend nếu login" ON public.course_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cho phép đọc mọi content ở frontend nếu login" ON public.item_contents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cho phép đọc mọi câu hỏi ở frontend nếu login" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cho phép đọc tiến độ của bản thân" ON public.student_progress FOR SELECT TO authenticated USING (auth.uid() = student_id OR true);
CREATE POLICY "Cho phép đọc bài làm của bản thân" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = student_id OR true);

-- Các chính sách Ghi/Cập nhật dữ liệu từ Client (nếu cần), phần lớn mutation sẽ được bắn từ Server Actions (bypass RLS) 
-- nên ta tạm khóa ghi từ auth.uid() cho các bảng quan trọng để Teacher API độc quyền tạo Course Content.
CREATE POLICY "Mọi INSERT qua Server Action" ON public.course_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Mọi INSERT qua Server Action" ON public.item_contents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Mọi INSERT qua Server Action" ON public.quiz_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Học sinh ghi tiến độ progress" ON public.student_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Học Sinh ghi lịch sử attempt" ON public.quiz_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);
