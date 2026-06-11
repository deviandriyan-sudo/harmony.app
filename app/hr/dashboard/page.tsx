'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  Fingerprint,
  Landmark,
  Layers,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCog,
  Users,
  Zap,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'

export default function HRDashboardPage() {
  return (
    <>
      <Topbar
        title="Beranda HR"
        description="Control center absensi, cuti, PHL, user access, dan monitoring operasional HR."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-5">
        <HeroSection />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Employee"
            value="Master"
            description="Data, PIN, atasan, dan saldo."
            icon={<Users size={18} />}
            href="/hr/employees"
            tone="blue"
          />

          <MetricCard
            title="Attendance"
            value="Upload"
            description="Import dan mapping absensi."
            icon={<Fingerprint size={18} />}
            href="/hr/attendance/upload"
            tone="green"
          />

          <MetricCard
            title="Leave"
            value="Control"
            description="Cuti, izin, PHL, approval."
            icon={<CalendarDays size={18} />}
            href="/hr/leave"
            tone="orange"
          />

          <MetricCard
            title="Users"
            value="Access"
            description="Akun dan role sistem."
            icon={<UserCog size={18} />}
            href="/hr/users"
            tone="purple"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <QuickActionsPanel />
          <OperationalPanel />
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <SystemModulesPanel />
          <WorkflowPanel />
        </div>
      </section>
    </>
  )
}

function HeroSection() {
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
            Operasional HR lebih ringkas, clean, dan terkendali.
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
            Pusat kontrol untuk absensi fingerprint, cuti & izin, PHL, kalender libur, akses user, dan master karyawan.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/hr/attendance/upload"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-xs font-bold text-[#1d1d1f] transition hover:-translate-y-0.5 hover:bg-[#f5f5f7]"
            >
              <Upload size={15} />
              Upload Absensi
            </Link>

            <Link
              href="/hr/leave"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <CalendarDays size={15} />
              Kelola Cuti
            </Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white/80">
                System Status
              </p>
              <p className="mt-0.5 text-[11px] text-white/45">
                Core modules readiness
              </p>
            </div>

            <div className="rounded-2xl bg-[#34c759]/15 p-2.5 text-[#9ff2b5]">
              <Activity size={18} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <StatusRow label="Attendance" value="Ready" />
            <StatusRow label="Leave" value="Active" />
            <StatusRow label="PHL" value="Online" />
            <StatusRow label="Access" value="Secured" />
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
        <QuickAction title="Data Absensi" description="Rekap cut-off dan print absensi." href="/hr/attendance/data" icon={<Clock3 size={17} />} tone="green" />
        <QuickAction title="Cuti & Izin" description="Approval, bukti, jenis cuti, saldo." href="/hr/leave" icon={<CalendarDays size={17} />} tone="orange" />
        <QuickAction title="User Management" description="Create user, reset password, role." href="/hr/users" icon={<UserCog size={17} />} tone="purple" />
      </div>
    </div>
  )
}

function OperationalPanel() {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="Operational Overview"
        description="Area yang perlu dipantau HR."
        icon={<Activity size={17} />}
        tone="green"
      />

      <div className="space-y-2.5 p-4">
        <OverviewItem title="Attendance Data" description="Upload fingerprint sesuai cut-off." status="Ready" icon={<Fingerprint size={16} />} tone="blue" />
        <OverviewItem title="Leave Requests" description="Cuti, izin, sakit, bukti pendukung." status="Open" icon={<CalendarDays size={16} />} tone="orange" />
        <OverviewItem title="Holiday Calendar" description="Kalender libur aktif diperbarui." status="Active" icon={<Landmark size={16} />} tone="green" />
      </div>
    </div>
  )
}

function SystemModulesPanel() {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="System Modules"
        description="Modul inti HARMONY."
        icon={<Layers size={17} />}
        tone="purple"
      />

      <div className="grid gap-3 p-4">
        <ModuleRow title="Employee Master" description="Data karyawan, machine PIN, atasan, saldo." icon={<Users size={17} />} href="/hr/employees" />
        <ModuleRow title="Attendance Engine" description="Upload, mapping, rekap cut-off." icon={<Database size={17} />} href="/hr/attendance/data" />
        <ModuleRow title="Access Control" description="User HR/Employee dan reset password." icon={<ShieldCheck size={17} />} href="/hr/users" />
      </div>
    </div>
  )
}

function WorkflowPanel() {
  const steps = [
    { number: '01', title: 'Upload Absensi', description: 'Data fingerprint diunggah.', tone: 'blue' },
    { number: '02', title: 'Mapping', description: 'Cocok dengan master employee.', tone: 'green' },
    { number: '03', title: 'Validasi', description: 'Cuti, izin, PHL, bukti.', tone: 'orange' },
    { number: '04', title: 'Monitoring', description: 'Record tersimpan untuk HR.', tone: 'purple' },
  ] as const

  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="Workflow HARMONY"
        description="Alur utama input sampai monitoring."
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

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="text-xs text-white/62">
        {label}
      </span>

      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34c759]/15 px-2.5 py-1 text-[11px] font-bold text-[#9ff2b5]">
        <CheckCircle2 size={12} />
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
  tone,
}: {
  title: string
  description: string
  status: string
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
    <div className="rounded-[22px] border border-black/5 bg-white/60 p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 rounded-2xl p-2.5 ${toneClass}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="truncate text-sm font-semibold text-[#1d1d1f]">
              {title}
            </h4>

            <span className="shrink-0 rounded-full bg-[#eaf8ee] px-2.5 py-1 text-[11px] font-bold text-[#168034]">
              {status}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function ModuleRow({ title, description, icon, href }: { title: string; description: string; icon: ReactNode; href: string }) {
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

      <ArrowUpRight size={15} className="shrink-0 text-[#c7c7cc] transition group-hover:text-[#007aff]" />
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
