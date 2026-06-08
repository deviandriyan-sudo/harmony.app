'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Fingerprint,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  AlertTriangle,
  TimerReset,
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
  annual_leave_balance: number | null
  phl_balance: number | null
  is_active: boolean | null
}

type AttendanceLog = {
  id: string
  machine_pin: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  status: string | null
  notes: string | null
  work_duration_minutes: number | null
}

type LeaveRequest = {
  id: string
  employee_number: string | null
  full_name: string | null
  request_type: string | null
  start_date: string | null
  end_date: string | null
  total_days: number | null
  reason: string | null
  approval_status: string | null
  supervisor_1_status: string | null
  supervisor_2_status: string | null
  hr_status: string | null
  created_at: string | null
}

type PHLRecord = {
  id: string
  machine_pin: string
  phl_date: string
  status: string | null
  balance_days: number | null
  used_days: number | null
  remaining_days: number | null
  expired_at: string | null
  reason: string | null
}

export default function EmployeeDashboardPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null)
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [phlRecords, setPhlRecords] = useState<PHLRecord[]>([])

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const periodRange = useMemo(() => {
    return getCurrentCutoffRange()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    setErrorMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage(
        'Session user belum ditemukan. Silakan login terlebih dahulu setelah sistem login diaktifkan.'
      )
      setLoading(false)
      return
    }

    const { data: appUserData, error: appUserError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (appUserError) {
      setErrorMessage(appUserError.message)
      setLoading(false)
      return
    }

    if (!appUserData) {
      setErrorMessage(
        'Akun login belum terhubung ke app_users. HR perlu menghubungkan user ini ke data karyawan.'
      )
      setLoading(false)
      return
    }

    setAppUser(appUserData)

    if (!appUserData.employee_id) {
      setErrorMessage(
        'User ini belum terhubung ke data employee. Silakan hubungi HR.'
      )
      setLoading(false)
      return
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', appUserData.employee_id)
      .maybeSingle()

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setLoading(false)
      return
    }

    if (!employeeData) {
      setErrorMessage('Data employee tidak ditemukan.')
      setLoading(false)
      return
    }

    setEmployee(employeeData)

    if (employeeData.machine_pin) {
      const { data: attendanceData } = await supabase
        .from('attendance_logs')
        .select('*')
        .is('deleted_at', null)
        .eq('machine_pin', employeeData.machine_pin)
        .gte('attendance_date', periodRange.start)
        .lte('attendance_date', periodRange.end)
        .order('attendance_date', { ascending: false })

      setAttendanceLogs(attendanceData || [])

      const { data: phlData } = await supabase
        .from('phl_records')
        .select('*')
        .eq('machine_pin', employeeData.machine_pin)
        .eq('status', 'approved')
        .order('expired_at', { ascending: true })

      setPhlRecords(phlData || [])
    }

    if (employeeData.employee_number) {
      const { data: requestData } = await supabase
        .from('requests')
        .select('*')
        .eq('employee_number', employeeData.employee_number)
        .order('created_at', { ascending: false })
        .limit(6)

      setLeaveRequests(requestData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const latestAttendance = attendanceLogs[0] || null

  const presentCount = attendanceLogs.filter(
    (item) => item.status === 'present'
  ).length

  const lateCount = attendanceLogs.filter(
    (item) => item.status === 'late'
  ).length

  const incompleteCount = attendanceLogs.filter((item) => {
    return item.status === 'incomplete' || !item.check_in || !item.check_out
  }).length

  const pendingRequestCount = leaveRequests.filter(
    (item) => item.approval_status === 'pending'
  ).length

  const approvedRequestCount = leaveRequests.filter(
    (item) => item.approval_status === 'approved'
  ).length

  const activePHLBalance = phlRecords.reduce((total, record) => {
    const isActive = getBalanceStatus(record) === 'active'

    if (!isActive) return total

    return total + Number(record.remaining_days ?? record.balance_days ?? 0)
  }, 0)

  return (
    <>
      <Topbar
        title="Beranda Employee"
        description="Ringkasan absensi, pengajuan cuti/izin, saldo cuti, dan saldo PHL karyawan."
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

          <div className="relative grid gap-7 xl:grid-cols-[1.45fr_0.75fr] xl:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <Sparkles size={15} className="text-[#5ac8fa]" />
                HARMONY · Employee Self Service
              </div>

              <h2 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Selamat datang, {employee?.full_name || appUser?.email || 'Employee'}.
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Dashboard ini digunakan untuk memantau absensi, melihat saldo cuti,
                mengajukan cuti/izin, memantau PHL, serta melihat status approval.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/employee/leave"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-white px-5 text-sm font-bold text-[#1d1d1f] transition hover:-translate-y-0.5 hover:bg-[#f5f5f7]"
                >
                  <CalendarDays size={18} />
                  Ajukan Cuti / Izin
                </Link>

                <Link
                  href="/employee/attendance"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <Clock3 size={18} />
                  Lihat Absensi
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/80">
                    Employee Profile
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Data akun dan master employee
                  </p>
                </div>

                <div className="rounded-2xl bg-[#34c759]/15 p-3 text-[#9ff2b5]">
                  <ShieldCheck size={20} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <ProfileRow label="Nama" value={employee?.full_name || '-'} />
                <ProfileRow label="NIP" value={employee?.employee_number || '-'} />
                <ProfileRow label="Unit" value={employee?.department || '-'} />
                <ProfileRow label="Role" value={appUser?.role || 'employee'} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Saldo Cuti"
            value={String(Number(employee?.annual_leave_balance || 0))}
            description="Sisa cuti tahunan"
            icon={<WalletCards size={22} />}
            href="/employee/leave"
            tone="blue"
          />

          <MetricCard
            title="Saldo PHL"
            value={String(activePHLBalance || Number(employee?.phl_balance || 0))}
            description="PHL aktif / tersisa"
            icon={<Plane size={22} />}
            href="/employee/phl"
            tone="purple"
          />

          <MetricCard
            title="Late"
            value={String(lateCount)}
            description="Periode cut-off berjalan"
            icon={<Clock3 size={22} />}
            href="/employee/attendance"
            tone="orange"
          />

          <MetricCard
            title="Pending"
            value={String(pendingRequestCount)}
            description="Pengajuan menunggu approval"
            icon={<FileText size={22} />}
            href="/employee/leave"
            tone="green"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
          <div className="harmony-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-black/5 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f]">
                  Ringkasan Absensi
                </h3>
                <p className="mt-1 text-sm text-[#6e6e73]">
                  Periode {formatDisplayDate(periodRange.start)} s.d. {formatDisplayDate(periodRange.end)}.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchDashboardData}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-3">
              <AttendanceSummary
                title="Present"
                value={presentCount}
                description="Hadir sesuai data"
                tone="green"
              />

              <AttendanceSummary
                title="Late"
                value={lateCount}
                description="Terlambat"
                tone="orange"
              />

              <AttendanceSummary
                title="Incomplete"
                value={incompleteCount}
                description="Scan tidak lengkap"
                tone="red"
              />
            </div>

            <div className="border-t border-black/5 p-6">
              <h4 className="font-semibold text-[#1d1d1f]">
                Absensi Terakhir
              </h4>

              {latestAttendance ? (
                <div className="mt-4 rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                        <Fingerprint size={20} />
                      </div>

                      <div>
                        <div className="font-semibold text-[#1d1d1f]">
                          {formatDisplayDate(latestAttendance.attendance_date)}
                        </div>
                        <div className="mt-1 text-xs text-[#6e6e73]">
                          Machine PIN {latestAttendance.machine_pin}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <ScanBadge
                        label="In"
                        value={latestAttendance.check_in || '-'}
                      />

                      <ScanBadge
                        label="Out"
                        value={latestAttendance.check_out || '-'}
                      />

                      <StatusBadge status={latestAttendance.status || 'present'} />
                    </div>
                  </div>

                  {latestAttendance.notes && (
                    <p className="mt-4 text-sm leading-6 text-[#6e6e73]">
                      {latestAttendance.notes}
                    </p>
                  )}
                </div>
              ) : (
                <EmptyMiniState
                  title="Belum ada data absensi"
                  description="Data akan muncul setelah HR melakukan upload absensi."
                />
              )}
            </div>
          </div>

          <div className="harmony-card overflow-hidden">
            <div className="border-b border-black/5 p-6">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">
                Quick Actions
              </h3>
              <p className="mt-1 text-sm text-[#6e6e73]">
                Akses cepat layanan employee.
              </p>
            </div>

            <div className="grid gap-4 p-6">
              <QuickAction
                title="Ajukan Cuti / Izin"
                description="Buat pengajuan cuti, izin, sakit, atau jenis cuti lain sesuai ketentuan."
                href="/employee/leave"
                icon={<CalendarDays size={21} />}
              />

              <QuickAction
                title="Riwayat Absensi"
                description="Lihat data absensi, keterlambatan, dan status kehadiran."
                href="/employee/attendance"
                icon={<Clock3 size={21} />}
              />

              <QuickAction
  title="Pengaturan Akun"
  description="Perbarui data pribadi dan password akun employee."
  href="/employee/settings"
  icon={<UserRound size={21} />}
/>

              <QuickAction
                title="Ubah Password"
                description="Perbarui password akun dari dashboard employee."
                href="/employee/account"
                icon={<UserRound size={21} />}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <div className="harmony-card overflow-hidden">
            <div className="border-b border-black/5 p-6">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">
                Pengajuan Terbaru
              </h3>
              <p className="mt-1 text-sm text-[#6e6e73]">
                Menampilkan beberapa pengajuan terakhir dari employee.
              </p>
            </div>

            <div className="p-6">
              {leaveRequests.length > 0 ? (
                <div className="space-y-3">
                  {leaveRequests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                    />
                  ))}
                </div>
              ) : (
                <EmptyMiniState
                  title="Belum ada pengajuan"
                  description="Pengajuan cuti/izin akan muncul pada bagian ini."
                />
              )}
            </div>
          </div>

          <div className="harmony-card overflow-hidden">
            <div className="border-b border-black/5 p-6">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">
                Saldo PHL Aktif
              </h3>
              <p className="mt-1 text-sm text-[#6e6e73]">
                PHL berlaku maksimal 90 hari kalender dari tanggal PHL.
              </p>
            </div>

            <div className="p-6">
              {phlRecords.length > 0 ? (
                <div className="space-y-3">
                  {phlRecords.slice(0, 5).map((record) => (
                    <PHLRow
                      key={record.id}
                      record={record}
                    />
                  ))}
                </div>
              ) : (
                <EmptyMiniState
                  title="Belum ada saldo PHL"
                  description="Saldo PHL muncul setelah PHL disetujui oleh HR."
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon,
  href,
  tone,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  href: string
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
  }[tone]

  return (
    <Link
      href={href}
      className="harmony-card harmony-hover-lift block p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-2 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </Link>
  )
}

function ProfileRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-sm text-white/62">
        {label}
      </span>

      <span className="max-w-[180px] truncate text-right text-xs font-bold text-white">
        {value}
      </span>
    </div>
  )
}

function AttendanceSummary({
  title,
  value,
  description,
  tone,
}: {
  title: string
  value: number
  description: string
  tone: 'green' | 'orange' | 'red'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  }[tone]

  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-sm">
      <p className="text-sm text-[#6e6e73]">
        {title}
      </p>

      <div className={`mt-3 inline-flex rounded-full px-4 py-2 text-2xl font-bold ${className}`}>
        {value}
      </div>

      <p className="mt-3 text-xs leading-5 text-[#86868b]">
        {description}
      </p>
    </div>
  )
}

