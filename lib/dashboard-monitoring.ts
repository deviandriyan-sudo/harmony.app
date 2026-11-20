/** Read-only presentation helpers. Never change leave/PHL/attendance workflow state. */
export type WorkflowRecord = {
  id?: string | null; employee_id?: string | null; full_name?: string | null; department?: string | null;
  request_type?: string | null; leave_type?: string | null; status?: string | null;
  supervisor_status?: string | null; hr_status?: string | null;
  start_date?: string | null; end_date?: string | null; phl_date?: string | null;
  claim_start_date?: string | null; claim_end_date?: string | null;
  source?: string | null;
}
export type MonitorCategory = 'cuti' | 'sakit' | 'izin' | 'phl' | 'tugas_luar' | 'belum_tercatat'
export type MonitorItem = {
  id: string; employeeId: string; name: string; department: string; category: MonitorCategory;
  startDate: string; endDate: string; approval: 'approved' | 'pending' | 'review'; href: string
}
export const witaToday = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const get = (key: string) => parts.find(item=>item.type===key)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
export const cleanStatus = (value: unknown) => String(value || '').trim().toLowerCase()
const final = (value: unknown) => ['approved','approve','finalized','final'].includes(cleanStatus(value))
const rejected = (value: unknown) => ['rejected','reject','cancelled','canceled','ditolak','dibatalkan'].includes(cleanStatus(value))
export function approvalOf(row: WorkflowRecord): MonitorItem['approval'] | 'excluded' {
  // The final authority is HR, not supervisor or a legacy overall status.
  if (rejected(row.status) || rejected(row.hr_status) || rejected(row.supervisor_status)) return 'excluded'
  if (final(row.hr_status)) return 'approved'
  return 'pending'
}
export function leaveCategory(row: WorkflowRecord): MonitorCategory {
  const type = `${row.request_type || ''} ${row.leave_type || ''}`.toLowerCase()
  if (/sick|sakit/.test(type)) return 'sakit'
  if (/permit|izin/.test(type)) return 'izin'
  if (/official|travel|tugas|dinas/.test(type)) return 'tugas_luar'
  return 'cuti'
}
export function validOnDate(start: string | null | undefined, end: string | null | undefined, date: string) {
  return Boolean(start && /^\d{4}-\d{2}-\d{2}$/.test(start) && start <= date && (end || start) >= date)
}
export function priority(item: MonitorItem) {
  return item.approval === 'pending' ? 0 : item.approval === 'review' ? 1 : 2
}
