import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { enrichRemedClaims } from '@/lib/server/remed-data'
import { getRemedDashboardTotals } from '@/lib/server/remed-dashboard-totals'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Makassar', year: 'numeric' }).format(new Date()))

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

    // One consistent aggregate statement, plus eight recent records in parallel.
    // The server role was already validated by requireRemedApi above.
    const [totals, recent] = await Promise.all([
      getRemedDashboardTotals(ctx.admin),
      ctx.admin.from('remed_claims').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(8),
    ])
    if (recent.error) throw recent.error
    return NextResponse.json({
      role: ctx.access.role,
      stats: {
        totalClaims: totals.totalClaims,
        pending: ctx.access.role === 'hr' ? totals.pendingHR : totals.financeSummary.review + totals.financeSummary.waitingPayment,
        paidCount: totals.paidCount,
        paidTotal: totals.paidTotal,
      },
      ...(ctx.access.role === 'finance' ? { financeSummary: totals.financeSummary } : {}),
      recentClaims: await enrichRemedClaims(ctx.admin, recent.data || []),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
