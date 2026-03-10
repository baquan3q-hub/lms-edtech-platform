-- ==========================================
-- PHASE 23: LMS DISCUSSION MESSAGES SCHEMA
-- ==========================================

-- 1. BẢNG TIN NHẮN THẢO LUẬN (DISCUSSION MESSAGES)
CREATE TABLE IF NOT EXISTS public.discussion_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.course_items(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index để tối ưu truy vấn theo item_id (phòng chat) và class_id
CREATE INDEX idx_discussion_messages_item_id ON public.discussion_messages(item_id);
CREATE INDEX idx_discussion_messages_class_id ON public.discussion_messages(class_id);

-- ==========================================
-- ROW LEVEL SECURITY (Quyền Truy Cập)
-- ==========================================

ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;

-- Mở cho tất cả authenticated users xem tin nhắn 
CREATE POLICY "Cho phép đọc mọi tin nhắn nếu login" ON public.discussion_messages FOR SELECT TO authenticated USING (true);

-- Cho phép INSERT thông qua Server Action (bypass RLS)
CREATE POLICY "Mọi INSERT qua Server Action" ON public.discussion_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Để Realtime của Supabase nhận biết các thay đổi từ bảng này, cần bật REPLICA IDENTITY
ALTER TABLE public.discussion_messages REPLICA IDENTITY FULL;

-- Cho phép bảng phát sự kiện lên kênh realtime
-- Lưu ý: Supabase Dashboard -> Database -> Replication -> bật cho bảng discussion_messages
-- Mã SQL để bật logical replication publication cho bảng này (cần quyền superuser, 
-- hoặc thường thao tác tay trên Dashboard/Studio, nhưng có thể thử qua lệnh sau)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_messages;
