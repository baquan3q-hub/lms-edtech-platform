import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/payment/parent/confirm-transfer
 * Phụ huynh bấm "Đã chuyển khoản" → chuyển status invoice sang "pending"
 * Admin sẽ verify và đổi thành "paid" sau.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  // Verify parent role
  const { data: userData } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { invoiceId } = body

  if (!invoiceId) {
    return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
  }

  // Verify invoice belongs to parent's student
  const { data: links } = await adminClient
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', user.id)

  const studentIds = links?.map(l => l.student_id) ?? []

  const { data: invoice } = await adminClient
    .from('invoices')
    .select('id, status, student_id')
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (!studentIds.includes(invoice.student_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only update if status is unpaid or overdue
  if (!['unpaid', 'overdue'].includes(invoice.status)) {
    return NextResponse.json({ error: `Invoice status is already "${invoice.status}"` }, { status: 400 })
  }

  // Update status to pending
  const { error: updateError } = await adminClient
    .from('invoices')
    .update({
      status: 'pending',
      notes: `Phụ huynh xác nhận đã chuyển khoản lúc ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    })
    .eq('id', invoiceId)

  if (updateError) {
    console.error('[Confirm Transfer]', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Đã ghi nhận chuyển khoản. Admin sẽ xác nhận sớm.' })
}
