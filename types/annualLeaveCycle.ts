export type AnnualLeaveCycle = {
  id: string

  employee_number: string
  full_name: string | null
  department: string | null

  join_date: string | null

  cycle_start: string
  cycle_end: string
  matured_at: string

  entitlement_days: number | null
  used_days: number | null
  remaining_days: number | null

  carry_forward_days: number | null
  carry_forward_used_days: number | null
  carry_forward_remaining_days: number | null
  carry_forward_expired_at: string | null

  status: string | null

  notes: string | null
  is_active: boolean | null
  edited_by: string | null

  created_at: string | null
  updated_at: string | null
}