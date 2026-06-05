-- Create contact_requests table for capturing B2B leads
CREATE TABLE IF NOT EXISTS contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    school_size TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous users to insert contact requests
CREATE POLICY "Allow public insert to contact_requests" 
ON contact_requests 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated admin roles to view contact requests (if needed)
CREATE POLICY "Allow admin select contact_requests"
ON contact_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);
