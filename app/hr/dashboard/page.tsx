'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Fingerprint,
  Landmark,
  Plane,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCog,
  Users,
  WalletCards,
  Activity,
  Layers,
  Zap,
  Database,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'

export default function HRDashboardPage() {
  return (
    <>
      <Topbar
        title="Beranda HR"
        description="Control center untuk absensi, cuti, PHL, approval, user access, dan monitoring operasional HR."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 p-6">
        <HeroSection />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Employee"
            value="Master"
            description="Kelola data karyawan, machine PIN, struktur atasan, dan saldo."
            icon={<Users size={20} />}
            href="/hr/employees"
            tone="blue"
          />

          <MetricCard
            title="Attendance"
            value="Upload"
            description="Import absensi fingerprint dan mapping otomatis."
            icon={<Fingerprint size={20} />}
            href="/hr/attendance/upload"
            tone="green"
          />

          <MetricCard
            title="Leave"
            value="Control"
            description="Cuti, izin, sakit, postpone, bukti, dan approval."
            icon={<CalendarDays size={20} />}
            href="/hr/leave"
            tone="orange"
          />

          <MetricCard
            title="Users"
            value="Access"
            description="Akun login HR/Employee dan reset password."
            icon={<UserCog size={20} />}
            href="/hr/users"
            tone="purple"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <QuickActionsPanel />
          <OperationalPanel />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SystemModulesPanel />
          <WorkflowPanel />
        </div>
      </section>
    </>
  )
}

function HeroSection() {
  return (
    <div className="harmony-glass-dark harmony-slide-up relative overflow-hidden rounded-[34px] p-7 text-white">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-16 h-72 w-72 rounded-full bg-[#af52de]/30 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/2 h-52 w-52 rounded-full bg-[#34c759]/20 blur-3xl" />

      <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-white/75 backdrop-blur-xl">
            <Sparkles size={15} className="text-[#5ac8fa]" />
            HARMONY · HR Command Center
          </div>

          <h2 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            HR operation yang lebih clean, cepat, dan terkendali.
          </h2>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
            Dashboard ini menjadi pusat kontrol untuk absensi fingerprint,
            pengajuan cuti dan izin, validasi PHL, kalender libur, user access,
            serta monitoring data karyawan.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/hr/attendance/upload"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#1d1d1f] transition hover:-translate-y-0.5 hover:bg-[#f5f5f7]"
            >
              <Upload size={17} />
              Upload Absensi
            </Link>

            <Link
              href="/hr/leave"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <CalendarDays size={17} />
              Kelola Cuti
            </Link>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/10 p-5 backdrop-blur-2xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white/80">
                System Status
              </p>
              <p className="mt-1 text-xs text-white/45">
                Core modules readiness
              </p>
            </div>

            <div className="rounded-2xl bg-[#34c759]/15 p-3 text-[#9ff2b5]">
              <Activity size={20} />
            </div>
          </div>

          <div className="space-y-3">
            <StatusRow label="Attendance Engine" value="Ready" />
            <StatusRow label="Leave Workflow" value="Active" />
            <StatusRow label="PHL Control" value="Online" />
            <StatusRow label="User Access" value="Secured" />
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
  icon: React.ReactNode
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
      className="harmony-card harmony-hover-lift harmony-slide-up block p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl bg-gradient-to-br p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#007aff]">
        Open module
        <ArrowUpRight size={14} />
      </div>
    </Link>
  )
}

function QuickActionsPanel() {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="Quick Actions"
        description="Akses cepat untuk proses HR yang paling sering digunakan."
        icon={<Zap size={18} />}
        tone="blue"
      />

      <div className="grid gap-3 p-5 md:grid-cols-2">
        <QuickAction
          title="Upload Absensi"
          description="Import Excel/CSV dari mesin fingerprint."
          href="/hr/attendance/upload"
          icon={<Upload size={19} />}
          tone="blue"
        />

        <QuickAction
          title="Data Absensi"
          description="Lihat rekap cut-off dan print absensi."
          href="/hr/attendance/data"
          icon={<Clock3 size={19} />}
          tone="green"
        />

        <QuickAction
          title="Cuti & Izin"
          description="Approval, bukti, jenis cuti, dan saldo."
          href="/hr/leave"
          icon={<FileText size={19} />}
          tone="orange"
        />

        <QuickAction
          title="User Management"
          description="Create user, reset password, role akses."
          href="/hr/users"
          icon={<UserCog size={19} />}
          tone="purple"
        />
      </div>
    </div>
  )
}

