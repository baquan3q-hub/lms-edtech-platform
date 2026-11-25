-- API key tích hợp của trường: key ngẫu nhiên, DB chỉ giữ bản băm SHA-256.
-- Thay cho key cũ tính bằng sha256(salt ghi cứng + school_id + code), vốn ai biết
-- school_id và mã trường đều tự tính lại được và không thu hồi được.
CREATE TABLE IF NOT EXISTS public.school_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  key_prefix text NOT NULL CHECK (char_length(key_prefix) BETWEEN 8 AND 24),
  key_hash text NOT NULL UNIQUE CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Mỗi trường có tối đa một key còn hiệu lực; xoay vòng = thu hồi key cũ rồi tạo key mới.
CREATE UNIQUE INDEX IF NOT EXISTS school_api_keys_one_active
  ON public.school_api_keys(school_id) WHERE revoked_at IS NULL;

ALTER TABLE public.school_api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_api_keys FROM anon, authenticated;
GRANT SELECT ON public.school_api_keys TO authenticated;
GRANT ALL ON public.school_api_keys TO service_role;

-- Admin của trường chỉ xem được metadata key của trường mình. Ghi chỉ qua service role
-- (server action của Super Admin), nên không có policy INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS school_api_keys_admin_read ON public.school_api_keys;
CREATE POLICY school_api_keys_admin_read ON public.school_api_keys
  FOR SELECT TO authenticated
  USING (public.my_school_access(school_id, ARRAY['admin']));
