export function verifiedPostponeDays(cycle: { postpone_eligible_days?: number | null } | null | undefined): number {
  const raw = cycle?.postpone_eligible_days
  return raw != null && Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0
}

export function hasActivePostponeRequest(requests: { source_cycle_id?: string | null; approval_status?: string | null; is_active?: boolean | null }[], cycleId: string): boolean {
  return requests.some(item => item.source_cycle_id === cycleId && item.is_active !== false && !['rejected', 'cancelled'].includes(String(item.approval_status || '').trim().toLowerCase()))
}
