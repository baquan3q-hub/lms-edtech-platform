import { verifyVNPayReturn } from '@/lib/vnpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmProviderPayment, type ProviderPaymentOutcome } from '@/lib/modules/payments/service'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Mã phản hồi IPN theo tài liệu VNPay. */
function reply(RspCode: string, Message: string) {
  return NextResponse.json({ RspCode, Message }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}

const CODE_BY_OUTCOME: Record<ProviderPaymentOutcome, [string, string]> = {
  confirmed: ['00', 'Confirm Success'],
  failed: ['00', 'Confirm Success'],
  not_found: ['01', 'Order not found'],
  already_processed: ['02', 'Order already confirmed'],
  duplicate: ['02', 'Order already confirmed'],
  amount_mismatch: ['04', 'Invalid amount'],
}

/**
 * GET /api/payment/vnpay/ipn
 * VNPay gọi server-to-server để báo kết quả. Chữ ký sai → 97; số tiền lệch → 04;
 * đơn đã xử lý → 02; lỗi hệ thống → 99 (VNPay sẽ gọi lại).
 */
export async function GET(req: NextRequest) {
  const query = Object.fromEntries(new URL(req.url).searchParams)
  const { isValid, isSuccess } = verifyVNPayReturn(query)
  if (!isValid) return reply('97', 'Invalid signature')

  const txnRef = query.vnp_TxnRef
  const rawAmount = query.vnp_Amount
  if (!txnRef || !/^\d+$/.test(rawAmount ?? '') || Number(rawAmount) % 100 !== 0) {
    return reply('04', 'Invalid amount')
  }

  try {
    const result = await confirmProviderPayment(createAdminClient(), {
      provider: 'vnpay',
      orderId: txnRef,
      // VNPay không có event id; mỗi kết quả của một TxnRef chỉ xử lý một lần.
      eventId: `${txnRef}:${query.vnp_TransactionNo ?? ''}:${query.vnp_ResponseCode ?? ''}`,
      succeeded: isSuccess,
      amount: Number(rawAmount) / 100,
      currency: 'VND',
      txnId: query.vnp_TransactionNo ?? null,
      raw: query,
    })
    const outcome = result.status === 'duplicate' && result.previous_outcome === 'amount_mismatch' ? 'amount_mismatch' : result.status
    if (outcome === 'amount_mismatch') console.error(JSON.stringify({ event: 'payment.amount_mismatch', provider: 'vnpay', paymentId: result.payment_id }))
    const [code, message] = CODE_BY_OUTCOME[outcome]
    return reply(code, message)
  } catch (error) {
    console.error(JSON.stringify({ event: 'payment.ipn_failed', provider: 'vnpay', message: error instanceof Error ? error.message : 'unknown' }))
    return reply('99', 'Unknown error')
  }
}
