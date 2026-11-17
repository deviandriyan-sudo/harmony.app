/**
 * Fail-closed guard for linking a PHL approval to an attendance row.
 * An old/reused fingerprint PIN is NEVER sufficient evidence of ownership.
 * PostgreSQL/RPC uniqueness and transaction checks remain required.
 */
type AttendanceIdentity = {
  employee_id?: string | null
  employee_number?: string | null
  attendance_date?: string | null
  deleted_at?: string | null
  phl_work_request_id?: string | null
}

type PHLOwner = {
  id: string
  employee_id: string
  employee_number?: string | null
  work_date: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const norm = (value: unknown) => String(value ?? '').trim()

export function phlAttendanceLinkIssue(row: AttendanceIdentity, request: PHLOwner): string | null {
  if (row.deleted_at) return 'deleted_attendance'
  if (norm(row.attendance_date) !== norm(request.work_date)) return 'date_mismatch'
  if (row.phl_work_request_id && norm(row.phl_work_request_id) !== norm(request.id)) {
    return 'other_phl_request'
  }

  const rowUUID = norm(row.employee_id).toLowerCase()
  const requestUUID = norm(request.employee_id).toLowerCase()
  if (!UUID.test(requestUUID)) return 'invalid_request_employee_id'
  // UUID is authoritative; an employee number cannot override its conflict.
  if (UUID.test(rowUUID)) return rowUUID === requestUUID ? null : 'employee_uuid_mismatch'

  const rowNumber = norm(row.employee_number)
  const ownerNumber = norm(request.employee_number)
  if (rowNumber && ownerNumber && rowNumber === ownerNumber) return null
  return 'employee_identity_unverified'
}
