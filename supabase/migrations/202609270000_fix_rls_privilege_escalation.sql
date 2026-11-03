-- =====================================================================
-- VÁ LỖ HỔNG LEO THANG ĐẶC QUYỀN (PRIVILEGE ESCALATION) TRONG RLS
-- =====================================================================
-- VẤN ĐỀ:
--   Các policy RLS trước đây tin vào `auth.jwt() -> 'user_metadata' ->> 'role'`.
--   Trường `user_metadata` do CHÍNH người dùng ghi được từ phía browser
--   (supabase.auth.updateUser({ data: { role: 'admin' } })). Vì vậy bất kỳ
--   tài khoản học sinh/phụ huynh nào cũng có thể tự nâng mình thành 'admin'
--   và giành toàn quyền đọc/ghi trên public.users cùng nhiều bảng khác.
--
-- CÁCH VÁ:
--   Nguồn chuẩn (ground truth) của vai trò là bảng public.users, không phải JWT.
--   Hàm public.get_user_role() được định nghĩa lại để đọc từ public.users.
--   Toàn bộ policy phụ thuộc metadata được tạo lại theo nguồn chuẩn này.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. HÀM TRỢ GIÚP LẤY VAI TRÒ TỪ NGUỒN CHUẨN
-- ---------------------------------------------------------------------
-- SECURITY DEFINER giúp hàm bỏ qua RLS của public.users, nhờ đó tránh
-- đệ quy vô hạn khi chính policy của public.users gọi tới hàm này.
-- search_path được ghim cố định để chống tấn công chiếm quyền qua schema.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_role() IS
'Trả về vai trò của người dùng hiện tại, đọc từ bảng public.users (nguồn chuẩn). Tuyệt đối không đọc từ user_metadata vì trường đó do client tự ghi được.';

-- Hàm kiểm tra quyền quản trị, dùng chung cho mọi policy
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS
'Kiểm tra người dùng hiện tại có vai trò admin/super_admin theo bảng public.users.';

-- Hàm kiểm tra thành viên của một trường học cụ thể
CREATE OR REPLACE FUNCTION public.is_school_member(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.school_memberships
        WHERE user_id = auth.uid()
          AND school_id = p_school_id
          AND status = 'active'
    );
$$;

COMMENT ON FUNCTION public.is_school_member(UUID) IS
'Kiểm tra người dùng hiện tại có là thành viên đang hoạt động của trường học chỉ định.';

-- ---------------------------------------------------------------------
-- 2. POLICY TRÊN public.users
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on users" ON public.users;
CREATE POLICY "Admin full access on users" ON public.users
    FOR ALL TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Teachers can read all users" ON public.users;
CREATE POLICY "Teachers can read all users" ON public.users
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'teacher');

-- ---------------------------------------------------------------------
-- 3. CHẶN TỰ NÂNG QUYỀN Ở TẦNG DỮ LIỆU (DEFENSE IN DEPTH)
-- ---------------------------------------------------------------------
-- Ngay cả khi một policy tương lai bị cấu hình sai, trigger này vẫn ngăn
-- người dùng thường tự sửa cột `role` của chính mình. Thao tác qua
-- service_role (admin client phía server) không bị ảnh hưởng vì auth.uid()
-- là NULL trong ngữ cảnh đó.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Bỏ qua khi không có phiên người dùng (service_role / migration / seed)
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Chỉ admin/super_admin được phép đổi vai trò, và không được tự đổi của chính mình
        IF NEW.id = auth.uid() THEN
            RAISE EXCEPTION 'Không được phép tự thay đổi vai trò của chính mình.'
                USING ERRCODE = '42501';
        END IF;

        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION 'Chỉ quản trị viên được phép thay đổi vai trò người dùng.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_self_role_escalation
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_escalation();

-- ---------------------------------------------------------------------
-- 4. POLICY TRÊN public.schools
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own schools" ON public.schools;
CREATE POLICY "Users can read own schools" ON public.schools
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.school_memberships sm
            WHERE sm.school_id = schools.id AND sm.user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------
