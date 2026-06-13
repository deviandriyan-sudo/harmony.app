'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCheck,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type Employee = {
  id: string
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  position?: string | null
  position_name?: string | null
  job_position?: string | null
  department?: string | null
  unit?: string | null
  work_unit?: string | null
  email?: string | null
  is_active?: boolean | null
}

type AttendanceLog = {
  id?: string
  employee_id?: string | null
  attendance_date?: string | null
  check_in?: string | null
  check_out?: string | null
  manual_check_in?: string | null
  manual_check_out?: string | null
  requested_check_in?: string | null
  requested_check_out?: string | null
  machine_pin?: string | null

  status?: string | null
  attendance_status?: string | null

  employee_confirmation_status?: string | null
  supervisor_approval_status?: string | null
  supervisor_approved_at?: string | null
  supervisor_approved_by?: string | null
  supervisor_note?: string | null

  hr_approval_status?: string | null
  hr_approved_at?: string | null
  hr_approved_by?: string | null
  hr_final_status?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  hr_finalized_by_name?: string | null
  hr_note?: string | null

  absence_request_type?: string | null
  absence_request_label?: string | null
  absence_request_status?: string | null
  absence_request_source?: string | null

  employee_daily_note?: string | null
  correction_reason?: string | null
  correction_notes?: string | null
  correction_status?: string | null
  correction_type?: string | null

  is_phl_candidate?: boolean | null
  phl_proof_url?: string | null
  absence_proof_url?: string | null

  is_locked?: boolean | null
  locked_at?: string | null
  locked_by?: string | null
  locked_by_name?: string | null
  unlocked_at?: string | null
  unlocked_by?: string | null
  unlocked_by_name?: string | null
  lock_note?: string | null

  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
}

type PeriodConfirmation = {
  id?: string
  employee_id?: string | null

  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null

  period_month?: string | null
  period_start?: string | null
  period_end?: string | null

  employee_status?: string | null
  employee_submitted_at?: string | null
  employee_submitted_by?: string | null
  submitted_at?: string | null

  supervisor_status?: string | null
  supervisor_id?: string | null
  supervisor_name?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_at?: string | null
  supervisor_approved_by_name?: string | null
  supervisor_note?: string | null

  hr_status?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  hr_finalized_by_name?: string | null
  hr_note?: string | null

  total_work_days?: number | null
  total_present_days?: number | null
  total_late_days?: number | null
  total_incomplete_days?: number | null
  total_absent_days?: number | null
  total_sick_days?: number | null
  total_permit_days?: number | null
  total_leave_days?: number | null
  total_phl_days?: number | null
  total_holiday_work_days?: number | null

  annual_leave_matured?: boolean | null
  annual_leave_matured_date?: string | null
  leave_allowance_eligible?: boolean | null

  is_locked?: boolean | null
  locked_at?: string | null
  locked_by?: string | null
  locked_by_name?: string | null
  unlocked_at?: string | null
  unlocked_by?: string | null
  unlocked_by_name?: string | null
  lock_note?: string | null

  created_at?: string | null
  updated_at?: string | null
}

type EmployeeAttendanceSummary = {
  employee: Employee
  confirmation?: PeriodConfirmation
  logs: AttendanceLog[]
  rowLocked: boolean
  totalDays: number
  presentDays: number
  leaveDays: number
  sickDays: number
  permitDays: number
  officialTravelDays: number
  phlClaimDays: number
  absentDays: number
  incompleteDays: number
  manualCorrectionDays: number
  lockedDays: number
}

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
]

function getCurrentPeriodMonth() {
  const today = new Date()
  const day = today.getDate()
  const period = new Date(today)

  if (day <= 10) {
    period.setMonth(period.getMonth() - 1)
  }

  return `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`
}

