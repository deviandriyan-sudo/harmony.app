import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function bearer(request: NextRequest) {
  return clean(request.headers.get('authorization')).replace(/^Bearer\s+/i, '').trim()
}

function isFlexibleTechnicalCycle(value: any) {
  return String(value?.notes || '').includes('[HR_FLEX_POSTPONE]')
}

async function clientFor(request: NextRequest) {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const token = bearer(request)

  if (!url || !anon || !token) throw new Error('Session atau environment Supabase belum tersedia.')

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) throw new Error('Session login tidak valid.')

  const { data: allowed, error: roleError } = await supabase.rpc('harmony_leave_is_active_hr_admin')
  if (roleError || !allowed) throw new Error('Hanya HR/Admin aktif yang dapat mengatur postpone manual.')

  return supabase
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await clientFor(request)
    const employeeId = clean(request.nextUrl.searchParams.get('employee_id'))

    const { data, error } = await supabase.rpc(
      'hr_get_leave_administration_context',
      { p_employee_id: employeeId || null },
    )

    if (error) throw error

    const context = (data || {}) as Record<string, any>
    const allCycles = Array.isArray(context.cycles) ? context.cycles : []
    const flexibleCycles = allCycles.filter(isFlexibleTechnicalCycle)
    const visibleCycles = allCycles.filter((item) => !isFlexibleTechnicalCycle(item))

    return NextResponse.json(
      {
        success: true,
        summaries: context.summaries || [],
        cycles: visibleCycles,
        flexible_cycles: flexibleCycles,
        adjustments: context.adjustments || [],
        reference_date: context.reference_date || null,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error: any) {
    const message = error?.message || 'Gagal memuat administrasi postpone.'
    const status = /session/i.test(message) ? 401 : /Hanya HR|akses/i.test(message) ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await clientFor(request)
    const body = await request.json().catch(() => null)
    const mode = clean(body?.mode).toLowerCase()
    const sourceCycleId = clean(body?.source_cycle_id)

    if (mode === 'flexible' || !sourceCycleId) {
      const { data, error } = await supabase.rpc(
        'hr_adjust_leave_postpone_manual_flexible_v1',
        {
          p_employee_id: clean(body?.employee_id),
          p_action: clean(body?.action),
          p_days: Number(body?.days || 0),
          p_effective_date: clean(body?.effective_date) || null,
          p_expired_at: clean(body?.expired_at) || null,
          p_note: clean(body?.note),
        },
      )

      if (error) throw error
      return NextResponse.json({ success: true, result: data })
    }

    // Compatibility: route lama /hr/leave/administration tetap memakai
    // engine cycle-bound existing. Jangan ubah behavior lama ini.
    const { data, error } = await supabase.rpc('hr_adjust_leave_postpone_manual', {
      p_employee_id: clean(body?.employee_id),
      p_source_cycle_id: sourceCycleId,
      p_action: clean(body?.action),
      p_days: Number(body?.days || 0),
      p_note: clean(body?.note),
    })

    if (error) throw error

    return NextResponse.json({ success: true, result: data })
  } catch (error: any) {
    const message = error?.message || 'Gagal memproses postpone manual.'
    const status = /session/i.test(message) ? 401 : /Hanya HR|akses/i.test(message) ? 403 : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
