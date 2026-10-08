import { supabase } from '@/lib/supabase'

export type PHLWorkAttachment = {
  id: string
  slot_no: number
  file_name: string
  mime_type: string | null
  file_size: number | null
  signed_url: string | null
}

export type PHLWorkRequest = {
  id: string
  request_key: string
  employee_id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  work_date: string
  work_start_time: string
  work_end_time: string
  requested_work_minutes: number
  recorded_work_minutes: number | null
  attendance_log_id: string | null
  attendance_verified: boolean
  origin?: 'employee_request' | 'legacy_attendance' | string
  legacy_attendance_status?: string | null
  work_day_type: 'weekday' | 'weekend' | 'holiday' | string
  holiday_name: string | null
  work_purpose: string
  notes: string | null
  status: 'pending_supervisor' | 'approved' | 'rejected' | 'cancelled' | string
  supervisor_status: 'pending' | 'approved' | 'rejected' | string
  supervisor_id: string | null
  supervisor_name: string | null
  supervisor_email: string | null
  supervisor_note: string | null
  supervisor_approved_at: string | null
  supervisor_rejected_at: string | null
  credited_phl_record_id: string | null
  balance_days: number
  valid_from: string | null
  expired_at: string | null
  cancelled_at: string | null
  cancel_note: string | null
  created_at: string
  updated_at: string
  attachments: PHLWorkAttachment[]
}

export type PHLWorkListResponse = {
  success: boolean
  requests: PHLWorkRequest[]
  error?: string
}

async function accessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new Error('Session login tidak valid. Silakan login ulang.')
  }
  return data.session.access_token
}

export async function fetchPHLWorkRequests(
  scope: 'mine' | 'team' | 'all' = 'mine',
) {
  const token = await accessToken()
  const response = await fetch(`/api/phl/work-requests?scope=${scope}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as PHLWorkListResponse | null
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Data pengajuan PHL gagal dimuat.')
  }
  return payload?.requests || []
}

export async function submitPHLWorkRequest(input: {
  workDate: string
  startTime: string
  endTime: string
  purpose: string
  notes?: string
  files: File[]
}) {
  const token = await accessToken()
  const body = new FormData()
  body.append('request_key', crypto.randomUUID())
  body.append('work_date', input.workDate)
  body.append('work_start_time', input.startTime)
  body.append('work_end_time', input.endTime)
  body.append('work_purpose', input.purpose)
  body.append('notes', input.notes || '')
  input.files.forEach((file) => body.append('files', file))

  const response = await fetch('/api/phl/work-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Pengajuan PHL gagal dikirim.')
  }
  return payload as {
    success: boolean
    request: PHLWorkRequest
    notification?: { ok: boolean; message: string }
  }
}

export async function reviewPHLWorkRequest(
  requestId: string,
  decision: 'approve' | 'reject',
  note: string,
) {
  const token = await accessToken()
  const response = await fetch(`/api/phl/work-requests/${requestId}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision, note }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Review pengajuan PHL gagal diproses.')
  }
  return payload
}

export async function cancelPHLWorkRequest(requestId: string, note: string) {
  const token = await accessToken()
  const response = await fetch('/api/phl/work-requests', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request_id: requestId, note }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Pengajuan PHL gagal dibatalkan.')
  }
  return payload
}

export function formatPHLMinutes(minutes: number | null | undefined) {
  const value = Math.max(0, Number(minutes || 0))
  const hours = Math.floor(value / 60)
  const mins = value % 60
  return `${hours}j ${mins}m`
}

export function phlWorkStatusLabel(status: string) {
  const value = String(status || '').toLowerCase()
  if (value === 'pending_supervisor') return 'Menunggu Atasan'
  if (value === 'approved') return 'Disetujui'
  if (value === 'rejected') return 'Ditolak'
  if (value === 'cancelled') return 'Dibatalkan'
  return status || '-'
}
