'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Fingerprint,
  Landmark,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
  UserCog,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type AnyRow = Record<string, any>

type DashboardData = {
  employees: AnyRow[]
  attendanceLogs: AnyRow[]
  periodConfirmations: AnyRow[]
  leaveRequests: AnyRow[]
  holidays: AnyRow[]
  appUsers: AnyRow[]
}

type DashboardMetrics = {
  activeEmployees: number
  totalEmployees: number
  inactiveEmployees: number
  attendanceLogs: number
  submittedEmployees: number
  notSubmittedEmployees: number
  pendingSupervisor: number
  readyForHr: number
  finalizedEmployees: number
  lockedEmployees: number
  pendingLeaveRequests: number
  activeUsers: number
  inactiveUsers: number
  upcomingHolidays: number
  uploadedEmployees: number
}

const INITIAL_DATA: DashboardData = {
  employees: [],
  attendanceLogs: [],
  periodConfirmations: [],
  leaveRequests: [],
  holidays: [],
  appUsers: [],
}

export default function HRDashboardPage() {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const currentPeriod = useMemo(() => getCurrentAttendancePeriod(), [])
  const metrics = useMemo(
    () => buildDashboardMetrics(data, currentPeriod.periodMonth),
    [data, currentPeriod.periodMonth]
  )

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData(isRefresh = false) {
    try {
      setErrorMessage('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const [
        employeesResult,
        attendanceLogsResult,
        confirmationsResult,
        leaveRequestsResult,
        holidaysResult,
        appUsersResult,
      ] = await Promise.all([
        supabase.from('employees').select('*').order('full_name', { ascending: true }),
        supabase
          .from('attendance_logs')
          .select('*')
          .gte('attendance_date', currentPeriod.startDate)
          .lte('attendance_date', currentPeriod.endDate),
        supabase
          .from('attendance_period_confirmations')
          .select('*')
          .eq('period_month', currentPeriod.periodMonth),
        supabase.from('leave_requests').select('*'),
        supabase.from('holidays').select('*').gte('holiday_date', todayIsoDate()),
        supabase.from('app_users').select('*'),
      ])

      const firstError =
        employeesResult.error ||
        attendanceLogsResult.error ||
        confirmationsResult.error ||
        leaveRequestsResult.error ||
        holidaysResult.error ||
        appUsersResult.error

      if (firstError) {
        throw firstError
      }

      setData({
        employees: employeesResult.data || [],
        attendanceLogs: attendanceLogsResult.data || [],
        periodConfirmations: confirmationsResult.data || [],
        leaveRequests: leaveRequestsResult.data || [],
        holidays: holidaysResult.data || [],
        appUsers: appUsersResult.data || [],
      })
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Dashboard belum berhasil mengambil data. Periksa koneksi Supabase dan struktur tabel.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  return (
    <>
      <Topbar
        title="Beranda HR"
        description="Control center absensi, cuti, PHL, user access, dan monitoring operasional HR."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-5">
        <HeroSection
          periodLabel={currentPeriod.label}
          startDate={currentPeriod.startDate}
          endDate={currentPeriod.endDate}
          metrics={metrics}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => fetchDashboardData(true)}
        />

        {errorMessage && (
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-2 text-red-600">
                <AlertTriangle size={18} />
              </div>

              <div>
                <p className="font-bold">Data dashboard belum berhasil dimuat.</p>
                <p className="mt-1 text-red-600">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Karyawan Aktif"
            value={loading ? '...' : formatNumber(metrics.activeEmployees)}
            description={`${formatNumber(metrics.totalEmployees)} total karyawan terdata`}
            icon={<Users size={18} />}
            href="/hr/employees"
            tone="blue"
          />

          <MetricCard
            title="Belum Submit Absensi"
            value={loading ? '...' : formatNumber(metrics.notSubmittedEmployees)}
            description={`Periode ${currentPeriod.label}`}
            icon={<Clock3 size={18} />}
            href="/hr/attendance/data"
            tone={metrics.notSubmittedEmployees > 0 ? 'orange' : 'green'}
          />

          <MetricCard
            title="Pending Approval Atasan"
            value={loading ? '...' : formatNumber(metrics.pendingSupervisor)}
            description="Menunggu verifikasi supervisor"
            icon={<UserCheck size={18} />}
            href="/hr/attendance/approvals"
            tone={metrics.pendingSupervisor > 0 ? 'orange' : 'green'}
          />

          <MetricCard
            title="Finalized / Locked"
            value={
              loading
                ? '...'
                : `${formatNumber(metrics.finalizedEmployees)} / ${formatNumber(metrics.lockedEmployees)}`
            }
            description="Final HR / periode terkunci"
            icon={<Lock size={18} />}
            href="/hr/attendance/final-report"
            tone="purple"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SmallStatCard
            title="Data Fingerprint"
            value={loading ? '...' : formatNumber(metrics.attendanceLogs)}
            description={`${formatNumber(metrics.uploadedEmployees)} karyawan punya log`}
            icon={<Fingerprint size={17} />}
            tone="blue"
          />

          <SmallStatCard
            title="Ready for HR"
            value={loading ? '...' : formatNumber(metrics.readyForHr)}
            description="Siap dicek/finalisasi HR"
            icon={<CheckCircle2 size={17} />}
            tone="green"
          />

          <SmallStatCard
            title="Cuti/Izin/PHL Pending"
            value={loading ? '...' : formatNumber(metrics.pendingLeaveRequests)}
            description="Masih perlu tindak lanjut"
            icon={<CalendarDays size={17} />}
            tone={metrics.pendingLeaveRequests > 0 ? 'orange' : 'green'}
          />

          <SmallStatCard
            title="User Aktif"
            value={loading ? '...' : formatNumber(metrics.activeUsers)}
            description={`${formatNumber(metrics.inactiveUsers)} user nonaktif`}
            icon={<UserCog size={17} />}
            tone="purple"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <QuickActionsPanel />
          <AttendanceMonitoringPanel
            loading={loading}
            periodLabel={currentPeriod.label}
            metrics={metrics}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <SystemModulesPanel metrics={metrics} loading={loading} />
          <WorkflowPanel />
        </div>
      </section>
    </>
  )
}

function HeroSection({
  periodLabel,
  startDate,
  endDate,
  metrics,
  loading,
  refreshing,
  onRefresh,
}: {
  periodLabel: string
  startDate: string
  endDate: string
  metrics: DashboardMetrics
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
}) {
  const completionRate =
    metrics.activeEmployees === 0
      ? 0
      : Math.round((metrics.submittedEmployees / metrics.activeEmployees) * 100)

  return (
    <div className="harmony-glass-dark harmony-slide-up relative overflow-hidden rounded-[28px] p-5 text-white sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#007aff]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-[#af52de]/25 blur-3xl" />

      <div className="relative grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/75 backdrop-blur-xl">
            <Sparkles size={13} className="text-[#5ac8fa]" />
            HARMONY · HR Command Center
          </div>

          <h2 className="max-w-3xl text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            Monitoring HR periode {periodLabel}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
            Cut-off absensi {formatReadableDate(startDate)} sampai {formatReadableDate(endDate)}. Pantau submit employee, approval atasan, ready HR, finalisasi, dan lock periode dari satu halaman.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/hr/attendance/upload"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-xs font-bold text-[#1d1d1f] transition hover:-translate-y-0.5 hover:bg-[#f5f5f7]"
            >
              <Upload size={15} />
              Upload Absensi
            </Link>

            <Link
              href="/hr/attendance/data"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <Database size={15} />
              Data Absensi
            </Link>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white/80">
                Attendance Completion
              </p>
              <p className="mt-0.5 text-[11px] text-white/45">
                Submit employee periode berjalan
              </p>
            </div>

            <div className="rounded-2xl bg-[#34c759]/15 p-2.5 text-[#9ff2b5]">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-end justify-between gap-3">
              <p className="text-4xl font-semibold tracking-tight">
                {loading ? '...' : `${completionRate}%`}
              </p>
              <p className="text-right text-xs leading-5 text-white/55">
                {formatNumber(metrics.submittedEmployees)} submit dari{' '}
                {formatNumber(metrics.activeEmployees)} karyawan aktif
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#34c759] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <StatusRow
              label="Belum Submit"
              value={loading ? '...' : formatNumber(metrics.notSubmittedEmployees)}
              tone={metrics.notSubmittedEmployees > 0 ? 'orange' : 'green'}
            />
            <StatusRow
              label="Pending Atasan"
              value={loading ? '...' : formatNumber(metrics.pendingSupervisor)}
              tone={metrics.pendingSupervisor > 0 ? 'orange' : 'green'}
            />
            <StatusRow
              label="Ready HR"
              value={loading ? '...' : formatNumber(metrics.readyForHr)}
              tone="blue"
            />
            <StatusRow
              label="Locked"
              value={loading ? '...' : formatNumber(metrics.lockedEmployees)}
              tone="purple"
            />
          </div>
        </div>
      </div>
    </div>
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
  icon: ReactNode
  href: string
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'from-[#e8f2ff] to-white text-[#007aff]',
    green: 'from-[#eaf8ee] to-white text-[#168034]',
    orange: 'from-[#fff4e5] to-white text-[#b35b00]',
    purple: 'from-[#f7edfc] to-white text-[#7b2cbf]',
  }[tone]

  return (
    <Link
      href={href}
      className="harmony-card harmony-hover-lift harmony-slide-up block min-w-0 p-4"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-1 truncate text-xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`shrink-0 rounded-2xl bg-gradient-to-br p-2.5 ${toneClass}`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-[#007aff]">
        Open module
        <ArrowUpRight size={13} />
      </div>
    </Link>
  )
}

function SmallStatCard({
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
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="harmony-card harmony-slide-up min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[#6e6e73]">
            {title}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </p>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`shrink-0 rounded-2xl p-2.5 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function QuickActionsPanel() {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="Quick Actions"
        description="Akses cepat proses HR yang paling sering dipakai."
        icon={<Zap size={17} />}
        tone="blue"
      />

      <div className="grid gap-3 p-4 md:grid-cols-2">
        <QuickAction title="Upload Absensi" description="Import Excel/CSV mesin fingerprint." href="/hr/attendance/upload" icon={<Upload size={17} />} tone="blue" />
        <QuickAction title="Data Absensi" description="Monitoring periode, lock, unlock, dan reset attendance." href="/hr/attendance/data" icon={<Clock3 size={17} />} tone="green" />
        <QuickAction title="Final Report" description="Rekap final HR dan export laporan." href="/hr/attendance/final-report" icon={<Download size={17} />} tone="purple" />
        <QuickAction title="Cuti & Izin" description="Approval, bukti, jenis cuti, saldo." href="/hr/leave" icon={<CalendarDays size={17} />} tone="orange" />
        <QuickAction title="Master Karyawan" description="Data karyawan, homebase, jabatan tambahan." href="/hr/employees" icon={<Users size={17} />} tone="blue" />
        <QuickAction title="User Management" description="Akun Google, role, aktif/nonaktif user." href="/hr/users" icon={<UserCog size={17} />} tone="purple" />
      </div>
    </div>
  )
}

function AttendanceMonitoringPanel({
  loading,
  periodLabel,
  metrics,
}: {
  loading: boolean
  periodLabel: string
  metrics: DashboardMetrics
}) {
  const items = [
    {
      title: 'Belum Submit',
      value: metrics.notSubmittedEmployees,
      description: 'Karyawan aktif belum submit konfirmasi absensi.',
      href: '/hr/attendance/data',
      icon: <XCircle size={16} />,
      tone: metrics.notSubmittedEmployees > 0 ? 'orange' : 'green',
    },
    {
      title: 'Pending Approval Atasan',
      value: metrics.pendingSupervisor,
      description: 'Sudah submit employee, menunggu approval atasan.',
      href: '/hr/attendance/approvals',
      icon: <UserCheck size={16} />,
      tone: metrics.pendingSupervisor > 0 ? 'orange' : 'green',
    },
    {
      title: 'Ready for HR',
      value: metrics.readyForHr,
      description: 'Sudah disetujui atasan dan siap dicek HR.',
      href: '/hr/attendance/final-report',
      icon: <CheckCircle2 size={16} />,
      tone: 'blue',
    },
    {
      title: 'Locked Period',
      value: metrics.lockedEmployees,
      description: 'Data periode yang sudah terkunci.',
      href: '/hr/attendance/data',
      icon: <Lock size={16} />,
      tone: 'purple',
    },
  ] as const

  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title={`Monitoring Absensi · ${periodLabel}`}
        description="Status utama proses absensi periode berjalan."
        icon={<Activity size={17} />}
        tone="green"
      />

      <div className="space-y-2.5 p-4">
        {items.map((item) => (
          <OverviewItem
            key={item.title}
            title={item.title}
            description={item.description}
            status={loading ? '...' : formatNumber(item.value)}
            icon={item.icon}
            href={item.href}
            tone={item.tone}
          />
        ))}
      </div>
    </div>
  )
}

function SystemModulesPanel({
  metrics,
  loading,
}: {
  metrics: DashboardMetrics
  loading: boolean
}) {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="System Modules"
        description="Modul inti HARMONY."
        icon={<Layers size={17} />}
        tone="purple"
      />

      <div className="grid gap-3 p-4">
        <ModuleRow
          title="Employee Master"
          description={`${loading ? '...' : formatNumber(metrics.activeEmployees)} karyawan aktif, homebase, atasan, jabatan tambahan.`}
          icon={<Users size={17} />}
          href="/hr/employees"
        />
        <ModuleRow
          title="Attendance Engine"
          description={`${loading ? '...' : formatNumber(metrics.attendanceLogs)} log fingerprint periode berjalan.`}
          icon={<Database size={17} />}
          href="/hr/attendance/data"
        />
        <ModuleRow
          title="Leave & PHL Control"
          description={`${loading ? '...' : formatNumber(metrics.pendingLeaveRequests)} pengajuan pending.`}
          icon={<CalendarDays size={17} />}
          href="/hr/leave"
        />
        <ModuleRow
          title="Access Control"
          description={`${loading ? '...' : formatNumber(metrics.activeUsers)} user aktif untuk login Google/email.`}
          icon={<ShieldCheck size={17} />}
          href="/hr/users"
        />
        <ModuleRow
          title="Holiday Calendar"
          description={`${loading ? '...' : formatNumber(metrics.upcomingHolidays)} hari libur mendatang terdata.`}
          icon={<Landmark size={17} />}
          href="/hr/holidays"
        />
      </div>
    </div>
  )
}

function WorkflowPanel() {
  const steps = [
    { number: '01', title: 'Upload Absensi', description: 'HR upload data fingerprint dari mesin.', tone: 'blue' },
    { number: '02', title: 'Employee Confirm', description: 'Employee cek dan submit data periode.', tone: 'green' },
    { number: '03', title: 'Approval Atasan', description: 'Atasan approve/reject data bawahan.', tone: 'orange' },
    { number: '04', title: 'HR Final & Lock', description: 'HR finalisasi lalu lock satu periode.', tone: 'purple' },
  ] as const

  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="Workflow HARMONY"
        description="Alur utama absensi dari upload sampai lock periode."
        icon={<CheckCircle2 size={17} />}
        tone="orange"
      />

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <WorkflowStep key={step.number} {...step} />
        ))}
      </div>
    </div>
  )
}

function PanelHeader({
  title,
  description,
  icon,
  tone,
}: {
  title: string
  description: string
  icon: ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/5 p-4">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-[#1d1d1f]">
          {title}
        </h3>

        <p className="mt-0.5 line-clamp-1 text-xs text-[#6e6e73]">
          {description}
        </p>
      </div>

      <div className={`shrink-0 rounded-2xl p-2.5 ${toneClass}`}>
        {icon}
      </div>
    </div>
  )
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#007aff]/15 text-[#9fd4ff]',
    green: 'bg-[#34c759]/15 text-[#9ff2b5]',
    orange: 'bg-[#ff9f0a]/15 text-[#ffd18a]',
    purple: 'bg-[#af52de]/15 text-[#e9b9ff]',
  }[tone]

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="text-xs text-white/62">
        {label}
      </span>

      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>
        {value}
      </span>
    </div>
  )
}

function QuickAction({
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
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <Link
      href={href}
      className="group rounded-[22px] border border-black/5 bg-white/60 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={`shrink-0 rounded-2xl p-2.5 ${toneClass}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-[#1d1d1f]">
              {title}
            </h4>

            <ArrowUpRight size={15} className="shrink-0 text-[#c7c7cc] transition group-hover:text-[#007aff]" />
          </div>

          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}

function OverviewItem({
  title,
  description,
  status,
  icon,
  href,
  tone,
}: {
  title: string
  description: string
  status: string
  icon: ReactNode
  href: string
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  const statusClass = toneClass

  return (
    <Link
      href={href}
      className="block rounded-[22px] border border-black/5 bg-white/60 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 rounded-2xl p-2.5 ${toneClass}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="truncate text-sm font-semibold text-[#1d1d1f]">
              {title}
            </h4>

            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>
              {status}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}

function ModuleRow({
  title,
  description,
  icon,
  href,
}: {
  title: string
  description: string
  icon: ReactNode
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[22px] border border-black/5 bg-white/60 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="shrink-0 rounded-2xl bg-[#e8f2ff] p-2.5 text-[#007aff]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-[#1d1d1f]">
          {title}
        </h4>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-[#6e6e73]">
          {description}
        </p>
      </div>

      <ArrowRight size={15} className="shrink-0 text-[#c7c7cc] transition group-hover:translate-x-0.5 group-hover:text-[#007aff]" />
    </Link>
  )
}

function WorkflowStep({
  number,
  title,
  description,
  tone,
}: {
  number: string
  title: string
  description: string
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="rounded-[22px] border border-black/5 bg-white/60 p-3.5 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-bold ${toneClass}`}>
        {number}
      </div>

      <h4 className="truncate text-sm font-semibold text-[#1d1d1f]">
        {title}
      </h4>

      <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}

function buildDashboardMetrics(
  data: DashboardData,
  periodMonth: string
): DashboardMetrics {
  const activeEmployees = data.employees.filter(isActiveEmployee)
  const activeEmployeeIds = new Set(activeEmployees.map((employee) => String(employee.id)))

  const currentConfirmations = data.periodConfirmations.filter((confirmation) => {
    const confirmationPeriod = String(confirmation.period_month || '')
    if (confirmationPeriod && confirmationPeriod !== periodMonth) return false

    const employeeId = String(confirmation.employee_id || '')
    return activeEmployeeIds.has(employeeId)
  })

  const submittedEmployeeIds = new Set(
    currentConfirmations
      .filter(isSubmittedConfirmation)
      .map((confirmation) => String(confirmation.employee_id || ''))
      .filter(Boolean)
  )

  const finalizedEmployeeIds = new Set(
    currentConfirmations
      .filter(isFinalizedConfirmation)
      .map((confirmation) => String(confirmation.employee_id || ''))
      .filter(Boolean)
  )

  const lockedEmployeeIds = new Set(
    currentConfirmations
      .filter((confirmation) => Boolean(confirmation.is_locked) || isFinalizedConfirmation(confirmation))
      .map((confirmation) => String(confirmation.employee_id || ''))
      .filter(Boolean)
  )

  const pendingSupervisor = currentConfirmations.filter((confirmation) => {
    if (isFinalizedConfirmation(confirmation)) return false
    if (Boolean(confirmation.is_locked)) return false

    const employeeStatus = normalizeStatus(
      confirmation.employee_status ||
        confirmation.confirmation_status ||
        confirmation.status
    )

    const supervisorStatus = normalizeStatus(
      confirmation.supervisor_status ||
        confirmation.approval_status ||
        confirmation.manager_status
    )

    if (!isSubmittedText(employeeStatus)) return false
    if (isApprovedText(supervisorStatus)) return false
    if (isRejectedText(supervisorStatus)) return false

    return true
  }).length

  const readyForHr = currentConfirmations.filter((confirmation) => {
    if (isFinalizedConfirmation(confirmation)) return false

    const hrStatus = normalizeStatus(confirmation.hr_status)
    const supervisorStatus = normalizeStatus(
      confirmation.supervisor_status ||
        confirmation.approval_status ||
        confirmation.manager_status
    )

    return (
      hrStatus === 'ready_for_hr' ||
      hrStatus === 'ready-for-hr' ||
      hrStatus === 'readyhr' ||
      isApprovedText(supervisorStatus)
    )
  }).length

  const attendanceEmployeeIds = new Set(
    data.attendanceLogs
      .map((log) => String(log.employee_id || ''))
      .filter((employeeId) => activeEmployeeIds.has(employeeId))
  )

  const activeUsers = data.appUsers.filter((user) => user.is_active !== false).length
  const inactiveUsers = data.appUsers.filter((user) => user.is_active === false).length

  return {
    activeEmployees: activeEmployees.length,
    totalEmployees: data.employees.length,
    inactiveEmployees: Math.max(0, data.employees.length - activeEmployees.length),
    attendanceLogs: data.attendanceLogs.length,
    submittedEmployees: submittedEmployeeIds.size,
    notSubmittedEmployees: Math.max(0, activeEmployees.length - submittedEmployeeIds.size),
    pendingSupervisor,
    readyForHr,
    finalizedEmployees: finalizedEmployeeIds.size,
    lockedEmployees: lockedEmployeeIds.size,
    pendingLeaveRequests: data.leaveRequests.filter(isPendingRequest).length,
    activeUsers,
    inactiveUsers,
    upcomingHolidays: data.holidays.length,
    uploadedEmployees: attendanceEmployeeIds.size,
  }
}

function isActiveEmployee(employee: AnyRow) {
  if (employee.is_active === false) return false

  const status = normalizeStatus(
    employee.employee_status ||
      employee.employment_status ||
      employee.status ||
      employee.work_status
  )

  if (!status) return true

  return ![
    'inactive',
    'nonactive',
    'non-active',
    'non_aktif',
    'tidak_aktif',
    'resign',
    'resigned',
    'terminated',
    'keluar',
  ].includes(status)
}

function isSubmittedConfirmation(confirmation: AnyRow) {
  if (isFinalizedConfirmation(confirmation)) return true
  if (confirmation.is_locked) return true

  const employeeStatus = normalizeStatus(
    confirmation.employee_status ||
      confirmation.confirmation_status ||
      confirmation.status
  )

  const supervisorStatus = normalizeStatus(
    confirmation.supervisor_status ||
      confirmation.approval_status ||
      confirmation.manager_status
  )

  const hrStatus = normalizeStatus(confirmation.hr_status)

  return (
    isSubmittedText(employeeStatus) ||
    isApprovedText(supervisorStatus) ||
    hrStatus === 'ready_for_hr' ||
    hrStatus === 'ready-for-hr' ||
    hrStatus === 'finalized' ||
    hrStatus === 'finalised'
  )
}

function isFinalizedConfirmation(confirmation: AnyRow) {
  const hrStatus = normalizeStatus(confirmation.hr_status)

  return (
    hrStatus === 'finalized' ||
    hrStatus === 'finalised' ||
    hrStatus === 'locked' ||
    Boolean(confirmation.hr_finalized_at)
  )
}

function isPendingRequest(request: AnyRow) {
  const status = normalizeStatus(
    request.status ||
      request.request_status ||
      request.approval_status ||
      request.hr_status
  )

  if (!status) return false

  return (
    status.includes('pending') ||
    status.includes('waiting') ||
    status.includes('submitted') ||
    status.includes('process') ||
    status.includes('review') ||
    status.includes('menunggu') ||
    status.includes('diajukan')
  )
}

function isSubmittedText(status: string) {
  return (
    status === 'submitted' ||
    status === 'submit' ||
    status === 'sent' ||
    status === 'pending' ||
    status === 'menunggu' ||
    status === 'diajukan' ||
    status === 'ready_for_supervisor' ||
    status === 'ready-for-supervisor'
  )
}

function isApprovedText(status: string) {
  return (
    status === 'approved' ||
    status === 'approve' ||
    status === 'accepted' ||
    status === 'disetujui' ||
    status === 'ready_for_hr' ||
    status === 'ready-for-hr'
  )
}

function isRejectedText(status: string) {
  return (
    status === 'rejected' ||
    status === 'reject' ||
    status === 'declined' ||
    status === 'ditolak'
  )
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
}

function getCurrentAttendancePeriod() {
  const now = new Date()
  const periodStartDate = new Date(now)

  if (now.getDate() < 11) {
    periodStartDate.setMonth(periodStartDate.getMonth() - 1)
  }

  periodStartDate.setDate(11)
  periodStartDate.setHours(0, 0, 0, 0)

  const periodEndDate = new Date(periodStartDate)
  periodEndDate.setMonth(periodEndDate.getMonth() + 1)
  periodEndDate.setDate(10)
  periodEndDate.setHours(23, 59, 59, 999)

  return {
    periodMonth: toYearMonth(periodStartDate),
    startDate: toIsoDate(periodStartDate),
    endDate: toIsoDate(periodEndDate),
    label: formatPeriodLabel(periodStartDate, periodEndDate),
  }
}

function toYearMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function todayIsoDate() {
  return toIsoDate(new Date())
}

function formatReadableDate(value: string) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatPeriodLabel(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  })

  const endLabel = end.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return `${startLabel} - ${endLabel}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}