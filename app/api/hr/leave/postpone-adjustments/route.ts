
import { readErrorMessage } from '@/lib/error-utils'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { canonicalizeLeaveBalanceSummaries, type HarmonyLeaveCycleLike, type HarmonyLeaveBalanceSummary } from '@/lib/leave-balance-canonical'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function bearer(request: NextRequest) {
  return clean(request.headers.get('authorization')).replace(/^Bearer\s+/i, '').trim()
}

function isFlexibleTechnicalCycle(value: { notes?: string | null } | null) {
  return String(value?.notes || '').includes('[HR_FLEX_POSTPONE]')
}

// This is informational ONLY. It deliberately does not mutate either balance
// engine or authorize an approval. Every source remains separately labeled.
type Rc2iLegacyCycle = {
  employee_id: string
  remaining_days: number | null
  cycle_start: string | null
  cycle_end: string | null
  status: string | null
}
type Rc2iPendingLeave = {
  employee_id: string | null
  request_type: string | null
  supervisor_status: string | null
  hr_status: string | null
  status: string | null
  total_days: number | null
}

function witaDateISO() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (kind: string) => parts.find((entry) => entry.type === kind)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

async function readLeaveApprovalDiagnostics(
  supabase: Awaited<ReturnType<typeof clientFor>>,
  summaries: HarmonyLeaveBalanceSummary[],
  employeeId: string,
) {
  const [cyclesResult, requestsResult] = await Promise.all([
    supabase.from('employee_annual_leave_balances')
      .select('employee_id,remaining_days,cycle_start,cycle_end,status')
      .eq('status', 'active')
      .limit(2000),
    supabase.from('leave_requests')
      .select('employee_id,request_type,supervisor_status,hr_status,status,total_days')
      .eq('request_type', 'annual_leave')
      .limit(2000),
  ])

  if (cyclesResult.error || requestsResult.error) {
    return {
      diagnostics: [],
      warning: 'Data saldo legacy atau reservasi approval tidak dapat dibaca; verifikasi manual diperlukan.',
    }
  }

  const today = witaDateISO()
  const legacyRows = (cyclesResult.data || []) as Rc2iLegacyCycle[]
  const requestRows = (requestsResult.data || []) as Rc2iPendingLeave[]
  const legacyByEmployee = new Map<string, Rc2iLegacyCycle>()
  for (const row of [...legacyRows].sort((a, b) =>
    String(a.cycle_start || '').localeCompare(String(b.cycle_start || ''))
  )) {
    if (!row.employee_id || !row.cycle_start || !row.cycle_end) continue
    if (row.cycle_start <= today && row.cycle_end >= today && !legacyByEmployee.has(row.employee_id)) {
      legacyByEmployee.set(row.employee_id, row)
    }
  }

  const pendingByEmployee = new Map<string, number>()
  for (const row of requestRows) {
    if (!row.employee_id || String(row.supervisor_status || '').toLowerCase() !== 'approved') continue
    if (!['', 'pending', 'submitted', 'waiting_hr', 'ready_for_hr'].includes(String(row.hr_status || '').toLowerCase())) continue
    if (['rejected', 'cancelled', 'canceled'].includes(String(row.status || '').toLowerCase())) continue
    const days = Number(row.total_days || 0)
    if (!Number.isFinite(days) || days <= 0) continue
    pendingByEmployee.set(row.employee_id, (pendingByEmployee.get(row.employee_id) || 0) + days)
  }

  const summaryRows = employeeId
    ? summaries.filter((row) => row.employee_id === employeeId)
    : summaries
  const diagnostics = summaryRows.map((item) => {
    const lifecycle = Number(item.annual_total_available_days ?? 0)
    const pending = pendingByEmployee.get(String(item.employee_id || '')) || 0
    const legacy = legacyByEmployee.get(String(item.employee_id || ''))?.remaining_days ?? null
    return {
      employee_id: item.employee_id,
      dashboard_lifecycle_days: lifecycle,
      pending_hr_annual_days: pending,
      // Not an entitlement and NOT a substitute for RPC/ledger validation.
      estimated_after_pending_days: Math.max(0, lifecycle - pending),
      legacy_supervisor_rpc_days: legacy === null ? null : Number(legacy),
      legacy_cycle_found: legacy !== null,
      source_difference_days: legacy === null ? null : lifecycle - Number(legacy),
    }
  })
  return {
    diagnostics,
    warning: cyclesResult.data?.length === 2000 || requestsResult.data?.length === 2000
      ? 'Audit diagnostik melewati batas 2.000 data. Verifikasi SQL diperlukan.'
      : null,
  }
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

    const context = (data || {}) as { cycles?: HarmonyLeaveCycleLike[]; summaries?: HarmonyLeaveBalanceSummary[]; adjustments?: unknown[]; reference_date?: string | null }
    const allCycles = Array.isArray(context.cycles) ? context.cycles : []
    const flexibleCycles = allCycles.filter(isFlexibleTechnicalCycle)
    const visibleCycles = allCycles.filter((item) => !isFlexibleTechnicalCycle(item))
    const canonicalSummaries = canonicalizeLeaveBalanceSummaries(
      Array.isArray(context.summaries) ? context.summaries : [],
      allCycles,
      context.reference_date || null,
    )
    const approvalDiagnostics = await readLeaveApprovalDiagnostics(
      supabase,
      canonicalSummaries,
      employeeId,
    )

    return NextResponse.json(
      {
        success: true,
        summaries: canonicalSummaries,
        cycles: visibleCycles,
        flexible_cycles: flexibleCycles,
        adjustments: context.adjustments || [],
        reference_date: context.reference_date || null,
        balance_integrity_warning: canonicalSummaries.some((item) => item.balance_integrity_status && item.balance_integrity_status !== 'ok')
          ? 'Ada perbedaan summary dan cycle aktif; saldo efektif tetap mengikuti ringkasan database.'
          : null,
        approval_balance_diagnostics: approvalDiagnostics.diagnostics,
        approval_diagnostics_warning: approvalDiagnostics.warning,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error: unknown) {
    const message = readErrorMessage(error) || 'Gagal memuat administrasi postpone.'
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
      if (clean(body?.action).toLowerCase() === 'add') {
        return NextResponse.json({ success: false, error: 'Penambahan postpone HR harus memakai source cycle pada menu Administrasi Cuti, diajukan sebelum H-7 tanggal matang, dan tidak boleh memiliki hutang cuti aktif. Jalur fleksibel lama hanya untuk pengurangan saldo historis.' }, { status: 400 })
      }
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
  } catch (error: unknown) {
    const message = readErrorMessage(error) || 'Gagal memproses postpone manual.'
    const status = /session/i.test(message) ? 401 : /Hanya HR|akses/i.test(message) ? 403 : 400
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
