'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type FinalFilter = 'final_hr' | 'approved' | 'not_final' | 'all'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

type Employee = {
  id: string
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  department?: string | null
  unit?: string | null
  work_unit?: string | null
  position?: string | null
  position_name?: string | null
  job_position?: string | null
  email?: string | null
  is_active?: boolean | null

  start_date?: string | null
  join_date?: string | null
  hire_date?: string | null
  tanggal_masuk?: string | null
  employment_start_date?: string | null
}

type AttendanceLog = {
  id: string
  employee_id?: string | null
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null

  attendance_date?: string | null

  check_in?: string | null
  check_out?: string | null
  manual_check_in?: string | null
  manual_check_out?: string | null

  status?: string | null
  attendance_status?: string | null
  source?: string | null
  notes?: string | null

  is_phl_candidate?: boolean | null
  employee_confirmation_status?: string | null
  supervisor_approval_status?: string | null
  hr_final_status?: string | null

  absence_request_type?: string | null
  absence_request_label?: string | null
  absence_request_status?: string | null
  absence_request_source?: string | null

  job_pending?: string | null
  handover_to?: string | null
  handover_note?: string | null

  proof_file_url?: string | null
  proof_url?: string | null
  attachment_url?: string | null

  deleted_at?: string | null
}

type LeaveRequest = {
  id: string
  employee_id?: string | null
  leave_type?: string | null
  request_type?: string | null
  start_date?: string | null
  end_date?: string | null
  total_days?: number | null
  status?: string | null
  supervisor_status?: string | null
  hr_status?: string | null
}

type PeriodConfirmation = {
  id: string
  employee_id: string

  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null

  period_month: string
  period_start?: string | null
  period_end?: string | null

  employee_status?: string | null
  employee_submitted_at?: string | null
  submitted_at?: string | null
  employee_submitted_by?: string | null

  supervisor_status?: string | null
  supervisor_id?: string | null
  supervisor_name?: string | null
  supervisor_approved_by_name?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_at?: string | null
  supervisor_note?: string | null

  hr_status?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  hr_finalized_by_name?: string | null
  hr_note?: string | null
  final_note?: string | null

  is_locked?: boolean | null
  locked_by?: string | null
  locked_by_name?: string | null
  locked_at?: string | null
  unlocked_by?: string | null
  unlocked_by_name?: string | null
  unlocked_at?: string | null
  lock_note?: string | null

  created_at?: string | null
  updated_at?: string | null
}

type ExportRow = {
  periode: string
  employee_number: string
  machine_pin: string
  full_name: string
  department: string
  position: string

  employee_submit_status: string
  employee_submitted_at: string
  supervisor_approval_status: string
  supervisor_name: string
  supervisor_approved_at: string

  hr_status: string
  hr_finalized_by: string
  hr_finalized_at: string

  lock_status: string
  locked_by: string
  locked_at: string
  unlocked_by: string
  unlocked_at: string
  lock_note: string

  final_report_status: string

  total_present_days: number
  total_late_days: number
  total_incomplete_days: number
  total_phl_days: number
  total_phl_claim_days: number
  total_leave_days: number
  total_permit_days: number
  total_sick_days: number
  total_official_travel_days: number
  total_absent_days: number
  total_absence_days: number

  annual_leave_matured_date: string
  annual_leave_matured_in_period: string
  estimated_remaining_annual_leave: number

  daily_detail: string
  request_detail: string
  job_pending_detail: string
  handover_detail: string
  proof_detail: string
  notes: string
}

type ConfirmAction =
  | {
      type: 'finalize'
      title: string
      description: string
      buttonLabel: string
      buttonTone: 'green'
    }
  | {
      type: 'lock'
      title: string
      description: string
      buttonLabel: string
      buttonTone: 'black'
    }
  | {
      type: 'unlock'
      title: string
      description: string
      buttonLabel: string
      buttonTone: 'orange'
    }

const annualLeaveQuota = 12

