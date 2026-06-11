'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plane,
  RefreshCcw,
  Send,
  ShieldCheck,
  UserCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string | null
  role: string | null
  employee_id?: string | null
  is_active?: boolean | null
}

type Employee = {
  id: string
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  email?: string | null
  department?: string | null
  unit?: string | null
  work_unit?: string | null
  position?: string | null
  job_title?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
}

type LooseRow = Record<string, any>

type AvailabilityCategory = 'leave' | 'phl' | 'absence'

type TodayAvailabilityItem = {
  id: string
  source: 'leave_requests' | 'attendance_logs'
  employeeId: string
  employeeNumber: string
  fullName: string
  department: string
  position: string
  category: AvailabilityCategory
  type: string
  label: string
  status: string
  statusLabel: string
  startDate: string
  endDate: string
  jobPending: string
  handoverTo: string
  handoverNote: string
}

function todayISO() {
  return formatDateToISO(new Date())
}

function formatDateToISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDate(value?: string | null) {
  if (!value) return null

  const cleanValue = String(value).slice(0, 10)
  const date = new Date(`${cleanValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) return null

  return date
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = parseDate(value)

  if (!date) return String(value)

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatLongDate(value?: string | null) {
  if (!value) return '-'

  const date = parseDate(value)

  if (!date) return String(value)

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function normalize(value?: string | number | null) {
  return String(value || '').trim().toLowerCase()
}

function cleanText(value?: string | number | null) {
  return String(value || '').trim()
}

function pick(row: LooseRow | null | undefined, keys: string[]) {
  if (!row) return ''

  for (const key of keys) {
    const value = row[key]

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }

  return ''
}

function getEmployeeName(row?: LooseRow | null) {
  return (
    pick(row, [
      'full_name',
      'employee_name',
      'name',
      'nama',
      'employee_full_name',
      'created_by',
      'email',
    ]) || '-'
  )
}

function getEmployeeNumber(row?: LooseRow | null) {
  return pick(row, [
    'employee_number',
    'nip',
    'npk',
    'machine_pin',
    'employee_code',
  ])
}

function getDepartment(row?: LooseRow | null) {
  return pick(row, ['department', 'unit', 'work_unit', 'division'])
}

function getPosition(row?: LooseRow | null) {
  return pick(row, ['position', 'job_title', 'jabatan'])
}

function getStartDate(row?: LooseRow | null) {
  return pick(row, [
    'start_date',
    'date_start',
    'leave_start_date',
    'request_start_date',
    'from_date',
    'start_at',
    'effective_start_date',
    'requested_start_date',
    'absence_start_date',
    'tanggal_mulai',
  ]).slice(0, 10)
}

function getEndDate(row?: LooseRow | null) {
  return pick(row, [
    'end_date',
    'date_end',
    'leave_end_date',
    'request_end_date',
    'to_date',
    'end_at',
    'effective_end_date',
    'requested_end_date',
    'absence_end_date',
    'tanggal_selesai',
  ]).slice(0, 10)
}

function getRequestType(row?: LooseRow | null) {
  return normalize(
    pick(row, [
      'request_type',
      'leave_type',
      'leave_type_code',
      'type',
      'absence_type',
      'absence_request_type',
      'status',
      'category',
    ]),
  )
}

function getRequestLabel(row?: LooseRow | null, fallbackType = '') {
  return (
    pick(row, [
      'request_label',
      'leave_type_name',
      'leave_type_label',
      'absence_request_label',
      'type_label',
      'label',
    ]) || getTypeLabel(fallbackType)
  )
}

function getStatus(row?: LooseRow | null) {
  return normalize(
    pick(row, [
      'approval_status',
      'status',
      'request_status',
      'supervisor_approval_status',
      'hr_status',
      'absence_request_status',
    ]),
  )
}

function isInactiveStatus(status: string) {
  return ['rejected', 'cancelled', 'canceled', 'ditolak', 'dibatalkan'].includes(
    normalize(status),
  )
}

function isDateWithin(date: string, startDate: string, endDate: string) {
  const selected = parseDate(date)
  const start = parseDate(startDate)
  const end = parseDate(endDate || startDate)

  if (!selected || !start || !end) return false

  return selected.getTime() >= start.getTime() && selected.getTime() <= end.getTime()
}

function getCategory(type: string, label?: string): AvailabilityCategory | null {
  const value = normalize(`${type} ${label || ''}`)

  if (
    value.includes('phl') ||
    value.includes('pengganti hari libur') ||
    value.includes('hari libur')
  ) {
    return 'phl'
  }

  if (
    value.includes('leave') ||
    value.includes('cuti') ||
    value.includes('annual') ||
    value.includes('marriage') ||
    value.includes('maternity') ||
    value.includes('miscarriage') ||
    value.includes('bereavement') ||
    value.includes('menstrual') ||
    value.includes('pregnancy') ||
    value.includes('worship')
  ) {
    return 'leave'
  }

  if (
    value.includes('sick') ||
    value.includes('sakit') ||
    value.includes('permit') ||
    value.includes('izin') ||
    value.includes('absent') ||
    value.includes('alpa') ||
    value.includes('dinas') ||
    value.includes('official_travel') ||
    value.includes('tugas luar') ||
    value.includes('manual_attendance')
  ) {
    return 'absence'
  }

  return null
}

function getTypeLabel(type?: string | null) {
  const value = normalize(type)

  const map: Record<string, string> = {
    annual_leave: 'Cuti Tahunan',
    marriage_leave: 'Cuti Menikah',
    maternity_leave: 'Cuti Melahirkan',
    miscarriage_leave: 'Cuti Keguguran',
    bereavement_leave: 'Cuti Duka',
    child_circumcision_leave: 'Cuti Khitan / Baptis Anak',
    worship_leave: 'Cuti Ibadah',
    menstrual_leave: 'Cuti Haid',
    pregnancy_check_leave: 'Pemeriksaan Kehamilan',
    leave: 'Cuti',
    phl_claim: 'Klaim PHL',
    phl: 'PHL',
    official_travel: 'Tugas Luar / Dinas',
    sick: 'Sakit',
    permit: 'Izin',
    permission: 'Izin',
    absent: 'Alpa / Tidak Hadir',
    alpa: 'Alpa / Tidak Hadir',
    no_record: 'Tidak Hadir',
    manual_attendance: 'Hadir Manual / Koreksi Jam',
  }

  return map[value] || cleanText(type) || 'Keterangan'
}

function getStatusLabel(status?: string | null) {
  const value = normalize(status)

  const map: Record<string, string> = {
    pending: 'Menunggu Approval',
    pending_supervisor: 'Menunggu Atasan',
    pending_supervisor_2: 'Menunggu Atasan 2',
    waiting_supervisor: 'Menunggu Atasan',
    pending_hr: 'Menunggu HR',
    waiting_hr: 'Menunggu HR',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
    submitted: 'Diajukan',
    finalized: 'Final',
    waiting_supervisor_review: 'Menunggu Atasan',
  }

  return map[value] || cleanText(status) || '-'
}

function getJobPending(row?: LooseRow | null) {
  return pick(row, [
    'job_pending',
    'pending_job',
    'job_handover',
    'job_handover_note',
    'job_handover_notes',
    'handover_note',
    'work_handover',
    'task_handover',
    'pending_tasks',
    'pending_work',
    'tugas_pending',
    'pekerjaan_pending',
  ])
}

function getHandoverTo(row?: LooseRow | null) {
  return pick(row, [
    'job_handover_to_name',
    'handover_to_name',
    'replacement_employee_name',
    'delegate_to_name',
    'recipient_name',
    'pic_name',
    'backup_name',
    'job_handover_to',
    'handover_to',
  ])
}

function getHandoverNote(row?: LooseRow | null) {
  return pick(row, [
    'job_handover_note',
    'handover_note',
    'handover_notes',
    'note',
    'notes',
  ])
}

function statusClass(status: string) {
  const value = normalize(status)

  if (value.includes('approved') || value === 'finalized') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (value.includes('reject') || value.includes('cancel')) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  if (value.includes('hr')) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function categoryMeta(category: AvailabilityCategory) {
  const map = {
    leave: {
      title: 'Cuti Hari Ini',
      empty: 'Tidak ada karyawan cuti hari ini.',
      icon: <CalendarDays size={18} />,
      badge: 'bg-blue-50 text-blue-700',
      border: 'border-blue-100',
    },
    phl: {
      title: 'Klaim PHL Hari Ini',
      empty: 'Tidak ada klaim PHL yang aktif hari ini.',
      icon: <Plane size={18} />,
      badge: 'bg-purple-50 text-purple-700',
      border: 'border-purple-100',
    },
    absence: {
      title: 'Izin / Sakit / Tidak Hadir',
      empty: 'Tidak ada izin, sakit, tugas luar, atau tidak hadir yang tercatat.',
      icon: <AlertTriangle size={18} />,
      badge: 'bg-orange-50 text-orange-700',
      border: 'border-orange-100',
    },
  }

  return map[category]
}

function buildItemsFromLeaveRequests(rows: LooseRow[], date: string) {
  return rows
    .filter((row) => {
      const status = getStatus(row)

      if (isInactiveStatus(status)) return false

      const startDate = getStartDate(row)
      const endDate = getEndDate(row) || startDate

      if (!startDate) return false

      return isDateWithin(date, startDate, endDate)
    })
    .map((row) => {
      const type = getRequestType(row)
      const label = getRequestLabel(row, type)
      const category = getCategory(type, label)

      if (!category) return null

      const status = getStatus(row)
      const startDate = getStartDate(row)
      const endDate = getEndDate(row) || startDate

      return {
        id: `leave-${row.id || row.employee_id || row.employee_number || crypto.randomUUID()}`,
        source: 'leave_requests' as const,
        employeeId: cleanText(row.employee_id),
        employeeNumber: getEmployeeNumber(row),
        fullName: getEmployeeName(row),
        department: getDepartment(row),
        position: getPosition(row),
        category,
        type,
        label,
        status,
        statusLabel: getStatusLabel(status),
        startDate,
        endDate,
        jobPending: getJobPending(row),
        handoverTo: getHandoverTo(row),
        handoverNote: getHandoverNote(row),
      }
    })
    .filter(Boolean) as TodayAvailabilityItem[]
}

function buildItemsFromAttendanceLogs(rows: LooseRow[], date: string) {
  return rows
    .filter((row) => {
      const rowDate = String(row.attendance_date || '').slice(0, 10)

      if (rowDate !== date) return false

      const type = getRequestType(row)
      const label = getRequestLabel(row, type)
      const category = getCategory(type, label)

      if (!category) return false

      const status = getStatus(row)

      return !isInactiveStatus(status)
    })
    .map((row) => {
      const type = getRequestType(row)
      const label = getRequestLabel(row, type)
      const category = getCategory(type, label)

      if (!category) return null

      const status = getStatus(row)

      return {
        id: `attendance-${row.id || row.employee_id || row.machine_pin || crypto.randomUUID()}`,
        source: 'attendance_logs' as const,
        employeeId: cleanText(row.employee_id),
        employeeNumber: getEmployeeNumber(row),
        fullName: getEmployeeName(row),
        department: getDepartment(row),
        position: getPosition(row),
        category,
        type,
        label,
        status,
        statusLabel: getStatusLabel(status || row.supervisor_approval_status || 'submitted'),
        startDate: date,
        endDate: date,
        jobPending: getJobPending(row),
        handoverTo: getHandoverTo(row),
        handoverNote: getHandoverNote(row),
      }
    })
    .filter(Boolean) as TodayAvailabilityItem[]
}

function mergeAvailabilityItems(
  leaveItems: TodayAvailabilityItem[],
  attendanceItems: TodayAvailabilityItem[],
) {
  const map = new Map<string, TodayAvailabilityItem>()

  leaveItems.forEach((item) => {
    const key = `${item.employeeId || item.employeeNumber || item.fullName}-${item.category}-${item.startDate}-${item.endDate}`
    map.set(key, item)
  })

  attendanceItems.forEach((item) => {
    const key = `${item.employeeId || item.employeeNumber || item.fullName}-${item.category}-${item.startDate}-${item.endDate}`

    if (!map.has(key)) {
      map.set(key, item)
    }
  })

  return Array.from(map.values()).sort((a, b) => {
    const categoryOrder = { leave: 1, phl: 2, absence: 3 }
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]

    if (categoryDiff !== 0) return categoryDiff

    return a.fullName.localeCompare(b.fullName)
  })
}

export default function EmployeeDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [todayItems, setTodayItems] = useState<TodayAvailabilityItem[]>([])
  const [message, setMessage] = useState('')

  const dateToday = useMemo(() => todayISO(), [])

  const grouped = useMemo(() => {
    return {
      leave: todayItems.filter((item) => item.category === 'leave'),
      phl: todayItems.filter((item) => item.category === 'phl'),
      absence: todayItems.filter((item) => item.category === 'absence'),
    }
  }, [todayItems])

  const totalLeave = grouped.leave.length
  const totalPHL = grouped.phl.length
  const totalAbsence = grouped.absence.length
  const totalUnavailable = todayItems.length

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    setRefreshing(true)
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        setMessage('Session tidak ditemukan. Silakan login ulang.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      const { data: appUserData, error: appUserError } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle<AppUser>()

      if (appUserError) throw appUserError

      const currentAppUser: AppUser = appUserData || {
        id: authData.user.id,
        email: authData.user.email || null,
        role: 'employee',
        employee_id: null,
        is_active: true,
      }

      setAppUser(currentAppUser)

      let currentEmployee: Employee | null = null

      if (currentAppUser.employee_id) {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', currentAppUser.employee_id)
          .maybeSingle<Employee>()

        if (error) throw error

        currentEmployee = data || null
      }

      if (!currentEmployee && authData.user.email) {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('email', authData.user.email)
          .limit(1)

        if (error) throw error

        currentEmployee = (data?.[0] || null) as Employee | null
      }

      setEmployee(currentEmployee)

      const [leaveResponse, attendanceResponse] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('attendance_logs')
          .select('*')
          .eq('attendance_date', dateToday)
          .is('deleted_at', null)
          .limit(500),
      ])

      if (leaveResponse.error) throw leaveResponse.error
      if (attendanceResponse.error) throw attendanceResponse.error

      const leaveItems = buildItemsFromLeaveRequests(
        (leaveResponse.data || []) as LooseRow[],
        dateToday,
      )

      const attendanceItems = buildItemsFromAttendanceLogs(
        (attendanceResponse.data || []) as LooseRow[],
        dateToday,
      )

      setTodayItems(mergeAvailabilityItems(leaveItems, attendanceItems))
    } catch (error: any) {
      console.error(error)
      setMessage(error?.message || 'Dashboard gagal dimuat.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  return (
    <>
      <Topbar
        title="Beranda"
        description="Ringkasan pribadi dan informasi kehadiran tim hari ini."
      />

      <main className="space-y-6 p-4 sm:p-6">
        {message && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-700">
            {message}
          </section>
        )}

        <section className="overflow-hidden rounded-[32px] border border-black/5 bg-[#1d1d1f] text-white shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                <ShieldCheck size={14} />
                Harmony Employee Workspace
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                Halo, {getEmployeeName(employee || appUser)}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
                Hari ini {formatLongDate(dateToday)}. Pantau absensi pribadi,
                pengajuan cuti/izin/PHL, approval tim, dan informasi karyawan
                yang sedang tidak hadir.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroInfo label="NPK / PIN" value={getEmployeeNumber(employee) || '-'} />
                <HeroInfo label="Unit" value={getDepartment(employee) || '-'} />
                <HeroInfo label="Jabatan" value={getPosition(employee) || '-'} />
                <HeroInfo label="Role" value={appUser?.role || 'employee'} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <HeroMetric label="Total Tidak Hadir" value={totalUnavailable} />
              <HeroMetric label="Cuti" value={totalLeave} />
              <HeroMetric label="Klaim PHL" value={totalPHL} />
              <HeroMetric label="Izin / Sakit / Dinas" value={totalAbsence} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard
            title="Absensi"
            description="Cek dan konfirmasi absensi periode."
            href="/employee/attendance"
            icon={<Clock3 size={22} />}
            tone="blue"
          />
          <QuickActionCard
            title="Cuti & Izin"
            description="Ajukan cuti, izin, sakit, PHL, dan postpone."
            href="/employee/leave"
            icon={<CalendarDays size={22} />}
            tone="green"
          />
          <QuickActionCard
            title="Approval Tim"
            description="Review pengajuan bawahan."
            href="/employee/approvals"
            icon={<UsersRound size={22} />}
            tone="purple"
          />
          <QuickActionCard
            title="Pengaturan"
            description="Profil, password, dan akses akun."
            href="/employee/settings"
            icon={<UserRound size={22} />}
            tone="slate"
          />
        </section>

        <section className="rounded-[32px] border border-black/5 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <UsersRound size={14} />
                Informasi Tim
              </div>

              <h2 className="mt-3 text-xl font-bold text-[#1d1d1f]">
                Kehadiran Tim Hari Ini
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
                Menampilkan karyawan yang sedang cuti, klaim PHL, izin, sakit,
                tugas luar, atau tidak hadir pada hari ini beserta job pending
                dan PIC pengganti bila tersedia.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCcw size={17} />}
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm font-semibold text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat informasi tim hari ini...
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-3">
              <AvailabilityColumn category="leave" items={grouped.leave} />
              <AvailabilityColumn category="phl" items={grouped.phl} />
              <AvailabilityColumn category="absence" items={grouped.absence} />
            </div>
          )}
        </section>
      </main>
    </>
  )
}

function HeroInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
      <p className="text-xs font-bold text-white/45">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  tone,
}: {
  title: string
  description: string
  href: string
  icon: ReactNode
  tone: 'blue' | 'green' | 'purple' | 'slate'
}) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone]

  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-2xl p-3 ${toneClass}`}>{icon}</div>
        <ArrowRight
          size={18}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500"
        />
      </div>

      <h3 className="mt-5 text-lg font-bold text-[#1d1d1f]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{description}</p>
    </Link>
  )
}

