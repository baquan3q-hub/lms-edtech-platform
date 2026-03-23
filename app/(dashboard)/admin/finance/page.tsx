'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle, Plus,
  Loader2, FileText, Users, CreditCard, Banknote,
  Send, X, BarChart3
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

// Format tiền VNĐ
const formatMoney = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

// ===========================
// Types
// ===========================
interface KPIs {
  revenue: number
  pendingAmount: number
  pendingCount: number
  overdueCount: number
  paidCount: number
  totalInvoices: number
}

interface InvoiceRow {
  id: string
  student_id: string
  class_id: string
  amount: number
  status: string
  due_date: string
  paid_at: string | null
  invoice_number: string
  fee_plans: { name: string } | null
  classes: { name: string } | null
  users: { full_name: string } | null
}

interface PaymentRow {
  id: string
  invoice_id: string
  user_id: string
  amount: number
  provider: string
  provider_txn_id: string | null
  status: string
  created_at: string
  invoices: { invoice_number: string } | null
  users: { full_name: string } | null
}

interface ClassOption {
  id: string
  name: string
}

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<'class' | 'student' | 'transactions'>('student')
  const [kpis, setKpis] = useState<KPIs>({ revenue: 0, pendingAmount: 0, pendingCount: 0, overdueCount: 0, paidCount: 0, totalInvoices: 0 })
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog tạo học phí
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    classId: '',
    name: '',
    amount: '',
    dueDate: '',
    description: '',
  })

  // Dialog ghi thu thủ công
  const [cashDialog, setCashDialog] = useState<InvoiceRow | null>(null)
  const [cashNote, setCashNote] = useState('')
  const [cashLoading, setCashLoading] = useState(false)

  // ===========================
  // Fetch KPIs & Data
  // ===========================
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payment/admin/data')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      setKpis(data.kpis)
      setInvoices((data.invoices as InvoiceRow[]) ?? [])
      setPayments((data.payments as PaymentRow[]) ?? [])
      setClasses((data.classes as ClassOption[]) ?? [])
    } catch (error) {
      console.error('Error fetching finance data:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter invoices
  const filteredInvoices = statusFilter === 'all'
    ? invoices
    : invoices.filter(i => i.status === statusFilter)

  // ===========================
  // Tạo học phí mới
  // ===========================
  const handleCreateFeePlan = async () => {
    if (!formData.classId || !formData.name || !formData.amount || !formData.dueDate) {
      alert('Vui lòng điền đầy đủ thông tin')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/payment/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_fee',
          classId: formData.classId,
          name: formData.name,
          amount: parseInt(formData.amount),
          dueDate: formData.dueDate,
          description: formData.description || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Có lỗi xảy ra')
      } else {
        alert(`✅ ${data.message}`)
        setShowCreateDialog(false)
        setFormData({ classId: '', name: '', amount: '', dueDate: '', description: '' })
        fetchData()
      }
    } catch (error) {
      alert('Lỗi kết nối server')
    }
    setCreating(false)
  }

  // ===========================
  // Ghi thu tiền mặt
  // ===========================
  const handleCashPayment = async () => {
    if (!cashDialog) return
    setCashLoading(true)
    try {
      const res = await fetch('/api/payment/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cash_payment',
          invoiceId: cashDialog.id,
          note: cashNote || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Có lỗi xảy ra')
      }
    } catch (error) {
      alert('Lỗi kết nối server')
    }
    setCashDialog(null)
    setCashNote('')
    setCashLoading(false)
    fetchData()
  }

  // Status badge
  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      unpaid: { label: 'Chưa đóng', cls: 'bg-gray-100 text-gray-700' },
      pending: { label: 'Đang xử lý', cls: 'bg-yellow-100 text-yellow-700' },
      paid: { label: 'Đã đóng', cls: 'bg-green-100 text-green-700' },
      overdue: { label: 'Quá hạn', cls: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Đã hủy', cls: 'bg-gray-100 text-gray-500' },
      succeeded: { label: 'Thành công', cls: 'bg-green-100 text-green-700' },
      failed: { label: 'Thất bại', cls: 'bg-red-100 text-red-700' },
    }
    const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-emerald-600" />
          Quản lý Tài chính
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo học phí mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Doanh thu tháng</span>
          </div>
          <div className="text-2xl font-bold text-green-800">{formatMoney(kpis.revenue)}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Chờ thu</span>
          </div>
          <div className="text-2xl font-bold text-orange-800">{formatMoney(kpis.pendingAmount)}</div>
          <div className="text-xs text-orange-600 mt-1">{kpis.pendingCount} hóa đơn</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Đã thu / Tổng</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">{kpis.paidCount} / {kpis.totalInvoices}</div>
          <div className="text-xs text-blue-600 mt-1">
            {kpis.totalInvoices > 0 ? Math.round((kpis.paidCount / kpis.totalInvoices) * 100) : 0}%
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Quá hạn</span>
          </div>
          <div className="text-2xl font-bold text-red-800">{kpis.overdueCount}</div>
          <div className="text-xs text-red-600 mt-1">hóa đơn</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'student' as const, label: '👤 Theo học sinh', icon: Users },
          { key: 'transactions' as const, label: '💳 Giao dịch', icon: CreditCard },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key
                ? 'bg-white shadow text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: Theo học sinh ===== */}
      {activeTab === 'student' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'unpaid', label: 'Chưa đóng' },
              { value: 'overdue', label: 'Quá hạn' },
              { value: 'paid', label: 'Đã đóng' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Học sinh</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Lớp</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Hóa đơn</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Số tiền</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Hạn</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Trạng thái</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{inv.users?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{inv.classes?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(inv.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{format(new Date(inv.due_date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-center">
                        {(inv.status === 'unpaid' || inv.status === 'overdue') && (
                          <button
                            onClick={() => setCashDialog(inv)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-xs font-medium inline-flex items-center gap-1"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            Ghi thu
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: Giao dịch ===== */}
      {activeTab === 'transactions' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Thời gian</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Người TT</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Hóa đơn</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Số tiền</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Provider</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 font-medium">{p.users?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.invoices?.invoice_number ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 uppercase">
                        {p.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      Chưa có giao dịch nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== DIALOG TẠO HỌC PHÍ ===== */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !creating && setShowCreateDialog(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Tạo học phí mới
              </h2>
              <button onClick={() => setShowCreateDialog(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lớp *</label>
                <select
                  value={formData.classId}
                  onChange={e => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên học phí *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Học phí tháng 3/2026"
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="2500000"
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                {formData.amount && (
                  <p className="text-sm text-blue-600 mt-1">{formatMoney(parseInt(formData.amount) || 0)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn đóng *</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Tùy chọn..."
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateFeePlan}
                disabled={creating}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {creating ? 'Đang tạo...' : 'Tạo và gửi thông báo'}
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DIALOG GHI THU TIỀN MẶT ===== */}
      {cashDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !cashLoading && setCashDialog(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Ghi thu tiền mặt
            </h2>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Học sinh</span>
                <span className="font-medium">{cashDialog.users?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hóa đơn</span>
                <span className="font-medium">{cashDialog.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số tiền</span>
                <span className="text-xl font-bold text-emerald-700">{formatMoney(cashDialog.amount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea
                value={cashNote}
                onChange={e => setCashNote(e.target.value)}
                rows={2}
                placeholder="VD: Phụ huynh đến trực tiếp nộp ngày 23/03"
                className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCashPayment}
                disabled={cashLoading}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {cashLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {cashLoading ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
              </button>
              <button
                onClick={() => setCashDialog(null)}
                disabled={cashLoading}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
