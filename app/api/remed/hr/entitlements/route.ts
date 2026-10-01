import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const year = Number(new URL(request.url).searchParams.get('year') || new Date().getFullYear())

    const [entitlementResult, employeeResult] = await Promise.all([
      ctx.admin
        .from('remed_entitlements')
        .select('id,employee_id,period_year,plafond_total,legacy_used,current_used,reserved_amount')
        .eq('period_year', year),
      ctx.admin
        .from('employees')
        .select('id,employee_number,full_name,department,position,email,is_active')
        .eq('is_active', true)
        .order('full_name', { ascending: true }),
    ])
    if (entitlementResult.error) throw entitlementResult.error
    if (employeeResult.error) throw employeeResult.error

    const entitlementMap = new Map((entitlementResult.data || []).map((x: any) => [x.employee_id, x]))
    const rows = (employeeResult.data || []).map((employee: any) => {
      const value: any = entitlementMap.get(employee.id)
      const plafond = Number(value?.plafond_total || 0)
      const legacy = Number(value?.legacy_used || 0)
      const current = Number(value?.current_used || 0)
      const reserved = Number(value?.reserved_amount || 0)
      return {
        id: value?.id || `unconfigured-${employee.id}-${year}`,
        employee_id: employee.id,
        period_year: year,
        plafond_total: plafond,
        legacy_used: legacy,
        current_used: current,
        reserved_amount: reserved,
        available_amount: Math.max(0, plafond - legacy - current - reserved),
        employee,
      }
    })

    return NextResponse.json({ entitlements: rows, year })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const body = await request.json()
    const employeeId = String(body?.employee_id || '').trim()
    const year = Number(body?.period_year || new Date().getFullYear())
    const plafondTotal = Number(body?.plafond_total || 0)
    const note = String(body?.note || '').trim()

    if (!employeeId || !Number.isInteger(year) || !Number.isFinite(plafondTotal) || plafondTotal < 0) {
      throw Object.assign(new Error('Employee, tahun, atau plafond tidak valid.'), { status: 400 })
    }

    const { error } = await ctx.admin.rpc('remed_set_entitlement_v1', {
      p_employee_id: employeeId,
      p_period_year: year,
      p_plafond_total: plafondTotal,
      p_note: note || null,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
