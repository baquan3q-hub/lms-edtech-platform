-- ==========================================
-- PHASE 14: HỆ THỐNG PHỤ HUYNH - HỌC SINH
-- ==========================================

-- 1. Tạo bảng parent_students nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- 2. Thêm cột relationship và is_primary vào parent_students
DO $$
BEGIN
    BEGIN ALTER TABLE parent_students ADD COLUMN relationship TEXT DEFAULT 'Phụ huynh';
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN ALTER TABLE parent_students ADD COLUMN is_primary BOOLEAN DEFAULT true;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 3. Thêm cột invite_code vào bảng users (cho học sinh)
DO $$
BEGIN
    BEGIN ALTER TABLE users ADD COLUMN invite_code TEXT UNIQUE;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN ALTER TABLE users ADD COLUMN invite_code_expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 4. Index cho performance
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code) WHERE invite_code IS NOT NULL;

-- 5. Tắt RLS cho parent_students (admin client dùng service_role key bypass RLS)
ALTER TABLE parent_students DISABLE ROW LEVEL SECURITY;
