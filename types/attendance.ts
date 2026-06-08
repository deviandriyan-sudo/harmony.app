export type AttendanceRecord = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  attendance_date: string | null
  check_in: string | null
  check_out: string | null
  day_type: string | null
  attendance_status: string | null
  is_phl_candidate: boolean | null
  phl_status: string | null
  phl_valid_from: string | null
  phl_expired_at: string | null
  phl_approved_by: string | null
  phl_approved_at: string | null
  phl_notes: string | null
  notes: string | null
  correction_notes: string | null
  edited_by: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}