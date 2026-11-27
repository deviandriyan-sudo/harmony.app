/** Shared source-of-truth rules for the employee attendance review UI. */
export type SourceAttendance = {
  source?: string | null
  status?: string | null
  check_in?: string | null
  check_out?: string | null
  manual_check_in?: string | null
  manual_check_out?: string | null
  total_punches?: number | null
  absence_request_type?: string | null
  absence_request_status?: string | null
  absence_request_source?: string | null
  leave_request_id?: string | null
  phl_claim_record_id?: string | null
  employee_daily_note?: string | null
  absence_proof_url?: string | null
  correction_proof_url?: string | null
  phl_proof_url?: string | null
  supervisor_approval_status?: string | null
}
const lower = (v:unknown) => String(v || '').trim().toLowerCase()

export function approvedSourceAbsence(log: SourceAttendance | null | undefined) {
  if (!log || workPresenceEvidence(log)) return false
  const source=lower(log.absence_request_source)
  const status=lower(log.absence_request_status)
  return Boolean((source==='leave_requests' && log.leave_request_id ||
      source==='phl_records' && log.phl_claim_record_id) &&
    status==='approved' && log.absence_request_type)
}

export function workPresenceEvidence(log: SourceAttendance | null | undefined) {
  return Boolean(log && (log.check_in || log.check_out || log.manual_check_in || log.manual_check_out || Number(log.total_punches || 0)>0))
}
export function persistedManualWork(log: SourceAttendance | null | undefined) {
  if (!log || lower(log.supervisor_approval_status)==='rejected') return false
  const source=lower(log.source)
  return Boolean(['employee_live_manual','upload_merged_manual'].includes(source) &&
    log.manual_check_in && log.manual_check_out &&
    (log.absence_proof_url || log.correction_proof_url || log.phl_proof_url))
}
export function trustedAttendanceDay(log: SourceAttendance | null | undefined, isOffday=false) {
  if (!log) return isOffday
  if (lower(log.supervisor_approval_status)==='rejected') return false
  if (approvedSourceAbsence(log) || persistedManualWork(log)) return true
  // A complete fingerprint is attendance evidence; a single punch is not.
  return Boolean(log.check_in && log.check_out && Number(log.total_punches || 0)>=2)
}
