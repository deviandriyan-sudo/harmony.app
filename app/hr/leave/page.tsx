'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
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
  WalletCards,
  X,
  XCircle,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { sendHarmonyEmail } from '@/lib/notifications'

type ActiveTab =
  | 'leave'
  | 'leave-balance'
  | 'phl-claim'
  | 'phl-balance'
  | 'phl-audit'
  | 'history'

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
  handover_note?: string | null

  status?: string | null

  supervisor_status?: string | null
  supervisor_name?: string | null
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

  supervisor_status?: string | null
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

  notes?: string | null

  created_at?: string | null
  updated_at?: string | null
}

type LeaveBalanceLifecycleSummary = {
  employee_id: string

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position_name: string | null
  email: string | null
  join_date: string | null

  annual_regular_days: number | null

  postpone_active_days: number | null
  postpone_expired_days: number | null

  annual_manual_adjustment_days: number | null
  annual_total_available_days: number | null

  latest_matured_at: string | null
  current_cycle_end: string | null
  next_postpone_expiry: string | null

  postpone_pending_count: number | null
  postpone_active_count: number | null
  postpone_expired_count: number | null

  phl_active_ledger_days: number | null
  phl_expired_days: number | null
  next_phl_expiry: string | null

  phl_total_available_days: number | null
  phl_legacy_or_adjustment_days: number | null

  annual_last_manual_adjustment_at: string | null
  annual_adjustment_updated_at: string | null

  postpone_manual_net_days?: number | null
  postpone_manual_add_days?: number | null
  postpone_manual_remove_days?: number | null
  postpone_manual_event_count?: number | null
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

type DecisionTarget = {
  kind:
    | 'leave-reject'
    | 'leave-cancel'
    | 'phl-reject'
    | 'phl-cancel'

  item: LeaveRequest | PHLRecord
}

type AuditReviewTarget =
  | {
      kind: 'employee'
      item: PHLReconciliationRow
    }
  | {
      kind: 'legacy'
      item: LegacyPHLClaimReview
    }

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function number(value: unknown) {
  const parsed = Number(value || 0)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function isValidEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || '').trim()
  )
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return '-'
  }

  const raw =
    String(value).slice(
      0,
      10
    )

  const date =
    new Date(
      `${raw}T00:00:00`
    )

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return '-'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date.toLocaleString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function statusLabel(
  value?: string | null
) {
  const key =
    normalize(value)

  const labels:
    Record<
      string,
      string
    > = {
    pending: 'Pending',

    submitted:
      'Submitted',

    waiting_supervisor:
      'Menunggu Atasan',

    pending_supervisor:
      'Menunggu Atasan',

    pending_hr:
      'Menunggu HR',

    waiting_hr:
      'Menunggu HR',

    approved:
      'Approved',

    rejected:
      'Rejected',

    cancelled:
      'Cancelled',

    canceled:
      'Cancelled',

    expired:
      'Expired',

    active:
      'Aktif',

    reconciled:
      'Reconciled',

    review_required:
      'Perlu Review',
  }

  return (
    labels[key] ||
    String(
      value ||
        '-'
    ).replace(
      /_/g,
      ' '
    )
  )
}

function statusTone(
  value?: string | null
) {
  const key =
    normalize(value)

  if (
    [
      'approved',
      'active',
      'reconciled',
    ].includes(key)
  ) {
    return 'border-green-200 bg-green-50 text-green-700'
  }

  if (
    [
      'rejected',
      'cancelled',
      'canceled',
      'expired',
    ].includes(key)
  ) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  if (
    [
      'pending_hr',
      'waiting_hr',
    ].includes(key)
  ) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  return 'border-orange-200 bg-orange-50 text-orange-700'
}

function isPending(
  value?: string | null
) {
  return [
    'pending',
    'submitted',
    'waiting_supervisor',
    'pending_supervisor',
    'pending_hr',
    'waiting_hr',
  ].includes(
    normalize(value)
  )
}

function leaveRequestLabel(
  item: LeaveRequest
) {
  return (
    item.leave_type ||
    item.request_type ||
    'Cuti / Izin'
  )
}

function phlClaimDays(
  item: PHLRecord
) {
  return (
    number(
      item.balance_days
    ) ||
    number(
      item.used_days
    ) ||
    1
  )
}

async function resolveEmployeeEmail({
  employeeId,
  employeeNumber,
  directEmail,
}: {
  employeeId?:
    | string
    | null

  employeeNumber?:
    | string
    | null

  directEmail?:
    | string
    | null
}) {
  if (
    isValidEmail(
      directEmail
    )
  ) {
    return String(
      directEmail
    )
      .trim()
      .toLowerCase()
  }

  if (
    employeeId
  ) {
    const {
      data,
    } =
      await supabase
        .from(
          'employees'
        )
        .select(
          'email'
        )
        .eq(
          'id',
          employeeId
        )
        .maybeSingle<{
          email:
            | string
            | null
        }>()

    if (
      isValidEmail(
        data?.email
      )
    ) {
      return String(
        data?.email
      )
        .trim()
        .toLowerCase()
    }
  }

  if (
    employeeNumber
  ) {
    const {
      data,
    } =
      await supabase
        .from(
          'employees'
        )
        .select(
          'email'
        )
        .eq(
          'employee_number',
          employeeNumber
        )
        .limit(1)

    if (
      isValidEmail(
        data?.[0]?.email
      )
    ) {
      return String(
        data?.[0]?.email
      )
        .trim()
        .toLowerCase()
    }
  }

  return ''
}

async function sendLeaveDecisionEmail({
  item,
  decision,
  hrName,
  note,
}: {
  item: LeaveRequest

  decision:
    | 'approved'
    | 'rejected'
    | 'cancelled'

  hrName: string
  note: string
}) {
  const email =
    await resolveEmployeeEmail({
      employeeId:
        item.employee_id,

      employeeNumber:
        item.employee_number,

      directEmail:
        item.email,
    })

  if (
    !email
  ) {
    return {
      success: false,

      message:
        'Email karyawan tidak ditemukan.',
    }
  }

  const labels = {
    approved:
      'Disetujui HR',

    rejected:
      'Ditolak HR',

    cancelled:
      'Dibatalkan HR',
  }

  try {
    await sendHarmonyEmail({
      to: email,

      subject:
        `[HARMONY] ${leaveRequestLabel(
          item
        )} ${labels[decision]}`,

      title:
        `${leaveRequestLabel(
          item
        )} ${labels[decision]}`,

      message: [
        `Pengajuan ${leaveRequestLabel(
          item
        )} atas nama ${
          item.full_name ||
          item.employee_number ||
          'karyawan'
        } telah ${labels[
          decision
        ].toLowerCase()}.`,

        '',

        `Periode: ${formatDate(
          item.start_date
        )} s.d. ${formatDate(
          item.end_date
        )}`,

        `Jumlah: ${number(
          item.total_days
        )} hari`,

        `HR: ${hrName}`,

        `Catatan: ${
          note ||
          '-'
        }`,
      ].join('\n'),

      actionLabel:
        'Buka HARMONY',

      actionUrl:
        typeof window !==
        'undefined'
          ? `${window.location.origin}/employee/leave`
          : '',
    })

    return {
      success: true,

      message:
        `Email terkirim ke ${email}.`,
    }
  } catch (error: any) {
    return {
      success: false,

      message:
        error?.message ||
        'Email gagal dikirim.',
    }
  }
}

