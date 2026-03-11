-- Hỗ trợ nộp bài nhiều lần cho Homework
-- Chạy trong Supabase SQL Editor

-- Thay vì xóa ràng buộc mức bảng, chúng ta thêm cột để theo dõi số lần nộp và lịch sử.
-- Ràng buộc UNIQUE(homework_id, student_id) vẫn được GIỮ NGUYÊN để đảm bảo
-- mỗi học sinh chỉ có 1 row per homework, tương thích với hàm .single() mặc định.
-- Tuy nhiên, dữ liệu cũ mỗi lần resubmit sẽ được đẩy vào attempt_history.

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE homework_submissions ADD COLUMN attempts INTEGER DEFAULT 1;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE homework_submissions ADD COLUMN attempt_history JSONB DEFAULT '[]'::jsonb;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;
