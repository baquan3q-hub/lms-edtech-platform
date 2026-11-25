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

const PAYMENT_TTL_MINUTES = 15

/** yyyyMMddHHmmss theo giờ Việt Nam (GMT+7), định dạng VNPay yêu cầu. */
export function formatVnpDate(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map(p => [p.type, p.value])
  )
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`
}

/** Mã đơn riêng cho mỗi lần thanh toán: 32 ký tự chữ-số, không trùng giữa các lần thử. */
export function newVnpTxnRef(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function sign(params: Record<string, string>): string {
  const sorted = Object.keys(params).sort()
    .reduce((acc, key) => ({ ...acc, [key]: params[key] }), {} as Record<string, string>)
  const signData = new URLSearchParams(sorted).toString()
  return crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex')
}

/**
 * Tạo URL redirect sang trang thanh toán VNPay
 * VNPay yêu cầu amount nhân 100 (VD: 2,500,000 → truyền 250000000)
 */
export function createVNPayUrl(params: {
  txnRef: string
  amount: number
  orderInfo: string
  ipAddress: string
  locale?: 'vn' | 'en'
  now?: Date
}): string {
  const date = params.now ?? new Date()
  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Amount: String(Math.round(params.amount) * 100), // VNPay yêu cầu nhân 100
    vnp_CreateDate: formatVnpDate(date),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: params.ipAddress,
    vnp_Locale: params.locale ?? 'vn',
    vnp_OrderInfo: params.orderInfo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ''),
    vnp_OrderType: 'billpayment',
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
    vnp_TxnRef: params.txnRef,
    vnp_ExpireDate: formatVnpDate(new Date(date.getTime() + PAYMENT_TTL_MINUTES * 60000)),
  }
  const signData = new URLSearchParams(
    Object.keys(vnpParams).sort().reduce((acc, key) => ({ ...acc, [key]: vnpParams[key] }), {} as Record<string, string>)
  ).toString()
  return `${VNPAY_CONFIG.url}?${signData}&vnp_SecureHash=${sign(vnpParams)}`
}

/**
 * Xác thực chữ ký từ VNPay Return/IPN (so sánh thời gian cố định).
 * isSuccess chỉ đúng khi cả vnp_ResponseCode và vnp_TransactionStatus đều là '00'.
 */
export function verifyVNPayReturn(
  query: Record<string, string>
): { isValid: boolean; isSuccess: boolean } {
  const secureHash = String(query.vnp_SecureHash ?? '').toLowerCase()
  const params = { ...query }
  delete params.vnp_SecureHash
  delete params.vnp_SecureHashType

  const expected = Buffer.from(sign(params), 'hex')
  const presented = /^[0-9a-f]{128}$/.test(secureHash) ? Buffer.from(secureHash, 'hex') : Buffer.alloc(0)
  const isValid = presented.length === expected.length && crypto.timingSafeEqual(presented, expected)

  return {
    isValid,
    isSuccess: query.vnp_ResponseCode === '00' && (query.vnp_TransactionStatus ?? '00') === '00',
  }
}
