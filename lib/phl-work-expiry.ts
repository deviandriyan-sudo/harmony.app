/** PHL credit is valid for 90 calendar days after the work date.
 * Mirrors harmony_review_phl_work_request_v1 in Supabase (UTC current_date).
 * Date-only comparisons avoid local browser timezone and DST differences.
 */
export function phlWorkExpiryDate(workDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return null
  const midnight = Date.parse(`${workDate}T00:00:00Z`)
  if (!Number.isFinite(midnight)) return null
  if (new Date(midnight).toISOString().slice(0, 10) !== workDate) return null
  return new Date(midnight + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function phlWorkApprovalExpired(workDate: string, todayUtc: string = new Date().toISOString().slice(0, 10)): boolean {
  const expiry = phlWorkExpiryDate(workDate)
  return expiry !== null && expiry < todayUtc
}
