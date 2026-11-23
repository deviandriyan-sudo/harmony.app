/** Read-only display selector. Never infer approval from employee submission. */
export type ApprovedAttendanceSnapshot = {
  period_start: string | null
  period_end: string | null
  supervisor_status: string | null
  hr_status: string | null
  total_work_days: number | null
  total_present_days: number | null
  total_late_days: number | null
  total_incomplete_days: number | null
  total_absent_days: number | null
  total_sick_days: number | null
  total_permit_days: number | null
  total_leave_days: number | null
  total_phl_days: number | null
}
export function latestApprovedAttendanceSnapshot(rows: ApprovedAttendanceSnapshot[]): ApprovedAttendanceSnapshot | null {
  // HR finalized takes precedence when present, but an earlier supervisor-approved
  // period can be displayed if the newer period has not received approval yet.
  return rows
    .filter(row => {
      const hr = String(row.hr_status || '').toLowerCase()
      const supervisor = String(row.supervisor_status || '').toLowerCase()
      const blocked = ['rejected','rejected_by_hr','rejected_by_supervisor','cancelled'].includes(hr)
      return row.period_start && row.period_end && !blocked && (
        ['finalized','approved'].includes(hr) || supervisor === 'approved'
      )
    })
    .sort((a,b)=>String(b.period_end).localeCompare(String(a.period_end)))[0] || null
}
export function approvedMetric(value: number | null | undefined) {
  // NULL is unknown, never pretend it means zero days.
  return value == null || !Number.isFinite(Number(value)) ? '—' : String(value)
}
export function approvedLeaveTotal(row: ApprovedAttendanceSnapshot | null) {
  if (!row || [row.total_leave_days,row.total_sick_days,row.total_permit_days].some(x=>x==null)) return '—'
  return String(Number(row.total_leave_days)+Number(row.total_sick_days)+Number(row.total_permit_days))
}
