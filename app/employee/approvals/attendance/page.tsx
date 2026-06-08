'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
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

type Employee = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
  is_active: boolean | null
}

type AttendancePeriodConfirmation = {
  id: string
  employee_id: string

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null

  period_month: string
  period_start: string | null
  period_end: string | null

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

type StatusFilter =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'ready_for_hr'
  | 'finalized'
  | 'locked'
  | 'all'

export default function EmployeeAttendanceApprovalPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [supervisor, setSupervisor] = useState<Employee | null>(null)
  const [subordinates, setSubordinates] = useState<Employee[]>([])
  const [confirmations, setConfirmations] = useState<AttendancePeriodConfirmation[]>([])

  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const periodRange = useMemo(() => {
    return getCutoffRange(periodMonth)
  }, [periodMonth])

  const filteredConfirmations = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return confirmations.filter((item) => {
      const matchKeyword =
        !keyword ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.machine_pin?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword) ||
        item.supervisor_name?.toLowerCase().includes(keyword)

      if (!matchKeyword) return false

      if (statusFilter === 'all') return true

      if (statusFilter === 'pending') {
        return normalizeText(item.supervisor_status) === 'pending'
      }

      if (statusFilter === 'approved') {
        return normalizeText(item.supervisor_status) === 'approved'
      }

      if (statusFilter === 'rejected') {
        return normalizeText(item.supervisor_status) === 'rejected'
      }

      if (statusFilter === 'ready_for_hr') {
        return normalizeText(item.hr_status) === 'ready_for_hr'
      }

      if (statusFilter === 'finalized') {
        return normalizeText(item.hr_status) === 'finalized'
      }

      if (statusFilter === 'locked') {
        return item.is_locked === true
      }

      return true
    })
  }, [confirmations, searchKeyword, statusFilter])

  const summary = useMemo(() => {
    return confirmations.reduce(
      (acc, item) => {
        acc.total += 1

        if (normalizeText(item.supervisor_status) === 'pending') acc.pending += 1
        if (normalizeText(item.supervisor_status) === 'approved') acc.approved += 1
        if (normalizeText(item.supervisor_status) === 'rejected') acc.rejected += 1
        if (normalizeText(item.hr_status) === 'ready_for_hr') acc.readyForHR += 1
        if (normalizeText(item.hr_status) === 'finalized') acc.finalized += 1
        if (item.is_locked) acc.locked += 1

        return acc
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        readyForHR: 0,
        finalized: 0,
        locked: 0,
      }
    )
  }, [confirmations])

  useEffect(() => {
    fetchData()
  }, [periodMonth])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

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
      .maybeSingle<Employee>()

    if (supervisorError) {
      setErrorMessage(supervisorError.message)
      setLoading(false)
      return
    }

    if (!supervisorData) {
      setErrorMessage('Data atasan tidak ditemukan.')
      setLoading(false)
      return
    }

    setSupervisor(supervisorData)

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setLoading(false)
      return
    }

    const subordinateList = (employeeData || []).filter((employee) => {
      const supervisorName = normalizeText(supervisorData.full_name)
      const supervisorId = normalizeText(supervisorData.id)
      const supervisorEmployeeNumber = normalizeText(supervisorData.employee_number)
      const supervisorEmail = normalizeText(supervisorData.email)

      const employeeSupervisorOne = normalizeText(employee.supervisor_1)
      const employeeSupervisorTwo = normalizeText(employee.supervisor_2)

      return (
        employeeSupervisorOne === supervisorName ||
        employeeSupervisorOne === supervisorId ||
        employeeSupervisorOne === supervisorEmployeeNumber ||
        employeeSupervisorOne === supervisorEmail ||
        employeeSupervisorTwo === supervisorName ||
        employeeSupervisorTwo === supervisorId ||
        employeeSupervisorTwo === supervisorEmployeeNumber ||
        employeeSupervisorTwo === supervisorEmail
      )
    })

    setSubordinates(subordinateList)

    if (subordinateList.length === 0) {
      setConfirmations([])
      setLoading(false)
      return
    }

    const subordinateIds = subordinateList.map((item) => item.id)

    const { data: confirmationData, error: confirmationError } = await supabase
      .from('attendance_period_confirmations')
      .select('*')
      .in('employee_id', subordinateIds)
      .eq('period_month', periodMonth)
      .order('employee_submitted_at', { ascending: false })

    if (confirmationError) {
      setErrorMessage(confirmationError.message)
      setConfirmations([])
      setLoading(false)
      return
    }

    setConfirmations(confirmationData || [])
    setLoading(false)
  }

  return (
    <>
      <Topbar
        title="Approval Absensi"
        description="Review dan approve absensi bawahan per periode cut-off."
      />

      <section className="space-y-6 p-6">
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
              <Link
                href="/employee/approvals"
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 backdrop-blur-xl transition hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Approval Tim
              </Link>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <CalendarCheck size={15} className="text-[#5ac8fa]" />
                Attendance Approval
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Approval Absensi Bawahan
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Pilih periode cut-off, lihat daftar bawahan yang sudah submit absensi,
                lalu masuk ke detail untuk approve atau reject.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[720px]">
              <HeroMetric label="Bawahan" value={String(subordinates.length)} />
              <HeroMetric label="Submitted" value={String(summary.total)} />
              <HeroMetric label="Pending" value={String(summary.pending)} />
              <HeroMetric label="Locked" value={String(summary.locked)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Menunggu Approval"
            value={String(summary.pending)}
            description="Periode yang perlu direview atasan"
            icon={<Clock3 size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Disetujui Atasan"
            value={String(summary.approved)}
            description="Sudah approved dan siap HR"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Ditolak"
            value={String(summary.rejected)}
            description="Dikembalikan ke employee"
            icon={<XCircle size={22} />}
            tone="red"
          />

          <SummaryCard
            title="Final / Locked"
            value={`${summary.finalized} / ${summary.locked}`}
            description="Sudah final HR atau dikunci"
            icon={<Lock size={22} />}
            tone="blue"
          />
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 md:grid-cols-[220px_240px_1fr]">
              <label className="block">
                <span className="harmony-label">Periode Cut-off</span>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(event) => setPeriodMonth(event.target.value)}
                  className="harmony-input"
                />
              </label>

              <label className="block">
                <span className="harmony-label">Filter Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="harmony-select"
                >
                  <option value="pending">Menunggu Approval</option>
                  <option value="approved">Disetujui Atasan</option>
                  <option value="rejected">Ditolak</option>
                  <option value="ready_for_hr">Siap HR</option>
                  <option value="finalized">Final HR</option>
                  <option value="locked">Locked</option>
                  <option value="all">Semua Data</option>
                </select>
              </label>

              <div>
                <span className="harmony-label">Rentang Periode</span>
                <div className="flex min-h-12 items-center rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 text-sm font-semibold text-[#1d1d1f]">
                  {formatDisplayDate(periodRange.start)} - {formatDisplayDate(periodRange.end)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm md:w-[340px]">
                <Search size={18} className="shrink-0 text-[#86868b]" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Cari nama, NIP, unit..."
                  className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                />
              </div>

              <button
                type="button"
                onClick={fetchData}
                className="harmony-button-secondary"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCcw size={18} />
                )}
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat approval absensi bawahan...
            </div>
          ) : (
            <ApprovalAttendanceTable
              confirmations={filteredConfirmations}
              periodMonth={periodMonth}
            />
          )}
        </div>
      </section>
    </>
  )
}

