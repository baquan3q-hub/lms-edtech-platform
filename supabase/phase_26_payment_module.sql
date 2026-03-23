-- =============================================
-- Phase 26: Payment Module
-- Bảng: fee_plans, invoices, payments, fee_schedules
-- Trigger: Auto generate invoice_number
-- Function: mark_overdue_invoices
-- RLS: Admin full, Parent xem con, Student read-only
-- =============================================

-- Xóa bảng cũ (schema cũ không có student_id, class_id...)
-- Nếu bảng cũ tồn tại với schema khác, cần drop để tạo lại
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS fee_plans CASCADE;
DROP TABLE IF EXISTS fee_schedules CASCADE;

-- 1. Bảng fee_plans (Học phí theo lớp, Admin tạo)
CREATE TABLE IF NOT EXISTS fee_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid REFERENCES classes(id) ON DELETE CASCADE,
  name          text NOT NULL,
  amount        bigint NOT NULL CHECK (amount > 0),
  currency      text DEFAULT 'VND',
  due_date      date NOT NULL,
  description   text,
  is_recurring  boolean DEFAULT false,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz DEFAULT now()
);

-- 2. Bảng invoices (Hóa đơn từng học sinh)
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_plan_id     uuid REFERENCES fee_plans(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES users(id),
  class_id        uuid REFERENCES classes(id),
  amount          bigint NOT NULL CHECK (amount > 0),
  status          text DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid','pending','paid','overdue','cancelled','refunded')),
  due_date        date NOT NULL,
  paid_at         timestamptz,
  pdf_url         text,
  invoice_number  text UNIQUE,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- 3. Bảng payments (Giao dịch thanh toán)
CREATE TABLE IF NOT EXISTS payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          uuid REFERENCES invoices(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES users(id),
  amount              bigint NOT NULL,
  currency            text DEFAULT 'VND',
  provider            text NOT NULL
                      CHECK (provider IN ('vnpay','stripe','cash','transfer')),
  provider_txn_id     text UNIQUE,
  provider_order_id   text,
  status              text DEFAULT 'pending'
                      CHECK (status IN ('pending','succeeded','failed','refunded')),
  raw_response        jsonb DEFAULT '{}',
  ip_address          text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- 4. Bảng fee_schedules (Học phí định kỳ tự động)
CREATE TABLE IF NOT EXISTS fee_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid REFERENCES classes(id) ON DELETE CASCADE,
  amount        bigint NOT NULL CHECK (amount > 0),
  day_of_month  integer DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- =============================================
-- Trigger: Tự động tạo invoice_number (HD-YYYY-XXXX)
-- =============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str text := TO_CHAR(NOW(), 'YYYY');
  seq_num  text;
BEGIN
  IF NEW.invoice_number IS NULL THEN
    SELECT LPAD((COUNT(*) + 1)::text, 4, '0')
    INTO seq_num
    FROM invoices
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

    NEW.invoice_number := 'HD-' || year_str || '-' || seq_num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- =============================================
-- Function: Đánh dấu invoices quá hạn
-- =============================================
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status = 'unpaid'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Indexes cho performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_fee_plan_id ON invoices(fee_plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_fee_plans_class_id ON fee_plans(class_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- fee_plans
ALTER TABLE fee_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access fee_plans" ON fee_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Parent view fee_plans of children class" ON fee_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      JOIN enrollments e ON e.student_id = ps.student_id
      WHERE ps.parent_id = auth.uid()
        AND e.class_id = fee_plans.class_id
    )
  );

CREATE POLICY "Student view own class fee_plans" ON fee_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.student_id = auth.uid()
        AND e.class_id = fee_plans.class_id
    )
  );

-- invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access invoices" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Parent view children invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.parent_id = auth.uid()
        AND ps.student_id = invoices.student_id
    )
  );

CREATE POLICY "Student view own invoices" ON invoices
  FOR SELECT USING (
    student_id = auth.uid()
  );

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Parent view own payments" ON payments
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Parent insert payments" ON payments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- fee_schedules
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access fee_schedules" ON fee_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
