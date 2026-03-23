import crypto from 'crypto'

// Cấu hình VNPay — dùng sandbox, đổi URL khi go live
const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE!,
  hashSecret: process.env.VNPAY_HASH_SECRET!,
  url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  // Production: 'https://pay.vnpay.vn/vpcpay.html',
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/vnpay/return`,
  ipnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/vnpay/ipn`,
}

/**
 * Tạo URL redirect sang trang thanh toán VNPay
 * VNPay yêu cầu amount nhân 100 (VD: 2,500,000 → truyền 250000000)
 */
export function createVNPayUrl(params: {
  orderId: string
  amount: number
  orderInfo: string
  ipAddress: string
  locale?: 'vn' | 'en'
}): string {
  const date = new Date()
  const createDate = date.toISOString()
    .replace(/[-:T.Z]/g, '').slice(0, 14)

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Amount: String(params.amount * 100), // VNPay yêu cầu nhân 100
    vnp_CreateDate: createDate,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: params.ipAddress,
    vnp_Locale: params.locale ?? 'vn',
    vnp_OrderInfo: params.orderInfo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ''),
    vnp_OrderType: 'billpayment',
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
    vnp_TxnRef: params.orderId.slice(0, 8), // max 8 ký tự
    vnp_ExpireDate: new Date(date.getTime() + 15 * 60000)
      .toISOString().replace(/[-:T.Z]/g, '').slice(0, 14),
  }

  // Sắp xếp params theo alphabet (yêu cầu của VNPay)
  const sorted = Object.keys(vnpParams)
    .sort()
    .reduce((acc, key) => ({ ...acc, [key]: vnpParams[key] }),
      {} as Record<string, string>)

  // Tạo query string và ký HMAC-SHA512
  const signData = new URLSearchParams(sorted).toString()
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  return `${VNPAY_CONFIG.url}?${signData}&vnp_SecureHash=${signed}`
}

/**
 * Xác thực chữ ký từ VNPay Return/IPN
 * Trả về isValid (chữ ký hợp lệ) và isSuccess (thanh toán thành công)
 */
export function verifyVNPayReturn(
  query: Record<string, string>
): { isValid: boolean; isSuccess: boolean } {
  const secureHash = query.vnp_SecureHash
  const params = { ...query }
  delete params.vnp_SecureHash
  delete params.vnp_SecureHashType

  const sorted = Object.keys(params).sort()
    .reduce((acc, key) => ({ ...acc, [key]: params[key] }),
      {} as Record<string, string>)

  const signData = new URLSearchParams(sorted).toString()
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  return {
    isValid: signed === secureHash,
    isSuccess: query.vnp_ResponseCode === '00',
  }
}
