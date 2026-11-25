import { NextRequest } from 'next/server'
import { api, jsonBody, requireSameOrigin } from '@/lib/api/http'
import { confirmBankTransfer, invoiceIdSchema } from '@/lib/modules/payments/service'

/**
 * POST /api/payment/parent/confirm-transfer
 * Phụ huynh bấm "Đã chuyển khoản" → hoá đơn chuyển sang "pending". Admin mới duyệt "paid" (B19).
 */
export async function POST(req: NextRequest) {
  return api(async () => {
    requireSameOrigin(req)
    const { invoiceId } = await jsonBody(req, invoiceIdSchema)
    return confirmBankTransfer(invoiceId)
  })
}
