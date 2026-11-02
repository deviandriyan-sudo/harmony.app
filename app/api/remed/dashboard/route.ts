import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { enrichRemedClaims } from '@/lib/server/remed-data'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    const year = new Date().getFullYear()

    if (ctx.access.role === 'employee') {
      if (!ctx.access.employee_id) {
        throw Object.assign(new Error('Akun Re-Med belum terhubung ke master karyawan.'), { status: 409 })
      }

      const [entitlementResult, claimsResult] = await Promise.all([
        ctx.admin
          .from('remed_entitlements')
          .select('id,employee_id,period_year,plafond_total,legacy_used,current_used,reserved_amount,balance_adjustment')
          .eq('employee_id', ctx.access.employee_id)
          .eq('period_year', year)
          .maybeSingle(),
        ctx.admin
          .from('remed_claims')
          .select('*')
          .eq('employee_id', ctx.access.employee_id)
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      if (entitlementResult.error) throw entitlementResult.error
      if (claimsResult.error) throw claimsResult.error

      const entitlement = entitlementResult.data
        ? {
            ...entitlementResult.data,
            available_amount:
              Number(entitlementResult.data.plafond_total || 0) +
              Number(entitlementResult.data.balance_adjustment || 0) -
              Number(entitlementResult.data.legacy_used || 0) -
              Number(entitlementResult.data.current_used || 0) -
              Number(entitlementResult.data.reserved_amount || 0),
          }
        : null

      return NextResponse.json({
        role: 'employee',
        entitlement,
        recentClaims: await enrichRemedClaims(ctx.admin, claimsResult.data || []),
      })
    }

    // Read only eight detailed records. Aggregate counts server-side and
    // transfer only amount columns for paid claims (not full historical rows).
    const relevantStatuses = ctx.access.role === 'hr'
      ? ['pending_hr']
      : ['pending_finance', 'waiting_payment']
    const PAGE = 500
    const [total, pending, paidFirst, recent] = await Promise.all([
      ctx.admin.from('remed_claims').select('id', { count: 'exact', head: true }),
      ctx.admin.from('remed_claims').select('id', { count: 'exact', head: true }).in('status', relevantStatuses),
      ctx.admin.from('remed_claims')
        .select('approved_amount,submitted_amount', { count: 'exact' })
        .eq('status', 'paid').order('id', { ascending: true }).range(0, PAGE - 1),
      ctx.admin.from('remed_claims')
        .select('*').order('created_at', { ascending: false }).limit(8),
    ])
    if (total.error) throw total.error
    if (pending.error) throw pending.error
    if (paidFirst.error) throw paidFirst.error
    if (recent.error) throw recent.error

    let paidTotal = 0
    const sumAmounts = (rows: { approved_amount: number | null; submitted_amount: number | null }[]) => {
      for (const row of rows) paidTotal += Number(row.approved_amount || row.submitted_amount || 0)
    }
    sumAmounts(paidFirst.data || [])
    const paidCount = paidFirst.count ?? (paidFirst.data || []).length
    // Supabase defaults to a 1,000-row cap; do not silently undercount older payments.
    for (let offset = PAGE; offset < paidCount; offset += PAGE) {
      const page = await ctx.admin.from('remed_claims')
        .select('approved_amount,submitted_amount')
        .eq('status', 'paid').order('id', { ascending: true })
        .range(offset, offset + PAGE - 1)
      if (page.error) throw page.error
      sumAmounts(page.data || [])
    }

    return NextResponse.json({
      role: ctx.access.role,
      stats: {
        totalClaims: total.count ?? 0,
        pending: pending.count ?? 0,
        paidCount,
        paidTotal,
      },
      recentClaims: await enrichRemedClaims(ctx.admin, recent.data || []),
    })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
