'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Fingerprint,
  History,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'

const modules = [
  {
    title: 'Upload Absensi',
    description: 'Import fingerprint/CSV/Excel. Safe merge mempertahankan data manual employee.',
    href: '/hr/attendance/upload',
    icon: <Fingerprint size={20} />,
    tag: 'Input Data',
  },
  {
    title: 'Data Absensi',
    description: 'Monitoring seluruh karyawan aktif, termasuk yang belum submit periode.',
    href: '/hr/attendance/data',
    icon: <CalendarDays size={20} />,
    tag: 'Monitoring',
  },
  {
    title: 'HR Review',
    description: 'Lihat semua karyawan. Approval HR hanya aktif setelah approval atasan.',
    href: '/hr/attendance/approvals',
    icon: <ShieldCheck size={20} />,
    tag: 'Review',
  },
  {
    title: 'Sinkron Approved Request',
    description: 'Sinkron cuti, izin, sakit, tugas luar, dan klaim PHL yang sudah approved.',
    href: '/hr/attendance/sync',
    icon: <RefreshCcw size={20} />,
    tag: 'Sync',
  },
  {
    title: 'Finalisasi HR',
    description: 'Finalisasi dan lock hanya untuk employee yang sudah lolos HR Review.',
    href: '/hr/attendance/final-report',
    icon: <CheckCircle2 size={20} />,
    tag: 'Finalisasi',
  },
  {
    title: 'Laporan Absensi',
    description: 'Rekap semua karyawan dengan hitungan Hadir Kantor yang tidak tercampur weekend/cuti/PHL.',
    href: '/hr/attendance/export',
    icon: <FileSpreadsheet size={20} />,
    tag: 'Report',
  },
  {
    title: 'Audit Absensi',
    description: 'Riwayat finalisasi, lock, unlock, dan aktivitas penting HR.',
    href: '/hr/attendance/audit',
    icon: <History size={20} />,
    tag: 'Audit Log',
  },
] as const

export default function HRAttendanceHomePage() {
  return (
    <>
      <Topbar
        title="Absensi HR"
        description="Alur absensi dipisahkan tegas: input → monitoring → review → sync → finalisasi → laporan."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 overflow-x-hidden p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#007aff]/10 blur-3xl" />

          <div className="relative grid gap-5 xl:grid-cols-[1fr_280px] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[#f5f5f7] px-3 py-1.5 text-xs font-bold text-[#6e6e73]">
                <ShieldCheck size={14} />
                HARMONY Attendance Control
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                Route absensi tanpa proses tumpang tindih
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6e6e73]">
                Data karyawan tetap dapat dimonitor dan dilaporkan walaupun belum submit. Submit/approval hanya menentukan workflow persetujuan, bukan menentukan apakah data fingerprint boleh terlihat di laporan HR.
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5 text-sm text-blue-700">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                Periode Absensi
              </p>
              <p className="mt-2 font-semibold">
                Cutoff tetap tanggal 11 s.d. 10 bulan berikutnya.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <ModuleCard key={item.href} {...item} />
          ))}
        </div>

        <section className="rounded-[28px] border border-green-200 bg-green-50 p-5 text-sm leading-7 text-green-800">
          <div className="flex items-start gap-3">
            <ShieldCheck size={19} className="mt-1 shrink-0" />
            <div>
              <p className="font-bold">Definisi laporan sudah dipisahkan.</p>
              <p className="mt-1">
                <strong>Hadir Kantor</strong> hanya menghitung hari kerja reguler dengan pasangan jam masuk + pulang yang valid. Sabtu/Minggu/libur, klaim PHL, cuti, sakit, izin, tugas luar, manual luar kantor, incomplete, dan konflik data memiliki bucket sendiri.
              </p>
            </div>
          </div>
        </section>
      </section>
    </>
  )
}

function ModuleCard({
  title,
  description,
  href,
  icon,
  tag,
}: {
  title: string
  description: string
  href: string
  icon: ReactNode
  tag: string
}) {
  return (
    <Link
      href={href}
      className="group harmony-card flex min-h-[220px] flex-col justify-between overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]">
            {icon}
          </div>
          <span className="rounded-full border border-black/5 bg-white px-3 py-1 text-[10px] font-bold text-[#6e6e73]">
            {tag}
          </span>
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
