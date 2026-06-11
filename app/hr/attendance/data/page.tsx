'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  Search,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileText,
  Clock3,
  UserCheck,
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
}

type AttendanceLog = {
  id?: string
  employee_id?: string | null
  attendance_date?: string | null
  check_in?: string | null
  check_out?: string | null
  machine_pin?: string | null

  status?: string | null
  attendance_status?: string | null

  employee_confirmation_status?: string | null
  supervisor_approval_status?: string | null
  hr_final_status?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  hr_finalized_by_name?: string | null

  absence_request_type?: string | null
  absence_request_label?: string | null
  absence_request_status?: string | null
  absence_request_source?: string | null

  job_pending?: string | null
  handover_to?: string | null
  handover_note?: string | null

  proof_file_url?: string | null
  proof_url?: string | null
  attachment_url?: string | null

  is_locked?: boolean | null
  locked_at?: string | null
  locked_by?: string | null
  locked_by_name?: string | null
  lock_note?: string | null

  created_at?: string | null
  updated_at?: string | null
}

type PeriodConfirmation = {
  id?: string
  employee_id?: string | null
  period_month?: string | null

  employee_status?: string | null
  supervisor_status?: string | null
  hr_status?: string | null

  submitted_at?: string | null
  supervisor_approved_at?: string | null
  supervisor_approved_by_name?: string | null

  hr_finalized_at?: string | null
  hr_finalized_by_name?: string | null

  is_locked?: boolean | null
  locked_at?: string | null
  locked_by_name?: string | null
  lock_note?: string | null

  updated_at?: string | null
}

