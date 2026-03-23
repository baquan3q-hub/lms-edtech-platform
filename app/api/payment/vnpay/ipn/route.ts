import { verifyVNPayReturn } from '@/lib/vnpay'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

/**
 * GET /api/payment/vnpay/ipn
 * VNPay gọi IPN (Instant Payment Notification) để xác nhận thanh toán
 * Trả về mã code cho VNPay: '00' = OK, '97' = Invalid Signature, '01' = Not Found
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams)

  // Dùng admin client vì IPN không có auth context (VNPay gọi server-to-server)
  const supabase = createAdminClient()
  const { isValid, isSuccess } = verifyVNPayReturn(query)

  if (!isValid) {
    return new Response('97', { status: 200 }) // Sai chữ ký
  }

  const txnRef = query.vnp_TxnRef
  const txnId = query.vnp_TransactionNo

  // Tìm payment record theo provider_order_id (bắt đầu bằng txnRef)
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .like('provider_order_id', `${txnRef}%`)
    .eq('status', 'pending')
    .limit(1)

  const payment = payments?.[0]
  if (!payment) return new Response('01', { status: 200 }) // Không tìm thấy đơn hàng

  if (isSuccess) {
    // Cập nhật payment thành công
    await supabase.from('payments').update({
      status: 'succeeded',
      provider_txn_id: txnId,
      raw_response: query,
      updated_at: new Date().toISOString(),
    }).eq('id', payment.id)

    // Cập nhật invoice = paid
    await supabase.from('invoices').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', payment.invoice_id)

    // TODO: Gọi Edge Function tạo PDF hóa đơn khi đã deploy
    // await supabase.functions.invoke('generate-invoice-pdf', {
    //   body: { invoiceId: payment.invoice_id }
    // })

    // Tạo notification cho phụ huynh
    const { data: invoice } = await supabase
      .from('invoices')
      .select('student_id, invoice_number, amount')
      .eq('id', payment.invoice_id)
      .single()

    if (invoice) {
      const { data: parents } = await supabase
        .from('parent_students')
        .select('parent_id')
        .eq('student_id', invoice.student_id)

      const formattedAmount = new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND'
      }).format(invoice.amount)

      for (const parent of parents ?? []) {
        await supabase.from('notifications').insert({
          user_id: parent.parent_id,
          title: '✅ Thanh toán học phí thành công',
          message: `Hóa đơn ${invoice.invoice_number} - ${formattedAmount} đã được xác nhận.`,
          type: 'payment',
          read: false,
        })
      }
    }

    return new Response('00', { status: 200 }) // Thành công
  } else {
    // Thanh toán thất bại
    await supabase.from('payments').update({
      status: 'failed',
      raw_response: query,
      updated_at: new Date().toISOString(),
    }).eq('id', payment.id)

    // Đặt lại invoice = unpaid
    await supabase.from('invoices').update({
      status: 'unpaid'
    }).eq('id', payment.invoice_id)

    return new Response('00', { status: 200 })
  }
}
