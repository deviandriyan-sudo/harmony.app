import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getHarmonySystemControl } from '@/lib/server/system-control'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Do not accept unauthenticated browser calls or weak/undefined cron secrets.
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || ''
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (secret.length < 16 || !supplied) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Calculate business date in WITA, never server UTC midnight.
function todayWita(date = new Date()): string {
  const pieces = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (key: string) => pieces.find((piece) => piece.type === key)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

const MAX_EMPLOYEES = 200
const BATCH_SIZE = 4
const TIME_BUDGET_MS = 43_000

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
  }

  // Explicit production opt-in: deploying source alone must NOT change balances.
  if (process.env.HARMONY_LEAVE_CRON_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, disabled: true, reason: 'requires_explicit_opt_in' })
  }

  const control = await getHarmonySystemControl(supabaseAdmin)
  // Pause reconciliation on maintenance; future daily runs catch up via the
  // existing ensure/reconcile functions. Missing control is NOT approval to run.
  if (!control.configured) {
    return NextResponse.json({ ok: false, paused: true, reason: 'system_control_unavailable' }, { status: 503 })
  }
  if (!control.systemEnabled) {
    return NextResponse.json({ ok: true, paused: true, reason: 'maintenance' })
  }

  const started = Date.now()
  const referenceDate = todayWita()

  // IDs only; never fetch employee profile or PII for cron processing.
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id')
    .or('is_active.eq.true,is_active.is.null')
    .order('id', { ascending: true })
    .limit(MAX_EMPLOYEES + 1)

  if (error) {
    console.error('HARMONY leave cron: employee enumeration failed', error.code || 'query_error')
    return NextResponse.json({ ok: false, reason: 'employee_query_failed' }, { status: 503 })
  }
  const employees = data || []
  // Explicitly fail instead of silently omitting employees if the organization grows.
  if (employees.length > MAX_EMPLOYEES) {
    return NextResponse.json({ ok: false, reason: 'batch_capacity_exceeded' }, { status: 503 })
  }

  let processed = 0
  let failed = 0
  let createdCycles = 0
  let expiredPostpone = 0
  let index = 0
  const errorsByCode: Record<string, number> = {}

  // Limited concurrent calls; RPC itself uses employee row/advisory locks and
  // checks existing maturity cycles to guard against repeat/parallel credits.
  while (index < employees.length && Date.now() - started < TIME_BUDGET_MS) {
    const batch = employees.slice(index, index + BATCH_SIZE)
    const settled = await Promise.all(batch.map(async (employee) => {
      try {
        const result = await supabaseAdmin.rpc('harmony_reconcile_leave_lifecycle_one', {
          p_employee_id: employee.id,
          p_reference_date: referenceDate,
          p_actor: 'HARMONY Scheduled Lifecycle',
        })
        if (result.error) return { ok: false, code: result.error.code || 'rpc_error' }
        const outcome = result.data as {
          success?: boolean;
          created_cycles?: number;
          expired_postpone_count?: number;
        } | null
        if (outcome?.success !== true) return { ok: false, code: 'rpc_unsuccessful' }
        return {
          ok: true,
          cycles: Math.max(0, Number(outcome.created_cycles || 0)),
          postpone: Math.max(0, Number(outcome.expired_postpone_count || 0)),
        }
      } catch {
        return { ok: false, code: 'rpc_exception' }
      }
    }))

    for (const result of settled) {
      processed++
      if (!result.ok) {
        failed++
        const code = result.code || 'unknown'
        errorsByCode[code] = (errorsByCode[code] || 0) + 1
      } else {
        createdCycles += result.cycles || 0
        expiredPostpone += result.postpone || 0
      }
    }
    index += batch.length
  }

  const remaining = employees.length - processed
  const ok = failed === 0 && remaining === 0
  if (!ok) {
    // Intentionally omit names, UUIDs, and exception text from logs/response.
    console.error('HARMONY leave lifecycle cron incomplete', {
      failed, remaining, errorsByCode,
    })
  }

  return NextResponse.json(
    { ok, referenceDate, processed, failed, remaining, createdCycles,
      expiredPostpone, errorsByCode },
    { status: ok ? 200 : 207, headers: { 'Cache-Control': 'no-store' } },
  )
}
