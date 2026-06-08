'use client'

import { useEffect, useMemo, useState } from 'react'
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
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <CalendarDays className="h-3.5 w-3.5" />
                Data Absensi HR
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Data Absensi Periode
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Monitoring rekap absensi karyawan berdasarkan periode cutoff 11
                s.d. 10 bulan berikutnya. Approved request seperti cuti, izin,
                sakit, tugas luar, dan klaim PHL akan tampil sebagai keterangan
                yang mudah dibaca.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Tahun
                </label>
                <select
                  value={selectedYear}
                  onChange={(event) => updatePeriodYear(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-400"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Bulan Periode
                </label>
                <select
                  value={selectedMonth}
                  onChange={(event) => updatePeriodMonth(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-400"
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold">Cutoff periode:</span>{' '}
            {periodRange.label}
          </div>
        </section>

        {message && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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

        <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIP, unit, jabatan..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 md:w-80"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-slate-400"
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

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fetchData}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleSyncApprovedRequests}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync Request
              </button>

              <button
                type="button"
                onClick={handleFinalizePeriod}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Finalisasi
              </button>

              <button
                type="button"
                onClick={handleLockPeriod}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                Lock
              </button>

              <button
                type="button"
                onClick={handleUnlockPeriod}
                disabled={isLoading || isProcessing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Unlock className="h-4 w-4" />
                Unlock
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
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <AlertTriangle className="h-10 w-10 text-slate-400" />
              <h2 className="mt-4 text-base font-bold text-slate-900">
                Data tidak ditemukan
              </h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Tidak ada data yang sesuai dengan periode atau filter yang
                dipilih.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1300px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-bold">Karyawan</th>
                    <th className="px-5 py-4 font-bold">Unit/Jabatan</th>
                    <th className="px-5 py-4 text-center font-bold">Hadir</th>
                    <th className="px-5 py-4 text-center font-bold">Cuti</th>
                    <th className="px-5 py-4 text-center font-bold">Sakit</th>
                    <th className="px-5 py-4 text-center font-bold">Izin</th>
                    <th className="px-5 py-4 text-center font-bold">
                      Tugas Luar
                    </th>
                    <th className="px-5 py-4 text-center font-bold">
                      Klaim PHL
                    </th>
                    <th className="px-5 py-4 text-center font-bold">
                      Koreksi
                    </th>
                    <th className="px-5 py-4 font-bold">Approval Atasan</th>
                    <th className="px-5 py-4 font-bold">Final HR</th>
                    <th className="px-5 py-4 font-bold">Lock</th>
                    <th className="px-5 py-4 text-right font-bold">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSummaries.map((summary) => {
                    return (
                      <tr
                        key={summary.employee.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-slate-950">
                            {getEmployeeName(summary.employee)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            NIP/Machine: {getEmployeeNumber(summary.employee)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {summary.employee.email || '-'}
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="font-semibold text-slate-800">
                            {getEmployeeUnit(summary.employee)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {getEmployeePosition(summary.employee)}
                          </div>
                        </td>

                        <NumberCell value={summary.presentDays} />
                        <NumberCell value={summary.leaveDays} />
                        <NumberCell value={summary.sickDays} />
                        <NumberCell value={summary.permitDays} />
                        <NumberCell value={summary.officialTravelDays} />
                        <NumberCell value={summary.phlClaimDays} />
                        <NumberCell value={summary.manualCorrectionDays} />

                        <td className="px-5 py-4 align-top">
                          <StatusPill
                            status={summary.confirmation?.supervisor_status}
                          />
                          {summary.confirmation?.supervisor_approved_by_name && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              oleh{' '}
                              {
                                summary.confirmation
                                  .supervisor_approved_by_name
                              }
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <StatusPill status={summary.confirmation?.hr_status} />
                          {summary.confirmation?.hr_finalized_by_name && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              oleh {summary.confirmation.hr_finalized_by_name}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 align-top">
                          {summary.confirmation?.is_locked ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                                <Lock className="h-3 w-3" />
                                Locked
                              </span>
                              <div className="mt-1 text-[11px] text-slate-500">
                                {summary.confirmation.locked_by_name || '-'}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                              <Unlock className="h-3 w-3" />
                              Open
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedSummary(summary)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                            Detail
                          </button>
                        </td>
                      </tr>
                    )
                  })}
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
    <div className="rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function NumberCell({ value }: { value: number }) {
  return (
    <td className="px-5 py-4 text-center align-top">
      <span
        className={`inline-flex min-w-8 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
          value > 0
            ? 'bg-slate-900 text-white'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {value}
      </span>
    </td>
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
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Detail Absensi — {getEmployeeName(summary.employee)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Periode {periodLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-100px)] overflow-y-auto p-5 sm:p-6">
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
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <span className="font-bold">Catatan Lock:</span>{' '}
              {summary.confirmation.lock_note}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1200px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">Tanggal</th>
                  <th className="px-4 py-3 font-bold">Masuk</th>
                  <th className="px-4 py-3 font-bold">Pulang</th>
                  <th className="px-4 py-3 font-bold">Keterangan</th>
                  <th className="px-4 py-3 font-bold">Status Request</th>
                  <th className="px-4 py-3 font-bold">Approval Atasan</th>
                  <th className="px-4 py-3 font-bold">Final HR</th>
                  <th className="px-4 py-3 font-bold">Pending Job</th>
                  <th className="px-4 py-3 font-bold">Handover</th>
                  <th className="px-4 py-3 font-bold">Bukti</th>
                </tr>
              </thead>

              <tbody>
                {summary.logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Belum ada log absensi pada periode ini.
                    </td>
                  </tr>
                ) : (
                  summary.logs.map((log, index) => {
                    const proofUrl =
                      log.proof_file_url || log.proof_url || log.attachment_url

                    return (
                      <tr
                        key={log.id || `${log.attendance_date}-${index}`}
                        className="border-b border-slate-100 align-top last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {formatShortDate(log.attendance_date)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {log.attendance_date || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-700">
                          {log.check_in || '-'}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-700">
                          {log.check_out || '-'}
                        </td>

                        <td className="px-4 py-3">
                          <AttendancePill log={log} />

                          {log.absence_request_source && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              Sumber: {log.absence_request_source}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusPill status={log.absence_request_status} />
                        </td>

                        <td className="px-4 py-3">
                          <StatusPill status={log.supervisor_approval_status} />
                        </td>

                        <td className="px-4 py-3">
                          <StatusPill status={log.hr_final_status} />
                          {log.hr_finalized_by_name && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              oleh {log.hr_finalized_by_name}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[220px] whitespace-pre-wrap text-xs leading-5 text-slate-600">
                            {log.job_pending || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[220px] text-xs leading-5 text-slate-600">
                            <div>
                              <span className="font-semibold">Ke:</span>{' '}
                              {log.handover_to || '-'}
                            </div>
                            {log.handover_note && (
                              <div className="mt-1 whitespace-pre-wrap">
                                {log.handover_note}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
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
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value || '-'}</p>
    </div>
  )
}