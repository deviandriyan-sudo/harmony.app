export type RequestRecord = {
  id: string
  employee_number: string | null
  full_name: string | null
  department: string | null

  request_type: string
  start_date: string | null
  end_date: string | null
  total_days: number | null

  reason: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_required: boolean | null
  attachment_label: string | null
  balance_source: string | null
  is_paid: boolean | null

  approval_status: string | null
  approval_step: number | null

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