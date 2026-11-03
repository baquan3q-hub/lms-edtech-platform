-- =========================================================================
-- LMS K12 PLATFORM - MIGRATION M2: AUDIT, OUTBOX & IDEMPOTENCY
-- File: supabase/migrations/202609260002_audit_outbox_idempotency.sql
-- Mục đích: Đảm bảo độ tin cậy ghi dữ liệu, chống lặp thao tác nộp bài/thông báo
--           và lưu vết kiểm toán cho các hành động thay đổi dữ liệu nhạy cảm.
-- =========================================================================

-- 1. BẢNG AUDIT_EVENTS (Lưu vết kiểm toán hành vi nhạy cảm)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,                          -- ví dụ: 'grade.update', 'homework.submit', 'role.assign'
    entity_type TEXT NOT NULL,                     -- ví dụ: 'exam_submission', 'attendance_record'
    entity_id UUID NOT NULL,                       -- ID của thực thể bị thay đổi
    request_id TEXT,                               -- Trace ID phục vụ tương quan log
    ip_address TEXT,                               -- Địa chỉ IP của người thao tác (nếu có)
    before_state JSONB,                            -- Trạng thái trước khi sửa (đã lọc PII/mật khẩu)
    after_state JSONB,                             -- Trạng thái sau khi sửa
    reason TEXT,                                   -- Lý do sửa (đặc biệt bắt buộc khi sửa điểm)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_school ON public.audit_events(school_id, created_at DESC);

-- 2. BẢNG OUTBOX_EVENTS (Hàng đợi sự kiện xử lý bất đồng bộ tin cậy)
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,                      -- ví dụ: 'submission.created', 'grade.published'
    aggregate_type TEXT NOT NULL,                  -- ví dụ: 'exam_submission', 'homework'
    aggregate_id UUID NOT NULL,
    event_key TEXT NOT NULL UNIQUE,                -- Khóa duy nhất chống phát thông báo lặp
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'dead_letter')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error_code TEXT,
    last_error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON public.outbox_events(status, available_at) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON public.outbox_events(aggregate_type, aggregate_id);

-- 3. BẢNG IDEMPOTENCY_KEYS (Chống nộp lặp / click đúp)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    operation TEXT NOT NULL,                       -- ví dụ: 'exam.submit', 'homework.submit'
    request_key TEXT NOT NULL,                     -- Client UUID / Idempotency Key
    request_hash TEXT,                             -- Mã băm nội dung để phát hiện xung đột payload
    response_data JSONB,                           -- Kết quả cached trả về nếu gửi lặp
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    UNIQUE(school_id, actor_id, operation, request_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON public.idempotency_keys(school_id, actor_id, operation, request_key);

-- 4. BẢNG NOTIFICATION_DELIVERIES (Theo dõi gửi thông báo tránh gửi trùng)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    event_key TEXT NOT NULL,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,                        -- 'in_app', 'email', 'zalo'
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('pending', 'delivered', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_key, recipient_id, provider)
);

-- 5. RLS POLICIES
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Chỉ admin trường hoặc người được ủy quyền mới xem được audit log của trường mình
DROP POLICY IF EXISTS "Admin view school audit" ON public.audit_events;
CREATE POLICY "Admin view school audit" ON public.audit_events FOR SELECT TO authenticated USING (
    public.user_has_school_role(auth.uid(), school_id, 'admin')
);

-- Service role toàn quyền trên outbox và idempotency; client không đọc trực tiếp
DROP POLICY IF EXISTS "Deny public outbox" ON public.outbox_events;
CREATE POLICY "Deny public outbox" ON public.outbox_events FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Deny public idempotency" ON public.idempotency_keys;
CREATE POLICY "Deny public idempotency" ON public.idempotency_keys FOR ALL TO public USING (false);
