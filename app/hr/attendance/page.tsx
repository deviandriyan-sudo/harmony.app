'use client'

import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Fingerprint,
  History,
  RefreshCcw,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { getCutoffRange } from '@/lib/attendance-reporting'
import { useAttendancePeriodQuery } from '@/lib/use-attendance-period'

type Tone = 'blue' | 'orange' | 'purple' | 'green'

type StepAction = {
  label: string
  href: string
  periodAware: boolean
}

type AttendanceStep = {
  step: string
  title: string
  description: string
  icon: ReactNode
  tone: Tone
  primary: StepAction
  secondary?: StepAction[]
  helper: string
}

const attendanceSteps: AttendanceStep[] = [
  {
    step: '01',
    title: 'Input Absensi',
    description:
      'Upload fingerprint lalu cek data yang masuk. Monitoring tetap tersedia tanpa menjadi tahap terpisah.',
    icon: <Fingerprint size={20} />,
    tone: 'blue',
    primary: {
      label: 'Upload Fingerprint',
      href: '/hr/attendance/upload',
      periodAware: false,
    },
    secondary: [
      {
        label: 'Lihat Data Absensi',
        href: '/hr/attendance/data',
        periodAware: true,
      },
    ],
    helper: 'Mesin, manual, koreksi, dan data pendukung tetap memakai source existing.',
  },
  {
    step: '02',
    title: 'Review & Validasi',
    description:
      'Periksa hasil submit, approval atasan, cuti/izin/sakit/ST/PHL, dan data yang memerlukan tindak lanjut.',
    icon: <ShieldCheck size={20} />,
    tone: 'orange',
    primary: {
      label: 'Buka HR Review',
      href: '/hr/attendance/approvals',
      periodAware: true,
    },
    secondary: [
      {
        label: 'Sinkronisasi Request',
        href: '/hr/attendance/sync',
        periodAware: true,
      },
    ],
    helper: 'Sinkronisasi tetap tersedia sebagai tool manual tanpa menjadi langkah utama terpisah.',
  },
  {
    step: '03',
    title: 'Finalisasi',
    description:
      'Finalisasi dan lock hanya employee yang sudah lolos review. Semua kontrol existing tetap digunakan.',
    icon: <CheckCircle2 size={20} />,
    tone: 'purple',
    primary: {
      label: 'Buka Finalisasi',
      href: '/hr/attendance/final-report',
      periodAware: true,
    },
    helper: 'Finalisasi tetap memakai route dan mekanisme lock yang sama seperti sebelumnya.',
  },
  {
    step: '04',
    title: 'Laporan',
    description:
      'Buka rekap kehadiran dan dasar tunjangan dari reporting engine existing untuk periode yang dipilih.',
    icon: <FileSpreadsheet size={20} />,
    tone: 'green',
    primary: {
      label: 'Buka Laporan',
      href: '/hr/attendance/export',
      periodAware: true,
    },
    helper: 'Laporan tetap membaca mesin, manual, ST/tugas luar, hari libur, dan approved request.',
  },
]

