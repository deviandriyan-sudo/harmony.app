'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  getCurrentPeriodMonthWita,
  getCutoffRange,
  getEmployeeLogs,
  isUuid,
  summarizeAttendancePeriod,
  type AttendanceHoliday,
  type AttendanceReportingLog,
} from '@/lib/attendance-reporting'

type Employee = {
  id: string
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
  email?: string | null
  join_date?: string | null
  is_active?: boolean | null
}

type PeriodConfirmation = {
  id?: string | null
  employee_id?: string | null
  period_month?: string | null
  employee_status?: string | null
  employee_submitted_at?: string | null
  supervisor_status?: string | null
  supervisor_name?: string | null
  supervisor_approved_at?: string | null
  hr_status?: string | null
  hr_finalized_at?: string | null
  is_locked?: boolean | null
}

type AttendanceLog = AttendanceReportingLog & {
  is_locked?: boolean | null
}

type Row = {
  employee: Employee
  confirmation: PeriodConfirmation | null
  summary: ReturnType<typeof summarizeAttendancePeriod>
  locked: boolean
}

const MONTHS = [
  ['01', 'Januari'],
  ['02', 'Februari'],
  ['03', 'Maret'],
  ['04', 'April'],
  ['05', 'Mei'],
  ['06', 'Juni'],
  ['07', 'Juli'],
  ['08', 'Agustus'],
  ['09', 'September'],
  ['10', 'Oktober'],
  ['11', 'November'],
  ['12', 'Desember'],
] as const

