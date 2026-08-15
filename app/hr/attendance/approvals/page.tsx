'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  getCutoffRange,
  isUuid,
} from '@/lib/attendance-reporting'
import { useAttendancePeriodQuery } from '@/lib/use-attendance-period'
import {
  buildAttendanceReportingRows,
  loadAttendanceReportingDataset,
  type AttendanceReportingDataset,
} from '@/lib/attendance-reporting-data'

export default function HRAttendanceApprovalQueuePage() {
  const { periodMonth, setPeriodMonth, periodReady } = useAttendancePeriodQuery()
  const [dataset, setDataset] = useState<AttendanceReportingDataset | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])
  const rows = useMemo(
    () => (dataset ? buildAttendanceReportingRows(dataset, periodMonth) : []),
    [dataset, periodMonth],
  )

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (!keyword) return true
      return [
        row.employee.full_name,
        row.employee.employee_number,
        row.employee.machine_pin,
        row.employee.department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
  }, [rows, search])

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const supervisor = normalize(row.confirmation?.supervisor_status)
        const hr = normalize(row.confirmation?.hr_status)
        const employee = normalize(row.confirmation?.employee_status)

        if (employee !== 'submitted') acc.notSubmitted += 1
        if (supervisor === 'pending') acc.pendingSupervisor += 1
        if (supervisor === 'approved' || hr === 'ready_for_hr') acc.readyHr += 1
        if (hr === 'finalized') acc.finalized += 1
        return acc
      },
      { notSubmitted: 0, pendingSupervisor: 0, readyHr: 0, finalized: 0 },
    )
  }, [rows])

  useEffect(() => {
    if (!periodReady) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth, periodReady])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')
    try {
      setDataset(await loadAttendanceReportingDataset(supabase, periodMonth))
    } catch (error: any) {
      setDataset(null)
      setErrorMessage(error?.message || 'Queue HR Review gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar
        title="HR Review Absensi"
        description="Semua karyawan tetap terlihat; hak Approve HR tetap mengikuti workflow approval atasan."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-6">
        {errorMessage && <AlertBox message={errorMessage} />}
        {dataset?.warnings.map((warning) => <AlertBox key={warning} message={warning} />)}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Link
                href={`/hr/attendance?period=${periodMonth}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/75"
              >
                <ArrowLeft size={15} /> Kembali
              </Link>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">
                <ShieldCheck size={15} /> Safe HR Review
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight">Queue HR Review</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
                HR boleh membuka raw fingerprint, manual attendance, ST/tugas luar, dan keterangan seluruh employee.
                Tombol Approve HR pada detail baru aktif setelah supervisor menyetujui periode.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 xl:min-w-[330px]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Periode</p>
              <input
                type="month"
                min="2026-01"
                value={periodMonth}
                onChange={(event) => setPeriodMonth(event.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none"
              />
              <p className="mt-1 text-xs text-white/55">{range.label}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Belum Submit" value={stats.notSubmitted} tone="orange" />
          <Metric label="Menunggu Atasan" value={stats.pendingSupervisor} tone="orange" />
          <Metric label="Siap HR" value={stats.readyHr} tone="blue" />
          <Metric label="Finalized" value={stats.finalized} tone="green" />
        </section>

        <section className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-black/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 sm:w-80">
              <Search size={16} className="text-[#86868b]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari karyawan..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex gap-2">
              <Link href={`/hr/attendance/data?period=${periodMonth}`} className="harmony-button-secondary">
                Data Absensi
              </Link>
              <button type="button" onClick={fetchData} disabled={loading} className="harmony-button-secondary disabled:opacity-50">
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-8 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" /> Memuat queue...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1450px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
                    <Th>Karyawan</Th>
                    <Th>Submit</Th>
                    <Th>Atasan</Th>
                    <Th>HR</Th>
                    <Th>Kehadiran Tercatat</Th>
                    <Th>Dasar Tunjangan</Th>
                    <Th>Manual Pending</Th>
                    <Th>Tanpa Data</Th>
                    <Th>Konflik</Th>
                    <Th>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const ready =
                      normalize(row.confirmation?.supervisor_status) === 'approved' ||
                      normalize(row.confirmation?.hr_status) === 'ready_for_hr'

                    return (
                      <tr key={row.employee.id} className="border-b border-black/5 hover:bg-[#fafafa]">
                        <Td>
                          <div className="font-bold text-[#1d1d1f]">{row.employee.full_name || '-'}</div>
                          <div className="mt-1 text-[11px] text-[#86868b]">
                            {row.employee.employee_number || '-'} · PIN {row.employee.machine_pin || '-'} · {row.employee.department || '-'}
                          </div>
                          {row.synthetic && (
                            <span className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
                              Perlu mapping
                            </span>
                          )}
                        </Td>
                        <Td><Status value={workflowLabel(row.confirmation?.employee_status)} /></Td>
                        <Td><Status value={workflowLabel(row.confirmation?.supervisor_status)} positive={ready} /></Td>
                        <Td><Status value={workflowLabel(row.confirmation?.hr_status)} positive={normalize(row.confirmation?.hr_status) === 'finalized'} /></Td>
                        <Count value={row.summary.recordedWorkAttendance} />
                        <Count value={row.summary.verifiedWorkAttendance} strong />
                        <Count value={row.summary.manualPendingVerification} danger={row.summary.manualPendingVerification > 0} />
                        <Count value={row.summary.noRecord} danger={row.summary.noRecord > 0} />
                        <Count value={row.summary.conflict} danger={row.summary.conflict > 0} />
                        <Td>
                          {!row.synthetic && isUuid(row.employee.id) ? (
                            <Link
                              href={`/hr/attendance/approvals/${encodeURIComponent(row.employee.id)}/${encodeURIComponent(periodMonth)}`}
                              className={ready ? 'harmony-button-primary justify-center text-xs' : 'harmony-button-secondary justify-center text-xs'}
                            >
                              {ready ? <CheckCircle2 size={15} /> : <ShieldCheck size={15} />}
                              {ready ? 'Review & Approve' : 'Lihat Detail'}
                            </Link>
                          ) : (
                            <span className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">Mapping dulu</span>
                          )}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </>
  )
}

function AlertBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
      <div className="flex items-start gap-2"><AlertTriangle size={17} className="mt-0.5" />{message}</div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'orange' | 'blue' | 'green' }) {
  const cls = { orange: 'bg-orange-50 text-orange-700', blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700' }[tone]
  return <div className={`rounded-[22px] p-5 ${cls}`}><p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
}

function Th({ children }: { children: ReactNode }) { return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th> }
function Td({ children }: { children: ReactNode }) { return <td className="px-4 py-4 align-top">{children}</td> }

function Count({ value, strong = false, danger = false }: { value: number; strong?: boolean; danger?: boolean }) {
  return <td className="px-4 py-4 text-center"><span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 font-bold ${danger ? 'bg-red-50 text-red-700' : strong ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f7] text-[#1d1d1f]'}`}>{value}</span></td>
}

function Status({ value, positive = false }: { value: string; positive?: boolean }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${positive ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f7] text-[#6e6e73]'}`}>{value}</span>
}

function normalize(value: unknown) { return String(value || '').trim().toLowerCase() }

function workflowLabel(value: unknown) {
  const key = normalize(value)
  if (!key) return 'Belum'
  const map: Record<string, string> = {
    submitted: 'Diajukan', pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak',
    waiting_supervisor: 'Menunggu Atasan', waiting_hr: 'Menunggu HR', ready_for_hr: 'Ready for HR', finalized: 'Finalized',
  }
  return map[key] || String(value || '-')
}