function QuickAction({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-[#1d1d1f]">
              {title}
            </h4>

            <ArrowUpRight
              size={17}
              className="text-[#c7c7cc] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#007aff]"
            />
          </div>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}

function RequestRow({
  request,
}: {
  request: LeaveRequest
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold text-[#1d1d1f]">
            {formatRequestType(request.request_type)}
          </div>

          <div className="mt-1 text-xs text-[#6e6e73]">
            {formatDisplayDate(request.start_date)} s.d. {formatDisplayDate(request.end_date)}
            {' '}· {Number(request.total_days || 0)} hari
          </div>

          {request.reason && (
            <div className="mt-2 line-clamp-1 text-xs text-[#86868b]">
              {request.reason}
            </div>
          )}
        </div>

        <StatusBadge status={request.approval_status || 'pending'} />
      </div>
    </div>
  )
}

function PHLRow({
  record,
}: {
  record: PHLRecord
}) {
  const daysLeft = getDaysLeft(record.expired_at)
  const status = getBalanceStatus(record)

  return (
    <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-[#1d1d1f]">
            {formatDisplayDate(record.phl_date)}
          </div>

          <div className="mt-1 text-xs text-[#6e6e73]">
            Sisa {Number(record.remaining_days ?? record.balance_days ?? 0)} hari
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-[#86868b]">
            <TimerReset size={13} />
            Expired {formatDisplayDate(record.expired_at)}
            {daysLeft !== null ? ` · ${daysLeft < 0 ? 'Expired' : `${daysLeft} hari lagi`}` : ''}
          </div>
        </div>

        <StatusBadge status={status} />
      </div>
    </div>
  )
}

function ScanBadge({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7] px-4 py-2 text-xs">
      <span className="font-semibold text-[#6e6e73]">
        {label}
      </span>
      <span className="ml-2 font-bold text-[#1d1d1f]">
        {value}
      </span>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'approved' || status === 'present' || status === 'active'
      ? 'bg-green-50 text-green-700'
      : status === 'late' || status === 'pending'
        ? 'bg-orange-50 text-orange-700'
        : status === 'expired' || status === 'rejected' || status === 'incomplete'
          ? 'bg-red-50 text-red-700'
          : 'bg-[#e8f2ff] text-[#0059b8]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}>
      {formatStatus(status)}
    </span>
  )
}

function EmptyMiniState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
        <Activity size={20} />
      </div>

      <h4 className="mt-4 font-semibold text-[#1d1d1f]">
        {title}
      </h4>

      <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}

function getCurrentCutoffRange() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()

  const start =
    day >= 11
      ? new Date(year, month, 11)
      : new Date(year, month - 1, 11)

  const end =
    day >= 11
      ? new Date(year, month + 1, 10)
      : new Date(year, month, 10)

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

function formatDisplayDate(value: string | null) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatRequestType(value: string | null) {
  if (value === 'annual_leave') return 'Cuti Tahunan'
  if (value === 'sick') return 'Sakit'
  if (value === 'permit') return 'Izin'
  if (value === 'maternity') return 'Cuti Melahirkan'
  if (value === 'marriage') return 'Cuti Menikah'
  if (value === 'phl') return 'PHL'

  return value || '-'
}

function formatStatus(value: string) {
  if (value === 'present') return 'Present'
  if (value === 'late') return 'Late'
  if (value === 'incomplete') return 'Incomplete'
  if (value === 'pending') return 'Pending'
  if (value === 'approved') return 'Approved'
  if (value === 'rejected') return 'Rejected'
  if (value === 'active') return 'Active'
  if (value === 'expired') return 'Expired'

  return value || '-'
}

function getToday() {
  return formatDateToISO(new Date())
}

function getBalanceStatus(record: PHLRecord) {
  const today = getToday()
  const expiredAt = record.expired_at || ''
  const remainingDays = Number(record.remaining_days ?? record.balance_days ?? 0)

  if (remainingDays <= 0) return 'used'
  if (expiredAt && expiredAt < today) return 'expired'

  return 'active'
}

function getDaysLeft(expiredAt: string | null) {
  if (!expiredAt) return null

  const today = new Date(`${getToday()}T00:00:00`)
  const expired = new Date(`${expiredAt}T00:00:00`)

  const diff = expired.getTime() - today.getTime()

  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}