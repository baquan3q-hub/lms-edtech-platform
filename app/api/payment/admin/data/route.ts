import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/payment/admin/data
 * Lấy toàn bộ dữ liệu tài chính cho admin (bypass RLS)
 */
export async function GET() {
  // Kiểm tra auth + role admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  // Kiểm tra role admin
  const { data: userData } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(), 1
  ).toISOString()

  const [revenueRes, pendingRes, overdueRes, paidRes, totalRes, invoiceRes, paymentRes, classRes] = await Promise.all([
    adminClient.from('payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', firstOfMonth),
    adminClient.from('invoices')
      .select('amount')
      .in('status', ['unpaid', 'pending']),
    adminClient.from('invoices')
      .select('id', { count: 'exact' })
      .eq('status', 'overdue'),
    adminClient.from('invoices')
      .select('id', { count: 'exact' })
      .eq('status', 'paid'),
    adminClient.from('invoices')
      .select('id', { count: 'exact' }),
    adminClient.from('invoices')
      .select(`
        *,
        fee_plans ( name ),
        classes ( name ),
        users!student_id ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(200),
    adminClient.from('payments')
      .select(`
        *,
        invoices ( invoice_number ),
        users!user_id ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(200),
    adminClient.from('classes')
      .select('id, name')
      .order('name'),
  ])

  return NextResponse.json({
    kpis: {
      revenue: revenueRes.data?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0,
      pendingAmount: pendingRes.data?.reduce((s, i) => s + (i.amount || 0), 0) ?? 0,
      pendingCount: pendingRes.data?.length ?? 0,
      overdueCount: overdueRes.count ?? 0,
      paidCount: paidRes.count ?? 0,
      totalInvoices: totalRes.count ?? 0,
    },
    invoices: invoiceRes.data ?? [],
    payments: paymentRes.data ?? [],
    classes: classRes.data ?? [],
  })
}
