export type HarmonyTaskPriority = 'urgent' | 'high' | 'normal'

export type HarmonyTaskScope = 'employee' | 'supervisor' | 'hr'

export type HarmonyTaskCategory =
  | 'attendance'
  | 'leave'
  | 'phl'
  | 'postpone'
  | 'account'

export type HarmonyActionTask = {
  id: string
  category: HarmonyTaskCategory
  scope: HarmonyTaskScope
  priority: HarmonyTaskPriority
  title: string
  message: string
  action_url: string
  count: number
  period_month?: string | null
  oldest_created_at?: string | null
}

export type HarmonyTaskCenterResponse = {
  success: boolean
  tasks: HarmonyActionTask[]
  pending_count: number
  role?: string | null
  employee_id?: string | null
  checked_at?: string
  warning?: string | null
  error?: string
}
