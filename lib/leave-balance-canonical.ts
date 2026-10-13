export type HarmonyLeaveBalanceSummary = {
  employee_id?: string | null
  employee_number?: string | null
  full_name?: string | null
  annual_regular_days?: number | null
  postpone_active_days?: number | null
  postpone_expired_days?: number | null
  annual_manual_adjustment_days?: number | null
  annual_total_available_days?: number | null
  [key: string]: unknown
}

export type HarmonyLeaveCycleLike = {
  id?: string | null
  employee_id?: string | null
  employee_number?: string | null
  matured_at?: string | null
  cycle_start?: string | null
  cycle_end?: string | null
  total_days?: number | null
  used_days?: number | null
  remaining_days?: number | null
  is_active?: boolean | null
  status?: string | null
  notes?: string | null
  [key: string]: unknown
}

export type HarmonyCanonicalLeaveBalance = HarmonyLeaveBalanceSummary & {
  balance_integrity_status: 'ok' | 'reconciled_from_cycle' | 'summary_only'
  balance_integrity_difference_days: number
  canonical_cycle_id: string | null
  canonical_cycle_regular_days: number | null
  canonical_cycle_total_days: number | null
  canonical_cycle_used_days: number | null
  canonical_cycle_formula_days: number | null
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeDate(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.length >= 10 ? raw.slice(0, 10) : raw
}

function cycleSortKey(cycle: HarmonyLeaveCycleLike) {
  return normalizeDate(cycle.matured_at || cycle.cycle_start || '')
}

function isFlexibleTechnicalCycle(cycle: HarmonyLeaveCycleLike) {
  return String(cycle.notes || '').includes('[HR_FLEX_POSTPONE]')
}

function isSameEmployee(
  summary: HarmonyLeaveBalanceSummary,
  cycle: HarmonyLeaveCycleLike,
) {
  const summaryId = String(summary.employee_id || '').trim()
  const cycleId = String(cycle.employee_id || '').trim()
  if (summaryId && cycleId) return summaryId === cycleId

  const summaryNumber = String(summary.employee_number || '').trim().toLowerCase()
  const cycleNumber = String(cycle.employee_number || '').trim().toLowerCase()
  return Boolean(summaryNumber && cycleNumber && summaryNumber === cycleNumber)
}

function pickCurrentRegularCycle(
  summary: HarmonyLeaveBalanceSummary,
  cycles: HarmonyLeaveCycleLike[],
  referenceDate: string,
) {
  const ref = normalizeDate(referenceDate) || new Date().toISOString().slice(0, 10)

  const candidates = cycles
    .filter((cycle) => !isFlexibleTechnicalCycle(cycle))
    .filter((cycle) => isSameEmployee(summary, cycle))
    .filter((cycle) => cycle.is_active !== false)
    .filter((cycle) => {
      const start = normalizeDate(cycle.matured_at || cycle.cycle_start)
      const end = normalizeDate(cycle.cycle_end)
      if (start && start > ref) return false
      if (end && end < ref) return false
      return true
    })
    .sort((a, b) => cycleSortKey(b).localeCompare(cycleSortKey(a)))

  if (candidates.length) return candidates[0]

  // Defensive fallback: lifecycle data from older schemas may not have is_active
  // or may keep the current cycle end blank. Use the latest matured cycle that is
  // not in the future, but never use synthetic HR flexible cycles as regular leave.
  return cycles
    .filter((cycle) => !isFlexibleTechnicalCycle(cycle))
    .filter((cycle) => isSameEmployee(summary, cycle))
    .filter((cycle) => {
      const start = normalizeDate(cycle.matured_at || cycle.cycle_start)
      return !start || start <= ref
    })
    .sort((a, b) => cycleSortKey(b).localeCompare(cycleSortKey(a)))[0] || null
}

export function canonicalizeLeaveBalanceSummary(
  summary: HarmonyLeaveBalanceSummary,
  cycles: HarmonyLeaveCycleLike[],
  referenceDate?: string | null,
): HarmonyCanonicalLeaveBalance {
  const ref = normalizeDate(referenceDate) || new Date().toISOString().slice(0, 10)
  const currentCycle = pickCurrentRegularCycle(summary, cycles || [], ref)

  const summaryRegular = Math.max(numeric(summary.annual_regular_days), 0)
  const cycleRegular = currentCycle
    ? Math.max(numeric(currentCycle.remaining_days), 0)
    : null
  const cycleTotal = currentCycle && currentCycle.total_days != null
    ? Math.max(numeric(currentCycle.total_days), 0)
    : null
  const cycleUsed = currentCycle && currentCycle.used_days != null
    ? Math.max(numeric(currentCycle.used_days), 0)
    : null
  const cycleFormula = cycleTotal !== null && cycleUsed !== null
    ? Math.max(cycleTotal - cycleUsed, 0)
    : null

  // remaining_days stays authoritative because debt/manual lifecycle engines may
  // intentionally alter it. total-used is exposed only as an integrity signal.
  const regular = cycleRegular ?? summaryRegular
  const postpone = Math.max(numeric(summary.postpone_active_days), 0)
  const annualAdjustment = numeric(summary.annual_manual_adjustment_days)
  const canonicalTotal = Math.max(regular + postpone + annualAdjustment, 0)
  const storedTotal = Math.max(numeric(summary.annual_total_available_days), 0)
  const difference = canonicalTotal - storedTotal

  const cycleMismatch = cycleRegular !== null && Math.abs(cycleRegular - summaryRegular) > 0.0001
  const totalMismatch = Math.abs(difference) > 0.0001

  return {
    ...summary,
    annual_regular_days: regular,
    annual_total_available_days: canonicalTotal,
    balance_integrity_status:
      cycleMismatch || totalMismatch
        ? 'reconciled_from_cycle'
        : currentCycle
          ? 'ok'
          : 'summary_only',
    balance_integrity_difference_days: difference,
    canonical_cycle_id: currentCycle?.id ? String(currentCycle.id) : null,
    canonical_cycle_regular_days: cycleRegular,
    canonical_cycle_total_days: cycleTotal,
    canonical_cycle_used_days: cycleUsed,
    canonical_cycle_formula_days: cycleFormula,
  }
}

export function canonicalizeLeaveBalanceSummaries(
  summaries: HarmonyLeaveBalanceSummary[],
  cycles: HarmonyLeaveCycleLike[],
  referenceDate?: string | null,
) {
  return (summaries || []).map((summary) =>
    canonicalizeLeaveBalanceSummary(summary, cycles || [], referenceDate),
  )
}
