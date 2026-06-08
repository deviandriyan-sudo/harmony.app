export type LeaveType = {
  id: string
  name: string
  code: string
  description: string | null
  default_days: number | null
  balance_source: string | null
  is_paid: boolean | null
  requires_attachment: boolean | null
  attachment_label: string | null
  gender_restriction: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}