'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  getCurrentPeriodMonthWita,
  getCutoffRange,
  isUuid,
} from '@/lib/attendance-reporting'
import {
  buildAttendanceReportingRows,
  loadAttendanceReportingDataset,
  type AttendanceReportingDataset,
} from '@/lib/attendance-reporting-data'

export default function HRAttendanceDataPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
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
    if (!keyword) return rows

    return rows.filter((row) =>
      [
        row.employee.full_name,
        row.employee.employee_number,
        row.employee.machine_pin,
        row.employee.department,
        row.employee.position,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  }, [rows, search])

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => {
          acc.employees += 1
          acc.recorded += row.summary.recordedWorkAttendance
          acc.verified += row.summary.verifiedWorkAttendance
          acc.office += row.summary.officePresent
          acc.manual += row.summary.manualPresent
          acc.travel += row.summary.officialTravel
          acc.offday += row.summary.offdayWork
          acc.noRecord += row.summary.noRecord
          acc.conflict += row.summary.conflict
          return acc
        },
        {
          employees: 0,
          recorded: 0,
          verified: 0,
          office: 0,
          manual: 0,
          travel: 0,
          offday: 0,
          noRecord: 0,
          conflict: 0,
        },
      ),
    [filteredRows],
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryPeriod = new URLSearchParams(window.location.search).get('period')
      if (queryPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(queryPeriod) && queryPeriod !== periodMonth) {
        setPeriodMonth(queryPeriod)
        return
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    try {
      const loaded = await loadAttendanceReportingDataset(supabase, periodMonth)
      setDataset(loaded)
    } catch (error: any) {
      setDataset(null)
      setErrorMessage(error?.message || 'Data absensi gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar
        title="Data Absensi"
        description="Monitoring seluruh sumber kehadiran tanpa menunggu employee submit."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-6">
        {errorMessage && <AlertBox message={errorMessage} />}

        {dataset?.warnings.map((warning) => (
          <AlertBox key={warning} message={warning} />
        ))}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Link
                href={`/hr/attendance?period=${periodMonth}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/75 hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Absensi
              </Link>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Monitoring Kehadiran Aktual
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                Fingerprint mesin, jam manual, ST/tugas luar, dan approved request dibaca langsung. Status submit hanya workflow;
                tidak menyembunyikan data kehadiran dari HR.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[430px]">
              <label className="rounded-2xl bg-white/10 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-white/45">Periode</span>
                <input
                  type="month"
                  min="2026-01"
                  value={periodMonth}
                  onChange={(event) => setPeriodMonth(event.target.value)}
                  className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none"
                />
              </label>

              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Cutoff</p>
                <p className="mt-1 text-sm font-semibold">{range.label}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Karyawan" value={totals.employees} tone="blue" />
          <MetricCard label="Kehadiran Tercatat" value={totals.recorded} tone="blue" />
          <MetricCard label="Dasar Tunjangan" value={totals.verified} tone="green" />
          <MetricCard label="Tanpa Data" value={totals.noRecord} tone="orange" />
          <MetricCard label="Konflik" value={totals.conflict} tone="red" />
        </section>

        <section className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-black/5 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 sm:w-80">
              <Search size={16} className="text-[#86868b]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIP, PIN, unit..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/hr/attendance/approvals?period=${periodMonth}`} className="harmony-button-secondary">
                HR Review
              </Link>
              <Link href={`/hr/attendance/export?period=${periodMonth}`} className="harmony-button-primary">
                <FileSpreadsheet size={16} />
                Laporan & Tunjangan
              </Link>
              <button type="button" onClick={fetchData} disabled={loading} className="harmony-button-secondary disabled:opacity-50">
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-8 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Menggabungkan sumber absensi...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1680px] w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
                    <Th>Karyawan</Th>
                    <Th>Workflow</Th>
                    <Th>Kehadiran Tercatat</Th>
                    <Th>Dasar Tunjangan</Th>
                    <Th>Hadir Kantor</Th>
                    <Th>Manual/Lapangan</Th>
                    <Th>ST/Tugas Luar</Th>
                    <Th>Kerja Libur</Th>
                    <Th>Cuti</Th>
                    <Th>PHL</Th>
                    <Th>Sakit</Th>
                    <Th>Izin</Th>
                    <Th>Incomplete</Th>
                    <Th>Tanpa Data</Th>
                    <Th>Konflik</Th>
                    <Th>Aksi</Th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.employee.id} className="border-b border-black/5 hover:bg-[#fafafa]">
                      <Td>
                        <div className="font-bold text-[#1d1d1f]">{row.employee.full_name || '-'}</div>
                        <div className="mt-1 text-[11px] text-[#86868b]">
                          {row.employee.employee_number || '-'} · PIN {row.employee.machine_pin || '-'} · {row.employee.department || '-'}
                        </div>
                        {row.synthetic && (
                          <span className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
                            Perlu mapping employee
                          </span>
                        )}
                      </Td>

                      <Td>
                        <WorkflowLines confirmation={row.confirmation} locked={row.locked} />
                      </Td>

                      <Count value={row.summary.recordedWorkAttendance} strong />
                      <Count value={row.summary.verifiedWorkAttendance} strong tone="green" />
                      <Count value={row.summary.officePresent} />
                      <Count value={row.summary.manualPresent} />
                      <Count value={row.summary.officialTravel} />
                      <Count value={row.summary.offdayWork} />
                      <Count value={row.summary.leave} />
                      <Count value={row.summary.phlClaim} />
                      <Count value={row.summary.sick} />
                      <Count value={row.summary.permit} />
                      <Count value={row.summary.incomplete} danger={row.summary.incomplete > 0} />
                      <Count value={row.summary.noRecord} danger={row.summary.noRecord > 0} />
                      <Count value={row.summary.conflict} danger={row.summary.conflict > 0} />

                      <Td>
                        <div className="flex flex-col gap-2">
                          {!row.synthetic && isUuid(row.employee.id) ? (
                            <Link
                              href={`/hr/attendance/approvals/${encodeURIComponent(row.employee.id)}/${encodeURIComponent(periodMonth)}`}
                              className="harmony-button-secondary justify-center text-xs"
                            >
                              Review Detail
                            </Link>
                          ) : (
                            <span className="rounded-2xl bg-red-50 px-3 py-2 text-center text-[11px] font-bold text-red-700">
                              Mapping dulu
                            </span>
                          )}

                          <Link href={`/hr/attendance/export?period=${periodMonth}&q=${encodeURIComponent(row.employee.employee_number || row.employee.full_name || '')}`} className="harmony-button-secondary justify-center text-xs">
                            Lihat Laporan
                          </Link>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[26px] border border-green-100 bg-green-50 p-5 text-sm leading-6 text-green-800">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong>Kehadiran Tercatat</strong> = seluruh hari kerja nyata dari mesin, manual, ST/tugas luar, dan kerja hari libur.
              <strong> Dasar Tunjangan</strong> = kehadiran yang sudah cukup kuat untuk payroll: fingerprint lengkap, approved ST/tugas luar,
              atau manual yang sudah mendapat approval.
            </div>
          </div>
        </section>
      </section>
    </>
  )
}

