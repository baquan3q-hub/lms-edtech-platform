import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

/**
 * POST /api/payment/stripe/webhook
 * Stripe gọi webhook khi payment events xảy ra
 * Cần raw body để verify signature
 */
export async function POST(req: Request) {
  const body = await req.text()
  const headerList = await headers()
  const sig = headerList.get('stripe-signature')!

  const supabase = createAdminClient()

  try {
    const event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    )

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object
      const invoiceId = intent.metadata.invoiceId

      if (!invoiceId) {
        console.error('[Stripe Webhook] Missing invoiceId in metadata')
        return new Response('Missing metadata', { status: 400 })
      }

      // Tìm payment pending cho invoice này
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('provider', 'stripe')
        .eq('status', 'pending')
        .limit(1)

      const payment = payments?.[0]
      if (!payment) {
        console.error('[Stripe Webhook] Payment not found for invoice:', invoiceId)
        return new Response('Payment not found', { status: 404 })
      }

      // Cập nhật payment thành công
      await supabase.from('payments').update({
        status: 'succeeded',
        provider_txn_id: intent.id,
        raw_response: intent as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id)

      // Cập nhật invoice = paid
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      }).eq('id', invoiceId)

      // Tạo notification
      const { data: invoice } = await supabase
        .from('invoices')
        .select('student_id, invoice_number, amount')
        .eq('id', invoiceId)
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
            message: `Hóa đơn ${invoice.invoice_number} - ${formattedAmount} đã được xác nhận qua Stripe.`,
            type: 'payment',
            read: false,
          })
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[Stripe Webhook Error]', err)
    return new Response('Webhook Error', { status: 400 })
  }
}
