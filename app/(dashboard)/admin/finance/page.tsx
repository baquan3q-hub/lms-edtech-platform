'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle, Plus,
  Loader2, FileText, Users, CreditCard, Banknote,
  Send, X, BarChart3, CalendarDays, Pencil, Trash2, Eye, Bell
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

interface FeePlanRow {
  id: string
  class_id: string
  name: string
  amount: number
  due_date: string
  description: string | null
  created_by: string
  created_at: string
  classes: { name: string } | null
  users: { full_name: string } | null
  invoice_total: number
  invoice_paid: number
  collected_amount: number
  can_edit: boolean
  invoices?: {
    id: string
    status: string
    amount: number
    invoice_number: string
    users: { full_name: string } | null
  }[]
}

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<'feeplans' | 'student' | 'transactions'>('student')
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => (Math.floor(new Date().getMonth() / 3) + 1).toString())
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString())
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

  // Fee Plans management
  const [feePlans, setFeePlans] = useState<FeePlanRow[]>([])
  const [editingFee, setEditingFee] = useState<FeePlanRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', amount: '', dueDate: '', description: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [deletingFee, setDeletingFee] = useState<FeePlanRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [detailsFee, setDetailsFee] = useState<FeePlanRow | null>(null)

  // ===========================
  // Fetch KPIs & Data
  // ===========================
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [mYear, mMonth] = selectedMonth.split('-')
      let url = `/api/payment/admin/data?period=${period}`
      if (period === 'month') {
        url += `&month=${mMonth}&year=${mYear}`
      } else if (period === 'quarter') {
        url += `&quarter=${selectedQuarter}&year=${selectedYear}`
      } else if (period === 'year') {
        url += `&year=${selectedYear}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      setKpis(data.kpis)
      setInvoices((data.invoices as InvoiceRow[]) ?? [])
      setPayments((data.payments as PaymentRow[]) ?? [])
      setClasses((data.classes as ClassOption[]) ?? [])
      setFeePlans((data.feePlans as FeePlanRow[]) ?? [])
    } catch (error) {
      console.error('Error fetching finance data:', error)
    }
    setLoading(false)
  }, [period, selectedMonth, selectedQuarter, selectedYear])

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
  // Ghi thu tiền mặt / Duyệt CK
  // ===========================
  const handleCashPayment = async () => {
    if (!cashDialog) return
    setCashLoading(true)
    const isApproveTransfer = cashDialog.status === 'pending'
    try {
      const res = await fetch('/api/payment/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isApproveTransfer ? 'approve_transfer' : 'cash_payment',
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

  // ===========================
  // Cập nhật đợt học phí
  // ===========================
  const openEditFee = (fp: FeePlanRow) => {
    setEditingFee(fp)
    setEditForm({
      name: fp.name,
      amount: String(fp.amount),
      dueDate: fp.due_date,
      description: fp.description || '',
    })
  }

  const handleUpdateFee = async () => {
    if (!editingFee) return
    setEditLoading(true)
    try {
      const res = await fetch('/api/payment/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_fee',
          feePlanId: editingFee.id,
          name: editForm.name || undefined,
          amount: editForm.amount ? parseInt(editForm.amount) : undefined,
          dueDate: editForm.dueDate || undefined,
          description: editForm.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Có lỗi xảy ra')
      } else {
        alert(`✅ ${data.message}`)
        setEditingFee(null)
        fetchData()
      }
    } catch {
      alert('Lỗi kết nối server')
    }
    setEditLoading(false)
  }

  // ===========================
  // Xóa đợt học phí
  // ===========================
  const handleDeleteFee = async () => {
    if (!deletingFee) return
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/payment/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_fee',
          feePlanId: deletingFee.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Có lỗi xảy ra')
      } else {
        alert(`✅ ${data.message}`)
        setDeletingFee(null)
        fetchData()
      }
    } catch {
      alert('Lỗi kết nối server')
    }
    setDeleteLoading(false)
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
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className="text-sm font-medium text-slate-700 bg-white border border-slate-200 px-3 py-2.5 rounded-full shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            <option value="month">Theo tháng</option>
            <option value="quarter">Theo quý</option>
            <option value="year">Theo năm</option>
            <option value="all">Tất cả</option>
          </select>

          {period === 'month' && (
            <div className="relative flex items-center gap-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-4 py-2.5 rounded-full shadow-sm hover:border-indigo-300 transition-colors w-[220px] lg:w-[260px]">
              {(() => {
                const monthNames = ["Một", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Mười Một", "Mười Hai"];
                const [y, m] = selectedMonth.split('-');
                const displayMonth = monthNames[parseInt(m) - 1];
                return (
                  <div className="flex-1 flex items-center justify-between pointer-events-none">
                    <span>Tháng<span className="font-bold text-slate-700 ml-1"> {displayMonth} {y}</span></span>
                    <CalendarDays className="w-4 h-4 text-slate-700" />
                  </div>
                );
              })()}
              <input
                type="month"
                value={selectedMonth}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker();
                  } catch (err) { }
                }}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
              />
            </div>
          )}

          {period === 'quarter' && (
            <div className="flex gap-2">
              <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)} className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full px-4 py-2.5 shadow-sm outline-none cursor-pointer">
                <option value="1">Quý 1</option>
                <option value="2">Quý 2</option>
                <option value="3">Quý 3</option>
                <option value="4">Quý 4</option>
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full px-4 py-2.5 shadow-sm outline-none cursor-pointer">
                {[0, 1, 2, 3].map(i => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>Năm {y}</option>
                })}
              </select>
            </div>
          )}

          {period === 'year' && (
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full px-4 py-2.5 shadow-sm outline-none cursor-pointer">
              {[0, 1, 2, 3, 4].map(i => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>Năm {y}</option>
              })}
            </select>
          )}
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
          { key: 'feeplans' as const, label: '📝 Đợt học phí', icon: FileText },
          { key: 'transactions' as const, label: '💳 Giao dịch', icon: CreditCard },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab.key
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === f.value
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
                        <div className="flex justify-center gap-2">
                          {(inv.status === 'unpaid' || inv.status === 'overdue') && (
                            <button
                              onClick={() => setCashDialog(inv)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-xs font-medium inline-flex items-center gap-1"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              Ghi thu
                            </button>
                          )}
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => setCashDialog(inv)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-xs font-medium inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Duyệt CK
                            </button>
                          )}
                        </div>
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

      {/* ===== TAB: Đợt học phí ===== */}
      {activeTab === 'feeplans' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Tên đợt học phí</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Lớp</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Số tiền</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Hạn đóng</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Đã thu</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Đã thu (VNĐ)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Người tạo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Ngày tạo</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {feePlans.map(fp => {
                  const isFullyPaid = fp.invoice_total > 0 && fp.invoice_paid === fp.invoice_total
                  const isOverdue = !isFullyPaid && new Date(fp.due_date) < new Date()
                  return (
                    <tr key={fp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {fp.name}
                          {isFullyPaid && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">✓ Đủ</span>}
                          {isOverdue && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">Quá hạn</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fp.classes?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(fp.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{format(new Date(fp.due_date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${fp.invoice_paid === fp.invoice_total && fp.invoice_total > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                          {fp.invoice_paid}/{fp.invoice_total}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">{formatMoney(fp.collected_amount)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fp.users?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(fp.created_at), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => setDetailsFee(fp)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition" title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {fp.can_edit ? (
                            <>
                              <button
                                onClick={() => openEditFee(fp)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition" title="Chỉnh sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingFee(fp)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition" title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Đã có thanh toán</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {feePlans.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      Chưa tạo đợt học phí nào
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

      {/* ===== DIALOG GHI THU TIỀN MẶT / DUYỆT CHUYỂN KHOẢN ===== */}
      {cashDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !cashLoading && setCashDialog(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {cashDialog.status === 'pending' ? (
                <><CheckCircle2 className="w-5 h-5 text-blue-600" /> Duyệt chuyển khoản</>
              ) : (
                <><Banknote className="w-5 h-5 text-emerald-600" /> Ghi thu tiền mặt</>
              )}
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
                placeholder={cashDialog.status === 'pending' ? "VD: Đã nhận tiền qua VCB" : "VD: Phụ huynh đến trực tiếp nộp ngày 23/03"}
                className={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 resize-none ${cashDialog.status === 'pending' ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                  }`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCashPayment}
                disabled={cashLoading}
                className={`flex-1 py-3 text-white rounded-xl font-medium disabled:opacity-50 transition flex items-center justify-center gap-2 ${cashDialog.status === 'pending' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
              >
                {cashLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {cashLoading ? 'Đang xử lý...' : (cashDialog.status === 'pending' ? 'Xác nhận. Đã nhận đủ tiền' : 'Xác nhận thu tiền')}
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

      {/* ===== DIALOG CHỈNH SỬA ĐỢT HỌC PHÍ ===== */}
      {editingFee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !editLoading && setEditingFee(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Chỉnh sửa đợt học phí
              </h2>
              <button onClick={() => setEditingFee(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              ⚠️ Thay đổi sẽ áp dụng cho tất cả hóa đơn chưa thanh toán trong đợt này.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên học phí</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                {editForm.amount && (
                  <p className="text-sm text-blue-600 mt-1">{formatMoney(parseInt(editForm.amount) || 0)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn đóng</label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpdateFee}
                disabled={editLoading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                onClick={() => setEditingFee(null)}
                disabled={editLoading}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DIALOG XÁC NHẬN XÓA ĐỢT HỌC PHÍ ===== */}
      {deletingFee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !deleteLoading && setDeletingFee(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Xác nhận xóa đợt học phí
            </h2>

            <div className="bg-red-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-red-800">Bạn có chắc chắn muốn xóa đợt học phí này?</p>
              <div className="text-sm text-red-700 space-y-1">
                <p>• <strong>{deletingFee.name}</strong></p>
                <p>• Lớp: {deletingFee.classes?.name ?? '—'}</p>
                <p>• Số tiền: {formatMoney(deletingFee.amount)}</p>
                <p>• {deletingFee.invoice_total} hóa đơn sẽ bị hủy</p>
              </div>
              <p className="text-xs text-red-600 font-medium mt-2">⚠️ Hành động này không thể hoàn tác!</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteFee}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleteLoading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
              <button
                onClick={() => setDeletingFee(null)}
                disabled={deleteLoading}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DIALOG CHI TIẾT ĐỢT HỌC PHÍ ===== */}
      {detailsFee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailsFee(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Chi tiết: {detailsFee.name}
              </h2>
              <button onClick={() => setDetailsFee(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 shrink-0">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Lớp</div>
                <div className="font-bold">{detailsFee.classes?.name}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Hạn đóng</div>
                <div className="font-bold">{format(new Date(detailsFee.due_date), 'dd/MM/yyyy')}</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="text-xs text-emerald-600 mb-1">Đã thu / Tổng</div>
                <div className="font-bold text-emerald-700">{detailsFee.invoice_paid} / {detailsFee.invoice_total}</div>
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Mã HĐ</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Học sinh</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Số tiền</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Trạng thái</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detailsFee.invoices?.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3 font-medium">{inv.users?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(inv.amount)}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-center">
                        {inv.status !== 'paid' && inv.status !== 'succeeded' ? (
                          <button
                            onClick={() => alert('Đã gửi thông báo nhắc nhở (Demo)')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-medium transition"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            Nhắc nhở
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!detailsFee.invoices || detailsFee.invoices.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Không có hóa đơn nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="shrink-0 flex justify-end">
              <button
                onClick={() => setDetailsFee(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