function getPeriodRange(periodMonth: string) {
  const [yearRaw, monthRaw] = periodMonth.split('-')
  const year = Number(yearRaw)
  const monthIndex = Number(monthRaw) - 1

  const start = new Date(year, monthIndex, 11)
  const end = new Date(year, monthIndex + 1, 10)

  return {
    start,
    end,
    startText: toInputDate(start),
    endText: toInputDate(end),
    label: `${formatLongDate(start)} s.d. ${formatLongDate(end)}`,
  }
}

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatLongDate(date: Date | string | null | undefined) {
  if (!date) return '-'

  const value = typeof date === 'string' ? new Date(date) : date

  if (Number.isNaN(value.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value)
}

function formatShortDate(date: string | null | undefined) {
  if (!date) return '-'

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(parsed)
}

function formatDateTime(date: string | null | undefined) {
  if (!date) return '-'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getEmployeeName(employee: Employee) {
  return (
    employee.full_name ||
    employee.employee_name ||
    employee.name ||
    employee.email ||
    'Tanpa Nama'
  )
}

function getEmployeeNumber(employee: Employee) {
  return employee.employee_number || employee.nip || employee.machine_pin || '-'
}

function getEmployeePosition(employee: Employee) {
  return employee.position_name || employee.job_position || employee.position || '-'
}

function getEmployeeUnit(employee: Employee) {
  return employee.department || employee.unit || employee.work_unit || '-'
}

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function normalizeStatus(log: AttendanceLog) {
  return (
    log.absence_request_type ||
    log.status ||
    log.attendance_status ||
    'unknown'
  )
}

function isPresentStatus(status: string) {
  return [
    'present',
    'hadir',
    'normal',
    'manual',
    'manual_correction',
    'official_travel',
    'business_trip',
  ].includes(status)
}

function isLeaveStatus(status: string) {
  return (
    [
      'leave',
      'annual_leave',
      'marriage_leave',
      'maternity_leave',
      'miscarriage_leave',
      'bereavement_leave',
      'child_circumcision_leave',
      'worship_leave',
      'menstrual_leave',
      'pregnancy_check_leave',
      'other_leave',
    ].includes(status) || status.includes('leave')
  )
}

function getReadableAttendanceLabel(log: AttendanceLog) {
  if (log.absence_request_label) return log.absence_request_label

  const status = normalizeStatus(log)

  const map: Record<string, string> = {
    present: 'Hadir',
    hadir: 'Hadir',
    normal: 'Hadir Normal',
    manual: 'Hadir Manual',
    manual_correction: 'Koreksi Kehadiran',
    incomplete: 'Belum Lengkap',
    absent: 'Alpa / Tidak Hadir',
    alpha: 'Alpa / Tidak Hadir',
    alpa: 'Alpa / Tidak Hadir',

    leave: 'Cuti',
    annual_leave: 'Cuti Tahunan',
    marriage_leave: 'Cuti Menikah',
    maternity_leave: 'Cuti Melahirkan',
    miscarriage_leave: 'Cuti Keguguran',
    bereavement_leave: 'Cuti Duka',
    child_circumcision_leave: 'Cuti Khitan / Baptis Anak',
    worship_leave: 'Cuti Ibadah',
    menstrual_leave: 'Cuti Haid',
    pregnancy_check_leave: 'Pemeriksaan Kehamilan',
    other_leave: 'Cuti Lainnya',

    sick: 'Sakit',
    permit: 'Izin',
    izin: 'Izin',
    permission: 'Izin',
    official_travel: 'Tugas Luar / Dinas',
    business_trip: 'Tugas Luar / Dinas',

    phl: 'PHL',
    phl_claim: 'Klaim PHL',
    claim_phl: 'Klaim PHL',

    holiday: 'Hari Libur',
    weekend: 'Akhir Pekan',
    off: 'Libur',
  }

  return map[status] || status.replaceAll('_', ' ')
}

function getAttendanceBadgeClass(log: AttendanceLog) {
  const status = normalizeStatus(log)

  if (isPresentStatus(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (isLeaveStatus(status)) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (status === 'sick') {
    return 'border-purple-200 bg-purple-50 text-purple-700'
  }

  if (status === 'permit' || status === 'izin' || status === 'permission') {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  if (status === 'phl' || status === 'phl_claim' || status === 'claim_phl') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (
    status === 'absent' ||
    status === 'alpha' ||
    status === 'alpa' ||
    status === 'incomplete'
  ) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function getSimpleStatusBadge(status?: string | null) {
  const value = status || 'belum_ada'

  const map: Record<string, { label: string; className: string }> = {
    submitted: {
      label: 'Submitted',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    pending: {
      label: 'Pending',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    approved: {
      label: 'Approved',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    approved_supervisor: {
      label: 'Approved Atasan',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    ready_for_hr: {
      label: 'Ready for HR',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    },
    waiting_hr: {
      label: 'Menunggu HR',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    },
    waiting_supervisor: {
      label: 'Menunggu Atasan',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    finalized: {
      label: 'Final HR',
      className: 'border-slate-300 bg-slate-900 text-white',
    },
    rejected: {
      label: 'Ditolak',
      className: 'border-red-200 bg-red-50 text-red-700',
    },
    rejected_by_supervisor: {
      label: 'Ditolak Atasan',
      className: 'border-red-200 bg-red-50 text-red-700',
    },
    synced: {
      label: 'Synced',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    belum_ada: {
      label: 'Belum Ada',
      className: 'border-slate-200 bg-slate-50 text-slate-500',
    },
  }

  return (
    map[value] || {
      label: value.replaceAll('_', ' '),
      className: 'border-slate-200 bg-slate-50 text-slate-600',
    }
  )
}

function StatusPill({ status }: { status?: string | null }) {
  const badge = getSimpleStatusBadge(status)

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}

function AttendancePill({ log }: { log: AttendanceLog }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${getAttendanceBadgeClass(
        log
      )}`}
    >
      {getReadableAttendanceLabel(log)}
    </span>
  )
}

function countBy(summary: AttendanceLog[], checker: (log: AttendanceLog) => boolean) {
  return summary.filter(checker).length
}

export default function HRAttendanceDataPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [confirmations, setConfirmations] = useState<PeriodConfirmation[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const [selectedSummary, setSelectedSummary] =
    useState<EmployeeAttendanceSummary | null>(null)

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  const periodRange = useMemo(() => getPeriodRange(periodMonth), [periodMonth])

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()

    return Array.from({ length: 5 }).map((_, index) => currentYear - 2 + index)
  }, [])

  const selectedYear = periodMonth.split('-')[0]
  const selectedMonth = periodMonth.split('-')[1]

  const confirmationByEmployee = useMemo(() => {
    const map = new Map<string, PeriodConfirmation>()

    confirmations.forEach((confirmation) => {
      if (!confirmation.employee_id) return
      map.set(confirmation.employee_id, confirmation)
    })

    return map
  }, [confirmations])

  const logsByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceLog[]>()

    logs.forEach((log) => {
      if (!log.employee_id) return
      const existing = map.get(log.employee_id) || []
      existing.push(log)
      map.set(log.employee_id, existing)
    })

    return map
  }, [logs])

  const periodLockState = useMemo(() => {
    const employeeCount = employees.length
    const confirmationLockedCount = confirmations.filter((item) => item.is_locked).length
    const logLockedCount = logs.filter((item) => item.is_locked).length

    const isFullyLockedByConfirmation =
      employeeCount > 0 &&
      confirmations.length >= employeeCount &&
      employees.every((employee) => confirmationByEmployee.get(employee.id)?.is_locked)

    const isFullyLockedByLogs =
      logs.length > 0 && logs.every((item) => Boolean(item.is_locked))

    const latestLockSource =
      confirmations.find((item) => item.is_locked && item.locked_at) ||
      logs.find((item) => item.is_locked && item.locked_at)

    const latestUnlockSource =
      confirmations.find((item) => !item.is_locked && item.unlocked_at) ||
      logs.find((item) => !item.is_locked && item.unlocked_at)

    const isFullyLocked = isFullyLockedByConfirmation || isFullyLockedByLogs
    const isPartiallyLocked =
      !isFullyLocked &&
      (confirmationLockedCount > 0 || logLockedCount > 0)

    return {
      isFullyLocked,
      isPartiallyLocked,
      confirmationLockedCount,
      logLockedCount,
      lockedAt: latestLockSource?.locked_at || '',
      lockedBy:
        latestLockSource?.locked_by_name ||
        latestLockSource?.locked_by ||
        '-',
      unlockedAt: latestUnlockSource?.unlocked_at || '',
      unlockedBy:
        latestUnlockSource?.unlocked_by_name ||
        latestUnlockSource?.unlocked_by ||
        '-',
      note:
        latestLockSource?.lock_note ||
        latestUnlockSource?.lock_note ||
        '-',
    }
  }, [employees, confirmations, logs, confirmationByEmployee])

  const summaries = useMemo<EmployeeAttendanceSummary[]>(() => {
    return employees.map((employee) => {
      const employeeLogs = logsByEmployee.get(employee.id) || []
      const confirmation = confirmationByEmployee.get(employee.id)

      const presentDays = countBy(employeeLogs, (log) => {
        const status = normalizeStatus(log)
        return isPresentStatus(status)
      })

      const leaveDays = countBy(employeeLogs, (log) => {
        const status = normalizeStatus(log)
        return isLeaveStatus(status)
      })

      const sickDays = countBy(
        employeeLogs,
        (log) => normalizeStatus(log) === 'sick'
      )

      const permitDays = countBy(employeeLogs, (log) =>
        ['permit', 'izin', 'permission'].includes(normalizeStatus(log))
      )

      const officialTravelDays = countBy(employeeLogs, (log) =>
        ['official_travel', 'business_trip'].includes(normalizeStatus(log))
      )

      const phlClaimDays = countBy(employeeLogs, (log) =>
        ['phl', 'phl_claim', 'claim_phl'].includes(normalizeStatus(log))
      )

      const absentDays = countBy(employeeLogs, (log) =>
        ['absent', 'alpha', 'alpa'].includes(normalizeStatus(log))
      )

      const incompleteDays = countBy(employeeLogs, (log) =>
        ['incomplete'].includes(normalizeStatus(log))
      )

      const manualCorrectionDays = countBy(employeeLogs, (log) =>
        ['manual', 'manual_correction'].includes(normalizeStatus(log))
      )

      const lockedDays = countBy(employeeLogs, (log) => Boolean(log.is_locked))

      const rowLocked =
        periodLockState.isFullyLocked ||
        Boolean(confirmation?.is_locked) ||
        employeeLogs.some((item) => item.is_locked)

      return {
        employee,
        confirmation,
        logs: employeeLogs.sort((a, b) =>
          String(a.attendance_date || '').localeCompare(
            String(b.attendance_date || '')
          )
        ),
        rowLocked,
        totalDays: employeeLogs.length,
        presentDays,
        leaveDays,
        sickDays,
        permitDays,
        officialTravelDays,
        phlClaimDays,
        absentDays,
        incompleteDays,
        manualCorrectionDays,
        lockedDays,
      }
    })
  }, [employees, logsByEmployee, confirmationByEmployee, periodLockState.isFullyLocked])

  const filteredSummaries = useMemo(() => {
    return summaries.filter((summary) => {
      const keyword = normalizeText(search)

      const employeeText = [
        getEmployeeName(summary.employee),
        getEmployeeNumber(summary.employee),
        getEmployeePosition(summary.employee),
        getEmployeeUnit(summary.employee),
        summary.employee.email,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !keyword || employeeText.includes(keyword)

      if (!matchesSearch) return false

      if (statusFilter === 'all') return true

      if (statusFilter === 'submitted') {
        return summary.confirmation?.employee_status === 'submitted'
      }

      if (statusFilter === 'approved') {
        return summary.confirmation?.supervisor_status === 'approved'
      }

      if (statusFilter === 'ready_for_hr') {
        return (
          summary.confirmation?.hr_status === 'ready_for_hr' ||
          summary.confirmation?.hr_status === 'waiting_hr'
        )
      }

      if (statusFilter === 'finalized') {
        return summary.confirmation?.hr_status === 'finalized'
      }

      if (statusFilter === 'locked') {
        return summary.rowLocked
      }

      if (statusFilter === 'has_request') {
        return summary.logs.some((log) => Boolean(log.absence_request_type))
      }

      return true
    })
  }, [summaries, search, statusFilter])

  const dashboardStats = useMemo(() => {
    const totalEmployees = summaries.length
    const submitted = summaries.filter(
      (item) => item.confirmation?.employee_status === 'submitted'
    ).length
    const approved = summaries.filter(
      (item) => item.confirmation?.supervisor_status === 'approved'
    ).length
    const finalized = summaries.filter(
      (item) => item.confirmation?.hr_status === 'finalized'
    ).length
    const locked = summaries.filter((item) => item.rowLocked).length
    const hasRequest = summaries.filter((item) =>
      item.logs.some((log) => Boolean(log.absence_request_type))
    ).length

    return {
      totalEmployees,
      submitted,
      approved,
      finalized,
      locked,
      hasRequest,
    }
  }, [summaries])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth])

  async function fetchData() {
    setIsLoading(true)
    setMessage(null)

    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true })

      if (employeeError) {
        throw employeeError
      }

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('attendance_date', periodRange.startText)
        .lte('attendance_date', periodRange.endText)
        .is('deleted_at', null)
        .order('attendance_date', { ascending: true })

      if (attendanceError) {
        throw attendanceError
      }

      const { data: confirmationData, error: confirmationError } = await supabase
        .from('attendance_period_confirmations')
        .select('*')
        .eq('period_month', periodMonth)

      if (confirmationError) {
        throw confirmationError
      }

      setEmployees((employeeData || []) as Employee[])
      setLogs((attendanceData || []) as AttendanceLog[])
      setConfirmations((confirmationData || []) as PeriodConfirmation[])
    } catch (error: any) {
      console.warn('Attendance data fetch warning:', error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal mengambil data absensi. Cek koneksi Supabase atau struktur tabel.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function updatePeriodYear(year: string) {
    setPeriodMonth(`${year}-${selectedMonth}`)
  }

  function updatePeriodMonth(month: string) {
    setPeriodMonth(`${selectedYear}-${month}`)
  }

  async function getActor() {
    const { data } = await supabase.auth.getUser()
    const user = data?.user

    return {
      id: user?.id || null,
      name:
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        'HR',
    }
  }

  function getActionErrorMessage(error: any, fallback: string) {
    if (!error) return fallback

    if (typeof error === 'string') return error

    return (
      error.message ||
      error.details ||
      error.hint ||
      error.code ||
      fallback
    )
  }

  async function writeAttendanceAuditLog({
    actionType,
    actionLabel,
    actor,
    totalAffected,
    note,
    metadata,
  }: {
    actionType: string
    actionLabel: string
    actor: Awaited<ReturnType<typeof getActor>>
    totalAffected: number
    note: string
    metadata: Record<string, unknown>
  }) {
    const { error } = await supabase.from('attendance_audit_logs').insert({
      action_type: actionType,
      action_label: actionLabel,
      period_month: periodMonth,
      period_start: periodRange.startText,
      period_end: periodRange.endText,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: 'hr',
      total_affected: totalAffected,
      note,
      metadata,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.warn('Attendance audit log warning:', error)
    }
  }

  function buildConfirmationPayload({
    actor,
    note,
    now,
    locked,
    finalized,
  }: {
    actor: Awaited<ReturnType<typeof getActor>>
    note: string
    now: string
    locked: boolean
    finalized: boolean
  }) {
    return employees.map((employee) => {
      const existing = confirmationByEmployee.get(employee.id)

      return {
        employee_id: employee.id,
        employee_number: getEmployeeNumber(employee),
        machine_pin: employee.machine_pin || null,
        full_name: getEmployeeName(employee),
        department: getEmployeeUnit(employee),
        position: getEmployeePosition(employee),

        period_month: periodMonth,
        period_start: periodRange.startText,
        period_end: periodRange.endText,

        employee_status: existing?.employee_status || 'belum_ada',
        employee_submitted_at:
          existing?.employee_submitted_at || existing?.submitted_at || null,
        employee_submitted_by: existing?.employee_submitted_by || null,

        supervisor_status: existing?.supervisor_status || 'belum_ada',
        supervisor_id: existing?.supervisor_id || null,
        supervisor_name: existing?.supervisor_name || null,
        supervisor_approved_at: existing?.supervisor_approved_at || null,
        supervisor_rejected_at: existing?.supervisor_rejected_at || null,
        supervisor_note: existing?.supervisor_note || null,

        hr_status: finalized ? 'finalized' : existing?.hr_status || 'waiting_hr',
        hr_finalized_at: finalized ? now : existing?.hr_finalized_at || null,
        hr_finalized_by: finalized ? actor.name : existing?.hr_finalized_by || null,
        hr_note: finalized
          ? 'Finalisasi periode absensi HR.'
          : existing?.hr_note || null,

        total_work_days: existing?.total_work_days || 0,
        total_present_days: existing?.total_present_days || 0,
        total_late_days: existing?.total_late_days || 0,
        total_incomplete_days: existing?.total_incomplete_days || 0,
        total_absent_days: existing?.total_absent_days || 0,
        total_sick_days: existing?.total_sick_days || 0,
        total_permit_days: existing?.total_permit_days || 0,
        total_leave_days: existing?.total_leave_days || 0,
        total_phl_days: existing?.total_phl_days || 0,
        total_holiday_work_days: existing?.total_holiday_work_days || 0,

        annual_leave_matured: existing?.annual_leave_matured || false,
        annual_leave_matured_date: existing?.annual_leave_matured_date || null,
        leave_allowance_eligible: existing?.leave_allowance_eligible || false,

        is_locked: locked,
        locked_at: locked ? now : existing?.locked_at || null,
        locked_by: locked ? actor.id : existing?.locked_by || null,
        locked_by_name: locked ? actor.name : existing?.locked_by_name || null,
        unlocked_at: locked ? null : now,
        unlocked_by: locked ? null : actor.id,
        unlocked_by_name: locked ? null : actor.name,
        lock_note: note,

        updated_at: now,
      }
    })
  }

  async function upsertConfirmations(payload: Record<string, unknown>[]) {
    if (payload.length === 0) return 0

    const { data, error } = await supabase
      .from('attendance_period_confirmations')
      .upsert(payload, {
        onConflict: 'employee_id,period_month',
      })
      .select('id')

    if (error) throw error

    return data?.length || 0
  }

  async function updateLogsForPeriod(payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('attendance_logs')
      .update(payload)
      .gte('attendance_date', periodRange.startText)
      .lte('attendance_date', periodRange.endText)
      .is('deleted_at', null)
      .select('id')

    if (error) throw error

    return data?.length || 0
  }

  async function handleSyncApprovedRequests() {
    setIsProcessing(true)
    setMessage(null)

    try {
      const { error } = await supabase.rpc(
        'sync_approved_leave_requests_to_attendance',
        {
          p_period_month: periodMonth,
        }
      )

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Approved request berhasil disinkronkan ke attendance_logs.',
      })

      await fetchData()
    } catch (error: any) {
      console.warn('Attendance sync warning:', error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal sinkron approved request. Pastikan function SQL sync sudah dibuat.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleFinalizePeriod() {
    const confirmed = window.confirm(
      `Finalisasi dan lock penuh periode ${periodMonth}?\n\nSemua karyawan pada periode ini akan masuk Final HR dan terkunci. Employee tidak bisa revisi lagi sampai HR membuka lock.`
    )

    if (!confirmed) return

    setIsProcessing(true)
    setMessage(null)

    try {
      const actor = await getActor()
      const now = new Date().toISOString()
      const note =
        'Finalisasi dan lock penuh periode absensi HR. Seluruh employee menjadi read-only.'

      try {
        await supabase.rpc('sync_approved_leave_requests_to_attendance', {
          p_period_month: periodMonth,
        })
      } catch (syncError) {
        console.warn('Sync approved request warning before finalize:', syncError)
      }

      const confirmationPayload = buildConfirmationPayload({
        actor,
        note,
        now,
        locked: true,
        finalized: true,
      })

      const confirmationCount = await upsertConfirmations(confirmationPayload)

      const attendanceLogCount = await updateLogsForPeriod({
        hr_final_status: 'finalized',
        hr_finalized_at: now,
        hr_finalized_by: actor.name,
        hr_finalized_by_name: actor.name,
        hr_approval_status: 'approved',
        hr_approved_by: actor.name,
        hr_approved_at: now,

        is_locked: true,
        locked_at: now,
        locked_by: actor.id,
        locked_by_name: actor.name,
        unlocked_at: null,
        unlocked_by: null,
        unlocked_by_name: null,
        lock_note: note,

        updated_at: now,
      })

      await writeAttendanceAuditLog({
        actionType: 'hr_finalize_period',
        actionLabel: 'Finalisasi dan Lock Penuh Periode',
        actor,
        totalAffected: attendanceLogCount,
        note,
        metadata: {
          source: 'client_full_period_lock',
          confirmation_count: confirmationCount,
          attendance_log_count: attendanceLogCount,
        },
      })

      setMessage({
        type: 'success',
        text: `Finalisasi berhasil. ${confirmationCount} data karyawan dan ${attendanceLogCount} data absensi harian dikunci penuh.`,
      })

      await fetchData()
    } catch (error: any) {
      console.warn('Attendance finalize period warning:', error)

      setMessage({
        type: 'error',
        text: getActionErrorMessage(
          error,
          'Gagal finalisasi dan lock penuh periode.'
        ),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleLockPeriod() {
    const note = window.prompt(
      'Masukkan catatan lock periode:',
      'Periode absensi dikunci penuh oleh HR.'
    )

    if (note === null) return

    setIsProcessing(true)
    setMessage(null)

    try {
      const actor = await getActor()
      const now = new Date().toISOString()
      const lockNote = note || 'Periode absensi dikunci penuh oleh HR.'

      const confirmationPayload = buildConfirmationPayload({
        actor,
        note: lockNote,
        now,
        locked: true,
        finalized: false,
      })

      const confirmationCount = await upsertConfirmations(confirmationPayload)

      const attendanceLogCount = await updateLogsForPeriod({
        is_locked: true,
        locked_at: now,
        locked_by: actor.id,
        locked_by_name: actor.name,
        unlocked_at: null,
        unlocked_by: null,
        unlocked_by_name: null,
        lock_note: lockNote,
        updated_at: now,
      })

      await writeAttendanceAuditLog({
        actionType: 'hr_lock_period',
        actionLabel: 'Lock Penuh Periode',
        actor,
        totalAffected: attendanceLogCount,
        note: lockNote,
        metadata: {
          source: 'client_full_period_lock',
          confirmation_count: confirmationCount,
          attendance_log_count: attendanceLogCount,
        },
      })

      setMessage({
        type: 'success',
        text: `Periode berhasil dikunci penuh. ${confirmationCount} data karyawan dan ${attendanceLogCount} data absensi harian ikut terkunci.`,
      })

      await fetchData()
    } catch (error: any) {
      console.warn('Attendance lock period warning:', error)

      setMessage({
        type: 'error',
        text: getActionErrorMessage(error, 'Gagal lock penuh periode.'),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleUnlockPeriod() {
    const note = window.prompt(
      'Masukkan alasan unlock periode:',
      'Periode absensi dibuka kembali oleh HR.'
    )

    if (note === null) return

    setIsProcessing(true)
    setMessage(null)

    try {
      const actor = await getActor()
      const now = new Date().toISOString()
      const unlockNote = note || 'Periode absensi dibuka kembali oleh HR.'

      const { data: updatedConfirmations, error: confirmationError } =
        await supabase
          .from('attendance_period_confirmations')
          .update({
            is_locked: false,
            unlocked_at: now,
            unlocked_by: actor.id,
            unlocked_by_name: actor.name,
            lock_note: unlockNote,
            updated_at: now,
          })
          .eq('period_month', periodMonth)
          .select('id')

      if (confirmationError) throw confirmationError

      const attendanceLogCount = await updateLogsForPeriod({
        is_locked: false,
        unlocked_at: now,
        unlocked_by: actor.id,
        unlocked_by_name: actor.name,
        lock_note: unlockNote,
        updated_at: now,
      })

      await writeAttendanceAuditLog({
        actionType: 'hr_unlock_period',
        actionLabel: 'Unlock Penuh Periode',
        actor,
        totalAffected: attendanceLogCount,
        note: unlockNote,
        metadata: {
          source: 'client_full_period_unlock',
          confirmation_count: updatedConfirmations?.length || 0,
          attendance_log_count: attendanceLogCount,
        },
      })

      setMessage({
        type: 'success',
        text: `Periode berhasil dibuka kembali. ${updatedConfirmations?.length || 0} data karyawan dan ${attendanceLogCount} data absensi harian ikut terbuka.`,
      })

      await fetchData()
    } catch (error: any) {
      console.warn('Attendance unlock period warning:', error)

      setMessage({
        type: 'error',
        text: getActionErrorMessage(error, 'Gagal unlock penuh periode.'),
      })
    } finally {
      setIsProcessing(false)
    }
  }


  async function deleteAllRowsFromAttendanceTable(tableName: string) {
    const { count, error } = await supabase
      .from(tableName)
      .delete({
        count: 'exact',
      })
      .not('id', 'is', null)

    if (error) {
      throw new Error(`${tableName}: ${error.message}`)
    }

    return count || 0
  }

  async function handleDeleteAllAttendanceData() {
    const firstConfirm = window.confirm(
      [
        'PERINGATAN: Ini akan menghapus seluruh data proses Attendance HR.',
        '',
        'Data yang DIHAPUS:',
        '- attendance_logs',
        '- attendance_period_confirmations',
        '- attendance_uploads',
        '- attendance_audit_logs',
        '- attendance_records jika masih ada',
        '',
        'Data yang TIDAK dihapus:',
        '- employees / data karyawan',
        '- app_users / akun user',
        '- holidays / kalender libur',
        '- leave_requests / data cuti & izin',
        '- phl_records / saldo PHL',
        '',
        'Lanjutkan?'
      ].join('\n')
    )

    if (!firstConfirm) return

    const typed = window.prompt(
      'Ketik persis: HAPUS ATTENDANCE\n\nTindakan ini tidak bisa dibatalkan dari aplikasi.'
    )

    if (typed !== 'HAPUS ATTENDANCE') {
      setMessage({
        type: 'info',
        text: 'Reset attendance dibatalkan. Kalimat konfirmasi tidak sesuai.',
      })
      return
    }

    const finalConfirm = window.confirm(
      'Konfirmasi terakhir: semua data proses Attendance HR akan dihapus. Data karyawan tetap aman. Eksekusi sekarang?'
    )

    if (!finalConfirm) return

    setIsProcessing(true)
    setMessage(null)
    setSelectedSummary(null)

    const deleteResults: Record<string, number> = {}

    try {
      const tables = [
        'attendance_audit_logs',
        'attendance_period_confirmations',
        'attendance_logs',
        'attendance_uploads',
        'attendance_records',
      ]

      for (const table of tables) {
        try {
          deleteResults[table] = await deleteAllRowsFromAttendanceTable(table)
        } catch (error: any) {
          const message = String(error?.message || '')

          if (
            message.toLowerCase().includes('does not exist') ||
            message.toLowerCase().includes('could not find the table') ||
            message.toLowerCase().includes('relation') && message.toLowerCase().includes('does not exist')
          ) {
            deleteResults[table] = 0
            continue
          }

          throw error
        }
      }

      setLogs([])
      setConfirmations([])

      setMessage({
        type: 'success',
        text: `Reset Attendance HR berhasil. Terhapus: attendance_logs ${deleteResults.attendance_logs || 0}, attendance_period_confirmations ${deleteResults.attendance_period_confirmations || 0}, attendance_uploads ${deleteResults.attendance_uploads || 0}, attendance_audit_logs ${deleteResults.attendance_audit_logs || 0}, attendance_records ${deleteResults.attendance_records || 0}. Data karyawan tidak dihapus.`,
      })

      await fetchData()
    } catch (error: any) {
      console.warn('Delete all attendance data warning:', error)

      setMessage({
        type: 'error',
        text: getActionErrorMessage(
          error,
          'Gagal menghapus seluruh data Attendance HR.'
        ),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f5f7] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-sm">
          <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] xl:items-end">
            <div className="min-w-0">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                Data Absensi HR
              </div>

              <h1 className="text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Data Absensi Periode
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Monitoring rekap absensi karyawan berdasarkan periode cutoff 11 s.d. 10
                bulan berikutnya. Kontrol lock di halaman ini berlaku penuh untuk
                seluruh karyawan pada periode terpilih.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Tahun
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(event) => updatePeriodYear(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Bulan Periode
                  </span>
                  <select
                    value={selectedMonth}
                    onChange={(event) => updatePeriodMonth(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Cutoff Periode
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {periodRange.label}
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type === 'info'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {periodLockState.isFullyLocked && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Periode absensi ini sudah dikunci penuh HR. Semua employee pada periode ini tidak dapat mengubah data.
            </div>
          </div>
        )}

        {!periodLockState.isFullyLocked &&
          !periodLockState.isPartiallyLocked &&
          !periodLockState.unlockedAt && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-700">
              <div className="flex items-center gap-2">
                <Unlock className="h-4 w-4" />
                Periode masih bisa direvisi. Klik <strong>Lock</strong> untuk mengunci seluruh karyawan pada periode ini.
              </div>
            </div>
          )}

        {!periodLockState.isFullyLocked && periodLockState.isPartiallyLocked && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-700">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              Periode ini masih bisa direvisi sebagian. Klik <strong>Lock</strong> untuk mengunci seluruh karyawan pada periode ini.
            </div>
          </div>
        )}

        {!periodLockState.isFullyLocked && periodLockState.unlockedAt && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-700">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              Periode masih bisa direvisi. Employee dapat melakukan perubahan jika status periodenya masih memungkinkan.
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard
            title="Karyawan"
            value={dashboardStats.totalEmployees}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <StatCard
            title="Submitted"
            value={dashboardStats.submitted}
            icon={<ClockIcon />}
          />
          <StatCard
            title="Approved Atasan"
            value={dashboardStats.approved}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            title="Ada Request"
            value={dashboardStats.hasRequest}
            icon={<FileText className="h-5 w-5" />}
          />
          <StatCard
            title="Final HR"
            value={dashboardStats.finalized}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <StatCard
            title="Locked"
            value={dashboardStats.locked}
            icon={<Lock className="h-5 w-5" />}
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 md:w-[340px]">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIP, unit, jabatan..."
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">Semua Status</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved Atasan</option>
                <option value="ready_for_hr">Ready for HR</option>
                <option value="finalized">Finalized</option>
                <option value="locked">Locked</option>
                <option value="has_request">Ada Request</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                type="button"
                onClick={fetchData}
                disabled={isProcessing || isLoading}
                tone="light"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </ActionButton>

              <ActionButton
                type="button"
                onClick={handleSyncApprovedRequests}
                disabled={isProcessing || isLoading}
                tone="blue"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Sync Request
              </ActionButton>

              <ActionButton
                type="button"
                onClick={handleFinalizePeriod}
                disabled={isProcessing || isLoading}
                tone="dark"
                icon={<ShieldCheck className="h-4 w-4" />}
              >
                Finalisasi
              </ActionButton>

              <ActionButton
                type="button"
                onClick={handleLockPeriod}
                disabled={isProcessing || isLoading || periodLockState.isFullyLocked}
                tone="amber"
                icon={<Lock className="h-4 w-4" />}
              >
                Lock
              </ActionButton>

              <ActionButton
                type="button"
                onClick={handleUnlockPeriod}
                disabled={isProcessing || isLoading || (!periodLockState.isFullyLocked && !periodLockState.isPartiallyLocked)}
                tone="red"
                icon={<Unlock className="h-4 w-4" />}
              >
                Unlock
              </ActionButton>

              <ActionButton
                type="button"
                onClick={handleDeleteAllAttendanceData}
                disabled={isProcessing || isLoading}
                tone="danger"
                icon={<Trash2 className="h-4 w-4" />}
              >
                Reset Attendance
              </ActionButton>
            </div>
          </div>

          {isProcessing && (
            <div className="border-b border-slate-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses data periode...
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat data absensi...
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1260px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-bold">Karyawan</th>
                    <th className="px-4 py-3 font-bold">Unit / Jabatan</th>
                    <th className="px-4 py-3 font-bold">Ringkasan Absensi</th>
                    <th className="px-4 py-3 font-bold">Approval</th>
                    <th className="px-4 py-3 font-bold">Lock</th>
                    <th className="px-4 py-3 text-center font-bold">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSummaries.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                      >
                        Tidak ada data sesuai filter.
                      </td>
                    </tr>
                  )}

                  {filteredSummaries.map((summary) => (
                    <tr
                      key={summary.employee.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold text-slate-950">
                          {getEmployeeName(summary.employee)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          NIP/Machine: {getEmployeeNumber(summary.employee)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {summary.employee.email || '-'}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-semibold text-slate-900">
                          {getEmployeeUnit(summary.employee)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getEmployeePosition(summary.employee)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          <MiniBadge label="Hadir" value={summary.presentDays} tone="dark" />
                          <MiniBadge label="Cuti" value={summary.leaveDays} />
                          <MiniBadge label="Sakit" value={summary.sickDays} />
                          <MiniBadge label="Izin" value={summary.permitDays} />
                          <MiniBadge label="Tugas Luar" value={summary.officialTravelDays} />
                          <MiniBadge label="Klaim PHL" value={summary.phlClaimDays} />
                          <MiniBadge label="Koreksi" value={summary.manualCorrectionDays} />
                          {summary.absentDays > 0 && (
                            <MiniBadge label="Alpa" value={summary.absentDays} tone="red" />
                          )}
                          {summary.incompleteDays > 0 && (
                            <MiniBadge label="Incomplete" value={summary.incompleteDays} tone="red" />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Atasan
                            </p>
                            <StatusPill status={summary.confirmation?.supervisor_status} />
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Final HR
                            </p>
                            <StatusPill status={summary.confirmation?.hr_status} />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        {summary.rowLocked ? (
                          <div className="inline-flex flex-col rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">
                            <span className="inline-flex items-center gap-1.5">
                              <Lock className="h-3.5 w-3.5" />
                              Locked
                            </span>
                            <span className="mt-1 text-[10px] font-semibold text-white/60">
                              {formatDateTime(
                                summary.confirmation?.locked_at ||
                                  summary.logs.find((log) => log.locked_at)?.locked_at ||
                                  periodLockState.lockedAt
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                            <Unlock className="h-3.5 w-3.5" />
                            Open
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedSummary(summary)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                          title="Lihat detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedSummary && (
        <DetailModal
          summary={selectedSummary}
          periodLabel={periodRange.label}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </main>
  )
}

function ClockIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  )
}

function MiniBadge({
  label,
  value,
  tone = 'light',
}: {
  label: string
  value: number
  tone?: 'light' | 'dark' | 'red'
}) {
  const className =
    tone === 'dark'
      ? 'bg-slate-950 text-white'
      : tone === 'red'
        ? 'bg-red-50 text-red-700'
        : 'bg-slate-100 text-slate-700'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}
    >
      {label} <span className="ml-1">{value}</span>
    </span>
  )
}

function ActionButton({
  children,
  icon,
  tone,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  icon: ReactNode
  tone: 'light' | 'blue' | 'dark' | 'amber' | 'red' | 'danger'
}) {
  const className = {
    light:
      'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-white',
    blue:
      'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:bg-blue-50',
    dark:
      'border-slate-950 bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-950',
    amber:
      'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:bg-amber-50',
    red:
      'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:bg-red-50',
    danger:
      'border-red-700 bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600',
  }[tone]

  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}

function DetailModal({
  summary,
  periodLabel,
  onClose,
}: {
  summary: EmployeeAttendanceSummary
  periodLabel: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">
              Detail Absensi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {getEmployeeName(summary.employee)} · {periodLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-bold">Tanggal</th>
                <th className="px-4 py-3 font-bold">Check In</th>
                <th className="px-4 py-3 font-bold">Check Out</th>
                <th className="px-4 py-3 font-bold">Manual In</th>
                <th className="px-4 py-3 font-bold">Manual Out</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Approval Atasan</th>
                <th className="px-4 py-3 font-bold">Final HR</th>
                <th className="px-4 py-3 font-bold">Lock</th>
                <th className="px-4 py-3 font-bold">Catatan</th>
              </tr>
            </thead>

            <tbody>
              {summary.logs.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    Belum ada data absensi harian.
                  </td>
                </tr>
              )}

              {summary.logs.map((log) => (
                <tr key={log.id || log.attendance_date} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatShortDate(log.attendance_date)}
                  </td>
                  <td className="px-4 py-3">{log.check_in || '-'}</td>
                  <td className="px-4 py-3">{log.check_out || '-'}</td>
                  <td className="px-4 py-3">{log.manual_check_in || log.requested_check_in || '-'}</td>
                  <td className="px-4 py-3">{log.manual_check_out || log.requested_check_out || '-'}</td>
                  <td className="px-4 py-3">
                    <AttendancePill log={log} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={log.supervisor_approval_status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={log.hr_final_status} />
                  </td>
                  <td className="px-4 py-3">
                    {log.is_locked ? (
                      <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold text-white">
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                        Open
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.employee_daily_note || log.correction_reason || log.lock_note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
