'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  CreditCard, FileText, CheckCircle2, Clock,
  Download, Loader2, Banknote, Globe, QrCode, Copy, Check, X
} from 'lucide-react'

// Types
interface Invoice {
  id: string
  fee_plan_id: string
  student_id: string
  class_id: string
  amount: number
  status: 'unpaid' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  due_date: string
  paid_at: string | null
  pdf_url: string | null
  invoice_number: string
  notes: string | null
  created_at: string
  fee_plans: { name: string; description: string | null } | null
  classes: { name: string } | null
  users: { full_name: string } | null
}

// Thông tin chuyển khoản QR — CẤU HÌNH THEO TRUNG TÂM
const BANK_INFO = {
  bankId: 'VCB',           // Vietcombank
  accountNo: '1042378908', // Số tài khoản nhận tiền
  accountName: 'BUI ANH QUAN', // Tên chủ tài khoản (không dấu)
  template: 'compact2',   // Template QR
}

// Tạo URL QR chuyển khoản VietQR
function generateQRUrl(amount: number, description: string): string {
  const desc = encodeURIComponent(
    description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 -]/g, '')
      .slice(0, 50)
  )
  return `https://img.vietqr.io/image/${BANK_INFO.bankId}-${BANK_INFO.accountNo}-${BANK_INFO.template}.png?amount=${amount}&addInfo=${desc}&accountName=${encodeURIComponent(BANK_INFO.accountName)}`
}

