'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
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

  supervisor_status: string | null
  supervisor_id: string | null
  supervisor_name: string | null
  supervisor_approved_at: string | null
  supervisor_rejected_at: string | null
  supervisor_note: string | null

  hr_status: string | null
  hr_finalized_at: string | null

  is_locked: boolean | null
  locked_by: string | null
  locked_at: string | null

  created_at: string | null
  updated_at: string | null
}

type LeaveRequest = {
  id: string
  employee_id: string | null

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null

  request_category: string | null
  leave_type: string | null
  request_type: string | null

  start_date: string | null
  end_date: string | null
  total_days: number | null

  reason: string | null
  job_pending: string | null
  handover_to: string | null

  status: string | null
  supervisor_status: string | null
  supervisor_name: string | null
  hr_status: string | null

  created_at: string | null
}

type SummaryTone = 'blue' | 'green' | 'orange' | 'purple'

type ModuleTone = 'blue' | 'purple'

export default function EmployeeApprovalsPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [supervisor, setSupervisor] = useState<Employee | null>(null)
  const [subordinates, setSubordinates] = useState<Employee[]>([])
  const [attendanceConfirmations, setAttendanceConfirmations] = useState<AttendancePeriodConfirmation[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])

  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth())

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const periodRange = useMemo(() => {
    return getCutoffRange(periodMonth)
  }, [periodMonth])

  const attendanceSummary = useMemo(() => {
    return attendanceConfirmations.reduce(
      (acc, item) => {
        acc.total += 1

        if (normalizeText(item.supervisor_status) === 'pending') acc.pending += 1
        if (normalizeText(item.supervisor_status) === 'approved') acc.approved += 1
        if (normalizeText(item.supervisor_status) === 'rejected') acc.rejected += 1
        if (item.is_locked) acc.locked += 1

        return acc
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        locked: 0,
      }
    )
  }, [attendanceConfirmations])

  const leaveSummary = useMemo(() => {
    return leaveRequests.reduce(
      (acc, item) => {
        acc.total += 1

        if (normalizeText(item.supervisor_status) === 'pending') acc.pending += 1
        if (normalizeText(item.supervisor_status) === 'approved') acc.approved += 1
        if (normalizeText(item.supervisor_status) === 'rejected') acc.rejected += 1

        return acc
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    )
  }, [leaveRequests])

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
      setAttendanceConfirmations([])
      setLeaveRequests([])
      setLoading(false)
      return
    }

    const subordinateIds = subordinateList.map((item) => item.id)

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_period_confirmations')
      .select('*')
      .in('employee_id', subordinateIds)
      .eq('period_month', periodMonth)
      .order('employee_submitted_at', { ascending: false })

    if (attendanceError) {
      setErrorMessage(attendanceError.message)
      setAttendanceConfirmations([])
    } else {
      setAttendanceConfirmations(attendanceData || [])
    }

    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*')
      .in('employee_id', subordinateIds)
      .order('created_at', { ascending: false })

    if (leaveError) {
      setErrorMessage(leaveError.message)
      setLeaveRequests([])
    } else {
      setLeaveRequests(leaveData || [])
    }

    setLoading(false)
  }

  return (
    <>
      <Topbar
        title="Approval Tim"
        description="Pusat approval untuk absensi, cuti, izin, tugas luar, dan PHL bawahan."
      />

      <section className="space-y-6 p-4 sm:p-6">
        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                Supervisor Approval Center
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Approval Tim
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Review pengajuan bawahan dalam satu tempat. Absensi menggunakan approval periode,
                sedangkan cuti, izin, sakit, tugas luar, dan klaim PHL menggunakan approval pengajuan.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[580px] 2xl:grid-cols-4">
              <HeroMetric label="Bawahan" value={String(subordinates.length)} />
              <HeroMetric label="Absensi Pending" value={String(attendanceSummary.pending)} />
              <HeroMetric label="Cuti Pending" value={String(leaveSummary.pending)} />
              <HeroMetric label="Locked" value={String(attendanceSummary.locked)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Bawahan Aktif"
            value={`${subordinates.length}`}
            description={supervisor?.full_name || appUser?.email || '-'}
            icon={<UsersRound size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Absensi Pending"
            value={`${attendanceSummary.pending}`}
            description={`Periode ${formatDisplayDate(periodRange.start)} - ${formatDisplayDate(periodRange.end)}`}
            icon={<Clock3 size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Cuti/Izin Pending"
            value={`${leaveSummary.pending}`}
            description="Menunggu approval atasan"
            icon={<FileText size={22} />}
            tone="purple"
          />

          <SummaryCard
            title="Total Approved"
            value={`${attendanceSummary.approved + leaveSummary.approved}`}
            description="Sudah disetujui atasan"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />
        </div>

        <PeriodFilterBar
          periodMonth={periodMonth}
          periodStart={periodRange.start}
          periodEnd={periodRange.end}
          loading={loading}
          attendanceTotal={attendanceSummary.total}
          attendancePending={attendanceSummary.pending}
          onMonthChange={setPeriodMonth}
          onRefresh={fetchData}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <ApprovalModuleCard
            title="Approval Absensi"
            description="Review absensi bawahan per periode. Atasan bisa melihat detail harian, bukti, PHL, cuti/izin dari absensi, lalu approve atau reject periode."
            href="/employee/approvals/attendance"
            icon={<CalendarCheck size={25} />}
            tone="blue"
            metrics={[
              {
                label: 'Total Submit',
                value: attendanceSummary.total,
              },
              {
                label: 'Pending',
                value: attendanceSummary.pending,
              },
              {
                label: 'Approved',
                value: attendanceSummary.approved,
              },
              {
                label: 'Locked',
                value: attendanceSummary.locked,
              },
            ]}
            highlights={[
              'Approval absensi per periode',
              'Detail harian, bukti, dan keterangan',
              'PHL, cuti, izin, sakit, tugas luar terlihat di detail',
            ]}
          />

          <ApprovalModuleCard
            title="Approval Cuti, Izin & PHL"
            description="Review pengajuan cuti tahunan, cuti khusus, sakit, izin, tugas luar, dan klaim PHL. Saldo cuti/PHL akan otomatis terpotong saat approve."
            href="/employee/approvals/leave"
            icon={<FileText size={25} />}
            tone="purple"
            metrics={[
              {
                label: 'Total Request',
                value: leaveSummary.total,
              },
              {
                label: 'Pending',
                value: leaveSummary.pending,
              },
              {
                label: 'Approved',
                value: leaveSummary.approved,
              },
              {
                label: 'Rejected',
                value: leaveSummary.rejected,
              },
            ]}
            highlights={[
              'Approval cuti, izin, sakit, tugas luar',
              'Klaim PHL mengurangi saldo PHL',
              'Cuti tahunan mengurangi saldo cuti otomatis',
            ]}
          />
        </div>

        <SubordinateOrgChart
          supervisor={supervisor}
          employees={subordinates}
          loading={loading}
        />
      </section>
    </>
  )
}

function PeriodFilterBar({
  periodMonth,
  periodStart,
  periodEnd,
  loading,
  attendanceTotal,
  attendancePending,
  onMonthChange,
  onRefresh,
}: {
  periodMonth: string
  periodStart: string
  periodEnd: string
  loading: boolean
  attendanceTotal: number
  attendancePending: number
  onMonthChange: (value: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="harmony-card overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
            <Filter size={20} />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Filter Periode Absensi
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Periode ini dipakai untuk ringkasan dan akses approval absensi bawahan.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center lg:justify-end">
          <label className="min-w-0 lg:w-[190px]">
            <span className="sr-only">Periode Cut-off</span>
            <input
              type="month"
              value={periodMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              className="harmony-input h-12"
            />
          </label>

          <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/80 px-4">
            <CalendarDays size={17} className="shrink-0 text-[#007aff]" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                Rentang
              </p>
              <p className="truncate text-xs font-bold text-[#1d1d1f] sm:text-sm">
                {formatDisplayDate(periodStart)} - {formatDisplayDate(periodEnd)}
              </p>
            </div>
          </div>

          <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/80 px-4">
            <Clock3 size={17} className="shrink-0 text-orange-700" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                Pending / Submit
              </p>
              <p className="text-sm font-bold text-[#1d1d1f]">
                {attendancePending} / {attendanceTotal}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-5 text-sm font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  )
}

function SubordinateOrgChart({
  supervisor,
  employees,
  loading,
}: {
  supervisor: Employee | null
  employees: Employee[]
  loading: boolean
}) {
  return (
    <div className="harmony-card overflow-hidden p-0">
      <div className="border-b border-black/5 p-5 lg:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Bawahan Terhubung
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Struktur ini membaca relasi dari field supervisor_1 dan supervisor_2 pada data karyawan.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#007aff]">
            <UsersRound size={14} />
            {employees.length} bawahan aktif
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
          <Loader2 size={18} className="animate-spin" />
          Memuat struktur bawahan...
        </div>
      ) : employees.length === 0 ? (
        <div className="p-6">
          <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
              <UsersRound size={24} />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
              Belum ada bawahan terhubung
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
              Pastikan field supervisor_1 atau supervisor_2 pada data karyawan bawahan
              berisi nama, ID, NIP, atau email atasan yang sesuai.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 lg:p-6">
          <div className="flex justify-center">
            <OrgSupervisorNode supervisor={supervisor} />
          </div>

          <div className="mx-auto h-10 w-[4px] rounded-full bg-[#007aff]/35" />

          <div className="relative mx-auto max-w-6xl">
            <div className="absolute left-4 right-4 top-0 hidden h-[4px] rounded-full bg-[#007aff]/25 sm:block" />

            <div className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {employees.map((employee) => (
                <div key={employee.id} className="relative">
                  <div className="absolute left-1/2 top-[-24px] hidden h-6 w-[4px] -translate-x-1/2 rounded-full bg-[#007aff]/25 sm:block" />
                  <OrgEmployeeNode
                    employee={employee}
                    supervisor={supervisor}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrgSupervisorNode({
  supervisor,
}: {
  supervisor: Employee | null
}) {
  return (
    <div className="w-full max-w-xl rounded-[30px] border border-black/5 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
          <ShieldCheck size={21} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-white/45">
            Atasan / Supervisor
          </p>
          <h3 className="mt-1 break-words text-lg font-semibold leading-6 text-white">
            {supervisor?.full_name || supervisor?.email || '-'}
          </h3>
          <p className="mt-1 break-words text-xs leading-5 text-white/55">
            {supervisor?.employee_number || '-'} · {supervisor?.department || '-'}
          </p>
          <p className="mt-1 break-words text-xs leading-5 text-white/45">
            {supervisor?.position || '-'}
          </p>
        </div>
      </div>
    </div>
  )
}

function OrgEmployeeNode({
  employee,
  supervisor,
}: {
  employee: Employee
  supervisor: Employee | null
}) {
  const level = getSupervisorLevel(employee, supervisor)

  return (
    <div className="h-full rounded-[28px] border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
          <UserRound size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-bold text-[#6e6e73]">
              {level}
            </span>

            {employee.is_active && (
              <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                Aktif
              </span>
            )}
          </div>

          <h3 className="mt-3 break-words text-sm font-bold leading-5 text-[#1d1d1f]">
            {employee.full_name || '-'}
          </h3>

          <p className="mt-1 break-words text-xs leading-5 text-[#6e6e73]">
            {employee.employee_number || '-'} · {employee.department || '-'}
          </p>

          <p className="mt-1 break-words text-xs leading-5 text-[#86868b]">
            {employee.position || '-'}
          </p>
        </div>
      </div>
    </div>
  )
}

function ApprovalModuleCard({
  title,
  description,
  href,
  icon,
  tone,
  metrics,
  highlights,
}: {
  title: string
  description: string
  href: string
  icon: ReactNode
  tone: ModuleTone
  metrics: {
    label: string
    value: number
  }[]
  highlights: string[]
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <Link
      href={href}
      className="group harmony-card harmony-hover-lift block overflow-hidden p-0"
    >
      <div className="border-b border-black/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-3xl ${toneClass}`}>
            {icon}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#6e6e73]">
            Buka Modul
            <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        <h3 className="mt-6 text-2xl font-semibold tracking-tight text-[#1d1d1f]">
          {title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-[#6e6e73]">
          {description}
        </p>
      </div>

      <div className="grid gap-3 border-b border-black/5 p-6 md:grid-cols-4">
        {metrics.map((item) => (
          <div
            key={item.label}
            className="rounded-[20px] bg-[#f5f5f7]/80 p-4"
          >
            <p className="text-xs font-semibold text-[#6e6e73]">
              {item.label}
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#1d1d1f]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3 p-6">
        {highlights.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-2xl bg-[#f5f5f7]/70 px-4 py-3"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-green-700 shadow-sm">
              <CheckCircle2 size={13} />
            </div>

            <p className="text-sm leading-5 text-[#1d1d1f]">
              {item}
            </p>
          </div>
        ))}
      </div>
    </Link>
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
  tone: SummaryTone
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
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

function getSupervisorLevel(employee: Employee, supervisor: Employee | null) {
  if (!supervisor) return 'Bawahan'

  const supervisorName = normalizeText(supervisor.full_name)
  const supervisorId = normalizeText(supervisor.id)
  const supervisorEmployeeNumber = normalizeText(supervisor.employee_number)
  const supervisorEmail = normalizeText(supervisor.email)

  const supervisorOne = normalizeText(employee.supervisor_1)
  const supervisorTwo = normalizeText(employee.supervisor_2)

  const matchesOne = [
    supervisorName,
    supervisorId,
    supervisorEmployeeNumber,
    supervisorEmail,
  ].includes(supervisorOne)

  const matchesTwo = [
    supervisorName,
    supervisorId,
    supervisorEmployeeNumber,
    supervisorEmail,
  ].includes(supervisorTwo)

  if (matchesOne && matchesTwo) return 'Atasan 1 & 2'
  if (matchesOne) return 'Atasan 1'
  if (matchesTwo) return 'Atasan 2'

  return 'Bawahan'
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

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}
