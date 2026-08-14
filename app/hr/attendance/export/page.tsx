'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as XLSX from 'xlsx'
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  formatDateTimeID,
  getCurrentPeriodMonthWita,
  getCutoffRange,
  getEmployeeLogs,
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
  employee_status?: string | null
  employee_submitted_at?: string | null
  supervisor_status?: string | null
  supervisor_name?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_at?: string | null
  hr_status?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  is_locked?: boolean | null
  locked_at?: string | null
  locked_by_name?: string | null
}

type AttendanceLog = AttendanceReportingLog & {
  hr_final_status?: string | null
  is_locked?: boolean | null
}

type ReportRow = {
  employee: Employee
  confirmation: PeriodConfirmation | null
  summary: ReturnType<typeof summarizeAttendancePeriod>
  logs: AttendanceLog[]
  locked: boolean
}

type ReportFilter =
  | 'all'
  | 'not_submitted'
  | 'submitted'
  | 'approved_supervisor'
  | 'ready_hr'
  | 'finalized'
  | 'locked'
  | 'conflict'
  | 'no_record'

export default function HRAttendanceExportPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [holidays, setHolidays] = useState<AttendanceHoliday[]>([])
  const [confirmations, setConfirmations] = useState<PeriodConfirmation[]>([])

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ReportFilter>('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const confirmationMap = useMemo(() => {
    const map = new Map<string, PeriodConfirmation>()
    confirmations.forEach((item) => {
      if (item.employee_id) map.set(item.employee_id, item)
    })
    return map
  }, [confirmations])

  const rows = useMemo<ReportRow[]>(() => {
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
        logs: employeeLogs,
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

      if (filter === 'not_submitted') return employeeStatus !== 'submitted'
      if (filter === 'submitted') return employeeStatus === 'submitted'
      if (filter === 'approved_supervisor') return supervisorStatus === 'approved'
      if (filter === 'ready_hr') return hrStatus === 'ready_for_hr'
      if (filter === 'finalized') return hrStatus === 'finalized'
      if (filter === 'locked') return row.locked
      if (filter === 'conflict') return row.summary.conflict > 0
      if (filter === 'no_record') return row.summary.noRecord > 0
      return true
    })
  }, [rows, search, filter])

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.employees += 1
        acc.scheduledWorkdays += row.summary.scheduledWorkdays
        acc.officePresent += row.summary.officePresent
        acc.late += row.summary.late
        acc.manualExternal += row.summary.manualExternal
        acc.offdayWork += row.summary.offdayWork
        acc.leave += row.summary.leave
        acc.phlClaim += row.summary.phlClaim
        acc.sick += row.summary.sick
        acc.permit += row.summary.permit
        acc.officialTravel += row.summary.officialTravel
        acc.absent += row.summary.absent
        acc.incomplete += row.summary.incomplete
        acc.pendingRequest += row.summary.pendingRequest
        acc.noRecord += row.summary.noRecord
        acc.conflict += row.summary.conflict
        return acc
      },
      {
        employees: 0,
        scheduledWorkdays: 0,
        officePresent: 0,
        late: 0,
        manualExternal: 0,
        offdayWork: 0,
        leave: 0,
        phlClaim: 0,
        sick: 0,
        permit: 0,
        officialTravel: 0,
        absent: 0,
        incomplete: 0,
        pendingRequest: 0,
        noRecord: 0,
        conflict: 0,
      },
    )
  }, [filteredRows])

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
      const [employeeResult, logResult, holidayResult, confirmationResult] =
        await Promise.all([
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

      setEmployees(
        ((employeeResult.data || []) as Employee[]).filter(
          (employee) => employee.is_active !== false,
        ),
      )
      setLogs((logResult.data || []) as AttendanceLog[])
      setHolidays((holidayResult.data || []) as AttendanceHoliday[])
      setConfirmations((confirmationResult.data || []) as PeriodConfirmation[])
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Laporan absensi gagal mengambil data dari Supabase.',
      )
    } finally {
      setLoading(false)
    }
  }

  function buildExportRows() {
    return filteredRows.map((row, index) => ({
      No: index + 1,
      Periode: range.label,
      NIP: row.employee.employee_number || '',
      'Machine PIN': row.employee.machine_pin || '',
      'Nama Karyawan': row.employee.full_name || '',
      Unit: row.employee.department || '',
      Jabatan: row.employee.position || '',
      'Status Submit': workflowLabel(row.confirmation?.employee_status),
      'Status Atasan': workflowLabel(row.confirmation?.supervisor_status),
      'Status HR': workflowLabel(row.confirmation?.hr_status),
      'Status Lock': row.locked ? 'Locked' : 'Unlocked',
      'Hari Kerja Terjadwal': row.summary.scheduledWorkdays,
      'Hadir Kantor': row.summary.officePresent,
      'Terlambat (subset Hadir Kantor)': row.summary.late,
      'Manual / Luar Kantor': row.summary.manualExternal,
      'Kerja Sabtu-Minggu-Libur': row.summary.offdayWork,
      Cuti: row.summary.leave,
      'Klaim PHL': row.summary.phlClaim,
      Sakit: row.summary.sick,
      Izin: row.summary.permit,
      'Tugas Luar': row.summary.officialTravel,
      Alpa: row.summary.absent,
      Incomplete: row.summary.incomplete,
      'Request Pending': row.summary.pendingRequest,
      'Tanpa Data': row.summary.noRecord,
      'Konflik Data': row.summary.conflict,
      'Submit Employee At': formatDateTimeID(row.confirmation?.employee_submitted_at),
      'Approved Atasan At': formatDateTimeID(row.confirmation?.supervisor_approved_at),
      'Final HR At': formatDateTimeID(row.confirmation?.hr_finalized_at),
    }))
  }

  function handleExportXlsx() {
    setExporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const exportRows = buildExportRows()
      if (!exportRows.length) throw new Error('Tidak ada data sesuai filter untuk diexport.')

      const workbook = XLSX.utils.book_new()
      const recap = XLSX.utils.json_to_sheet(exportRows)

      const daily = filteredRows.flatMap((row) =>
        row.summary.classifiedDays.map((day) => ({
          Periode: range.label,
          NIP: row.employee.employee_number || '',
          'Machine PIN': row.employee.machine_pin || '',
          'Nama Karyawan': row.employee.full_name || '',
          Unit: row.employee.department || '',
          Tanggal: day.date,
          Klasifikasi: day.label,
          'Check In Efektif': day.effectiveCheckIn,
          'Check Out Efektif': day.effectiveCheckOut,
          Weekend: day.isWeekend ? 'YA' : 'TIDAK',
          Libur: day.isHoliday ? day.holidayName || 'YA' : 'TIDAK',
          'Data Mesin': day.hasMachineTime ? 'YA' : 'TIDAK',
          'Data Manual': day.hasManualTime ? 'YA' : 'TIDAK',
          Terlambat: day.isLate ? 'YA' : 'TIDAK',
          'Request Code': day.requestCode,
          'Request Label': day.requestLabel,
          'Request Final': day.requestApproved ? 'YA' : 'TIDAK',
          Catatan: day.note,
        })),
      )

      const dailySheet = XLSX.utils.json_to_sheet(daily)
      XLSX.utils.book_append_sheet(workbook, recap, 'Rekap Karyawan')
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Detail Harian')

      const fileName = `LAPORAN_ABSENSI_FIX_${periodMonth}_${filter}.xlsx`
      XLSX.writeFile(workbook, fileName)
      setSuccessMessage(`Export XLSX berhasil dibuat: ${fileName}`)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Export XLSX gagal.')
    } finally {
      setExporting(false)
    }
  }

  function handleExportCsv() {
    setExporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const rows = buildExportRows()
      if (!rows.length) throw new Error('Tidak ada data sesuai filter untuk diexport.')

      const headers = Object.keys(rows[0])
      const csv = [
        headers.map(csvCell).join(','),
        ...rows.map((row) =>
          headers
            .map((header) => csvCell(row[header as keyof typeof row]))
            .join(','),
        ),
      ].join('\n')

      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `LAPORAN_ABSENSI_FIX_${periodMonth}_${filter}.csv`
      link.click()
      URL.revokeObjectURL(url)
      setSuccessMessage('Export CSV berhasil dibuat.')
    } catch (error: any) {
      setErrorMessage(error?.message || 'Export CSV gagal.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Topbar
        title="Laporan Absensi"
        description="Laporan murni untuk reporting. Semua karyawan aktif tetap tampil walaupun belum submit."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-6">
        {successMessage && (
          <AlertBox tone="success" message={successMessage} />
        )}
        {errorMessage && <AlertBox tone="warning" message={errorMessage} />}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Link
                href="/hr/attendance"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Absensi
              </Link>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
                <FileSpreadsheet size={15} />
                Accurate Attendance Reporting
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Laporan Absensi Aktual
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                Hadir Kantor hanya menghitung hari kerja reguler dengan jam masuk dan pulang lengkap.
                Sabtu/Minggu/libur, cuti, klaim PHL, sakit, izin, tugas luar, manual luar kantor,
                incomplete, dan tanpa data dipisahkan agar laporan tidak double count.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
              <HeroMetric label="Karyawan" value={String(totals.employees)} />
              <HeroMetric label="Hadir Kantor" value={String(totals.officePresent)} />
              <HeroMetric label="Konflik" value={String(totals.conflict)} />
            </div>
          </div>
        </section>

        <section className="harmony-card overflow-hidden">
          <div className="grid gap-4 border-b border-black/5 p-5 xl:grid-cols-[220px_230px_1fr_auto] xl:items-end">
            <label className="block">
              <span className="harmony-label">Periode Cutoff</span>
              <input
                type="month"
                min="2026-01"
                value={periodMonth}
                onChange={(event) => setPeriodMonth(event.target.value)}
                className="harmony-input"
              />
            </label>

            <label className="block">
              <span className="harmony-label">Filter Workflow/Data</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as ReportFilter)}
                className="harmony-select"
              >
                <option value="all">Semua Karyawan</option>
                <option value="not_submitted">Belum Submit</option>
                <option value="submitted">Sudah Submit</option>
                <option value="approved_supervisor">Approved Atasan</option>
                <option value="ready_hr">Ready for HR</option>
                <option value="finalized">Finalized</option>
                <option value="locked">Locked</option>
                <option value="conflict">Ada Konflik Data</option>
                <option value="no_record">Ada Tanpa Data</option>
              </select>
            </label>

            <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4">
              <Search size={16} className="text-[#86868b]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIP, PIN, unit, jabatan..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="harmony-button-secondary disabled:opacity-50"
            >
              <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="border-b border-black/5 p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Hadir Kantor" value={totals.officePresent} tone="green" />
              <MetricCard label="Manual / Luar" value={totals.manualExternal} tone="blue" />
              <MetricCard label="Kerja Hari Libur" value={totals.offdayWork} tone="purple" />
              <MetricCard label="Tanpa Data" value={totals.noRecord} tone="orange" />
              <MetricCard label="Konflik" value={totals.conflict} tone="red" />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-8">
              <SmallMetric label="Cuti" value={totals.leave} />
              <SmallMetric label="Klaim PHL" value={totals.phlClaim} />
              <SmallMetric label="Sakit" value={totals.sick} />
              <SmallMetric label="Izin" value={totals.permit} />
              <SmallMetric label="Tugas Luar" value={totals.officialTravel} />
              <SmallMetric label="Alpa" value={totals.absent} />
              <SmallMetric label="Incomplete" value={totals.incomplete} />
              <SmallMetric label="Request Pending" value={totals.pendingRequest} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-black/5 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="text-sm text-[#6e6e73]">
              Menampilkan <strong className="text-[#1d1d1f]">{filteredRows.length}</strong> karyawan · {range.label}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/hr/attendance/sync?period=${periodMonth}`} className="harmony-button-secondary">
                Sinkron Approved Request
              </Link>
              <Link href={`/hr/attendance/approvals?period=${periodMonth}`} className="harmony-button-secondary">
                HR Review
              </Link>
              <Link href={`/hr/attendance/final-report?period=${periodMonth}`} className="harmony-button-secondary">
                Finalisasi HR
              </Link>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exporting || !filteredRows.length}
                className="harmony-button-secondary disabled:opacity-50"
              >
                <Download size={16} /> CSV
              </button>
              <button
                type="button"
                onClick={handleExportXlsx}
                disabled={exporting || !filteredRows.length}
                className="harmony-button-primary disabled:opacity-50"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                XLSX
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-7 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Menghitung ulang klasifikasi absensi...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1880px] w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
                    <Th>Karyawan</Th>
                    <Th>Workflow</Th>
                    <Th>Hari Kerja</Th>
                    <Th>Hadir Kantor</Th>
                    <Th>Late</Th>
                    <Th>Manual/Luar</Th>
                    <Th>Kerja Libur</Th>
                    <Th>Cuti</Th>
                    <Th>Klaim PHL</Th>
                    <Th>Sakit</Th>
                    <Th>Izin</Th>
                    <Th>Tugas Luar</Th>
                    <Th>Alpa</Th>
                    <Th>Incomplete</Th>
                    <Th>Pending</Th>
                    <Th>Tanpa Data</Th>
                    <Th>Konflik</Th>
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
                      </Td>
                      <Td>
                        <div className="space-y-1">
                          <StatusLine label="Emp" value={workflowLabel(row.confirmation?.employee_status)} />
                          <StatusLine label="Atasan" value={workflowLabel(row.confirmation?.supervisor_status)} />
                          <StatusLine label="HR" value={workflowLabel(row.confirmation?.hr_status)} />
                        </div>
                      </Td>
                      <Count value={row.summary.scheduledWorkdays} />
                      <Count value={row.summary.officePresent} strong />
                      <Count value={row.summary.late} />
                      <Count value={row.summary.manualExternal} />
                      <Count value={row.summary.offdayWork} />
                      <Count value={row.summary.leave} />
                      <Count value={row.summary.phlClaim} />
                      <Count value={row.summary.sick} />
                      <Count value={row.summary.permit} />
                      <Count value={row.summary.officialTravel} />
                      <Count value={row.summary.absent} />
                      <Count value={row.summary.incomplete} />
                      <Count value={row.summary.pendingRequest} />
                      <Count value={row.summary.noRecord} />
                      <Count value={row.summary.conflict} danger={row.summary.conflict > 0} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[26px] border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-700">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong>Definisi Hadir Kantor:</strong> hari Senin–Jumat non-libur dengan pasangan jam masuk dan pulang lengkap serta tidak memiliki request ketidakhadiran final pada tanggal yang sama. Pure manual dipisahkan sebagai Manual/Luar Kantor; kerja Sabtu/Minggu/libur dipisahkan sebagai Kerja Hari Libur.
            </div>
          </div>
        </section>
      </section>
    </>
  )
}

function AlertBox({ tone, message }: { tone: 'success' | 'warning'; message: string }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
      <div className="flex items-start gap-2">
        {tone === 'success' ? <ShieldCheck size={17} className="mt-0.5" /> : <AlertTriangle size={17} className="mt-0.5" />}
        {message}
      </div>
    </div>
  )
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'purple' | 'orange' | 'red' }) {
  const cls = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
  }[tone]
  return (
    <div className={`rounded-2xl p-4 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[#f5f5f7] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#1d1d1f]">{value}</p>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 align-top">{children}</td>
}

function Count({ value, strong = false, danger = false }: { value: number; strong?: boolean; danger?: boolean }) {
  return (
    <td className="px-4 py-4 text-center align-top">
      <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 font-bold ${danger ? 'bg-red-50 text-red-700' : strong ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f7] text-[#1d1d1f]'}`}>
        {value}
      </span>
    </td>
  )
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[11px] text-[#6e6e73]">
      <span className="font-bold text-[#1d1d1f]">{label}:</span> {value}
    </div>
  )
}

function workflowLabel(value: unknown) {
  const key = normalize(value)
  if (!key || key === '-') return 'Belum'
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

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}