export default function HRAttendanceExportPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [periodConfirmations, setPeriodConfirmations] = useState<
    PeriodConfirmation[]
  >([])

  const [periodMonth, setPeriodMonth] = useState(getDefaultPeriodMonth())
  const [finalFilter, setFinalFilter] = useState<FinalFilter>('final_hr')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionNote, setActionNote] = useState('')

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const periodRange = useMemo(() => {
    return getCutoffRange(periodMonth)
  }, [periodMonth])

  const periodLabel = useMemo(() => {
    return getPeriodLabel(periodRange.start, periodRange.end)
  }, [periodRange])

  const approvedConfirmations = periodConfirmations.filter((item) => {
    return normalizeText(item.supervisor_status) === 'approved'
  })

  const finalizedConfirmations = approvedConfirmations.filter((item) => {
    return normalizeText(item.hr_status) === 'finalized'
  })

  const lockedConfirmations = approvedConfirmations.filter((item) => {
    return item.is_locked === true
  })

  const unlockedConfirmations = approvedConfirmations.filter((item) => {
    return item.is_locked !== true
  })

  const hasApprovedData = approvedConfirmations.length > 0
  const hasFinalizedData = finalizedConfirmations.length > 0

  const allApprovedLocked =
    approvedConfirmations.length > 0 &&
    lockedConfirmations.length === approvedConfirmations.length

  const allApprovedUnlocked =
    approvedConfirmations.length > 0 &&
    unlockedConfirmations.length === approvedConfirmations.length

  const exportRows = useMemo(() => {
    return buildExportRows({
      employees,
      attendanceLogs,
      leaveRequests,
      periodConfirmations,
      periodStart: periodRange.start,
      periodEnd: periodRange.end,
      periodLabel,
    })
  }, [
    employees,
    attendanceLogs,
    leaveRequests,
    periodConfirmations,
    periodRange,
    periodLabel,
  ])

  const filteredRowsByFinal = useMemo(() => {
    if (finalFilter === 'all') return exportRows

    if (finalFilter === 'final_hr') {
      return exportRows.filter((item) => item.hr_status === 'Final HR')
    }

    if (finalFilter === 'approved') {
      return exportRows.filter((item) => {
        return item.supervisor_approval_status === 'Disetujui'
      })
    }

    return exportRows.filter((item) => {
      return item.final_report_status !== 'Final HR'
    })
  }, [exportRows, finalFilter])

  const filteredRows = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return filteredRowsByFinal

    return filteredRowsByFinal.filter((item) => {
      return (
        item.employee_number.toLowerCase().includes(keyword) ||
        item.machine_pin.toLowerCase().includes(keyword) ||
        item.full_name.toLowerCase().includes(keyword) ||
        item.department.toLowerCase().includes(keyword) ||
        item.position.toLowerCase().includes(keyword) ||
        item.employee_submit_status.toLowerCase().includes(keyword) ||
        item.supervisor_approval_status.toLowerCase().includes(keyword) ||
        item.supervisor_name.toLowerCase().includes(keyword) ||
        item.hr_status.toLowerCase().includes(keyword) ||
        item.lock_status.toLowerCase().includes(keyword) ||
        item.daily_detail.toLowerCase().includes(keyword) ||
        item.request_detail.toLowerCase().includes(keyword)
      )
    })
  }, [filteredRowsByFinal, searchKeyword])

  const summary = useMemo(() => {
    return exportRows.reduce(
      (acc, item) => {
        acc.totalEmployees += 1

        if (item.supervisor_approval_status === 'Disetujui') {
          acc.totalApprovedSupervisor += 1
        }

        if (item.hr_status === 'Final HR') {
          acc.totalFinalHR += 1
        }

        if (item.lock_status === 'Locked') {
          acc.totalLocked += 1
        }

        if (item.final_report_status !== 'Final HR') {
          acc.totalNotFinal += 1
        }

        if (item.annual_leave_matured_in_period === 'Ya') {
          acc.totalMaturedLeaveEmployees += 1
        }

        return acc
      },
      {
        totalEmployees: 0,
        totalApprovedSupervisor: 0,
        totalFinalHR: 0,
        totalLocked: 0,
        totalNotFinal: 0,
        totalMaturedLeaveEmployees: 0,
      }
    )
  }, [exportRows])

  const filteredSummary = useMemo(() => {
    return filteredRows.reduce(
      (acc, item) => {
        acc.totalEmployees += 1
        acc.totalPresentDays += item.total_present_days
        acc.totalPHLDays += item.total_phl_days
        acc.totalPHLClaimDays += item.total_phl_claim_days
        acc.totalLeaveDays += item.total_leave_days
        acc.totalSickDays += item.total_sick_days
        acc.totalPermitDays += item.total_permit_days
        acc.totalOfficialTravelDays += item.total_official_travel_days
        acc.totalAbsentDays += item.total_absent_days

        if (item.annual_leave_matured_in_period === 'Ya') {
          acc.totalMaturedLeaveEmployees += 1
        }

        return acc
      },
      {
        totalEmployees: 0,
        totalPresentDays: 0,
        totalPHLDays: 0,
        totalPHLClaimDays: 0,
        totalLeaveDays: 0,
        totalSickDays: 0,
        totalPermitDays: 0,
        totalOfficialTravelDays: 0,
        totalAbsentDays: 0,
        totalMaturedLeaveEmployees: 0,
      }
    )
  }, [filteredRows])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data: authData } = await supabase.auth.getUser()

    if (authData.user) {
      const { data: appUserData } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle<AppUser>()

      setAppUser(
        appUserData || {
          id: authData.user.id,
          email: authData.user.email || 'HR Administrator',
          role: 'hr',
          employee_id: null,
          is_active: true,
        }
      )
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (employeeError) {
      setEmployees([])
      setErrorMessage(employeeError.message)
      setLoading(false)
      return
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('attendance_date', periodRange.start)
      .lte('attendance_date', periodRange.end)
      .is('deleted_at', null)
      .order('attendance_date', { ascending: true })

    if (attendanceError) {
      setAttendanceLogs([])
      setErrorMessage(attendanceError.message)
      setLoading(false)
      return
    }

    const { data: leaveData } = await supabase
      .from('leave_requests')
      .select('*')
      .lte('start_date', periodRange.end)
      .gte('end_date', periodRange.start)

    const { data: confirmationData } = await supabase
      .from('attendance_period_confirmations')
      .select('*')
      .eq('period_month', periodMonth)
      .order('full_name', { ascending: true })

    setEmployees((employeeData || []) as Employee[])
    setAttendanceLogs((attendanceData || []) as AttendanceLog[])
    setLeaveRequests((leaveData || []) as LeaveRequest[])
    setPeriodConfirmations((confirmationData || []) as PeriodConfirmation[])
    setLoading(false)
  }

  function getActor() {
    return {
      id: appUser?.id || null,
      name: appUser?.email || 'HR Administrator',
    }
  }

  async function runConfirmAction() {
    if (!confirmAction) return

    setProcessingAction(true)
    setErrorMessage('')
    setSuccessMessage('')

    const actor = getActor()
    const note =
      actionNote.trim() || getDefaultActionNote(confirmAction.type, periodLabel)

    const functionName =
      confirmAction.type === 'finalize'
        ? 'hr_finalize_attendance_period'
        : confirmAction.type === 'lock'
          ? 'hr_lock_attendance_period'
          : 'hr_unlock_attendance_period'

    const params = {
      p_period_month: periodMonth,
      p_actor_id: actor.id,
      p_actor_name: actor.name,
      p_note: note,
    }

    const { data, error } = await supabase.rpc(functionName, params)

    if (error) {
      setErrorMessage(error.message)
      setProcessingAction(false)
      return
    }

    const resultMessage =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: string }).message)
        : String(data || 'Aksi berhasil dijalankan.')

    setSuccessMessage(resultMessage)
    setConfirmAction(null)
    setActionNote('')
    setProcessingAction(false)
    await fetchData()
  }

  async function handleSyncBeforeExport() {
    setExporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase.rpc(
      'sync_approved_leave_requests_to_attendance',
      {
        p_period_month: periodMonth,
      }
    )

    if (error) {
      setErrorMessage(error.message)
      setExporting(false)
      return false
    }

    await fetchData()
    setExporting(false)
    return true
  }

  function buildSheetRows(rows: ExportRow[]) {
    return rows.map((item, index) => ({
      No: index + 1,
      Periode: item.periode,
      NIP: item.employee_number,
      'Machine PIN': item.machine_pin,
      'Nama Karyawan': item.full_name,
      Unit: item.department,
      Jabatan: item.position,

      'Status Submit Employee': item.employee_submit_status,
      'Tanggal Submit Employee': item.employee_submitted_at,
      'Status Approval Atasan': item.supervisor_approval_status,
      'Nama Atasan': item.supervisor_name,
      'Tanggal Approve Atasan': item.supervisor_approved_at,

      'Status HR': item.hr_status,
      'Finalized By': item.hr_finalized_by,
      'Finalized At': item.hr_finalized_at,

      'Status Lock': item.lock_status,
      'Locked By': item.locked_by,
      'Locked At': item.locked_at,
      'Unlocked By': item.unlocked_by,
      'Unlocked At': item.unlocked_at,
      'Catatan Lock': item.lock_note,

      'Status Laporan Final': item.final_report_status,

      'Jumlah Hari Masuk': item.total_present_days,
      Terlambat: item.total_late_days,
      'Tidak Lengkap': item.total_incomplete_days,
      PHL: item.total_phl_days,
      'Klaim PHL': item.total_phl_claim_days,
      Cuti: item.total_leave_days,
      Izin: item.total_permit_days,
      Sakit: item.total_sick_days,
      'Tugas Luar / Dinas': item.total_official_travel_days,
      'Alpa / Tidak Hadir': item.total_absent_days,
      'Total Ketidakhadiran': item.total_absence_days,

      'Tanggal Matang Cuti': item.annual_leave_matured_date,
      'Matang Cuti Pada Periode': item.annual_leave_matured_in_period,
      'Estimasi Sisa Cuti Tahunan': item.estimated_remaining_annual_leave,

      'Detail Harian': item.daily_detail,
      'Detail Request Approved': item.request_detail,
      'Pekerjaan Pending': item.job_pending_detail,
      Handover: item.handover_detail,
      'Link Bukti': item.proof_detail,

      Catatan: item.notes,
    }))
  }

  async function handleExportXLSX() {
    setExporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const synced = await handleSyncBeforeExport()

    if (!synced) {
      setExporting(false)
      return
    }

    if (filteredRows.length === 0) {
      setErrorMessage('Tidak ada data yang bisa diexport sesuai filter saat ini.')
      setExporting(false)
      return
    }

    const workbook = XLSX.utils.book_new()
    const recapSheetData = buildSheetRows(filteredRows)

    const detailSheetData = buildDailyDetailSheetRows({
      rows: filteredRows,
      employees,
      attendanceLogs,
      periodConfirmations,
      periodLabel,
    })

    const maturedLeaveSheetData = filteredRows
      .filter((item) => item.annual_leave_matured_in_period === 'Ya')
      .map((item, index) => ({
        No: index + 1,
        Periode: item.periode,
        NIP: item.employee_number,
        'Machine PIN': item.machine_pin,
        'Nama Karyawan': item.full_name,
        Unit: item.department,
        Jabatan: item.position,
        'Status HR': item.hr_status,
        'Status Lock': item.lock_status,
        'Tanggal Matang Cuti': item.annual_leave_matured_date,
        'Estimasi Sisa Cuti Tahunan': item.estimated_remaining_annual_leave,
      }))

    const recapSheet = XLSX.utils.json_to_sheet(recapSheetData)
    const detailSheet = XLSX.utils.json_to_sheet(detailSheetData)
    const maturedLeaveSheet = XLSX.utils.json_to_sheet(maturedLeaveSheetData)

    recapSheet['!cols'] = buildColumnWidths(recapSheetData)
    detailSheet['!cols'] = buildColumnWidths(detailSheetData)
    maturedLeaveSheet['!cols'] = buildColumnWidths(maturedLeaveSheetData)

    XLSX.utils.book_append_sheet(workbook, recapSheet, 'Rekap Absensi')
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Harian')
    XLSX.utils.book_append_sheet(workbook, maturedLeaveSheet, 'Matang Cuti')

    const fileName = `EXPORT_Laporan_Final_Absensi_${safeFileName(
      periodLabel
    )}_${getFilterLabelForFile(finalFilter)}.xlsx`

    XLSX.writeFile(workbook, fileName)

    setSuccessMessage(`Export XLSX berhasil dibuat: ${fileName}`)
    setExporting(false)
  }

  async function handleExportCSV() {
    setExporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const synced = await handleSyncBeforeExport()

    if (!synced) {
      setExporting(false)
      return
    }

    if (filteredRows.length === 0) {
      setErrorMessage('Tidak ada data yang bisa diexport sesuai filter saat ini.')
      setExporting(false)
      return
    }

    const sheetRows = buildSheetRows(filteredRows)
    const headers = Object.keys(sheetRows[0])
    const rows = sheetRows.map((item) => {
      return headers.map((header) => {
        return item[header as keyof typeof item]
      })
    })

    const csv = convertToCSV([headers, ...rows])
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const fileName = `EXPORT_Laporan_Final_Absensi_${safeFileName(
      periodLabel
    )}_${getFilterLabelForFile(finalFilter)}.csv`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    link.click()

    URL.revokeObjectURL(url)

    setSuccessMessage(`Export CSV berhasil dibuat: ${fileName}`)
    setExporting(false)
  }

  return (
    <>
      <Topbar
        title="Laporan Final Absensi"
        description="Finalisasi, lock/unlock periode, sync approved request, dan export rekap final absensi."
      />

      <section className="space-y-6 p-6">
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

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/hr/attendance"
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 backdrop-blur-xl transition hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Absensi
              </Link>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <FileSpreadsheet size={15} className="text-[#5ac8fa]" />
                Final Attendance Report
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                Laporan Final Absensi
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Export laporan final absensi dengan keterangan detail harian,
                approved request, cuti, izin, sakit, tugas luar, klaim PHL,
                pending job, handover, dan bukti pendukung.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[720px]">
              <HeroMetric
                label="Approved Atasan"
                value={String(summary.totalApprovedSupervisor)}
              />
              <HeroMetric label="Final HR" value={String(summary.totalFinalHR)} />
              <HeroMetric label="Locked" value={String(summary.totalLocked)} />
              <HeroMetric
                label="Matang Cuti"
                value={String(summary.totalMaturedLeaveEmployees)}
              />
            </div>
          </div>
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 md:grid-cols-[220px_260px_1fr]">
              <label className="block">
                <span className="harmony-label">Periode Cutoff</span>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(event) => setPeriodMonth(event.target.value)}
                  className="harmony-input"
                />
              </label>

              <label className="block">
                <span className="harmony-label">Status Laporan</span>
                <select
                  value={finalFilter}
                  onChange={(event) =>
                    setFinalFilter(event.target.value as FinalFilter)
                  }
                  className="harmony-select"
                >
                  <option value="final_hr">Final HR</option>
                  <option value="approved">Sudah Approved Atasan</option>
                  <option value="not_final">Belum Final</option>
                  <option value="all">Semua Data</option>
                </select>
              </label>

              <div>
                <span className="harmony-label">Rentang Periode</span>
                <div className="flex min-h-12 items-center rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 text-sm font-semibold text-[#1d1d1f]">
                  {periodLabel}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm md:w-[340px]">
                <Search size={18} className="shrink-0 text-[#86868b]" />
                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Cari nama, NIP, unit, status, keterangan..."
                  className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                />
              </div>

              <button
                type="button"
                onClick={fetchData}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-4 border-b border-black/5 p-5 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Data Sesuai Filter"
              value={String(filteredSummary.totalEmployees)}
              description={getFilterDescription(finalFilter)}
              icon={<Users size={22} />}
              tone="blue"
            />

            <SummaryCard
              title="Approved Atasan"
              value={`${summary.totalApprovedSupervisor} karyawan`}
              description="Data yang sudah bisa difinalisasi HR."
              icon={<ShieldCheck size={22} />}
              tone="green"
            />

            <SummaryCard
              title="Status Lock"
              value={
                allApprovedLocked
                  ? 'Locked'
                  : allApprovedUnlocked
                    ? 'Unlocked'
                    : 'Mixed'
              }
              description={`${lockedConfirmations.length} locked · ${unlockedConfirmations.length} unlocked`}
              icon={allApprovedLocked ? <Lock size={22} /> : <LockOpen size={22} />}
              tone="orange"
            />

            <SummaryCard
              title="Matang Cuti"
              value={`${filteredSummary.totalMaturedLeaveEmployees} orang`}
              description="Karyawan yang anniversary cutinya masuk periode."
              icon={<CalendarDays size={22} />}
              tone="purple"
            />
          </div>

          <div className="grid gap-4 border-b border-black/5 p-5 md:grid-cols-3 xl:grid-cols-6">
            <MiniTotal label="Hadir" value={filteredSummary.totalPresentDays} />
            <MiniTotal label="PHL" value={filteredSummary.totalPHLDays} />
            <MiniTotal
              label="Klaim PHL"
              value={filteredSummary.totalPHLClaimDays}
            />
            <MiniTotal label="Cuti" value={filteredSummary.totalLeaveDays} />
            <MiniTotal label="Sakit" value={filteredSummary.totalSickDays} />
            <MiniTotal label="Izin" value={filteredSummary.totalPermitDays} />
          </div>

          <div className="flex flex-col gap-3 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
              <Link href="/hr/attendance" className="harmony-button-secondary">
                <ArrowLeft size={18} />
                Kembali ke Absensi
              </Link>

              <button
                type="button"
                disabled={!hasApprovedData || processingAction}
                onClick={() => {
                  setConfirmAction({
                    type: 'finalize',
                    title: 'Finalisasi Periode HR',
                    description:
                      'Sistem akan otomatis sync approved request terlebih dahulu, lalu memberi status Final HR dan mengunci periode.',
                    buttonLabel: 'Finalisasi Periode',
                    buttonTone: 'green',
                  })
                  setActionNote('')
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={18} />
                Finalisasi Periode
              </button>

              <button
                type="button"
                disabled={!hasApprovedData || processingAction}
                onClick={() => {
                  setConfirmAction({
                    type: 'lock',
                    title: 'Kunci Periode',
                    description:
                      'Mengunci manual seluruh data yang sudah approved atasan pada periode ini.',
                    buttonLabel: 'Kunci Periode',
                    buttonTone: 'black',
                  })
                  setActionNote('')
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock size={18} />
                Kunci
              </button>

              <button
                type="button"
                disabled={
                  ((!hasFinalizedData && lockedConfirmations.length === 0) ||
                    processingAction)
                }
                onClick={() => {
                  setConfirmAction({
                    type: 'unlock',
                    title: 'Buka Lock Periode',
                    description:
                      'Membuka lock manual agar data periode ini bisa diperbaiki kembali. Gunakan hanya jika memang ada revisi.',
                    buttonLabel: 'Buka Lock',
                    buttonTone: 'orange',
                  })
                  setActionNote('')
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LockOpen size={18} />
                Buka Lock
              </button>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={loading || exporting || filteredRows.length === 0}
                className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText size={18} />
                Export CSV
              </button>

              <button
                type="button"
                onClick={handleExportXLSX}
                disabled={loading || exporting || filteredRows.length === 0}
                className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                Export XLSX
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat data laporan final...
            </div>
          ) : (
            <ExportPreviewTable rows={filteredRows} />
          )}
        </div>

        {confirmAction && (
          <ConfirmActionModal
            action={confirmAction}
            note={actionNote}
            processing={processingAction}
            periodLabel={periodLabel}
            approvedCount={approvedConfirmations.length}
            onNoteChange={setActionNote}
            onClose={() => {
              setConfirmAction(null)
              setActionNote('')
            }}
            onSubmit={runConfirmAction}
          />
        )}
      </section>
    </>
  )
}

function ConfirmActionModal({
  action,
  note,
  processing,
  periodLabel,
  approvedCount,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  action: ConfirmAction
  note: string
  processing: boolean
  periodLabel: string
  approvedCount: number
  onNoteChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const buttonClass =
    action.buttonTone === 'green'
      ? 'bg-green-600 hover:bg-green-700'
      : action.buttonTone === 'orange'
        ? 'bg-orange-600 hover:bg-orange-700'
        : 'bg-[#1d1d1f] hover:bg-black'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {action.title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {action.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-[24px] border border-black/5 bg-[#f5f5f7]/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
              Periode
            </p>

            <p className="mt-2 text-sm font-semibold text-[#1d1d1f]">
              {periodLabel}
            </p>

            <p className="mt-2 text-xs leading-5 text-[#6e6e73]">
              Total data approved atasan yang akan diproses:{' '}
              <strong>{approvedCount} karyawan</strong>.
            </p>
          </div>

          <label className="block">
            <span className="harmony-label">Catatan HR</span>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              className="harmony-textarea"
              placeholder="Opsional. Contoh: Finalisasi periode dilakukan setelah payroll check."
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-black/5 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="harmony-button-secondary"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onSubmit}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
            >
              {processing ? 'Memproses...' : action.buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExportPreviewTable({ rows }: { rows: ExportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
            <FileSpreadsheet size={24} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
            Tidak ada data sesuai filter
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            Pilih filter lain, pastikan employee sudah submit periode, atau
            pastikan atasan sudah approve.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[2600px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
            <th className="px-5 py-4 font-semibold">Karyawan</th>
            <th className="px-5 py-4 font-semibold">Unit</th>
            <th className="px-5 py-4 font-semibold">Submit Employee</th>
            <th className="px-5 py-4 font-semibold">Approval Atasan</th>
            <th className="px-5 py-4 font-semibold">Final HR</th>
            <th className="px-5 py-4 font-semibold">Lock</th>
            <th className="px-5 py-4 font-semibold">Masuk</th>
            <th className="px-5 py-4 font-semibold">PHL</th>
            <th className="px-5 py-4 font-semibold">Klaim PHL</th>
            <th className="px-5 py-4 font-semibold">Cuti</th>
            <th className="px-5 py-4 font-semibold">Izin</th>
            <th className="px-5 py-4 font-semibold">Sakit</th>
            <th className="px-5 py-4 font-semibold">Tugas Luar</th>
            <th className="px-5 py-4 font-semibold">Alpa</th>
            <th className="px-5 py-4 font-semibold">Matang Cuti</th>
            <th className="px-5 py-4 font-semibold">Detail Request</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr
              key={`${item.employee_number}-${item.machine_pin}`}
              className="border-b border-black/5 transition hover:bg-[#f5f5f7]/70"
            >
              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">{item.full_name}</p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.employee_number} · PIN {item.machine_pin}
                </p>
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-[#1d1d1f]">{item.department}</p>
                <p className="mt-1 text-xs text-[#6e6e73]">{item.position}</p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={item.employee_submit_status}
                  tone={
                    item.employee_submit_status === 'Diajukan'
                      ? 'green'
                      : 'orange'
                  }
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.employee_submitted_at}
                </p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={item.supervisor_approval_status}
                  tone={
                    item.supervisor_approval_status === 'Disetujui'
                      ? 'green'
                      : item.supervisor_approval_status === 'Ditolak'
                        ? 'red'
                        : 'orange'
                  }
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.supervisor_name}
                </p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.supervisor_approved_at}
                </p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={item.hr_status}
                  tone={item.hr_status === 'Final HR' ? 'green' : 'orange'}
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.hr_finalized_by}
                </p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.hr_finalized_at}
                </p>
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={item.lock_status}
                  tone={item.lock_status === 'Locked' ? 'green' : 'orange'}
                />
                <p className="mt-1 text-xs text-[#6e6e73]">{item.locked_by}</p>
                <p className="mt-1 text-xs text-[#6e6e73]">{item.locked_at}</p>
              </td>

              <NumberCell value={item.total_present_days} tone="green" />
              <NumberCell value={item.total_phl_days} tone="purple" />
              <NumberCell value={item.total_phl_claim_days} tone="purple" />
              <NumberCell value={item.total_leave_days} tone="blue" />
              <NumberCell value={item.total_permit_days} tone="blue" />
              <NumberCell value={item.total_sick_days} tone="orange" />
              <NumberCell
                value={item.total_official_travel_days}
                tone="blue"
              />
              <NumberCell value={item.total_absent_days} tone="red" />

              <td className="px-5 py-4">
                <StatusBadge
                  label={item.annual_leave_matured_in_period}
                  tone={
                    item.annual_leave_matured_in_period === 'Ya'
                      ? 'green'
                      : 'neutral'
                  }
                />
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {item.annual_leave_matured_date}
                </p>
              </td>

              <td className="px-5 py-4">
                <p className="line-clamp-3 max-w-[360px] text-xs leading-5 text-[#6e6e73]">
                  {item.request_detail}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
  }[tone]

  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-[#6e6e73]">{title}</p>

          <h3 className="mt-2 break-words text-2xl font-semibold leading-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-2 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`shrink-0 rounded-2xl p-3 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  )
}

function MiniTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[#f5f5f7] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-[#1d1d1f]">{value}</p>
    </div>
  )
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
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
    <td className="px-5 py-4">
      <span
        className={`inline-flex min-w-8 justify-center rounded-xl px-3 py-1 text-xs font-bold ${className}`}
      >
        {value}
      </span>
    </td>
  )
}

function StatusBadge({
  label,
  tone,
}: {
  label: string
  tone: 'green' | 'orange' | 'red' | 'neutral'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    neutral: 'bg-[#f5f5f7] text-[#6e6e73]',
  }[tone]

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {label}
    </span>
  )
}

function buildExportRows({
  employees,
  attendanceLogs,
  leaveRequests,
  periodConfirmations,
  periodStart,
  periodEnd,
  periodLabel,
}: {
  employees: Employee[]
  attendanceLogs: AttendanceLog[]
  leaveRequests: LeaveRequest[]
  periodConfirmations: PeriodConfirmation[]
  periodStart: string
  periodEnd: string
  periodLabel: string
}): ExportRow[] {
  const logsByEmployee = new Map<string, AttendanceLog[]>()
  const confirmationByEmployee = new Map<string, PeriodConfirmation>()

  periodConfirmations.forEach((confirmation) => {
    confirmationByEmployee.set(confirmation.employee_id, confirmation)
  })

  attendanceLogs.forEach((log) => {
    const key = log.employee_id || log.machine_pin || log.employee_number || ''

    if (!key) return

    const existing = logsByEmployee.get(key) || []
    logsByEmployee.set(key, [...existing, log])
  })

  return employees.map((employee) => {
    const employeeLogs =
      logsByEmployee.get(employee.id) ||
      logsByEmployee.get(employee.machine_pin || '') ||
      logsByEmployee.get(employee.employee_number || '') ||
      []

    const confirmation = confirmationByEmployee.get(employee.id) || null
    const counts = calculateAttendanceCounts(employeeLogs)

    const annualLeaveCycle = getAnnualLeaveCycle(employee, periodStart)
    const maturedDate = getAnnualLeaveMaturedDate(employee, periodStart)

    const maturedInPeriod =
      Boolean(maturedDate) && maturedDate >= periodStart && maturedDate <= periodEnd

    const usedAnnualLeave = calculateUsedAnnualLeave({
      employeeId: employee.id,
      leaveRequests,
      cycleStart: annualLeaveCycle.start,
      cycleEnd: annualLeaveCycle.end,
    })

    const estimatedRemainingAnnualLeave = Math.max(
      annualLeaveQuota - usedAnnualLeave,
      0
    )

    const employeeStatus = normalizeText(confirmation?.employee_status)
    const supervisorStatus = normalizeText(confirmation?.supervisor_status)
    const hrStatus = normalizeText(confirmation?.hr_status)

    const isEmployeeSubmitted =
      employeeStatus === 'submitted' ||
      employeeStatus === 'approved' ||
      Boolean(confirmation?.employee_submitted_at || confirmation?.submitted_at)

    const isSupervisorApproved = supervisorStatus === 'approved'
    const isFinalHR = hrStatus === 'finalized'
    const isLocked = confirmation?.is_locked === true

    const totalAbsenceDays =
      counts.total_leave_days +
      counts.total_permit_days +
      counts.total_sick_days +
      counts.total_official_travel_days +
      counts.total_absent_days +
      counts.total_phl_claim_days

    return {
      periode: periodLabel,
      employee_number: getEmployeeNumber(employee),
      machine_pin: employee.machine_pin || '-',
      full_name: getEmployeeName(employee),
      department: getEmployeeDepartment(employee),
      position: getEmployeePosition(employee),

      employee_submit_status: isEmployeeSubmitted ? 'Diajukan' : 'Belum Submit',
      employee_submitted_at: formatDateTime(
        confirmation?.employee_submitted_at || confirmation?.submitted_at || ''
      ),
      supervisor_approval_status: getSupervisorApprovalLabel(
        confirmation?.supervisor_status || ''
      ),
      supervisor_name:
        confirmation?.supervisor_name ||
        confirmation?.supervisor_approved_by_name ||
        '-',
      supervisor_approved_at: formatDateTime(
        confirmation?.supervisor_approved_at || ''
      ),

      hr_status: isFinalHR ? 'Final HR' : 'Belum Final HR',
      hr_finalized_by:
        confirmation?.hr_finalized_by_name || confirmation?.hr_finalized_by || '-',
      hr_finalized_at: formatDateTime(confirmation?.hr_finalized_at || ''),

      lock_status: isLocked ? 'Locked' : 'Unlocked',
      locked_by: confirmation?.locked_by_name || confirmation?.locked_by || '-',
      locked_at: formatDateTime(confirmation?.locked_at || ''),
      unlocked_by:
        confirmation?.unlocked_by_name || confirmation?.unlocked_by || '-',
      unlocked_at: formatDateTime(confirmation?.unlocked_at || ''),
      lock_note: confirmation?.lock_note || '-',

      final_report_status: isFinalHR
        ? 'Final HR'
        : isEmployeeSubmitted && isSupervisorApproved
          ? 'Approved Atasan'
          : 'Belum Final',

      total_present_days: counts.total_present_days,
      total_late_days: counts.total_late_days,
      total_incomplete_days: counts.total_incomplete_days,
      total_phl_days: counts.total_phl_days,
      total_phl_claim_days: counts.total_phl_claim_days,
      total_leave_days: counts.total_leave_days,
      total_permit_days: counts.total_permit_days,
      total_sick_days: counts.total_sick_days,
      total_official_travel_days: counts.total_official_travel_days,
      total_absent_days: counts.total_absent_days,
      total_absence_days: totalAbsenceDays,

      annual_leave_matured_date: maturedDate ? formatDisplayDate(maturedDate) : '-',
      annual_leave_matured_in_period: maturedInPeriod ? 'Ya' : 'Tidak',
      estimated_remaining_annual_leave: estimatedRemainingAnnualLeave,

      daily_detail: buildDailyDetail(employeeLogs),
      request_detail: buildRequestDetail(employeeLogs),
      job_pending_detail: buildJobPendingDetail(employeeLogs),
      handover_detail: buildHandoverDetail(employeeLogs),
      proof_detail: buildProofDetail(employeeLogs),

      notes: buildRowNotes({
        employeeLogs,
        confirmation,
        isEmployeeSubmitted,
        isSupervisorApproved,
        isFinalHR,
        isLocked,
      }),
    }
  })
}

function calculateAttendanceCounts(logs: AttendanceLog[]) {
  const uniqueDateMap = new Map<string, AttendanceLog>()

  logs.forEach((log) => {
    if (!log.attendance_date) return
    uniqueDateMap.set(log.attendance_date, log)
  })

  const result = {
    total_present_days: 0,
    total_late_days: 0,
    total_incomplete_days: 0,
    total_phl_days: 0,
    total_phl_claim_days: 0,
    total_leave_days: 0,
    total_permit_days: 0,
    total_sick_days: 0,
    total_official_travel_days: 0,
    total_absent_days: 0,
  }

  Array.from(uniqueDateMap.values()).forEach((log) => {
    const status = normalizeStatus(log)
    const label = normalizeText(getReadableAttendanceLabel(log))

    const hasAnyAttendance =
      Boolean(log.check_in) ||
      Boolean(log.check_out) ||
      Boolean(log.manual_check_in) ||
      Boolean(log.manual_check_out)

    const isPHL =
      status === 'phl' ||
      status === 'holiday_work' ||
      (Boolean(log.is_phl_candidate) &&
        normalizeText(log.supervisor_approval_status) === 'approved')

    const isPHLClaim = status === 'phl_claim' || label.includes('klaim phl')
    const isSick = status === 'sick' || label.includes('sakit')
    const isPermit = status === 'permit' || status === 'izin' || label.includes('izin')
    const isLeave =
      [
        'leave',
        'annual_leave',
        'marriage_leave',
        'maternity_leave',
        'miscarriage_leave',
        'bereavement_leave',
        'child_circumcision_leave',
        'worship_leave',
        'menstrual_leave',
        'pregnancy_check_leave',
        'other_leave',
      ].includes(status) || label.includes('cuti')
    const isOfficialTravel =
      status === 'official_travel' ||
      status === 'business_trip' ||
      label.includes('tugas') ||
      label.includes('dinas')
    const isAbsent =
      status === 'absent' ||
      status === 'alpha' ||
      status === 'alpa' ||
      label.includes('alpa')

    if (isPHL) {
      result.total_phl_days += 1
      return
    }

    if (isPHLClaim) {
      result.total_phl_claim_days += 1
      return
    }

    if (isSick) {
      result.total_sick_days += 1
      return
    }

    if (isPermit) {
      result.total_permit_days += 1
      return
    }

    if (isLeave) {
      result.total_leave_days += 1
      return
    }

    if (isOfficialTravel) {
      result.total_official_travel_days += 1
      return
    }

    if (isAbsent) {
      result.total_absent_days += 1
      return
    }

    if (status === 'late') {
      result.total_late_days += 1
      result.total_present_days += 1
      return
    }

    if (status === 'incomplete') {
      result.total_incomplete_days += 1
      result.total_present_days += 1
      return
    }

    if (status === 'present' || status === 'hadir' || hasAnyAttendance) {
      result.total_present_days += 1
    }
  })

  return result
}

function buildDailyDetail(logs: AttendanceLog[]) {
  if (!logs.length) return '-'

  return logs
    .slice()
    .sort((a, b) =>
      String(a.attendance_date || '').localeCompare(String(b.attendance_date || ''))
    )
    .map((log) => {
      const date = formatDisplayDate(log.attendance_date || '')
      const checkIn = log.check_in || log.manual_check_in || '-'
      const checkOut = log.check_out || log.manual_check_out || '-'
      const label = getReadableAttendanceLabel(log)

      return `${date}: ${label} | Masuk: ${checkIn} | Pulang: ${checkOut}`
    })
    .join('\n')
}

function buildRequestDetail(logs: AttendanceLog[]) {
  const requestLogs = logs.filter((log) => {
    return Boolean(log.absence_request_type || log.absence_request_label)
  })

  if (!requestLogs.length) return '-'

  return requestLogs
    .slice()
    .sort((a, b) =>
      String(a.attendance_date || '').localeCompare(String(b.attendance_date || ''))
    )
    .map((log) => {
      const date = formatDisplayDate(log.attendance_date || '')
      const label = getReadableAttendanceLabel(log)
      const requestStatus = getRequestStatusLabel(log.absence_request_status)
      const source = log.absence_request_source || '-'

      return `${date}: ${label} | Status: ${requestStatus} | Sumber: ${source}`
    })
    .join('\n')
}

function buildJobPendingDetail(logs: AttendanceLog[]) {
  const items = logs.filter((log) => Boolean(log.job_pending))

  if (!items.length) return '-'

  return items
    .map((log) => {
      return `${formatDisplayDate(log.attendance_date || '')}: ${log.job_pending}`
    })
    .join('\n')
}

function buildHandoverDetail(logs: AttendanceLog[]) {
  const items = logs.filter((log) => Boolean(log.handover_to || log.handover_note))

  if (!items.length) return '-'

  return items
    .map((log) => {
      return `${formatDisplayDate(log.attendance_date || '')}: Ke ${
        log.handover_to || '-'
      } | Catatan: ${log.handover_note || '-'}`
    })
    .join('\n')
}

function buildProofDetail(logs: AttendanceLog[]) {
  const items = logs.filter((log) =>
    Boolean(log.proof_file_url || log.proof_url || log.attachment_url)
  )

  if (!items.length) return '-'

  return items
    .map((log) => {
      const url = log.proof_file_url || log.proof_url || log.attachment_url || '-'

      return `${formatDisplayDate(log.attendance_date || '')}: ${url}`
    })
    .join('\n')
}

function buildDailyDetailSheetRows({
  rows,
  employees,
  attendanceLogs,
  periodConfirmations,
  periodLabel,
}: {
  rows: ExportRow[]
  employees: Employee[]
  attendanceLogs: AttendanceLog[]
  periodConfirmations: PeriodConfirmation[]
  periodLabel: string
}) {
  const includedEmployeeNames = new Set(rows.map((row) => row.full_name))
  const employeesById = new Map<string, Employee>()
  const confirmationsByEmployee = new Map<string, PeriodConfirmation>()

  employees.forEach((employee) => {
    employeesById.set(employee.id, employee)
  })

  periodConfirmations.forEach((confirmation) => {
    confirmationsByEmployee.set(confirmation.employee_id, confirmation)
  })

  const detailRows: Record<string, string | number>[] = []

  attendanceLogs
    .slice()
    .sort((a, b) =>
      String(a.attendance_date || '').localeCompare(String(b.attendance_date || ''))
    )
    .forEach((log, index) => {
      const employee = employeesById.get(log.employee_id || '')
      const employeeName = employee ? getEmployeeName(employee) : log.full_name || '-'

      if (!includedEmployeeNames.has(employeeName)) return

      const confirmation = confirmationsByEmployee.get(log.employee_id || '')

      detailRows.push({
        No: detailRows.length + 1,
        Periode: periodLabel,
        Tanggal: formatDisplayDate(log.attendance_date || ''),
        NIP: employee ? getEmployeeNumber(employee) : log.employee_number || '-',
        'Machine PIN': employee?.machine_pin || log.machine_pin || '-',
        'Nama Karyawan': employeeName,
        Unit: employee ? getEmployeeDepartment(employee) : log.department || '-',
        Jabatan: employee ? getEmployeePosition(employee) : log.position || '-',
        'Jam Masuk': log.check_in || log.manual_check_in || '-',
        'Jam Pulang': log.check_out || log.manual_check_out || '-',
        Keterangan: getReadableAttendanceLabel(log),
        'Status Request': getRequestStatusLabel(log.absence_request_status),
        'Sumber Request': log.absence_request_source || '-',
        'Approval Atasan': getSupervisorApprovalLabel(
          log.supervisor_approval_status || confirmation?.supervisor_status || ''
        ),
        'Final HR': getHRStatusLabel(log.hr_final_status || confirmation?.hr_status),
        'Pekerjaan Pending': log.job_pending || '-',
        'Handover Ke': log.handover_to || '-',
        'Catatan Handover': log.handover_note || '-',
        Bukti: log.proof_file_url || log.proof_url || log.attachment_url || '-',
        Catatan: log.notes || '-',
        'Nomor Urut Log': index + 1,
      })
    })

  return detailRows
}

function calculateUsedAnnualLeave({
  employeeId,
  leaveRequests,
  cycleStart,
  cycleEnd,
}: {
  employeeId: string
  leaveRequests: LeaveRequest[]
  cycleStart: string
  cycleEnd: string
}) {
  return leaveRequests.reduce((sum, request) => {
    if (request.employee_id !== employeeId) return sum

    const leaveType = normalizeText(request.leave_type)
    const requestType = normalizeText(request.request_type)
    const requestStatus = normalizeText(request.status)
    const hrStatus = normalizeText(request.hr_status)
    const supervisorStatus = normalizeText(request.supervisor_status)

    const isAnnualLeave =
      leaveType === 'cuti tahunan' ||
      leaveType === 'annual_leave' ||
      requestType === 'annual_leave'

    const isRejected =
      requestStatus === 'rejected' ||
      hrStatus === 'rejected' ||
      supervisorStatus === 'rejected' ||
      hrStatus === 'rejected_by_supervisor'

    if (!isAnnualLeave || isRejected) return sum
    if (!request.start_date || !request.end_date) return sum

    const overlaps = request.start_date <= cycleEnd && request.end_date >= cycleStart

    if (!overlaps) return sum

    return sum + Number(request.total_days || 0)
  }, 0)
}

function buildRowNotes({
  employeeLogs,
  confirmation,
  isEmployeeSubmitted,
  isSupervisorApproved,
  isFinalHR,
  isLocked,
}: {
  employeeLogs: AttendanceLog[]
  confirmation: PeriodConfirmation | null
  isEmployeeSubmitted: boolean
  isSupervisorApproved: boolean
  isFinalHR: boolean
  isLocked: boolean
}) {
  if (!employeeLogs.length) {
    return 'Tidak ada data absensi pada periode ini.'
  }

  if (!confirmation) {
    return 'Ada data absensi, tetapi employee belum submit konfirmasi periode.'
  }

  if (!isEmployeeSubmitted) {
    return 'Ada data absensi, tetapi employee belum submit konfirmasi periode.'
  }

  if (!isSupervisorApproved) {
    return 'Employee sudah submit, tetapi belum approved atasan.'
  }

  if (isFinalHR && isLocked) {
    return 'Data sudah Final HR dan terkunci.'
  }

  if (isFinalHR && !isLocked) {
    return 'Data sudah Final HR, tetapi lock sedang dibuka oleh HR.'
  }

  return 'Data sudah approved atasan dan menunggu finalisasi HR.'
}

function normalizeStatus(log: AttendanceLog) {
  return (
    normalizeText(log.absence_request_type) ||
    normalizeText(log.status) ||
    normalizeText(log.attendance_status) ||
    'unknown'
  )
}

function getReadableAttendanceLabel(log: AttendanceLog) {
  if (log.absence_request_label) return log.absence_request_label

  const status = normalizeStatus(log)

  const map: Record<string, string> = {
    present: 'Hadir',
    hadir: 'Hadir',
    normal: 'Hadir Normal',
    late: 'Terlambat',
    manual: 'Hadir Manual',
    manual_correction: 'Koreksi Kehadiran',
    incomplete: 'Belum Lengkap',
    absent: 'Alpa / Tidak Hadir',
    alpha: 'Alpa / Tidak Hadir',
    alpa: 'Alpa / Tidak Hadir',

    leave: 'Cuti',
    annual_leave: 'Cuti Tahunan',
    marriage_leave: 'Cuti Menikah',
    maternity_leave: 'Cuti Melahirkan',
    miscarriage_leave: 'Cuti Keguguran',
    bereavement_leave: 'Cuti Duka',
    child_circumcision_leave: 'Cuti Khitan / Baptis Anak',
    worship_leave: 'Cuti Ibadah',
    menstrual_leave: 'Cuti Haid',
    pregnancy_check_leave: 'Pemeriksaan Kehamilan',
    other_leave: 'Cuti Lainnya',

    sick: 'Sakit',
    permit: 'Izin',
    izin: 'Izin',
    official_travel: 'Tugas Luar / Dinas',
    business_trip: 'Tugas Luar / Dinas',

    phl: 'PHL',
    holiday_work: 'PHL',
    phl_claim: 'Klaim PHL',
    claim_phl: 'Klaim PHL',

    holiday: 'Hari Libur',
    weekend: 'Akhir Pekan',
    off: 'Libur',
  }

  return map[status] || status.replaceAll('_', ' ')
}

function getRequestStatusLabel(status?: string | null) {
  const normalized = normalizeText(status)

  if (normalized === 'approved') return 'Disetujui'
  if (normalized === 'approved_supervisor') return 'Disetujui Atasan'
  if (normalized === 'synced') return 'Tersinkron'
  if (normalized === 'pending') return 'Menunggu'
  if (normalized === 'submitted') return 'Diajukan'
  if (normalized === 'rejected') return 'Ditolak'

  return normalized ? normalized.replaceAll('_', ' ') : '-'
}

function getHRStatusLabel(status?: string | null) {
  const normalized = normalizeText(status)

  if (normalized === 'finalized') return 'Final HR'
  if (normalized === 'ready_for_hr') return 'Ready for HR'
  if (normalized === 'waiting_hr') return 'Menunggu HR'
  if (normalized === 'waiting_supervisor') return 'Menunggu Atasan'
  if (normalized === 'rejected_by_supervisor') return 'Ditolak Atasan'
  if (normalized === 'rejected') return 'Ditolak'

  return normalized ? normalized.replaceAll('_', ' ') : '-'
}

function getDefaultPeriodMonth() {
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

function getPeriodLabel(start: string, end: string) {
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`
}

function getEmployeeName(employee: Employee) {
  return (
    employee.full_name ||
    employee.employee_name ||
    employee.name ||
    employee.email ||
    '-'
  )
}

function getEmployeeNumber(employee: Employee) {
  return employee.employee_number || employee.nip || employee.machine_pin || '-'
}

function getEmployeeDepartment(employee: Employee) {
  return employee.department || employee.unit || employee.work_unit || '-'
}

function getEmployeePosition(employee: Employee) {
  return employee.position || employee.position_name || employee.job_position || '-'
}

function getEmployeeJoinDate(employee: Employee) {
  return (
    employee.join_date ||
    employee.start_date ||
    employee.hire_date ||
    employee.tanggal_masuk ||
    employee.employment_start_date ||
    ''
  )
}

function getAnnualLeaveMaturedDate(employee: Employee, periodStart: string) {
  const joinDate = getEmployeeJoinDate(employee)

  if (!joinDate) return ''

  const join = new Date(`${joinDate}T00:00:00`)
  const period = new Date(`${periodStart}T00:00:00`)

  if (Number.isNaN(join.getTime()) || Number.isNaN(period.getTime())) {
    return ''
  }

  let matured = new Date(period.getFullYear(), join.getMonth(), join.getDate())

  if (matured < period) {
    matured = new Date(period.getFullYear() + 1, join.getMonth(), join.getDate())
  }

  const alreadyOneYear = matured.getFullYear() - join.getFullYear() >= 1

  if (!alreadyOneYear) return ''

  return formatDateToISO(matured)
}

function getAnnualLeaveCycle(employee: Employee, periodStart: string) {
  const joinDate = getEmployeeJoinDate(employee)

  if (!joinDate) {
    return {
      start: periodStart,
      end: periodStart,
    }
  }

  const join = new Date(`${joinDate}T00:00:00`)
  const period = new Date(`${periodStart}T00:00:00`)

  if (Number.isNaN(join.getTime()) || Number.isNaN(period.getTime())) {
    return {
      start: periodStart,
      end: periodStart,
    }
  }

  let cycleStart = new Date(period.getFullYear(), join.getMonth(), join.getDate())

  if (cycleStart > period) {
    cycleStart = new Date(period.getFullYear() - 1, join.getMonth(), join.getDate())
  }

  const cycleEnd = new Date(cycleStart)

  cycleEnd.setFullYear(cycleEnd.getFullYear() + 1)
  cycleEnd.setDate(cycleEnd.getDate() - 1)

  return {
    start: formatDateToISO(cycleStart),
    end: formatDateToISO(cycleEnd),
  }
}

function getSupervisorApprovalLabel(status: string) {
  const normalized = normalizeText(status)

  if (normalized === 'approved') return 'Disetujui'
  if (normalized === 'rejected') return 'Ditolak'
  if (normalized === 'rejected_by_supervisor') return 'Ditolak Atasan'
  if (normalized === 'submitted') return 'Diajukan'
  if (normalized === 'pending') return 'Menunggu'

  return 'Menunggu'
}

function getFilterDescription(filter: FinalFilter) {
  if (filter === 'final_hr') {
    return 'Hanya data yang sudah Final HR.'
  }

  if (filter === 'approved') {
    return 'Data yang sudah approved atasan dan bisa difinalisasi.'
  }

  if (filter === 'not_final') {
    return 'Data yang belum Final HR.'
  }

  return 'Semua data karyawan aktif pada periode ini.'
}

function getFilterLabelForFile(filter: FinalFilter) {
  if (filter === 'final_hr') return 'Final_HR'
  if (filter === 'approved') return 'Approved_Atasan'
  if (filter === 'not_final') return 'Belum_Final'

  return 'Semua_Data'
}

function getDefaultActionNote(type: ConfirmAction['type'], periodLabel: string) {
  if (type === 'finalize') {
    return `Periode ${periodLabel} difinalisasi dan dikunci oleh HR.`
  }

  if (type === 'lock') {
    return `Periode ${periodLabel} dikunci manual oleh HR.`
  }

  return `Lock periode ${periodLabel} dibuka manual oleh HR untuk kebutuhan revisi.`
}

function convertToCSV(rows: unknown[][]) {
  return rows
    .map((row) => {
      return row
        .map((cell) => {
          const value = String(cell ?? '')
          const escaped = value.replaceAll('"', '""')

          return `"${escaped}"`
        })
        .join(',')
    })
    .join('\n')
}

function buildColumnWidths(rows: Record<string, unknown>[]) {
  if (!rows.length) return []

  const headers = Object.keys(rows[0])

  return headers.map((header) => {
    const maxLength = rows.reduce((max, row) => {
      const value = String(row[header] ?? '')
      return Math.max(max, value.length)
    }, header.length)

    return {
      wch: Math.min(Math.max(maxLength + 2, 12), 60),
    }
  })
}

function safeFileName(value: string) {
  return value.replace(/\s+/g, '_').replace(/[^\w\-]/g, '_')
}

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
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

function formatDateTime(value: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}