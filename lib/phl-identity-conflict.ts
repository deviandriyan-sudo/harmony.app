/** Prevent an attendance/PHL record belonging to another employee from
 * being matched on name, department, or an old shared fingerprint PIN.
 * A matching stable UUID takes priority over stale legacy employee numbers. */
export function hasPHLIdentityConflict(
  row: { employee_id?: string | null; employee_number?: string | null },
  employee: { id?: string | null; employee_number?: string | null },
): boolean {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const rowId = String(row.employee_id || '').trim().toLowerCase()
  const employeeId = String(employee.id || '').trim().toLowerCase()
  const idsValid = uuid.test(rowId) && uuid.test(employeeId)
  if (idsValid && rowId !== employeeId) return true
  if (idsValid && rowId === employeeId) return false

  const rowNumber = String(row.employee_number || '').trim()
  const employeeNumber = String(employee.employee_number || '').trim()
  // Employee numbers are text identifiers; do not strip leading zeroes,
  // which may be institutionally meaningful.
  return Boolean(rowNumber && employeeNumber && rowNumber !== employeeNumber)
}
