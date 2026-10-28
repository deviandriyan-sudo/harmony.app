'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarRange, CheckCheck, Download, Loader2, Search, Users, X } from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { getCutoffRange, getCurrentPeriodMonthWita, getEmployeeLogs, type AttendanceDayClassification } from '@/lib/attendance-reporting'
import { buildAttendanceReportingRows, loadAttendanceReportingDataset, type AttendanceReportingEmployee, type AttendanceRawLog } from '@/lib/attendance-reporting-data'
import { estimatedLateMinutes, minutesBetween } from '@/lib/export/attendance-details'
import { downloadStyledWorkbook, type ReportRow } from '@/lib/export/styled-workbook'
import { supabase } from '@/lib/supabase'

const MAX_PERIODS = 12
const clockMinutes = (text: string | null | undefined) => {
  const match = String(text || '').match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?:\s|$)/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}
const short = (value: unknown) => String(value ?? '').trim()
const yes = (value: unknown) => value ? 'YA' : 'TIDAK'

function periodsBetween(first: string, last: string): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(first) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(last)) return []
  const [fy, fm] = first.split('-').map(Number)
  const [ly, lm] = last.split('-').map(Number)
  const diff = (ly - fy) * 12 + lm - fm
  if (diff < 0 || diff >= MAX_PERIODS) return []
  return Array.from({ length: diff + 1 }, (_, i) => {
    const year = fy + Math.floor((fm - 1 + i) / 12)
    const month = ((fm - 1 + i) % 12) + 1
    return `${year}-${String(month).padStart(2, '0')}`
  })
}

function reviewFlags(day: AttendanceDayClassification): string[] {
  const flags: string[] = []
  if (day.manualCheckIn && !day.machineCheckIn) flags.push('MANUAL MASUK TANPA MESIN')
  if (day.manualCheckOut && !day.machineCheckOut) flags.push('MANUAL PULANG TANPA MESIN')
  if (day.machineCheckOut && !day.machineCheckIn) flags.push('HANYA PULANG MESIN')
  if (!day.isWeekend && !day.isHoliday && day.effectiveCheckIn && (clockMinutes(day.effectiveCheckIn) ?? 0) >= 12 * 60) flags.push('JAM MASUK TERCATAT SIANG/SORE')
  if (day.isLate) flags.push('TERTANDA TERLAMBAT')
  if (day.bucket === 'conflict') flags.push('KONFLIK DATA')
  if (day.hasManualTime && !day.manualApproved) flags.push('MANUAL BELUM APPROVED')
  return flags
}

function rowBase(employee: AttendanceReportingEmployee, period: string) {
  return {
    Periode: period,
    NIP: short(employee.employee_number),
    'Nama Karyawan': short(employee.full_name),
    'PIN Mesin': short(employee.machine_pin),
    Unit: short(employee.department),
    Jabatan: short(employee.position),
  }
}

