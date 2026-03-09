-- ==========================================
-- PHASE 15: MỞ RỘNG BẢNG PROFILES (THÔNG TIN CÁ NHÂN)
-- ==========================================

DO $$
BEGIN
    -- Thêm các trường chung
    BEGIN ALTER TABLE profiles ADD COLUMN gender TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN phone_number TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Thêm các trường riêng cho Student
    BEGIN ALTER TABLE profiles ADD COLUMN grade_level TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN school_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Thêm các trường riêng cho Teacher
    BEGIN ALTER TABLE profiles ADD COLUMN subject_specialty TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN years_of_experience INT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    -- Thêm các trường riêng cho Parent
    BEGIN ALTER TABLE profiles ADD COLUMN occupation TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 2. Tạo function tự động thêm profile khi tạo user nếu cần (hoặc dùng trigger hiện tại nếu có)
-- Lưu ý: hiện tại user được tạo thông qua Supabase Auth và quản lý bên bảng users, 
-- profile có thể được lazy-create khi update lần đầu.

-- 3. Cập nhật lại RLS policies cho bảng profiles (nếu cần thiết)
-- Chính sách hiện tại:
-- CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (user_id = auth.uid());
-- CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (user_id = auth.uid());
-- CREATE POLICY "admin_full_access" ON profiles FOR ALL USING (get_user_role() = 'admin');

-- Nếu muốn user tự INSERT (lazy create) profile của chính mình:
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles 
    FOR INSERT WITH CHECK (user_id = auth.uid());
