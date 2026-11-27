import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireHRApi } from '@/lib/server/hr-api-auth'
import { readLatestLeaveLifecycleRun } from '@/lib/server/leave-lifecycle-telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Employee = { id: string; employee_number: string | null; full_name: string | null; join_date: string | null; annual_leave_balance: number | null }
type Summary = {
  employee_id: string
  annual_regular_days: number | null
  postpone_active_days: number | null
  annual_manual_adjustment_days: number | null
  annual_total_available_days: number | null
  annual_debt_outstanding_days: number | null
  next_annual_debt_maturity: string | null
}
type Cycle = { employee_id: string | null; matured_at: string | null; entitlement_days: number | null; debt_applied_days: number | null; is_active: boolean | null }
type Legacy = { employee_id: string; cycle_start: string | null; cycle_end: string | null; remaining_days: number | null; used_days: number | null; status: string | null }
type Debt = { employee_id: string; remaining_days: number | null; apply_from_maturity: string | null; status: string | null }
type HRVerified = { employee_id: string; maturity_date: string; verified_available_days: number | null; verified_adjustment_days: number | null; verification_note: string | null }

function todayWita() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const piece = (type: string) => parts.find((x) => x.type === type)?.value || ''
  return `${piece('year')}-${piece('month')}-${piece('day')}`
}
function dateOnly(v: unknown) { const m = String(v ?? '').match(/^\d{4}-\d{2}-\d{2}/); return m?.[0] || null }
function num(v: unknown) { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0 }
function anniversary(join: string | null, year: number) {
  if (!join) return null
  const joinedYear = Number(join.slice(0, 4))
  if (!joinedYear || joinedYear >= year) return null
  const monthDay = join.slice(5)
  // February 29 anniversaries are normalized to Feb 28, as PostgreSQL
  // date + make_interval(years) does for non-leap years.
  const proposed = `${year}-${monthDay}`
  if (monthDay === '02-29' && new Date(Date.UTC(year, 1, 29)).getUTCMonth() !== 1) return `${year}-02-28`
  return proposed
}

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    // Strictly read-only; never use lifecycle RPC here because it can mutate balances.
    const [people, balances, cycles, legacy, debts] = await Promise.all([
      admin.from('employees').select('id,employee_number,full_name,join_date,annual_leave_balance').or('is_active.eq.true,is_active.is.null').limit(500),
      admin.from('harmony_leave_balance_summary').select('employee_id,annual_regular_days,postpone_active_days,annual_manual_adjustment_days,annual_total_available_days,annual_debt_outstanding_days,next_annual_debt_maturity').limit(500),
      admin.from('annual_leave_cycles').select('employee_id,matured_at,entitlement_days,debt_applied_days,is_active').limit(5000),
      admin.from('employee_annual_leave_balances').select('employee_id,cycle_start,cycle_end,remaining_days,used_days,status').limit(5000),
      admin.from('annual_leave_debts').select('employee_id,remaining_days,apply_from_maturity,status').limit(5000),
    ])
    for (const row of [people, balances, cycles, legacy, debts]) {
      if (row.error) throw row.error
    }
    if ((people.data || []).length >= 500 || (cycles.data || []).length >= 5000 || (legacy.data || []).length >= 5000 || (debts.data || []).length >= 5000) {
      throw new Error('Audit dataset exceeds capacity; use a paginated export before reviewing balances.')
    }
    // Optional, protected HR-only 2026 balance verification ledger. This does
    // not mutate balances and does not authorize manual corrections.
    const hrVerifiedResult = await admin.from('harmony_leave_2026_hr_verifications')
      .select('employee_id,maturity_date,verified_available_days,verified_adjustment_days,verification_note')
      .limit(500)
    if (hrVerifiedResult.error) {
      const missingTable = ['42P01', 'PGRST205'].includes(hrVerifiedResult.error.code || '')
      if (!missingTable) throw hrVerifiedResult.error
    }
    const verifications = new Map<string, HRVerified>()
    for (const entry of ((hrVerifiedResult.data || []) as HRVerified[])) {
      if (entry.employee_id) verifications.set(entry.employee_id, entry)
    }
    // Live execution evidence, not a claim that a Vercel cron is configured.
    const lastRunResult = await readLatestLeaveLifecycleRun(admin)
    // Telemetry failure is visible, but does not suppress the read-only balance audit.
    if (lastRunResult.error) console.warn('HARMONY lifecycle telemetry unavailable', lastRunResult.error.code || 'query_error')
    const scheduler = {
      checked_environment: process.env.VERCEL_ENV || 'local',
      enabled_here: process.env.HARMONY_LEAVE_CRON_ENABLED === 'true',
      cron_secret_configured_here: (process.env.CRON_SECRET || '').length >= 16,
      configured_schedule_wita: '00:10',
      last_run: lastRunResult.error ? null : lastRunResult.data,
      telemetry_available: !lastRunResult.error,
    }
    const now = todayWita()
    const year = Number(now.slice(0, 4))
    const summaries = new Map((balances.data as Summary[] || []).map((b) => [b.employee_id, b]))
    const cycleByEmployee = new Map<string, Cycle[]>()
    for (const cycle of (cycles.data as Cycle[] || [])) {
      if (!cycle.employee_id) continue
      cycleByEmployee.set(cycle.employee_id, [...(cycleByEmployee.get(cycle.employee_id) || []), cycle])
    }
    const legacyByEmployee = new Map<string, Legacy[]>()
    for (const l of (legacy.data as Legacy[] || [])) {
      if (l.status !== 'active' || !l.cycle_start || !l.cycle_end || l.cycle_start > now || l.cycle_end < now) continue
      legacyByEmployee.set(l.employee_id, [...(legacyByEmployee.get(l.employee_id) || []), l])
    }
    const debtByEmployee = new Map<string, Debt[]>()
    for (const d of (debts.data as Debt[] || [])) {
      if (!['pending','partially_applied'].includes(d.status || '') || num(d.remaining_days) <= 0) continue
      debtByEmployee.set(d.employee_id, [...(debtByEmployee.get(d.employee_id) || []), d])
    }
    const rows = (people.data as Employee[] || []).map((e) => {
      const summary = summaries.get(e.id)
      const currentCycles = cycleByEmployee.get(e.id) || []
      const activeLegacy = legacyByEmployee.get(e.id) || []
      const outstanding = debtByEmployee.get(e.id) || []
      const maturity = anniversary(dateOnly(e.join_date), year)
      const dueThisYear = Boolean(maturity && maturity <= now)
      const maturityRecords = currentCycles.filter((c) => dateOnly(c.matured_at) === maturity)
      const currentCycle = currentCycles.filter((c) => {
        const start = dateOnly(c.matured_at)
        return c.is_active !== false && start && start <= now
      }).sort((a, b) => String(b.matured_at || '').localeCompare(String(a.matured_at || '')))[0]
      const available = summary ? num(summary.annual_total_available_days) : null
      const legacyRemaining = activeLegacy.length === 1 ? num(activeLegacy[0].remaining_days) : null
      const legacyUsed = activeLegacy.length === 1 ? num(activeLegacy[0].used_days) : null
      const regular = num(summary?.annual_regular_days)
      const carry = num(summary?.postpone_active_days)
      const adjustment = num(summary?.annual_manual_adjustment_days)
      const dueDebt = outstanding.filter((d) => d.apply_from_maturity && d.apply_from_maturity <= now).reduce((s, d) => s + num(d.remaining_days), 0)
      let finding = 'sesuai / pemeriksaan rutin'
      let severity = 'ok'
      if (!summary || (dueThisYear && maturityRecords.length === 0)) { finding = 'Siklus matang / saldo kanonis tidak tersedia'; severity = 'critical' }
      else if (maturityRecords.length > 1 || activeLegacy.length > 1) { finding = 'Duplikasi siklus / ledger'; severity = 'critical' }
      else if (dueDebt > 0) { finding = 'Hutang jatuh tempo belum dibebankan'; severity = 'critical' }
      else if (legacyRemaining !== null && legacyUsed === 0 && legacyRemaining >= 12 && available !== null && available < 12 && carry === 0) {
        finding = 'Saldo kurang dari 12 hari tanpa pemakaian di ledger aktif'; severity = 'high'
      } else if (legacyRemaining !== null && legacyUsed !== null && legacyUsed > 0 && available !== null && available < Math.min(12, legacyRemaining) && carry === 0) {
        finding = 'Potongan kanonis melebihi pemakaian ledger aktif'; severity = 'review'
      } else if (!dueThisYear && !currentCycle && available !== null && available > 0) {
        finding = 'Saldo manual sebelum hak cuti matang: verifikasi pengecualian'; severity = 'review'
      } else if (legacyRemaining !== null && legacyUsed !== null && Math.abs(regular - Math.max(legacyRemaining - num(currentCycle?.debt_applied_days), 0)) > 0.001) {
        finding = 'Ledger pemakaian tidak sama dengan saldo siklus kanonis'; severity = 'review'
      }
      const hrVerified = verifications.get(e.id)
      // HR verification is a precise point-in-time balance confirmation, not
      // a permanent exception for future leave usage, debt, or new maturities.
      if (hrVerified && hrVerified.maturity_date === dateOnly(currentCycle?.matured_at)) {
        const approvedAdjustment = Math.abs(adjustment - num(hrVerified.verified_adjustment_days)) < 0.001
        const approvedBalance = available !== null && Math.abs(available - num(hrVerified.verified_available_days)) < 0.001
        if (approvedAdjustment && approvedBalance && severity !== 'critical') {
          finding = `Diverifikasi HR (maturity ${hrVerified.maturity_date}): ${hrVerified.verification_note || 'saldo telah diverifikasi secara historis'}`
          severity = 'verified'
        } else if (severity !== 'critical') {
          finding = 'Saldo atau penyesuaian berubah setelah verifikasi HR; periksa transaksi baru sebelum koreksi.'
          severity = 'review'
        }
      }
      return {
        employee_id: e.id, employee_number: e.employee_number, full_name: e.full_name,
        join_date: dateOnly(e.join_date), maturity_2026: maturity,
        matured_this_year: dueThisYear, maturity_cycle_count: maturityRecords.length,
        master_days: num(e.annual_leave_balance), canonical_days: available,
        regular_days: regular, postpone_days: carry, adjustment_days: adjustment,
        legacy_active_cycles: activeLegacy.length, legacy_remaining_days: legacyRemaining,
        legacy_used_days: legacyUsed, debt_outstanding_days: outstanding.reduce((s, d) => s + num(d.remaining_days), 0),
        debt_due_days: dueDebt, next_debt_maturity: summary?.next_annual_debt_maturity || null,
        hr_verified_maturity: hrVerified?.maturity_date || null,
        hr_verified_days: hrVerified?.verified_available_days ?? null,
        finding, severity,
      }
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'id'))
    const summary = {
      active_employees: rows.length,
      matured_this_year: rows.filter((r) => r.matured_this_year).length,
      missing_maturity: rows.filter((r) => r.matured_this_year && r.maturity_cycle_count === 0).length,
      high_priority: rows.filter((r) => r.severity === 'high').length,
      review_needed: rows.filter((r) => r.severity === 'review').length,
      overdue_debt: rows.filter((r) => r.debt_due_days > 0).length,
      outstanding_debt: rows.filter((r) => r.debt_outstanding_days > 0).length,
    }
    return NextResponse.json({ success: true, reference_date: now, summary, scheduler, rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    const error = apiError(e, 'Audit siklus cuti belum tersedia.')
    return NextResponse.json({ success: false, error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
  }
}
