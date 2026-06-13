'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type PeriodConfirmation = {
  id: string
  employee_id: string

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null

  period_month: string
  period_start: string
  period_end: string

  employee_status: string | null
  employee_submitted_at: string | null
  employee_submitted_by: string | null

  supervisor_status: string | null
  supervisor_id: string | null
  supervisor_name: string | null
  supervisor_approved_at: string | null
  supervisor_rejected_at: string | null
  supervisor_note: string | null

  hr_status: string | null
  hr_finalized_at: string | null
  hr_finalized_by: string | null
  hr_note: string | null

  total_work_days: number | null
  total_present_days: number | null
  total_late_days: number | null
  total_incomplete_days: number | null
  total_absent_days: number | null
  total_sick_days: number | null
  total_permit_days: number | null
  total_leave_days: number | null
  total_phl_days: number | null
  total_holiday_work_days: number | null

  annual_leave_matured: boolean | null
  annual_leave_matured_date: string | null
  leave_allowance_eligible: boolean | null

  is_locked: boolean | null
  locked_at: string | null
  locked_by: string | null
  locked_by_name: string | null
  unlocked_at: string | null
  unlocked_by: string | null
  unlocked_by_name: string | null
  lock_note: string | null

  created_at: string | null
  updated_at: string | null
}

type AttendanceLog = {
  id: string
  employee_id: string | null
  attendance_date: string
  check_in: string | null
  check_out: string | null
  manual_check_in: string | null
  manual_check_out: string | null
  status: string | null
  employee_daily_note: string | null
  correction_reason: string | null
  supervisor_approval_status: string | null
  hr_final_status: string | null
  is_phl_candidate: boolean | null
  phl_proof_url: string | null
  absence_proof_url: string | null

  is_locked: boolean | null
  locked_at: string | null
  locked_by: string | null
  locked_by_name: string | null
  unlocked_at: string | null
  unlocked_by: string | null
  unlocked_by_name: string | null
  lock_note: string | null

  deleted_at: string | null
}

export default function HRFinalAttendanceReportPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth())
  const [reports, setReports] = useState<PeriodConfirmation[]>([])
  const [selectedReport, setSelectedReport] = useState<PeriodConfirmation | null>(null)
  const [selectedLogs, setSelectedLogs] = useState<AttendanceLog[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [finalizingId, setFinalizingId] = useState('')
  const [periodLocking, setPeriodLocking] = useState(false)

  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('ready_for_hr')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const periodRange = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const filteredReports = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return reports.filter((item) => {
      const matchStatus =
        statusFilter === 'all' ? true : item.hr_status === statusFilter

      const matchKeyword = !keyword
        ? true
        : item.full_name?.toLowerCase().includes(keyword) ||
          item.employee_number?.toLowerCase().includes(keyword) ||
          item.department?.toLowerCase().includes(keyword) ||
          item.position?.toLowerCase().includes(keyword) ||
          item.supervisor_name?.toLowerCase().includes(keyword)

      return matchStatus && matchKeyword
    })
  }, [reports, searchKeyword, statusFilter])

  const readyCount = reports.filter((item) => item.hr_status === 'ready_for_hr').length
  const finalizedCount = reports.filter((item) => item.hr_status === 'finalized').length
  const rejectedCount = reports.filter((item) => item.hr_status === 'rejected_by_supervisor').length
  const lockedCount = reports.filter((item) => item.is_locked).length
  const openCount = reports.filter((item) => !item.is_locked).length
  const leaveMaturedCount = reports.filter((item) => item.annual_leave_matured).length

  const allReportsLocked =
    reports.length > 0 && reports.every((item) => Boolean(item.is_locked))

  useEffect(() => {
    fetchReports()
  }, [periodMonth])

  async function fetchReports() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    setSelectedReport(null)
    setSelectedLogs([])

    const { data, error } = await supabase
      .from('attendance_period_confirmations')
      .select('*')
      .eq('period_month', periodMonth)
      .order('department', { ascending: true })
      .order('full_name', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setReports([])
      setLoading(false)
      return
    }

    setReports(data || [])
    setLoading(false)
  }

  async function openDetail(report: PeriodConfirmation) {
    setSelectedReport(report)
    setSelectedLogs([])
    setLoadingDetail(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .is('deleted_at', null)
      .eq('employee_id', report.employee_id)
      .gte('attendance_date', report.period_start)
      .lte('attendance_date', report.period_end)
      .order('attendance_date', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setLoadingDetail(false)
      return
    }

    setSelectedLogs(data || [])
    setLoadingDetail(false)
  }

  async function getHRIdentity() {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return {
        name: '',
        error: authError.message,
      }
    }

    return {
      name: authData.user?.email || 'HR Administrator',
      error: '',
    }
  }

  async function finalizeReport(report: PeriodConfirmation) {
    setFinalizingId(report.id)
    setErrorMessage('')
    setSuccessMessage('')

    if (report.hr_status !== 'ready_for_hr') {
      setErrorMessage('Laporan hanya bisa difinalisasi jika status masih Ready for HR.')
      setFinalizingId('')
      return
    }

    const identity = await getHRIdentity()

    if (identity.error) {
      setErrorMessage(identity.error)
      setFinalizingId('')
      return
    }

    const finalizedBy = identity.name
    const now = new Date().toISOString()
    const lockNote = 'Periode karyawan dikunci setelah finalisasi HR.'

    const { error: headerError } = await supabase
      .from('attendance_period_confirmations')
      .update({
        hr_status: 'finalized',
        hr_finalized_at: now,
        hr_finalized_by: finalizedBy,
        hr_note: 'Laporan absensi periode telah difinalisasi HR.',

        is_locked: true,
        locked_at: now,
        locked_by: finalizedBy,
        locked_by_name: finalizedBy,
        unlocked_at: null,
        unlocked_by: null,
        unlocked_by_name: null,
        lock_note: lockNote,

        updated_at: now,
      })
      .eq('id', report.id)

    if (headerError) {
      setErrorMessage(headerError.message)
      setFinalizingId('')
      return
    }

    const { error: logError } = await supabase
      .from('attendance_logs')
      .update({
        hr_final_status: 'finalized',
        hr_finalized_at: now,
        hr_finalized_by: finalizedBy,
        hr_approval_status: 'approved',
        hr_approved_by: finalizedBy,
        hr_approved_at: now,

        is_locked: true,
        locked_at: now,
        locked_by: finalizedBy,
        locked_by_name: finalizedBy,
        unlocked_at: null,
        unlocked_by: null,
        unlocked_by_name: null,
        lock_note: lockNote,

        updated_at: now,
      })
      .eq('employee_id', report.employee_id)
      .gte('attendance_date', report.period_start)
      .lte('attendance_date', report.period_end)

    if (logError) {
      setErrorMessage(logError.message)
      setFinalizingId('')
      return
    }

    setSuccessMessage(
      `Laporan absensi ${report.full_name || '-'} berhasil difinalisasi dan dikunci.`
    )

    setFinalizingId('')
    await fetchReports()
  }

  async function finalizeAndLockFullPeriod() {
    setPeriodLocking(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (reports.length === 0) {
      setErrorMessage('Belum ada data laporan pada periode ini.')
      setPeriodLocking(false)
      return
    }

    const identity = await getHRIdentity()

    if (identity.error) {
      setErrorMessage(identity.error)
      setPeriodLocking(false)
      return
    }

    const finalizedBy = identity.name
    const now = new Date().toISOString()
    const lockNote = 'Seluruh periode dikunci oleh HR.'

    const readyReports = reports.filter((item) => item.hr_status === 'ready_for_hr')
    const readyEmployeeIds = readyReports
      .map((item) => item.employee_id)
      .filter(Boolean)

    if (readyEmployeeIds.length > 0) {
      const { error: readyHeaderError } = await supabase
        .from('attendance_period_confirmations')
        .update({
          hr_status: 'finalized',
          hr_finalized_at: now,
          hr_finalized_by: finalizedBy,
          hr_note: 'Laporan absensi periode telah difinalisasi HR.',
          updated_at: now,
        })
        .eq('period_month', periodMonth)
        .in('employee_id', readyEmployeeIds)

      if (readyHeaderError) {
        setErrorMessage(readyHeaderError.message)
        setPeriodLocking(false)
        return
      }

      const { error: readyLogError } = await supabase
        .from('attendance_logs')
        .update({
          hr_final_status: 'finalized',
          hr_finalized_at: now,
          hr_finalized_by: finalizedBy,
          hr_approval_status: 'approved',
          hr_approved_by: finalizedBy,
          hr_approved_at: now,
          updated_at: now,
        })
        .in('employee_id', readyEmployeeIds)
        .gte('attendance_date', periodRange.start)
        .lte('attendance_date', periodRange.end)

      if (readyLogError) {
        setErrorMessage(readyLogError.message)
        setPeriodLocking(false)
        return
      }
    }

    const { error: lockHeaderError } = await supabase
      .from('attendance_period_confirmations')
      .update({
        is_locked: true,
        locked_at: now,
        locked_by: finalizedBy,
        locked_by_name: finalizedBy,
        unlocked_at: null,
        unlocked_by: null,
        unlocked_by_name: null,
        lock_note: lockNote,
        updated_at: now,
      })
      .eq('period_month', periodMonth)

    if (lockHeaderError) {
      setErrorMessage(lockHeaderError.message)
      setPeriodLocking(false)
      return
    }

    const { error: lockLogError } = await supabase
      .from('attendance_logs')
      .update({
        is_locked: true,
        locked_at: now,
        locked_by: finalizedBy,
        locked_by_name: finalizedBy,
        unlocked_at: null,
        unlocked_by: null,
        unlocked_by_name: null,
        lock_note: lockNote,
        updated_at: now,
      })
      .is('deleted_at', null)
      .gte('attendance_date', periodRange.start)
      .lte('attendance_date', periodRange.end)

    if (lockLogError) {
      setErrorMessage(lockLogError.message)
      setPeriodLocking(false)
      return
    }

    setSuccessMessage(
      `Periode ${getPeriodApprovalLabel(periodMonth)} berhasil dikunci penuh. ${readyReports.length} laporan Ready for HR otomatis difinalisasi, dan seluruh data periode ini menjadi read-only.`
    )

    setPeriodLocking(false)
    await fetchReports()
  }

  function exportCsv() {
    const rows = filteredReports.map((item) => ({
      periode: getPeriodApprovalLabel(item.period_month),
      periode_mulai: item.period_start,
      periode_selesai: item.period_end,

      id_karyawan: item.employee_number || '',
      machine_pin: item.machine_pin || '',
      nama_karyawan: item.full_name || '',
      departemen: item.department || '',
      jabatan: item.position || '',

      hari_kerja: item.total_work_days || 0,
      jumlah_hari_masuk: item.total_present_days || 0,
      jumlah_terlambat: item.total_late_days || 0,
      jumlah_incomplete: item.total_incomplete_days || 0,
      jumlah_phl: item.total_phl_days || 0,
      jumlah_kerja_hari_libur: item.total_holiday_work_days || 0,

      jumlah_sakit: item.total_sick_days || 0,
      jumlah_izin: item.total_permit_days || 0,
      jumlah_cuti: item.total_leave_days || 0,
      jumlah_alpa: item.total_absent_days || 0,

      status_employee: item.employee_status || '',
      status_atasan: item.supervisor_status || '',
      nama_atasan: item.supervisor_name || '',
      tanggal_approval_atasan: item.supervisor_approved_at || item.supervisor_rejected_at || '',
      status_hr: item.hr_status || '',
      is_locked: item.is_locked ? 'YA' : 'TIDAK',
      locked_by: item.locked_by_name || item.locked_by || '',
      locked_at: item.locked_at || '',
      lock_note: item.lock_note || '',
      finalized_by: item.hr_finalized_by || '',
      finalized_at: item.hr_finalized_at || '',

      matang_cuti: item.annual_leave_matured ? 'YA' : 'TIDAK',
      tanggal_matang_cuti: item.annual_leave_matured_date || '',
      eligible_tunjangan_cuti: item.leave_allowance_eligible ? 'YA' : 'TIDAK',
    }))

    const headers = Object.keys(
      rows[0] || {
        periode: '',
        periode_mulai: '',
        periode_selesai: '',
        id_karyawan: '',
        machine_pin: '',
        nama_karyawan: '',
        departemen: '',
        jabatan: '',
        hari_kerja: '',
        jumlah_hari_masuk: '',
        jumlah_terlambat: '',
        jumlah_incomplete: '',
        jumlah_phl: '',
        jumlah_kerja_hari_libur: '',
        jumlah_sakit: '',
        jumlah_izin: '',
        jumlah_cuti: '',
        jumlah_alpa: '',
        status_employee: '',
        status_atasan: '',
        nama_atasan: '',
        tanggal_approval_atasan: '',
        status_hr: '',
        is_locked: '',
        locked_by: '',
        locked_at: '',
        lock_note: '',
        finalized_by: '',
        finalized_at: '',
        matang_cuti: '',
        tanggal_matang_cuti: '',
        eligible_tunjangan_cuti: '',
      }
    )

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] ?? '')
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `laporan-final-absensi-${periodMonth}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Topbar
        title="Laporan Final Absensi"
        description="Rekap absensi final setelah employee submit dan atasan melakukan approval."
      />

      <section className="space-y-6 p-4 md:p-6">
        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle2 size={18} />
              Berhasil
            </div>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] md:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <FileSpreadsheet size={15} className="text-[#5ac8fa]" />
                HR Final Attendance Report
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Rekap Final Absensi HR
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Laporan ini berisi total kehadiran, PHL, sakit, izin, cuti, alpa,
                serta kontrol lock untuk menutup seluruh periode absensi.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[720px] xl:grid-cols-6">
              <HeroMetric label="Ready" value={String(readyCount)} tone="blue" />
              <HeroMetric label="Final" value={String(finalizedCount)} tone="green" />
              <HeroMetric label="Locked" value={String(lockedCount)} tone="green" />
              <HeroMetric label="Open" value={String(openCount)} tone="blue" />
              <HeroMetric label="Rejected" value={String(rejectedCount)} tone="red" />
              <HeroMetric label="Matang Cuti" value={String(leaveMaturedCount)} tone="purple" />
            </div>
          </div>
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 md:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Data Laporan Periode
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                Pilih periode, finalisasi laporan Ready for HR, lalu lock seluruh periode agar semua employee menjadi read-only.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <input
                type="month"
                value={periodMonth}
                onChange={(event) => setPeriodMonth(event.target.value)}
                className="harmony-input md:w-[180px]"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="harmony-select md:w-[210px]"
              >
                <option value="ready_for_hr">Ready for HR</option>
                <option value="finalized">Finalized</option>
                <option value="rejected_by_supervisor">Rejected by Supervisor</option>
                <option value="all">Semua Status</option>
              </select>

              <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm md:w-[300px]">
                <Search size={18} className="shrink-0 text-[#86868b]" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Cari nama, NIP, unit..."
                  className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                />
              </div>

              <button
                type="button"
                onClick={fetchReports}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>

              <button
                type="button"
                onClick={exportCsv}
                disabled={filteredReports.length === 0}
                className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={18} />
                Export CSV
              </button>

              <button
                type="button"
                onClick={finalizeAndLockFullPeriod}
                disabled={reports.length === 0 || periodLocking || allReportsLocked}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                title="Finalisasi Ready for HR dan Lock Semua Karyawan pada Periode Ini"
              >
                <Lock size={18} />
                {periodLocking
                  ? 'Memproses...'
                  : allReportsLocked
                    ? 'Periode Locked'
                    : 'Lock 1 Periode'}
              </button>
            </div>
          </div>

          {!allReportsLocked && reports.length > 0 && (
            <div className="border-b border-black/5 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800 md:px-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p>
                  Tombol <strong>Lock 1 Periode</strong> akan mengunci semua karyawan pada periode ini.
                  Laporan dengan status <strong>Ready for HR</strong> akan otomatis difinalisasi.
                  Data yang masih status lain tetap dikunci, tetapi status HR-nya tidak dipaksa menjadi finalized.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Memuat laporan final absensi...
            </div>
          )}

          {!loading && filteredReports.length === 0 && (
            <div className="p-6">
              <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
                  <FileSpreadsheet size={24} />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
                  Belum ada laporan
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
                  Data akan muncul setelah employee submit absensi periode dan atasan menyetujui periode tersebut.
                </p>
              </div>
            </div>
          )}

          {!loading && filteredReports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1780px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7]/90 uppercase tracking-wide text-[#6e6e73]">
                    <th className="px-4 py-3 font-semibold">Karyawan</th>
                    <th className="px-4 py-3 font-semibold">Periode</th>
                    <th className="px-4 py-3 text-center font-semibold">Hadir</th>
                    <th className="px-4 py-3 text-center font-semibold">Late</th>
                    <th className="px-4 py-3 text-center font-semibold">Incomplete</th>
                    <th className="px-4 py-3 text-center font-semibold">PHL</th>
                    <th className="px-4 py-3 text-center font-semibold">Sakit</th>
                    <th className="px-4 py-3 text-center font-semibold">Izin</th>
                    <th className="px-4 py-3 text-center font-semibold">Cuti</th>
                    <th className="px-4 py-3 text-center font-semibold">Alpa</th>
                    <th className="px-4 py-3 font-semibold">Atasan</th>
                    <th className="px-4 py-3 font-semibold">HR Status</th>
                    <th className="px-4 py-3 font-semibold">Lock</th>
                    <th className="px-4 py-3 font-semibold">Matang Cuti</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-black/5 bg-white transition hover:bg-[#f5f5f7]/70"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#1d1d1f]">
                          {item.full_name || '-'}
                        </p>
                        <p className="mt-1 text-[11px] text-[#6e6e73]">
                          {item.employee_number || '-'} · {item.department || '-'} · {item.position || '-'}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#1d1d1f]">
                          {getPeriodApprovalLabel(item.period_month)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#6e6e73]">
                          {formatDisplayDate(item.period_start)} - {formatDisplayDate(item.period_end)}
                        </p>
                      </td>

                      <NumberCell value={item.total_present_days || 0} tone="green" />
                      <NumberCell value={item.total_late_days || 0} tone="orange" />
                      <NumberCell value={item.total_incomplete_days || 0} tone="red" />
                      <NumberCell value={item.total_phl_days || 0} tone="purple" />
                      <NumberCell value={item.total_sick_days || 0} tone="purple" />
                      <NumberCell value={item.total_permit_days || 0} tone="blue" />
                      <NumberCell value={item.total_leave_days || 0} tone="blue" />
                      <NumberCell value={item.total_absent_days || 0} tone="red" />

                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#1d1d1f]">
                          {item.supervisor_name || '-'}
                        </p>
                        <p className="mt-1 text-[11px] text-[#6e6e73]">
                          {formatDateTime(item.supervisor_approved_at || item.supervisor_rejected_at)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={item.hr_status || '-'} />
                      </td>

                      <td className="px-4 py-3">
                        <LockBadge report={item} />
                      </td>

                      <td className="px-4 py-3">
                        {item.annual_leave_matured ? (
                          <div className="rounded-2xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                            Ya
                            <p className="mt-1 text-[11px] font-semibold">
                              {formatDisplayDate(item.annual_leave_matured_date || '')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-[#86868b]">
                            Tidak
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#0059b8] transition hover:bg-blue-100"
                            title="Detail"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => finalizeReport(item)}
                            disabled={item.hr_status !== 'ready_for_hr' || finalizingId === item.id}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Finalisasi HR Karyawan Ini"
                          >
                            <ShieldCheck size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedReport && (
          <DetailModal
            report={selectedReport}
            logs={selectedLogs}
            loading={loadingDetail}
            onClose={() => {
              setSelectedReport(null)
              setSelectedLogs([])
            }}
          />
        )}
      </section>
    </>
  )
}

function DetailModal({
  report,
  logs,
  loading,
  onClose,
}: {
  report: PeriodConfirmation
  logs: AttendanceLog[]
  loading: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              Detail Laporan Final
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {report.full_name || '-'} · {getPeriodApprovalLabel(report.period_month)}
            </p>

            <div className="mt-3">
              <LockBadge report={report} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f] transition hover:bg-[#e8e8ed]"
          >
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="p-6 text-sm text-[#6e6e73]">
            Memuat detail harian...
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#f5f5f7]/90 uppercase tracking-wide text-[#6e6e73]">
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">In</th>
                  <th className="px-4 py-3 font-semibold">Out</th>
                  <th className="px-4 py-3 font-semibold">Manual In</th>
                  <th className="px-4 py-3 font-semibold">Manual Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Approval Atasan</th>
                  <th className="px-4 py-3 font-semibold">Final HR</th>
                  <th className="px-4 py-3 font-semibold">Lock</th>
                  <th className="px-4 py-3 font-semibold">PHL</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-sm text-[#6e6e73]"
                    >
                      Belum ada detail absensi harian pada periode ini.
                    </td>
                  </tr>
                )}

                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-black/5">
                    <td className="px-4 py-3 font-semibold text-[#1d1d1f]">
                      {formatDisplayDate(log.attendance_date)}
                    </td>
                    <td className="px-4 py-3">{log.check_in || '-'}</td>
                    <td className="px-4 py-3">{log.check_out || '-'}</td>
                    <td className="px-4 py-3">{log.manual_check_in || '-'}</td>
                    <td className="px-4 py-3">{log.manual_check_out || '-'}</td>
                    <td className="px-4 py-3">{formatReadableText(log.status || '-')}</td>
                    <td className="px-4 py-3">{formatReadableText(log.supervisor_approval_status || '-')}</td>
                    <td className="px-4 py-3">{formatReadableText(log.hr_final_status || '-')}</td>
                    <td className="px-4 py-3">
                      {log.is_locked ? (
                        <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-bold text-[#6e6e73]">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.is_phl_candidate ? 'Ya' : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {log.employee_daily_note || log.correction_reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end border-t border-black/5 p-6">
          <button
            type="button"
            onClick={onClose}
            className="harmony-button-secondary"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

function HeroMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'red' | 'purple'
}) {
  const className = {
    blue: 'bg-white/10 text-[#9fd4ff]',
    green: 'bg-white/10 text-[#a7f5ba]',
    red: 'bg-white/10 text-red-200',
    purple: 'bg-white/10 text-[#e9b9ff]',
  }[tone]

  return (
    <div className={`rounded-[24px] border border-white/10 p-4 backdrop-blur-xl ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function NumberCell({
  value,
  tone,
}: {
  value: number
  tone: 'green' | 'orange' | 'red' | 'purple' | 'blue'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
  }[tone]

  return (
    <td className="px-4 py-3 text-center">
      <span className={`inline-flex min-w-8 justify-center rounded-xl px-2.5 py-1 text-xs font-bold ${className}`}>
        {value}
      </span>
    </td>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'finalized'
      ? 'bg-green-50 text-green-700'
      : status === 'ready_for_hr'
        ? 'bg-[#e8f2ff] text-[#0059b8]'
        : status === 'rejected_by_supervisor'
          ? 'bg-red-50 text-red-700'
          : status === 'waiting_supervisor'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-[#f5f5f7] text-[#6e6e73]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatHRStatus(status)}
    </span>
  )
}

function LockBadge({
  report,
}: {
  report: PeriodConfirmation
}) {
  if (report.is_locked) {
    return (
      <div className="inline-flex max-w-[280px] flex-col rounded-2xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
        <span>Locked</span>
        <span className="mt-1 text-[11px] font-semibold text-white/60">
          {formatDateTime(report.locked_at)} · {report.locked_by_name || report.locked_by || '-'}
        </span>
      </div>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#6e6e73]">
      Open
    </span>
  )
}

function formatHRStatus(status: string) {
  if (status === 'ready_for_hr') return 'Ready for HR'
  if (status === 'finalized') return 'Finalized'
  if (status === 'rejected_by_supervisor') return 'Rejected by Supervisor'
  if (status === 'waiting_supervisor') return 'Waiting Supervisor'

  return status || '-'
}

function getCurrentPeriodMonth() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getCutoffRange(periodMonth: string) {
  const [yearText, monthText] = periodMonth.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  const start = new Date(year, month - 1, 11)
  const end = new Date(year, month, 10)

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  }
}

function getPeriodApprovalLabel(periodMonth: string) {
  const range = getCutoffRange(periodMonth)
  const start = new Date(`${range.start}T00:00:00`)
  const end = new Date(`${range.end}T00:00:00`)

  const monthNumber = String(start.getMonth() + 1).padStart(2, '0')
  const startDay = String(start.getDate()).padStart(2, '0')
  const endDay = String(end.getDate()).padStart(2, '0')
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const endYear = String(end.getFullYear()).slice(-2)

  return `${monthNumber}) PY-P-${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`
}

function formatDateToISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatReadableText(value: string) {
  if (!value || value === '-') return '-'

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
