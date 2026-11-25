-- Xác nhận thanh toán VNPay/Stripe trong một transaction.
-- Trước đây webhook cập nhật payments rồi invoices bằng hai lệnh rời, không kiểm số tiền,
-- không khoá dòng và không chống xử lý trùng. RPC dưới đây làm tất cả trong một lần gọi.

-- Mỗi lần thanh toán có mã đơn riêng (VNPay vnp_TxnRef / Stripe PaymentIntent id).
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_order_unique
  ON public.payments(provider, provider_order_id) WHERE provider_order_id IS NOT NULL;

-- Sự kiện đã nhận từ cổng thanh toán. Không dùng idempotency_keys vì bảng đó bắt buộc
-- actor_id (webhook không có người dùng) và hết hạn sau 24 giờ, trong khi Stripe gửi lại tới 3 ngày.
CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('vnpay', 'stripe')),
  event_id text NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 255),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE RESTRICT,
  outcome text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_provider_events FROM anon, authenticated;
GRANT SELECT ON public.payment_provider_events TO authenticated;
GRANT ALL ON public.payment_provider_events TO service_role;
DROP POLICY IF EXISTS payment_provider_events_admin_read ON public.payment_provider_events;
CREATE POLICY payment_provider_events_admin_read ON public.payment_provider_events
  FOR SELECT TO authenticated
  USING (school_id IS NOT NULL AND public.my_school_access(school_id, ARRAY['admin']));

-- Kết quả (jsonb.status):
--   not_found          không có payment khớp provider + order_id
--   duplicate          event_id đã xử lý; kèm previous_outcome
--   amount_mismatch    số tiền/tiền tệ từ cổng thanh toán khác bản ghi; payment giữ nguyên
--   already_processed  payment đã ở trạng thái cuối, không đổi gì
--   confirmed          payment succeeded, invoice paid (nếu chưa paid), đã báo phụ huynh
--   failed             payment failed; invoice không đổi
CREATE OR REPLACE FUNCTION public.confirm_provider_payment(
  p_provider text, p_order_id text, p_event_id text, p_succeeded boolean,
  p_amount bigint, p_currency text, p_txn_id text, p_raw jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  pay public.payments;
  inv public.invoices;
  v_school uuid;
  v_outcome text;
  v_previous text;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_already_paid boolean := false;
BEGIN
  IF p_provider NOT IN ('vnpay', 'stripe') OR coalesce(p_order_id, '') = '' OR coalesce(p_event_id, '') = '' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_EVENT';
  END IF;

  -- Khoá payment để hai webhook đến cùng lúc không cùng xác nhận.
  SELECT * INTO pay FROM public.payments
    WHERE provider = p_provider AND provider_order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = pay.invoice_id FOR UPDATE;
  v_school := coalesce(pay.school_id, inv.school_id);

  -- Quyết định kết quả trước, rồi ghi sự kiện; sự kiện trùng thì trả lại kết quả cũ.
  IF p_succeeded THEN
    IF pay.status = 'succeeded' THEN v_outcome := 'already_processed';
    ELSIF pay.status NOT IN ('pending', 'failed') THEN v_outcome := 'already_processed';
    ELSIF p_amount IS DISTINCT FROM pay.amount
       OR upper(coalesce(p_currency, '')) <> upper(coalesce(pay.currency, 'VND')) THEN v_outcome := 'amount_mismatch';
    ELSE v_outcome := 'confirmed';
    END IF;
  ELSE
    v_outcome := CASE WHEN pay.status = 'pending' THEN 'failed' ELSE 'already_processed' END;
  END IF;

  INSERT INTO public.payment_provider_events(provider, event_id, payment_id, school_id, outcome)
    VALUES (p_provider, p_event_id, pay.id, v_school, v_outcome)
    ON CONFLICT (provider, event_id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT outcome INTO v_previous FROM public.payment_provider_events
      WHERE provider = p_provider AND event_id = p_event_id;
    RETURN jsonb_build_object('status', 'duplicate', 'previous_outcome', v_previous, 'payment_id', pay.id);
  END IF;

  IF v_outcome = 'confirmed' THEN
    UPDATE public.payments
      SET status = 'succeeded', provider_txn_id = p_txn_id, raw_response = p_raw, updated_at = now()
      WHERE id = pay.id;
    v_already_paid := inv.status = 'paid';
    IF inv.id IS NOT NULL AND NOT v_already_paid THEN
      UPDATE public.invoices SET status = 'paid', paid_at = now() WHERE id = inv.id;
      INSERT INTO public.notifications(user_id, title, message, type, metadata)
        SELECT ps.parent_id, 'Thanh toán học phí thành công',
               'Hóa đơn ' || coalesce(inv.invoice_number, '') || ' đã được xác nhận thanh toán.',
               'payment', jsonb_build_object('invoice_id', inv.id, 'payment_id', pay.id)
        FROM public.parent_students ps
        WHERE ps.student_id = inv.student_id
          AND ps.verification_status = 'verified'
          AND (ps.school_id IS NULL OR v_school IS NULL OR ps.school_id = v_school)
          AND (ps.valid_from IS NULL OR ps.valid_from <= v_today)
          AND (ps.valid_to IS NULL OR ps.valid_to >= v_today);
    END IF;
  ELSIF v_outcome = 'failed' THEN
    UPDATE public.payments SET status = 'failed', raw_response = p_raw, updated_at = now() WHERE id = pay.id;
  END IF;

  IF v_outcome IN ('confirmed', 'amount_mismatch') AND v_school IS NOT NULL AND pay.user_id IS NOT NULL THEN
    INSERT INTO public.audit_events(school_id, actor_id, action, entity_type, entity_id, before_state, after_state)
      VALUES (v_school, pay.user_id, 'payment.' || v_outcome, 'payments', pay.id,
        jsonb_build_object('status', pay.status, 'amount', pay.amount, 'currency', pay.currency),
        jsonb_build_object('provider', p_provider, 'event_id', p_event_id, 'amount', p_amount,
          'currency', p_currency, 'invoice_already_paid', v_already_paid));
  END IF;

  RETURN jsonb_build_object('status', v_outcome, 'payment_id', pay.id, 'invoice_id', pay.invoice_id,
    'invoice_already_paid', v_already_paid);
END $$;

REVOKE ALL ON FUNCTION public.confirm_provider_payment(text, text, text, boolean, bigint, text, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_provider_payment(text, text, text, boolean, bigint, text, text, jsonb) TO service_role;
