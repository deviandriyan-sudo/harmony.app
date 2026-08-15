'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
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
  WalletCards,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import {
  getCurrentPeriodMonthWita,
  getCutoffRange,
} from '@/lib/attendance-reporting'

type Module = {
  step: string
  title: string
  description: string
  href: string
  icon: ReactNode
  tag: string
  periodAware: boolean
  optional?: boolean
}

const modules: Module[] = [
  {
    step: '01',
    title: 'Upload Absensi',
    description:
      'Import fingerprint/CSV/Excel. Safe merge mempertahankan jam manual, bukti, dan koreksi employee.',
    href: '/hr/attendance/upload',
    icon: <Fingerprint size={20} />,
    tag: 'Input Data',
    periodAware: false,
  },
  {
    step: '02',
    title: 'Data Absensi',
    description:
      'Monitoring seluruh karyawan dan seluruh sumber kehadiran, termasuk yang belum submit periode.',
    href: '/hr/attendance/data',
    icon: <CalendarDays size={20} />,
    tag: 'Monitoring',
    periodAware: true,
  },
  {
    step: '03',
    title: 'HR Review',
    description:
      'Lihat data seluruh karyawan. Approval HR tetap hanya aktif setelah approval atasan.',
    href: '/hr/attendance/approvals',
    icon: <ShieldCheck size={20} />,
    tag: 'Review',
    periodAware: true,
  },
  {
    step: '04',
    title: 'Sinkron Approved Request',
    description:
      'Materialisasi cuti/izin/sakit/ST/tugas luar/PHL approved ke attendance_logs untuk workflow finalisasi.',
    href: '/hr/attendance/sync',
    icon: <RefreshCcw size={20} />,
    tag: 'Sync',
    periodAware: true,
    optional: true,
  },
  {
    step: '05',
    title: 'Finalisasi HR',
    description:
      'Finalisasi dan lock hanya untuk employee yang sudah lolos review. Approved request disinkronkan sebelum final.',
    href: '/hr/attendance/final-report',
    icon: <CheckCircle2 size={20} />,
    tag: 'Finalisasi',
    periodAware: true,
  },
  {
    step: 'R',
    title: 'Laporan Kehadiran & Tunjangan',
    description:
      'Rekap mesin, manual, ST/tugas luar, dan kerja hari libur. Laporan membaca sumber asli langsung, tidak menunggu finalisasi.',
    href: '/hr/attendance/export',
    icon: <FileSpreadsheet size={20} />,
    tag: 'Report',
    periodAware: true,
  },
  {
    step: 'A',
    title: 'Audit Absensi',
    description:
      'Riwayat finalisasi, lock/unlock, dan aktivitas penting HR.',
    href: '/hr/attendance/audit',
    icon: <History size={20} />,
    tag: 'Audit Log',
    periodAware: false,
  },
]

export default function HRAttendanceHomePage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const periodHref = (module: Module) =>
    module.periodAware
      ? `${module.href}?period=${encodeURIComponent(periodMonth)}`
      : module.href

  return (
    <>
      <Topbar
        title="Absensi HR"
        description="Satu periode, satu sumber reporting: mesin + manual + ST/tugas luar + approved request."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 overflow-x-hidden p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#007aff]/10 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[#f5f5f7] px-3 py-1.5 text-xs font-bold text-[#6e6e73]">
                <ShieldCheck size={14} />
                HARMONY Attendance Control
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                Semua route memakai periode yang sama
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6e6e73]">
                Monitoring dan laporan tidak lagi bergantung pada employee submit atau menu Sync. Fingerprint mesin,
                absensi manual, ST/tugas luar/luar kota, kerja hari libur, cuti, sakit, izin, dan PHL dibaca dari sumber
                aslinya lalu diklasifikasikan satu kali dengan aturan yang sama.
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
              <label className="text-xs font-bold uppercase tracking-wide text-blue-500">
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

        <section className="rounded-[28px] border border-black/5 bg-[#1d1d1f] p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <FlowPill label="Upload" />
            <ArrowRight size={14} className="text-white/35" />
            <FlowPill label="Monitoring" />
            <ArrowRight size={14} className="text-white/35" />
            <FlowPill label="Supervisor" />
            <ArrowRight size={14} className="text-white/35" />
            <FlowPill label="HR Review" />
            <ArrowRight size={14} className="text-white/35" />
            <FlowPill label="Finalisasi" />
            <ArrowRight size={14} className="text-white/35" />
            <FlowPill label="Payroll Report" accent />
          </div>
          <p className="mt-3 text-xs leading-6 text-white/55">
            <strong className="text-white">Laporan dapat dibuka kapan saja.</strong> Sync hanya untuk materialisasi approved
            request ke attendance_logs/finalisasi; laporan tetap membaca request approved langsung agar ST/tugas luar tidak hilang.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <ModuleCard key={item.href} {...item} href={periodHref(item)} />
          ))}
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-green-200 bg-green-50 p-5 text-sm leading-7 text-green-800">
            <div className="flex items-start gap-3">
              <WalletCards size={19} className="mt-1 shrink-0" />
              <div>
                <p className="font-bold">Dasar laporan tunjangan</p>
                <p className="mt-1">
                  Hari kerja yang benar-benar dilakukan dipisahkan menjadi <strong>Hadir Kantor</strong>,{' '}
                  <strong>Hadir Manual/Lapangan</strong>, <strong>ST/Tugas Luar</strong>, dan{' '}
                  <strong>Kerja Hari Libur</strong>. Total terverifikasi menjadi kandidat dasar jumlah hari tunjangan transport
                  dan makan.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-5 text-sm leading-7 text-orange-800">
            <div className="flex items-start gap-3">
              <ShieldCheck size={19} className="mt-1 shrink-0" />
              <div>
                <p className="font-bold">Kontrol payroll aman</p>
                <p className="mt-1">
                  Pure manual tetap muncul sebagai kehadiran tercatat, tetapi baru masuk <strong>Dasar Tunjangan</strong> setelah
                  approval. Cuti/sakit/izin/PHL yang bertabrakan dengan jam kerja masuk <strong>Konflik Data</strong>, bukan double count.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </>
  )
}

function FlowPill({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1.5 ${accent ? 'bg-green-500 text-white' : 'bg-white/10 text-white/75'}`}>
      {label}
    </span>
  )
}

function ModuleCard({
  step,
  title,
  description,
  href,
  icon,
  tag,
  optional,
}: Module & { href: string }) {
  return (
    <Link
      href={href}
      className="group harmony-card flex min-h-[235px] flex-col justify-between overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]">
              {icon}
            </div>
            <span className="text-xs font-bold text-[#86868b]">{step}</span>
          </div>

          <div className="flex items-center gap-2">
            {optional && (
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">
                Workflow
              </span>
            )}
            <span className="rounded-full border border-black/5 bg-white px-3 py-1 text-[10px] font-bold text-[#6e6e73]">
              {tag}
            </span>
          </div>
        </div>

        <h2 className="mt-5 text-lg font-semibold text-[#1d1d1f]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{description}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4 text-xs font-bold text-[#1d1d1f]">
        Buka halaman
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] transition group-hover:bg-[#1d1d1f] group-hover:text-white">
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  )
}
