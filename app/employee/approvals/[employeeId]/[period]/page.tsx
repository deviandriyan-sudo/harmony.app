'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  RefreshCcw,
  ShieldCheck,
  Timer,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

type EmployeeProfile = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  supervisor_1: string | null
  supervisor_2: string | null
  is_active: boolean | null
}

type AttendanceLog = {
  id: string
  upload_id: string | null
  employee_id: string | null
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  attendance_date: string

  check_in: string | null
  check_out: string | null
  manual_check_in: string | null
  manual_check_out: string | null
  requested_check_in: string | null
  requested_check_out: string | null

  total_punches: number | null
  status: string | null
  source: string | null
  notes: string | null
  work_duration_minutes: number | null

  correction_status: string | null
  correction_type: string | null
  correction_reason: string | null
  correction_notes: string | null
  correction_proof_url: string | null
  correction_proof_name: string | null
  correction_submitted_by: string | null
  correction_submitted_role: string | null
  correction_submitted_at: string | null

  employee_confirmation_status: string | null
  employee_confirmed_at: string | null
  employee_confirmation_batch_id: string | null
  employee_daily_note: string | null

  supervisor_approval_status: string | null
  supervisor_approved_by: string | null
  supervisor_approved_at: string | null
  supervisor_reviewed_by: string | null
  supervisor_reviewed_at: string | null
  supervisor_note: string | null

  hr_approval_status: string | null
  hr_approved_by: string | null
  hr_approved_at: string | null
  hr_final_status: string | null
  hr_finalized_at: string | null
  hr_finalized_by: string | null
  hr_note: string | null

  is_phl_candidate: boolean | null
  phl_proof_url: string | null
  phl_proof_name: string | null
  absence_proof_url: string | null
  absence_proof_name: string | null

  absence_request_type: string | null
  absence_request_label: string | null
  absence_request_status: string | null
  absence_request_source: string | null

  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  deleted_by: string | null
}

type Holiday = {
  id: string
  holiday_date: string
  holiday_name: string
  holiday_type: string | null
  is_active: boolean | null
}

type PeriodConfirmation = {
  id: string
  employee_id: string

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null

  period_month: string
  period_start: string
  period_end: string

  employee_status: string | null
  employee_submitted_at: string | null
  employee_submitted_by: string | null

  supervisor_status: string | null
  supervisor_id: string | null
  supervisor_name: string | null
  supervisor_approved_at: string | null
  supervisor_rejected_at: string | null
  supervisor_note: string | null

  hr_status: string | null
  hr_finalized_at: string | null
  hr_finalized_by: string | null
  hr_note: string | null

  total_work_days: number | null
  total_present_days: number | null
  total_late_days: number | null
  total_incomplete_days: number | null
  total_absent_days: number | null
  total_sick_days: number | null
  total_permit_days: number | null
  total_leave_days: number | null
  total_phl_days: number | null
  total_holiday_work_days: number | null

  annual_leave_matured: boolean | null
  annual_leave_matured_date: string | null
  leave_allowance_eligible: boolean | null

  is_locked: boolean | null
  locked_by: string | null
  locked_at: string | null
  unlocked_by: string | null
  unlocked_at: string | null
  lock_note: string | null

  created_at: string | null
  updated_at: string | null
}

type CalendarRow = {
  date: string
  day_name: string
  is_weekend: boolean
  holiday_name: string | null
  holiday_type: string | null
  log: AttendanceLog | null
  status: string
}

type RejectTarget =
  | {
      type: 'period'
      id: string
      name: string
    }
  | {
      type: 'daily'
      id: string
      name: string
      date: string
    }

type DailyAction = 'approve' | 'reject'

