export type LeavePostponeRequest = {
  id: string

  employee_number: string
  full_name: string | null
  department: string | null

  source_cycle_id: string | null

  remaining_days: number | null
  requested_days: number | null

  request_date: string | null
  old_cycle_end: string | null
  new_expired_at: string | null

  reason: string | null

  approval_status: string | null

  supervisor_1: string | null
  supervisor_1_status: string | null
  supervisor_1_notes: string | null

  supervisor_2: string | null
  supervisor_2_status: string | null
  supervisor_2_notes: string | null

  hr_status: string | null
  hr_notes: string | null

  is_active: boolean | null
  edited_by: string | null

  created_at: string | null
  updated_at: string | null
}