-- 5. POLICY DANH MỤC HỌC VỤ K12 (Phase 2)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    DROP POLICY IF EXISTS "academic_years_read_school" ON public.academic_years;
    CREATE POLICY "academic_years_read_school" ON public.academic_years
        FOR SELECT TO authenticated
        USING (public.is_platform_admin() OR public.is_school_member(academic_years.school_id));

    DROP POLICY IF EXISTS "terms_read_school" ON public.terms;
    CREATE POLICY "terms_read_school" ON public.terms
        FOR SELECT TO authenticated
        USING (public.is_platform_admin() OR public.is_school_member(terms.school_id));

    DROP POLICY IF EXISTS "grade_levels_read_school" ON public.grade_levels;
    CREATE POLICY "grade_levels_read_school" ON public.grade_levels
        FOR SELECT TO authenticated
        USING (public.is_platform_admin() OR public.is_school_member(grade_levels.school_id));

    DROP POLICY IF EXISTS "subjects_read_school" ON public.subjects;
    CREATE POLICY "subjects_read_school" ON public.subjects
        FOR SELECT TO authenticated
        USING (public.is_platform_admin() OR public.is_school_member(subjects.school_id));
END $$;

-- ---------------------------------------------------------------------
-- 6. POLICY HỒ SƠ LỚP & PHÂN CÔNG (Phase 2 Rosters)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    DROP POLICY IF EXISTS "homerooms_read_school" ON public.homerooms;
    CREATE POLICY "homerooms_read_school" ON public.homerooms
        FOR SELECT TO authenticated
        USING (public.is_platform_admin() OR public.is_school_member(homerooms.school_id));

    DROP POLICY IF EXISTS "homeroom_enrollments_read_school" ON public.homeroom_enrollments;
    CREATE POLICY "homeroom_enrollments_read_school" ON public.homeroom_enrollments
        FOR SELECT TO authenticated
        USING (
            public.is_platform_admin()
            OR student_id = auth.uid()
            OR public.is_school_member(homeroom_enrollments.school_id)
        );

    DROP POLICY IF EXISTS "class_teachers_read_school" ON public.class_teacher_assignments;
    CREATE POLICY "class_teachers_read_school" ON public.class_teacher_assignments
        FOR SELECT TO authenticated
        USING (
            public.is_platform_admin()
            OR teacher_id = auth.uid()
            OR public.is_school_member(class_teacher_assignments.school_id)
        );
END $$;

-- ---------------------------------------------------------------------
-- 7. POLICY ĐỊNH DANH & NHẬP LIỆU (Phase 3 Identity Import)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    DROP POLICY IF EXISTS "student_identifiers_read" ON public.student_identifiers;
    CREATE POLICY "student_identifiers_read" ON public.student_identifiers
        FOR SELECT TO authenticated
        USING (
            public.is_platform_admin()
            OR public.get_user_role() = 'teacher'
            OR user_id = auth.uid()
            OR public.is_school_member(student_identifiers.school_id)
        );

    DROP POLICY IF EXISTS "guardian_identifiers_read" ON public.guardian_identifiers;
    CREATE POLICY "guardian_identifiers_read" ON public.guardian_identifiers
        FOR SELECT TO authenticated
        USING (
            public.is_platform_admin()
            OR public.get_user_role() = 'teacher'
            OR user_id = auth.uid()
            OR public.is_school_member(guardian_identifiers.school_id)
        );

    -- Bản ghi kích hoạt chứa hash mã kích hoạt: chỉ admin và chính chủ được đọc
    DROP POLICY IF EXISTS "account_activations_read" ON public.account_activations;
    CREATE POLICY "account_activations_read" ON public.account_activations
        FOR SELECT TO authenticated
        USING (public.is_platform_admin() OR user_id = auth.uid());

    DROP POLICY IF EXISTS "import_jobs_admin" ON public.import_jobs;
    CREATE POLICY "import_jobs_admin" ON public.import_jobs
        FOR ALL TO authenticated
        USING (public.is_platform_admin())
        WITH CHECK (public.is_platform_admin());

    DROP POLICY IF EXISTS "import_rows_admin" ON public.import_rows;
    CREATE POLICY "import_rows_admin" ON public.import_rows
        FOR ALL TO authenticated
        USING (public.is_platform_admin())
        WITH CHECK (public.is_platform_admin());
END $$;