export default function ParentPaymentsPage() {
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid' | 'all'>('unpaid')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [showPayDialog, setShowPayDialog] = useState<Invoice | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<'vnpay' | 'stripe' | 'qr'>('qr')
  const [copied, setCopied] = useState(false)

  // Fetch invoices qua API route (bypass RLS)
  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment/parent/invoices')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setInvoices((data.invoices as Invoice[]) ?? [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // Tổng tiền chưa đóng
  const totalUnpaid = invoices
    .filter(i => ['unpaid', 'overdue', 'pending'].includes(i.status))
    .reduce((sum, i) => sum + i.amount, 0)

  // Lọc theo tab
  const filteredInvoices = invoices.filter(inv => {
    if (activeTab === 'unpaid') return ['unpaid', 'overdue', 'pending'].includes(inv.status)
    if (activeTab === 'paid') return inv.status === 'paid'
    return true
  })

  // Format tiền VNĐ
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  // Tính trạng thái thời gian
  const getDueBadge = (dueDate: string, status: string) => {
    if (status === 'paid') return null
    const days = differenceInDays(new Date(dueDate), new Date())
    if (days < 0) return { text: `Quá hạn ${Math.abs(days)} ngày`, color: 'bg-red-100 text-red-700' }
    if (days <= 3) return { text: `Còn ${days} ngày`, color: 'bg-yellow-100 text-yellow-700' }
    if (days <= 14) return { text: `Còn ${days} ngày`, color: 'bg-green-100 text-green-700' }
    return { text: `Còn ${days} ngày`, color: 'bg-blue-100 text-blue-700' }
  }

  // Copy số tài khoản
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Xử lý thanh toán VNPay/Stripe
  const handlePayment = async (invoice: Invoice) => {
    if (selectedProvider === 'qr') return // QR chỉ hiển thị, không cần gọi API

    setPaymentLoading(invoice.id)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          provider: selectedProvider,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Có lỗi xảy ra')
        return
      }

      if (data.provider === 'vnpay' && data.payUrl) {
        window.location.href = data.payUrl
      } else if (data.provider === 'stripe' && data.clientSecret) {
        alert('Stripe Elements sẽ được tích hợp sau khi có API key.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setPaymentLoading(null)
      setShowPayDialog(null)
    }
  }

  // Status badge
  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      unpaid: { label: 'Chưa đóng', cls: 'bg-gray-100 text-gray-700' },
      pending: { label: 'Đang xử lý', cls: 'bg-yellow-100 text-yellow-700' },
      paid: { label: 'Đã đóng', cls: 'bg-green-100 text-green-700' },
      overdue: { label: 'Quá hạn', cls: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Đã hủy', cls: 'bg-gray-100 text-gray-500' },
      refunded: { label: 'Đã hoàn', cls: 'bg-purple-100 text-purple-700' },
    }
    const s = map[status] ?? map.unpaid
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600" />
            Học phí & Thanh toán
          </h1>
          <p className="text-gray-500 mt-1">Quản lý thanh toán học phí cho con em</p>
        </div>
        {totalUnpaid > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-right">
            <div className="text-xs text-red-500">Còn lại</div>
            <div className="text-lg font-bold text-red-700">{formatMoney(totalUnpaid)}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'unpaid' as const, label: '📋 Chờ đóng', count: invoices.filter(i => ['unpaid', 'overdue', 'pending'].includes(i.status)).length },
          { key: 'paid' as const, label: '✅ Đã đóng', count: invoices.filter(i => i.status === 'paid').length },
          { key: 'all' as const, label: '📄 Tất cả', count: invoices.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white shadow text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredInvoices.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">Không có hóa đơn nào</p>
        </div>
      )}

      {/* Invoice Cards */}
      {!loading && filteredInvoices.map(invoice => {
        const dueBadge = getDueBadge(invoice.due_date, invoice.status)
        return (
          <div key={invoice.id} className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{invoice.fee_plans?.name ?? 'Học phí'}</h3>
                <p className="text-sm text-gray-500">
                  {invoice.classes?.name && `Lớp: ${invoice.classes.name}`}
                  {invoice.users?.full_name && ` • HS: ${invoice.users.full_name}`}
                  {invoice.invoice_number && ` • ${invoice.invoice_number}`}
                </p>
              </div>
              {statusBadge(invoice.status)}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatMoney(invoice.amount)}</div>
                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Hạn đóng: {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: vi })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dueBadge && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${dueBadge.color}`}>
                    {dueBadge.text}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
              <button
                onClick={() => { setShowPayDialog(invoice); setSelectedProvider('qr') }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Thanh toán ngay
              </button>
            )}

            {invoice.status === 'paid' && invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Tải hóa đơn PDF
              </a>
            )}

            {invoice.status === 'paid' && (
              <div className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Đã đóng lúc {invoice.paid_at ? format(new Date(invoice.paid_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''}
              </div>
            )}
          </div>
        )
      })}

      {/* ===== DIALOG THANH TOÁN ===== */}
      {showPayDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !paymentLoading && setShowPayDialog(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Thanh toán học phí
              </h2>
              <button onClick={() => setShowPayDialog(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin hóa đơn */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Hóa đơn</span>
                <span className="font-medium">{showPayDialog.invoice_number}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">Học sinh</span>
                <span className="font-medium">{showPayDialog.users?.full_name}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">Số tiền</span>
                <span className="text-xl font-bold text-blue-700">{formatMoney(showPayDialog.amount)}</span>
              </div>
            </div>

            {/* Chọn phương thức */}
            <div className="space-y-2">
              {/* QR Chuyển khoản */}
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                  selectedProvider === 'qr' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProvider('qr')}
              >
                <input type="radio" name="provider" checked={selectedProvider === 'qr'} onChange={() => {}} className="mt-1" />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    Quét mã QR chuyển khoản
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Mở app ngân hàng → Quét QR → Xác nhận</p>
                </div>
              </label>

              {/* VNPay */}
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                  selectedProvider === 'vnpay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProvider('vnpay')}
              >
                <input type="radio" name="provider" checked={selectedProvider === 'vnpay'} onChange={() => {}} className="mt-1" />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    VNPay (ATM, Internet Banking)
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Hỗ trợ tất cả ngân hàng Việt Nam</p>
                </div>
              </label>

              {/* Stripe */}
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                  selectedProvider === 'stripe' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProvider('stripe')}
              >
                <input type="radio" name="provider" checked={selectedProvider === 'stripe'} onChange={() => {}} className="mt-1" />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Thẻ quốc tế (Visa/Mastercard)
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Stripe — Bảo mật 3D Secure</p>
                </div>
              </label>
            </div>

            {/* ===== QR CODE SECTION ===== */}
            {selectedProvider === 'qr' && (
              <div className="space-y-4">
                {/* QR Image từ VietQR */}
                <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 text-center">
                  <img
                    src={generateQRUrl(showPayDialog.amount, showPayDialog.invoice_number || 'Hoc phi')}
                    alt="QR Chuyển khoản"
                    className="mx-auto rounded-xl"
                    width={280}
                    height={280}
                  />
                </div>

                {/* Thông tin chuyển khoản */}
                <div className="bg-blue-50 rounded-xl p-4 space-y-3 text-sm">
                  <h4 className="font-semibold text-blue-800">Thông tin chuyển khoản</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ngân hàng</span>
                    <span className="font-medium">{BANK_INFO.bankId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Số tài khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{BANK_INFO.accountNo}</span>
                      <button
                        onClick={() => handleCopy(BANK_INFO.accountNo)}
                        className="p-1 hover:bg-blue-100 rounded"
                        title="Copy"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Chủ tài khoản</span>
                    <span className="font-medium">{BANK_INFO.accountName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Số tiền</span>
                    <span className="font-bold text-blue-700">{formatMoney(showPayDialog.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Nội dung CK</span>
                    <span className="font-mono text-xs">{showPayDialog.invoice_number}</span>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                  ⚠️ Sau khi chuyển khoản thành công, học phí sẽ được xác nhận trong vòng 1-2 giờ làm việc.
                </div>

                <button
                  onClick={() => setShowPayDialog(null)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  Đã chuyển khoản xong
                </button>
              </div>
            )}

            {/* ===== VNPAY / STRIPE SECTION ===== */}
            {selectedProvider !== 'qr' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handlePayment(showPayDialog)}
                  disabled={!!paymentLoading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tiến hành thanh toán'
                  )}
                </button>
                <button
                  onClick={() => setShowPayDialog(null)}
                  disabled={!!paymentLoading}
                  className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
