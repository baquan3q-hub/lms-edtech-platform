'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Download, Home } from 'lucide-react'

function VNPayReturnContent() {
  const searchParams = useSearchParams()

  const responseCode = searchParams.get('vnp_ResponseCode')
  const amount = searchParams.get('vnp_Amount')
  const txnRef = searchParams.get('vnp_TxnRef')
  const orderInfo = searchParams.get('vnp_OrderInfo')
  const transactionNo = searchParams.get('vnp_TransactionNo')
  const payDate = searchParams.get('vnp_PayDate')

  const isSuccess = responseCode === '00'

  // Format số tiền (VNPay trả về nhân 100)
  const formattedAmount = amount
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
        .format(Number(amount) / 100)
    : '0 ₫'

  // Format ngày thanh toán
  const formattedDate = payDate
    ? `${payDate.slice(6, 8)}/${payDate.slice(4, 6)}/${payDate.slice(0, 4)} ${payDate.slice(8, 10)}:${payDate.slice(10, 12)}`
    : ''

  // Mô tả lỗi theo errorcode
  const getErrorMessage = (code: string | null) => {
    const messages: Record<string, string> = {
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
      '11': 'Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại.',
      '12': 'Thẻ/Tài khoản bị khóa.',
      '13': 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
      '24': 'Quý khách hủy giao dịch.',
      '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Quý khách nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Lỗi không xác định.',
    }
    return messages[code ?? ''] ?? 'Giao dịch không thành công. Vui lòng thử lại.'
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
          {/* Icon thành công */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-green-700">Thanh toán thành công!</h1>
            <p className="text-gray-500 mt-1">Giao dịch đã được xử lý</p>
          </div>

          {/* Thông tin giao dịch */}
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Mã hóa đơn</span>
              <span className="font-medium">{orderInfo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số tiền</span>
              <span className="font-bold text-green-600 text-lg">{formattedAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Thời gian</span>
              <span className="font-medium">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mã GD VNPay</span>
              <span className="font-mono text-sm">{transactionNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mã tham chiếu</span>
              <span className="font-mono text-sm">{txnRef}</span>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            📧 Hóa đơn đã được gửi về email của bạn
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <Link
              href="/parent/payments"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
            >
              <Download className="w-4 h-4" />
              Xem hóa đơn
            </Link>
            <Link
              href="/parent"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              <Home className="w-4 h-4" />
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // THẤT BẠI
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-red-700">Thanh toán không thành công</h1>
          <p className="text-gray-600 mt-2">{getErrorMessage(responseCode)}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Mã lỗi</span>
            <span className="font-mono text-red-600">{responseCode}</span>
          </div>
          {txnRef && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mã tham chiếu</span>
              <span className="font-mono text-sm">{txnRef}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href="/parent/payments"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
          >
            🔄 Thử lại
          </Link>
          <Link
            href="/parent"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VNPayReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    }>
      <VNPayReturnContent />
    </Suspense>
  )
}