async function sendPHLDecisionEmail({
  item,
  decision,
  hrName,
  note,
}: {
  item: PHLRecord

  decision:
    | 'approved'
    | 'rejected'
    | 'cancelled'

  hrName: string
  note: string
}) {
  const email =
    await resolveEmployeeEmail({
      employeeId:
        item.employee_id,

      employeeNumber:
        item.employee_number,

      directEmail:
        item.email,
    })

  if (
    !email
  ) {
    return {
      success: false,

      message:
        'Email karyawan tidak ditemukan.',
    }
  }

  const labels = {
    approved:
      'Disetujui HR',

    rejected:
      'Ditolak HR',

    cancelled:
      'Dibatalkan HR',
  }

  try {
    await sendHarmonyEmail({
      to: email,

      subject:
        `[HARMONY] Klaim PHL ${labels[decision]}`,

      title:
        `Klaim PHL ${labels[decision]}`,

      message: [
        `Klaim PHL atas nama ${
          item.full_name ||
          item.employee_number ||
          'karyawan'
        } telah ${labels[
          decision
        ].toLowerCase()}.`,

        '',

        `Tanggal PHL: ${formatDate(
          item.phl_date
        )}`,

        `Jumlah klaim: ${phlClaimDays(
          item
        )} hari`,

        `HR: ${hrName}`,

        `Catatan: ${
          note ||
          '-'
        }`,
      ].join('\n'),

      actionLabel:
        'Buka HARMONY',

      actionUrl:
        typeof window !==
        'undefined'
          ? `${window.location.origin}/employee/leave`
          : '',
    })

    return {
      success: true,

      message:
        `Email terkirim ke ${email}.`,
    }
  } catch (error: any) {
    return {
      success: false,

      message:
        error?.message ||
        'Email gagal dikirim.',
    }
  }
}

function appendNotification(
  message: string,

  notification: {
    success: boolean
    message: string
  }
) {
  return notification.success
    ? `${message} ${notification.message}`
    : `${message} Email: ${notification.message}`
}