export default function AttendanceHistoryExportPage() {
  const currentPeriod = getCurrentPeriodMonthWita()
  const [startMonth, setStartMonth] = useState(currentPeriod)
  const [endMonth, setEndMonth] = useState(currentPeriod)
  const [employees, setEmployees] = useState<AttendanceReportingEmployee[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [loadingPeople, setLoadingPeople] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const periods = useMemo(() => periodsBetween(startMonth, endMonth), [startMonth, endMonth])
  const visibleEmployees = useMemo(() => employees.filter(e =>
    [e.full_name, e.employee_number, e.machine_pin, e.department, e.position]
      .join(' ').toLocaleLowerCase('id').includes(filter.toLocaleLowerCase('id').trim()),
  ), [employees, filter])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error: queryError } = await supabase.from('employees')
        .select('id,employee_number,machine_pin,full_name,department,position,is_active,join_date')
        .order('full_name', { ascending: true })
      if (!active) return
      if (queryError) setError(queryError.message)
      else setEmployees((data || []) as AttendanceReportingEmployee[])
      setLoadingPeople(false)
    })()
    return () => { active = false }
  }, [])

  function toggle(id: string) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
  }

  async function exportHistory() {
    if (exporting) return
    setError('')
    setSuccess('')
    if (!selectedIds.length) { setError('Pilih minimal satu karyawan.'); return }
    if (!periods.length) { setError(`Rentang harus urut dan maksimal ${MAX_PERIODS} periode.`); return }
    setExporting(true)
    const selectedPeople = employees.filter(item => selectedSet.has(item.id))
    const detail: ReportRow[] = []
    const manualAudit: ReportRow[] = []
    const rawLogs: ReportRow[] = []
    const summaries = new Map<string, {
      employee: AttendanceReportingEmployee; days: number; present: number; manual: number; manualNoMachineIn: number;
      afterNoon: number; onlyOut: number; late: number; noRecord: number; conflict: number; raw: number;
    }>()
    for (const employee of selectedPeople) {
      summaries.set(employee.id, { employee, days: 0, present: 0, manual: 0, manualNoMachineIn: 0,
        afterNoon: 0, onlyOut: 0, late: 0, noRecord: 0, conflict: 0, raw: 0 })
    }

    try {
      for (let n = 0; n < periods.length; n += 1) {
        const period = periods[n]
        setProgress(`Mengambil data periode ${period} (${n + 1}/${periods.length})...`)
        // Exhaustive pagination prevents Supabase's default 1,000-row cap from silently hiding days.
        const data = await loadAttendanceReportingDataset(supabase, period, { exhaustive: true })
        if (data.warnings.length) throw new Error(`Data ${period} belum lengkap: ${data.warnings.join('; ')}`)
        const mapped = buildAttendanceReportingRows(data, period, { includeInactive: true })
        const byId = new Map(mapped.map(row => [row.employee.id, row]))
        for (const employee of selectedPeople) {
          const report = byId.get(employee.id)
          if (!report) continue
          const info = summaries.get(employee.id)!
          const base = rowBase(employee, period)
          for (const day of report.summary.classifiedDays) {
            const flags = reviewFlags(day)
            const noon = flags.includes('JAM MASUK TERCATAT SIANG/SORE')
            const manualIn = flags.includes('MANUAL MASUK TANPA MESIN')
            const onlyOut = flags.includes('HANYA PULANG MESIN')
            if (!day.isWeekend && !day.isHoliday) info.days += 1
            if (day.workAttendanceRecorded) info.present += 1
            if (day.hasManualTime) info.manual += 1
            if (manualIn) info.manualNoMachineIn += 1
            if (noon) info.afterNoon += 1
            if (onlyOut) info.onlyOut += 1
            if (day.isLate) info.late += 1
            if (day.bucket === 'no_record') info.noRecord += 1
            if (day.bucket === 'conflict') info.conflict += 1
            const detailRow = {
              ...base,
              Tanggal: day.date, Hari: day.dayName,
              'Hari Non-Kerja': day.isHoliday ? `LIBUR: ${day.holidayName}` : day.isWeekend ? 'WEEKEND' : 'TIDAK',
              'Jam Masuk Mesin': day.machineCheckIn, 'Jam Pulang Mesin': day.machineCheckOut,
              'Jam Masuk Manual': day.manualCheckIn, 'Jam Pulang Manual': day.manualCheckOut,
              'Jam Masuk Efektif': day.effectiveCheckIn, 'Jam Pulang Efektif': day.effectiveCheckOut,
              'Sumber Absensi': day.sourceLabel,
              'Durasi Kerja (Menit)': minutesBetween(day.effectiveCheckIn, day.effectiveCheckOut),
              'Status Hari': day.label,
              'Flag Terlambat': yes(day.isLate),
              'Estimasi Terlambat (Menit)': estimatedLateMinutes(day.isLate, day.effectiveCheckIn, day.isWeekend || day.isHoliday),
              'Ada Input Manual': yes(day.hasManualTime), 'Manual Disetujui': yes(day.manualApproved),
              'Perlu Pemeriksaan': flags.length ? 'YA' : 'TIDAK',
              'Indikator Pemeriksaan': flags.join(' | '),
              'Request': day.requestLabel, 'Status Request': day.requestStatus,
              'Alasan Request': day.requestReason,
              Catatan: day.note,
              'Status Submit': short(report.confirmation?.employee_status),
              'Approval Atasan': short(report.confirmation?.supervisor_status),
              'Status HR': short(report.confirmation?.hr_status),
            }
            detail.push(detailRow)
            if (day.hasManualTime || flags.length) manualAudit.push(detailRow)
          }
          const logsForEmployee = getEmployeeLogs(employee, report.logs)
          info.raw += logsForEmployee.length
          for (const log of logsForEmployee) rawLogs.push(buildRawLogRow(employee, period, log))
        }
      }
      setProgress('Menyusun workbook berwarna...')
      const summaryRows = Array.from(summaries.values()).map((s, index) => ({
        No: index + 1, ...rowBase(s.employee, `${startMonth} s.d. ${endMonth}`),
        'Hari Kerja': s.days, 'Hari Kehadiran Tercatat': s.present,
        'Hari dengan Input Manual': s.manual,
        'Manual Masuk Tanpa Mesin': s.manualNoMachineIn,
        'Masuk Siang/Sore Tercatat': s.afterNoon,
        'Hanya Check-out Mesin': s.onlyOut,
        'Terlambat Ditandai': s.late,
        'Tanpa Data': s.noRecord,
        'Konflik': s.conflict,
        'Jumlah Raw Log': s.raw,
      }))
      const fromDate = getCutoffRange(startMonth).start
      const untilDate = getCutoffRange(endMonth).end
      downloadStyledWorkbook(`HARMONY_AUDIT_ABSENSI_${startMonth}_${endMonth}_${selectedPeople.length}KARYAWAN.xlsx`, [
        { name: 'Informasi Laporan', rows: [
          { Komponen: 'Jenis Laporan', Keterangan: 'Audit absensi historis (read-only) untuk HR' },
          { Komponen: 'Periode awal', Keterangan: startMonth },
          { Komponen: 'Periode akhir', Keterangan: endMonth },
          { Komponen: 'Rentang tanggal aktual', Keterangan: `${fromDate} s.d. ${untilDate}` },
          { Komponen: 'Jumlah karyawan', Keterangan: selectedPeople.length },
          { Komponen: 'Jumlah periode', Keterangan: periods.length },
          { Komponen: 'Total detail harian', Keterangan: detail.length },
          { Komponen: 'Manual/indikator perlu review', Keterangan: manualAudit.length },
          { Komponen: 'Keterangan', Keterangan: 'Indikator adalah alat verifikasi, bukan bukti pelanggaran. Periksa jadwal/shift, tugas luar, bukti dan approval.' },
        ] },
        { name: 'Rekap Karyawan', rows: summaryRows },
        { name: 'Detail Harian', rows: detail },
        { name: 'Audit Manual', rows: manualAudit, columns: Object.keys(detail[0] || { Tanggal: '' }) },
        { name: 'Log Mesin dan Koreksi', rows: rawLogs, columns: rawLogColumns },
        { name: 'Panduan Pemeriksaan', rows: [
          { Indikator: 'MANUAL MASUK TANPA MESIN', Penjelasan: 'Jam masuk diisi manual, tetapi tidak ada jam masuk dari mesin pada klasifikasi hari.' },
          { Indikator: 'HANYA PULANG MESIN', Penjelasan: 'Jam pulang mesin tercatat, tetapi jam masuk mesin tidak tercatat.' },
          { Indikator: 'JAM MASUK TERCATAT SIANG/SORE', Penjelasan: 'Jam masuk efektif >=12.00 pada hari kerja, bukan otomatis terlambat atau pelanggaran.' },
          { Indikator: 'TERTANDA TERLAMBAT', Penjelasan: 'Status dari data attendance menandai terlambat; estimasi 08.00 hanya informasi, bukan dasar payroll.' },
          { Indikator: 'MANUAL BELUM APPROVED', Penjelasan: 'Ada jam manual yang belum disetujui sesuai status classifier.' },
          { Indikator: 'LOG MESIN DAN KOREKSI', Penjelasan: 'Berisi raw check-in/out dan isian manual/requested, status, alasan serta waktu perubahan apabila tersedia.' },
          { Indikator: 'CUT OFF', Penjelasan: 'Periode YYYY-MM HARMONY mencakup tanggal 11 bulan tersebut sampai 10 bulan berikutnya.' },
        ] },
      ])
      setSuccess(`Berhasil mengunduh ${detail.length} tanggal untuk ${selectedPeople.length} karyawan (${periods.length} periode).`)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengambil atau membuat laporan.')
    } finally {
      setProgress('')
      setExporting(false)
    }
  }

  return <>
    <Topbar title="Export Detail Absensi" description="Audit historis satu atau beberapa karyawan lintas periode, tanpa mengubah data." />
    <main className="harmony-page-bg min-h-screen space-y-5 p-4 sm:p-6">
      <section className="harmony-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700"><CalendarRange size={15} /> Laporan HR · Multi Periode</span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#152c50]">Export Detail Absensi</h1>
            <p className="mt-1 text-sm text-slate-600">Bandingkan data mesin, koreksi manual, jam efektif dan keputusan approval pada beberapa periode.</p>
          </div>
          <Link href="/hr/attendance/export" className="harmony-button-secondary">Kembali ke Export</Link>
        </div>
      </section>
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {success && <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div>}
      <section className="harmony-card grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Users size={18} /> Pilih Karyawan <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">{selectedIds.length} dipilih</span></h2>
            {selectedIds.length > 0 && <button type="button" onClick={() => setSelectedIds([])} disabled={exporting} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600"><X size={14}/> Bersihkan pilihan</button>}
          </div>
          <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3">
            <Search size={16} className="text-slate-500" />
            <input aria-label="Cari karyawan" className="w-full bg-transparent text-sm outline-none" placeholder="Cari nama, NIP, PIN, unit..." value={filter} onChange={event => setFilter(event.target.value)} />
          </div>
          <button disabled={exporting || loadingPeople || !visibleEmployees.length} type="button"
            onClick={() => setSelectedIds(previous => Array.from(new Set([...previous, ...visibleEmployees.map(item => item.id)])))}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 disabled:opacity-50"><CheckCheck size={15}/> Pilih semua hasil pencarian ({visibleEmployees.length})</button>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white/55 p-2">
            {loadingPeople ? <p className="p-4 text-sm text-slate-600">Memuat daftar karyawan...</p> : !visibleEmployees.length ? <p className="p-4 text-sm text-slate-600">Tidak ada karyawan sesuai pencarian.</p> : visibleEmployees.map(employee =>
              <label key={employee.id} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-blue-50/70">
                <input type="checkbox" checked={selectedSet.has(employee.id)} disabled={exporting} onChange={() => toggle(employee.id)} className="mt-1 h-4 w-4 accent-blue-600" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{employee.full_name || 'Tanpa Nama'}</span><span className="block text-xs text-slate-500">{employee.employee_number || 'Tanpa NIP'} · {employee.department || 'Tanpa Unit'}{employee.is_active === false ? ' · Nonaktif' : ''}</span></span>
              </label>)}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-800">Rentang Periode</h2>
          <label className="block text-xs font-semibold text-slate-600">Dari periode <input type="month" min="2026-01" value={startMonth} disabled={exporting} onChange={event => setStartMonth(event.target.value)} className="harmony-select mt-2 w-full" /></label>
          <label className="block text-xs font-semibold text-slate-600">Sampai periode <input type="month" min="2026-01" value={endMonth} disabled={exporting} onChange={event => setEndMonth(event.target.value)} className="harmony-select mt-2 w-full" /></label>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3 text-xs leading-6 text-slate-700">
            <strong>{periods.length ? `${periods.length} periode` : 'Periode tidak valid'}</strong>
            <div>{periods.length ? `${getCutoffRange(startMonth).start} s.d. ${getCutoffRange(endMonth).end}` : `Urutkan tanggal, maksimal ${MAX_PERIODS} periode.`}</div>
            <p className="mt-1 text-slate-500">Periode Juni–September berarti tanggal 11 Juni–10 Oktober.</p>
          </div>
          <button type="button" onClick={() => void exportHistory()} disabled={exporting || !periods.length || !selectedIds.length || loadingPeople} className="harmony-button-primary flex w-full justify-center disabled:opacity-50">
            {exporting ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
            {exporting ? 'Menyusun Laporan...' : 'Download Excel Multi-Periode'}
          </button>
          {progress && <p role="status" className="text-xs text-blue-700">{progress}</p>}
        </div>
      </section>
      <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-6 text-amber-900"><AlertTriangle size={17} className="mt-1 shrink-0" />Indikator seperti masuk siang/sore atau pengisian manual adalah bahan verifikasi, bukan kesimpulan pelanggaran. Cocokkan dengan jadwal kerja, izin, ST, dan bukti sebelum menyusun laporan kedisiplinan.</section>
    </main>
  </>
}

const rawLogColumns = [
  'Periode', 'NIP', 'Nama Karyawan', 'PIN Mesin', 'Unit', 'Jabatan', 'Tanggal',
  'ID Log', 'Upload ID', 'Jam Masuk Mesin', 'Jam Pulang Mesin', 'Jam Masuk Manual',
  'Jam Pulang Manual', 'Request Koreksi Masuk', 'Request Koreksi Pulang', 'Status Mesin',
  'Sumber Log', 'Status Konfirmasi', 'Approval Atasan', 'Approval HR', 'Status Final HR',
  'Status Koreksi', 'Jenis Koreksi', 'Alasan Koreksi', 'Catatan Pegawai',
  'Catatan Mesin', 'Bukti Koreksi', 'Waktu Dibuat', 'Waktu Diubah',
]

function buildRawLogRow(employee: AttendanceReportingEmployee, period: string, log: AttendanceRawLog): ReportRow {
  return {
    ...rowBase(employee, period), Tanggal: short(log.attendance_date),
    'ID Log': short(log.id), 'Upload ID': short(log.upload_id),
    'Jam Masuk Mesin': short(log.check_in), 'Jam Pulang Mesin': short(log.check_out),
    'Jam Masuk Manual': short(log.manual_check_in), 'Jam Pulang Manual': short(log.manual_check_out),
    'Request Koreksi Masuk': short(log.requested_check_in), 'Request Koreksi Pulang': short(log.requested_check_out),
    'Status Mesin': short(log.status), 'Sumber Log': short(log.source),
    'Status Konfirmasi': short(log.employee_confirmation_status),
    'Approval Atasan': short(log.supervisor_approval_status), 'Approval HR': short(log.hr_approval_status),
    'Status Final HR': short(log.hr_final_status), 'Status Koreksi': short(log.correction_status),
    'Jenis Koreksi': short(log.correction_type), 'Alasan Koreksi': short(log.correction_reason),
    'Catatan Pegawai': short(log.employee_daily_note), 'Catatan Mesin': short(log.notes),
    'Bukti Koreksi': short(log.correction_proof_url),
    'Waktu Dibuat': short(log.created_at), 'Waktu Diubah': short(log.updated_at),
  }
}