export default function HRAttendanceHomePage() {
  const { periodMonth, setPeriodMonth } = useAttendancePeriodQuery()
  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const withPeriod = (action: StepAction) =>
    action.periodAware
      ? `${action.href}?period=${encodeURIComponent(periodMonth)}`
      : action.href

  return (
    <>
      <Topbar
        title="Absensi HR"
        description="Alur kerja absensi disederhanakan tanpa mengubah route, reporting, approval, finalisasi, atau lock existing."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-[32px] border border-black/5 bg-white/90 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#007aff]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-[28%] h-56 w-56 rounded-full bg-[#af52de]/8 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1fr_340px] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-700">
                <ShieldCheck size={14} />
                HARMONY Attendance Control
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-[#1d1d1f]">
                Empat langkah untuk satu periode absensi
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6e6e73]">
                Route lama tetap aktif. Halaman ini hanya menyederhanakan cara HR bekerja menjadi Input, Review, Finalisasi, lalu Laporan.
                Sinkronisasi dan Audit tetap tersedia sebagai tools pendukung.
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-100/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 p-5 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-blue-500">
                Periode Aktif
              </label>
              <input
                type="month"
                min="2026-01"
                value={periodMonth}
                onChange={(event) => setPeriodMonth(event.target.value)}
                className="harmony-input mt-2"
              />
              <p className="mt-2 text-xs font-semibold leading-5 text-blue-700">
                {range.label}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/5 bg-[#1d1d1f] p-4 text-white shadow-sm sm:p-5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">
            <FlowPill number="01" label="Input" tone="blue" />
            <ArrowRight size={15} className="hidden text-white/25 xl:block" />
            <FlowPill number="02" label="Review" tone="orange" />
            <ArrowRight size={15} className="hidden text-white/25 xl:block" />
            <FlowPill number="03" label="Finalisasi" tone="purple" />
            <ArrowRight size={15} className="hidden text-white/25 xl:block" />
            <FlowPill number="04" label="Laporan" tone="green" />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {attendanceSteps.map((step) => (
            <AttendanceStepCard
              key={step.step}
              step={step}
              primaryHref={withPeriod(step.primary)}
              secondaryHrefs={(step.secondary || []).map((action) => ({
                ...action,
                href: withPeriod(action),
              }))}
            />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-900 p-2.5 text-white">
                <Wrench size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-[#1d1d1f]">Tools & Riwayat</h2>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Digunakan bila HR perlu re-sync manual, troubleshooting, atau melihat aktivitas finalisasi dan lock.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ToolLink
                    href={`/hr/attendance/sync?period=${encodeURIComponent(periodMonth)}`}
                    icon={<RefreshCcw size={16} />}
                    label="Sinkronisasi Manual"
                  />
                  <ToolLink
                    href={`/hr/attendance/audit?period=${encodeURIComponent(periodMonth)}`}
                    icon={<History size={16} />}
                    label="Audit Absensi"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-cyan-50/40 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
                <CalendarDays size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-[#1d1d1f]">Prinsip reporting tetap sama</h2>
                <p className="mt-1 text-sm leading-6 text-[#5f6f66]">
                  Hari kerja terverifikasi tetap dipisahkan menjadi Hadir Kantor, Manual/Lapangan, ST/Tugas Luar, dan Kerja Hari Libur.
                  Konflik cuti/sakit/izin/PHL tetap ditandai sebagai konflik, bukan double count.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </>
  )
}

function AttendanceStepCard({
  step,
  primaryHref,
  secondaryHrefs,
}: {
  step: AttendanceStep
  primaryHref: string
  secondaryHrefs: StepAction[]
}) {
  const tones = {
    blue: {
      shell: 'border-blue-100/80 bg-gradient-to-br from-blue-50/90 via-white to-cyan-50/35',
      icon: 'bg-blue-100 text-blue-700',
      badge: 'bg-blue-100/80 text-blue-700',
      button: 'bg-[#007aff] text-white hover:bg-[#006ee6]',
    },
    orange: {
      shell: 'border-orange-100/90 bg-gradient-to-br from-orange-50/85 via-white to-amber-50/40',
      icon: 'bg-orange-100 text-orange-700',
      badge: 'bg-orange-100/80 text-orange-700',
      button: 'bg-[#b85d00] text-white hover:bg-[#a65300]',
    },
    purple: {
      shell: 'border-purple-100/90 bg-gradient-to-br from-purple-50/85 via-white to-indigo-50/40',
      icon: 'bg-purple-100 text-purple-700',
      badge: 'bg-purple-100/80 text-purple-700',
      button: 'bg-[#7b2cbf] text-white hover:bg-[#6f24ad]',
    },
    green: {
      shell: 'border-emerald-100/90 bg-gradient-to-br from-emerald-50/85 via-white to-teal-50/40',
      icon: 'bg-emerald-100 text-emerald-700',
      badge: 'bg-emerald-100/80 text-emerald-700',
      button: 'bg-[#168034] text-white hover:bg-[#126f2d]',
    },
  }[step.tone]

  return (
    <div className={`flex min-h-[330px] flex-col rounded-[28px] border p-5 shadow-sm ${tones.shell}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones.icon}`}>
          {step.icon}
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.12em] ${tones.badge}`}>
          STEP {step.step}
        </span>
      </div>

      <div className="mt-5 flex-1">
        <h2 className="text-lg font-semibold text-[#1d1d1f]">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{step.description}</p>

        <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-3 text-xs leading-5 text-[#6e6e73]">
          {step.helper}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Link
          href={primaryHref}
          className={`flex min-h-11 items-center justify-between rounded-2xl px-4 text-xs font-bold transition ${tones.button}`}
        >
          {step.primary.label}
          <ArrowUpRight size={15} />
        </Link>

        {secondaryHrefs.map((action) => (
          <Link
            key={`${step.step}-${action.href}`}
            href={action.href}
            className="flex min-h-10 items-center justify-between rounded-2xl border border-black/5 bg-white/75 px-4 text-xs font-bold text-[#1d1d1f] transition hover:bg-white"
          >
            {action.label}
            <ArrowRight size={14} className="text-[#86868b]" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function FlowPill({
  number,
  label,
  tone,
}: {
  number: string
  label: string
  tone: Tone
}) {
  const toneClass = {
    blue: 'bg-blue-400/15 text-blue-200',
    orange: 'bg-orange-400/15 text-orange-200',
    purple: 'bg-purple-400/15 text-purple-200',
    green: 'bg-emerald-400/15 text-emerald-200',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.06] px-3 py-2.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold ${toneClass}`}>
        {number}
      </span>
      <span className="text-xs font-bold text-white/80">{label}</span>
    </div>
  )
}

function ToolLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-xs font-bold text-[#1d1d1f] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowUpRight size={14} className="text-[#86868b]" />
    </Link>
  )
}
