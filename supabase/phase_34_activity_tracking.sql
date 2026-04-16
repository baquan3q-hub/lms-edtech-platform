CREATE TABLE IF NOT EXISTS user_page_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_path TEXT NOT NULL,
    section_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo function tự động update updated_at
CREATE OR REPLACE FUNCTION update_user_page_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
DROP TRIGGER IF EXISTS trg_user_page_sessions_updated_at ON user_page_sessions;
CREATE TRIGGER trg_user_page_sessions_updated_at
BEFORE UPDATE ON user_page_sessions
FOR EACH ROW
EXECUTE FUNCTION update_user_page_sessions_updated_at();

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_user_page_sessions_user_date ON user_page_sessions(user_id, created_at);

-- RLS (Row Level Security)
ALTER TABLE user_page_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admin & Teacher có thể xem tất cả
CREATE POLICY "Cho phép Admin và Teacher xem tất cả log"
ON user_page_sessions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid() AND (u.raw_user_meta_data->>'role' IN ('admin', 'teacher'))
    )
);

-- Policy: Bất kỳ ai cũng có thể insert log cho chính mình
CREATE POLICY "Cho phép User tạo log của chính mình"
ON user_page_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: User có thể sửa log của chính mình (để update duration)
CREATE POLICY "Cho phép User update log của chính mình"
ON user_page_sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Student/Parent xem log của mình
CREATE POLICY "Cho phép User xem log của chính mình"
ON user_page_sessions FOR SELECT
USING (auth.uid() = user_id);
