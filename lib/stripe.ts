import Stripe from 'stripe'

// Stripe server-side client (KHÔNG expose ra browser)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

/**
 * Tạo Stripe PaymentIntent cho giao dịch thanh toán
 * Dùng cho thẻ quốc tế (Visa/Mastercard) qua Stripe Elements
 */
export async function createStripePaymentIntent(params: {
  amount: number       // Số tiền VNĐ
  currency: string     // 'vnd'
  invoiceId: string
  studentName: string
  description: string
}) {
  return stripe.paymentIntents.create({
    amount: Math.round(params.amount), // VNĐ không có phần thập phân
    currency: params.currency.toLowerCase(),
    metadata: {
      invoiceId: params.invoiceId,
      studentName: params.studentName,
    },
    description: params.description,
    automatic_payment_methods: { enabled: true },
  })
}
