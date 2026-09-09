export type ApprovalWorkflowInput = {
  status?: string | null
  supervisor_status?: string | null
  hr_status?: string | null
}

export type ApprovalWorkflowStage =
  | 'waiting_supervisor'
  | 'waiting_hr'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type ApprovalTone =
  | 'green'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'neutral'

const APPROVED = new Set(['approved', 'approve', 'finalized', 'final'])
const REJECTED = new Set([
  'rejected',
  'reject',
  'rejected_by_supervisor',
  'rejected_supervisor',
  'rejected_by_hr',
  'ditolak',
])
const CANCELLED = new Set(['cancelled', 'canceled', 'cancel'])
const PENDING = new Set([
  '',
  'pending',
  'submitted',
  'waiting_supervisor',
  'pending_supervisor',
  'waiting_hr',
  'pending_hr',
  'ready_for_hr',
  'menunggu',
])

export function normalizeApprovalStatus(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function isSupervisorApproved(input: ApprovalWorkflowInput | string | null | undefined) {
  const value =
    typeof input === 'object' && input !== null
      ? normalizeApprovalStatus(input.supervisor_status)
      : normalizeApprovalStatus(input)

  return APPROVED.has(value)
}

export function isSupervisorRejected(input: ApprovalWorkflowInput | string | null | undefined) {
  const value =
    typeof input === 'object' && input !== null
      ? normalizeApprovalStatus(input.supervisor_status)
      : normalizeApprovalStatus(input)

  return REJECTED.has(value)
}

export function deriveApprovalStage(input: ApprovalWorkflowInput): ApprovalWorkflowStage {
  const status = normalizeApprovalStatus(input.status)
  const supervisor = normalizeApprovalStatus(input.supervisor_status)
  const hr = normalizeApprovalStatus(input.hr_status)

  // HR is the only authority for final approval.
  if (APPROVED.has(hr)) return 'approved'

  if (CANCELLED.has(hr) || CANCELLED.has(status)) return 'cancelled'

  if (REJECTED.has(hr) || REJECTED.has(supervisor)) return 'rejected'

  // Explicit supervisor approval means the request has moved to HR,
  // even when legacy overall status still says "approved".
  if (APPROVED.has(supervisor)) return 'waiting_hr'

  return 'waiting_supervisor'
}

export function isFinalApproved(input: ApprovalWorkflowInput) {
  return deriveApprovalStage(input) === 'approved'
}

export function isWorkflowPending(input: ApprovalWorkflowInput) {
  const stage = deriveApprovalStage(input)
  return stage === 'waiting_supervisor' || stage === 'waiting_hr'
}

export function canHRProcessApproval(input: ApprovalWorkflowInput) {
  const supervisor = normalizeApprovalStatus(input.supervisor_status)
  const hr = normalizeApprovalStatus(input.hr_status)
  const stage = deriveApprovalStage(input)

  if (!APPROVED.has(supervisor)) return false
  if (stage !== 'waiting_hr') return false

  // HR pending can appear as blank/pending/waiting_hr/ready_for_hr
  // depending on legacy/current source. Never use overall status as
  // authority for final approval.
  return PENDING.has(hr)
}

export function getApprovalStageLabel(input: ApprovalWorkflowInput) {
  const stage = deriveApprovalStage(input)

  const labels: Record<ApprovalWorkflowStage, string> = {
    waiting_supervisor: 'Menunggu Atasan',
    waiting_hr: 'Menunggu HR',
    approved: 'Disetujui HR',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
  }

  return labels[stage]
}

export function getApprovalStageTone(input: ApprovalWorkflowInput): ApprovalTone {
  const stage = deriveApprovalStage(input)

  if (stage === 'approved') return 'green'
  if (stage === 'rejected' || stage === 'cancelled') return 'red'
  if (stage === 'waiting_hr') return 'blue'
  return 'orange'
}

export function getSupervisorApprovalLabel(status: unknown) {
  const value = normalizeApprovalStatus(status)
  if (APPROVED.has(value)) return 'Disetujui Atasan'
  if (REJECTED.has(value)) return 'Ditolak Atasan'
  return 'Menunggu Atasan'
}

export function getHRApprovalLabel(input: ApprovalWorkflowInput) {
  const hr = normalizeApprovalStatus(input.hr_status)
  const stage = deriveApprovalStage(input)

  if (stage === 'approved') return 'Disetujui HR'
  if (stage === 'cancelled') return 'Dibatalkan'
  if (REJECTED.has(hr)) return 'Ditolak HR'
  if (stage === 'rejected') return 'Tidak Diteruskan ke HR'
  if (stage === 'waiting_supervisor') return 'Belum Diproses HR'
  return 'Menunggu HR'
}