export default function HRLeavePage() {
  const router =
    useRouter()

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ActiveTab>(
      'leave'
    )

  const [
    appUser,
    setAppUser,
  ] =
    useState<AppUser | null>(
      null
    )

  const [
    leaveRequests,
    setLeaveRequests,
  ] =
    useState<
      LeaveRequest[]
    >([])

  const [
    leaveBalances,
    setLeaveBalances,
  ] =
    useState<
      LeaveBalanceLifecycleSummary[]
    >([])

  const [
    phlRecords,
    setPHLRecords,
  ] =
    useState<
      PHLRecord[]
    >([])

  const [
    phlBalances,
    setPHLBalances,
  ] =
    useState<
      PHLBalanceSummary[]
    >([])

  const [
    phlReconciliation,
    setPHLReconciliation,
  ] =
    useState<
      PHLReconciliationRow[]
    >([])

  const [
    legacyClaims,
    setLegacyClaims,
  ] =
    useState<
      LegacyPHLClaimReview[]
    >([])

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    processingId,
    setProcessingId,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    decisionTarget,
    setDecisionTarget,
  ] =
    useState<DecisionTarget | null>(
      null
    )

  const [
    decisionNote,
    setDecisionNote,
  ] = useState('')

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<DeleteTarget | null>(
      null
    )

  const [
    auditReviewTarget,
    setAuditReviewTarget,
  ] =
    useState<AuditReviewTarget | null>(
      null
    )

  const [
    auditReviewNote,
    setAuditReviewNote,
  ] = useState('')

  const [
    auditWarning,
    setAuditWarning,
  ] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const keyword =
    search
      .trim()
      .toLowerCase()

  const filteredLeaveRequests =
    useMemo(() => {
      return leaveRequests.filter(
        (item) => {
          if (
            !keyword
          ) {
            return true
          }

          return [
            item.full_name,
            item.employee_number,
            item.department,
            item.position,
            item.request_type,
            item.leave_type,
            item.reason,
            item.job_pending,
            item.handover_to,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
            )
        }
      )
    }, [
      leaveRequests,
      keyword,
    ])

  const filteredLeaveBalances =
    useMemo(() => {
      return leaveBalances.filter(
        (item) => {
          if (
            !keyword
          ) {
            return true
          }

          return [
            item.full_name,
            item.employee_number,
            item.department,
            item.position_name,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
            )
        }
      )
    }, [
      leaveBalances,
      keyword,
    ])

  const filteredPHLRecords =
    useMemo(() => {
      return phlRecords.filter(
        (item) => {
          if (
            !keyword
          ) {
            return true
          }

          return [
            item.full_name,
            item.employee_number,
            item.department,
            item.position,
            item.reason,
            item.status,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
            )
        }
      )
    }, [
      phlRecords,
      keyword,
    ])

  const filteredPHLBalances =
    useMemo(() => {
      return phlBalances.filter(
        (item) => {
          if (
            !keyword
          ) {
            return true
          }

          return [
            item.full_name,
            item.employee_number,
            item.department,
            item.position,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
            )
        }
      )
    }, [
      phlBalances,
      keyword,
    ])

  const filteredPHLReconciliation =
    useMemo(() => {
      return phlReconciliation.filter(
        (item) => {
          if (
            !keyword
          ) {
            return true
          }

          return [
            item.full_name,
            item.employee_number,
            item.department,
            item.position,
            item.reconciliation_status,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
            )
        }
      )
    }, [
      phlReconciliation,
      keyword,
    ])

  const filteredLegacyClaims =
    useMemo(() => {
      return legacyClaims.filter(
        (item) => {
          if (
            !keyword
          ) {
            return true
          }

          return [
            item.full_name,
            item.employee_number,
            item.department,
            item.position,
            item.legacy_review_status,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value
                )
                  .toLowerCase()
                  .includes(
                    keyword
                  )
            )
        }
      )
    }, [
      legacyClaims,
      keyword,
    ])

  const pendingLeaveCount =
    leaveRequests.filter(
      (item) => {
        return isPending(
          item.hr_status ||
          item.status
        )
      }
    ).length

  const pendingPHLClaims =
    phlRecords.filter(
      (item) => {
        return (
          normalize(
            item.source
          ) ===
            'employee_phl_claim' &&
          isPending(
            item.hr_status ||
            item.status
          )
        )
      }
    )

  const totalRegular =
    leaveBalances.reduce(
      (
        sum,
        item
      ) =>
        sum +
        number(
          item.annual_regular_days
        ),
      0
    )

  const totalPostpone =
    leaveBalances.reduce(
      (
        sum,
        item
      ) =>
        sum +
        number(
          item.postpone_active_days
        ),
      0
    )

  const totalExpired =
    leaveBalances.reduce(
      (
        sum,
        item
      ) =>
        sum +
        number(
          item.postpone_expired_days
        ),
      0
    )

  const totalPHL =
    leaveBalances.reduce(
      (
        sum,
        item
      ) =>
        sum +
        number(
          item.phl_total_available_days
        ),
      0
    )

  async function fetchData(
    options?: {
      preserveMessages?: boolean
    }
  ) {
    setLoading(true)

    if (
      !options?.preserveMessages
    ) {
      setSuccessMessage('')
      setErrorMessage('')
    }

    setAuditWarning('')

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser()

    if (
      authError ||
      !authData.user
    ) {
      setErrorMessage(
        'Session HR tidak ditemukan. Silakan login ulang.'
      )

      setLoading(false)
      return
    }

    const {
      data: userData,
    } =
      await supabase
        .from(
          'app_users'
        )
        .select('*')
        .eq(
          'id',
          authData.user.id
        )
        .maybeSingle<AppUser>()

    setAppUser(
      userData || {
        id:
          authData.user.id,

        email:
          authData.user.email ||
          'HR Administrator',

        role: 'hr',

        employee_id:
          null,

        is_active:
          true,
      }
    )

    const {
      error: lifecycleError,
    } =
      await supabase.rpc(
        'harmony_reconcile_leave_lifecycle',
        {
          p_employee_id:
            null,
        }
      )

    if (
      lifecycleError
    ) {
      console.warn(
        'Leave lifecycle reconcile warning:',
        lifecycleError.message
      )
    }

    const [
      leaveResult,
      lifecycleResult,
      phlResult,
      phlBalanceResult,
      reconciliationResult,
      legacyResult,
    ] =
      await Promise.all([
        supabase
          .from(
            'leave_requests'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          ),

        supabase
          .from(
            'harmony_leave_balance_summary'
          )
          .select('*')
          .order(
            'full_name',
            {
              ascending:
                true,
            }
          ),

        supabase
          .from(
            'phl_records'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          ),

        supabase
          .from(
            'employee_phl_balance_summary'
          )
          .select('*')
          .order(
            'full_name',
            {
              ascending:
                true,
            }
          ),

        supabase.rpc(
          'hr_get_phl_reconciliation'
        ),

        supabase.rpc(
          'hr_get_legacy_phl_claims'
        ),
      ])

    if (
      leaveResult.error
    ) {
      setErrorMessage(
        leaveResult.error.message
      )
    }

    if (
      lifecycleResult.error
    ) {
      console.warn(
        'Leave balance warning:',
        lifecycleResult.error.message
      )
    }

    if (
      phlResult.error
    ) {
      console.warn(
        'PHL records warning:',
        phlResult.error.message
      )
    }

    if (
      phlBalanceResult.error
    ) {
      console.warn(
        'PHL balance warning:',
        phlBalanceResult.error.message
      )
    }

    setLeaveRequests(
      (
        leaveResult.data ||
        []
      ) as LeaveRequest[]
    )

    setLeaveBalances(
      (
        lifecycleResult.data ||
        []
      ) as LeaveBalanceLifecycleSummary[]
    )

    setPHLRecords(
      (
        phlResult.data ||
        []
      ) as PHLRecord[]
    )

    setPHLBalances(
      (
        phlBalanceResult.data ||
        []
      ) as PHLBalanceSummary[]
    )

    if (
      reconciliationResult.error ||
      legacyResult.error
    ) {
      setPHLReconciliation(
        []
      )

      setLegacyClaims(
        []
      )

      setAuditWarning(
        reconciliationResult
          .error?.message ||
          legacyResult
            .error?.message ||
          'Audit PHL belum tersedia.'
      )
    } else {
      setPHLReconciliation(
        (
          reconciliationResult.data ||
          []
        ) as PHLReconciliationRow[]
      )

      setLegacyClaims(
        (
          legacyResult.data ||
          []
        ) as LegacyPHLClaimReview[]
      )
    }

    setLoading(false)
  }

  async function approveLeave(
    item: LeaveRequest
  ) {
    setProcessingId(
      item.id
    )

    setErrorMessage('')
    setSuccessMessage('')

    const approvedBy =
      appUser?.email ||
      'HR Administrator'

    const note =
      'Disetujui oleh HR.'

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'hr_approve_leave_request_atomic',
          {
            p_request_id:
              item.id,

            p_approved_by:
              approvedBy,

            p_note:
              note,
          }
        )

      if (
        error
      ) {
        throw error
      }

      const result =
        (
          data ||
          {}
        ) as {
          success?: boolean
          already_approved?: boolean
          balance_field?: string | null
          balance_before?: number | null
          balance_after?: number | null
          message?: string
        }

      if (
        !result.success
      ) {
        throw new Error(
          result.message ||
          'Approval final HR gagal.'
        )
      }

      const balanceText =
        result.balance_before !==
          null &&
        result.balance_before !==
          undefined &&
        result.balance_after !==
          null &&
        result.balance_after !==
          undefined
          ? ` Saldo: ${result.balance_before} → ${result.balance_after} hari.`
          : ''

      const email =
        await sendLeaveDecisionEmail({
          item,

          decision:
            'approved',

          hrName:
            approvedBy,

          note,
        })

      setSuccessMessage(
        appendNotification(
          result.already_approved
            ? 'Pengajuan sebelumnya sudah approved. Saldo tidak dipotong ulang.'
            : `${result.message || 'Pengajuan berhasil disetujui secara atomik.'}${balanceText}`,

          email
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Approval HR gagal. Saldo dan absensi tidak diubah.'
      )
    } finally {
      setProcessingId('')

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  async function rejectLeave(
    item: LeaveRequest,
    note: string
  ) {
    setProcessingId(
      item.id
    )

    setErrorMessage('')
    setSuccessMessage('')

    const rejectedBy =
      appUser?.email ||
      'HR Administrator'

    const now =
      new Date().toISOString()

    try {
      const {
        error,
      } =
        await supabase
          .from(
            'leave_requests'
          )
          .update({
            status:
              'rejected',

            hr_status:
              'rejected',

            hr_approved_by:
              rejectedBy,

            hr_approved_at:
              now,

            hr_note:
              note,

            updated_at:
              now,
          })
          .eq(
            'id',
            item.id
          )

      if (
        error
      ) {
        throw error
      }

      const email =
        await sendLeaveDecisionEmail({
          item,

          decision:
            'rejected',

          hrName:
            rejectedBy,

          note,
        })

      setSuccessMessage(
        appendNotification(
          'Pengajuan berhasil ditolak HR.',
          email
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Reject pengajuan gagal.'
      )
    } finally {
      setProcessingId('')

      setDecisionTarget(
        null
      )

      setDecisionNote('')

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  async function cancelLeave(
    item: LeaveRequest,
    note: string
  ) {
    setProcessingId(
      item.id
    )

    setErrorMessage('')
    setSuccessMessage('')

    const cancelledBy =
      appUser?.email ||
      'HR Administrator'

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'hr_cancel_approved_leave_request_atomic',
          {
            p_request_id:
              item.id,

            p_cancelled_by:
              cancelledBy,

            p_note:
              note,
          }
        )

      if (
        error
      ) {
        throw error
      }

      const result =
        (
          data ||
          {}
        ) as {
          success?: boolean
          already_cancelled?: boolean
          balance_before?: number | null
          balance_after?: number | null
          message?: string
        }

      if (
        !result.success
      ) {
        throw new Error(
          result.message ||
          'Pembatalan pengajuan gagal.'
        )
      }

      const email =
        await sendLeaveDecisionEmail({
          item,

          decision:
            'cancelled',

          hrName:
            cancelledBy,

          note,
        })

      setSuccessMessage(
        appendNotification(
          result.message ||
          'Pengajuan berhasil dibatalkan.',

          email
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Pembatalan gagal. Saldo dan absensi tidak diubah.'
      )
    } finally {
      setProcessingId('')

      setDecisionTarget(
        null
      )

      setDecisionNote('')

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  async function approvePHL(
    item: PHLRecord
  ) {
    setProcessingId(
      item.id
    )

    setErrorMessage('')
    setSuccessMessage('')

    const approvedBy =
      appUser?.email ||
      'HR Administrator'

    const note =
      'Disetujui oleh HR.'

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'hr_approve_phl_claim_atomic',
          {
            p_claim_record_id:
              item.id,

            p_approved_by:
              approvedBy,

            p_note:
              note,
          }
        )

      if (
        error
      ) {
        throw error
      }

      const result =
        (
          data ||
          {}
        ) as {
          success?: boolean
          message?: string
        }

      if (
        result.success ===
        false
      ) {
        throw new Error(
          result.message ||
          'Approval PHL gagal.'
        )
      }

      const email =
        await sendPHLDecisionEmail({
          item,

          decision:
            'approved',

          hrName:
            approvedBy,

          note,
        })

      setSuccessMessage(
        appendNotification(
          result.message ||
          'Klaim PHL berhasil disetujui.',

          email
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Approval PHL gagal. Pastikan RPC atomic PHL tersedia.'
      )
    } finally {
      setProcessingId('')

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  async function rejectPHL(
    item: PHLRecord,
    note: string
  ) {
    setProcessingId(
      item.id
    )

    setErrorMessage('')
    setSuccessMessage('')

    const rejectedBy =
      appUser?.email ||
      'HR Administrator'

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'hr_reject_phl_claim_atomic',
          {
            p_claim_record_id:
              item.id,

            p_rejected_by:
              rejectedBy,

            p_reason:
              note,
          }
        )

      if (
        error
      ) {
        throw error
      }

      const result =
        (
          data ||
          {}
        ) as {
          success?: boolean
          message?: string
        }

      if (
        result.success ===
        false
      ) {
        throw new Error(
          result.message ||
          'Reject PHL gagal.'
        )
      }

      const email =
        await sendPHLDecisionEmail({
          item,

          decision:
            'rejected',

          hrName:
            rejectedBy,

          note,
        })

      setSuccessMessage(
        appendNotification(
          result.message ||
          'Klaim PHL berhasil ditolak.',

          email
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Reject PHL gagal.'
      )
    } finally {
      setProcessingId('')

      setDecisionTarget(
        null
      )

      setDecisionNote('')

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  async function cancelPHL(
    item: PHLRecord,
    note: string
  ) {
    setProcessingId(
      item.id
    )

    setErrorMessage('')
    setSuccessMessage('')

    const cancelledBy =
      appUser?.email ||
      'HR Administrator'

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'hr_cancel_approved_phl_claim_atomic',
          {
            p_claim_record_id:
              item.id,

            p_cancelled_by:
              cancelledBy,

            p_note:
              note,
          }
        )

      if (
        error
      ) {
        throw error
      }

      const result =
        (
          data ||
          {}
        ) as {
          success?: boolean
          message?: string
        }

      if (
        !result.success
      ) {
        throw new Error(
          result.message ||
          'Pembatalan PHL gagal.'
        )
      }

      const email =
        await sendPHLDecisionEmail({
          item,

          decision:
            'cancelled',

          hrName:
            cancelledBy,

          note,
        })

      setSuccessMessage(
        appendNotification(
          result.message ||
          'Klaim PHL berhasil dibatalkan.',

          email
        )
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Pembatalan PHL gagal. Saldo tidak diubah.'
      )
    } finally {
      setProcessingId('')

      setDecisionTarget(
        null
      )

      setDecisionNote('')

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  async function saveAuditReview() {
    if (
      !auditReviewTarget
    ) {
      return
    }

    const note =
      auditReviewNote.trim()

    if (
      note.length <
      5
    ) {
      setErrorMessage(
        'Catatan review minimal 5 karakter.'
      )

      return
    }

    const key =
      auditReviewTarget.kind ===
      'employee'
        ? `review-${auditReviewTarget.item.employee_id}`
        : `review-${auditReviewTarget.item.claim_record_id}`

    setProcessingId(
      key
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result =
        auditReviewTarget.kind ===
        'employee'
          ? await supabase.rpc(
              'hr_record_phl_employee_review',
              {
                p_employee_id:
                  auditReviewTarget
                    .item
                    .employee_id,

                p_note:
                  note,
              }
            )
          : await supabase.rpc(
              'hr_mark_legacy_phl_claim_reviewed',
              {
                p_claim_record_id:
                  auditReviewTarget
                    .item
                    .claim_record_id,

                p_note:
                  note,
              }
            )

      if (
        result.error
      ) {
        throw result.error
      }

      setSuccessMessage(
        'Review audit PHL berhasil dicatat tanpa mengubah saldo.'
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Review audit PHL gagal disimpan.'
      )
    } finally {
      setProcessingId('')

      setAuditReviewTarget(
        null
      )

      setAuditReviewNote('')

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  function askDeleteLeave(
    item: LeaveRequest
  ) {
    if (
      normalize(
        item.hr_status ||
        item.status
      ) ===
      'approved'
    ) {
      setErrorMessage(
        'Pengajuan approved tidak boleh dihapus. Gunakan Batalkan agar saldo dan absensi direversal dengan benar.'
      )

      return
    }

    setDeleteTarget({
      id:
        item.id,

      kind:
        'leave',

      title:
        'Hapus Pengajuan Cuti / Izin',

      employeeName:
        item.full_name ||
        'Karyawan',

      description:
        'Hanya gunakan untuk data pending/rejected dummy atau testing.',
    })
  }

  function askDeletePHL(
    item: PHLRecord
  ) {
    const status =
      normalize(
        item.hr_status ||
        item.status
      )

    if (
      [
        'approved',
        'cancelled',
        'canceled',
      ].includes(status) ||
      number(
        item.used_days
      ) >
        0
    ) {
      setErrorMessage(
        'PHL approved/cancelled atau yang sudah terpakai tidak boleh dihapus karena merupakan bagian ledger.'
      )

      return
    }

    setDeleteTarget({
      id:
        item.id,

      kind:
        'phl',

      title:
        'Hapus Data PHL',

      employeeName:
        item.full_name ||
        'Karyawan',

      description:
        'Hanya gunakan untuk data pending/rejected dummy atau testing.',
    })
  }

  async function confirmDelete() {
    if (
      !deleteTarget
    ) {
      return
    }

    setProcessingId(
      deleteTarget.id
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const table =
        deleteTarget.kind ===
        'leave'
          ? 'leave_requests'
          : 'phl_records'

      const {
        error,
      } =
        await supabase
          .from(
            table
          )
          .delete()
          .eq(
            'id',
            deleteTarget.id
          )

      if (
        error
      ) {
        throw error
      }

      setSuccessMessage(
        deleteTarget.kind ===
          'leave'
          ? 'Pengajuan berhasil dihapus.'
          : 'Data PHL berhasil dihapus.'
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
        'Data gagal dihapus.'
      )
    } finally {
      setProcessingId('')

      setDeleteTarget(
        null
      )

      await fetchData({
        preserveMessages:
          true,
      })
    }
  }

  async function submitDecisionModal() {
    if (
      !decisionTarget
    ) {
      return
    }

    const note =
      decisionNote.trim()

    if (
      note.length <
      5
    ) {
      setErrorMessage(
        'Catatan/alasan minimal 5 karakter.'
      )

      return
    }

    if (
      decisionTarget.kind ===
      'leave-reject'
    ) {
      await rejectLeave(
        decisionTarget.item as LeaveRequest,
        note
      )

      return
    }

    if (
      decisionTarget.kind ===
      'leave-cancel'
    ) {
      await cancelLeave(
        decisionTarget.item as LeaveRequest,
        note
      )

      return
    }

    if (
      decisionTarget.kind ===
      'phl-reject'
    ) {
      await rejectPHL(
        decisionTarget.item as PHLRecord,
        note
      )

      return
    }

    await cancelPHL(
      decisionTarget.item as PHLRecord,
      note
    )
  }

  return (
    <>
      <Topbar
        title="Cuti, Izin & PHL"
        description="Approval operasional cuti/izin/sakit/PHL. Lifecycle postpone dan master jenis dikelola pada route terpisah agar tidak overlapping."
      />

      <main className="space-y-6 p-4 sm:p-6">
        {successMessage && (
          <Message tone="success">
            {successMessage}
          </Message>
        )}

        {errorMessage && (
          <Message tone="error">
            {errorMessage}
          </Message>
        )}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">
              <ShieldCheck
                size={15}
              />

              HR Operational Approval
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Cuti, Izin & PHL
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Halaman ini khusus
              approval operasional.
              Postpone lifecycle,
              manual adjustment,
              expired history, dan
              master jenis dipisahkan
              ke Administrasi Cuti.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroMetric
                label="Pending Cuti/Izin"
                value={String(
                  pendingLeaveCount
                )}
              />

              <HeroMetric
                label="Pending PHL"
                value={String(
                  pendingPHLClaims.length
                )}
              />

              <HeroMetric
                label="Cuti Matang"
                value={`${formatNumber(
                  totalRegular
                )} hari`}
              />

              <HeroMetric
                label="Postpone Aktif"
                value={`${formatNumber(
                  totalPostpone
                )} hari`}
              />
            </div>
          </div>
        </section>

        <section className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <Tab
                active={
                  activeTab ===
                  'leave'
                }
                onClick={() =>
                  setActiveTab(
                    'leave'
                  )
                }
                icon={
                  <CalendarDays
                    size={16}
                  />
                }
                label="Cuti & Izin"
              />

              <Tab
                active={
                  activeTab ===
                  'leave-balance'
                }
                onClick={() =>
                  setActiveTab(
                    'leave-balance'
                  )
                }
                icon={
                  <WalletCards
                    size={16}
                  />
                }
                label="Saldo Cuti"
              />

              <Tab
                active={
                  activeTab ===
                  'phl-claim'
                }
                onClick={() =>
                  setActiveTab(
                    'phl-claim'
                  )
                }
                icon={
                  <Plane
                    size={16}
                  />
                }
                label="Klaim PHL"
              />

              <Tab
                active={
                  activeTab ===
                  'phl-balance'
                }
                onClick={() =>
                  setActiveTab(
                    'phl-balance'
                  )
                }
                icon={
                  <Landmark
                    size={16}
                  />
                }
                label="Saldo PHL"
              />

              <Tab
                active={
                  activeTab ===
                  'phl-audit'
                }
                onClick={() =>
                  setActiveTab(
                    'phl-audit'
                  )
                }
                icon={
                  <ShieldCheck
                    size={16}
                  />
                }
                label="Audit PHL"
              />

              <Tab
                active={
                  activeTab ===
                  'history'
                }
                onClick={() =>
                  setActiveTab(
                    'history'
                  )
                }
                icon={
                  <History
                    size={16}
                  />
                }
                label="Riwayat"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/hr/leave/administration'
                  )
                }
                className="harmony-button-secondary"
              >
                <WalletCards
                  size={17}
                />

                Administrasi Saldo & Jenis
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/hr/leave/postpone'
                  )
                }
                className="harmony-button-secondary"
              >
                <RotateCcw
                  size={17}
                />

                Postpone
              </button>

              <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 sm:w-72">
                <Search
                  size={16}
                  className="text-[#86868b]"
                />

                <input
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Cari karyawan..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchData()
                }
                disabled={
                  loading
                }
                className="harmony-button-secondary disabled:opacity-50"
              >
                <RefreshCcw
                  size={17}
                  className={
                    loading
                      ? 'animate-spin'
                      : ''
                  }
                />

                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-8 text-sm text-[#6e6e73]">
              <Loader2
                size={18}
                className="animate-spin"
              />

              Memuat data...
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              {activeTab ===
                'leave' && (
                <LeaveTable
                  rows={filteredLeaveRequests.filter(
                    (item) =>
                      normalize(
                        item.hr_status ||
                        item.status
                      ) !==
                      'cancelled'
                  )}
                  processingId={
                    processingId
                  }
                  onApprove={
                    approveLeave
                  }
                  onReject={(
                    item
                  ) => {
                    setDecisionTarget({
                      kind:
                        'leave-reject',

                      item,
                    })

                    setDecisionNote(
                      ''
                    )
                  }}
                  onCancel={(
                    item
                  ) => {
                    setDecisionTarget({
                      kind:
                        'leave-cancel',

                      item,
                    })

                    setDecisionNote(
                      ''
                    )
                  }}
                  onDelete={
                    askDeleteLeave
                  }
                />
              )}

              {activeTab ===
                'leave-balance' && (
                <LeaveBalanceTable
                  rows={
                    filteredLeaveBalances
                  }
                />
              )}

              {activeTab ===
                'phl-claim' && (
                <PHLClaimTable
                  rows={filteredPHLRecords.filter(
                    (item) =>
                      normalize(
                        item.source
                      ) ===
                      'employee_phl_claim'
                  )}
                  processingId={
                    processingId
                  }
                  onApprove={
                    approvePHL
                  }
                  onReject={(
                    item
                  ) => {
                    setDecisionTarget({
                      kind:
                        'phl-reject',

                      item,
                    })

                    setDecisionNote(
                      ''
                    )
                  }}
                  onCancel={(
                    item
                  ) => {
                    setDecisionTarget({
                      kind:
                        'phl-cancel',

                      item,
                    })

                    setDecisionNote(
                      ''
                    )
                  }}
                  onDelete={
                    askDeletePHL
                  }
                />
              )}

              {activeTab ===
                'phl-balance' && (
                <PHLBalanceTable
                  rows={
                    filteredPHLBalances
                  }
                />
              )}

              {activeTab ===
                'phl-audit' && (
                <PHLAudit
                  warning={
                    auditWarning
                  }
                  reconciliationRows={
                    filteredPHLReconciliation
                  }
                  legacyRows={
                    filteredLegacyClaims
                  }
                  processingId={
                    processingId
                  }
                  onReviewEmployee={(
                    item
                  ) => {
                    setAuditReviewTarget({
                      kind:
                        'employee',

                      item,
                    })

                    setAuditReviewNote(
                      ''
                    )
                  }}
                  onReviewLegacy={(
                    item
                  ) => {
                    setAuditReviewTarget({
                      kind:
                        'legacy',

                      item,
                    })

                    setAuditReviewNote(
                      ''
                    )
                  }}
                />
              )}

              {activeTab ===
                'history' && (
                <HistoryView
                  leaveRows={
                    filteredLeaveRequests
                  }
                  phlRows={
                    filteredPHLRecords
                  }
                />
              )}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            title="Cuti Matang"
            value={`${formatNumber(
              totalRegular
            )} hari`}
          />

          <MiniStat
            title="Postpone Aktif"
            value={`${formatNumber(
              totalPostpone
            )} hari`}
          />

          <MiniStat
            title="Postpone Expired"
            value={`${formatNumber(
              totalExpired
            )} hari`}
          />

          <MiniStat
            title="PHL Aktif"
            value={`${formatNumber(
              totalPHL
            )} hari`}
          />
        </section>
      </main>

      {decisionTarget && (
        <NoteModal
          title={decisionModalTitle(
            decisionTarget.kind
          )}
          value={
            decisionNote
          }
          processing={
            processingId ===
            decisionTarget.item.id
          }
          onChange={
            setDecisionNote
          }
          onClose={() => {
            if (
              !processingId
            ) {
              setDecisionTarget(
                null
              )
            }
          }}
          onSubmit={
            submitDecisionModal
          }
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={
            deleteTarget.title
          }
          description={`${deleteTarget.employeeName} — ${deleteTarget.description}`}
          processing={
            processingId ===
            deleteTarget.id
          }
          onClose={() => {
            if (
              !processingId
            ) {
              setDeleteTarget(
                null
              )
            }
          }}
          onConfirm={
            confirmDelete
          }
        />
      )}

      {auditReviewTarget && (
        <NoteModal
          title={
            auditReviewTarget.kind ===
            'employee'
              ? 'Catat Review Rekonsiliasi Employee'
              : 'Tandai Klaim Legacy Sudah Direview'
          }
          value={
            auditReviewNote
          }
          processing={
            processingId.startsWith(
              'review-'
            )
          }
          onChange={
            setAuditReviewNote
          }
          onClose={() => {
            if (
              !processingId
            ) {
              setAuditReviewTarget(
                null
              )
            }
          }}
          onSubmit={
            saveAuditReview
          }
        />
      )}
    </>
  )
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-4 text-xs font-bold transition ${
        active
          ? 'bg-[#1d1d1f] text-white'
          : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]'
      }`}
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
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function MiniStat({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="harmony-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[#86868b]">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function Message({
  tone,
  children,
}: {
  tone:
    | 'success'
    | 'error'

  children:
    ReactNode
}) {
  const cls =
    tone ===
    'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-orange-200 bg-orange-50 text-orange-700'

  return (
    <div
      className={`rounded-2xl border p-4 text-sm leading-6 ${cls}`}
    >
      <div className="flex items-start gap-2">
        {tone ===
        'success' ? (
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />
        ) : (
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />
        )}

        <span>
          {children}
        </span>
      </div>
    </div>
  )
}

function Status({
  value,
}: {
  value?:
    | string
    | null
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(
        value
      )}`}
    >
      {statusLabel(
        value
      )}
    </span>
  )
}

function Empty({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-[#f5f5f7]/70 p-6 text-center text-sm text-[#6e6e73]">
      {text}
    </div>
  )
}

function LeaveTable({
  rows,
  processingId,
  onApprove,
  onReject,
  onCancel,
  onDelete,
}: {
  rows: LeaveRequest[]
  processingId: string
  onApprove: (item: LeaveRequest) => void
  onReject: (item: LeaveRequest) => void
  onCancel: (item: LeaveRequest) => void
  onDelete: (item: LeaveRequest) => void
}) {
  if (
    !rows.length
  ) {
    return (
      <Empty text="Tidak ada pengajuan cuti/izin pada filter ini." />
    )
  }

  return (
    <div className="space-y-3">
      {rows.map(
        (item) => {
          const finalStatus =
            normalize(
              item.hr_status ||
              item.status
            )

          const supervisorApproved =
            normalize(
              item.supervisor_status
            ) ===
            'approved'

          const canApprove =
            supervisorApproved &&
            finalStatus !==
              'approved' &&
            finalStatus !==
              'cancelled'

          const approved =
            finalStatus ===
            'approved'

          const processing =
            processingId ===
            item.id

          return (
            <article
              key={item.id}
              className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm"
            >
              <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Status
                      value={
                        item.hr_status ||
                        item.status
                      }
                    />

                    <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold">
                      {leaveRequestLabel(
                        item
                      )}
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold text-[#1d1d1f]">
                    {item.full_name ||
                      item.employee_number ||
                      '-'}
                  </h3>

                  <p className="mt-1 text-xs text-[#6e6e73]">
                    {item.employee_number ||
                      '-'}{' '}
                    ·{' '}
                    {item.department ||
                      '-'}{' '}
                    ·{' '}
                    {item.position ||
                      '-'}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                      label="Periode"
                      value={`${formatDate(
                        item.start_date
                      )} – ${formatDate(
                        item.end_date
                      )}`}
                    />

                    <Info
                      label="Hari"
                      value={`${number(
                        item.total_days
                      )} hari`}
                    />

                    <Info
                      label="Supervisor"
                      value={statusLabel(
                        item.supervisor_status
                      )}
                    />

                    <Info
                      label="Submit"
                      value={formatDateTime(
                        item.created_at
                      )}
                    />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#6e6e73]">
                    {item.reason ||
                      '-'}
                  </p>

                  {(item.job_pending ||
                    item.handover_to ||
                    item.handover_note) && (
                    <div className="mt-4 rounded-2xl bg-[#f5f5f7] p-4 text-xs leading-5 text-[#6e6e73]">
                      <strong className="text-[#1d1d1f]">
                        Job pending:
                      </strong>{' '}

                      {item.job_pending ||
                        '-'}

                      <br />

                      <strong className="text-[#1d1d1f]">
                        Handover:
                      </strong>{' '}

                      {item.handover_to ||
                        '-'}

                      {item.handover_note
                        ? ` — ${item.handover_note}`
                        : ''}
                    </div>
                  )}
                </div>

                <div className="flex min-w-[180px] flex-col gap-2">
                  {(item.proof_file_url ||
                    item.proof_url) && (
                    <a
                      href={
                        item.proof_file_url ||
                        item.proof_url ||
                        '#'
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="harmony-button-secondary justify-center"
                    >
                      <FileText
                        size={16}
                      />

                      Lihat Bukti
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onApprove(
                        item
                      )
                    }
                    disabled={
                      !canApprove ||
                      processing
                    }
                    className="harmony-button-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={16}
                      />
                    )}

                    Approve HR
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onReject(
                        item
                      )
                    }
                    disabled={
                      approved ||
                      processing
                    }
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700 disabled:opacity-50"
                  >
                    <XCircle
                      size={15}
                    />

                    Reject
                  </button>

                  {approved && (
                    <button
                      type="button"
                      onClick={() =>
                        onCancel(
                          item
                        )
                      }
                      disabled={
                        processing
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-xs font-bold text-orange-700 disabled:opacity-50"
                    >
                      <RotateCcw
                        size={15}
                      />

                      Batalkan
                    </button>
                  )}

                  {!approved && (
                    <button
                      type="button"
                      onClick={() =>
                        onDelete(
                          item
                        )
                      }
                      disabled={
                        processing
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#f5f5f7] px-4 text-xs font-bold text-[#6e6e73] disabled:opacity-50"
                    >
                      <Trash2
                        size={15}
                      />

                      Hapus Dummy
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        }
      )}
    </div>
  )
}

function LeaveBalanceTable({
  rows,
}: {
  rows:
    LeaveBalanceLifecycleSummary[]
}) {
  if (
    !rows.length
  ) {
    return (
      <Empty text="Data saldo cuti belum tersedia." />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1180px] w-full text-left text-xs">
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
            <Th>
              Karyawan
            </Th>

            <Th>
              Cuti Matang
            </Th>

            <Th>
              Postpone Aktif
            </Th>

            <Th>
              Postpone Expired
            </Th>

            <Th>
              Manual Postpone Net
            </Th>

            <Th>
              Total Tersedia
            </Th>

            <Th>
              Next Expiry
            </Th>

            <Th>
              PHL
            </Th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (item) => (
              <tr
                key={
                  item.employee_id
                }
                className="border-b border-black/5"
              >
                <Td>
                  <strong>
                    {item.full_name ||
                      '-'}
                  </strong>

                  <div className="mt-1 text-[11px] text-[#86868b]">
                    {item.employee_number ||
                      '-'}{' '}
                    ·{' '}
                    {item.department ||
                      '-'}
                  </div>
                </Td>

                <Td>
                  {formatNumber(
                    item.annual_regular_days
                  )}
                </Td>

                <Td>
                  {formatNumber(
                    item.postpone_active_days
                  )}
                </Td>

                <Td>
                  <span
                    className={
                      number(
                        item.postpone_expired_days
                      ) >
                      0
                        ? 'font-bold text-red-600'
                        : ''
                    }
                  >
                    {formatNumber(
                      item.postpone_expired_days
                    )}
                  </span>
                </Td>

                <Td>
                  {formatSigned(
                    item.postpone_manual_net_days
                  )}
                </Td>

                <Td>
                  <strong>
                    {formatNumber(
                      item.annual_total_available_days
                    )}
                  </strong>
                </Td>

                <Td>
                  {formatDate(
                    item.next_postpone_expiry
                  )}
                </Td>

                <Td>
                  {formatNumber(
                    item.phl_total_available_days
                  )}
                </Td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

function PHLClaimTable({
  rows,
  processingId,
  onApprove,
  onReject,
  onCancel,
  onDelete,
}: {
  rows: PHLRecord[]
  processingId: string
  onApprove: (item: PHLRecord) => void
  onReject: (item: PHLRecord) => void
  onCancel: (item: PHLRecord) => void
  onDelete: (item: PHLRecord) => void
}) {
  if (
    !rows.length
  ) {
    return (
      <Empty text="Belum ada klaim PHL employee." />
    )
  }

  return (
    <div className="space-y-3">
      {rows.map(
        (item) => {
          const state =
            normalize(
              item.hr_status ||
              item.status
            )

          const approved =
            state ===
            'approved'

          const processing =
            processingId ===
            item.id

          const supervisorOk =
            !item.supervisor_status ||
            normalize(
              item.supervisor_status
            ) ===
              'approved'

          return (
            <article
              key={item.id}
              className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Status
                      value={
                        item.hr_status ||
                        item.status
                      }
                    />

                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                      Klaim PHL
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold">
                    {item.full_name ||
                      item.employee_number ||
                      '-'}
                  </h3>

                  <p className="mt-1 text-xs text-[#6e6e73]">
                    {item.employee_number ||
                      '-'}{' '}
                    ·{' '}
                    {item.department ||
                      '-'}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                      label="Tanggal PHL"
                      value={formatDate(
                        item.phl_date
                      )}
                    />

                    <Info
                      label="Klaim"
                      value={`${phlClaimDays(
                        item
                      )} hari`}
                    />

                    <Info
                      label="Supervisor"
                      value={statusLabel(
                        item.supervisor_status
                      )}
                    />

                    <Info
                      label="Submit"
                      value={formatDateTime(
                        item.created_at
                      )}
                    />
                  </div>

                  <p className="mt-4 text-sm text-[#6e6e73]">
                    {item.reason ||
                      item.notes ||
                      '-'}
                  </p>
                </div>

                <div className="flex min-w-[180px] flex-col gap-2">
                  {item.proof_file_url && (
                    <a
                      href={
                        item.proof_file_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="harmony-button-secondary justify-center"
                    >
                      <FileText
                        size={16}
                      />

                      Bukti
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onApprove(
                        item
                      )
                    }
                    disabled={
                      !supervisorOk ||
                      approved ||
                      processing
                    }
                    className="harmony-button-primary justify-center disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={16}
                      />
                    )}

                    Approve HR
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onReject(
                        item
                      )
                    }
                    disabled={
                      approved ||
                      processing
                    }
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700 disabled:opacity-50"
                  >
                    <XCircle
                      size={15}
                    />

                    Reject
                  </button>

                  {approved && (
                    <button
                      type="button"
                      onClick={() =>
                        onCancel(
                          item
                        )
                      }
                      disabled={
                        processing
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-xs font-bold text-orange-700 disabled:opacity-50"
                    >
                      <RotateCcw
                        size={15}
                      />

                      Batalkan
                    </button>
                  )}

                  {!approved && (
                    <button
                      type="button"
                      onClick={() =>
                        onDelete(
                          item
                        )
                      }
                      disabled={
                        processing
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#f5f5f7] px-4 text-xs font-bold text-[#6e6e73] disabled:opacity-50"
                    >
                      <Trash2
                        size={15}
                      />

                      Hapus Dummy
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        }
      )}
    </div>
  )
}

function PHLBalanceTable({
  rows,
}: {
  rows:
    PHLBalanceSummary[]
}) {
  if (
    !rows.length
  ) {
    return (
      <Empty text="Saldo PHL belum tersedia." />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-left text-xs">
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7]">
            <Th>
              Karyawan
            </Th>

            <Th>
              Total Earned
            </Th>

            <Th>
              Terpakai
            </Th>

            <Th>
              Tersedia
            </Th>

            <Th>
              Pending Claim
            </Th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (
              item,
              index
            ) => (
              <tr
                key={
                  item.employee_id ||
                  `${item.employee_number}-${index}`
                }
                className="border-b border-black/5"
              >
                <Td>
                  <strong>
                    {item.full_name ||
                      '-'}
                  </strong>

                  <div className="mt-1 text-[11px] text-[#86868b]">
                    {item.employee_number ||
                      '-'}{' '}
                    ·{' '}
                    {item.department ||
                      '-'}
                  </div>
                </Td>

                <Td>
                  {formatNumber(
                    item.total_earned_days
                  )}
                </Td>

                <Td>
                  {formatNumber(
                    item.total_used_days
                  )}
                </Td>

                <Td>
                  <strong>
                    {formatNumber(
                      item.total_available_days
                    )}
                  </strong>
                </Td>

                <Td>
                  {formatNumber(
                    item.pending_claim_count
                  )}
                </Td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

function PHLAudit({
  warning,
  reconciliationRows,
  legacyRows,
  processingId,
  onReviewEmployee,
  onReviewLegacy,
}: {
  warning: string

  reconciliationRows:
    PHLReconciliationRow[]

  legacyRows:
    LegacyPHLClaimReview[]

  processingId: string

  onReviewEmployee:
    (
      item:
        PHLReconciliationRow
    ) => void

  onReviewLegacy:
    (
      item:
        LegacyPHLClaimReview
    ) => void
}) {
  return (
    <div className="space-y-6">
      {warning && (
        <Message tone="error">
          {warning}
        </Message>
      )}

      <div>
        <h3 className="font-bold text-[#1d1d1f]">
          Rekonsiliasi Saldo PHL
        </h3>

        <p className="mt-1 text-sm text-[#6e6e73]">
          Review hanya mencatat
          audit; tidak mengubah
          saldo secara otomatis.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#f5f5f7]">
                <Th>
                  Karyawan
                </Th>

                <Th>
                  Manual
                </Th>

                <Th>
                  Ledger Aktif
                </Th>

                <Th>
                  Selisih
                </Th>

                <Th>
                  Expired
                </Th>

                <Th>
                  Pending
                </Th>

                <Th>
                  Status
                </Th>

                <Th>
                  Aksi
                </Th>
              </tr>
            </thead>

            <tbody>
              {reconciliationRows.map(
                (item) => (
                  <tr
                    key={
                      item.employee_id
                    }
                    className="border-b border-black/5"
                  >
                    <Td>
                      <strong>
                        {item.full_name ||
                          '-'}
                      </strong>

                      <div className="mt-1 text-[11px] text-[#86868b]">
                        {item.employee_number ||
                          '-'}{' '}
                        ·{' '}
                        {item.department ||
                          '-'}
                      </div>
                    </Td>

                    <Td>
                      {formatNumber(
                        item.manual_phl_balance
                      )}
                    </Td>

                    <Td>
                      {formatNumber(
                        item.active_ledger_balance
                      )}
                    </Td>

                    <Td>
                      {formatSigned(
                        item.manual_ledger_difference
                      )}
                    </Td>

                    <Td>
                      {formatNumber(
                        item.expired_remaining_balance
                      )}
                    </Td>

                    <Td>
                      {formatNumber(
                        item.pending_claim_count
                      )}
                    </Td>

                    <Td>
                      <Status
                        value={
                          item.reconciliation_status
                        }
                      />
                    </Td>

                    <Td>
                      <button
                        type="button"
                        onClick={() =>
                          onReviewEmployee(
                            item
                          )
                        }
                        disabled={
                          processingId ===
                          `review-${item.employee_id}`
                        }
                        className="harmony-button-secondary text-xs disabled:opacity-50"
                      >
                        <ShieldCheck
                          size={14}
                        />

                        Review
                      </button>
                    </Td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-[#1d1d1f]">
          Klaim PHL Legacy
        </h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#f5f5f7]">
                <Th>
                  Karyawan
                </Th>

                <Th>
                  Tanggal
                </Th>

                <Th>
                  Claim
                </Th>

                <Th>
                  Allocated
                </Th>

                <Th>
                  Gap
                </Th>

                <Th>
                  Review
                </Th>

                <Th>
                  Aksi
                </Th>
              </tr>
            </thead>

            <tbody>
              {legacyRows.map(
                (item) => (
                  <tr
                    key={
                      item.claim_record_id
                    }
                    className="border-b border-black/5"
                  >
                    <Td>
                      <strong>
                        {item.full_name ||
                          '-'}
                      </strong>

                      <div className="mt-1 text-[11px] text-[#86868b]">
                        {item.employee_number ||
                          '-'}
                      </div>
                    </Td>

                    <Td>
                      {formatDate(
                        item.phl_date
                      )}
                    </Td>

                    <Td>
                      {formatNumber(
                        item.claim_days
                      )}
                    </Td>

                    <Td>
                      {formatNumber(
                        item.allocated_days
                      )}
                    </Td>

                    <Td>
                      {formatNumber(
                        item.tracking_gap_days
                      )}
                    </Td>

                    <Td>
                      <Status
                        value={
                          item.legacy_review_status
                        }
                      />
                    </Td>

                    <Td>
                      <button
                        type="button"
                        onClick={() =>
                          onReviewLegacy(
                            item
                          )
                        }
                        disabled={
                          processingId ===
                          `review-${item.claim_record_id}`
                        }
                        className="harmony-button-secondary text-xs disabled:opacity-50"
                      >
                        <ShieldCheck
                          size={14}
                        />

                        Tandai Review
                      </button>
                    </Td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function HistoryView({
  leaveRows,
  phlRows,
}: {
  leaveRows:
    LeaveRequest[]

  phlRows:
    PHLRecord[]
}) {
  const leaveHistory =
    leaveRows.filter(
      (item) =>
        !isPending(
          item.hr_status ||
          item.status
        )
    )

  const phlHistory =
    phlRows.filter(
      (item) =>
        !isPending(
          item.hr_status ||
          item.status
        )
    )

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div>
        <h3 className="mb-3 font-bold">
          Riwayat Cuti / Izin
        </h3>

        <div className="space-y-2">
          {leaveHistory.length ? (
            leaveHistory.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-black/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>
                        {item.full_name ||
                          '-'}
                      </strong>

                      <p className="mt-1 text-xs text-[#6e6e73]">
                        {leaveRequestLabel(
                          item
                        )}{' '}
                        ·{' '}
                        {formatDate(
                          item.start_date
                        )}{' '}
                        –{' '}
                        {formatDate(
                          item.end_date
                        )}
                      </p>
                    </div>

                    <Status
                      value={
                        item.hr_status ||
                        item.status
                      }
                    />
                  </div>
                </div>
              )
            )
          ) : (
            <Empty text="Belum ada riwayat final cuti/izin." />
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold">
          Riwayat PHL
        </h3>

        <div className="space-y-2">
          {phlHistory.length ? (
            phlHistory.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-black/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>
                        {item.full_name ||
                          '-'}
                      </strong>

                      <p className="mt-1 text-xs text-[#6e6e73]">
                        {formatDate(
                          item.phl_date
                        )}{' '}
                        ·{' '}
                        {phlClaimDays(
                          item
                        )}{' '}
                        hari
                      </p>
                    </div>

                    <Status
                      value={
                        item.hr_status ||
                        item.status
                      }
                    />
                  </div>
                </div>
              )
            )
          ) : (
            <Empty text="Belum ada riwayat final PHL." />
          )}
        </div>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function Th({
  children,
}: {
  children:
    ReactNode
}) {
  return (
    <th className="px-4 py-3 font-bold">
      {children}
    </th>
  )
}

function Td({
  children,
}: {
  children:
    ReactNode
}) {
  return (
    <td className="px-4 py-4 align-top">
      {children}
    </td>
  )
}

function NoteModal({
  title,
  value,
  processing,
  onChange,
  onClose,
  onSubmit,
}: {
  title: string
  value: string
  processing: boolean
  onChange:
    (value: string) => void
  onClose:
    () => void
  onSubmit:
    () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">
              {title}
            </h3>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Catatan wajib minimal
              5 karakter untuk audit HR.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7]"
          >
            <X size={17} />
          </button>
        </div>

        <textarea
          value={value}
          onChange={(
            event
          ) =>
            onChange(
              event.target
                .value
            )
          }
          className="harmony-textarea mt-5"
          placeholder="Tuliskan alasan/catatan..."
          disabled={
            processing
          }
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              processing
            }
            className="harmony-button-secondary"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={
              onSubmit
            }
            disabled={
              processing
            }
            className="harmony-button-primary"
          >
            {processing ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <CheckCircle2
                size={16}
              />
            )}

            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  description,
  processing,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  processing: boolean
  onClose:
    () => void
  onConfirm:
    () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <AlertTriangle
          size={24}
          className="text-red-600"
        />

        <h3 className="mt-3 text-lg font-bold">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              processing
            }
            className="harmony-button-secondary"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              processing
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {processing ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Trash2
                size={16}
              />
            )}

            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

function decisionModalTitle(
  kind:
    DecisionTarget['kind']
) {
  if (
    kind ===
    'leave-reject'
  ) {
    return 'Reject Pengajuan Cuti / Izin'
  }

  if (
    kind ===
    'leave-cancel'
  ) {
    return 'Batalkan Pengajuan Approved'
  }

  if (
    kind ===
    'phl-reject'
  ) {
    return 'Reject Klaim PHL'
  }

  return 'Batalkan Klaim PHL Approved'
}

function formatNumber(
  value: unknown
) {
  const n =
    number(value)

  return Number.isInteger(
    n
  )
    ? String(n)
    : n
        .toFixed(1)
        .replace(
          /\.0$/,
          ''
        )
}

function formatSigned(
  value: unknown
) {
  const n =
    number(value)

  return `${
    n >= 0
      ? '+'
      : ''
  }${formatNumber(
    n
  )}`
}