function WorkflowLines({ confirmation, locked }: { confirmation: any; locked: boolean }) {
  return (
    <div className="space-y-1 text-[11px] text-[#6e6e73]">
      <Line label="Emp" value={workflowLabel(confirmation?.employee_status)} />
      <Line label="Atasan" value={workflowLabel(confirmation?.supervisor_status)} />
      <Line label="HR" value={workflowLabel(confirmation?.hr_status)} />
      <Line label="Lock" value={locked ? 'Locked' : 'Unlocked'} />
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-bold text-[#1d1d1f]">{label}:</span> {value}
    </div>
  )
}

function AlertBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
      <div className="flex items-start gap-2">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        {message}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'green' | 'orange' | 'red'
}) {
  const cls = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  }[tone]

  return (
    <div className={`rounded-[24px] p-5 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 align-top">{children}</td>
}

function Count({
  value,
  strong = false,
  danger = false,
  tone = 'neutral',
}: {
  value: number
  strong?: boolean
  danger?: boolean
  tone?: 'neutral' | 'green'
}) {
  const cls = danger
    ? 'bg-red-50 text-red-700'
    : tone === 'green' || strong
      ? 'bg-green-50 text-green-700'
      : 'bg-[#f5f5f7] text-[#1d1d1f]'

  return (
    <td className="px-4 py-4 text-center align-top">
      <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 font-bold ${cls}`}>
        {value}
      </span>
    </td>
  )
}

function workflowLabel(value: unknown) {
  const key = String(value || '').trim().toLowerCase()
  if (!key) return 'Belum'

  const map: Record<string, string> = {
    submitted: 'Diajukan',
    pending: 'Pending',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    waiting_supervisor: 'Menunggu Atasan',
    waiting_hr: 'Menunggu HR',
    ready_for_hr: 'Ready for HR',
    finalized: 'Finalized',
  }

  return map[key] || String(value || '-')
}
