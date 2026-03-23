import { createVNPayUrl } from '@/lib/vnpay'
import { createStripePaymentIntent } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema validate request body
const schema = z.object({
  invoiceId: z.string().uuid(),
  provider: z.enum(['vnpay', 'stripe']),
})

/**
 * POST /api/payment/create
 * Tạo link thanh toán VNPay hoặc Stripe PaymentIntent
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { invoiceId, provider } = schema.parse(body)

    // Lấy thông tin invoice kèm tên học sinh và tên fee plan
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        fee_plans ( name )
      `)
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice không tồn tại' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Hóa đơn đã được thanh toán' }, { status: 400 })
    }

    // Tạo order ID unique cho provider
    const orderId = `${invoiceId.slice(0, 8)}-${Date.now()}`

    // Tạo bản ghi payment pending
    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      user_id: user.id,
      amount: invoice.amount,
      currency: 'VND',
      provider,
      provider_order_id: orderId,
      status: 'pending',
      ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    })

    // Cập nhật invoice status = pending
    await supabase.from('invoices')
      .update({ status: 'pending' })
      .eq('id', invoiceId)

    // ===== VNPay: Redirect sang trang VNPay =====
    if (provider === 'vnpay') {
      const payUrl = createVNPayUrl({
        orderId,
        amount: invoice.amount,
        orderInfo: `Thanh toan ${invoice.invoice_number}`,
        ipAddress: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
      })
      return NextResponse.json({ provider: 'vnpay', payUrl })
    }

    // ===== Stripe: Trả về clientSecret cho Stripe Elements =====
    if (provider === 'stripe') {
      // Lấy tên học sinh
      const { data: student } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', invoice.student_id)
        .single()

      const intent = await createStripePaymentIntent({
        amount: invoice.amount,
        currency: 'vnd',
        invoiceId,
        studentName: student?.full_name ?? '',
        description: `${invoice.fee_plans?.name} - ${invoice.invoice_number}`,
      })
      return NextResponse.json({
        provider: 'stripe',
        clientSecret: intent.client_secret,
      })
    }

    return NextResponse.json({ error: 'Provider không hợp lệ' }, { status: 400 })
  } catch (error) {
    console.error('[Payment Create]', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
