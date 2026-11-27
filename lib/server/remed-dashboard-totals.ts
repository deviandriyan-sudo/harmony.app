import type { SupabaseClient } from '@supabase/supabase-js'

export type RemedFinanceSummary = { review: number; waitingPayment: number; followup: number; periodPaidTotal: number }
export type RemedDashboardTotals = { totalClaims: number; pendingHR: number; paidCount: number; paidTotal: number; financeSummary: RemedFinanceSummary }
function numeric(value: unknown, count = false): number {
  if (value === null || value === undefined || (typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) throw new Error('Ringkasan Re-Med tidak lengkap.')
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || (count && (!Number.isSafeInteger(parsed) || parsed < 0))) throw new Error('Ringkasan Re-Med tidak valid.')
  return parsed
}

/** All financial totals are calculated in one PostgreSQL statement, avoiding
 * incomplete row pages and cross-statement count/sum mismatches. Server only. */
export async function getRemedDashboardTotals(admin: SupabaseClient): Promise<RemedDashboardTotals> {
  const { data, error } = await admin.rpc('harmony_rc3p_remed_dashboard_totals_v1')
  if (error) throw error
  const row = data as Record<string, unknown> | null
  const finance = row?.financeSummary as Record<string, unknown> | null
  return {
    totalClaims: numeric(row?.totalClaims, true), pendingHR: numeric(row?.pendingHR, true),
    paidCount: numeric(row?.paidCount, true), paidTotal: numeric(row?.paidTotal),
    financeSummary: {
      review: numeric(finance?.review, true), waitingPayment: numeric(finance?.waitingPayment, true),
      followup: numeric(finance?.followup, true), periodPaidTotal: numeric(finance?.periodPaidTotal),
    },
  }
}