export default function HRAttendanceDataPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [holidays, setHolidays] = useState<AttendanceHoliday[]>([])
  const [confirmations, setConfirmations] = useState<PeriodConfirmation[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const confirmationMap = useMemo(() => {
    const map = new Map<string, PeriodConfirmation>()
    confirmations.forEach((item) => {
      if (item.employee_id) map.set(item.employee_id, item)
    })
    return map
  }, [confirmations])

  const rows = useMemo<Row[]>(() => {
    return employees.map((employee) => {
      const employeeLogs = getEmployeeLogs(employee, logs)
      const confirmation = confirmationMap.get(employee.id) || null
      const summary = summarizeAttendancePeriod({
        logs: employeeLogs,
        holidays,
        periodStart: range.start,
        periodEnd: range.end,
        employmentStart: employee.join_date,
      })

      return {
        employee,
        confirmation,
        summary,
        locked:
          Boolean(confirmation?.is_locked) ||
          employeeLogs.some((log) => Boolean(log.is_locked)),
      }
    })
  }, [employees, logs, holidays, confirmationMap, range.start, range.end])

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return rows.filter((row) => {
      const text = [
        row.employee.full_name,
        row.employee.employee_number,
        row.employee.machine_pin,
        row.employee.department,
        row.employee.position,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (keyword && !text.includes(keyword)) return false

      const employeeStatus = normalize(row.confirmation?.employee_status)
      const supervisorStatus = normalize(row.confirmation?.supervisor_status)
      const hrStatus = normalize(row.confirmation?.hr_status)

      if (statusFilter === 'all') return true
      if (statusFilter === 'not_submitted') return employeeStatus !== 'submitted'
      if (statusFilter === 'submitted') return employeeStatus === 'submitted'
      if (statusFilter === 'waiting_supervisor') {
        return employeeStatus === 'submitted' && supervisorStatus !== 'approved'
      }
      if (statusFilter === 'ready_hr') {
        return supervisorStatus === 'approved' && hrStatus === 'ready_for_hr'
      }
      if (statusFilter === 'finalized') return hrStatus === 'finalized'
      if (statusFilter === 'conflict') return row.summary.conflict > 0
      if (statusFilter === 'no_record') return row.summary.noRecord > 0
      return true
    })
  }, [rows, search, statusFilter])

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.employees += 1
        if (normalize(row.confirmation?.employee_status) !== 'submitted') acc.notSubmitted += 1
        if (normalize(row.confirmation?.supervisor_status) === 'approved') acc.supervisorApproved += 1
        acc.officePresent += row.summary.officePresent
        acc.noRecord += row.summary.noRecord
        acc.conflict += row.summary.conflict
        return acc
      },
      {
        employees: 0,
        notSubmitted: 0,
        supervisorApproved: 0,
        officePresent: 0,
        noRecord: 0,
        conflict: 0,
      },
    )
  }, [rows])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryPeriod = new URLSearchParams(window.location.search).get('period')
      if (
        queryPeriod &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(queryPeriod) &&
        queryPeriod !== periodMonth
      ) {
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
      const [employeeResult, logResult, holidayResult, confirmationResult] = await Promise.all([
        supabase.from('employees').select('*').order('full_name', { ascending: true }),
        supabase
          .from('attendance_logs')
          .select('*')
          .is('deleted_at', null)
          .gte('attendance_date', range.start)
          .lte('attendance_date', range.end)
          .order('attendance_date', { ascending: true }),
        supabase
          .from('holidays')
          .select('*')
          .eq('is_active', true)
          .gte('holiday_date', range.start)
          .lte('holiday_date', range.end),
        supabase
          .from('attendance_period_confirmations')
          .select('*')
          .eq('period_month', periodMonth),
      ])

      if (employeeResult.error) throw employeeResult.error
      if (logResult.error) throw logResult.error
      if (holidayResult.error) throw holidayResult.error
      if (confirmationResult.error) throw confirmationResult.error

      setEmployees(((employeeResult.data || []) as Employee[]).filter((item) => item.is_active !== false))
      setLogs((logResult.data || []) as AttendanceLog[])
      setHolidays((holidayResult.data || []) as AttendanceHoliday[])
      setConfirmations((confirmationResult.data || []) as PeriodConfirmation[])
    } catch (error: any) {
      setErrorMessage(error?.message || 'Data absensi gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  const [selectedYear, selectedMonth] = periodMonth.split('-')
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 12 }, (_, index) => 2026 + index).filter(
    (year) => year <= Math.max(2037, currentYear + 8),
  )

  return (
    <>
      <Topbar
        title="Data Absensi"
        description="Monitoring seluruh karyawan aktif tanpa bergantung pada status submit periode."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-6">
        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">
                <CalendarDays size={15} />
                Monitoring Raw + Workflow
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">Data Absensi Periode</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
                Semua karyawan aktif ditampilkan. Belum submit tidak membuat fingerprint hilang dari monitoring.
              </p>
              <p className="mt-2 text-xs font-semibold text-white/70">{range.label}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link href={`/hr/attendance/approvals?period=${periodMonth}`} className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold hover:bg-white/15">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={15} /> HR Review</span>
              </Link>
              <Link href={`/hr/attendance/export?period=${periodMonth}`} className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-[#1d1d1f]">
                <span className="inline-flex items-center gap-2"><FileSpreadsheet size={15} /> Laporan</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Stat title="Karyawan Aktif" value={stats.employees} />
          <Stat title="Belum Submit" value={stats.notSubmitted} />
          <Stat title="Approved Atasan" value={stats.supervisorApproved} />
          <Stat title="Hadir Kantor" value={stats.officePresent} />
          <Stat title="Tanpa Data" value={stats.noRecord} />
          <Stat title="Konflik Data" value={stats.conflict} danger={stats.conflict > 0} />
        </div>

        <section className="harmony-card overflow-hidden">
          <div className="grid gap-4 border-b border-black/5 p-5 xl:grid-cols-[1fr_auto] xl:items-end">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="harmony-label">Tahun</span>
                <select
                  value={selectedYear}
                  onChange={(event) => setPeriodMonth(`${event.target.value}-${selectedMonth}`)}
                  className="harmony-select"
                >
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>

              <label>
                <span className="harmony-label">Bulan Periode</span>
                <select
                  value={selectedMonth}
                  onChange={(event) => setPeriodMonth(`${selectedYear}-${event.target.value}`)}
                  className="harmony-select"
                >
                  {MONTHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label>
                <span className="harmony-label">Status Workflow</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="harmony-select">
                  <option value="all">Semua Karyawan</option>
                  <option value="not_submitted">Belum Submit</option>
                  <option value="submitted">Sudah Submit</option>
                  <option value="waiting_supervisor">Menunggu Atasan</option>
                  <option value="ready_hr">Ready for HR</option>
                  <option value="finalized">Finalized</option>
                  <option value="conflict">Ada Konflik Data</option>
                  <option value="no_record">Ada Tanpa Data</option>
                </select>
              </label>

              <label>
                <span className="harmony-label">Cari</span>
                <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4">
                  <Search size={16} className="text-[#86868b]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nama, NIP, PIN, unit..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>
            </div>

            <button type="button" onClick={fetchData} disabled={loading} className="harmony-button-secondary disabled:opacity-50">
              {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCcw size={17} />}
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1700px] w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
                  <Th>Karyawan</Th>
                  <Th>Submit</Th>
                  <Th>Atasan</Th>
                  <Th>HR</Th>
                  <Th>Hadir Kantor</Th>
                  <Th>Manual/Luar</Th>
                  <Th>Kerja Libur</Th>
                  <Th>Cuti</Th>
                  <Th>Klaim PHL</Th>
                  <Th>Sakit</Th>
                  <Th>Izin</Th>
                  <Th>Tugas Luar</Th>
                  <Th>Alpa</Th>
                  <Th>Incomplete</Th>
                  <Th>Tanpa Data</Th>
                  <Th>Konflik</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={17} className="p-8 text-center text-[#6e6e73]">Memuat data...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={17} className="p-8 text-center text-[#6e6e73]">Tidak ada data sesuai filter.</td></tr>
                ) : filteredRows.map((row) => (
                  <tr key={row.employee.id} className="border-b border-black/5 hover:bg-[#f5f5f7]/60">
                    <Td>
                      <p className="font-bold text-[#1d1d1f]">{row.employee.full_name || '-'}</p>
                      <p className="mt-1 text-[11px] text-[#86868b]">
                        {row.employee.employee_number || '-'} · PIN {row.employee.machine_pin || '-'} · {row.employee.department || '-'}
                      </p>
                    </Td>
                    <Td><WorkflowBadge value={submitLabel(row.confirmation)} /></Td>
                    <Td>
                      <WorkflowBadge value={supervisorLabel(row.confirmation)} />
                      <p className="mt-1 text-[10px] text-[#86868b]">{row.confirmation?.supervisor_name || '-'}</p>
                    </Td>
                    <Td><WorkflowBadge value={hrLabel(row.confirmation, row.locked)} /></Td>
                    <Num value={row.summary.officePresent} tone="green" />
                    <Num value={row.summary.manualExternal} />
                    <Num value={row.summary.offdayWork} tone="purple" />
                    <Num value={row.summary.leave} tone="blue" />
                    <Num value={row.summary.phlClaim} tone="purple" />
                    <Num value={row.summary.sick} tone="orange" />
                    <Num value={row.summary.permit} tone="blue" />
                    <Num value={row.summary.officialTravel} tone="blue" />
                    <Num value={row.summary.absent} tone="red" />
                    <Num value={row.summary.incomplete} tone="orange" />
                    <Num value={row.summary.noRecord} tone="red" />
                    <Num value={row.summary.conflict} tone={row.summary.conflict ? 'red' : 'neutral'} />
                    <Td>
                      {isUuid(row.employee.id) ? (
                        <Link
                          href={`/hr/attendance/approvals/${encodeURIComponent(row.employee.id)}/${encodeURIComponent(periodMonth)}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <UserCheck size={14} />
                          Lihat / Review
                        </Link>
                      ) : (
                        <span className="text-red-600">ID employee bukan UUID valid</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-700">
          <strong>Catatan:</strong> nilai <strong>Hadir Kantor</strong> tidak memasukkan Sabtu/Minggu/libur, pure manual di luar kantor, cuti, klaim PHL, sakit, izin, tugas luar, incomplete, dan konflik. Data belum submit tetap ditampilkan karena laporan HR membaca fingerprint/log aktual, bukan hanya header submit.
        </div>
      </section>
    </>
  )
}

function Stat({ title, value, danger = false }: { title: string; value: number; danger?: boolean }) {
  return (
    <div className={`harmony-card p-4 ${danger ? 'border-red-200 bg-red-50' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${danger ? 'text-red-700' : 'text-[#1d1d1f]'}`}>{value}</p>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-bold">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 align-top">{children}</td>
}

function Num({
  value,
  tone = 'neutral',
}: {
  value: number
  tone?: 'neutral' | 'green' | 'blue' | 'purple' | 'orange' | 'red'
}) {
  const cls = {
    neutral: 'bg-[#f5f5f7] text-[#6e6e73]',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  }[tone]

  return (
    <td className="px-4 py-4 align-top">
      <span className={`inline-flex min-w-8 justify-center rounded-xl px-2.5 py-1 font-bold ${cls}`}>{value}</span>
    </td>
  )
}

function WorkflowBadge({ value }: { value: string }) {
  const key = normalize(value)
  const cls =
    key.includes('final') || key.includes('approved') || key.includes('disetujui')
      ? 'bg-green-50 text-green-700'
      : key.includes('belum') || key.includes('menunggu') || key.includes('pending')
        ? 'bg-orange-50 text-orange-700'
        : key.includes('locked')
          ? 'bg-slate-900 text-white'
          : 'bg-[#f5f5f7] text-[#6e6e73]'

  return <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{value}</span>
}

function submitLabel(item: PeriodConfirmation | null) {
  return normalize(item?.employee_status) === 'submitted' ? 'Submitted' : 'Belum Submit'
}

function supervisorLabel(item: PeriodConfirmation | null) {
  const value = normalize(item?.supervisor_status)
  if (value === 'approved') return 'Approved Atasan'
  if (value === 'rejected') return 'Ditolak Atasan'
  if (normalize(item?.employee_status) === 'submitted') return 'Menunggu Atasan'
  return 'Belum Submit'
}

function hrLabel(item: PeriodConfirmation | null, locked: boolean) {
  const value = normalize(item?.hr_status)
  if (value === 'finalized') return locked ? 'Finalized + Locked' : 'Finalized'
  if (value === 'ready_for_hr') return 'Ready for HR'
  if (normalize(item?.supervisor_status) === 'approved') return 'Menunggu HR Review'
  return '-'
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase()
}
