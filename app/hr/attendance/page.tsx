import Link from 'next/link'

import {
  UploadCloud,
  CalendarCheck2,
  FileSpreadsheet,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

const attendanceMenus = [
  {
    title: 'Upload Absensi',
    description:
      'Upload data mesin absensi fingerprint, validasi NIP / machine pin, dan simpan log kehadiran karyawan.',
    href: '/hr/attendance/upload',
    icon: UploadCloud,
    badge: 'Input Data',
  },
  {
    title: 'Data Absensi',
    description:
      'Lihat rekap absensi karyawan per periode cutoff, detail harian, status approval atasan, final HR, dan lock periode.',
    href: '/hr/attendance/data',
    icon: CalendarCheck2,
    badge: 'Monitoring',
  },
  {
    title: 'Sinkron Approved Request',
    description:
      'Sinkronkan pengajuan cuti, izin, sakit, tugas luar, dan klaim PHL yang sudah disetujui ke data absensi.',
    href: '/hr/attendance/sync-requests',
    icon: RefreshCw,
    badge: 'Wajib Sebelum Final',
  },
  {
    title: 'Laporan Final Absensi',
    description:
      'Generate laporan final absensi per periode, termasuk status kehadiran, cuti, izin, sakit, PHL, dan data final HR.',
    href: '/hr/attendance/export',
    icon: FileSpreadsheet,
    badge: 'Export',
  },
  {
    title: 'Audit Absensi',
    description:
      'Pantau riwayat finalisasi, lock, unlock, dan aktivitas penting HR pada periode absensi.',
    href: '/hr/attendance/audit',
    icon: ClipboardList,
    badge: 'Audit Log',
  },
]

export default function HRAttendancePage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-sm">
          <div className="relative px-6 py-7 sm:px-8 sm:py-8">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[4rem] bg-slate-100" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  HARMONY — Human Attendance, Request, Monitoring & Leave System
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Absensi HR
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Kelola seluruh proses absensi mulai dari upload data mesin,
                  monitoring koreksi karyawan, approval atasan, sinkronisasi
                  pengajuan yang sudah disetujui, finalisasi, export laporan,
                  hingga audit perubahan periode.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Periode Absensi
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Cutoff tetap 11 s.d. 10 bulan berikutnya
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attendanceMenus.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex min-h-[220px] flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 transition group-hover:bg-slate-900 group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {item.badge}
                      </span>
                    </div>

                    <div className="mt-5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-950">
                        {item.title}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm font-semibold text-slate-700">
                      Buka halaman
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-900 transition group-hover:bg-slate-900 group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <RefreshCw className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-amber-900">
                Catatan penting sebelum finalisasi absensi
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Sebelum HR melakukan finalisasi atau export laporan final,
                jalankan menu <strong>Sinkron Approved Request</strong> terlebih
                dahulu. Proses ini memastikan pengajuan cuti, izin, sakit,
                tugas luar, dan klaim PHL yang sudah disetujui atasan masuk ke
                dalam <strong>attendance_logs</strong>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}