'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Landmark,
  Loader2,
  Plane,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { sendHarmonyEmail } from '@/lib/notifications'

type ActiveTab = 'leave' | 'phl-claim' | 'phl-balance' | 'phl-audit' | 'history'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

type LeaveRequest = {
  id: string
  employee_id: string | null
  employee_number?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
  email?: string | null

  request_type?: string | null
  leave_type?: string | null
  start_date?: string | null
  end_date?: string | null
  total_days?: number | null
  reason?: string | null
  job_pending?: string | null
  handover_to?: string | null

  status?: string | null

  supervisor_status?: string | null
  supervisor_approved_by?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_by?: string | null
  supervisor_rejected_at?: string | null
  supervisor_note?: string | null

  hr_status?: string | null
  hr_approved_by?: string | null
  hr_approved_at?: string | null
  hr_note?: string | null
  hr_cancelled_by?: string | null
  hr_cancelled_at?: string | null
  hr_cancel_note?: string | null

  proof_url?: string | null
  proof_file_url?: string | null
  proof_file_name?: string | null

  job_pending_summary?: string | null
  job_pending_detail?: string | null
  handover_to_employee_id?: string | null
  handover_to_employee_number?: string | null
  handover_to_full_name?: string | null
  handover_to_department?: string | null
  handover_to_position?: string | null
  handover_note?: string | null
  emergency_contact_during_leave?: string | null
  is_handover_required?: boolean | null
  handover_status?: string | null

  submitted_by?: string | null
  submitted_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type PHLRecord = {
  id: string
  source_attendance_log_id?: string | null
  employee_id: string | null
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
  email?: string | null

  phl_date?: string | null
  valid_from?: string | null
  expired_at?: string | null

  reason?: string | null
  source?: string | null
  status?: string | null

  balance_days?: number | null
  used_days?: number | null
  remaining_days?: number | null

  proof_file_url?: string | null
  proof_file_name?: string | null

  approved_by?: string | null
  approved_at?: string | null

  supervisor_status?: string | null
  supervisor_approved_by?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_by?: string | null
  supervisor_rejected_at?: string | null
  supervisor_note?: string | null

  hr_status?: string | null
  hr_approved_by?: string | null
  hr_approved_at?: string | null
  hr_note?: string | null
  hr_cancelled_by?: string | null
  hr_cancelled_at?: string | null
  hr_cancel_note?: string | null

  legacy_review_status?: string | null
  legacy_review_note?: string | null
  legacy_reviewed_by?: string | null
  legacy_reviewed_at?: string | null

  job_pending_summary?: string | null
  job_pending_detail?: string | null
  handover_to_employee_id?: string | null
  handover_to_employee_number?: string | null
  handover_to_full_name?: string | null
  handover_to_department?: string | null
  handover_to_position?: string | null
  handover_note?: string | null
  emergency_contact_during_leave?: string | null
  is_handover_required?: boolean | null
  handover_status?: string | null

  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type PHLBalanceSummary = {
  employee_id: string | null
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  total_earned_days: number | null
  total_used_days: number | null
  total_available_days: number | null
  pending_claim_count: number | null
}

type PHLReconciliationRow = {
  employee_id: string
  employee_number: string | null
  full_name: string | null
  department: string | null
  position: string | null
  manual_phl_balance: number | null
  active_ledger_balance: number | null
  manual_ledger_difference: number | null
  expired_remaining_balance: number | null
  total_earned_days: number | null
  total_used_days: number | null
  pending_claim_count: number | null
  approved_claim_count: number | null
  legacy_untracked_claim_count: number | null
  reviewed_legacy_claim_count: number | null
  reconciliation_status: string | null
  last_reviewed_by: string | null
  last_reviewed_at: string | null
  last_review_note: string | null
}

type LegacyPHLClaimReview = {
  claim_record_id: string
  employee_id: string | null
  employee_number: string | null
  full_name: string | null
  department: string | null
  position: string | null
  phl_date: string | null
  claim_days: number | null
  allocated_days: number | null
  override_consumed_days: number | null
  tracking_gap_days: number | null
  legacy_review_status: string | null
  legacy_review_note: string | null
  legacy_reviewed_by: string | null
  legacy_reviewed_at: string | null
  hr_approved_by: string | null
  hr_approved_at: string | null
}

type DeleteTarget = {
  id: string
  kind: 'leave' | 'phl'
  title: string
  employeeName: string
  description: string
}


type NotificationRecipient = {
  email: string
  fullName: string
}

function isValidEmail(value: string | null | undefined) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function getNotificationBaseUrl() {
  if (typeof window === 'undefined') return ''

  return window.location.origin
}

function getRequestLabel(item: LeaveRequest) {
  return item.leave_type || item.request_type || 'Cuti/Izin'
}

function getRequestPeriodText(startDate?: string | null, endDate?: string | null) {
  return `${formatDisplayDate(startDate || '')} s.d. ${formatDisplayDate(endDate || '')}`
}

async function resolveEmployeeRecipient({
  employeeId,
  employeeNumber,
  fullName,
  directEmail,
}: {
  employeeId?: string | null
  employeeNumber?: string | null
  fullName?: string | null
  directEmail?: string | null
}): Promise<NotificationRecipient | null> {
  const direct = String(directEmail || '').trim().toLowerCase()

  if (isValidEmail(direct)) {
    return {
      email: direct,
      fullName: fullName || direct,
    }
  }

  const selectColumns = 'id,email,full_name,employee_number,machine_pin'

  if (employeeId) {
    const { data } = await supabase
      .from('employees')
      .select(selectColumns)
      .eq('id', employeeId)
      .maybeSingle<{
        email?: string | null
        full_name?: string | null
        employee_number?: string | null
      }>()

    const email = String(data?.email || '').trim().toLowerCase()

    if (isValidEmail(email)) {
      return {
        email,
        fullName: data?.full_name || fullName || email,
      }
    }
  }

  if (employeeNumber) {
    const { data } = await supabase
      .from('employees')
      .select(selectColumns)
      .eq('employee_number', employeeNumber)
      .limit(1)

    const matched = data?.[0] as {
      email?: string | null
      full_name?: string | null
      employee_number?: string | null
    } | undefined

    const email = String(matched?.email || '').trim().toLowerCase()

    if (isValidEmail(email)) {
      return {
        email,
        fullName: matched?.full_name || fullName || email,
      }
    }
  }

  if (fullName) {
    const { data } = await supabase
      .from('employees')
      .select(selectColumns)
      .eq('full_name', fullName)
      .limit(1)

    const matched = data?.[0] as {
      email?: string | null
      full_name?: string | null
      employee_number?: string | null
    } | undefined

    const email = String(matched?.email || '').trim().toLowerCase()

    if (isValidEmail(email)) {
      return {
        email,
        fullName: matched?.full_name || fullName || email,
      }
    }
  }

  return null
}

async function sendHRLeaveDecisionEmail({
  item,
  decision,
  hrName,
  note,
}: {
  item: LeaveRequest
  decision: 'approved' | 'rejected'
  hrName: string
  note: string
}) {
  const recipient = await resolveEmployeeRecipient({
    employeeId: item.employee_id,
    employeeNumber: item.employee_number,
    fullName: item.full_name,
    directEmail: item.email,
  })

  if (!recipient) {
    return {
      success: false,
      message: 'Email employee tidak ditemukan pada data karyawan.',
    }
  }

  const approved = decision === 'approved'
  const requestLabel = getRequestLabel(item)
  const statusLabel = approved ? 'disetujui' : 'ditolak'
  const title = approved
    ? `${requestLabel} Disetujui HR`
    : `${requestLabel} Ditolak HR`

  try {
    await sendHarmonyEmail({
      to: recipient.email,
      subject: `[HARMONY] ${title}`,
      title,
      message: [
        `Yth. ${recipient.fullName},`,
        '',
        `Pengajuan ${requestLabel} Anda telah ${statusLabel} oleh HR.`,
        '',
        `Periode: ${getRequestPeriodText(item.start_date, item.end_date)}`,
        `Jumlah hari: ${item.total_days || 0} hari`,
        `Alasan pengajuan: ${item.reason || '-'}`,
        `Job pending: ${item.job_pending_summary || item.job_pending_detail || item.job_pending || '-'}`,
        `Penerima handover: ${item.handover_to_full_name || item.handover_to || '-'}`,
        '',
        `Catatan HR: ${note || '-'}`,
        `Diproses oleh: ${hrName}`,
      ].join('\n'),
      actionLabel: 'Buka Cuti & Izin HARMONY',
      actionUrl: `${getNotificationBaseUrl()}/employee/leave`,
      footer:
        'Email ini dikirim otomatis oleh HARMONY setelah HR memproses pengajuan cuti/izin/PHL.',
    })

    return {
      success: true,
      message: `Email notifikasi terkirim ke ${recipient.email}.`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Email notifikasi gagal terkirim.',
    }
  }
}

async function sendHRLeaveCancellationEmail({
  item,
  hrName,
  note,
  balanceText,
}: {
  item: LeaveRequest
  hrName: string
  note: string
  balanceText?: string
}) {
  const recipient = await resolveEmployeeRecipient({
    employeeId: item.employee_id,
    employeeNumber: item.employee_number,
    fullName: item.full_name,
    directEmail: item.email,
  })

  if (!recipient) {
    return {
      success: false,
      message: 'Email employee tidak ditemukan pada data karyawan.',
    }
  }

  const requestLabel = getRequestLabel(item)
  const title = `${requestLabel} Dibatalkan HR`

  try {
    await sendHarmonyEmail({
      to: recipient.email,
      subject: `[HARMONY] ${title}`,
      title,
      message: [
        `Yth. ${recipient.fullName},`,
        '',
        `Pengajuan ${requestLabel} Anda yang sebelumnya sudah disetujui telah dibatalkan oleh HR.`,
        '',
        `Periode: ${getRequestPeriodText(item.start_date, item.end_date)}`,
        `Jumlah hari: ${item.total_days || 0} hari`,
        `Alasan pengajuan: ${item.reason || '-'}`,
        balanceText ? `Perubahan saldo: ${balanceText}` : 'Perubahan saldo: tidak ada saldo manual yang dikembalikan.',
        '',
        `Alasan pembatalan: ${note || '-'}`,
        `Diproses oleh: ${hrName}`,
      ].join('\n'),
      actionLabel: 'Buka Cuti & Izin HARMONY',
      actionUrl: `${getNotificationBaseUrl()}/employee/leave`,
      footer:
        'Email ini dikirim otomatis oleh HARMONY setelah HR membatalkan pengajuan yang sudah disetujui.',
    })

    return {
      success: true,
      message: `Email notifikasi terkirim ke ${recipient.email}.`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Email notifikasi pembatalan gagal terkirim.',
    }
  }
}

async function sendHRPHLDecisionEmail({
  record,
  decision,
  hrName,
  note,
}: {
  record: PHLRecord
  decision: 'approved' | 'rejected'
  hrName: string
  note: string
}) {
  const recipient = await resolveEmployeeRecipient({
    employeeId: record.employee_id,
    employeeNumber: record.employee_number,
    fullName: record.full_name,
    directEmail: record.email,
  })

  if (!recipient) {
    return {
      success: false,
      message: 'Email employee tidak ditemukan pada data karyawan.',
    }
  }

  const approved = decision === 'approved'
  const title = approved
    ? 'Klaim PHL Disetujui HR'
    : 'Klaim PHL Ditolak HR'
  const statusLabel = approved ? 'disetujui' : 'ditolak'

  try {
    await sendHarmonyEmail({
      to: recipient.email,
      subject: `[HARMONY] ${title}`,
      title,
      message: [
        `Yth. ${recipient.fullName},`,
        '',
        `Klaim PHL Anda telah ${statusLabel} oleh HR.`,
        '',
        `Tanggal PHL: ${formatDisplayDate(record.phl_date || record.valid_from || '')}`,
        `Jumlah klaim: ${record.used_days || record.balance_days || 0} hari`,
        `Alasan: ${record.reason || record.notes || '-'}`,
        `Job pending: ${record.job_pending_summary || record.job_pending_detail || '-'}`,
        `Penerima handover: ${record.handover_to_full_name || '-'}`,
        '',
        `Catatan HR: ${note || '-'}`,
        `Diproses oleh: ${hrName}`,
      ].join('\n'),
      actionLabel: 'Buka Cuti & Izin HARMONY',
      actionUrl: `${getNotificationBaseUrl()}/employee/leave`,
      footer:
        'Email ini dikirim otomatis oleh HARMONY setelah HR memproses klaim PHL.',
    })

    return {
      success: true,
      message: `Email notifikasi terkirim ke ${recipient.email}.`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Email notifikasi gagal terkirim.',
    }
  }
}


async function sendHRPHLCancellationEmail({
  record,
  hrName,
  note,
  restoredText,
  expiredText,
}: {
  record: PHLRecord
  hrName: string
  note: string
  restoredText: string
  expiredText?: string
}) {
  const recipient = await resolveEmployeeRecipient({
    employeeId: record.employee_id,
    employeeNumber: record.employee_number,
    fullName: record.full_name,
    directEmail: record.email,
  })

  if (!recipient) {
    return {
      success: false,
      message: 'Email employee tidak ditemukan pada data karyawan.',
    }
  }

  const title = 'Klaim PHL Dibatalkan HR'

  try {
    await sendHarmonyEmail({
      to: recipient.email,
      subject: `[HARMONY] ${title}`,
      title,
      message: [
        `Yth. ${recipient.fullName},`,
        '',
        'Klaim PHL Anda yang sebelumnya sudah disetujui telah dibatalkan oleh HR.',
        '',
        `Tanggal klaim: ${formatDisplayDate(record.phl_date || record.valid_from || '')}`,
        `Jumlah klaim: ${record.used_days || record.balance_days || 0} hari`,
        `Saldo dikembalikan: ${restoredText || '-'}`,
        expiredText ? `Catatan masa berlaku: ${expiredText}` : '',
        '',
        `Alasan pembatalan: ${note || '-'}`,
        `Diproses oleh: ${hrName}`,
      ]
        .filter(Boolean)
        .join('\n'),
      actionLabel: 'Buka Cuti & Izin HARMONY',
      actionUrl: `${getNotificationBaseUrl()}/employee/leave`,
      footer:
        'Email ini dikirim otomatis oleh HARMONY setelah HR membatalkan klaim PHL yang sudah disetujui.',
    })

    return {
      success: true,
      message: `Email notifikasi terkirim ke ${recipient.email}.`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Email notifikasi pembatalan PHL gagal terkirim.',
    }
  }
}

function appendNotificationText(baseMessage: string, notification: { success: boolean; message: string }) {
  return notification.success
    ? `${baseMessage} ${notification.message}`
    : `${baseMessage} Namun email notifikasi belum terkirim: ${notification.message}`
}

export default function HRLeavePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('leave')

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [phlRecords, setPHLRecords] = useState<PHLRecord[]>([])
  const [phlBalanceSummary, setPHLBalanceSummary] = useState<PHLBalanceSummary[]>([])
  const [phlReconciliationRows, setPHLReconciliationRows] = useState<PHLReconciliationRow[]>([])
  const [legacyPHLClaims, setLegacyPHLClaims] = useState<LegacyPHLClaimReview[]>([])
  const [phlAuditError, setPHLAuditError] = useState('')

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null)
  const [selectedPHLRecord, setSelectedPHLRecord] = useState<PHLRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const [rejectPHLRecord, setRejectPHLRecord] = useState<PHLRecord | null>(null)
  const [rejectPHLReason, setRejectPHLReason] = useState('')

  const [rejectLeaveRecord, setRejectLeaveRecord] = useState<LeaveRequest | null>(null)
  const [rejectLeaveReason, setRejectLeaveReason] = useState('')

  const [cancelLeaveRecord, setCancelLeaveRecord] = useState<LeaveRequest | null>(null)
  const [cancelLeaveReason, setCancelLeaveReason] = useState('')

  const [cancelPHLRecord, setCancelPHLRecord] = useState<PHLRecord | null>(null)
  const [cancelPHLReason, setCancelPHLReason] = useState('')

  const [employeePHLReviewTarget, setEmployeePHLReviewTarget] = useState<PHLReconciliationRow | null>(null)
  const [employeePHLReviewNote, setEmployeePHLReviewNote] = useState('')

  const [legacyPHLReviewTarget, setLegacyPHLReviewTarget] = useState<LegacyPHLClaimReview | null>(null)
  const [legacyPHLReviewNote, setLegacyPHLReviewNote] = useState('')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const phlClaims = useMemo(() => {
    return phlRecords.filter((item) => item.source === 'employee_phl_claim')
  }, [phlRecords])

  const phlBalances = useMemo(() => {
    return phlRecords.filter((item) => item.source === 'attendance_phl_approved')
  }, [phlRecords])

  const pendingPHLClaims = phlClaims.filter((item) => {
    const status = normalizeStatus(item.status)

    return (
      status === 'pending' ||
      status === 'submitted' ||
      status === 'waiting_hr'
    )
  })

  const approvedPHLClaims = phlClaims.filter((item) => {
    return normalizeStatus(item.status) === 'approved'
  })

  const rejectedPHLClaims = phlClaims.filter((item) => {
    return normalizeStatus(item.status) === 'rejected'
  })

  const pendingLeaveRequests = leaveRequests.filter((item) => {
    const status = normalizeStatus(item.hr_status || item.status || item.supervisor_status)

    return (
      status === 'pending' ||
      status === 'waiting_supervisor' ||
      status === 'waiting_hr' ||
      status === 'submitted'
    )
  })

  const filteredLeaveRequests = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return leaveRequests

    return leaveRequests.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.leave_type?.toLowerCase().includes(keyword) ||
        item.request_type?.toLowerCase().includes(keyword) ||
        item.reason?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.hr_status?.toLowerCase().includes(keyword) ||
        item.supervisor_status?.toLowerCase().includes(keyword) ||
        item.job_pending_summary?.toLowerCase().includes(keyword) ||
        item.job_pending_detail?.toLowerCase().includes(keyword) ||
        item.handover_to_full_name?.toLowerCase().includes(keyword)
      )
    })
  }, [leaveRequests, searchKeyword])

  const filteredPHLClaims = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return phlClaims

    return phlClaims.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.reason?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.hr_status?.toLowerCase().includes(keyword) ||
        item.supervisor_status?.toLowerCase().includes(keyword) ||
        item.job_pending_summary?.toLowerCase().includes(keyword) ||
        item.job_pending_detail?.toLowerCase().includes(keyword) ||
        item.handover_to_full_name?.toLowerCase().includes(keyword)
      )
    })
  }, [phlClaims, searchKeyword])

  const filteredPHLBalances = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return phlBalances

    return phlBalances.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.reason?.toLowerCase().includes(keyword)
      )
    })
  }, [phlBalances, searchKeyword])

  const filteredBalanceSummary = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return phlBalanceSummary

    return phlBalanceSummary.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword)
      )
    })
  }, [phlBalanceSummary, searchKeyword])

  const filteredPHLReconciliationRows = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return phlReconciliationRows

    return phlReconciliationRows.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.reconciliation_status?.toLowerCase().includes(keyword) ||
        item.last_review_note?.toLowerCase().includes(keyword)
      )
    })
  }, [phlReconciliationRows, searchKeyword])

  const filteredLegacyPHLClaims = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return legacyPHLClaims

    return legacyPHLClaims.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.legacy_review_status?.toLowerCase().includes(keyword) ||
        item.legacy_review_note?.toLowerCase().includes(keyword)
      )
    })
  }, [legacyPHLClaims, searchKeyword])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData(options?: { preserveMessages?: boolean }) {
    setLoading(true)

    if (!options?.preserveMessages) {
      setErrorMessage('')
      setSuccessMessage('')
    }
    setSelectedLeaveRequest(null)
    setSelectedPHLRecord(null)
    setDeleteTarget(null)
    setRejectPHLRecord(null)
    setRejectPHLReason('')
    setRejectLeaveRecord(null)
    setRejectLeaveReason('')
    setCancelLeaveRecord(null)
    setCancelLeaveReason('')
    setCancelPHLRecord(null)
    setCancelPHLReason('')
    setEmployeePHLReviewTarget(null)
    setEmployeePHLReviewNote('')
    setLegacyPHLReviewTarget(null)
    setLegacyPHLReviewNote('')
    setPHLAuditError('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session HR belum ditemukan. Silakan login ulang.')
      setLoading(false)
      return
    }

    const { data: appUserData } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    setAppUser(
      appUserData || {
        id: authData.user.id,
        email: authData.user.email || 'HR Administrator',
        role: 'hr',
        employee_id: null,
        is_active: true,
      }
    )

    await Promise.all([
      fetchLeaveRequests(),
      fetchPHLRecords(),
      fetchPHLBalanceSummary(),
      fetchPHLAuditData(),
    ])

    setLoading(false)
  }

  async function fetchLeaveRequests() {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setLeaveRequests([])
      return
    }

    setLeaveRequests(data || [])
  }

  async function fetchPHLRecords() {
    const { data, error } = await supabase
      .from('phl_records')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setPHLRecords([])
      return
    }

    setPHLRecords(data || [])
  }

  async function fetchPHLBalanceSummary() {
    const { data, error } = await supabase
      .from('employee_phl_balance_summary')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      setPHLBalanceSummary([])
      return
    }

    setPHLBalanceSummary(data || [])
  }

  async function fetchPHLAuditData() {
    const [reconciliationResult, legacyResult] = await Promise.all([
      supabase.rpc('hr_get_phl_reconciliation'),
      supabase.rpc('hr_get_legacy_phl_claims'),
    ])

    const auditError =
      reconciliationResult.error?.message ||
      legacyResult.error?.message ||
      ''

    if (auditError) {
      setPHLReconciliationRows([])
      setLegacyPHLClaims([])
      setPHLAuditError(
        `${auditError} Jalankan SQL rekonsiliasi PHL terlebih dahulu.`
      )
      return
    }

    setPHLReconciliationRows(
      (reconciliationResult.data || []) as PHLReconciliationRow[]
    )
    setLegacyPHLClaims(
      (legacyResult.data || []) as LegacyPHLClaimReview[]
    )
    setPHLAuditError('')
  }

  async function approvePHLClaim(record: PHLRecord) {
    setProcessingId(record.id)
    setErrorMessage('')
    setSuccessMessage('')

    const approvedBy = appUser?.email || 'HR Administrator'
    const approvalNote = 'Disetujui oleh HR.'

    type AtomicPHLApprovalResult = {
      success?: boolean
      already_approved?: boolean
      claim_record_id?: string
      employee_id?: string
      claim_days?: number
      available_balance_before?: number | null
      available_balance_after?: number | null
      employee_override_before?: number | null
      employee_override_after?: number | null
      legacy_message?: string | null
      message?: string
    }

    try {
      const { data, error } = await supabase.rpc('hr_approve_phl_claim_atomic', {
        p_claim_record_id: record.id,
        p_approved_by: approvedBy,
        p_note: approvalNote,
      })

      if (error) throw error

      const result = (data || {}) as AtomicPHLApprovalResult

      const ledgerInfo =
        result.available_balance_before !== null &&
        result.available_balance_before !== undefined &&
        result.available_balance_after !== null &&
        result.available_balance_after !== undefined
          ? ` Saldo ledger: ${result.available_balance_before} → ${result.available_balance_after} hari.`
          : ''

      const overrideInfo =
        result.employee_override_before !== null &&
        result.employee_override_before !== undefined &&
        result.employee_override_after !== null &&
        result.employee_override_after !== undefined &&
        result.employee_override_before !== result.employee_override_after
          ? ` Saldo manual employee: ${result.employee_override_before} → ${result.employee_override_after} hari.`
          : ''

      const notification = await sendHRPHLDecisionEmail({
        record,
        decision: 'approved',
        hrName: approvedBy,
        note: approvalNote,
      })

      setSuccessMessage(
        appendNotificationText(
          `${result.message || 'Klaim PHL berhasil disetujui secara atomik.'}${ledgerInfo}${overrideInfo}`,
          notification
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Klaim PHL gagal disetujui. Pastikan SQL atomic workflow PHL sudah dijalankan.'
      )
    } finally {
      setProcessingId('')
      await fetchData({ preserveMessages: true })
    }
  }

  async function rejectPHLClaim() {
    if (!rejectPHLRecord) return

    const targetRecord = rejectPHLRecord

    setProcessingId(targetRecord.id)
    setErrorMessage('')
    setSuccessMessage('')

    const rejectedBy = appUser?.email || 'HR Administrator'
    const rejectNote = rejectPHLReason.trim() || 'Ditolak oleh HR.'

    type AtomicPHLRejectResult = {
      success?: boolean
      already_rejected?: boolean
      claim_record_id?: string
      employee_id?: string
      claim_days?: number
      legacy_message?: string | null
      message?: string
    }

    try {
      const { data, error } = await supabase.rpc('hr_reject_phl_claim_atomic', {
        p_claim_record_id: targetRecord.id,
        p_rejected_by: rejectedBy,
        p_reason: rejectNote,
      })

      if (error) throw error

      const result = (data || {}) as AtomicPHLRejectResult

      const notification = await sendHRPHLDecisionEmail({
        record: targetRecord,
        decision: 'rejected',
        hrName: rejectedBy,
        note: rejectNote,
      })

      setSuccessMessage(
        appendNotificationText(
          result.message || 'Klaim PHL berhasil ditolak secara atomik.',
          notification
        )
      )

      setRejectPHLRecord(null)
      setRejectPHLReason('')
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Klaim PHL gagal ditolak. Pastikan SQL atomic workflow PHL sudah dijalankan.'
      )
    } finally {
      setProcessingId('')
      await fetchData({ preserveMessages: true })
    }
  }


  async function cancelApprovedPHLClaim() {
    if (!cancelPHLRecord) return

    const targetRecord = cancelPHLRecord
    const reason = cancelPHLReason.trim()

    if (reason.length < 5) {
      setErrorMessage('Alasan pembatalan PHL minimal 5 karakter agar audit HR tetap jelas.')
      return
    }

    setProcessingId(targetRecord.id)
    setErrorMessage('')
    setSuccessMessage('')

    const cancelledBy = appUser?.email || 'HR Administrator'

    type AtomicPHLCancellationResult = {
      success?: boolean
      already_cancelled?: boolean
      claim_record_id?: string
      employee_id?: string
      claim_days?: number | null
      allocation_count?: number | null
      restored_fifo_days?: number | null
      restored_employee_override_days?: number | null
      restored_active_days?: number | null
      restored_expired_days?: number | null
      available_balance_before?: number | null
      available_balance_after?: number | null
      employee_override_before?: number | null
      employee_override_after?: number | null
      message?: string
    }

    try {
      const { data, error } = await supabase.rpc(
        'hr_cancel_approved_phl_claim_atomic',
        {
          p_claim_record_id: targetRecord.id,
          p_cancelled_by: cancelledBy,
          p_note: reason,
        }
      )

      if (error) throw error

      const result = (data || {}) as AtomicPHLCancellationResult

      if (!result.success) {
        throw new Error(
          result.message || 'Pembatalan klaim PHL belum berhasil diproses.'
        )
      }

      const fifoDays = Number(result.restored_fifo_days || 0)
      const overrideDays = Number(result.restored_employee_override_days || 0)
      const activeDays = Number(result.restored_active_days || 0)
      const expiredDays = Number(result.restored_expired_days || 0)

      const restoredParts = [
        fifoDays > 0 ? `${fifoDays} hari ke saldo FIFO asal` : '',
        overrideDays > 0 ? `${overrideDays} hari ke saldo manual employee` : '',
      ].filter(Boolean)

      const restoredText =
        restoredParts.join(' dan ') || 'tidak ada saldo yang dikembalikan ulang'

      const expiredText =
        expiredDays > 0
          ? `${expiredDays} hari dikembalikan ke saldo asal yang masa berlakunya sudah berakhir, sehingga tidak menambah saldo aktif.`
          : activeDays > 0
            ? `${activeDays} hari kembali sebagai saldo aktif dengan tanggal kedaluwarsa sumber tetap dipertahankan.`
            : ''

      const ledgerInfo =
        result.available_balance_before !== null &&
        result.available_balance_before !== undefined &&
        result.available_balance_after !== null &&
        result.available_balance_after !== undefined
          ? ` Saldo aktif ledger: ${result.available_balance_before} → ${result.available_balance_after} hari.`
          : ''

      const baseMessage = result.already_cancelled
        ? 'Klaim PHL sebelumnya sudah dibatalkan. Saldo tidak dikembalikan ulang.'
        : `${result.message || 'Klaim PHL berhasil dibatalkan.'} ${restoredText}.${ledgerInfo}${expiredText ? ` ${expiredText}` : ''}`

      const notification = await sendHRPHLCancellationEmail({
        record: targetRecord,
        hrName: cancelledBy,
        note: reason,
        restoredText,
        expiredText,
      })

      setSuccessMessage(
        appendNotificationText(baseMessage, notification)
      )

      setCancelPHLRecord(null)
      setCancelPHLReason('')
    } catch (error: any) {
      console.error('Atomic PHL cancellation error:', error)

      setErrorMessage(
        error?.message ||
          'Pembatalan klaim PHL gagal. Status dan seluruh saldo tetap seperti semula.'
      )
    } finally {
      setProcessingId('')
      await fetchData({ preserveMessages: true })
    }
  }


  async function recordPHLEmployeeReview() {
    if (!employeePHLReviewTarget) return

    const note = employeePHLReviewNote.trim()

    if (note.length < 5) {
      setErrorMessage('Catatan review rekonsiliasi minimal 5 karakter.')
      return
    }

    const processingKey = `phl-review-${employeePHLReviewTarget.employee_id}`

    setProcessingId(processingKey)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data, error } = await supabase.rpc(
        'hr_record_phl_employee_review',
        {
          p_employee_id: employeePHLReviewTarget.employee_id,
          p_note: note,
        }
      )

      if (error) throw error

      const result = (data || {}) as {
        success?: boolean
        message?: string
      }

      setSuccessMessage(
        result.message ||
          'Review rekonsiliasi PHL berhasil dicatat tanpa mengubah saldo.'
      )

      setEmployeePHLReviewTarget(null)
      setEmployeePHLReviewNote('')
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Gagal mencatat review rekonsiliasi PHL.'
      )
    } finally {
      setProcessingId('')
      await fetchData({ preserveMessages: true })
    }
  }

  async function markLegacyPHLClaimReviewed() {
    if (!legacyPHLReviewTarget) return

    const note = legacyPHLReviewNote.trim()

    if (note.length < 5) {
      setErrorMessage('Catatan review klaim legacy minimal 5 karakter.')
      return
    }

    const processingKey = `legacy-review-${legacyPHLReviewTarget.claim_record_id}`

    setProcessingId(processingKey)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data, error } = await supabase.rpc(
        'hr_mark_legacy_phl_claim_reviewed',
        {
          p_claim_record_id: legacyPHLReviewTarget.claim_record_id,
          p_note: note,
        }
      )

      if (error) throw error

      const result = (data || {}) as {
        success?: boolean
        message?: string
      }

      setSuccessMessage(
        result.message ||
          'Klaim legacy berhasil ditandai sudah direview tanpa mengubah saldo.'
      )

      setLegacyPHLReviewTarget(null)
      setLegacyPHLReviewNote('')
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Gagal mencatat review klaim legacy PHL.'
      )
    } finally {
      setProcessingId('')
      await fetchData({ preserveMessages: true })
    }
  }

  async function approveLeaveRequest(item: LeaveRequest) {
    setProcessingId(item.id)
    setErrorMessage('')
    setSuccessMessage('')

    const approvedBy = appUser?.email || 'HR Administrator'
    const approvalNote = 'Disetujui oleh HR.'

    type AtomicApprovalResult = {
      success?: boolean
      already_approved?: boolean
      request_id?: string
      employee_id?: string
      request_type?: string | null
      total_days?: number | null
      balance_field?: 'annual_leave_balance' | 'phl_balance' | null
      balance_before?: number | null
      balance_after?: number | null
      attendance_sync?: string | null
      message?: string
    }

    try {
      const { data, error } = await supabase.rpc(
        'hr_approve_leave_request_atomic',
        {
          p_request_id: item.id,
          p_approved_by: approvedBy,
          p_note: approvalNote,
        }
      )

      if (error) {
        throw error
      }

      const result = (data || {}) as AtomicApprovalResult

      if (!result.success) {
        throw new Error(
          result.message ||
            'Approval final HR belum berhasil diproses.'
        )
      }

      let balanceText = ''

      if (
        result.balance_field &&
        result.balance_before !== null &&
        result.balance_before !== undefined &&
        result.balance_after !== null &&
        result.balance_after !== undefined
      ) {
        const balanceLabel =
          result.balance_field === 'annual_leave_balance'
            ? 'Saldo cuti tahunan'
            : 'Saldo PHL'

        balanceText =
          ` ${balanceLabel}: ${result.balance_before} hari → ` +
          `${result.balance_after} hari.`
      }

      const baseMessage = result.already_approved
        ? 'Pengajuan sebelumnya sudah disetujui HR. Tidak ada pemotongan saldo ulang.'
        : `Pengajuan cuti/izin berhasil disetujui HR secara atomik, saldo diperbarui, dan data absensi tersinkron.${balanceText}`

      let notification

      try {
        notification = await sendHRLeaveDecisionEmail({
          item,
          decision: 'approved',
          hrName: approvedBy,
          note: approvalNote,
        })
      } catch (notificationError: any) {
        console.warn(
          'HR leave approval notification warning:',
          notificationError
        )

        notification = {
          success: false,
          message:
            notificationError?.message ||
            'Email notifikasi belum berhasil dikirim.',
        }
      }

      setSuccessMessage(
        appendNotificationText(baseMessage, notification)
      )
    } catch (error: any) {
      console.error('Atomic HR leave approval error:', error)

      setErrorMessage(
        error?.message ||
          'Approval final HR gagal. Tidak ada status, saldo, atau data absensi yang diubah.'
      )
    } finally {
      setProcessingId('')
      await fetchData({ preserveMessages: true })
    }
  }

  async function cancelApprovedLeaveRequest() {
    if (!cancelLeaveRecord) return

    const reason = cancelLeaveReason.trim()

    if (reason.length < 5) {
      setErrorMessage('Alasan pembatalan minimal 5 karakter agar audit HR tetap jelas.')
      return
    }

    setProcessingId(cancelLeaveRecord.id)
    setErrorMessage('')
    setSuccessMessage('')

    const cancelledBy = appUser?.email || 'HR Administrator'

    type AtomicCancellationResult = {
      success?: boolean
      already_cancelled?: boolean
      request_id?: string
      employee_id?: string
      balance_field?: 'annual_leave_balance' | 'phl_balance' | null
      balance_before?: number | null
      balance_after?: number | null
      restored_days?: number | null
      attendance_sync?: string | null
      message?: string
    }

    try {
      const { data, error } = await supabase.rpc(
        'hr_cancel_approved_leave_request_atomic',
        {
          p_request_id: cancelLeaveRecord.id,
          p_cancelled_by: cancelledBy,
          p_note: reason,
        }
      )

      if (error) throw error

      const result = (data || {}) as AtomicCancellationResult

      if (!result.success) {
        throw new Error(
          result.message ||
            'Pembatalan pengajuan belum berhasil diproses.'
        )
      }

      let balanceMessage = ''
      let emailBalanceText = ''

      if (
        result.balance_field &&
        result.balance_before !== null &&
        result.balance_before !== undefined &&
        result.balance_after !== null &&
        result.balance_after !== undefined
      ) {
        const balanceLabel =
          result.balance_field === 'annual_leave_balance'
            ? 'Saldo cuti tahunan'
            : 'Saldo PHL'

        emailBalanceText =
          `${balanceLabel} ${result.balance_before} hari → ` +
          `${result.balance_after} hari`

        balanceMessage = ` ${emailBalanceText}.`
      }

      const baseMessage = result.already_cancelled
        ? 'Pengajuan sebelumnya sudah dibatalkan. Saldo tidak dikembalikan ulang.'
        : `Pengajuan berhasil dibatalkan, absensi disinkronkan ulang.${balanceMessage}`

      const notification = await sendHRLeaveCancellationEmail({
        item: cancelLeaveRecord,
        hrName: cancelledBy,
        note: reason,
        balanceText: emailBalanceText,
      })

      setSuccessMessage(
        appendNotificationText(baseMessage, notification)
      )

      setCancelLeaveRecord(null)
      setCancelLeaveReason('')
    } catch (error: any) {
      console.error('Atomic HR leave cancellation error:', error)

      setErrorMessage(
        error?.message ||
          'Pembatalan gagal. Status, saldo, dan data absensi tidak diubah.'
      )
    } finally {
      setProcessingId('')
      await fetchData({ preserveMessages: true })
    }
  }

  async function rejectLeaveRequest() {
    if (!rejectLeaveRecord) return

    setProcessingId(rejectLeaveRecord.id)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()
    const rejectedBy = appUser?.email || 'HR Administrator'
    const rejectNote = rejectLeaveReason || 'Ditolak oleh HR.'

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        hr_status: 'rejected',
        hr_approved_by: rejectedBy,
        hr_approved_at: now,
        hr_note: rejectNote,
        updated_at: now,
      })
      .eq('id', rejectLeaveRecord.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    const notification = await sendHRLeaveDecisionEmail({
      item: rejectLeaveRecord,
      decision: 'rejected',
      hrName: rejectedBy,
      note: rejectNote,
    })

    setSuccessMessage(
      appendNotificationText(
        'Pengajuan cuti/izin berhasil ditolak HR.',
        notification
      )
    )

    setRejectLeaveRecord(null)
    setRejectLeaveReason('')
    setProcessingId('')
    await fetchData({ preserveMessages: true })
  }

  function requestDeleteLeave(item: LeaveRequest) {
    const status = normalizeStatus(item.hr_status || item.status)

    if (status === 'approved') {
      setErrorMessage(
        'Pengajuan yang sudah disetujui tidak boleh langsung dihapus. Gunakan tombol Batalkan agar saldo dikembalikan dan absensi disinkronkan ulang.'
      )
      setSuccessMessage('')
      return
    }

    setDeleteTarget({
      id: item.id,
      kind: 'leave',
      title: 'Hapus Pengajuan Cuti/Izin',
      employeeName: item.full_name || 'Karyawan',
      description:
        'Data pengajuan cuti/izin ini akan dihapus permanen dari database. Gunakan hanya untuk membersihkan data dummy atau data testing.',
    })
  }

  function requestDeletePHL(record: PHLRecord) {
    const status = normalizeStatus(record.hr_status || record.status)
    const usedDays = Number(record.used_days || 0)

    if (
      status === 'approved' ||
      status === 'cancelled' ||
      status === 'canceled' ||
      usedDays > 0
    ) {
      setErrorMessage(
        record.source === 'employee_phl_claim'
          ? 'Klaim PHL approved/cancelled tidak boleh dihapus karena merupakan bagian dari ledger saldo dan audit reversal.'
          : 'Saldo PHL approved atau yang sudah pernah digunakan tidak boleh langsung dihapus karena dapat merusak perhitungan saldo karyawan.'
      )
      setSuccessMessage('')
      return
    }

    setDeleteTarget({
      id: record.id,
      kind: 'phl',
      title: 'Hapus Data PHL',
      employeeName: record.full_name || 'Karyawan',
      description:
        'Data PHL pending/rejected ini akan dihapus permanen. Gunakan hanya untuk membersihkan data dummy atau data testing.',
    })
  }

  async function confirmDeleteTarget() {
    if (!deleteTarget) return

    setProcessingId(deleteTarget.id)
    setErrorMessage('')
    setSuccessMessage('')

    const tableName = deleteTarget.kind === 'leave' ? 'leave_requests' : 'phl_records'

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    setSuccessMessage(
      deleteTarget.kind === 'leave'
        ? 'Data pengajuan cuti/izin berhasil dihapus.'
        : 'Data PHL berhasil dihapus.'
    )

    setProcessingId('')
    setSelectedLeaveRequest(null)
    setSelectedPHLRecord(null)
    setDeleteTarget(null)

    await fetchData({ preserveMessages: true })
  }

  return (
    <>
      <Topbar
        title="Cuti, Izin & PHL"
        description="Kelola pengajuan cuti, izin, job pending, klaim PHL, dan saldo PHL karyawan."
      />

      <section className="space-y-6 p-6">
        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle2 size={18} />
              Berhasil
            </div>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                HR Request Control
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Kelola Cuti, Izin & PHL
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Review pengajuan, cek job pending, approve klaim PHL, dan pantau saldo karyawan dalam satu halaman.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[660px]">
              <HeroMetric label="Pending Cuti/Izin" value={String(pendingLeaveRequests.length)} />
              <HeroMetric label="Pending Klaim PHL" value={String(pendingPHLClaims.length)} />
              <HeroMetric label="Approved Klaim" value={String(approvedPHLClaims.length)} />
              <HeroMetric label="Rejected Klaim" value={String(rejectedPHLClaims.length)} />
            </div>
          </div>
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === 'leave'}
                label="Pengajuan Cuti & Izin"
                icon={<CalendarDays size={17} />}
                onClick={() => setActiveTab('leave')}
              />

              <TabButton
                active={activeTab === 'phl-claim'}
                label="Approval Klaim PHL"
                icon={<Plane size={17} />}
                onClick={() => setActiveTab('phl-claim')}
              />

              <TabButton
                active={activeTab === 'phl-balance'}
                label="Saldo PHL"
                icon={<Landmark size={17} />}
                onClick={() => setActiveTab('phl-balance')}
              />

              <TabButton
                active={activeTab === 'phl-audit'}
                label="Audit PHL"
                icon={<ShieldCheck size={17} />}
                onClick={() => setActiveTab('phl-audit')}
              />

              <TabButton
                active={activeTab === 'history'}
                label="Riwayat"
                icon={<History size={17} />}
                onClick={() => setActiveTab('history')}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm md:w-[340px]">
                <Search size={18} className="shrink-0 text-[#86868b]" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Cari nama, unit, job pending..."
                  className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchData()}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat data cuti, izin, dan PHL...
            </div>
          )}

          {!loading && activeTab === 'leave' && (
            <LeaveRequestTab
              requests={filteredLeaveRequests}
              processingId={processingId}
              onApprove={approveLeaveRequest}
              onReject={(item) => {
                setRejectLeaveRecord(item)
                setRejectLeaveReason('')
              }}
              onCancel={(item) => {
                setCancelLeaveRecord(item)
                setCancelLeaveReason('')
              }}
              onDelete={requestDeleteLeave}
              onDetail={setSelectedLeaveRequest}
            />
          )}

          {!loading && activeTab === 'phl-claim' && (
            <PHLClaimApprovalTab
              claims={filteredPHLClaims}
              processingId={processingId}
              onApprove={approvePHLClaim}
              onReject={(record) => {
                setRejectPHLRecord(record)
                setRejectPHLReason('')
              }}
              onCancel={(record) => {
                setCancelPHLRecord(record)
                setCancelPHLReason('')
              }}
              onDelete={requestDeletePHL}
              onDetail={setSelectedPHLRecord}
            />
          )}

          {!loading && activeTab === 'phl-balance' && (
            <PHLBalanceTab
              summaries={filteredBalanceSummary}
              balances={filteredPHLBalances}
              onDelete={requestDeletePHL}
              onDetail={setSelectedPHLRecord}
            />
          )}

          {!loading && activeTab === 'phl-audit' && (
            <PHLReconciliationTab
              rows={filteredPHLReconciliationRows}
              legacyClaims={filteredLegacyPHLClaims}
              auditError={phlAuditError}
              processingId={processingId}
              onReviewEmployee={(item) => {
                setEmployeePHLReviewTarget(item)
                setEmployeePHLReviewNote(item.last_review_note || '')
              }}
              onReviewLegacy={(item) => {
                setLegacyPHLReviewTarget(item)
                setLegacyPHLReviewNote(item.legacy_review_note || '')
              }}
            />
          )}

          {!loading && activeTab === 'history' && (
            <HistoryTab
              leaveRequests={filteredLeaveRequests}
              phlRecords={filteredPHLClaims}
              onLeaveDetail={setSelectedLeaveRequest}
              onPHLDetail={setSelectedPHLRecord}
              onDeleteLeave={requestDeleteLeave}
              onDeletePHL={requestDeletePHL}
            />
          )}
        </div>

        {selectedLeaveRequest && (
          <LeaveDetailModal
            record={selectedLeaveRequest}
            onClose={() => setSelectedLeaveRequest(null)}
          />
        )}

        {selectedPHLRecord && (
          <PHLDetailModal
            record={selectedPHLRecord}
            onClose={() => setSelectedPHLRecord(null)}
          />
        )}

        {rejectPHLRecord && (
          <RejectPHLModal
            record={rejectPHLRecord}
            reason={rejectPHLReason}
            processing={processingId === rejectPHLRecord.id}
            onReasonChange={setRejectPHLReason}
            onClose={() => {
              setRejectPHLRecord(null)
              setRejectPHLReason('')
            }}
            onSubmit={rejectPHLClaim}
          />
        )}

        {cancelPHLRecord && (
          <CancelPHLModal
            record={cancelPHLRecord}
            reason={cancelPHLReason}
            processing={processingId === cancelPHLRecord.id}
            onReasonChange={setCancelPHLReason}
            onClose={() => {
              setCancelPHLRecord(null)
              setCancelPHLReason('')
            }}
            onSubmit={cancelApprovedPHLClaim}
          />
        )}

        {rejectLeaveRecord && (
          <RejectLeaveModal
            record={rejectLeaveRecord}
            reason={rejectLeaveReason}
            processing={processingId === rejectLeaveRecord.id}
            onReasonChange={setRejectLeaveReason}
            onClose={() => {
              setRejectLeaveRecord(null)
              setRejectLeaveReason('')
            }}
            onSubmit={rejectLeaveRequest}
          />
        )}

        {cancelLeaveRecord && (
          <CancelLeaveModal
            record={cancelLeaveRecord}
            reason={cancelLeaveReason}
            processing={processingId === cancelLeaveRecord.id}
            onReasonChange={setCancelLeaveReason}
            onClose={() => {
              setCancelLeaveRecord(null)
              setCancelLeaveReason('')
            }}
            onSubmit={cancelApprovedLeaveRequest}
          />
        )}

        {employeePHLReviewTarget && (
          <PHLEmployeeReviewModal
            record={employeePHLReviewTarget}
            note={employeePHLReviewNote}
            processing={
              processingId ===
              `phl-review-${employeePHLReviewTarget.employee_id}`
            }
            onNoteChange={setEmployeePHLReviewNote}
            onClose={() => {
              setEmployeePHLReviewTarget(null)
              setEmployeePHLReviewNote('')
            }}
            onSubmit={recordPHLEmployeeReview}
          />
        )}

        {legacyPHLReviewTarget && (
          <LegacyPHLReviewModal
            record={legacyPHLReviewTarget}
            note={legacyPHLReviewNote}
            processing={
              processingId ===
              `legacy-review-${legacyPHLReviewTarget.claim_record_id}`
            }
            onNoteChange={setLegacyPHLReviewNote}
            onClose={() => {
              setLegacyPHLReviewTarget(null)
              setLegacyPHLReviewNote('')
            }}
            onSubmit={markLegacyPHLClaimReviewed}
          />
        )}

        {deleteTarget && (
          <DeleteConfirmModal
            target={deleteTarget}
            processing={processingId === deleteTarget.id}
            onClose={() => setDeleteTarget(null)}
            onConfirm={confirmDeleteTarget}
          />
        )}
      </section>
    </>
  )
}