function OperationalPanel() {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="Operational Overview"
        description="Ringkasan area yang perlu dipantau HR."
        icon={<Activity size={18} />}
        tone="green"
      />

      <div className="space-y-3 p-5">
        <OverviewItem
          title="Attendance Data"
          description="Pastikan upload fingerprint sudah diproses sesuai cut-off."
          status="Ready"
          icon={<Fingerprint size={17} />}
          tone="blue"
        />

        <OverviewItem
          title="Leave Requests"
          description="Pantau pengajuan cuti, izin, sakit, dan bukti pendukung."
          status="Open"
          icon={<CalendarDays size={17} />}
          tone="orange"
        />

        <OverviewItem
          title="PHL Candidates"
          description="Validasi checklock pada weekend atau hari libur aktif."
          status="Monitor"
          icon={<Plane size={17} />}
          tone="purple"
        />

        <OverviewItem
          title="Holiday Calendar"
          description="Pastikan kalender libur aktif selalu diperbarui."
          status="Active"
          icon={<Landmark size={17} />}
          tone="green"
        />
      </div>
    </div>
  )
}

function SystemModulesPanel() {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="System Modules"
        description="Modul inti HARMONY yang sudah tersedia."
        icon={<Layers size={18} />}
        tone="purple"
      />

      <div className="grid gap-3 p-5">
        <ModuleRow
          title="Employee Master"
          description="Data karyawan, machine PIN, atasan, saldo cuti, saldo PHL."
          icon={<Users size={18} />}
          href="/hr/employees"
        />

        <ModuleRow
          title="Attendance Engine"
          description="Upload, mapping, rekap cut-off, print bukti absensi."
          icon={<Database size={18} />}
          href="/hr/attendance/data"
        />

        <ModuleRow
          title="Access Control"
          description="User HR/Employee, bulk create, reset password."
          icon={<ShieldCheck size={18} />}
          href="/hr/users"
        />
      </div>
    </div>
  )
}

function WorkflowPanel() {
  const steps = [
    {
      number: '01',
      title: 'Upload Absensi',
      description: 'Data fingerprint diunggah dan dibaca berdasarkan machine_pin.',
      tone: 'blue',
    },
    {
      number: '02',
      title: 'Mapping Employee',
      description: 'Sistem hanya memproses data yang sesuai master karyawan.',
      tone: 'green',
    },
    {
      number: '03',
      title: 'Validasi Cuti / PHL',
      description: 'HR melakukan approval dan koreksi berdasarkan bukti.',
      tone: 'orange',
    },
    {
      number: '04',
      title: 'Dashboard Record',
      description: 'Record absensi, cuti, dan PHL tersimpan untuk monitoring.',
      tone: 'purple',
    },
  ] as const

  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <PanelHeader
        title="Workflow HARMONY"
        description="Alur utama sistem HR dari input data hingga monitoring."
        icon={<CheckCircle2 size={18} />}
        tone="orange"
      />

      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <WorkflowStep
            key={step.number}
            number={step.number}
            title={step.title}
            description={step.description}
            tone={step.tone}
          />
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
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/5 p-5">
      <div>
        <h3 className="text-lg font-semibold text-[#1d1d1f]">
          {title}
        </h3>

        <p className="mt-1 text-sm text-[#6e6e73]">
          {description}
        </p>
      </div>

      <div className={`rounded-2xl p-3 ${toneClass}`}>
        {icon}
      </div>
    </div>
  )
}

function StatusRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-sm text-white/62">
        {label}
      </span>

      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34c759]/15 px-3 py-1 text-xs font-bold text-[#9ff2b5]">
        <CheckCircle2 size={13} />
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
  icon: React.ReactNode
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
      className="group rounded-[24px] border border-black/5 bg-white/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-[#1d1d1f]">
              {title}
            </h4>

            <ArrowUpRight
              size={16}
              className="text-[#c7c7cc] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#007aff]"
            />
          </div>

          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#6e6e73]">
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
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="rounded-[24px] border border-black/5 bg-white/60 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-[#1d1d1f]">
              {title}
            </h4>

            <span className="rounded-full bg-[#eaf8ee] px-3 py-1 text-xs font-bold text-[#168034]">
              {status}
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>
    </div>
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
  icon: React.ReactNode
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[24px] border border-black/5 bg-white/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-[#1d1d1f]">
          {title}
        </h4>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6e6e73]">
          {description}
        </p>
      </div>

      <ArrowUpRight
        size={16}
        className="text-[#c7c7cc] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#007aff]"
      />
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
    <div className="rounded-[24px] border border-black/5 bg-white/60 p-4 shadow-sm">
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold ${toneClass}`}>
        {number}
      </div>

      <h4 className="font-semibold text-[#1d1d1f]">
        {title}
      </h4>

      <p className="mt-2 text-xs leading-5 text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}