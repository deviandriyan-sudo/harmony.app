import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { canonicalizeLeaveBalanceSummary } from '@/lib/leave-balance-canonical'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function bearer(request: NextRequest) {
  return clean(request.headers.get('authorization')).replace(/^Bearer\s+/i, '').trim()
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

  return { supabase, user: authData.user }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await clientFor(request)

    // Production source of truth already exposes the current employee lifecycle
    // through this RPC. Do not depend on optional lifecycle repair RPCs; they
    // are not present on every deployed HARMONY schema.
    const contextResponse = await supabase.rpc(
      'harmony_get_my_leave_postpone_context',
    )
    if (contextResponse.error) throw contextResponse.error

    const context = (contextResponse.data || {}) as Record<string, any>
    const allCycles = Array.isArray(context.cycles) ? context.cycles : []
    const visibleCycles = allCycles.filter(
      (cycle: any) => !String(cycle?.notes || '').includes('[HR_FLEX_POSTPONE]')
    )

    const employeeId = String(context?.employee?.id || '').trim()
    let balanceSummary: Record<string, any> | null = null

    if (employeeId) {
      const summaryResponse = await supabase
        .from('harmony_leave_balance_summary')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle()

      if (summaryResponse.error) throw summaryResponse.error
      if (summaryResponse.data) {
        balanceSummary = canonicalizeLeaveBalanceSummary(
          summaryResponse.data as Record<string, any>,
          allCycles,
          context.reference_date || null,
        )
      }
    }

    const integrityStatus = String(balanceSummary?.balance_integrity_status || '')

    return NextResponse.json(
      {
        success: true,
        employee: context.employee || null,
        cycles: visibleCycles,
        requests: context.requests || [],
        balance_summary: balanceSummary,
        reference_date: context.reference_date || null,
        balance_integrity_warning:
          integrityStatus && integrityStatus !== 'ok'
            ? 'Saldo summary berbeda dari cycle aktif; HARMONY menampilkan nilai canonical dari lifecycle cycle.'
            : null,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error: any) {
    const message = error?.message || 'Gagal memuat pengajuan postpone.'
    const status = /session/i.test(message)
      ? 401
      : /belum terhubung|employee aktif/i.test(message)
        ? 403
        : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await clientFor(request)
    const body = await request.json().catch(() => null)

    const { data, error } = await supabase.rpc('employee_submit_leave_postpone_atomic', {
      p_source_cycle_id: clean(body?.source_cycle_id),
      p_requested_days: Number(body?.requested_days || 0),
      p_reason: body?.reason ? clean(body.reason) : null,
    })

    if (error) throw error

    return NextResponse.json({ success: true, result: data })
  } catch (error: any) {
    const message = error?.message || 'Gagal mengirim pengajuan postpone.'
    const status = /session/i.test(message) ? 401 : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
