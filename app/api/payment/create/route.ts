import { NextRequest } from 'next/server'
import { api, jsonBody, requireSameOrigin } from '@/lib/api/http'
import { createPaymentAttempt, createPaymentSchema } from '@/lib/modules/payments/service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payment/create
 * Phụ huynh (giám hộ đã xác minh) tạo một lần thanh toán VNPay hoặc Stripe cho hoá đơn.
 * Số tiền lấy từ hoá đơn trong DB; mỗi lần thử có mã đơn riêng.
 */
export async function POST(req: NextRequest) {
  return api(async () => {
    requireSameOrigin(req)
    const input = await jsonBody(req, createPaymentSchema)
    return createPaymentAttempt(input, req.headers.get('x-forwarded-for'))
  })
}