function LeaveRequestTab({
  requests,
  processingId,
  onApprove,
  onReject,
  onCancel,
  onDelete,
  onDetail,
}: {
  requests: LeaveRequest[]
  processingId: string
  onApprove: (item: LeaveRequest) => void
  onReject: (item: LeaveRequest) => void
  onCancel: (item: LeaveRequest) => void
  onDelete: (item: LeaveRequest) => void
  onDetail: (item: LeaveRequest) => void
}) {
  return (
    <div>
      <SectionIntro
        title="Pengajuan Cuti & Izin"
        description="Review pengajuan cuti, izin, sakit, tugas luar, dan job pending karyawan."
      />

      <DataTable
        emptyTitle="Belum ada pengajuan cuti/izin"
        emptyDescription="Pengajuan karyawan akan muncul di sini."
        minWidth="1450px"
        headers={[
          'Karyawan',
          'Jenis',
          'Tanggal',
          'Hari',
          'Job Pending',
          'Atasan',
          'HR',
          'Detail',
          'Action',
        ]}
      >
        {requests.map((item) => {
          const hrStatus = normalizeStatus(item.hr_status || item.status)
          const canProcess =
            hrStatus === 'pending' ||
            hrStatus === 'submitted' ||
            hrStatus === 'waiting_supervisor' ||
            hrStatus === 'waiting_hr'

          return (
            <tr key={item.id} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
              <td className="px-5 py-4">
                <EmployeeCell
                  name={item.full_name || '-'}
                  meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
                />
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">
                  {item.leave_type || item.request_type || '-'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[#6e6e73]">
                  {item.reason || '-'}
                </p>
              </td>

              <td className="px-5 py-4 text-sm text-[#1d1d1f]">
                {formatDisplayDate(item.start_date || '')} - {formatDisplayDate(item.end_date || '')}
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                {item.total_days || 0} hari
              </td>

              <td className="px-5 py-4">
                <JobPendingPreview
                  summary={item.job_pending_summary}
                  handoverName={item.handover_to_full_name}
                />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.supervisor_status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.hr_status || item.status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <button
                  type="button"
                  onClick={() => onDetail(item)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
                >
                  <FileText size={15} />
                  Detail
                </button>
              </td>

              <td className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {canProcess && (
                    <>
                      <SmallActionButton
                        label="Approve"
                        icon={<CheckCircle2 size={14} />}
                        tone="green"
                        disabled={processingId === item.id}
                        onClick={() => onApprove(item)}
                      />
                      <SmallActionButton
                        label="Reject"
                        icon={<XCircle size={14} />}
                        tone="red"
                        disabled={processingId === item.id}
                        onClick={() => onReject(item)}
                      />
                    </>
                  )}

                  {hrStatus === 'approved' && (
                    <SmallActionButton
                      label="Batalkan"
                      icon={<RotateCcw size={14} />}
                      tone="blue"
                      disabled={processingId === item.id}
                      onClick={() => onCancel(item)}
                    />
                  )}

                  {hrStatus !== 'approved' && (
                    <SmallActionButton
                      label="Hapus"
                      icon={<Trash2 size={14} />}
                      tone="red"
                      disabled={processingId === item.id}
                      onClick={() => onDelete(item)}
                    />
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </DataTable>
    </div>
  )
}

function PHLClaimApprovalTab({
  claims,
  processingId,
  onApprove,
  onReject,
  onCancel,
  onDelete,
  onDetail,
}: {
  claims: PHLRecord[]
  processingId: string
  onApprove: (record: PHLRecord) => void
  onReject: (record: PHLRecord) => void
  onCancel: (record: PHLRecord) => void
  onDelete: (record: PHLRecord) => void
  onDetail: (record: PHLRecord) => void
}) {
  const pending = claims.filter((item) => {
    const status = normalizeStatus(item.hr_status || item.status)

    return (
      status === 'pending' ||
      status === 'submitted' ||
      status === 'waiting_hr'
    )
  })

  const approved = claims.filter((item) => {
    return normalizeStatus(item.hr_status || item.status) === 'approved'
  })

  const cancelled = claims.filter((item) => {
    const status = normalizeStatus(item.hr_status || item.status)
    return status === 'cancelled' || status === 'canceled'
  })

  return (
    <div>
      <SectionIntro
        title="Approval Klaim PHL"
        description="Approval mencatat alokasi FIFO per saldo sumber. Klaim approved dapat dibatalkan secara atomik dan saldo dikembalikan ke sumber dengan masa berlaku asli."
      />

      <div className="grid gap-5 p-6 md:grid-cols-4">
        <MiniPanel title="Pending Klaim" value={`${pending.length}`} icon={<Clock3 size={20} />} />
        <MiniPanel title="Approved" value={`${approved.length}`} icon={<CheckCircle2 size={20} />} />
        <MiniPanel title="Dibatalkan" value={`${cancelled.length}`} icon={<RotateCcw size={20} />} />
        <MiniPanel title="Metode Saldo" value="FIFO Audit" icon={<ShieldCheck size={20} />} />
      </div>

      <DataTable
        emptyTitle="Belum ada klaim PHL"
        emptyDescription="Pengajuan klaim PHL karyawan akan muncul di sini."
        minWidth="1500px"
        headers={[
          'Karyawan',
          'Tanggal Klaim',
          'Hari',
          'Alasan',
          'Job Pending',
          'Atasan',
          'HR',
          'Detail',
          'Action',
        ]}
      >
        {claims.map((item) => {
          const status = normalizeStatus(item.hr_status || item.status)

          const canProcess =
            status === 'pending' ||
            status === 'submitted' ||
            status === 'waiting_hr'

          const canCancel = status === 'approved'
          const isCancelled = status === 'cancelled' || status === 'canceled'

          return (
            <tr key={item.id} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
              <td className="px-5 py-4">
                <EmployeeCell
                  name={item.full_name || '-'}
                  meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
                />
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                {formatDisplayDate(item.phl_date || '')}
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                {item.used_days || item.balance_days || 0} hari
              </td>

              <td className="px-5 py-4">
                <p className="line-clamp-2 max-w-[240px] text-sm leading-6 text-[#6e6e73]">
                  {item.reason || item.notes || '-'}
                </p>
              </td>

              <td className="px-5 py-4">
                <JobPendingPreview
                  summary={item.job_pending_summary}
                  handoverName={item.handover_to_full_name}
                />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.supervisor_status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={item.hr_status || item.status || 'pending'} />
              </td>

              <td className="px-5 py-4">
                <button
                  type="button"
                  onClick={() => onDetail(item)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
                >
                  <FileText size={15} />
                  Detail
                </button>
              </td>

              <td className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {canProcess && (
                    <>
                      <SmallActionButton
                        label="Approve"
                        icon={<CheckCircle2 size={14} />}
                        tone="green"
                        disabled={processingId === item.id}
                        onClick={() => onApprove(item)}
                      />
                      <SmallActionButton
                        label="Reject"
                        icon={<XCircle size={14} />}
                        tone="red"
                        disabled={processingId === item.id}
                        onClick={() => onReject(item)}
                      />
                    </>
                  )}

                  {canCancel && (
                    <SmallActionButton
                      label="Batalkan"
                      icon={<RotateCcw size={14} />}
                      tone="orange"
                      disabled={processingId === item.id}
                      onClick={() => onCancel(item)}
                    />
                  )}

                  {!canProcess && !canCancel && (
                    <span className="rounded-full bg-[#f5f5f7] px-3 py-2 text-[11px] font-bold text-[#86868b]">
                      {isCancelled ? 'Reversal selesai' : 'Proses selesai'}
                    </span>
                  )}

                  {canProcess ? (
                    <SmallActionButton
                      label="Hapus"
                      icon={<Trash2 size={14} />}
                      tone="red"
                      disabled={processingId === item.id}
                      onClick={() => onDelete(item)}
                    />
                  ) : (
                    <span className="rounded-full bg-[#f5f5f7] px-3 py-2 text-[11px] font-bold text-[#86868b]">
                      Audit terkunci
                    </span>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </DataTable>
    </div>
  )
}

function PHLBalanceTab({
  summaries,
  balances,
  onDelete,
  onDetail,
}: {
  summaries: PHLBalanceSummary[]
  balances: PHLRecord[]
  onDelete: (record: PHLRecord) => void
  onDetail: (record: PHLRecord) => void
}) {
  return (
    <div>
      <SectionIntro
        title="Saldo PHL"
        description="Ringkasan saldo PHL per karyawan dan detail saldo yang berasal dari PHL approved."
      />

      <div className="grid gap-4 p-6 xl:grid-cols-3">
        {summaries.map((item, index) => (
          <div
            key={item.employee_id || `${item.full_name}-${index}`}
            className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm"
          >
            <EmployeeCell
              name={item.full_name || '-'}
              meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
            />

            <div className="mt-5 grid grid-cols-3 gap-3">
              <BalanceBox label="Earned" value={item.total_earned_days || 0} tone="green" />
              <BalanceBox label="Used" value={item.total_used_days || 0} tone="orange" />
              <BalanceBox label="Available" value={item.total_available_days || 0} tone="purple" />
            </div>

            {Number(item.pending_claim_count || 0) > 0 && (
              <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-700">
                Ada {item.pending_claim_count} klaim PHL pending.
              </div>
            )}
          </div>
        ))}
      </div>

      <DataTable
        emptyTitle="Belum ada saldo PHL"
        emptyDescription="Saldo PHL akan muncul setelah PHL dari absensi disetujui."
        minWidth="1300px"
        headers={[
          'Karyawan',
          'Tanggal PHL',
          'Masa Berlaku',
          'Saldo',
          'Terpakai',
          'Sisa',
          'Status',
          'Detail',
          'Action',
        ]}
      >
        {balances.map((item) => (
          <tr key={item.id} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
            <td className="px-5 py-4">
              <EmployeeCell
                name={item.full_name || '-'}
                meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
              />
            </td>

            <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
              {formatDisplayDate(item.phl_date || '')}
            </td>

            <td className="px-5 py-4 text-sm text-[#1d1d1f]">
              {formatDisplayDate(item.valid_from || item.phl_date || '')} - {formatDisplayDate(item.expired_at || '')}
            </td>

            <NumberCell value={item.balance_days || 0} tone="green" />
            <NumberCell value={item.used_days || 0} tone="orange" />
            <NumberCell value={item.remaining_days || 0} tone="purple" />

            <td className="px-5 py-4">
              <StatusBadge status={item.status || 'approved'} />
            </td>

            <td className="px-5 py-4">
              <button
                type="button"
                onClick={() => onDetail(item)}
                className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#f7edfc] px-4 text-xs font-bold text-[#7b2cbf]"
              >
                <FileText size={15} />
                Detail
              </button>
            </td>

            <td className="px-5 py-4">
              {normalizeStatus(item.status) === 'approved' || Number(item.used_days || 0) > 0 ? (
                <span className="rounded-full bg-[#f5f5f7] px-3 py-2 text-[11px] font-bold text-[#86868b]">
                  Saldo terkunci
                </span>
              ) : (
                <SmallActionButton
                  label="Hapus"
                  icon={<Trash2 size={14} />}
                  tone="red"
                  disabled={false}
                  onClick={() => onDelete(item)}
                />
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  )
}


function PHLReconciliationTab({
  rows,
  legacyClaims,
  auditError,
  processingId,
  onReviewEmployee,
  onReviewLegacy,
}: {
  rows: PHLReconciliationRow[]
  legacyClaims: LegacyPHLClaimReview[]
  auditError: string
  processingId: string
  onReviewEmployee: (record: PHLReconciliationRow) => void
  onReviewLegacy: (record: LegacyPHLClaimReview) => void
}) {
  const healthyCount = rows.filter(
    (item) => normalizeStatus(item.reconciliation_status) === 'healthy'
  ).length

  const manualDifferenceCount = rows.filter(
    (item) =>
      normalizeStatus(item.reconciliation_status) === 'manual_difference'
  ).length

  const needsReviewCount = rows.filter(
    (item) =>
      normalizeStatus(item.reconciliation_status) === 'needs_review'
  ).length

  const unreviewedLegacyCount = legacyClaims.filter(
    (item) => normalizeStatus(item.legacy_review_status) !== 'reviewed'
  ).length

  return (
    <div>
      <SectionIntro
        title="Audit & Rekonsiliasi PHL"
        description="Bandingkan ledger aktif, saldo manual employee, saldo kedaluwarsa, dan tracking klaim legacy. Semua tindakan pada tab ini hanya mencatat review dan tidak mengubah saldo."
      />

      {auditError && (
        <div className="mx-6 mt-6 rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <AlertTriangle size={17} />
            Modul audit belum tersedia
          </div>
          {auditError}
        </div>
      )}

      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        <MiniPanel
          title="Data Sehat"
          value={String(healthyCount)}
          icon={<CheckCircle2 size={20} />}
        />
        <MiniPanel
          title="Selisih Saldo Manual"
          value={String(manualDifferenceCount)}
          icon={<Landmark size={20} />}
        />
        <MiniPanel
          title="Perlu Review"
          value={String(needsReviewCount)}
          icon={<AlertTriangle size={20} />}
        />
        <MiniPanel
          title="Legacy Belum Direview"
          value={String(unreviewedLegacyCount)}
          icon={<History size={20} />}
        />
      </div>

      <div className="border-t border-black/5">
        <SectionIntro
          title="Rekonsiliasi per Karyawan"
          description="Saldo manual hanya dibandingkan sebagai indikator. Sistem tidak menyamakan atau mengubah saldo secara otomatis."
        />

        <DataTable
          emptyTitle="Belum ada data rekonsiliasi"
          emptyDescription="Jalankan SQL rekonsiliasi PHL lalu tekan Refresh."
          minWidth="1700px"
          headers={[
            'Karyawan',
            'Ledger Aktif',
            'Saldo Manual',
            'Selisih',
            'Saldo Expired',
            'Earned / Used',
            'Klaim',
            'Tracking Legacy',
            'Status',
            'Review Terakhir',
            'Action',
          ]}
        >
          {rows.map((item) => {
            const status = normalizeStatus(item.reconciliation_status)
            const legacyCount = Number(item.legacy_untracked_claim_count || 0)
            const reviewedCount = Number(item.reviewed_legacy_claim_count || 0)
            const reviewKey = `phl-review-${item.employee_id}`

            return (
              <tr
                key={item.employee_id}
                className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70"
              >
                <td className="px-5 py-4">
                  <EmployeeCell
                    name={item.full_name || '-'}
                    meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
                  />
                </td>

                <NumberCell
                  value={item.active_ledger_balance || 0}
                  tone="green"
                />

                <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                  {item.manual_phl_balance === null ||
                  item.manual_phl_balance === undefined
                    ? '-'
                    : `${formatPHLNumber(item.manual_phl_balance)} hari`}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={[
                      'inline-flex rounded-full px-3 py-1.5 text-xs font-bold',
                      Math.abs(Number(item.manual_ledger_difference || 0)) > 0.0001
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-green-50 text-green-700',
                    ].join(' ')}
                  >
                    {item.manual_ledger_difference === null ||
                    item.manual_ledger_difference === undefined
                      ? '-'
                      : `${formatPHLNumber(item.manual_ledger_difference)} hari`}
                  </span>
                </td>

                <NumberCell
                  value={item.expired_remaining_balance || 0}
                  tone="orange"
                />

                <td className="px-5 py-4 text-sm leading-6 text-[#6e6e73]">
                  <div className="font-semibold text-[#1d1d1f]">
                    {formatPHLNumber(item.total_earned_days)} earned
                  </div>
                  <div>
                    {formatPHLNumber(item.total_used_days)} used
                  </div>
                </td>

                <td className="px-5 py-4 text-sm leading-6 text-[#6e6e73]">
                  <div className="font-semibold text-[#1d1d1f]">
                    {Number(item.approved_claim_count || 0)} approved
                  </div>
                  <div>
                    {Number(item.pending_claim_count || 0)} pending
                  </div>
                </td>

                <td className="px-5 py-4 text-sm leading-6 text-[#6e6e73]">
                  <div className="font-semibold text-[#1d1d1f]">
                    {legacyCount} gap
                  </div>
                  <div>
                    {reviewedCount} direview
                  </div>
                </td>

                <td className="px-5 py-4">
                  <PHLReconciliationBadge status={status} />
                </td>

                <td className="px-5 py-4 text-sm leading-6 text-[#6e6e73]">
                  {item.last_reviewed_at ? (
                    <>
                      <div className="font-semibold text-[#1d1d1f]">
                        {new Date(item.last_reviewed_at).toLocaleString('id-ID')}
                      </div>
                      <div>{item.last_reviewed_by || '-'}</div>
                      {item.last_review_note && (
                        <div className="mt-1 line-clamp-2 max-w-[260px]">
                          {item.last_review_note}
                        </div>
                      )}
                    </>
                  ) : (
                    '-'
                  )}
                </td>

                <td className="px-5 py-4">
                  <SmallActionButton
                    label={item.last_reviewed_at ? 'Review Ulang' : 'Catat Review'}
                    icon={<FileText size={14} />}
                    tone="blue"
                    disabled={processingId === reviewKey}
                    onClick={() => onReviewEmployee(item)}
                  />
                </td>
              </tr>
            )
          })}
        </DataTable>
      </div>

      <div className="border-t border-black/5">
        <SectionIntro
          title="Klaim Legacy Belum Terlacak Penuh"
          description="Daftar ini berisi klaim approved yang jumlah pemotongannya tidak dapat dibuktikan penuh dari alokasi FIFO dan audit saldo manual. Review tidak membuat alokasi palsu."
        />

        <DataTable
          emptyTitle="Tidak ada klaim legacy bermasalah"
          emptyDescription="Seluruh klaim approved sudah memiliki tracking saldo yang lengkap."
          minWidth="1500px"
          headers={[
            'Karyawan',
            'Tanggal',
            'Klaim',
            'Alokasi FIFO',
            'Saldo Manual',
            'Gap Tracking',
            'Approval HR',
            'Status Review',
            'Catatan',
            'Action',
          ]}
        >
          {legacyClaims.map((item) => {
            const reviewed =
              normalizeStatus(item.legacy_review_status) === 'reviewed'
            const reviewKey = `legacy-review-${item.claim_record_id}`

            return (
              <tr
                key={item.claim_record_id}
                className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70"
              >
                <td className="px-5 py-4">
                  <EmployeeCell
                    name={item.full_name || '-'}
                    meta={`${item.employee_number || '-'} · ${item.department || '-'} · ${item.position || '-'}`}
                  />
                </td>

                <td className="px-5 py-4 text-sm font-semibold text-[#1d1d1f]">
                  {formatDisplayDate(item.phl_date || '')}
                </td>

                <NumberCell value={item.claim_days || 0} tone="purple" />
                <NumberCell value={item.allocated_days || 0} tone="green" />
                <NumberCell
                  value={item.override_consumed_days || 0}
                  tone="blue"
                />
                <NumberCell value={item.tracking_gap_days || 0} tone="orange" />

                <td className="px-5 py-4 text-sm leading-6 text-[#6e6e73]">
                  <div className="font-semibold text-[#1d1d1f]">
                    {item.hr_approved_by || '-'}
                  </div>
                  <div>
                    {item.hr_approved_at
                      ? new Date(item.hr_approved_at).toLocaleString('id-ID')
                      : '-'}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={[
                      'inline-flex rounded-full px-3 py-1.5 text-xs font-bold',
                      reviewed
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-orange-50 text-orange-700',
                    ].join(' ')}
                  >
                    {reviewed ? 'Sudah Direview' : 'Belum Direview'}
                  </span>
                </td>

                <td className="px-5 py-4 text-sm leading-6 text-[#6e6e73]">
                  {item.legacy_review_note || '-'}
                </td>

                <td className="px-5 py-4">
                  <SmallActionButton
                    label={reviewed ? 'Review Ulang' : 'Tandai Review'}
                    icon={<ShieldCheck size={14} />}
                    tone="orange"
                    disabled={processingId === reviewKey}
                    onClick={() => onReviewLegacy(item)}
                  />
                </td>
              </tr>
            )
          })}
        </DataTable>
      </div>
    </div>
  )
}

function PHLReconciliationBadge({ status }: { status: string }) {
  const config = {
    healthy: {
      label: 'Sehat',
      className: 'bg-green-50 text-green-700',
    },
    manual_difference: {
      label: 'Cek Saldo Manual',
      className: 'bg-blue-50 text-blue-700',
    },
    needs_review: {
      label: 'Perlu Review',
      className: 'bg-orange-50 text-orange-700',
    },
  }[status] || {
    label: status || 'Belum Terdata',
    className: 'bg-[#f5f5f7] text-[#6e6e73]',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function HistoryTab({
  leaveRequests,
  phlRecords,
  onLeaveDetail,
  onPHLDetail,
  onDeleteLeave,
  onDeletePHL,
}: {
  leaveRequests: LeaveRequest[]
  phlRecords: PHLRecord[]
  onLeaveDetail: (record: LeaveRequest) => void
  onPHLDetail: (record: PHLRecord) => void
  onDeleteLeave: (record: LeaveRequest) => void
  onDeletePHL: (record: PHLRecord) => void
}) {
  return (
    <div>
      <SectionIntro
        title="Riwayat"
        description="Riwayat pengajuan cuti/izin dan klaim PHL."
      />

      <DataTable
        emptyTitle="Belum ada riwayat"
        emptyDescription="Riwayat akan muncul setelah ada pengajuan."
        minWidth="1250px"
        headers={[
          'Karyawan',
          'Jenis',
          'Tanggal',
          'Hari',
          'Status',
          'Detail',
          'Action',
        ]}
      >
        {leaveRequests.map((item) => (
          <tr key={`leave-${item.id}`} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
            <td className="px-5 py-4">
              <EmployeeCell
                name={item.full_name || '-'}
                meta={`${item.employee_number || '-'} · ${item.department || '-'}`}
              />
            </td>

            <td className="px-5 py-4 font-semibold text-[#1d1d1f]">
              {item.leave_type || item.request_type || 'Cuti/Izin'}
            </td>

            <td className="px-5 py-4 text-sm text-[#1d1d1f]">
              {formatDisplayDate(item.start_date || '')} - {formatDisplayDate(item.end_date || '')}
            </td>

            <td className="px-5 py-4 text-sm font-semibold">
              {item.total_days || 0} hari
            </td>

            <td className="px-5 py-4">
              <StatusBadge status={item.hr_status || item.status || item.supervisor_status || 'pending'} />
            </td>

            <td className="px-5 py-4">
              <button
                type="button"
                onClick={() => onLeaveDetail(item)}
                className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
              >
                <FileText size={15} />
                Detail
              </button>
            </td>

            <td className="px-5 py-4">
              <SmallActionButton
                label="Hapus"
                icon={<Trash2 size={14} />}
                tone="red"
                disabled={false}
                onClick={() => onDeleteLeave(item)}
              />
            </td>
          </tr>
        ))}

        {phlRecords.map((item) => (
          <tr key={`phl-${item.id}`} className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70">
            <td className="px-5 py-4">
              <EmployeeCell
                name={item.full_name || '-'}
                meta={`${item.employee_number || '-'} · ${item.department || '-'}`}
              />
            </td>

            <td className="px-5 py-4 font-semibold text-[#1d1d1f]">
              Klaim PHL
            </td>

            <td className="px-5 py-4 text-sm text-[#1d1d1f]">
              {formatDisplayDate(item.phl_date || '')}
            </td>

            <td className="px-5 py-4 text-sm font-semibold">
              {item.used_days || 0} hari
            </td>

            <td className="px-5 py-4">
              <StatusBadge status={item.status || 'pending'} />
            </td>

            <td className="px-5 py-4">
              <button
                type="button"
                onClick={() => onPHLDetail(item)}
                className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
              >
                <FileText size={15} />
                Detail
              </button>
            </td>

            <td className="px-5 py-4">
              {['approved', 'cancelled', 'canceled'].includes(
                normalizeStatus(item.hr_status || item.status)
              ) || Number(item.used_days || 0) > 0 ? (
                <span className="rounded-full bg-[#f5f5f7] px-3 py-2 text-[11px] font-bold text-[#86868b]">
                  Audit tersimpan
                </span>
              ) : (
                <SmallActionButton
                  label="Hapus"
                  icon={<Trash2 size={14} />}
                  tone="red"
                  disabled={false}
                  onClick={() => onDeletePHL(item)}
                />
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  )
}

function LeaveDetailModal({
  record,
  onClose,
}: {
  record: LeaveRequest
  onClose: () => void
}) {
  return (
    <ModalShell
      title="Detail Pengajuan Cuti/Izin"
      description={record.full_name || '-'}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoBox label="Nama" value={record.full_name || '-'} />
        <InfoBox label="NIP" value={record.employee_number || '-'} />
        <InfoBox label="Unit" value={record.department || '-'} />
        <InfoBox label="Jabatan" value={record.position || '-'} />
        <InfoBox label="Jenis" value={record.leave_type || record.request_type || '-'} />
        <InfoBox label="Tanggal" value={`${formatDisplayDate(record.start_date || '')} - ${formatDisplayDate(record.end_date || '')}`} />
        <InfoBox label="Total Hari" value={`${record.total_days || 0} hari`} />
        <InfoBox label="Status Atasan" value={formatStatus(normalizeStatus(record.supervisor_status))} />
        <InfoBox label="Status HR" value={formatStatus(normalizeStatus(record.hr_status || record.status))} />
        <InfoBox label="Diajukan Oleh" value={record.submitted_by || '-'} />
        {normalizeStatus(record.hr_status || record.status) === 'cancelled' && (
          <>
            <InfoBox label="Dibatalkan Oleh" value={record.hr_cancelled_by || '-'} />
            <InfoBox
              label="Waktu Pembatalan"
              value={record.hr_cancelled_at
                ? new Date(record.hr_cancelled_at).toLocaleString('id-ID')
                : '-'}
            />
          </>
        )}
      </div>

      <ContentBox
        title="Alasan Pengajuan"
        content={record.reason || '-'}
      />

      {normalizeStatus(record.hr_status || record.status) === 'cancelled' && (
        <ContentBox
          title="Alasan Pembatalan HR"
          content={record.hr_cancel_note || record.hr_note || '-'}
        />
      )}

      <HandoverDetailBox
        summary={record.job_pending_summary}
        detail={record.job_pending_detail}
        handoverName={record.handover_to_full_name}
        handoverMeta={`${record.handover_to_employee_number || '-'} · ${record.handover_to_department || '-'} · ${record.handover_to_position || '-'}`}
        handoverNote={record.handover_note}
        emergencyContact={record.emergency_contact_during_leave}
      />

      {(record.proof_url || record.proof_file_url) && (
        <a
          href={record.proof_url || record.proof_file_url || '#'}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white"
        >
          <FileText size={17} />
          Buka Dokumen Bukti
        </a>
      )}
    </ModalShell>
  )
}

function PHLDetailModal({
  record,
  onClose,
}: {
  record: PHLRecord
  onClose: () => void
}) {
  return (
    <ModalShell
      title={record.source === 'employee_phl_claim' ? 'Detail Klaim PHL' : 'Detail Saldo PHL'}
      description={record.full_name || '-'}
      onClose={onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoBox label="Nama" value={record.full_name || '-'} />
        <InfoBox label="NIP" value={record.employee_number || '-'} />
        <InfoBox label="Unit" value={record.department || '-'} />
        <InfoBox label="Jabatan" value={record.position || '-'} />
        <InfoBox label="Tanggal" value={formatDisplayDate(record.phl_date || record.valid_from || '')} />
        <InfoBox label="Expired" value={formatDisplayDate(record.expired_at || '')} />
        <InfoBox label="Saldo" value={`${record.balance_days || 0} hari`} />
        <InfoBox label="Terpakai" value={`${record.used_days || 0} hari`} />
        <InfoBox label="Sisa" value={`${record.remaining_days || 0} hari`} />
        <InfoBox label="Status Atasan" value={formatStatus(normalizeStatus(record.supervisor_status))} />
        <InfoBox label="Status HR" value={formatStatus(normalizeStatus(record.hr_status || record.status))} />
        {(normalizeStatus(record.hr_status || record.status) === 'cancelled' ||
          normalizeStatus(record.hr_status || record.status) === 'canceled') && (
          <>
            <InfoBox label="Dibatalkan Oleh" value={record.hr_cancelled_by || '-'} />
            <InfoBox
              label="Waktu Pembatalan"
              value={record.hr_cancelled_at
                ? new Date(record.hr_cancelled_at).toLocaleString('id-ID')
                : '-'}
            />
          </>
        )}
      </div>

      <ContentBox
        title={record.source === 'employee_phl_claim' ? 'Alasan Klaim PHL' : 'Alasan / Catatan'}
        content={record.reason || record.notes || '-'}
      />

      {(normalizeStatus(record.hr_status || record.status) === 'cancelled' ||
        normalizeStatus(record.hr_status || record.status) === 'canceled') && (
        <ContentBox
          title="Alasan Pembatalan HR"
          content={record.hr_cancel_note || record.hr_note || '-'}
        />
      )}

      {record.source === 'employee_phl_claim' && (
        <HandoverDetailBox
          summary={record.job_pending_summary}
          detail={record.job_pending_detail}
          handoverName={record.handover_to_full_name}
          handoverMeta={`${record.handover_to_employee_number || '-'} · ${record.handover_to_department || '-'} · ${record.handover_to_position || '-'}`}
          handoverNote={record.handover_note}
          emergencyContact={record.emergency_contact_during_leave}
        />
      )}

      {record.proof_file_url && (
        <a
          href={record.proof_file_url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white"
        >
          <FileText size={17} />
          Buka Dokumen
        </a>
      )}
    </ModalShell>
  )
}

function DeleteConfirmModal({
  target,
  processing,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget
  processing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="relative overflow-hidden bg-[#1d1d1f] p-6 text-white">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-red-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#007aff]/20 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-300/20">
              <Trash2 size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                Konfirmasi Penghapusan
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {target.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/62">
                {target.employeeName}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-[24px] border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {target.description}
          </div>

          <div className="rounded-[24px] border border-black/5 bg-[#f5f5f7]/80 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#86868b]">
              Catatan
            </p>

            <p className="mt-2 text-sm leading-6 text-[#1d1d1f]">
              Aksi ini tidak menggunakan pop-up browser, sehingga tampilan tetap profesional saat aplikasi sudah di-deploy.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-black/5 bg-white px-5 text-sm font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={processing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Trash2 size={17} />
              )}
              {processing ? 'Menghapus...' : 'Ya, Hapus Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RejectPHLModal({
  record,
  reason,
  processing,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  record: PHLRecord
  reason: string
  processing: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Reject Klaim PHL"
      description={`Tolak klaim PHL ${record.full_name || '-'}`}
      onClose={onClose}
    >
      <label className="block">
        <span className="harmony-label">Alasan Reject</span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Tuliskan alasan penolakan klaim PHL..."
        />
      </label>

      <RejectModalFooter
        processing={processing}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel="Reject Klaim"
      />
    </ModalShell>
  )
}

function RejectLeaveModal({
  record,
  reason,
  processing,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  record: LeaveRequest
  reason: string
  processing: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Reject Cuti/Izin"
      description={`Tolak pengajuan ${record.full_name || '-'}`}
      onClose={onClose}
    >
      <label className="block">
        <span className="harmony-label">Alasan Reject</span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Tuliskan alasan penolakan cuti/izin..."
        />
      </label>

      <RejectModalFooter
        processing={processing}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel="Reject Pengajuan"
      />
    </ModalShell>
  )
}



function PHLEmployeeReviewModal({
  record,
  note,
  processing,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  record: PHLReconciliationRow
  note: string
  processing: boolean
  onNoteChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Catat Review Rekonsiliasi PHL"
      description={`${record.full_name || '-'} · ${record.employee_number || '-'}`}
      onClose={onClose}
    >
      <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        Tindakan ini hanya mencatat hasil review HR. Saldo manual dan ledger PHL tidak akan diubah.
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <InfoBox
          label="Ledger Aktif"
          value={`${formatPHLNumber(record.active_ledger_balance)} hari`}
        />
        <InfoBox
          label="Saldo Manual"
          value={
            record.manual_phl_balance === null ||
            record.manual_phl_balance === undefined
              ? '-'
              : `${formatPHLNumber(record.manual_phl_balance)} hari`
          }
        />
        <InfoBox
          label="Tracking Legacy"
          value={`${Number(record.legacy_untracked_claim_count || 0)} klaim`}
        />
      </div>

      <label className="mt-5 block">
        <span className="harmony-label">Catatan Review HR</span>
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Contoh: Saldo manual sudah dibandingkan dengan ledger dan akan ditindaklanjuti melalui koreksi terpisah."
        />
      </label>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="harmony-button-secondary"
        >
          Kembali
        </button>

        <button
          type="button"
          disabled={processing || note.trim().length < 5}
          onClick={onSubmit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-5 text-sm font-bold text-white transition hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <ShieldCheck size={17} />
          )}
          {processing ? 'Menyimpan Review...' : 'Simpan Review'}
        </button>
      </div>
    </ModalShell>
  )
}

function LegacyPHLReviewModal({
  record,
  note,
  processing,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  record: LegacyPHLClaimReview
  note: string
  processing: boolean
  onNoteChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Review Klaim Legacy PHL"
      description={`${record.full_name || '-'} · ${formatDisplayDate(record.phl_date || '')}`}
      onClose={onClose}
    >
      <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
        Klaim ini tidak memiliki tracking pemotongan saldo yang lengkap. Menandai review tidak membuat alokasi FIFO baru dan tidak membuka reversal otomatis.
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <InfoBox
          label="Jumlah Klaim"
          value={`${formatPHLNumber(record.claim_days)} hari`}
        />
        <InfoBox
          label="Alokasi FIFO"
          value={`${formatPHLNumber(record.allocated_days)} hari`}
        />
        <InfoBox
          label="Saldo Manual"
          value={`${formatPHLNumber(record.override_consumed_days)} hari`}
        />
        <InfoBox
          label="Gap Tracking"
          value={`${formatPHLNumber(record.tracking_gap_days)} hari`}
        />
      </div>

      <label className="mt-5 block">
        <span className="harmony-label">Catatan Review Legacy</span>
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Contoh: Klaim lama diverifikasi berdasarkan dokumen HR dan saldo akan dikoreksi manual apabila diperlukan."
        />
      </label>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="harmony-button-secondary"
        >
          Kembali
        </button>

        <button
          type="button"
          disabled={processing || note.trim().length < 5}
          onClick={onSubmit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <History size={17} />
          )}
          {processing ? 'Menyimpan Review...' : 'Tandai Sudah Direview'}
        </button>
      </div>
    </ModalShell>
  )
}

function CancelPHLModal({
  record,
  reason,
  processing,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  record: PHLRecord
  reason: string
  processing: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Batalkan Klaim PHL Approved"
      description={`${record.full_name || '-'} · ${formatDisplayDate(record.phl_date || '')}`}
      onClose={onClose}
    >
      <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
        Sistem akan mengembalikan saldo ke record PHL sumber yang dahulu dipotong saat approval. Tanggal kedaluwarsa saldo sumber tidak akan diperpanjang.
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <InfoBox
          label="Tanggal Klaim"
          value={formatDisplayDate(record.phl_date || '')}
        />
        <InfoBox
          label="Jumlah Klaim"
          value={`${record.used_days || record.balance_days || 0} hari`}
        />
        <InfoBox
          label="Status Saat Ini"
          value={formatStatus(normalizeStatus(record.hr_status || record.status))}
        />
      </div>

      <label className="mt-5 block">
        <span className="harmony-label">Alasan Pembatalan</span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Contoh: Klaim PHL dibatalkan karena perubahan jadwal penggunaan PHL."
        />
      </label>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="harmony-button-secondary"
        >
          Kembali
        </button>

        <button
          type="button"
          disabled={processing || reason.trim().length < 5}
          onClick={onSubmit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <RotateCcw size={17} />
          )}
          {processing ? 'Mengembalikan Saldo...' : 'Batalkan & Reversal Saldo'}
        </button>
      </div>
    </ModalShell>
  )
}

function CancelLeaveModal({
  record,
  reason,
  processing,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  record: LeaveRequest
  reason: string
  processing: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalShell
      title="Batalkan Pengajuan Approved"
      description={`${record.full_name || '-'} · ${getRequestLabel(record)}`}
      onClose={onClose}
    >
      <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
        Pembatalan akan mengubah status menjadi dibatalkan, mengembalikan saldo manual yang sebelumnya dipotong, dan menyinkronkan ulang data absensi. Proses ini tercatat pada audit log.
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <InfoBox
          label="Periode"
          value={getRequestPeriodText(record.start_date, record.end_date)}
        />
        <InfoBox
          label="Total Hari"
          value={`${record.total_days || 0} hari`}
        />
        <InfoBox
          label="Status Saat Ini"
          value={formatStatus(normalizeStatus(record.hr_status || record.status))}
        />
      </div>

      <label className="mt-5 block">
        <span className="harmony-label">Alasan Pembatalan</span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="harmony-textarea"
          placeholder="Contoh: Pengajuan dibatalkan karena perubahan jadwal kerja karyawan."
        />
      </label>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="harmony-button-secondary"
        >
          Kembali
        </button>

        <button
          type="button"
          disabled={processing || reason.trim().length < 5}
          onClick={onSubmit}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <RotateCcw size={17} />
          )}
          {processing ? 'Membatalkan...' : 'Batalkan & Kembalikan Saldo'}
        </button>
      </div>
    </ModalShell>
  )
}

function RejectModalFooter({
  processing,
  onClose,
  onSubmit,
  submitLabel,
}: {
  processing: boolean
  onClose: () => void
  onSubmit: () => void
  submitLabel: string
}) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-black/5 pt-5">
      <button
        type="button"
        onClick={onClose}
        className="harmony-button-secondary"
      >
        Batal
      </button>

      <button
        type="button"
        disabled={processing}
        onClick={onSubmit}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <XCircle size={17} />
        {processing ? 'Memproses...' : submitLabel}
      </button>
    </div>
  )
}

function HandoverDetailBox({
  summary,
  detail,
  handoverName,
  handoverMeta,
  handoverNote,
  emergencyContact,
}: {
  summary: string | null | undefined
  detail: string | null | undefined
  handoverName: string | null | undefined
  handoverMeta: string
  handoverNote: string | null | undefined
  emergencyContact: string | null | undefined
}) {
  return (
    <div className="mt-5 rounded-[28px] border border-black/5 bg-[#f5f5f7]/80 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
          <BriefcaseBusiness size={18} />
        </div>

        <div>
          <h3 className="text-base font-semibold text-[#1d1d1f]">
            Job Pending / Serah Terima Pekerjaan
          </h3>
          <p className="text-xs leading-5 text-[#6e6e73]">
            Informasi pekerjaan yang perlu diteruskan selama karyawan tidak hadir.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <InfoBox
          label="Ringkasan Job Pending"
          value={summary || '-'}
        />

        <div className="rounded-[20px] border border-black/5 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
            Detail Job Pending
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#1d1d1f]">
            {detail || '-'}
          </p>
        </div>

        <div className="rounded-[20px] border border-black/5 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
            Ditujukan Kepada / Pengganti Sementara
          </p>

          <p className="mt-2 text-sm font-semibold text-[#1d1d1f]">
            {handoverName || '-'}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
            {handoverMeta}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoBox
            label="Catatan Handover"
            value={handoverNote || '-'}
          />

          <InfoBox
            label="Kontak Darurat"
            value={emergencyContact || '-'}
          />
        </div>
      </div>
    </div>
  )
}

function JobPendingPreview({
  summary,
  handoverName,
}: {
  summary: string | null | undefined
  handoverName: string | null | undefined
}) {
  if (!summary && !handoverName) {
    return (
      <span className="text-xs font-semibold text-[#86868b]">
        -
      </span>
    )
  }

  return (
    <div className="max-w-[240px] rounded-2xl bg-[#f5f5f7] px-3 py-2">
      <p className="line-clamp-2 text-xs font-semibold leading-5 text-[#1d1d1f]">
        {summary || '-'}
      </p>

      <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-[#6e6e73]">
        Ke: {handoverName || '-'}
      </p>
    </div>
  )
}

function ContentBox({
  title,
  content,
}: {
  title: string
  content: string
}) {
  return (
    <div className="mt-5 rounded-[24px] border border-black/5 bg-[#f5f5f7]/70 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#1d1d1f]">
        {content}
      </p>
    </div>
  )
}

function SectionIntro({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="border-b border-black/5 p-6">
      <h3 className="text-lg font-semibold text-[#1d1d1f]">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}

function DataTable({
  headers,
  children,
  emptyTitle,
  emptyDescription,
  minWidth,
}: {
  headers: string[]
  children: ReactNode
  emptyTitle: string
  emptyDescription: string
  minWidth: string
}) {
  const hasRows = Array.isArray(children)
    ? children.length > 0
    : Boolean(children)

  if (!hasRows) {
    return (
      <div className="p-6">
        <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
            <FileText size={24} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
            {emptyTitle}
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            {emptyDescription}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ minWidth }}
      >
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
            {headers.map((header) => (
              <th key={header} className="px-5 py-4 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  )
}

function ModalShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition',
        active
          ? 'bg-[#1d1d1f] text-white shadow-sm'
          : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-white hover:text-[#1d1d1f]',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-white">
        {value}
      </p>
    </div>
  )
}

function MiniPanel({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#6e6e73]">
            {title}
          </p>

          <h4 className="mt-2 text-xl font-semibold text-[#1d1d1f]">
            {value}
          </h4>
        </div>

        <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
          {icon}
        </div>
      </div>
    </div>
  )
}

function EmployeeCell({
  name,
  meta,
}: {
  name: string
  meta: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#007aff]">
        <UserRound size={18} />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-[#1d1d1f]">
          {name}
        </p>

        <p className="mt-1 line-clamp-1 text-xs text-[#6e6e73]">
          {meta}
        </p>
      </div>
    </div>
  )
}

function SmallActionButton({
  label,
  icon,
  tone,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  tone: 'green' | 'red' | 'blue' | 'orange'
  disabled: boolean
  onClick: () => void
}) {
  const className = {
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
    blue: 'bg-[#e8f2ff] text-[#0059b8] hover:bg-blue-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  }[tone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-55',
        className,
      ].join(' ')}
    >
      {icon}
      {disabled ? '...' : label}
    </button>
  )
}

function BalanceBox({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'green' | 'orange' | 'purple' | 'blue'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
  }[tone]

  return (
    <div className={`rounded-2xl p-3 text-center ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">
        {value}
      </p>
    </div>
  )
}

function NumberCell({
  value,
  tone,
}: {
  value: number
  tone: 'green' | 'orange' | 'purple' | 'blue'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
  }[tone]

  return (
    <td className="px-5 py-4">
      <span className={`inline-flex min-w-8 justify-center rounded-xl px-3 py-1 text-xs font-bold ${className}`}>
        {value}
      </span>
    </td>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[20px] border border-black/5 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const normalized = normalizeStatus(status)

  const className =
    normalized === 'approved' || normalized === 'finalized'
      ? 'bg-green-50 text-green-700'
      : normalized === 'rejected' ||
          normalized === 'rejected_by_supervisor' ||
          normalized === 'cancelled' ||
          normalized === 'canceled'
        ? 'bg-red-50 text-red-700'
        : normalized === 'pending' ||
            normalized === 'submitted' ||
            normalized === 'waiting_supervisor' ||
            normalized === 'waiting_hr'
          ? 'bg-orange-50 text-orange-700'
          : 'bg-[#f5f5f7] text-[#6e6e73]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatStatus(normalized)}
    </span>
  )
}

function formatPHLNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0)

  if (!Number.isFinite(numberValue)) return '0'

  return numberValue.toLocaleString('id-ID', {
    minimumFractionDigits: Number.isInteger(numberValue) ? 0 : 1,
    maximumFractionDigits: 2,
  })
}

function normalizeStatus(value: string | null | undefined) {
  const status = String(value || '').trim().toLowerCase()

  if (!status) return 'pending'

  return status
}

function formatStatus(value: string) {
  if (value === 'pending') return 'Menunggu'
  if (value === 'submitted') return 'Diajukan'
  if (value === 'waiting_supervisor') return 'Menunggu Atasan'
  if (value === 'waiting_hr') return 'Menunggu HR'
  if (value === 'approved') return 'Disetujui'
  if (value === 'rejected') return 'Ditolak'
  if (value === 'cancelled' || value === 'canceled') return 'Dibatalkan'
  if (value === 'rejected_by_supervisor') return 'Ditolak Atasan'
  if (value === 'finalized') return 'Final'
  if (value === 'draft') return 'Draft'

  return value
}

function formatDisplayDate(value: string) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}