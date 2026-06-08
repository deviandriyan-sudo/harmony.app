export type Holiday = {
  id: string

  holiday_date: string
  holiday_name: string
  holiday_type: string | null

  year: number | null
  source: string | null

  is_active: boolean | null
  notes: string | null

  created_at: string | null
  updated_at: string | null
}