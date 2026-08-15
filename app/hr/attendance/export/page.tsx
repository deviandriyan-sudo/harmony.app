'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  WalletCards,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  formatDateID,
  formatDateTimeID,
  getCutoffRange,
} from '@/lib/attendance-reporting'
import { useAttendancePeriodQuery } from '@/lib/use-attendance-period'
import {
  buildAttendanceReportingRows,
  loadAttendanceReportingDataset,
  type AttendanceReportingDataset,
  type AttendanceReportingRow,
} from '@/lib/attendance-reporting-data'

type ReportFilter =
  | 'all'
  | 'has_presence'
  | 'compensation_ready'
  | 'manual_pending'
  | 'official_travel'
  | 'conflict'
  | 'no_record'

export default function HRAttendanceExportPage() {
  const { periodMonth, setPeriodMonth, periodReady } = useAttendancePeriodQuery()
  const [dataset, setDataset] = useState<AttendanceReportingDataset | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ReportFilter>('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])
  const rows = useMemo<AttendanceReportingRow[]>(
    () => (dataset ? buildAttendanceReportingRows(dataset, periodMonth) : []),
    [dataset, periodMonth],
  )

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
      if (filter === 'has_presence') return row.summary.recordedWorkAttendance > 0
      if (filter === 'compensation_ready') return row.summary.verifiedWorkAttendance > 0
      if (filter === 'manual_pending') return row.summary.manualPendingVerification > 0
      if (filter === 'official_travel') return row.summary.officialTravel > 0
      if (filter === 'conflict') return row.summary.conflict > 0
      if (filter === 'no_record') return row.summary.noRecord > 0
      return true
    })
  }, [rows, search, filter])

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.employees += 1
        acc.scheduled += row.summary.scheduledWorkdays
        acc.recorded += row.summary.recordedWorkAttendance
        acc.verified += row.summary.verifiedWorkAttendance
        acc.transport += row.summary.transportBasisDays
        acc.meal += row.summary.mealBasisDays
        acc.office += row.summary.officePresent
        acc.manual += row.summary.manualPresent
        acc.travel += row.summary.officialTravel
        acc.offday += row.summary.offdayWork
        acc.late += row.summary.late
        acc.leave += row.summary.leave
        acc.phl += row.summary.phlClaim
        acc.sick += row.summary.sick
        acc.permit += row.summary.permit
        acc.absent += row.summary.absent
        acc.incomplete += row.summary.incomplete
        acc.pending += row.summary.pendingRequest
        acc.noRecord += row.summary.noRecord
        acc.conflict += row.summary.conflict
        acc.manualPending += row.summary.manualPendingVerification
        return acc
      },
      {
        employees: 0,
        scheduled: 0,
        recorded: 0,
        verified: 0,
        transport: 0,
        meal: 0,
        office: 0,
        manual: 0,
        travel: 0,
        offday: 0,
        late: 0,
        leave: 0,
        phl: 0,
        sick: 0,
        permit: 0,
        absent: 0,
        incomplete: 0,
        pending: 0,
        noRecord: 0,
        conflict: 0,
        manualPending: 0,
      },
    )
  }, [filteredRows])

  useEffect(() => {
    if (!periodReady) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth, periodReady])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const querySearch = new URLSearchParams(window.location.search).get('q')
    if (querySearch) setSearch(querySearch)
  }, [])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    try {
      setDataset(await loadAttendanceReportingDataset(supabase, periodMonth))
    } catch (error: any) {
      setDataset(null)
      setErrorMessage(error?.message || 'Laporan absensi gagal mengambil data dari Supabase.')
    } finally {
      setLoading(false)
    }
  }

  function buildRecapRows() {
    return filteredRows.map((row, index) => ({
      No: index + 1,
      Periode: range.label,
      NIP: row.employee.employee_number || '',
      'Machine PIN': row.employee.machine_pin || '',
      'Nama Karyawan': row.employee.full_name || '',
      Unit: row.employee.department || '',
      Jabatan: row.employee.position || '',
      'Status Mapping': row.synthetic ? 'PERLU MAPPING' : 'OK',
      'Status Submit': workflowLabel(row.confirmation?.employee_status),
      'Status Atasan': workflowLabel(row.confirmation?.supervisor_status),
      'Status HR': workflowLabel(row.confirmation?.hr_status),
      'Status Lock': row.locked ? 'Locked' : 'Unlocked',
      'Hari Kerja Terjadwal': row.summary.scheduledWorkdays,
      'Hadir Kantor (Mesin)': row.summary.officePresent,
      'Terlambat (subset Hadir Kantor)': row.summary.late,
      'Hadir Manual / Lapangan': row.summary.manualPresent,
      'ST / Tugas Luar / Luar Kota': row.summary.officialTravel,
      'Kerja Sabtu-Minggu-Libur': row.summary.offdayWork,
      'TOTAL KEHADIRAN TERCATAT': row.summary.recordedWorkAttendance,
      'TOTAL KEHADIRAN TERVERIFIKASI': row.summary.verifiedWorkAttendance,
      'DASAR HARI TUNJANGAN TRANSPORT': row.summary.transportBasisDays,
      'DASAR HARI TUNJANGAN MAKAN': row.summary.mealBasisDays,
      'Manual Belum Terverifikasi': row.summary.manualPendingVerification,
      Cuti: row.summary.leave,
      'Klaim PHL': row.summary.phlClaim,
      Sakit: row.summary.sick,
      Izin: row.summary.permit,
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

  function buildDailyRows() {
    return filteredRows.flatMap((row) =>
      row.summary.classifiedDays.map((day) => ({
        Periode: range.label,
        NIP: row.employee.employee_number || '',
        'Machine PIN': row.employee.machine_pin || '',
        'Nama Karyawan': row.employee.full_name || '',
        Unit: row.employee.department || '',
        Jabatan: row.employee.position || '',
        Tanggal: day.date,
        Hari: day.dayName,
        Klasifikasi: day.label,
        'Kehadiran Tercatat': day.workAttendanceRecorded ? 'YA' : 'TIDAK',
        'Siap Dasar Tunjangan': day.compensationReady ? 'YA' : 'TIDAK',
        'Dasar Transport': day.transportBasis ? 1 : 0,
        'Dasar Makan': day.mealBasis ? 1 : 0,
        'Machine Check In': day.machineCheckIn,
        'Machine Check Out': day.machineCheckOut,
        'Manual Check In': day.manualCheckIn,
        'Manual Check Out': day.manualCheckOut,
        'Check In Efektif': day.effectiveCheckIn,
        'Check Out Efektif': day.effectiveCheckOut,
        'Sumber Kehadiran': day.sourceLabel,
        'Manual Approved': day.manualApproved ? 'YA' : 'TIDAK',
        Terlambat: day.isLate ? 'YA' : 'TIDAK',
        Weekend: day.isWeekend ? 'YA' : 'TIDAK',
        Libur: day.isHoliday ? day.holidayName || 'YA' : 'TIDAK',
        'Request ID': day.requestId,
        'Request Code': day.requestCode,
        'Request Label': day.requestLabel,
        'Request Category': day.requestCategory,
        'Request Status': day.requestStatus,
        'Request Source': day.requestSource,
        'Request Approved': day.requestApproved ? 'YA' : 'TIDAK',
        'Request Pending': day.requestPending ? 'YA' : 'TIDAK',
        'Alasan Request': day.requestReason,
        Catatan: day.note,
      })),
    )
  }

  function buildRawLogRows() {
    if (!dataset) return []
    const allowedIds = new Set(filteredRows.flatMap((row) => row.logs.map((log) => String(log.id || ''))))

    return dataset.logs
      .filter((log) => !log.id || allowedIds.has(String(log.id)))
      .map((log, index) => ({
        No: index + 1,
        ID: log.id || '',
        'Upload ID': log.upload_id || '',
        Tanggal: log.attendance_date || '',
        'Employee ID': log.employee_id || '',
        NIP: log.employee_number || '',
        'Machine PIN': log.machine_pin || '',
        Nama: log.full_name || '',
        Unit: log.department || '',
        Jabatan: log.position || '',
        'Machine Check In': log.check_in || '',
        'Machine Check Out': log.check_out || '',
        'Manual Check In': log.manual_check_in || '',
        'Manual Check Out': log.manual_check_out || '',
        'Requested Check In': log.requested_check_in || '',
        'Requested Check Out': log.requested_check_out || '',
        Status: log.status || '',
        Source: log.source || '',
        'Employee Confirmation': log.employee_confirmation_status || '',
        'Supervisor Approval': log.supervisor_approval_status || '',
        'HR Approval': log.hr_approval_status || '',
        'HR Final': log.hr_final_status || '',
        'Request Type': log.absence_request_type || '',
        'Request Label': log.absence_request_label || '',
        'Request Status': log.absence_request_status || '',
        'Request Source': log.absence_request_source || '',
        'Daily Note': log.employee_daily_note || '',
        'Correction Reason': log.correction_reason || '',
        'Correction Status': log.correction_status || '',
        'Correction Type': log.correction_type || '',
        'Locked': log.is_locked ? 'YA' : 'TIDAK',
        'Created At': log.created_at || '',
        'Updated At': log.updated_at || '',
      }))
  }

  function buildRequestRows() {
    if (!dataset) return []
    const filteredEmployeeKeys = new Set(
      filteredRows.flatMap((row) => [
        String(row.employee.id || ''),
        String(row.employee.employee_number || ''),
        String(row.employee.machine_pin || ''),
      ]),
    )

    return dataset.requests
      .filter((request) =>
        [request.employee_id, request.employee_number, request.machine_pin]
          .filter(Boolean)
          .some((value) => filteredEmployeeKeys.has(String(value))),
      )
      .map((request, index) => ({
        No: index + 1,
        'Source Table': request.source_table || '',
        'Request ID': request.id || '',
        'Employee ID': request.employee_id || '',
        NIP: request.employee_number || '',
        'Machine PIN': request.machine_pin || '',
        'Start Date': request.start_date || '',
        'End Date': request.end_date || '',
        'Request Type': request.request_type || '',
        'Request Label': request.request_label || '',
        'Request Category': request.request_category || '',
        Status: request.status || '',
        'Supervisor Status': request.supervisor_status || '',
        'HR Status': request.hr_status || '',
        Alasan: request.reason || '',
        Source: request.source || '',
        'Proof URL': request.proof_url || '',
        'Created At': request.created_at || '',
        'Updated At': request.updated_at || '',
      }))
  }

  function buildDefinitionRows() {
    return [
      {
        Komponen: 'Hadir Kantor (Mesin)',
        Definisi: 'Hari kerja reguler dengan pasangan jam masuk/pulang lengkap dan minimal satu sisi berasal dari mesin/fingerprint.',
        'Kehadiran Tercatat': 'YA',
        'Dasar Tunjangan': 'YA',
      },
      {
        Komponen: 'Hadir Manual / Lapangan',
        Definisi: 'Pasangan jam lengkap hanya berasal dari input manual. Tetap muncul dalam laporan kehadiran.',
        'Kehadiran Tercatat': 'YA',
        'Dasar Tunjangan': 'YA jika manual sudah approved; jika belum, tetap tercatat tetapi belum final untuk payroll.',
      },
      {
        Komponen: 'ST / Tugas Luar / Luar Kota',
        Definisi: 'Request kerja approved seperti official travel, surat tugas, dinas, kerja luar kota/lapangan pada hari kerja.',
        'Kehadiran Tercatat': 'YA',
        'Dasar Tunjangan': 'YA',
      },
      {
        Komponen: 'Kerja Sabtu/Minggu/Libur',
        Definisi: 'Hari libur dengan pasangan jam kerja lengkap. Request yang hanya melewati weekend tanpa jam tidak dihitung otomatis.',
        'Kehadiran Tercatat': 'YA',
        'Dasar Tunjangan': 'YA jika fingerprint atau manual sudah approved.',
      },
      {
        Komponen: 'Cuti / Sakit / Izin / Klaim PHL',
        Definisi: 'Ketidakhadiran approved. Tidak dihitung sebagai kehadiran kerja.',
        'Kehadiran Tercatat': 'TIDAK',
        'Dasar Tunjangan': 'TIDAK',
      },
      {
        Komponen: 'Konflik Data',
        Definisi: 'Jam kerja bertabrakan dengan request ketidakhadiran approved pada tanggal yang sama. Wajib review HR.',
        'Kehadiran Tercatat': 'TIDAK FINAL',
        'Dasar Tunjangan': 'TIDAK sampai konflik selesai.',
      },
      {
        Komponen: 'TOTAL KEHADIRAN TERVERIFIKASI',
        Definisi: 'Jumlah unique day: Hadir Kantor + approved Manual/Lapangan + approved ST/Tugas Luar + Kerja Hari Libur yang valid.',
        'Kehadiran Tercatat': 'YA',
        'Dasar Tunjangan': 'Menjadi kandidat jumlah hari transport dan makan. Nominal/rate tetap mengikuti kebijakan payroll perusahaan.',
      },
    ]
  }

  function handleExportXlsx() {
    setExporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const recap = buildRecapRows()
      if (!recap.length) throw new Error('Tidak ada data sesuai filter untuk diexport.')

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(recap), 'Rekap Kehadiran')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildDailyRows()), 'Detail Harian')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildRawLogRows()), 'Raw Attendance Logs')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildRequestRows()), 'Approved Request Sources')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildDefinitionRows()), 'Definisi')

      const fileName = `HARMONY_KEHADIRAN_TUNJANGAN_${periodMonth}_${filter}.xlsx`
      XLSX.writeFile(workbook, fileName)
      setSuccessMessage(`Export XLSX berhasil: ${fileName}`)
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
      const recap = buildRecapRows()
      if (!recap.length) throw new Error('Tidak ada data sesuai filter untuk diexport.')

      const headers = Object.keys(recap[0])
      const csv = [
        headers.map(csvCell).join(','),
        ...recap.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(',')),
      ].join('\n')

      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `HARMONY_KEHADIRAN_TUNJANGAN_${periodMonth}_${filter}.csv`
      link.click()
      URL.revokeObjectURL(url)
      setSuccessMessage('Export CSV berhasil.')
    } catch (error: any) {
      setErrorMessage(error?.message || 'Export CSV gagal.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Topbar
        title="Laporan Kehadiran & Tunjangan"
        description="Satu laporan gabungan: fingerprint mesin, manual, ST/tugas luar, kerja hari libur, dan ketidakhadiran approved."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 overflow-x-hidden p-4 sm:p-6">
        {successMessage && <AlertBox tone="success" message={successMessage} />}
        {errorMessage && <AlertBox tone="warning" message={errorMessage} />}
        {dataset?.warnings.map((warning) => <AlertBox key={warning} tone="warning" message={warning} />)}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/30 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Link href={`/hr/attendance?period=${periodMonth}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/75">
                <ArrowLeft size={15} /> Kembali ke Absensi
              </Link>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
                <WalletCards size={15} /> Payroll Attendance Source
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Laporan Kehadiran Aktual</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-white/60">
                Semua kehadiran kerja dibuat mutually exclusive per tanggal. Mesin, manual, ST/tugas luar/luar kota, dan kerja hari libur tercatat terpisah lalu dijumlah sebagai Total Kehadiran Kerja. Cuti/PHL/sakit/izin tidak dicampur sebagai hadir.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[480px]">
              <label className="rounded-2xl bg-white/10 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-white/45">Periode</span>
                <input type="month" min="2026-01" value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none" />
              </label>
              <div className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Cutoff</p><p className="mt-1 text-xs font-semibold">{range.label}</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Karyawan" value={totals.employees} tone="blue" />
          <MetricCard label="Kehadiran Tercatat" value={totals.recorded} tone="blue" />
          <MetricCard label="Kehadiran Terverifikasi" value={totals.verified} tone="green" />
          <MetricCard label="Dasar Transport" value={totals.transport} tone="green" />
          <MetricCard label="Dasar Makan" value={totals.meal} tone="green" />
          <MetricCard label="Konflik" value={totals.conflict} tone="red" />
        </section>

        <section className="harmony-card overflow-hidden">
          <div className="grid gap-3 border-b border-black/5 p-5 md:grid-cols-[minmax(220px,1fr)_230px_auto] md:items-center">
            <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4">
              <Search size={16} className="text-[#86868b]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, NIP, PIN, unit..." className="w-full bg-transparent text-sm outline-none" />
            </div>

            <select value={filter} onChange={(event) => setFilter(event.target.value as ReportFilter)} className="harmony-select">
              <option value="all">Semua Karyawan</option>
              <option value="has_presence">Ada Kehadiran Tercatat</option>
              <option value="compensation_ready">Ada Dasar Tunjangan</option>
              <option value="manual_pending">Manual Belum Terverifikasi</option>
              <option value="official_travel">Ada ST/Tugas Luar</option>
              <option value="conflict">Konflik Data</option>
              <option value="no_record">Ada Tanpa Data</option>
            </select>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={fetchData} disabled={loading} className="harmony-button-secondary disabled:opacity-50"><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
              <button type="button" onClick={handleExportCsv} disabled={exporting || !filteredRows.length} className="harmony-button-secondary disabled:opacity-50"><Download size={16} />CSV</button>
              <button type="button" onClick={handleExportXlsx} disabled={exporting || !filteredRows.length} className="harmony-button-primary disabled:opacity-50">{exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}XLSX 5 Sheet</button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-black/5 bg-[#fafafa] p-5 sm:grid-cols-2 xl:grid-cols-8">
            <SmallMetric label="Hadir Kantor" value={totals.office} />
            <SmallMetric label="Manual/Lapangan" value={totals.manual} />
            <SmallMetric label="ST/Tugas Luar" value={totals.travel} />
            <SmallMetric label="Kerja Libur" value={totals.offday} />
            <SmallMetric label="Cuti" value={totals.leave} />
            <SmallMetric label="PHL" value={totals.phl} />
            <SmallMetric label="Sakit" value={totals.sick} />
            <SmallMetric label="Izin" value={totals.permit} />
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-8 text-sm text-[#6e6e73]"><Loader2 size={18} className="animate-spin" />Menggabungkan raw machine, manual, dan approved request...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[2200px] w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7] text-[#6e6e73]">
                    <Th>Karyawan</Th><Th>Workflow</Th><Th>Hari Kerja</Th><Th>Hadir Kantor</Th><Th>Late</Th><Th>Manual/Lapangan</Th><Th>ST/Tugas Luar</Th><Th>Kerja Libur</Th><Th>Kehadiran Tercatat</Th><Th>Dasar Tunjangan</Th><Th>Transport</Th><Th>Makan</Th><Th>Manual Pending</Th><Th>Cuti</Th><Th>PHL</Th><Th>Sakit</Th><Th>Izin</Th><Th>Alpa</Th><Th>Incomplete</Th><Th>Pending</Th><Th>Tanpa Data</Th><Th>Konflik</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.employee.id} className="border-b border-black/5 hover:bg-[#fafafa]">
                      <Td><div className="font-bold text-[#1d1d1f]">{row.employee.full_name || '-'}</div><div className="mt-1 text-[11px] text-[#86868b]">{row.employee.employee_number || '-'} · PIN {row.employee.machine_pin || '-'} · {row.employee.department || '-'}</div>{row.synthetic && <span className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">Perlu mapping</span>}</Td>
                      <Td><div className="space-y-1"><StatusLine label="Emp" value={workflowLabel(row.confirmation?.employee_status)} /><StatusLine label="Atasan" value={workflowLabel(row.confirmation?.supervisor_status)} /><StatusLine label="HR" value={workflowLabel(row.confirmation?.hr_status)} /></div></Td>
                      <Count value={row.summary.scheduledWorkdays} />
                      <Count value={row.summary.officePresent} />
                      <Count value={row.summary.late} />
                      <Count value={row.summary.manualPresent} />
                      <Count value={row.summary.officialTravel} />
                      <Count value={row.summary.offdayWork} />
                      <Count value={row.summary.recordedWorkAttendance} strong />
                      <Count value={row.summary.verifiedWorkAttendance} strong />
                      <Count value={row.summary.transportBasisDays} strong />
                      <Count value={row.summary.mealBasisDays} strong />
                      <Count value={row.summary.manualPendingVerification} danger={row.summary.manualPendingVerification > 0} />
                      <Count value={row.summary.leave} />
                      <Count value={row.summary.phlClaim} />
                      <Count value={row.summary.sick} />
                      <Count value={row.summary.permit} />
                      <Count value={row.summary.absent} />
                      <Count value={row.summary.incomplete} danger={row.summary.incomplete > 0} />
                      <Count value={row.summary.pendingRequest} />
                      <Count value={row.summary.noRecord} danger={row.summary.noRecord > 0} />
                      <Count value={row.summary.conflict} danger={row.summary.conflict > 0} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[26px] border border-green-100 bg-green-50 p-5 text-sm leading-7 text-green-800">
            <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-1 shrink-0" /><div><strong>Yang masuk dasar hari tunjangan:</strong><br />Fingerprint lengkap + manual approved + ST/tugas luar approved + kerja hari libur yang valid. Satu tanggal hanya dihitung satu kali.</div></div>
          </div>
          <div className="rounded-[26px] border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-800">
            <div className="flex items-start gap-3"><FileSpreadsheet size={18} className="mt-1 shrink-0" /><div><strong>XLSX punya 5 sheet audit:</strong><br />Rekap Kehadiran, Detail Harian, Raw Attendance Logs, Approved Request Sources, dan Definisi. Jadi data mesin/manual/ST dapat ditelusuri sampai sumbernya.</div></div>
          </div>
        </section>
      </section>
    </>
  )
}

function AlertBox({ tone, message }: { tone: 'success' | 'warning'; message: string }) {
  return <div className={`rounded-2xl border p-4 text-sm leading-6 ${tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}><div className="flex items-start gap-2">{tone === 'success' ? <ShieldCheck size={17} className="mt-0.5" /> : <AlertTriangle size={17} className="mt-0.5" />}{message}</div></div>
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'red' }) {
  const cls = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700' }[tone]
  return <div className={`rounded-[22px] p-5 ${cls}`}><p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
}

function SmallMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-black/5 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">{label}</p><p className="mt-1 text-lg font-bold text-[#1d1d1f]">{value}</p></div> }
function Th({ children }: { children: ReactNode }) { return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th> }
function Td({ children }: { children: ReactNode }) { return <td className="px-4 py-4 align-top">{children}</td> }
function Count({ value, strong = false, danger = false }: { value: number; strong?: boolean; danger?: boolean }) { return <td className="px-4 py-4 text-center"><span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 font-bold ${danger ? 'bg-red-50 text-red-700' : strong ? 'bg-green-50 text-green-700' : 'bg-[#f5f5f7] text-[#1d1d1f]'}`}>{value}</span></td> }
function StatusLine({ label, value }: { label: string; value: string }) { return <div className="text-[11px] text-[#6e6e73]"><span className="font-bold text-[#1d1d1f]">{label}:</span> {value}</div> }

function workflowLabel(value: unknown) {
  const key = String(value || '').trim().toLowerCase()
  if (!key) return 'Belum'
  const map: Record<string, string> = { submitted: 'Diajukan', pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak', waiting_supervisor: 'Menunggu Atasan', waiting_hr: 'Menunggu HR', ready_for_hr: 'Ready for HR', finalized: 'Finalized' }
  return map[key] || String(value || '-')
}

function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"` }
