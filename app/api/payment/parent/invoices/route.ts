import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/payment/parent/invoices
 * Lấy danh sách invoices cho con em của phụ huynh (bypass RLS)
 */
export async function GET() {
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

  // Tìm student_ids từ parent_students
  const { data: links } = await adminClient
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', user.id)

  const studentIds = links?.map(l => l.student_id) ?? []
  if (studentIds.length === 0) {
    return NextResponse.json({ invoices: [] })
  }

  // Fetch invoices với relations
  const { data: invoices, error } = await adminClient
    .from('invoices')
    .select(`
      *,
      fee_plans ( name, description ),
      classes ( name ),
      users!student_id ( full_name )
    `)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Parent Invoices]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoices: invoices ?? [] })
}
