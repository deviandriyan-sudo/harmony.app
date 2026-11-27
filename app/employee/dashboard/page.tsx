'use client'


import { readErrorMessage } from '@/lib/error-utils'
import Link from 'next/link'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, HeartPulse, RefreshCcw, WalletCards } from 'lucide-react'

import { TodayTeamAvailability } from '@/components/employee/TodayTeamAvailability'
import { EmployeeWorkflowProgress, type WorkflowOverview } from '@/components/employee/EmployeeWorkflowProgress'
import { Topbar } from '@/components/layout/Topbar'
import { CompactMetric } from '@/components/dashboard/CompactMetric'
import { getCurrentPeriodMonthWita, getCutoffRange } from '@/lib/attendance-reporting'
import { supabase } from '@/lib/supabase'
import { harmonyFetch } from '@/lib/harmony-client'
import { fetchMyCanonicalLeaveBalance } from '@/lib/employee-leave-balance'
import { formatFullRupiah } from '@/lib/harmony-money'
import { getApprovalStageLabel } from '@/lib/leave-workflow-status'
import { HarmonyPortaledOverlay } from '@/components/ui/HarmonyPortaledOverlay'
import { openPHLWorkEvidence, reviewPHLWorkRequest } from '@/lib/phl-work'
import { sendHarmonyWorkflowNotification } from '@/lib/notifications'
import type { DashboardApprovalItem, DashboardApprovalSummary } from '@/lib/dashboard-approval-types'

type AppUser = {
  id: string
  email: string | null
  role: string | null
  employee_id: string | null
  is_active: boolean | null
}

type Employee = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  annual_leave_balance: number | null
  phl_balance: number | null
}

type BalanceSummary = {
  employee_id: string
  annual_total_available_days: number | null
  phl_total_available_days: number | null
  postpone_active_days: number | null
  postpone_expired_days: number | null
  next_postpone_expiry: string | null
  next_phl_expiry: string | null
  balance_integrity_status?: 'ok' | 'mismatch' | 'summary_only'
  balance_integrity_difference_days?: number | null
}

type AttendanceRow = {
  attendance_date: string | null
  check_in: string | null
  check_out: string | null
  manual_check_in?: string | null
  manual_check_out?: string | null
  status: string | null
}

type RequestItem = {
  id: string
  type: 'leave' | 'phl' | 'debt'
  label: string
  date: string
  status: string
  reason: string
  createdAt: string
}

type AnnualLeaveDebtHistoryItem = {
  id: string
  original_days: number | null
  remaining_days: number | null
  status: string | null
  origin: string | null
  apply_from_maturity: string | null
  created_at: string | null
  updated_at: string | null
  applied_days: number | null
  last_applied_at: string | null
}

type AnnualLeaveDebtHistoryResponse = {
  success?: boolean
  outstanding_days?: number | null
  next_maturity?: string | null
  debts?: AnnualLeaveDebtHistoryItem[]
}

