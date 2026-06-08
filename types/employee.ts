export type Employee = {
  id: string

  employee_number: string
  machine_pin: string

  full_name: string
  email: string | null
  phone: string | null
  gender: string | null

  department: string | null
  position: string | null
  join_date: string | null
  employment_status: string | null

  supervisor_1: string | null
  supervisor_2: string | null

  annual_leave_balance: number | null
  phl_balance: number | null

  is_active: boolean | null

  created_at: string | null
  updated_at: string | null
}