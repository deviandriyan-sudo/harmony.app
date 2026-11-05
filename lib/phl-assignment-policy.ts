/** Source of truth for whether a homebase OR additional assignment is effective.
 * A primary assignment is not ineligible: it may hold the only current
 * supervisor mapping when the legacy employees.supervisor fields are empty.
 */
export type PHLAssignmentWindow = {
  is_active?: boolean | null
  is_primary?: boolean | null
  start_date?: string | null
  end_date?: string | null
}

export function assignmentIsEffective(row: PHLAssignmentWindow, today: string): boolean {
  if (row.is_active === false) return false
  const start = String(row.start_date || '').trim().slice(0, 10)
  const end = String(row.end_date || '').trim().slice(0, 10)
  if (start && start > today) return false
  if (end && end < today) return false
  return true
}
