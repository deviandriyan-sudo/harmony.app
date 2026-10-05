import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const year = Number(new URL(request.url).searchParams.get('year') || new Date().getFullYear())

    const [entitlementResult, employeeResult] = await Promise.all([
      ctx.admin
        .from('remed_entitlements')
        .select('id,employee_id,period_year,plafond_total,legacy_used,current_used,reserved_amount,balance_adjustment')
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
      const adjustment = Number(value?.balance_adjustment || 0)
      return {
        id: value?.id || `unconfigured-${employee.id}-${year}`,
        employee_id: employee.id,
        period_year: year,
        plafond_total: plafond,
        legacy_used: legacy,
        current_used: current,
        reserved_amount: reserved,
        balance_adjustment: adjustment,
        available_amount: plafond + adjustment - legacy - current - reserved,
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
    const action = String(body?.action || '').trim()
    const note = String(body?.note || '').trim()

    if (!employeeId || !Number.isInteger(year)) {
      throw Object.assign(new Error('Employee atau tahun tidak valid.'), { status: 400 })
    }

    if (action === 'adjust_balance') {
      const targetAvailable = Number(body?.target_available)
      if (!Number.isFinite(targetAvailable) || targetAvailable < 0) {
        throw Object.assign(new Error('Sisa plafond baru tidak valid.'), { status: 400 })
      }

      const { error } = await ctx.admin.rpc('remed_adjust_available_balance_v2', {
        p_employee_id: employeeId,
        p_period_year: year,
        p_target_available: targetAvailable,
        p_note: note || null,
        p_actor_auth_user_id: ctx.authUserId,
        p_actor_email: ctx.access.email,
      })
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'set_plafond') {
      const plafondTotal = Number(body?.plafond_total)
      if (!Number.isFinite(plafondTotal) || plafondTotal < 0) {
        throw Object.assign(new Error('Plafond dasar baru tidak valid.'), { status: 400 })
      }

      const { error } = await ctx.admin.rpc('remed_set_plafond_v2', {
        p_employee_id: employeeId,
        p_period_year: year,
        p_plafond_total: plafondTotal,
        p_note: note || null,
        p_actor_auth_user_id: ctx.authUserId,
        p_actor_email: ctx.access.email,
      })
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      return NextResponse.json({ success: true })
    }

    throw Object.assign(new Error('Jenis penyesuaian tidak valid.'), { status: 400 })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