export default function EmployeeApprovalDetailPage() {
  const params = useParams()

  const employeeId = String(params?.employeeId || '')
  const periodMonth = String(params?.periodMonth || '')

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [currentSupervisor, setCurrentSupervisor] = useState<EmployeeProfile | null>(null)
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null)

  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [periodConfirmation, setPeriodConfirmation] = useState<PeriodConfirmation | null>(null)

  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null)
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState('')
  const [processingPeriod, setProcessingPeriod] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const periodRange = useMemo(() => {
    return getCutoffRange(periodMonth)
  }, [periodMonth])

  const isLocked = Boolean(periodConfirmation?.is_locked)

  const isFinalHR =
    normalizeStatus(periodConfirmation?.hr_status) === 'finalized'

  const isPeriodAlreadyProcessed =
    normalizeStatus(periodConfirmation?.supervisor_status) === 'approved' ||
    normalizeStatus(periodConfirmation?.supervisor_status) === 'rejected'

  const isReadOnly = isLocked || isFinalHR || isPeriodAlreadyProcessed

  const calendarRows = useMemo(() => {
    const dates = getDateRange(periodRange.start, periodRange.end)

    return dates.map((date) => {
      const log = logs.find((item) => item.attendance_date === date) || null
      const holiday = holidays.find((item) => item.holiday_date === date) || null
      const isWeekend = isWeekendDate(date)

      return {
        date,
        day_name: formatDayName(date),
        is_weekend: isWeekend,
        holiday_name: holiday?.holiday_name || null,
        holiday_type: holiday?.holiday_type || null,
        log,
        status: getDayStatus(log, isWeekend, Boolean(holiday)),
      }
    })
  }, [logs, holidays, periodRange.start, periodRange.end])

  const submittedLogs = useMemo(() => {
    return logs.filter((item) => {
      return normalizeStatus(item.employee_confirmation_status) === 'submitted'
    })
  }, [logs])

  const pendingDailyCount = submittedLogs.filter((item) => {
    return normalizeStatus(item.supervisor_approval_status) === 'pending'
  }).length

  const approvedDailyCount = submittedLogs.filter((item) => {
    return normalizeStatus(item.supervisor_approval_status) === 'approved'
  }).length

  const rejectedDailyCount = submittedLogs.filter((item) => {
    return normalizeStatus(item.supervisor_approval_status) === 'rejected'
  }).length

  const phlCount = submittedLogs.filter((item) => {
    return Boolean(item.is_phl_candidate)
  }).length

  const absenceRequestCount = submittedLogs.filter((item) => {
    return Boolean(item.absence_request_type)
  }).length

  const presentCount = calendarRows.filter((row) => {
    return getDisplayStatus(row) === 'present'
  }).length

  const absentCount = calendarRows.filter((row) => {
    return getDisplayStatus(row) === 'absent' || getDisplayStatus(row) === 'no_record'
  }).length

  useEffect(() => {
    fetchData()
  }, [employeeId, periodMonth])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setSelectedLog(null)
    setRejectTarget(null)
    setRejectReason('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session user belum ditemukan. Silakan login ulang.')
      setLoading(false)
      return
    }

    const { data: appUserData, error: appUserError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    if (appUserError) {
      setErrorMessage(appUserError.message)
      setLoading(false)
      return
    }

    if (!appUserData?.employee_id) {
      setErrorMessage('Akun belum terhubung ke data employee.')
      setLoading(false)
      return
    }

    setAppUser(appUserData)

    const { data: supervisorData, error: supervisorError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', appUserData.employee_id)
      .maybeSingle<EmployeeProfile>()

    if (supervisorError) {
      setErrorMessage(supervisorError.message)
      setLoading(false)
      return
    }

    setCurrentSupervisor(supervisorData || null)

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle<EmployeeProfile>()

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setLoading(false)
      return
    }

    if (!employeeData) {
      setErrorMessage('Data employee bawahan tidak ditemukan.')
      setLoading(false)
      return
    }

    setEmployee(employeeData)

    const { data: confirmationData } = await supabase
      .from('attendance_period_confirmations')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('period_month', periodMonth)
      .maybeSingle<PeriodConfirmation>()

    setPeriodConfirmation(confirmationData || null)

    const { data: holidayData } = await supabase
      .from('holidays')
      .select('*')
      .eq('is_active', true)
      .gte('holiday_date', periodRange.start)
      .lte('holiday_date', periodRange.end)
      .order('holiday_date', { ascending: true })

    setHolidays(holidayData || [])

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .is('deleted_at', null)
      .gte('attendance_date', periodRange.start)
      .lte('attendance_date', periodRange.end)
      .order('attendance_date', { ascending: true })

    if (attendanceError) {
      setErrorMessage(attendanceError.message)
      setLogs([])
      setLoading(false)
      return
    }

    setLogs(attendanceData || [])
    setLoading(false)
  }

  function getSupervisorName() {
    return currentSupervisor?.full_name || appUser?.email || 'Supervisor'
  }

  function ensureCanProcess() {
    if (isLocked) {
      setErrorMessage('Periode ini sudah dikunci HR. Approval tidak bisa diproses sampai HR membuka lock.')
      return false
    }

    if (isFinalHR) {
      setErrorMessage('Periode ini sudah Final HR. Approval tidak bisa diubah.')
      return false
    }

    if (isPeriodAlreadyProcessed) {
      setErrorMessage('Periode ini sudah diproses atasan. Hubungi HR jika perlu revisi.')
      return false
    }

    return true
  }

  async function handleDailyApproval(log: AttendanceLog, action: DailyAction, note = '') {
    if (!ensureCanProcess()) return

    setProcessingId(log.id)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()
    const supervisorName = getSupervisorName()

    const updatePayload =
      action === 'approve'
        ? {
            supervisor_approval_status: 'approved',
            supervisor_approved_by: supervisorName,
            supervisor_approved_at: now,
            supervisor_reviewed_by: supervisorName,
            supervisor_reviewed_at: now,
            supervisor_note: note || 'Disetujui oleh atasan.',
            hr_final_status: 'ready_for_hr',
            absence_request_status: log.absence_request_type ? 'approved_supervisor' : log.absence_request_status,
            updated_at: now,
          }
        : {
            supervisor_approval_status: 'rejected',
            supervisor_approved_by: null,
            supervisor_approved_at: null,
            supervisor_reviewed_by: supervisorName,
            supervisor_reviewed_at: now,
            supervisor_note: note || 'Ditolak oleh atasan.',
            hr_final_status: 'rejected_by_supervisor',
            absence_request_status: log.absence_request_type ? 'rejected_supervisor' : log.absence_request_status,
            updated_at: now,
          }

    const { error } = await supabase
      .from('attendance_logs')
      .update(updatePayload)
      .eq('id', log.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessingId('')
      return
    }

    setSuccessMessage(
      action === 'approve'
        ? `Absensi ${formatDisplayDate(log.attendance_date)} berhasil disetujui.`
        : `Absensi ${formatDisplayDate(log.attendance_date)} berhasil ditolak.`
    )

    setProcessingId('')
    await fetchData()
  }

  async function handleApprovePeriod() {
    if (!ensureCanProcess()) return

    setProcessingPeriod(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!periodConfirmation) {
      setErrorMessage('Data konfirmasi periode belum tersedia.')
      setProcessingPeriod(false)
      return
    }

    const now = new Date().toISOString()
    const supervisorName = getSupervisorName()

    const pendingLogs = logs.filter((item) => {
      return normalizeStatus(item.employee_confirmation_status) === 'submitted' &&
        normalizeStatus(item.supervisor_approval_status) !== 'approved'
    })

    for (const log of pendingLogs) {
      const { error } = await supabase
        .from('attendance_logs')
        .update({
          supervisor_approval_status: 'approved',
          supervisor_approved_by: supervisorName,
          supervisor_approved_at: now,
          supervisor_reviewed_by: supervisorName,
          supervisor_reviewed_at: now,
          supervisor_note: 'Disetujui oleh atasan dalam approval periode.',
          hr_final_status: 'ready_for_hr',
          absence_request_status: log.absence_request_type ? 'approved_supervisor' : log.absence_request_status,
          updated_at: now,
        })
        .eq('id', log.id)

      if (error) {
        setErrorMessage(error.message)
        setProcessingPeriod(false)
        return
      }
    }

    const totals = calculatePeriodTotals(calendarRows)

    const { error: confirmationError } = await supabase
      .from('attendance_period_confirmations')
      .update({
        supervisor_status: 'approved',
        supervisor_id: appUser?.employee_id || null,
        supervisor_name: supervisorName,
        supervisor_approved_at: now,
        supervisor_rejected_at: null,
        supervisor_note: 'Periode disetujui oleh atasan.',
        hr_status: 'ready_for_hr',

        total_work_days: totals.totalWorkDays,
        total_present_days: totals.present,
        total_late_days: totals.late,
        total_incomplete_days: totals.incomplete,
        total_absent_days: totals.absent,
        total_sick_days: totals.sick,
        total_permit_days: totals.permit,
        total_leave_days: totals.leave,
        total_phl_days: totals.phl,
        total_holiday_work_days: totals.holidayWork,

        updated_at: now,
      })
      .eq('id', periodConfirmation.id)

    if (confirmationError) {
      setErrorMessage(confirmationError.message)
      setProcessingPeriod(false)
      return
    }

    await syncPHLBalance(employeeId, periodRange.start, periodRange.end)

    setSuccessMessage('Periode absensi berhasil disetujui atasan dan siap diproses HR.')
    setProcessingPeriod(false)
    await fetchData()
  }

  async function handleRejectPeriod() {
    if (!periodConfirmation || !rejectReason.trim()) {
      setErrorMessage('Alasan reject wajib diisi.')
      return
    }

    if (!ensureCanProcess()) return

    setProcessingPeriod(true)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()
    const supervisorName = getSupervisorName()

    const { error: logsError } = await supabase
      .from('attendance_logs')
      .update({
        supervisor_approval_status: 'rejected',
        supervisor_reviewed_by: supervisorName,
        supervisor_reviewed_at: now,
        supervisor_note: rejectReason,
        hr_final_status: 'rejected_by_supervisor',
        absence_request_status: 'rejected_supervisor',
        updated_at: now,
      })
      .eq('employee_id', employeeId)
      .gte('attendance_date', periodRange.start)
      .lte('attendance_date', periodRange.end)
      .eq('employee_confirmation_status', 'submitted')

    if (logsError) {
      setErrorMessage(logsError.message)
      setProcessingPeriod(false)
      return
    }

    const { error: confirmationError } = await supabase
      .from('attendance_period_confirmations')
      .update({
        supervisor_status: 'rejected',
        supervisor_id: appUser?.employee_id || null,
        supervisor_name: supervisorName,
        supervisor_approved_at: null,
        supervisor_rejected_at: now,
        supervisor_note: rejectReason,
        hr_status: 'rejected_by_supervisor',
        updated_at: now,
      })
      .eq('id', periodConfirmation.id)

    if (confirmationError) {
      setErrorMessage(confirmationError.message)
      setProcessingPeriod(false)
      return
    }

    setSuccessMessage('Periode absensi berhasil ditolak dan dikembalikan ke employee.')
    setRejectTarget(null)
    setRejectReason('')
    setProcessingPeriod(false)
    await fetchData()
  }

  async function handleRejectDaily() {
    if (!rejectTarget || rejectTarget.type !== 'daily') return

    if (!rejectReason.trim()) {
      setErrorMessage('Alasan reject wajib diisi.')
      return
    }

    const log = logs.find((item) => item.id === rejectTarget.id)

    if (!log) {
      setErrorMessage('Data absensi tidak ditemukan.')
      return
    }

    await handleDailyApproval(log, 'reject', rejectReason)

    setRejectTarget(null)
    setRejectReason('')
  }

  async function syncPHLBalance(
    targetEmployeeId: string,
    periodStart: string,
    periodEnd: string
  ) {
    const { error } = await supabase.rpc('sync_phl_balance_from_attendance', {
      p_employee_id: targetEmployeeId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    })

    if (error) {
      setErrorMessage(`Approval berhasil, tetapi sync saldo PHL gagal: ${error.message}`)
      return
    }
  }

  return (
    <>
      <Topbar
        title="Detail Approval Absensi"
        description="Review detail absensi bawahan per periode sebelum approve atau reject."
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

        {isLocked && (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <Lock size={18} />
              Periode ini sudah dikunci HR
            </div>

            <p>
              Atasan tidak bisa approve, reject, atau mengubah status absensi pada
              periode ini sampai HR membuka lock. Data tetap bisa dibuka untuk arsip
              dan pengecekan bukti.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <LockInfo label="Dikunci oleh" value={periodConfirmation?.locked_by || '-'} />
              <LockInfo label="Tanggal lock" value={formatDateTime(periodConfirmation?.locked_at || '')} />
              <LockInfo label="Catatan HR" value={periodConfirmation?.lock_note || '-'} />
            </div>
          </div>
        )}

        {!isLocked && periodConfirmation?.unlocked_at && (
          <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-700">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <LockOpen size={18} />
              Lock periode sedang dibuka HR
            </div>

            <p>
              HR membuka lock periode ini untuk revisi. Approval dapat diproses kembali
              selama belum Final HR.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <LockInfo label="Dibuka oleh" value={periodConfirmation?.unlocked_by || '-'} />
              <LockInfo label="Tanggal unlock" value={formatDateTime(periodConfirmation?.unlocked_at || '')} />
              <LockInfo label="Catatan HR" value={periodConfirmation?.lock_note || '-'} />
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <Link
                href="/employee/approvals"
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 backdrop-blur-xl transition hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Approval Tim
              </Link>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                Supervisor Review
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                {employee?.full_name || '-'}
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Periode {formatDisplayDate(periodRange.start)} s.d. {formatDisplayDate(periodRange.end)}.
                Review data harian, bukti ketidakhadiran, cuti khusus, klaim PHL, dan potensi PHL sebelum approve.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5 xl:min-w-[850px]">
              <HeroMetric label="Pending" value={String(pendingDailyCount)} />
              <HeroMetric label="Approved" value={String(approvedDailyCount)} />
              <HeroMetric label="Rejected" value={String(rejectedDailyCount)} />
              <HeroMetric label="Keterangan" value={String(absenceRequestCount)} />
              <HeroMetric label="PHL" value={String(phlCount)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Hadir"
            value={String(presentCount)}
            description="Hari dengan data hadir"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Alpa / Tanpa Data"
            value={String(absentCount)}
            description="Hari kerja tanpa data"
            icon={<AlertTriangle size={22} />}
            tone="red"
          />

          <SummaryCard
            title="Status Periode"
            value={formatShortPeriodStatus(periodConfirmation)}
            description={isReadOnly ? 'Approval terkunci/read-only' : 'Approval masih bisa diproses'}
            icon={isLocked ? <Lock size={22} /> : <LockOpen size={22} />}
            tone={isReadOnly ? 'orange' : 'blue'}
          />

          <SummaryCard
            title="Keterangan"
            value={`${absenceRequestCount} hari`}
            description="Cuti, izin, sakit, klaim PHL, tugas luar"
            icon={<CalendarDays size={22} />}
            tone="purple"
          />
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Detail Absensi Periode
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                Review detail absensi harian. Sabtu/Minggu dan libur aktif diberi warna berbeda.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <PeriodStatusBadge period={periodConfirmation} />

                {isLocked ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    <Lock size={13} />
                    Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    <LockOpen size={13} />
                    Unlocked
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={fetchData}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>

              <button
                type="button"
                disabled={isReadOnly || processingPeriod || pendingDailyCount === 0}
                onClick={handleApprovePeriod}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processingPeriod ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Approve Periode
              </button>

              <button
                type="button"
                disabled={isReadOnly || processingPeriod}
                onClick={() => {
                  setRejectTarget({
                    type: 'period',
                    id: periodConfirmation?.id || '',
                    name: employee?.full_name || '-',
                  })
                  setRejectReason('')
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={18} />
                Reject Periode
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat detail approval...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="px-5 py-4 font-semibold">Tanggal</th>
                    <th className="px-5 py-4 font-semibold">Hari</th>
                    <th className="px-5 py-4 font-semibold">Clock In</th>
                    <th className="px-5 py-4 font-semibold">Clock Out</th>
                    <th className="px-5 py-4 font-semibold">Manual</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Keterangan</th>
                    <th className="px-5 py-4 font-semibold">Catatan</th>
                    <th className="px-5 py-4 font-semibold">Bukti</th>
                    <th className="px-5 py-4 font-semibold">Approval</th>
                    <th className="px-5 py-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {calendarRows.map((row) => {
                    const log = row.log
                    const displayStatus = getDisplayStatus(row)
                    const isOffday = row.is_weekend || Boolean(row.holiday_name)
                    const canProcessDaily =
                      Boolean(log?.id) &&
                      normalizeStatus(log?.employee_confirmation_status) === 'submitted' &&
                      normalizeStatus(log?.supervisor_approval_status) === 'pending' &&
                      !isReadOnly

                    return (
                      <tr
                        key={row.date}
                        className={[
                          'border-b border-black/5 transition',
                          row.holiday_name
                            ? 'bg-[#fff7e6] hover:bg-[#fff1cc]'
                            : row.is_weekend
                              ? 'bg-[#f3f8ff] hover:bg-[#e8f2ff]'
                              : 'hover:bg-white/70',
                        ].join(' ')}
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#1d1d1f]">
                            {formatDisplayDate(row.date)}
                          </p>

                          {row.holiday_name && (
                            <p className="mt-1 line-clamp-1 text-[11px] font-bold text-orange-700">
                              {row.holiday_name}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-[#6e6e73]">
                          {row.day_name}
                        </td>

                        <td className="px-5 py-4">
                          <TimeCell value={log?.check_in || '-'} />
                        </td>

                        <td className="px-5 py-4">
                          <TimeCell value={log?.check_out || '-'} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <ManualTime label="In" value={log?.manual_check_in || log?.requested_check_in || '-'} />
                            <ManualTime label="Out" value={log?.manual_check_out || log?.requested_check_out || '-'} />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {isOffday && !log ? (
                            <span className="text-xs font-semibold text-[#86868b]">-</span>
                          ) : (
                            <StatusBadge status={displayStatus} log={log} />
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <RequestLabelBadge log={log} status={displayStatus} />
                        </td>

                        <td className="px-5 py-4">
                          <p className="line-clamp-3 max-w-[250px] text-sm leading-6 text-[#6e6e73]">
                            {log?.employee_daily_note ||
                              log?.correction_reason ||
                              log?.notes ||
                              '-'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <ProofLinks log={log} />
                        </td>

                        <td className="px-5 py-4">
                          <ApprovalBadge status={log?.supervisor_approval_status || 'none'} />
                        </td>

                        <td className="px-5 py-4">
                          {log ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedLog(log)}
                                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8]"
                              >
                                <Eye size={15} />
                                Detail
                              </button>

                              <button
                                type="button"
                                disabled={!canProcessDaily || processingId === log.id}
                                onClick={() => handleDailyApproval(log, 'approve')}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl bg-green-50 px-3 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </button>

                              <button
                                type="button"
                                disabled={!canProcessDaily || processingId === log.id}
                                onClick={() => {
                                  setRejectTarget({
                                    type: 'daily',
                                    id: log.id,
                                    name: employee?.full_name || '-',
                                    date: log.attendance_date,
                                  })
                                  setRejectReason('')
                                }}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="flex justify-center text-xs font-semibold text-[#86868b]">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedLog && (
          <AttendanceDetailModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}

        {rejectTarget && (
          <RejectModal
            target={rejectTarget}
            reason={rejectReason}
            processing={
              rejectTarget.type === 'period'
                ? processingPeriod
                : processingId === rejectTarget.id
            }
            onReasonChange={setRejectReason}
            onClose={() => {
              setRejectTarget(null)
              setRejectReason('')
            }}
            onSubmit={() => {
              if (rejectTarget.type === 'period') {
                handleRejectPeriod()
                return
              }

              handleRejectDaily()
            }}
          />
        )}
      </section>
    </>
  )
}

function AttendanceDetailModal({
  log,
  onClose,
}: {
  log: AttendanceLog
  onClose: () => void
}) {
  const displayStatus = getStatusFromLog(log)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              Detail Absensi
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {formatDisplayDate(log.attendance_date)} · {log.full_name || '-'}
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoBox label="Nama" value={log.full_name || '-'} />
            <InfoBox label="NIP" value={log.employee_number || '-'} />
            <InfoBox label="Unit" value={log.department || '-'} />
            <InfoBox label="Jabatan" value={log.position || '-'} />
            <InfoBox label="Clock In Mesin" value={log.check_in || '-'} />
            <InfoBox label="Clock Out Mesin" value={log.check_out || '-'} />
            <InfoBox label="Manual Check In" value={log.manual_check_in || log.requested_check_in || '-'} />
            <InfoBox label="Manual Check Out" value={log.manual_check_out || log.requested_check_out || '-'} />
            <InfoBox label="Status" value={formatStatus(displayStatus, log)} />
            <InfoBox label="Keterangan" value={getRequestLabel(log, displayStatus)} />
            <InfoBox label="Status Keterangan" value={formatAbsenceRequestStatus(log.absence_request_status || '')} />
            <InfoBox label="Approval Atasan" value={formatApprovalStatus(log.supervisor_approval_status || 'none')} />
          </div>

          <ContentBox
            title="Catatan Employee / Alasan"
            content={log.employee_daily_note || log.correction_reason || log.notes || '-'}
          />

          <ContentBox
            title="Catatan Approval"
            content={log.supervisor_note || log.correction_notes || '-'}
          />

          <div className="mt-5 flex flex-wrap gap-3">
            {log.absence_proof_url && (
              <a
                href={log.absence_proof_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white"
              >
                <FileText size={17} />
                Bukti Absensi / Keterangan
              </a>
            )}

            {log.phl_proof_url && (
              <a
                href={log.phl_proof_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#7b2cbf] px-5 text-sm font-bold text-white"
              >
                <FileText size={17} />
                Bukti PHL
              </a>
            )}

            {log.correction_proof_url && (
              <a
                href={log.correction_proof_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-5 text-sm font-bold text-white"
              >
                <FileText size={17} />
                Bukti Koreksi
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RejectModal({
  target,
  reason,
  processing,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  target: RejectTarget
  reason: string
  processing: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {target.type === 'period' ? 'Reject Periode Absensi' : 'Reject Absensi Harian'}
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {target.name}
              {target.type === 'daily' ? ` · ${formatDisplayDate(target.date)}` : ''}
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

        <div className="space-y-5 p-6">
          <label className="block">
            <span className="harmony-label">Alasan Reject</span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              className="harmony-textarea"
              placeholder="Tuliskan alasan penolakan agar employee bisa memperbaiki data."
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-black/5 pt-5">
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
              {processing ? 'Memproses...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProofLinks({
  log,
}: {
  log: AttendanceLog | null
}) {
  if (!log) {
    return <span className="text-xs font-semibold text-[#86868b]">-</span>
  }

  const links = [
    {
      label: 'Keterangan',
      url: log.absence_proof_url,
    },
    {
      label: 'PHL',
      url: log.phl_proof_url,
    },
    {
      label: 'Koreksi',
      url: log.correction_proof_url,
    },
  ].filter((item) => Boolean(item.url))

  if (links.length === 0) {
    return <span className="text-xs font-semibold text-[#86868b]">-</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((item) => (
        <a
          key={item.label}
          href={item.url || '#'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-[#e8f2ff] px-3 py-2 text-xs font-bold text-[#0059b8]"
        >
          <FileText size={14} />
          {item.label}
        </a>
      ))}
    </div>
  )
}

function RequestLabelBadge({
  log,
  status,
}: {
  log: AttendanceLog | null
  status: string
}) {
  if (!log) {
    return <span className="text-xs font-semibold text-[#86868b]">-</span>
  }

  const label = getRequestLabel(log, status)

  if (label === '-') {
    return <span className="text-xs font-semibold text-[#86868b]">-</span>
  }

  const tone = getRequestTone(log.absence_request_type || status)

  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    neutral: 'bg-[#f5f5f7] text-[#6e6e73]',
  }[tone]

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  )
}

function TimeCell({
  value,
}: {
  value: string
}) {
  return (
    <div className="flex items-center gap-2 font-semibold text-[#1d1d1f]">
      <Timer size={14} className="text-[#86868b]" />
      {value}
    </div>
  )
}

function ManualTime({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <p className="text-xs leading-5 text-[#6e6e73]">
      <span className="font-bold text-[#1d1d1f]">{label}:</span> {value}
    </p>
  )
}

function LockInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-white/65 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold">
        {value}
      </p>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string
  value: string
  description: string
  icon: ReactNode
  tone: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    red: 'text-red-700 bg-red-50',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
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

function StatusBadge({
  status,
  log,
}: {
  status: string
  log?: AttendanceLog | null
}) {
  const className =
    status === 'present'
      ? 'bg-green-50 text-green-700'
      : status === 'late'
        ? 'bg-orange-50 text-orange-700'
        : status === 'incomplete'
          ? 'bg-red-50 text-red-700'
          : status === 'absent' || status === 'no_record'
            ? 'bg-red-50 text-red-700'
            : status === 'phl' || status === 'pending_phl' || status === 'phl_claim'
              ? 'bg-[#f7edfc] text-[#7b2cbf]'
              : status === 'leave' || status.includes('leave') || status === 'permit'
                ? 'bg-[#e8f2ff] text-[#0059b8]'
                : status === 'sick'
                  ? 'bg-[#f7edfc] text-[#7b2cbf]'
                  : status === 'official_travel'
                    ? 'bg-[#eef1f5] text-[#3a3a3c]'
                    : 'bg-[#f5f5f7] text-[#6e6e73]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatStatus(status, log)}
    </span>
  )
}

function ApprovalBadge({
  status,
}: {
  status: string
}) {
  const normalized = normalizeStatus(status)

  const className =
    normalized === 'approved'
      ? 'bg-green-50 text-green-700'
      : normalized === 'rejected'
        ? 'bg-red-50 text-red-700'
        : normalized === 'pending'
          ? 'bg-orange-50 text-orange-700'
          : 'bg-[#f5f5f7] text-[#6e6e73]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatApprovalStatus(normalized)}
    </span>
  )
}

function PeriodStatusBadge({
  period,
}: {
  period: PeriodConfirmation | null
}) {
  const locked = Boolean(period?.is_locked)

  const className = locked
    ? 'bg-red-50 text-red-700'
    : normalizeStatus(period?.hr_status) === 'finalized'
      ? 'bg-green-50 text-green-700'
      : normalizeStatus(period?.supervisor_status) === 'approved'
        ? 'bg-green-50 text-green-700'
        : normalizeStatus(period?.supervisor_status) === 'pending'
          ? 'bg-orange-50 text-orange-700'
          : normalizeStatus(period?.supervisor_status) === 'rejected'
            ? 'bg-red-50 text-red-700'
            : 'bg-[#f5f5f7] text-[#6e6e73]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatPeriodStatus(period)}
    </span>
  )
}

function getDisplayStatus(row: CalendarRow) {
  const log = row.log

  const hasAttendance = Boolean(
    log?.check_in ||
      log?.check_out ||
      log?.manual_check_in ||
      log?.manual_check_out ||
      log?.requested_check_in ||
      log?.requested_check_out
  )

  if (log?.absence_request_type) {
    return log.absence_request_type
  }

  if (hasAttendance && (row.is_weekend || row.holiday_name)) {
    if (log?.supervisor_approval_status === 'approved') return 'phl'
    return 'pending_phl'
  }

  if (row.is_weekend || row.holiday_name) {
    if (!hasAttendance) return 'off_day'
  }

  if (log?.status) return log.status
  if (hasAttendance) return 'present'

  return row.status
}

function getStatusFromLog(log: AttendanceLog) {
  if (log.absence_request_type) return log.absence_request_type
  if (log.status) return log.status

  const hasAttendance = Boolean(
    log.check_in ||
      log.check_out ||
      log.manual_check_in ||
      log.manual_check_out ||
      log.requested_check_in ||
      log.requested_check_out
  )

  if (hasAttendance) return 'present'

  return 'no_record'
}

function getDayStatus(log: AttendanceLog | null, isWeekend: boolean, isHoliday: boolean) {
  if (log?.absence_request_type) return log.absence_request_type
  if (log?.status) return log.status
  if (isWeekend || isHoliday) return 'off_day'

  return 'no_record'
}

function calculatePeriodTotals(calendarRows: CalendarRow[]) {
  const totals = {
    totalWorkDays: 0,
    present: 0,
    late: 0,
    incomplete: 0,
    absent: 0,
    sick: 0,
    permit: 0,
    leave: 0,
    phl: 0,
    holidayWork: 0,
  }

  calendarRows.forEach((row) => {
    const status = getDisplayStatus(row)
    const isOffday = row.is_weekend || Boolean(row.holiday_name)

    if (!isOffday) {
      totals.totalWorkDays += 1
    }

    if (status === 'phl' || status === 'pending_phl') {
      totals.phl += 1
      totals.holidayWork += 1
      return
    }

    if (status === 'phl_claim') {
      totals.absent += 1
      return
    }

    if (status === 'late') {
      totals.late += 1
      totals.present += 1
      return
    }

    if (status === 'incomplete') {
      totals.incomplete += 1
      totals.present += 1
      return
    }

    if (status === 'present') {
      totals.present += 1
      return
    }

    if (status === 'sick') {
      totals.sick += 1
      return
    }

    if (status === 'permit' || status === 'permission') {
      totals.permit += 1
      return
    }

    if (status === 'leave' || status.includes('leave')) {
      totals.leave += 1
      return
    }

    if (status === 'official_travel') {
      totals.present += 1
      return
    }

    if (status === 'absent' || status === 'no_record') {
      if (!isOffday) {
        totals.absent += 1
      }
    }
  })

  return totals
}

function getRequestLabel(log: AttendanceLog | null, status: string) {
  if (!log) return '-'
  if (log.absence_request_label) return log.absence_request_label

  return formatStatus(log.absence_request_type || status || log.status || '', log)
}

function getRequestTone(value: string): 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'neutral' {
  const normalized = normalizeStatus(value)

  if (normalized === 'phl' || normalized === 'pending_phl' || normalized === 'phl_claim') return 'purple'
  if (normalized === 'sick') return 'orange'
  if (normalized === 'absent' || normalized === 'no_record') return 'red'
  if (normalized === 'official_travel') return 'green'
  if (normalized === 'permit') return 'blue'
  if (normalized === 'leave' || normalized.includes('leave')) return 'blue'
  if (normalized === 'present') return 'green'

  return 'neutral'
}

function getCutoffRange(periodMonth: string) {
  const [yearText, monthText] = periodMonth.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  const start = new Date(year, month - 1, 11)
  const end = new Date(year, month, 10)

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  }
}

function getDateRange(start: string, end: string) {
  const result: string[] = []
  const current = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)

  while (current <= endDate) {
    result.push(formatDateToISO(current))
    current.setDate(current.getDate() + 1)
  }

  return result
}

function isWeekendDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const day = date.getDay()

  return day === 0 || day === 6
}

function formatDateToISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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

function formatDateTime(value: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDayName(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
  })
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function formatStatus(status: string, log?: AttendanceLog | null) {
  if (log?.absence_request_label) return log.absence_request_label

  const normalized = normalizeStatus(status)

  if (normalized === 'annual_leave') return 'Cuti Tahunan'
  if (normalized === 'marriage_leave') return 'Cuti Menikah'
  if (normalized === 'maternity_leave') return 'Cuti Melahirkan'
  if (normalized === 'miscarriage_leave') return 'Cuti Keguguran'
  if (normalized === 'bereavement_leave') return 'Cuti Duka'
  if (normalized === 'child_circumcision_leave') return 'Cuti Khitan / Baptis Anak'
  if (normalized === 'worship_leave') return 'Cuti Ibadah'
  if (normalized === 'menstrual_leave') return 'Cuti Haid'
  if (normalized === 'pregnancy_check_leave') return 'Pemeriksaan Kehamilan'
  if (normalized === 'phl_claim') return 'Klaim PHL'
  if (normalized === 'phl') return 'PHL'
  if (normalized === 'pending_phl') return 'Menunggu PHL'
  if (normalized === 'off_day') return '-'
  if (normalized === 'present') return 'Present'
  if (normalized === 'late') return 'Late'
  if (normalized === 'incomplete') return 'Incomplete'
  if (normalized === 'absent') return 'Alpa'
  if (normalized === 'leave') return 'Cuti'
  if (normalized === 'sick') return 'Sakit'
  if (normalized === 'permit') return 'Izin'
  if (normalized === 'permission') return 'Izin'
  if (normalized === 'official_travel') return 'Tugas Luar'
  if (normalized === 'holiday') return 'Holiday'
  if (normalized === 'weekend') return 'Weekend'
  if (normalized === 'no_record') return 'Tanpa Data'

  return status || '-'
}

function formatApprovalStatus(status: string) {
  if (status === 'none') return '-'
  if (status === 'pending') return 'Menunggu'
  if (status === 'approved') return 'Disetujui'
  if (status === 'rejected') return 'Ditolak'

  return status || '-'
}

function formatAbsenceRequestStatus(status: string) {
  const normalized = normalizeStatus(status)

  if (normalized === 'submitted') return 'Diajukan'
  if (normalized === 'approved_supervisor') return 'Disetujui Atasan'
  if (normalized === 'rejected_supervisor') return 'Ditolak Atasan'
  if (normalized === 'approved_hr') return 'Disetujui HR'
  if (normalized === 'rejected_hr') return 'Ditolak HR'

  return status || '-'
}

function formatPeriodStatus(period: PeriodConfirmation | null) {
  if (!period) return 'Belum ada submit periode.'
  if (period.is_locked) return 'Dikunci HR.'
  if (normalizeStatus(period.hr_status) === 'finalized') return 'Sudah Final HR.'
  if (normalizeStatus(period.hr_status) === 'ready_for_hr') return 'Siap diproses HR.'
  if (normalizeStatus(period.supervisor_status) === 'approved') return 'Disetujui atasan.'
  if (normalizeStatus(period.supervisor_status) === 'rejected') return 'Ditolak atasan.'
  if (normalizeStatus(period.supervisor_status) === 'pending') return 'Menunggu approval atasan.'
  if (normalizeStatus(period.employee_status) === 'submitted') return 'Diajukan employee.'

  return 'Belum ada submit periode.'
}

function formatShortPeriodStatus(period: PeriodConfirmation | null) {
  if (!period) return 'Belum Submit'
  if (period.is_locked) return 'Locked'
  if (normalizeStatus(period.hr_status) === 'finalized') return 'Final HR'
  if (normalizeStatus(period.supervisor_status) === 'approved') return 'Approved'
  if (normalizeStatus(period.supervisor_status) === 'rejected') return 'Rejected'
  if (normalizeStatus(period.supervisor_status) === 'pending') return 'Pending'

  return 'Draft'
}