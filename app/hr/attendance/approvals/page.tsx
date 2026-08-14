'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Eye,
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
  join_date?: string | null
  is_active?: boolean | null
}

type Confirmation = {
  id?: string | null
  employee_id?: string | null
  employee_status?: string | null
  employee_submitted_at?: string | null
  supervisor_status?: string | null
  supervisor_name?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_at?: string | null
  hr_status?: string | null
  is_locked?: boolean | null
}

type Log = AttendanceReportingLog & {
  hr_final_status?: string | null
  is_locked?: boolean | null
}

type QueueRow = {
  employee: Employee
  confirmation: Confirmation | null
  logs: Log[]
  summary: ReturnType<typeof summarizeAttendancePeriod>
  process: 'not_submitted' | 'waiting_supervisor' | 'ready_hr' | 'hr_reviewed' | 'finalized'
}

export default function HRAttendanceReviewQueuePage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [confirmations, setConfirmations] = useState<Confirmation[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [holidays, setHolidays] = useState<AttendanceHoliday[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const confirmationMap = useMemo(() => {
    const map = new Map<string, Confirmation>()
    confirmations.forEach((item) => {
      if (item.employee_id) map.set(item.employee_id, item)
    })
    return map
  }, [confirmations])

  const rows = useMemo<QueueRow[]>(() => {
    return employees.map((employee) => {
      const confirmation = confirmationMap.get(employee.id) || null
      const employeeLogs = getEmployeeLogs(employee, logs)
      const summary = summarizeAttendancePeriod({
        logs: employeeLogs,
        holidays,
        periodStart: range.start,
        periodEnd: range.end,
        employmentStart: employee.join_date,
      })

      const employeeStatus = normalize(confirmation?.employee_status)
      const supervisorStatus = normalize(confirmation?.supervisor_status)
      const hrStatus = normalize(confirmation?.hr_status)
      const allHRApproved =
        employeeLogs.length > 0 &&
        employeeLogs.every((log) => normalize(log.hr_approval_status) === 'approved')

      let process: QueueRow['process'] = 'not_submitted'
      if (hrStatus === 'finalized') process = 'finalized'
      else if (allHRApproved && hrStatus === 'ready_for_hr') process = 'hr_reviewed'
      else if (supervisorStatus === 'approved' || hrStatus === 'ready_for_hr') process = 'ready_hr'
      else if (employeeStatus === 'submitted') process = 'waiting_supervisor'

      return { employee, confirmation, logs: employeeLogs, summary, process }
    })
  }, [employees, confirmationMap, logs, holidays, range.start, range.end])

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter !== 'all' && row.process !== filter) return false
      if (!keyword) return true
      return [
        row.employee.full_name,
        row.employee.employee_number,
        row.employee.machine_pin,
        row.employee.department,
        row.employee.position,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
  }, [rows, search, filter])

  const stats = useMemo(() => {
    const result = {
      all: rows.length,
      notSubmitted: 0,
      waitingSupervisor: 0,
      readyHR: 0,
      reviewed: 0,
      finalized: 0,
    }
    rows.forEach((row) => {
      if (row.process === 'not_submitted') result.notSubmitted += 1
      if (row.process === 'waiting_supervisor') result.waitingSupervisor += 1
      if (row.process === 'ready_hr') result.readyHR += 1
      if (row.process === 'hr_reviewed') result.reviewed += 1
      if (row.process === 'finalized') result.finalized += 1
    })
    return result
  }, [rows])

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
      const [employeeResult, confirmationResult, logResult, holidayResult] = await Promise.all([
        supabase.from('employees').select('*').order('full_name', { ascending: true }),
        supabase.from('attendance_period_confirmations').select('*').eq('period_month', periodMonth),
        supabase
          .from('attendance_logs')
          .select('*')
          .is('deleted_at', null)
          .gte('attendance_date', range.start)
          .lte('attendance_date', range.end),
        supabase
          .from('holidays')
          .select('*')
          .eq('is_active', true)
          .gte('holiday_date', range.start)
          .lte('holiday_date', range.end),
      ])

      if (employeeResult.error) throw employeeResult.error
      if (confirmationResult.error) throw confirmationResult.error
      if (logResult.error) throw logResult.error
      if (holidayResult.error) throw holidayResult.error

      setEmployees(((employeeResult.data || []) as Employee[]).filter((item) => item.is_active !== false))
      setConfirmations((confirmationResult.data || []) as Confirmation[])
      setLogs((logResult.data || []) as Log[])
      setHolidays((holidayResult.data || []) as AttendanceHoliday[])
    } catch (error: any) {
      setErrorMessage(error?.message || 'Queue HR Review gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar
        title="HR Review Absensi"
        description="Semua karyawan tetap terlihat. Tombol approval hanya aktif ketika workflow sudah memenuhi syarat."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 p-4 sm:p-6">
        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <span className="inline-flex items-start gap-2"><AlertTriangle size={17} className="mt-0.5" />{errorMessage}</span>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">
                <ShieldCheck size={15} /> Safe HR Review Queue
              </div>
              <h1 className="mt-4 text-3xl font-semibold">Review Absensi Karyawan</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
                Belum submit, menunggu atasan, Ready for HR, sudah direview, dan finalized semuanya ada di satu queue. Tidak ada URL placeholder UUID.
              </p>
              <p className="mt-2 text-xs font-semibold text-white/70">{range.label}</p>
            </div>
            <Link href="/hr/attendance/data" className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-[#1d1d1f]">
              Kembali ke Data Absensi
            </Link>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Semua" value={stats.all} />
          <Metric label="Belum Submit" value={stats.notSubmitted} />
          <Metric label="Menunggu Atasan" value={stats.waitingSupervisor} />
          <Metric label="Ready HR" value={stats.readyHR} />
          <Metric label="HR Reviewed" value={stats.reviewed} />
          <Metric label="Finalized" value={stats.finalized} />
        </div>

        <section className="harmony-card overflow-hidden">
          <div className="grid gap-3 border-b border-black/5 p-5 md:grid-cols-[180px_220px_1fr_auto] md:items-end">
            <label>
              <span className="harmony-label">Periode</span>
              <input type="month" min="2026-01" value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} className="harmony-input" />
            </label>
            <label>
              <span className="harmony-label">Filter</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="harmony-select">
                <option value="all">Semua Status</option>
                <option value="not_submitted">Belum Submit</option>
                <option value="waiting_supervisor">Menunggu Atasan</option>
                <option value="ready_hr">Ready for HR</option>
                <option value="hr_reviewed">HR Reviewed</option>
                <option value="finalized">Finalized</option>
              </select>
            </label>
            <label>
              <span className="harmony-label">Cari</span>
              <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4">
                <Search size={16} className="text-[#86868b]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Nama, NIP, PIN, unit..." />
              </div>
            </label>
            <button type="button" onClick={fetchData} disabled={loading} className="harmony-button-secondary disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1350px] w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
                  <Th>Karyawan</Th>
                  <Th>Proses</Th>
                  <Th>Log</Th>
                  <Th>Hadir Kantor</Th>
                  <Th>Kerja Libur</Th>
                  <Th>Keterangan Approved</Th>
                  <Th>Incomplete</Th>
                  <Th>Tanpa Data</Th>
                  <Th>Konflik</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-[#6e6e73]">Memuat queue...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-[#6e6e73]">Tidak ada data sesuai filter.</td></tr>
                ) : filteredRows.map((row) => {
                  const approvedAbsence = row.summary.leave + row.summary.phlClaim + row.summary.sick + row.summary.permit + row.summary.officialTravel
                  return (
                    <tr key={row.employee.id} className="border-b border-black/5 hover:bg-[#f5f5f7]/60">
                      <Td>
                        <p className="font-bold text-[#1d1d1f]">{row.employee.full_name || '-'}</p>
                        <p className="mt-1 text-[11px] text-[#86868b]">{row.employee.employee_number || '-'} · PIN {row.employee.machine_pin || '-'} · {row.employee.department || '-'}</p>
                      </Td>
                      <Td><ProcessBadge process={row.process} /></Td>
                      <Num value={row.logs.length} />
                      <Num value={row.summary.officePresent} tone="green" />
                      <Num value={row.summary.offdayWork} tone="purple" />
                      <Num value={approvedAbsence} tone="blue" />
                      <Num value={row.summary.incomplete} tone="orange" />
                      <Num value={row.summary.noRecord} tone="red" />
                      <Num value={row.summary.conflict} tone={row.summary.conflict ? 'red' : 'neutral'} />
                      <Td>
                        {isUuid(row.employee.id) ? (
                          <Link
                            href={`/hr/attendance/approvals/${encodeURIComponent(row.employee.id)}/${encodeURIComponent(periodMonth)}`}
                            className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 font-bold text-blue-700 hover:bg-blue-100"
                          >
                            {row.process === 'ready_hr' ? <UserCheck size={14} /> : <Eye size={14} />}
                            {row.process === 'ready_hr' ? 'HR Review' : 'Lihat Data'}
                          </Link>
                        ) : (
                          <span className="text-red-600">ID bukan UUID valid</span>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-700">
          <strong>Flow aman:</strong> karyawan yang belum submit tetap bisa dibuka untuk melihat fingerprint/raw data. Namun tombol <strong>Approve HR</strong> pada detail tetap terkunci sampai periodenya sudah <strong>Approved Atasan / Ready for HR</strong>.
        </div>
      </section>
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="harmony-card p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">{label}</p><p className="mt-2 text-2xl font-bold text-[#1d1d1f]">{value}</p></div>
}

function ProcessBadge({ process }: { process: QueueRow['process'] }) {
  const config = {
    not_submitted: ['Belum Submit', 'bg-orange-50 text-orange-700'],
    waiting_supervisor: ['Menunggu Atasan', 'bg-orange-50 text-orange-700'],
    ready_hr: ['Ready for HR', 'bg-blue-50 text-blue-700'],
    hr_reviewed: ['HR Reviewed', 'bg-green-50 text-green-700'],
    finalized: ['Finalized', 'bg-slate-900 text-white'],
  }[process]
  return <span className={`inline-flex rounded-full px-3 py-1 font-bold ${config[1]}`}>{config[0]}</span>
}

function Th({ children }: { children: ReactNode }) { return <th className="px-4 py-3 font-bold">{children}</th> }
function Td({ children }: { children: ReactNode }) { return <td className="px-4 py-4 align-top">{children}</td> }
function Num({ value, tone = 'neutral' }: { value: number; tone?: 'neutral' | 'green' | 'blue' | 'purple' | 'orange' | 'red' }) {
  const cls = {
    neutral: 'bg-[#f5f5f7] text-[#6e6e73]',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  }[tone]
  return <td className="px-4 py-4 align-top"><span className={`inline-flex min-w-8 justify-center rounded-xl px-2.5 py-1 font-bold ${cls}`}>{value}</span></td>
}

function normalize(value: unknown) { return String(value || '').trim().toLowerCase() }
