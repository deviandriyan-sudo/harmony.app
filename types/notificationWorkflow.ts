export type HarmonyWorkflowKey =
  | 'attendance_period_submitted'
  | 'leave_request_submitted'
  | 'postpone_request_submitted'
  | 'supervisor_attendance_decision'
  | 'supervisor_leave_decision'
  | 'supervisor_postpone_decision'
  | 'leave_request_cancelled'
  | 'postpone_request_cancelled'

export type HarmonyWorkflowPayload = {
  workflow: HarmonyWorkflowKey
  entityId?: string | null
  data?: Record<string, unknown>
}

export type HarmonyWorkflowNotificationResult = {
  ok: boolean
  message: string
  sent: number
  failed: number
  details?: Array<{
    target: string
    ok: boolean
    message: string
  }>
}
