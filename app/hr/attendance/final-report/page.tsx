'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  Lock,
  RefreshCcw,
  Search,
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

type Confirmation = {
  id: string
  employee_id: string
  period_month: string
  period_start: string
  period_end: string
  employee_status?: string | null
  employee_submitted_at?: string | null
  supervisor_status?: string | null
  supervisor_name?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_at?: string | null
  hr_status?: string | null
  hr_note?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  is_locked?: boolean | null
  locked_at?: string | null
  locked_by?: string | null
  locked_by_name?: string | null
  lock_note?: string | null
}

type Log = AttendanceReportingLog & {
  hr_final_status?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  is_locked?: boolean | null
  locked_at?: string | null
  locked_by?: string | null
  locked_by_name?: string | null
  lock_note?: string | null
  deleted_at?: string | null
}

type FinalRow = {
  employee: Employee
  confirmation: Confirmation | null
  logs: Log[]
  summary: ReturnType<typeof summarizeAttendancePeriod>
  allHRApproved: boolean
  finalized: boolean
  locked: boolean
  eligible: boolean
  reason: string
}

export default function HRAttendanceFinalReportPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [confirmations, setConfirmations] = useState<Confirmation[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [holidays, setHolidays] = useState<AttendanceHoliday[]>([])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const confirmationMap = useMemo(() => {
    const map = new Map<string, Confirmation>()
    confirmations.forEach((item) => {
      if (item.employee_id) map.set(item.employee_id, item)
    })
    return map
  }, [confirmations])

  const rows = useMemo<FinalRow[]>(() => {
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

      const exactEmployeeLogs = employeeLogs.filter(
        (log) => String(log.employee_id || '').trim() === employee.id,
      )

      const allHRApproved =
        exactEmployeeLogs.length > 0 &&
        exactEmployeeLogs.every((log) => normalize(log.hr_approval_status) === 'approved')

      const finalized =
        normalize(confirmation?.hr_status) === 'finalized' ||
        employeeLogs.some((log) => normalize(log.hr_final_status) === 'finalized')

      const locked =
        Boolean(confirmation?.is_locked) ||
        employeeLogs.some((log) => Boolean(log.is_locked))

      const supervisorApproved = normalize(confirmation?.supervisor_status) === 'approved'
      const readyForHR = normalize(confirmation?.hr_status) === 'ready_for_hr'
      const dataClean =
        summary.conflict === 0 &&
        summary.incomplete === 0 &&
        summary.noRecord === 0 &&
        summary.pendingRequest === 0

      const eligible =
        Boolean(confirmation) &&
        exactEmployeeLogs.length > 0 &&
        supervisorApproved &&
        readyForHR &&
        allHRApproved &&
        dataClean &&
        !finalized &&
        !locked

      let reason = 'Siap Finalisasi & Kunci'
      if (!confirmation) reason = 'Belum Submit Periode'
      else if (normalize(confirmation.employee_status) !== 'submitted') reason = 'Belum Submit Employee'
      else if (!supervisorApproved) reason = 'Belum Approved Atasan'
      else if (!readyForHR && !finalized) reason = 'Belum Ready for HR'
      else if (!employeeLogs.length) reason = 'Tidak Ada Log Absensi'
      else if (!exactEmployeeLogs.length) reason = 'Log Belum Terhubung Employee ID'
      else if (!allHRApproved && !finalized) reason = 'HR Review Belum Selesai'
      else if (!dataClean && !finalized) reason = 'Masih Ada Incomplete / Tanpa Data / Pending / Konflik'
      else if (finalized) reason = 'Sudah Finalized'
      else if (locked) reason = 'Sudah Locked'

      return {
        employee,
        confirmation,
        logs: employeeLogs,
        summary,
        allHRApproved,
        finalized,
        locked,
        eligible,
        reason,
      }
    })
  }, [employees, confirmationMap, logs, holidays, range.start, range.end])

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

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.all += 1
        if (!row.confirmation) acc.notSubmitted += 1
        if (normalize(row.confirmation?.supervisor_status) === 'approved') acc.supervisorApproved += 1
        if (row.allHRApproved && normalize(row.confirmation?.hr_status) === 'ready_for_hr') acc.hrReviewed += 1
        if (row.eligible) acc.readyFinalize += 1
        if (row.finalized) acc.finalized += 1
        if (row.locked) acc.locked += 1
        return acc
      },
      {
        all: 0,
        notSubmitted: 0,
        supervisorApproved: 0,
        hrReviewed: 0,
        readyFinalize: 0,
        finalized: 0,
        locked: 0,
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
      const [employeeResult, confirmationResult, logResult, holidayResult] =
        await Promise.all([
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

      setEmployees(
        ((employeeResult.data || []) as Employee[]).filter(
          (employee) => employee.is_active !== false,
        ),
      )
      setConfirmations((confirmationResult.data || []) as Confirmation[])
      setLogs((logResult.data || []) as Log[])
      setHolidays((holidayResult.data || []) as AttendanceHoliday[])
    } catch (error: any) {
      setErrorMessage(error?.message || 'Data finalisasi HR gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  async function getActor() {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new Error('Session HR tidak valid. Silakan login ulang.')

    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id,email,role,is_active,employee_id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (appUserError) throw appUserError

    const role = normalize(appUser?.role)
    if (
      !appUser ||
      appUser.is_active === false ||
      !['hr', 'admin', 'administrator', 'super_admin'].includes(role)
    ) {
      throw new Error('Akses finalisasi hanya untuk HR/Admin aktif.')
    }

    return {
      id: data.user.id,
      name:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email ||
        'HR',
    }
  }

  async function finalizeEmployee(row: FinalRow) {
    setErrorMessage('')
    setSuccessMessage('')

    if (!row.eligible || !row.confirmation) {
      setErrorMessage(`Belum dapat difinalisasi: ${row.reason}.`)
      return
    }

    if (!isUuid(row.employee.id)) {
      setErrorMessage('ID karyawan tidak valid. Finalisasi diblokir demi keamanan.')
      return
    }

    const confirmed = window.confirm(
      `Finalisasi dan kunci absensi ${row.employee.full_name || row.employee.employee_number || 'karyawan'} untuk periode ${range.label}?\n\n` +
        'Setelah finalisasi, data menjadi read-only. Proses ini tidak memfinalisasi karyawan lain.',
    )

    if (!confirmed) return

    setProcessingId(row.employee.id)

    try {
      const actor = await getActor()
      const now = new Date().toISOString()
      const lockNote = 'Periode karyawan dikunci setelah Finalisasi HR.'

      // Re-check server state immediately before writing.
      const { data: currentConfirmation, error: confirmationCheckError } = await supabase
        .from('attendance_period_confirmations')
        .select('*')
        .eq('id', row.confirmation.id)
        .maybeSingle<Confirmation>()

      if (confirmationCheckError) throw confirmationCheckError
      if (!currentConfirmation) throw new Error('Konfirmasi periode sudah tidak ditemukan.')
      if (normalize(currentConfirmation.supervisor_status) !== 'approved') {
        throw new Error('Finalisasi diblokir karena approval atasan belum final.')
      }
      if (normalize(currentConfirmation.hr_status) !== 'ready_for_hr') {
        throw new Error('Finalisasi diblokir karena status bukan Ready for HR.')
      }
      if (currentConfirmation.is_locked) {
        throw new Error('Periode karyawan sudah dikunci.')
      }

      const { data: currentLogs, error: logCheckError } = await supabase
        .from('attendance_logs')
        .select('id,hr_approval_status,hr_final_status,is_locked')
        .eq('employee_id', row.employee.id)
        .is('deleted_at', null)
        .gte('attendance_date', row.confirmation.period_start || range.start)
        .lte('attendance_date', row.confirmation.period_end || range.end)

      if (logCheckError) throw logCheckError

      const pendingHR = (currentLogs || []).filter(
        (log) => normalize(log.hr_approval_status) !== 'approved',
      )

      if (!(currentLogs || []).length) {
        throw new Error('Tidak ada attendance_logs untuk difinalisasi.')
      }

      if (pendingHR.length > 0) {
        throw new Error(
          `${pendingHR.length} log belum HR Approved. Selesaikan HR Review terlebih dahulu.`,
        )
      }

      const { error: headerError } = await supabase
        .from('attendance_period_confirmations')
        .update({
          hr_status: 'finalized',
          hr_finalized_at: now,
          hr_finalized_by: actor.name,
          hr_note: 'Laporan absensi periode telah difinalisasi HR.',
          is_locked: true,
          locked_at: now,
          locked_by: actor.id,
          locked_by_name: actor.name,
          lock_note: lockNote,
          updated_at: now,
        })
        .eq('id', row.confirmation.id)

      if (headerError) throw headerError

      const { data: updatedLogs, error: logError } = await supabase
        .from('attendance_logs')
        .update({
          hr_final_status: 'finalized',
          hr_finalized_at: now,
          hr_finalized_by: actor.name,
          is_locked: true,
          locked_at: now,
          locked_by: actor.id,
          locked_by_name: actor.name,
          lock_note: lockNote,
          updated_at: now,
        })
        .eq('employee_id', row.employee.id)
        .is('deleted_at', null)
        .gte('attendance_date', row.confirmation.period_start || range.start)
        .lte('attendance_date', row.confirmation.period_end || range.end)
        .select('id')

      if (logError) throw logError

      // Audit is best-effort; failure must not roll back finalization already written.
      const { error: auditError } = await supabase.from('attendance_audit_logs').insert({
        action_type: 'hr_finalize_employee_period',
        action_label: 'Finalisasi & Lock HR Per Karyawan',
        actor_id: actor.id,
        actor_name: actor.name,
        actor_role: 'hr',
        period_month: periodMonth,
        period_start: row.confirmation.period_start || range.start,
        period_end: row.confirmation.period_end || range.end,
        total_affected: updatedLogs?.length || 0,
        note: lockNote,
        metadata: {
          employee_id: row.employee.id,
          employee_number: row.employee.employee_number,
          safe_per_employee: true,
        },
        created_at: now,
      })

      if (auditError) {
        console.warn('Attendance finalization audit warning:', auditError.message)
      }

      setSuccessMessage(
        `${row.employee.full_name || 'Karyawan'} berhasil difinalisasi dan dikunci. ${updatedLogs?.length || 0} log menjadi Final HR.`,
      )
      await fetchData()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Finalisasi HR gagal.')
    } finally {
      setProcessingId('')
    }
  }

  return (
    <>
      <Topbar
        title="Finalisasi Absensi HR"
        description="Finalisasi & lock per karyawan. Jalankan Sync agar approved request termaterialisasi sebelum finalisasi; reporting dapat dibuka kapan saja."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 p-4 sm:p-6">
        {successMessage && <Message tone="success">{successMessage}</Message>}
        {errorMessage && <Message tone="warning">{errorMessage}</Message>}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Link
                href={`/hr/attendance?period=${periodMonth}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 hover:bg-white/15"
              >
                <ArrowLeft size={15} /> Kembali ke Absensi
              </Link>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
                <Lock size={15} /> Finalization Only Route
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Finalisasi & Lock Per Karyawan
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                Tidak ada finalisasi massal otomatis. Hanya karyawan yang sudah submit,
                Approved Atasan, selesai HR Review, dan seluruh log HR Approved yang dapat difinalisasi.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
              <HeroMetric label="Ready Final" value={String(stats.readyFinalize)} />
              <HeroMetric label="Finalized" value={String(stats.finalized)} />
              <HeroMetric label="Belum Submit" value={String(stats.notSubmitted)} />
            </div>
          </div>
        </section>

        <section className="harmony-card overflow-hidden">
          <div className="grid gap-4 border-b border-black/5 p-5 xl:grid-cols-[230px_1fr_auto] xl:items-end">
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

            <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4">
              <Search size={16} className="text-[#86868b]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari karyawan..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="harmony-button-secondary disabled:opacity-50"
            >
              <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="grid gap-3 border-b border-black/5 p-5 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Semua Karyawan" value={stats.all} />
            <Stat label="Approved Atasan" value={stats.supervisorApproved} />
            <Stat label="HR Review Selesai" value={stats.hrReviewed} />
            <Stat label="Siap Final" value={stats.readyFinalize} />
            <Stat label="Locked" value={stats.locked} />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-black/5 p-5">
            <Link href={`/hr/attendance/approvals?period=${periodMonth}`} className="harmony-button-secondary">
              <UserCheck size={16} /> HR Review
            </Link>
            <Link href={`/hr/attendance/export?period=${periodMonth}`} className="harmony-button-secondary">
              <Eye size={16} /> Lihat Laporan
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-7 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" /> Memuat status finalisasi...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
                    <Th>Karyawan</Th>
                    <Th>Submit</Th>
                    <Th>Atasan</Th>
                    <Th>HR Review</Th>
                    <Th>Hadir Kantor</Th>
                    <Th>Masalah Data</Th>
                    <Th>Status Final</Th>
                    <Th>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.employee.id} className="border-b border-black/5 hover:bg-[#fafafa]">
                      <Td>
                        <div className="font-bold text-[#1d1d1f]">{row.employee.full_name || '-'}</div>
                        <div className="mt-1 text-[11px] text-[#86868b]">
                          {row.employee.employee_number || '-'} · {row.employee.department || '-'}
                        </div>
                      </Td>
                      <Td><Status value={normalize(row.confirmation?.employee_status) === 'submitted' ? 'Diajukan' : 'Belum Submit'} good={normalize(row.confirmation?.employee_status) === 'submitted'} /></Td>
                      <Td><Status value={workflowLabel(row.confirmation?.supervisor_status)} good={normalize(row.confirmation?.supervisor_status) === 'approved'} /></Td>
                      <Td><Status value={row.allHRApproved ? 'HR Approved' : 'Belum Selesai'} good={row.allHRApproved} /></Td>
                      <Td><strong>{row.summary.officePresent}</strong></Td>
                      <Td>
                        <div className="space-y-1 text-[11px] text-[#6e6e73]">
                          <div>Incomplete: <strong>{row.summary.incomplete}</strong></div>
                          <div>Tanpa Data: <strong>{row.summary.noRecord}</strong></div>
                          <div>Konflik: <strong className={row.summary.conflict ? 'text-red-700' : ''}>{row.summary.conflict}</strong></div>
                        </div>
                      </Td>
                      <Td><Status value={row.reason} good={row.eligible || row.finalized} /></Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          {isUuid(row.employee.id) && (
                            <Link
                              href={`/hr/attendance/approvals/${encodeURIComponent(row.employee.id)}/${encodeURIComponent(periodMonth)}`}
                              className="harmony-button-secondary text-xs"
                            >
                              <Eye size={15} /> Review
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => finalizeEmployee(row)}
                            disabled={!row.eligible || processingId === row.employee.id}
                            className="harmony-button-primary text-xs disabled:cursor-not-allowed disabled:opacity-40"
                            title={row.reason}
                          >
                            {processingId === row.employee.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Lock size={15} />
                            )}
                            Finalisasi & Kunci
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </>
  )
}

function Message({ tone, children }: { tone: 'success' | 'warning'; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
      <div className="flex items-start gap-2">
        {tone === 'success' ? <CheckCircle2 size={17} className="mt-0.5" /> : <AlertTriangle size={17} className="mt-0.5" />}
        {children}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[#f5f5f7] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#1d1d1f]">{value}</p>
    </div>
  )
}

function Status({ value, good }: { value: string; good: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${good ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
      {value}
    </span>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 align-top">{children}</td>
}

function workflowLabel(value: unknown) {
  const key = normalize(value)
  const map: Record<string, string> = {
    pending: 'Pending',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    waiting_supervisor: 'Menunggu Atasan',
    ready_for_hr: 'Ready for HR',
    finalized: 'Finalized',
  }
  return map[key] || String(value || 'Belum')
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase()
}
