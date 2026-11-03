import { NextRequest, NextResponse } from 'next/server'
import { scaleupContext, requireScaleupEmployee, scaleupRouteError } from '@/lib/server/scaleup'

export const runtime = 'nodejs'
const ROLES = new Set(['supervisor_1', 'supervisor_2', 'wadirsdk', 'finance', 'director'])

/** Employees are discoverable for manual selection. Submission authority is STILL
 * enforced in both /api/scaleup and the database RPC. Directory does not grant approval rights. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await scaleupContext(request)
    const requester = requireScaleupEmployee(ctx)
    const role = request.nextUrl.searchParams.get('role') || ''
    if (!ROLES.has(role)) return NextResponse.json({ message: 'Role tidak valid.' }, { status: 400 })
    const raw = (request.nextUrl.searchParams.get('q') || '').trim()
    const query = raw.replace(/[%_,]/g, '').slice(0, 70)
    const pageRaw = Number(request.nextUrl.searchParams.get('page') || 0)
    const page = Number.isInteger(pageRaw) ? Math.min(Math.max(pageRaw, 0), 100) : 0
    const limit = 30
    let builder = ctx.admin.from('employees')
      .select('id,full_name,employee_number,department,position', { count: 'exact' })
      .eq('is_active', true).neq('id', requester)
      .order('full_name').order('id').range(page * limit, page * limit + limit - 1)
    if (query) builder = builder.ilike('full_name', `%${query}%`)
    const { data, error, count } = await builder
    if (error) throw error
    // Role-specific authorization is not guessed from the visible job title.
    // The current server RPC decides if a selected person can sign this role.
    const candidates = role.startsWith('supervisor')
      ? (data || []).map(employee => ({ ...employee, eligible: true }))
      : await Promise.all((data || []).map(async employee => {
      const result = await ctx.admin.rpc('scaleup_is_eligible_v1', {
        p_requester: requester, p_role: role, p_employee: employee.id,
      })
      if (result.error) throw result.error
      return { ...employee, eligible: result.data === true }
    }))
    return NextResponse.json({
      candidates,
      total: count || 0,
      page,
      hasMore: (page + 1) * limit < (count || 0),
      roleRestricted: !role.startsWith('supervisor'),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const e = scaleupRouteError(error)
    return NextResponse.json({ message: e.message }, { status: e.status })
  }
}
