import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/payment/admin/data
 * Lấy toàn bộ dữ liệu tài chính cho admin theo tháng
 */
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'month'
  const quarterParam = searchParams.get('quarter')
  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')
  
  const currentYear = new Date().getFullYear()
  const year = yearParam ? parseInt(yearParam) : currentYear
  
  let startDateIso = ''
  let endDateIso = ''
  let startStr = ''
  let endStr = ''

  if (period !== 'all') {
    let startDate: Date;
    let endDate: Date;

    if (period === 'month') {
        const currentMonth = new Date().getMonth()
        const month = monthParam ? parseInt(monthParam) - 1 : currentMonth
        startDate = new Date(year, month, 1)
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)
    } else if (period === 'quarter') {
        const q = quarterParam ? parseInt(quarterParam) : Math.floor(new Date().getMonth() / 3) + 1
        startDate = new Date(year, (q - 1) * 3, 1)
        endDate = new Date(year, q * 3, 0, 23, 59, 59, 999)
    } else { // year
        startDate = new Date(year, 0, 1)
        endDate = new Date(year, 11, 31, 23, 59, 59, 999)
    }
    startDateIso = startDate.toISOString()
    endDateIso = endDate.toISOString()

    const pad = (n: number) => String(n).padStart(2, '0')
    startStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`
    endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`
  }

  // Bỏ load revenue dựa trên payment created_at vì yêu cầu tính doanh thu theo tháng của khóa học (dựa vào due_date của invoice)

  // 2. Load KPIs and invoices: Dựa trên due_date
  let allInvoicesQuery = adminClient.from('invoices')
      .select(`
        *,
        fee_plans ( name ),
        classes ( name ),
        users!student_id ( full_name )
      `)

  // 3. Load Payments list
  let paymentsQuery = adminClient.from('payments')
      .select(`
        *,
        invoices ( invoice_number ),
        users!user_id ( full_name )
      `)

  if (period !== 'all') {
      const orConditions = [
        `and(due_date.gte.${startStr},due_date.lte.${endStr})`,
        `and(paid_at.gte.${startDateIso},paid_at.lte.${endDateIso})`,
        `status.in.(unpaid,overdue,pending)`
      ]
      allInvoicesQuery = allInvoicesQuery.or(orConditions.join(','))
      paymentsQuery = paymentsQuery.gte('created_at', startDateIso).lte('created_at', endDateIso)
  }

  const allInvoicesPromise = allInvoicesQuery.order('created_at', { ascending: false }).limit(2000)
  const paymentsPromise = paymentsQuery.order('created_at', { ascending: false }).limit(1000)

  const classPromise = adminClient.from('classes')
      .select('id, name')
      .order('name')

  // Fee Plans query — danh sách đợt học phí admin đã tạo
  const feePlansPromise = adminClient.from('fee_plans')
      .select(`
        *,
        classes ( name ),
        users!created_by ( full_name ),
        invoices ( id, status, amount, student_id, users!student_id(full_name), invoice_number )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

  const [invoicesRes, paymentRes, classRes, feePlansRes] = await Promise.all([
    allInvoicesPromise,
    paymentsPromise,
    classPromise,
    feePlansPromise,
  ])

  // Process KPIs in memory since we already fetched invoices for the month
  const invoicesList = invoicesRes.data || []
  let pendingAmount = 0
  let pendingCount = 0
  let overdueCount = 0
  let paidCount = 0
  let monthRevenue = 0

  invoicesList.forEach(inv => {
      // Pending
      if (['unpaid', 'pending'].includes(inv.status)) {
          pendingAmount += (inv.amount || 0)
          pendingCount += 1
      }
      
      // Overdue
      // Note: overdue status could be tracked statically or computed based on date.
      if (inv.status === 'overdue' || (['unpaid', 'pending'].includes(inv.status) && new Date(inv.due_date) < new Date())) {
          overdueCount += 1
      }

      // Paid
      if (inv.status === 'paid') {
          paidCount += 1
          monthRevenue += (inv.amount || 0)
      }
  })

  // Tính thống kê cho từng fee_plan (sử dụng nested invoices)
  const feePlansList = (feePlansRes.data ?? []).map(fp => {
    const fpInvoices = fp.invoices || []
    const paidInvs = fpInvoices.filter((inv: any) => inv.status === 'paid' || inv.status === 'succeeded')
    return {
      ...fp,
      invoice_total: fpInvoices.length,
      invoice_paid: paidInvs.length,
      collected_amount: paidInvs.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0),
      can_edit: fpInvoices.every((inv: any) => inv.status === 'unpaid' || inv.status === 'overdue'),
      // Keep invoices array for detailed view on frontend
      invoices: fpInvoices
    }
  })

  return NextResponse.json({
    kpis: {
      revenue: monthRevenue,
      pendingAmount,
      pendingCount,
      overdueCount,
      paidCount,
      totalInvoices: invoicesList.length,
    },
    invoices: invoicesList,
    payments: paymentRes.data ?? [],
    classes: classRes.data ?? [],
    feePlans: feePlansList,
  })
}
