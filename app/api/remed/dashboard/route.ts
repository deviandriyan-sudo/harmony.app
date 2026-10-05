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

    let relevantStatuses: string[] | null = null
    if (ctx.access.role === 'hr') relevantStatuses = ['pending_hr']
    if (ctx.access.role === 'finance') relevantStatuses = ['pending_finance', 'waiting_payment']

    const base = ctx.admin.from('remed_claims').select('*').order('created_at', { ascending: false })
    const { data: allClaims, error: claimsError } = await base
    if (claimsError) throw claimsError

    const claims = allClaims || []
    const recent = claims.slice(0, 8)
    const pending = relevantStatuses ? claims.filter((x: any) => relevantStatuses!.includes(x.status)).length : 0
    const paid = claims.filter((x: any) => x.status === 'paid')
    const paidTotal = paid.reduce((sum: number, x: any) => sum + Number(x.approved_amount || x.submitted_amount || 0), 0)

    return NextResponse.json({
      role: ctx.access.role,
      stats: {
        totalClaims: claims.length,
        pending,
        paidCount: paid.length,
        paidTotal,
      },
      recentClaims: await enrichRemedClaims(ctx.admin, recent),
    })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