export default function EmployeeDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [, setRequests] = useState<RequestItem[]>([])
  const [attendancePeriodStatus, setAttendancePeriodStatus] = useState<string | null>(null)
  const [remedAvailable, setRemedAvailable] = useState<number | null>(null)
  const [scaleupProgress, setScaleupProgress] = useState<WorkflowOverview>(null)
  const [remedProgress, setRemedProgress] = useState<WorkflowOverview>(null)
  const [scaleupUnavailable, setScaleupUnavailable] = useState(false)
  const [remedUnavailable, setRemedUnavailable] = useState(false)
  const [supervisorApprovals, setSupervisorApprovals] = useState<DashboardApprovalSummary | null>(null)
  const [approvalModal, setApprovalModal] = useState<{item:DashboardApprovalItem;decision:'approve' | 'reject'} | null>(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [approvalReviewed, setApprovalReviewed] = useState(false)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [approvalFeedback, setApprovalFeedback] = useState<{ok:boolean;text:string} | null>(null)
  const [debtOutstandingDays, setDebtOutstandingDays] = useState<number | null>(null)
  const [debtNextMaturity, setDebtNextMaturity] = useState<string | null>(null)

  const periodMonth = useMemo(() => getCurrentPeriodMonthWita(), [])
  const periodRange = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const onInitialLoad = useEffectEvent(fetchDashboardData)
  useEffect(() => {
    void onInitialLoad()
  }, [])

  // A long-open dashboard must not keep showing yesterday's leave entitlement
  // or an outdated Re-Med amount after HR approvals or annual maturity.
  const onBalanceVisibilityRefresh = useEffectEvent(refreshLiveBalances)
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void onBalanceVisibilityRefresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(timer)
    }
  }, [])

  async function refreshSupervisorQueue() {
    try {
      const next = await harmonyFetch<DashboardApprovalSummary>('/api/employee/dashboard/approval-summary')
      setSupervisorApprovals(next)
    } catch {
      // Approval queue is an optional dashboard card. Never block other balances.
    }
  }

  function openApproval(item:DashboardApprovalItem, decision:'approve' | 'reject') {
    if (item.kind === 'attendance' || item.requiresHr) return
    if (decision === 'approve' && !item.canApprove) return
    if (decision === 'reject' && !item.canReject) return
    setApprovalModal({item,decision})
    setApprovalNote(decision === 'approve' ? 'Dokumen dan pengajuan telah diperiksa, disetujui oleh atasan.' : '')
    setApprovalReviewed(false)
    setApprovalFeedback(null)
  }

  async function submitApproval() {
    if (!approvalModal || approvalBusy) return
    const {item, decision} = approvalModal
    const note = approvalNote.trim()
    if (decision === 'reject' && note.length < 3) {
      setApprovalFeedback({ok:false,text:'Alasan penolakan minimal 3 karakter.'})
      return
    }
    if (decision === 'approve' && !approvalReviewed) {
      setApprovalFeedback({ok:false,text:'Periksa detail dan konfirmasikan sebelum menyetujui.'})
      return
    }
    setApprovalBusy(true)
    setApprovalFeedback(null)
    try {
      let savedMessage = 'Keputusan tersimpan.'
      if (item.kind === 'work') {
        const result = await reviewPHLWorkRequest(item.recordId,decision,note)
        savedMessage = result.message || savedMessage
      } else if (item.kind === 'leave' || item.kind === 'claim') {
        const result = await harmonyFetch<{success:boolean;message:string}>('/api/employee/dashboard/approval-decision', {
          method:'POST', body:JSON.stringify({id:item.recordId,kind:item.kind,decision,note}),
        })
        savedMessage = result.message || savedMessage
        // Identical supervisor decision workflow notification as the existing Approval Tim form.
        try {
          const notification = await sendHarmonyWorkflowNotification({
            workflow:'supervisor_leave_decision', entityId:item.recordId,
            data:{sourceTable:item.kind === 'claim' ? 'phl_records' : 'leave_requests',requestTypeLabel:item.category,decision:decision === 'approve' ? 'approved' : 'rejected',note},
          })
          if (!notification.ok) savedMessage += ' Notifikasi email perlu diperiksa oleh HR.'
        } catch {
          savedMessage += ' Notifikasi email perlu diperiksa oleh HR.'
        }
      } else return
      setApprovalModal(null)
      setApprovalFeedback({ok:true,text:savedMessage})
      await Promise.allSettled([refreshSupervisorQueue(), refreshLiveBalances()])
    } catch (error:unknown) {
      setApprovalFeedback({ok:false,text:readErrorMessage(error) || 'Keputusan gagal diproses.'})
      await refreshSupervisorQueue()
    } finally {
      setApprovalBusy(false)
    }
  }

  async function refreshLiveBalances() {
    void refreshSupervisorQueue()
    const [leaveResult, remedResult, debtResult] = await Promise.allSettled([
      fetchMyCanonicalLeaveBalance<BalanceSummary>(),
      harmonyFetch<{ entitlement?: { available_amount?: number | null } | null }>('/api/remed/dashboard'),
      supabase.rpc('harmony_get_my_annual_leave_debt_history_v1'),
    ])
    if (leaveResult.status === 'fulfilled') {
      setBalance(leaveResult.value.balance)
      setBalanceWarning(leaveResult.value.warning)
    } else {
      setBalance(null)
      setBalanceWarning('Saldo cuti belum dapat disinkronkan. Refresh atau hubungi HR.')
    }
    if (remedResult.status === 'fulfilled') {
      const amount = remedResult.value.entitlement?.available_amount
      const parsed = amount == null ? NaN : Number(amount)
      setRemedAvailable(Number.isFinite(parsed) ? parsed : null)
    } else {
      setRemedAvailable(null)
    }
    if (debtResult.status === 'fulfilled' && !debtResult.value.error) {
      const debt = (debtResult.value.data || {}) as AnnualLeaveDebtHistoryResponse
      setDebtOutstandingDays(Math.max(0, Number(debt.outstanding_days || 0)))
      setDebtNextMaturity(debt.next_maturity || null)
    } else {
      setDebtOutstandingDays(null)
      setDebtNextMaturity(null)
    }
  }

  async function fetchDashboardData() {
    setLoading(true)
    setRefreshing(true)
    setMessage('')
    setBalanceWarning(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw new Error('Session tidak ditemukan. Silakan login ulang.')

      const { data: appUserData, error: appUserError } = await supabase
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .eq('id', authData.user.id)
        .maybeSingle<AppUser>()

      if (appUserError) throw appUserError
      if (!appUserData || appUserData.is_active === false) throw new Error('Akun HARMONY tidak aktif atau belum terdaftar.')

      setAppUser(appUserData)

      let employeeData: Employee | null = null
      if (appUserData.employee_id) {
        const response = await supabase.from('employees').select('*').eq('id', appUserData.employee_id).maybeSingle<Employee>()
        if (response.error) throw response.error
        employeeData = response.data || null
      }


      if (!employeeData) throw new Error('Akun belum terhubung ke data employee. Hubungi HR.')
      setEmployee(employeeData)
      // Optional read-only dashboard summaries; failure must never block salary,
      // leave balance, attendance or existing request workflows.
      const [attendanceSummary, remedSummary, supervisorSummary, scaleupSummary] = await Promise.allSettled([
        supabase.from('attendance_period_confirmations').select('employee_status,supervisor_status,hr_status,is_locked').eq('employee_id',employeeData.id).eq('period_month',periodMonth).maybeSingle(),
        harmonyFetch<{entitlement?:{available_amount?:number}|null}>('/api/remed/dashboard'),
        harmonyFetch<DashboardApprovalSummary>('/api/employee/dashboard/approval-summary'),
        harmonyFetch<{ requests: { requester_employee_id: string; training?: {title?:string}; approval_status: string; stages?: {stage_order:number;label:string;status:string}[]; submitted_at?:string }[] }>('/api/scaleup'),
      ])
      setAttendancePeriodStatus(attendanceSummary.status==='fulfilled' && !attendanceSummary.value.error
        ? (attendanceSummary.value.data?.is_locked ? 'Final' : attendanceSummary.value.data?.employee_status||'Belum konfirmasi') : null)
      const remedInitialAmount = remedSummary.status === 'fulfilled'
        ? remedSummary.value.entitlement?.available_amount
        : null
      const remedInitialNumber = remedInitialAmount == null ? NaN : Number(remedInitialAmount)
      setRemedAvailable(Number.isFinite(remedInitialNumber) ? remedInitialNumber : null)
      setSupervisorApprovals(supervisorSummary.status==='fulfilled'?supervisorSummary.value:null)
      setScaleupUnavailable(scaleupSummary.status !== 'fulfilled')
      setRemedUnavailable(remedSummary.status !== 'fulfilled' || (remedSummary.status === 'fulfilled' && (remedSummary.value as {role?:string}).role !== 'employee'))
      if (scaleupSummary.status === 'fulfilled') {
        const mine = (scaleupSummary.value.requests || []).filter(row=>row.requester_employee_id===employeeData.id)
        const latest = mine[0]
        const stages=(latest?.stages || []).slice().sort((a,b)=>a.stage_order-b.stage_order)
        const finalStatus=String(latest?.approval_status||'').toLowerCase()
        setScaleupProgress(latest ? {
          title: latest.training?.title || 'Training Request',
          subtitle: latest.submitted_at ? `Diajukan ${new Date(latest.submitted_at).toLocaleDateString('id-ID')}` : 'Progres persetujuan',
          status: finalStatus==='approved'?'Disetujui':finalStatus==='rejected'?'Ditolak':finalStatus==='revision_required'?'Perlu revisi':'Dalam proses',
          steps: stages.length>0 ? stages.map(stage=>({
            label: stage.label,
            status: stage.status==='approved'?'done' as const:stage.status==='rejected'?'rejected' as const:stage.status==='pending'?'current' as const:'waiting' as const,
          })) : [{label:finalStatus==='approved'?'Disetujui':'Pengajuan',status:finalStatus==='approved'?'done' as const:'current' as const}],
        } : null)
      } else setScaleupProgress(null)
      if (remedSummary.status === 'fulfilled') {
        const data=remedSummary.value as { recentClaims?: {status:string;claim_number?:string;created_at?:string}[] }
        const latest=(data as {role?:string}).role==='employee'?data.recentClaims?.[0]:undefined
        const status=String(latest?.status||'')
        const phase=status==='pending_hr'||status==='rejected_hr'?1:status==='pending_finance'||status==='rejected_finance'?2:status==='waiting_payment'?3:status==='paid'?4:0
        const stopped=status.startsWith('rejected') || status==='cancelled'
        const labels=['Pengajuan','Review HR','Review Finance','Pembayaran','Selesai']
        const statusNames:Record<string,string>={pending_hr:'Menunggu HR',pending_finance:'Menunggu Finance',waiting_payment:'Menunggu pembayaran',paid:'Sudah dibayar',rejected_hr:'Ditolak HR',rejected_finance:'Ditolak Finance',cancelled:'Dibatalkan',legacy_record:'Arsip'}
        setRemedProgress(latest?{
          title:latest.claim_number||'Klaim Re-Med',
          subtitle:latest.created_at?`Diajukan ${new Date(latest.created_at).toLocaleDateString('id-ID')}`:'Progres klaim',
          status:statusNames[status]||'Periksa status',
          steps:labels.map((label,index)=>({label,status:status==='paid'?'done' as const:stopped && index===phase?'rejected' as const:index<phase?'done' as const:index===phase?'current' as const:'waiting' as const})),
        }:null)
      } else setRemedProgress(null)

      const canonicalBalance = await fetchMyCanonicalLeaveBalance<BalanceSummary>()
      setBalance(canonicalBalance.balance)
      setBalanceWarning(canonicalBalance.warning)

      const [
        attendanceResponse,
        leaveResponse,
        phlResponse,
        pendingLeaveResponse,
        pendingPHLResponse,
      ] = await Promise.all([
        supabase
          .from('attendance_logs')
          .select('attendance_date,check_in,check_out,manual_check_in,manual_check_out,status')
          .eq('employee_id', employeeData.id)
          .is('deleted_at', null)
          .gte('attendance_date', periodRange.start)
          .lte('attendance_date', periodRange.end)
          .order('attendance_date', { ascending: false }),
        supabase
          .from('leave_requests')
          .select('id,request_type,leave_type,start_date,end_date,status,supervisor_status,hr_status,reason,created_at')
          .eq('employee_id', employeeData.id)
          .neq('request_type', 'phl_claim')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('phl_records')
          .select('id,phl_date,status,supervisor_status,hr_status,reason,created_at')
          .eq('employee_id', employeeData.id)
          .eq('source', 'employee_phl_claim')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('leave_requests')
          .select('status,supervisor_status,hr_status')
          .eq('employee_id', employeeData.id)
          .neq('request_type', 'phl_claim'),
        supabase
          .from('phl_records')
          .select('status,supervisor_status,hr_status')
          .eq('employee_id', employeeData.id)
          .eq('source', 'employee_phl_claim'),
      ])

      if (attendanceResponse.error) throw attendanceResponse.error
      setAttendance((attendanceResponse.data || []) as AttendanceRow[])

      if (leaveResponse.error) throw leaveResponse.error
      if (phlResponse.error) throw phlResponse.error
      if (pendingLeaveResponse.error) throw pendingLeaveResponse.error
      if (pendingPHLResponse.error) throw pendingPHLResponse.error


      let debtItems: RequestItem[] = []

      const debtResponse = await supabase.rpc(
        'harmony_get_my_annual_leave_debt_history_v1',
      )

      if (!debtResponse.error) {
        const debtData = (debtResponse.data || {}) as AnnualLeaveDebtHistoryResponse

        setDebtOutstandingDays(Number(debtData.outstanding_days || 0))
        setDebtNextMaturity(debtData.next_maturity || null)

        debtItems = (debtData.debts || []).map((row) => {
          const originalDays = Number(row.original_days || 0)
          const remainingDays = Number(row.remaining_days || 0)
          const appliedDays = Number(row.applied_days || 0)
          const isLegacy = normalizeStatus(row.origin) === 'legacy_existing_credit'
          const statusLabel = labelDebtStatus(row.status)
          const targetText = row.apply_from_maturity
            ? `Target pelunasan ${formatDate(row.apply_from_maturity)}`
            : 'Target pelunasan belum tersedia'

          let reason = isLegacy
            ? `Hutang cuti lama ${originalDays} hari. Saldo advance sudah pernah diberikan sebelum fitur hutang cuti aktif.`
            : `Advance cuti ${originalDays} hari diberikan lebih awal dan akan diperhitungkan pada hak cuti tahunan berikutnya.`

          if (remainingDays > 0) {
            reason += ` Sisa hutang ${remainingDays} hari. ${targetText}.`
          } else {
            reason += ` Hutang sudah lunas${appliedDays > 0 ? ` (${appliedDays} hari telah diperhitungkan)` : ''}.`
          }

          return {
            id: row.id,
            type: 'debt' as const,
            label: isLegacy ? 'Hutang Cuti Legacy' : 'Hutang Cuti',
            date:
              remainingDays > 0
                ? targetText
                : row.last_applied_at
                  ? `Dilunasi ${formatDateTime(row.last_applied_at)}`
                  : 'Status hutang selesai',
            status: statusLabel,
            reason,
            createdAt: String(row.created_at || row.updated_at || ''),
          }
        })
      } else {
        // Dashboard tetap boleh dipakai bila migration FEATURE-011 V2.1
        // belum terpasang. Hutang hanya tidak ditampilkan sampai RPC tersedia.
        setDebtOutstandingDays(null)
        setDebtNextMaturity(null)
      }

      const leaveItems: RequestItem[] = (leaveResponse.data || []).map((row) => ({
        id: row.id,
        type: 'leave',
        label: row.leave_type || labelRequestType(row.request_type),
        date:
          row.start_date && row.end_date && row.start_date !== row.end_date
            ? `${formatDate(row.start_date)} – ${formatDate(row.end_date)}`
            : formatDate(row.start_date),
        status: getApprovalStageLabel(row),
        reason: row.reason || '-',
        createdAt: String(row.created_at || ''),
      }))

      const phlItems: RequestItem[] = (phlResponse.data || []).map((row) => ({
        id: row.id,
        type: 'phl',
        label: 'Klaim PHL',
        date: formatDate(row.phl_date),
        status: getApprovalStageLabel(row),
        reason: row.reason || '-',
        createdAt: String(row.created_at || ''),
      }))

      // Canonical employee history feed:
      // - leave/izin/sakit/ST hanya dari leave_requests non-PHL
      // - klaim PHL hanya dari phl_records source=employee_phl_claim
      // - hutang cuti hanya dari employee-safe debt RPC (read-only)
      // Hutang TIDAK ikut Pending Request karena bukan workflow approval.
      setRequests(
        [...leaveItems, ...phlItems, ...debtItems]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 10),
      )
    } catch (error: unknown) {
      setMessage(readErrorMessage(error) || 'Dashboard employee gagal dimuat.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const recordedAttendance = attendance.filter(row=>Boolean(row.check_in || row.check_out || row.manual_check_in || row.manual_check_out)).length
  const annualBalance = balance ? Number(balance.annual_total_available_days) : null
  const phlBalance = Number(balance?.phl_total_available_days ?? employee?.phl_balance ?? 0)
  return <>
    <Topbar title="Beranda" compact />
    <main className="harmony-rc2o harmony-rc2o-employee harmony-glass-showcase mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      {approvalFeedback && <div role={approvalFeedback.ok ? 'status' : 'alert'} className={approvalFeedback.ok ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800' : 'rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800'}>{approvalFeedback.text}</div>}
      {message&&<div role="alert" className="harmony-rc2o-error flex items-center gap-2 rounded-2xl p-3 text-sm"><AlertTriangle size={16}/>{message}</div>}
      {balanceWarning&&<div role="status" className="harmony-rc2o-error flex items-center gap-2 rounded-2xl p-3 text-sm"><AlertTriangle size={16}/>{balanceWarning}</div>}
      <section className="harmony-rc2o-hero harmony-rc2q-employee-hero flex min-h-[140px] flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-7">
        <div className="relative z-10 min-w-0"><p className="harmony-rc2o-hero-kicker">Beranda Karyawan</p><h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">Ringkasan kepegawaian</h1><p className="mt-1 text-sm">{employee?.full_name || appUser?.email || 'Karyawan'} · {employee?.department||'Unit kerja belum tersedia'}</p><p className="mt-2 text-xs opacity-80">{periodRange.label} · {attendancePeriodStatus ? `Absensi: ${attendancePeriodStatus}`:'Status konfirmasi absensi belum tersedia'}</p></div>
        <div className="relative z-10 flex flex-wrap gap-2"><Link href="#harmony-approval-progress" className="harmony-rc2o-hero-button harmony-liquid-lit inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold">Lihat Progres <ArrowRight size={14}/></Link><Link href="/employee/leave" className="harmony-rc2o-hero-button harmony-liquid-lit inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold">Ajukan Cuti / Izin</Link><button type="button" onClick={()=>void fetchDashboardData()} disabled={refreshing} aria-label="Refresh dashboard" className="harmony-rc2o-hero-button harmony-liquid-lit flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-60"><RefreshCcw size={16} className={refreshing?'animate-spin':''}/></button></div>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy={loading}>
        <CompactMetric label="Saldo Cuti" value={loading?'…':annualBalance===null?'—':`${annualBalance} hari`} icon={CalendarDays} href="/employee/leave"/>
        <CompactMetric label="Saldo PHL" value={loading?'…':`${phlBalance} hari`} icon={WalletCards} href="/employee/phl" accent="green"/>
        <CompactMetric label="Status Kehadiran" value={loading?'…':attendancePeriodStatus||`${recordedAttendance} tercatat`} icon={CheckCircle2} href="/employee/attendance"/>
        <CompactMetric label="Sisa Plafond Re-Med" value={loading?'…':formatFullRupiah(remedAvailable)} icon={HeartPulse} href="/remed/employee/dashboard" accent="amber" fullValue/>
      </div>
      {debtOutstandingDays !== null && debtOutstandingDays > 0 && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-medium text-amber-900">
          Hutang cuti: {debtOutstandingDays} hari · otomatis dipotong dari hak cuti baru pada {debtNextMaturity ? formatDate(debtNextMaturity) : 'tanggal matang berikutnya'}.
        </div>
      )}
      <div className="flex justify-end"><Link href="/employee/phl" className="harmony-rc2o-link text-xs font-semibold">Ajukan Saldo PHL →</Link></div>
      <EmployeeWorkflowProgress scaleup={scaleupProgress} remed={remedProgress} scaleupUnavailable={scaleupUnavailable} remedUnavailable={remedUnavailable}/>
      {supervisorApprovals && supervisorApprovals.total > 0 && (
        <section className="harmony-rc2o-panel overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-2 p-4 sm:p-5">
            <div>
              <h2 className="harmony-rc2o-panel-title">Informasi & Approval Tim</h2>
              <p className="harmony-rc2o-muted mt-1 text-xs">{supervisorApprovals.actionableTotal} pengajuan dapat diputuskan langsung; {supervisorApprovals.blockedTotal} data migrasi perlu review HR.</p>
            </div>
            <Link href="/employee/approvals" className="harmony-rc2o-link text-xs font-semibold">Buka Approval Tim →</Link>
          </div>
          <div className="harmony-rc2o-divider" />
          {supervisorApprovals.items.map((item) => (
            <div key={item.id} className="harmony-rc2o-row flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0">
              <div className="min-w-[180px] flex-1">
                <p className="harmony-rc2o-strong truncate text-sm font-semibold">{item.name}</p>
                <p className="harmony-rc2o-muted mt-0.5 text-xs">{item.category} · {item.date}</p>
                {(!item.canApprove || item.requiresHr) && <p className="mt-1 text-xs font-medium text-amber-800">{item.status}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {item.canApprove && <button type="button" onClick={() => openApproval(item,'approve')} className="harmony-rc2o-approve rounded-full px-4 py-2 text-xs font-semibold">Setujui</button>}
                {item.canReject && <button type="button" onClick={() => openApproval(item,'reject')} className="harmony-rc2o-reject rounded-full px-4 py-2 text-xs font-semibold">Tolak</button>}
                <Link href={item.href} className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white">{item.requiresHr ? 'Lihat · perlu HR' : item.kind === 'attendance' ? 'Tinjau absensi' : 'Detail'}</Link>
              </div>
            </div>
          ))}
          <p className="harmony-rc2o-muted border-t px-4 py-3 text-xs">Cuti, klaim PHL, dan pengajuan saldo PHL diproses dari dialog Dashboard. Persetujuan absensi periode tetap harus melalui detail harian; data migrasi kedaluwarsa memerlukan validasi HR dengan catatan.</p>
        </section>
      )}
      <TodayTeamAvailability/>
    </main>
    {approvalModal && (
      <HarmonyPortaledOverlay role="dialog" aria-modal="true" aria-label="Persetujuan dari Dashboard" className="fixed inset-0 z-[140] flex items-center justify-center p-4">
        <button type="button" aria-label="Tutup dialog" onClick={() => !approvalBusy && setApprovalModal(null)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
        <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_32px_95px_rgba(15,23,42,.27)] backdrop-blur-2xl">
          <h2 className="text-xl font-semibold text-slate-900">{approvalModal.decision === 'approve' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">{approvalModal.item.name} · {approvalModal.item.category}</p>
          <p className="mt-1 text-xs text-slate-500">Tanggal {approvalModal.item.date} · {approvalModal.item.status}</p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Alasan / Penugasan</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{approvalModal.item.description}</p>
            {approvalModal.item.extra && <p className="mt-2 text-xs text-slate-600">{approvalModal.item.extra}</p>}
          </div>
          {(approvalModal.item.attachments || []).length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-slate-700">Evidence PHL</p>
              {approvalModal.item.attachments?.map((file) => (
                <button key={file.id} type="button" onClick={() => void openPHLWorkEvidence(file.id).catch((error:unknown) => setApprovalFeedback({ok:false,text:readErrorMessage(error) || 'Evidence gagal dibuka.'}))} className="mr-2 mb-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100">{file.fileName}</button>
              ))}
            </div>
          )}
          <Link href={approvalModal.item.href} className="mt-2 inline-flex text-xs font-semibold text-blue-700 underline underline-offset-4">Buka halaman detail pengajuan</Link>
          <label htmlFor="rc3g-approval-note" className="mt-4 block text-xs font-semibold text-slate-700">{approvalModal.decision === 'reject' ? 'Alasan penolakan (wajib)' : 'Catatan persetujuan'}</label>
          <textarea id="rc3g-approval-note" maxLength={2000} rows={3} value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
          {approvalModal.decision === 'approve' && (
            <label className="mt-3 flex items-start gap-2 text-sm text-slate-800"><input type="checkbox" checked={approvalReviewed} onChange={(event) => setApprovalReviewed(event.target.checked)} className="mt-1" /> Saya sudah memeriksa rincian dan dokumen pendukung serta memahami akibat persetujuan.</label>
          )}
          {approvalFeedback && !approvalFeedback.ok && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{approvalFeedback.text}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={approvalBusy} onClick={() => setApprovalModal(null)} className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700">Batal</button>
            <button type="button" disabled={approvalBusy || (approvalModal.decision === 'approve' && !approvalReviewed) || (approvalModal.decision === 'reject' && approvalNote.trim().length < 3)} onClick={() => void submitApproval()} className={approvalModal.decision === 'approve' ? 'rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50' : 'rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50'}>{approvalBusy ? 'Memproses...' : approvalModal.decision === 'approve' ? 'Konfirmasi Setujui' : 'Konfirmasi Tolak'}</button>
          </div>
        </div>
      </HarmonyPortaledOverlay>
    )}
  </>
}



function labelDebtStatus(value: unknown) {
  const status = normalizeStatus(value)
  if (status === 'settled') return 'Lunas'
  if (status === 'partially_applied') return 'Sebagian Terbayar'
  if (status === 'cancelled') return 'Dibatalkan'
  return 'Menunggu Pelunasan'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function normalizeStatus(value: unknown) { return String(value || '').trim().toLowerCase() }
function labelRequestType(value: unknown) {
  const key = normalizeStatus(value)
  const map: Record<string, string> = { annual_leave: 'Cuti Tahunan', sick: 'Sakit', permit: 'Izin', official_travel: 'Tugas Luar' }
  return map[key] || String(value || 'Pengajuan').replace(/_/g, ' ')
}
function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
