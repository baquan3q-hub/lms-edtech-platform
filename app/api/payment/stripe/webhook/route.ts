import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmProviderPayment } from '@/lib/modules/payments/service'

export const dynamic = 'force-dynamic'

const HANDLED = new Set(['payment_intent.succeeded', 'payment_intent.payment_failed'])

/**
 * POST /api/payment/stripe/webhook
 * - Chữ ký sai → 400.
 * - Sự kiện đã xử lý, không khớp đơn nào, hoặc lệch số tiền → 200 (gửi lại cũng không đổi kết quả).
 * - Lỗi DB → 500 để Stripe gửi lại.
 */
export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (!HANDLED.has(event.type)) return new Response('Ignored', { status: 200 })
  const intent = event.data.object as Stripe.PaymentIntent
  const succeeded = event.type === 'payment_intent.succeeded'

  try {
    const result = await confirmProviderPayment(createAdminClient(), {
      provider: 'stripe',
      orderId: intent.id,
      eventId: event.id,
      succeeded,
      // VND là tiền tệ không có phần thập phân ở Stripe: amount chính là số đồng.
      amount: succeeded ? intent.amount_received : intent.amount,
      currency: intent.currency,
      txnId: intent.id,
      raw: { event_id: event.id, type: event.type, intent_id: intent.id, amount: intent.amount, amount_received: intent.amount_received, currency: intent.currency, status: intent.status },
    })
    if (result.status === 'not_found' || result.status === 'amount_mismatch') {
      console.error(JSON.stringify({ event: `payment.${result.status}`, provider: 'stripe', eventId: event.id }))
    }
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error(JSON.stringify({ event: 'payment.webhook_failed', provider: 'stripe', eventId: event.id, message: error instanceof Error ? error.message : 'unknown' }))
    return new Response('Temporary failure', { status: 500 })
  }
}
