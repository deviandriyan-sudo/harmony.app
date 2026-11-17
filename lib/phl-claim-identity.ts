// Source-only identity guard for old PHL claim rows. A fingerprint PIN can be
// reassigned; it is only a query hint and must not determine record ownership.
export type PHLClaimIdentity = {
  employee_id?: string | null
  employee_number?: string | null
}

export type CurrentPHLEmployee = {
  id: string
  employee_number?: string | null
}

export function phlClaimIdentityAssessment(
  record: PHLClaimIdentity,
  employee: CurrentPHLEmployee,
): 'match' | 'different_employee' | 'unverified_legacy' {
  const recordId = String(record.employee_id || '').trim().toLowerCase()
  const employeeId = String(employee.id || '').trim().toLowerCase()
  if (recordId) return recordId === employeeId && !!employeeId ? 'match' : 'different_employee'

  const recordNumber = String(record.employee_number || '').trim()
  const employeeNumber = String(employee.employee_number || '').trim()
  if (recordNumber) return recordNumber === employeeNumber && !!employeeNumber ? 'match' : 'different_employee'

  // Never inherit a claim through machine_pin alone, even on the same date.
  return 'unverified_legacy'
}