type EmployeeAttendanceSummary = {
  employee: Employee
  confirmation?: PeriodConfirmation
  logs: AttendanceLog[]
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
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
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

  const parsed = new Date(date)

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

function normalizeStatus(log: AttendanceLog) {
  return log.absence_request_type || log.status || log.attendance_status || 'unknown'
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

  if (
    ['present', 'hadir', 'normal', 'manual', 'manual_correction'].includes(status)
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (
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
    ].includes(status)
  ) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (status === 'sick') {
    return 'border-purple-200 bg-purple-50 text-purple-700'
  }

  if (status === 'permit' || status === 'izin') {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  if (status === 'official_travel' || status === 'business_trip') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-700'
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

function safeLower(value: unknown) {
  return String(value || '').toLowerCase()
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

  const summaries = useMemo<EmployeeAttendanceSummary[]>(() => {
    const logsByEmployee = new Map<string, AttendanceLog[]>()

    logs.forEach((log) => {
      if (!log.employee_id) return

      const existing = logsByEmployee.get(log.employee_id) || []
      existing.push(log)
      logsByEmployee.set(log.employee_id, existing)
    })

    const confirmationByEmployee = new Map<string, PeriodConfirmation>()

    confirmations.forEach((confirmation) => {
      if (!confirmation.employee_id) return
      confirmationByEmployee.set(confirmation.employee_id, confirmation)
    })

    return employees.map((employee) => {
      const employeeLogs = logsByEmployee.get(employee.id) || []
      const confirmation = confirmationByEmployee.get(employee.id)

      const presentDays = countBy(employeeLogs, (log) => {
        const status = normalizeStatus(log)

        return ['present', 'hadir', 'normal', 'manual', 'manual_correction'].includes(
          status
        )
      })

      const leaveDays = countBy(employeeLogs, (log) => {
        const status = normalizeStatus(log)

        return [
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
        ].includes(status)
      })

      const sickDays = countBy(
        employeeLogs,
        (log) => normalizeStatus(log) === 'sick'
      )

      const permitDays = countBy(employeeLogs, (log) =>
        ['permit', 'izin'].includes(normalizeStatus(log))
      )

      const officialTravelDays = countBy(employeeLogs, (log) =>
        ['official_travel', 'business_trip'].includes(normalizeStatus(log))
      )

      const phlClaimDays = countBy(employeeLogs, (log) =>
        ['phl_claim', 'claim_phl'].includes(normalizeStatus(log))
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

      return {
        employee,
        confirmation,
        logs: employeeLogs.sort((a, b) =>
          String(a.attendance_date || '').localeCompare(
            String(b.attendance_date || '')
          )
        ),
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
  }, [employees, logs, confirmations])

  const filteredSummaries = useMemo(() => {
    return summaries.filter((summary) => {
      const keyword = safeLower(search)

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
        return Boolean(summary.confirmation?.is_locked)
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
    const locked = summaries.filter((item) => item.confirmation?.is_locked).length
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
      console.error(error)

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
      console.error(error)

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
      `Finalisasi periode ${periodMonth}?\n\nSistem akan otomatis sync approved request terlebih dahulu, lalu mengunci periode absensi.`
    )

    if (!confirmed) return

    setIsProcessing(true)
    setMessage(null)

    try {
      const actor = await getActor()

      const { data, error } = await supabase.rpc(
        'hr_finalize_attendance_period',
        {
          p_period_month: periodMonth,
          p_actor_id: actor.id,
          p_actor_name: actor.name,
          p_note:
            'Finalisasi periode absensi HR. Approved request otomatis disinkronkan sebelum finalisasi.',
        }
      )

      if (error) throw error

      setMessage({
        type: 'success',
        text:
          data?.message ||
          'Finalisasi berhasil. Approved request sudah otomatis disinkronkan.',
      })

      await fetchData()
    } catch (error: any) {
      console.error(error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal finalisasi periode. Cek function hr_finalize_attendance_period.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleLockPeriod() {
    const note = window.prompt(
      'Masukkan catatan lock periode:',
      'Periode absensi dikunci oleh HR.'
    )

    if (note === null) return

    setIsProcessing(true)
    setMessage(null)

    try {
      const actor = await getActor()

      const { error } = await supabase.rpc('hr_lock_attendance_period', {
        p_period_month: periodMonth,
        p_actor_id: actor.id,
        p_actor_name: actor.name,
        p_note: note || 'Periode absensi dikunci oleh HR.',
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Periode berhasil dikunci.',
      })

      await fetchData()
    } catch (error: any) {
      console.error(error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal lock periode. Pastikan function hr_lock_attendance_period tersedia.',
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

      const { error } = await supabase.rpc('hr_unlock_attendance_period', {
        p_period_month: periodMonth,
        p_actor_id: actor.id,
        p_actor_name: actor.name,
        p_note: note || 'Periode absensi dibuka kembali oleh HR.',
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Periode berhasil dibuka kembali.',
      })

      await fetchData()
    } catch (error: any) {
      console.error(error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal unlock periode. Pastikan function hr_unlock_attendance_period tersedia.',
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
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Data Absensi HR</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Data Absensi Periode
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Monitoring rekap absensi karyawan berdasarkan periode cutoff 11 s.d. 10 bulan berikutnya.
                Approved request seperti cuti, izin, sakit, tugas luar, dan klaim PHL tampil sebagai keterangan yang mudah dibaca.
              </p>
            </div>

            <div className="grid min-w-0 gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr]">
              <label className="block min-w-0">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Tahun
                </span>
                <select
                  value={selectedYear}
                  onChange={(event) => updatePeriodYear(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-400"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Bulan Periode
                </span>
                <select
                  value={selectedMonth}
                  onChange={(event) => updatePeriodMonth(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-400"
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cutoff Periode
                </p>
                <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-900">
                  {periodRange.label}
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-medium leading-6 ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {message.text}
          </section>
        )}

        <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <StatCard
            label="Karyawan"
            value={dashboardStats.totalEmployees}
            icon={UserCheck}
          />
          <StatCard
            label="Submitted"
            value={dashboardStats.submitted}
            icon={Clock3}
          />
          <StatCard
            label="Approved Atasan"
            value={dashboardStats.approved}
            icon={CheckCircle2}
          />
          <StatCard
            label="Ada Request"
            value={dashboardStats.hasRequest}
            icon={FileText}
          />
          <StatCard
            label="Final HR"
            value={dashboardStats.finalized}
            icon={ShieldCheck}
          />
          <StatCard label="Locked" value={dashboardStats.locked} icon={Lock} />
        </section>

        <section className="rounded-[1.75rem] border border-white/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(220px,360px)_minmax(180px,240px)]">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIP, unit, jabatan..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-400"
              >
                <option value="all">Semua Status</option>
                <option value="submitted">Submitted Employee</option>
                <option value="approved">Approved Atasan</option>
                <option value="ready_for_hr">Ready for HR</option>
                <option value="finalized">Final HR</option>
                <option value="locked">Locked</option>
                <option value="has_request">Ada Cuti/Izin/PHL</option>
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:flex xl:flex-wrap xl:justify-end">
              <button
                type="button"
                onClick={fetchData}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleSyncApprovedRequests}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 shrink-0" />
                )}
                <span>Sync Request</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizePeriod}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                )}
                <span>Finalisasi</span>
              </button>

              <button
                type="button"
                onClick={handleLockPeriod}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock className="h-4 w-4 shrink-0" />
                <span>Lock</span>
              </button>

              <button
                type="button"
                onClick={handleUnlockPeriod}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 lg:col-span-1"
              >
                <Unlock className="h-4 w-4 shrink-0" />
                <span>Unlock</span>
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat data absensi...
              </div>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <EmptyState />
          ) : (
            <AttendanceSummaryList
              summaries={filteredSummaries}
              onDetail={(summary) => setSelectedSummary(summary)}
            />
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

function AttendanceSummaryList({
  summaries,
  onDetail,
}: {
  summaries: EmployeeAttendanceSummary[]
  onDetail: (summary: EmployeeAttendanceSummary) => void
}) {
  return (
    <>
      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="w-[25%] px-4 py-4 font-bold">Karyawan</th>
              <th className="w-[21%] px-4 py-4 font-bold">Unit / Jabatan</th>
              <th className="w-[27%] px-4 py-4 font-bold">Ringkasan Absensi</th>
              <th className="w-[15%] px-4 py-4 font-bold">Approval</th>
              <th className="w-[8%] px-4 py-4 font-bold">Lock</th>
              <th className="w-[4%] px-4 py-4 text-right font-bold">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {summaries.map((summary) => (
              <tr
                key={summary.employee.id}
                className="border-b border-slate-100 transition hover:bg-slate-50/70"
              >
                <td className="px-4 py-4 align-top">
                  <div className="min-w-0">
                    <p className="break-words font-bold leading-5 text-slate-950">
                      {getEmployeeName(summary.employee)}
                    </p>
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                      NIP/Machine: {getEmployeeNumber(summary.employee)}
                    </p>
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                      {summary.employee.email || '-'}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <p className="break-words font-semibold leading-5 text-slate-800">
                    {getEmployeeUnit(summary.employee)}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                    {getEmployeePosition(summary.employee)}
                  </p>
                </td>

                <td className="px-4 py-4 align-top">
                  <MetricWrap summary={summary} />
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
                  <LockBadge confirmation={summary.confirmation} />
                </td>

                <td className="px-4 py-4 text-right align-top">
                  <button
                    type="button"
                    onClick={() => onDetail(summary)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                    title="Detail"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {summaries.map((summary) => (
          <div
            key={summary.employee.id}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-bold leading-5 text-slate-950">
                  {getEmployeeName(summary.employee)}
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                  {getEmployeeNumber(summary.employee)} · {summary.employee.email || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDetail(summary)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                title="Detail"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <p className="break-words text-sm font-semibold text-slate-800">
                {getEmployeeUnit(summary.employee)}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                {getEmployeePosition(summary.employee)}
              </p>
            </div>

            <div className="mt-3">
              <MetricWrap summary={summary} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SmallStatusBox label="Approval Atasan">
                <StatusPill status={summary.confirmation?.supervisor_status} />
              </SmallStatusBox>
              <SmallStatusBox label="Final HR">
                <StatusPill status={summary.confirmation?.hr_status} />
              </SmallStatusBox>
              <SmallStatusBox label="Lock">
                <LockBadge confirmation={summary.confirmation} />
              </SmallStatusBox>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="h-10 w-10 text-slate-400" />
      <h2 className="mt-4 text-base font-bold text-slate-900">
        Data tidak ditemukan
      </h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        Tidak ada data yang sesuai dengan periode atau filter yang dipilih.
      </p>
    </div>
  )
}

function MetricWrap({ summary }: { summary: EmployeeAttendanceSummary }) {
  const items = [
    { label: 'Hadir', value: summary.presentDays },
    { label: 'Cuti', value: summary.leaveDays },
    { label: 'Sakit', value: summary.sickDays },
    { label: 'Izin', value: summary.permitDays },
    { label: 'Tugas Luar', value: summary.officialTravelDays },
    { label: 'Klaim PHL', value: summary.phlClaimDays },
    { label: 'Koreksi', value: summary.manualCorrectionDays },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            item.value > 0
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span>{item.label}</span>
          <span>{item.value}</span>
        </span>
      ))}
    </div>
  )
}

function SmallStatusBox({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function LockBadge({ confirmation }: { confirmation?: PeriodConfirmation }) {
  if (confirmation?.is_locked) {
    return (
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
          <Lock className="h-3 w-3 shrink-0" />
          Locked
        </span>
        <div className="mt-1 break-words text-[11px] leading-5 text-slate-500">
          {confirmation.locked_by_name || '-'}
        </div>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
      <Unlock className="h-3 w-3 shrink-0" />
      Open
    </span>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: any
}) {
  return (
    <div className="min-w-0 rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-bold text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex min-w-0 items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold leading-7 text-slate-950">
              Detail Absensi — {getEmployeeName(summary.employee)}
            </h2>
            <p className="mt-1 break-words text-sm leading-6 text-slate-500">
              Periode {periodLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <InfoBox
              label="NIP / Machine"
              value={getEmployeeNumber(summary.employee)}
            />
            <InfoBox label="Unit" value={getEmployeeUnit(summary.employee)} />
            <InfoBox
              label="Jabatan"
              value={getEmployeePosition(summary.employee)}
            />
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <InfoBox
              label="Approval Atasan"
              value={
                getSimpleStatusBadge(summary.confirmation?.supervisor_status)
                  .label
              }
            />
            <InfoBox
              label="Final HR"
              value={getSimpleStatusBadge(summary.confirmation?.hr_status).label}
            />
            <InfoBox
              label="Lock Status"
              value={summary.confirmation?.is_locked ? 'Locked' : 'Open'}
            />
            <InfoBox
              label="Locked By"
              value={summary.confirmation?.locked_by_name || '-'}
            />
          </div>

          {summary.confirmation?.lock_note && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              <span className="font-bold">Catatan Lock:</span>{' '}
              {summary.confirmation.lock_note}
            </div>
          )}

          <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  Detail Harian
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ditampilkan sebagai card supaya tidak melebar atau terpotong di layar kecil.
                </p>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                {summary.logs.length} data
              </span>
            </div>

            {summary.logs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Belum ada log absensi pada periode ini.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {summary.logs.map((log, index) => {
                  const proofUrl =
                    log.proof_file_url || log.proof_url || log.attachment_url

                  return (
                    <div
                      key={log.id || `${log.attendance_date}-${index}`}
                      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950">
                            {formatShortDate(log.attendance_date)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {log.attendance_date || '-'}
                          </p>
                        </div>
                        <AttendancePill log={log} />
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <InfoMini label="Masuk" value={log.check_in || '-'} />
                        <InfoMini label="Pulang" value={log.check_out || '-'} />
                        <InfoMini label="Status Request">
                          <StatusPill status={log.absence_request_status} />
                        </InfoMini>
                        <InfoMini label="Approval Atasan">
                          <StatusPill status={log.supervisor_approval_status} />
                        </InfoMini>
                        <InfoMini label="Final HR">
                          <StatusPill status={log.hr_final_status} />
                        </InfoMini>
                        <InfoMini label="Bukti">
                          {proofUrl ? (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Buka
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </InfoMini>
                      </div>

                      {(log.absence_request_source || log.hr_finalized_by_name) && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <InfoMini
                            label="Sumber"
                            value={log.absence_request_source || '-'}
                          />
                          <InfoMini
                            label="Finalized By"
                            value={log.hr_finalized_by_name || '-'}
                          />
                        </div>
                      )}

                      {(log.job_pending || log.handover_to || log.handover_note) && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <InfoMini
                            label="Pending Job"
                            value={log.job_pending || '-'}
                            long
                          />
                          <InfoMini label="Handover" long>
                            <div className="space-y-1">
                              <div>
                                <span className="font-semibold">Ke:</span>{' '}
                                {log.handover_to || '-'}
                              </div>
                              {log.handover_note && (
                                <div className="whitespace-pre-wrap">
                                  {log.handover_note}
                                </div>
                              )}
                            </div>
                          </InfoMini>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-900">
              Ringkasan Timestamp
            </h3>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <InfoBox
                label="Submitted"
                value={formatDateTime(summary.confirmation?.submitted_at)}
              />
              <InfoBox
                label="Approved Atasan"
                value={formatDateTime(
                  summary.confirmation?.supervisor_approved_at
                )}
              />
              <InfoBox
                label="Final HR"
                value={formatDateTime(summary.confirmation?.hr_finalized_at)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoMini({
  label,
  value,
  children,
  long = false,
}: {
  label: string
  value?: string
  children?: ReactNode
  long?: boolean
}) {
  return (
    <div className={`min-w-0 rounded-xl bg-slate-50 p-3 ${long ? 'sm:col-span-1' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1 break-words text-xs font-semibold leading-5 text-slate-700">
        {children || value || '-'}
      </div>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="break-words text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-900">
        {value || '-'}
      </p>
    </div>
  )
}