function ApprovalAttendanceTable({
  confirmations,
  periodMonth,
}: {
  confirmations: AttendancePeriodConfirmation[]
  periodMonth: string
}) {
  if (confirmations.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
            <FileText size={24} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
            Tidak ada data approval absensi
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            Data akan muncul setelah bawahan submit konfirmasi absensi pada periode yang dipilih.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1550px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
            <th className="px-5 py-4 font-semibold">Karyawan</th>
            <th className="px-5 py-4 font-semibold">Periode</th>
            <th className="px-5 py-4 font-semibold">Submit Employee</th>
            <th className="px-5 py-4 font-semibold">Approval Atasan</th>
            <th className="px-5 py-4 font-semibold">Status HR</th>
            <th className="px-5 py-4 font-semibold">Lock</th>
            <th className="px-5 py-4 font-semibold">Hadir</th>
            <th className="px-5 py-4 font-semibold">Cuti/Izin/Sakit</th>
            <th className="px-5 py-4 font-semibold">PHL</th>
            <th className="px-5 py-4 text-center font-semibold">Action</th>
          </tr>
        </thead>

        <tbody>
          {confirmations.map((item) => (
            <tr
              key={item.id}
              className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70"
            >
              <td className="px-5 py-4">
                <EmployeeCell item={item} />
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">
                  {item.period_month || '-'}
                </p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {formatDisplayDate(item.period_start || '')} - {formatDisplayDate(item.period_end || '')}
                </p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={formatEmployeeStatus(item.employee_status || '')}
                  tone={normalizeText(item.employee_status) === 'submitted' ? 'green' : 'orange'}
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {formatDateTime(item.employee_submitted_at || '')}
                </p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={formatSupervisorStatus(item.supervisor_status || '')}
                  tone={getSupervisorTone(item.supervisor_status || '')}
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.supervisor_name || '-'}
                </p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={formatHRStatus(item.hr_status || '')}
                  tone={getHRTone(item.hr_status || '')}
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {formatDateTime(item.hr_finalized_at || '')}
                </p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={item.is_locked ? 'Locked' : 'Unlocked'}
                  tone={item.is_locked ? 'red' : 'green'}
                  icon={item.is_locked ? <Lock size={13} /> : <LockOpen size={13} />}
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.is_locked
                    ? formatDateTime(item.locked_at || '')
                    : item.unlocked_at
                      ? formatDateTime(item.unlocked_at || '')
                      : '-'}
                </p>
              </td>

              <NumberCell value={Number(item.total_present_days || 0)} tone="green" />
              <NumberCell
                value={
                  Number(item.total_leave_days || 0) +
                  Number(item.total_permit_days || 0) +
                  Number(item.total_sick_days || 0)
                }
                tone="blue"
              />
              <NumberCell value={Number(item.total_phl_days || 0)} tone="purple" />

              <td className="px-5 py-4 text-center">
                <Link
                  href={`/employee/approvals/${item.employee_id}/${periodMonth}`}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 text-xs font-bold text-white transition hover:bg-black"
                >
                  <Eye size={15} />
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmployeeCell({
  item,
}: {
  item: AttendancePeriodConfirmation
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
        <UserRound size={18} />
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-[#1d1d1f]">
          {item.full_name || '-'}
        </p>

        <p className="mt-1 line-clamp-1 text-xs text-[#6e6e73]">
          {item.employee_number || '-'} · PIN {item.machine_pin || '-'}
        </p>

        <p className="mt-1 line-clamp-1 text-xs text-[#86868b]">
          {item.department || '-'} · {item.position || '-'}
        </p>
      </div>
    </div>
  )
}

function NumberCell({
  value,
  tone,
}: {
  value: number
  tone: 'green' | 'blue' | 'purple'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <td className="px-5 py-4">
      <span className={`inline-flex min-w-8 justify-center rounded-xl px-3 py-1 text-xs font-bold ${className}`}>
        {value}
      </span>
    </td>
  )
}

function StatusBadge({
  label,
  tone,
  icon,
}: {
  label: string
  tone: 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'neutral'
  icon?: React.ReactNode
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    neutral: 'bg-[#f5f5f7] text-[#6e6e73]',
  }[tone]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {icon}
      {label}
    </span>
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
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'red'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    red: 'text-red-700 bg-red-50',
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

          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#86868b]">
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

function getCurrentPeriodMonth() {
  const today = new Date()
  const day = today.getDate()
  const period = new Date(today)

  if (day <= 10) {
    period.setMonth(period.getMonth() - 1)
  }

  return `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`
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

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function formatEmployeeStatus(value: string) {
  const normalized = normalizeText(value)

  if (normalized === 'submitted') return 'Submitted'
  if (normalized === 'draft') return 'Draft'

  return value || 'Belum Submit'
}

function formatSupervisorStatus(value: string) {
  const normalized = normalizeText(value)

  if (normalized === 'approved') return 'Disetujui'
  if (normalized === 'rejected') return 'Ditolak'
  if (normalized === 'pending') return 'Menunggu'

  return 'Belum Ada'
}

function formatHRStatus(value: string) {
  const normalized = normalizeText(value)

  if (normalized === 'finalized') return 'Final HR'
  if (normalized === 'ready_for_hr') return 'Siap HR'
  if (normalized === 'waiting_supervisor') return 'Menunggu Atasan'
  if (normalized === 'rejected_by_supervisor') return 'Ditolak Atasan'
  if (normalized === 'waiting_hr') return 'Menunggu HR'

  return 'Belum Final'
}

function getSupervisorTone(value: string): 'green' | 'orange' | 'red' | 'neutral' {
  const normalized = normalizeText(value)

  if (normalized === 'approved') return 'green'
  if (normalized === 'rejected') return 'red'
  if (normalized === 'pending') return 'orange'

  return 'neutral'
}

function getHRTone(value: string): 'green' | 'orange' | 'red' | 'blue' | 'neutral' {
  const normalized = normalizeText(value)

  if (normalized === 'finalized') return 'green'
  if (normalized === 'ready_for_hr') return 'blue'
  if (normalized === 'rejected_by_supervisor') return 'red'
  if (normalized === 'waiting_supervisor' || normalized === 'waiting_hr') return 'orange'

  return 'neutral'
}