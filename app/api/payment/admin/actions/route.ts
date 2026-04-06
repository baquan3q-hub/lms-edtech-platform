import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createFeeSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string(),
  description: z.string().optional(),
})

const cashPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  note: z.string().optional(),
})

const approveTransferSchema = z.object({
  invoiceId: z.string().uuid(),
  note: z.string().optional(),
})

/**
 * POST /api/payment/admin/actions
 * Xử lý các thao tác admin: tạo học phí, ghi thu tiền mặt
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  // Verify admin role
  const { data: userData } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  // ========== TẠO HỌC PHÍ ==========
  if (action === 'create_fee') {
    try {
      const data = createFeeSchema.parse(body)

      // 1. INSERT fee_plan
      const { data: feePlan, error: fpError } = await adminClient
        .from('fee_plans')
        .insert({
          class_id: data.classId,
          name: data.name,
          amount: data.amount,
          due_date: data.dueDate,
          description: data.description || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (fpError || !feePlan) {
        return NextResponse.json({ error: 'Lỗi tạo học phí: ' + (fpError?.message || '') }, { status: 400 })
      }

      // 2. Lấy danh sách học sinh enrolled
      const { data: enrollments } = await adminClient
        .from('enrollments')
        .select('student_id')
        .eq('class_id', data.classId)
        .eq('status', 'active')

      if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ error: 'Không có học sinh nào trong lớp này' }, { status: 400 })
      }

      // 3. Bulk INSERT invoices
      const invoicesToInsert = enrollments.map(e => ({
        fee_plan_id: feePlan.id,
        student_id: e.student_id,
        class_id: data.classId,
        amount: data.amount,
        due_date: data.dueDate,
        status: 'unpaid',
      }))

      const { error: invError } = await adminClient
        .from('invoices')
        .insert(invoicesToInsert)

      if (invError) {
        return NextResponse.json({ error: 'Lỗi tạo hóa đơn: ' + invError.message }, { status: 400 })
      }

      // 4. Gửi notifications cho phụ huynh
      const studentIds = enrollments.map(e => e.student_id)
      const { data: parents } = await adminClient
        .from('parent_students')
        .select('parent_id')
        .in('student_id', studentIds)

      if (parents && parents.length > 0) {
        const formattedAmount = new Intl.NumberFormat('vi-VN', {
          style: 'currency', currency: 'VND'
        }).format(data.amount)

        const notifs = parents.map(p => ({
          user_id: p.parent_id,
          title: '📬 Thông báo học phí mới',
          message: `${data.name} — ${formattedAmount}. Hạn đóng: ${data.dueDate}`,
          type: 'payment',
          read: false,
        }))
        await adminClient.from('notifications').insert(notifs)
      }

      return NextResponse.json({
        success: true,
        message: `Đã tạo ${enrollments.length} hóa đơn cho ${enrollments.length} học sinh!`,
      })
    } catch (error) {
      console.error('[Create Fee]', error)
      return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
    }
  }

  // ========== GHI THU TIỀN MẶT ==========
  if (action === 'cash_payment') {
    try {
      const data = cashPaymentSchema.parse(body)

      // Lấy thông tin invoice
      const { data: invoice } = await adminClient
        .from('invoices')
        .select('id, student_id, amount, invoice_number')
        .eq('id', data.invoiceId)
        .single()

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice không tồn tại' }, { status: 404 })
      }

      // INSERT payment (cash)
      await adminClient.from('payments').insert({
        invoice_id: invoice.id,
        user_id: user.id,
        amount: invoice.amount,
        currency: 'VND',
        provider: 'cash',
        status: 'succeeded',
        provider_txn_id: `CASH-${Date.now()}`,
        ip_address: 'admin-manual',
      })

      // UPDATE invoice
      await adminClient.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        notes: data.note || 'Thu tiền mặt tại quầy',
      }).eq('id', invoice.id)

      // Notification cho PH
      const { data: parents } = await adminClient
        .from('parent_students')
        .select('parent_id')
        .eq('student_id', invoice.student_id)

      if (parents && parents.length > 0) {
        const formattedAmount = new Intl.NumberFormat('vi-VN', {
          style: 'currency', currency: 'VND'
        }).format(invoice.amount)

        const notifs = parents.map(p => ({
          user_id: p.parent_id,
          title: '✅ Xác nhận thu học phí',
          message: `Hóa đơn ${invoice.invoice_number} — ${formattedAmount} đã được xác nhận.`,
          type: 'payment',
          read: false,
        }))
        await adminClient.from('notifications').insert(notifs)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Cash Payment]', error)
      return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
    }
  }

  // ========== DUYỆT CHUYỂN KHOẢN ==========
  if (action === 'approve_transfer') {
    try {
      const data = approveTransferSchema.parse(body)

      // Lấy thông tin invoice
      const { data: invoice } = await adminClient
        .from('invoices')
        .select('id, student_id, amount, invoice_number')
        .eq('id', data.invoiceId)
        .single()

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice không tồn tại' }, { status: 404 })
      }

      // INSERT payment (bank_transfer)
      await adminClient.from('payments').insert({
        invoice_id: invoice.id,
        user_id: user.id,
        amount: invoice.amount,
        currency: 'VND',
        provider: 'bank_transfer',
        status: 'succeeded',
        provider_txn_id: `TF-${Date.now()}`,
        ip_address: 'admin-manual',
      })

      // UPDATE invoice
      await adminClient.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        notes: data.note || 'Xác nhận chuyển khoản thành công',
      }).eq('id', invoice.id)

      // Notification cho PH
      const { data: parents } = await adminClient
        .from('parent_students')
        .select('parent_id')
        .eq('student_id', invoice.student_id)

      if (parents && parents.length > 0) {
        const formattedAmount = new Intl.NumberFormat('vi-VN', {
          style: 'currency', currency: 'VND'
        }).format(invoice.amount)

        const notifs = parents.map(p => ({
          user_id: p.parent_id,
          title: '✅ Xác nhận thu học phí',
          message: `Hóa đơn ${invoice.invoice_number} — ${formattedAmount} đã được xác nhận thanh toán chuyển khoản.`,
          type: 'payment',
          read: false,
        }))
        await adminClient.from('notifications').insert(notifs)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Approve Transfer]', error)
      return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