function AvailabilityColumn({
  category,
  items,
}: {
  category: AvailabilityCategory
  items: TodayAvailabilityItem[]
}) {
  const meta = categoryMeta(category)

  return (
    <div className={`rounded-[28px] border ${meta.border} bg-[#f5f5f7]/55 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`rounded-2xl p-2.5 ${meta.badge}`}>{meta.icon}</div>
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">{meta.title}</h3>
            <p className="text-xs font-semibold text-[#86868b]">
              {items.length} karyawan
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-black/10 bg-white/80 p-5 text-center text-sm font-semibold text-[#86868b]">
            {meta.empty}
          </div>
        ) : (
          items.map((item) => <AvailabilityCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

function AvailabilityCard({ item }: { item: TodayAvailabilityItem }) {
  const periodText =
    item.startDate === item.endDate
      ? formatDate(item.startDate)
      : `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`

  return (
    <article className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <UserCheck size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h4 className="break-words text-sm font-bold text-[#1d1d1f]">
                {item.fullName}
              </h4>
              <p className="mt-1 break-words text-xs leading-5 text-[#6e6e73]">
                {item.employeeNumber || '-'} · {item.department || '-'}
              </p>
              {item.position && (
                <p className="break-words text-xs leading-5 text-[#86868b]">
                  {item.position}
                </p>
              )}
            </div>

            <span
              className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${statusClass(item.status)}`}
            >
              {item.statusLabel}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {item.label}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {periodText}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <InfoLine
              label="Job Pending"
              value={item.jobPending || 'Belum ada informasi job pending.'}
              icon={<FileText size={15} />}
            />
            <InfoLine
              label="PIC / Pengganti"
              value={item.handoverTo || 'Belum ditentukan.'}
              icon={<Send size={15} />}
            />
            {item.handoverNote && (
              <InfoLine
                label="Catatan Handover"
                value={item.handoverNote}
                icon={<CheckCircle2 size={15} />}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function InfoLine({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
        {icon}
        {label}
      </div>
      <p className="break-words text-xs leading-5 text-[#1d1d1f]">{value}</p>
    </div>
  )
}
