'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { getCutoffRange } from '@/lib/attendance-reporting'
import { useAttendancePeriodQuery } from '@/lib/use-attendance-period'
import {
  loadAttendanceReportingDataset,
  type AttendanceReportingDataset,
} from '@/lib/attendance-reporting-data'

type SyncMessage = {
  type: 'success' | 'error' | 'info'
  text: string
}

type SyncAuditRow = {
  id: string
  period_month: string | null
  employee_id: string | null
  source_table: string | null
  source_id: string | null
  source_status: string | null
  action: string
  result_status: string
  message: string | null
  metadata: Record<string, unknown> | null
  actor_email: string | null
  created_at: string
}

type ReconcileResult = {
  success?: boolean
  period_month?: string
  period_start?: string
  period_end?: string
  leave_employees_processed?: number
  leave_errors?: number
  phl_claims_processed?: number
  phl_claim_errors?: number
  auto_phl_employees_processed?: number
  auto_phl_errors?: number
  auto_phl_v5_2_available?: boolean
  message?: string
}

export default function HRAttendanceSyncPage() {
  const { periodMonth, setPeriodMonth, periodReady } = useAttendancePeriodQuery()

  const [dataset, setDataset] = useState<AttendanceReportingDataset | null>(null)
  const [audits, setAudits] = useState<SyncAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [message, setMessage] = useState<SyncMessage | null>(null)
  const [lastResult, setLastResult] = useState<ReconcileResult | null>(null)
  const [auditAvailable, setAuditAvailable] = useState(true)

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const stats = useMemo(() => {
    const requests = dataset?.requests || []
    const logs = dataset?.logs || []

    const approvedRequests = requests.filter((request) =>
      isApproved(request.hr_status) || isApproved(request.status),
    )

    const leaveRequests = approvedRequests.filter(
      (request) => request.source_table === 'leave_requests',
    )

    const phlClaims = approvedRequests.filter(
      (request) => request.source_table === 'phl_records',
    )

    const materializedLogs = logs.filter((log) =>
      Boolean(String(log.absence_request_type || '').trim()),
    )

    const failures = audits.filter((audit) =>
      ['error', 'failed'].includes(normalize(audit.result_status)),
    ).length

    return {
      approvedSources: approvedRequests.length,
      leaveRequests: leaveRequests.length,
      phlClaims: phlClaims.length,
      materializedLogs: materializedLogs.length,
      failures,
    }
  }, [dataset, audits])

  useEffect(() => {
    if (!periodReady) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth, periodReady])

  async function fetchData(showLoading = true) {
    if (showLoading) setLoading(true)

    try {
      const reporting = await loadAttendanceReportingDataset(supabase, periodMonth)
      setDataset(reporting)

      const auditResult = await supabase
        .from('harmony_attendance_sync_audit_logs')
        .select('*')
        .eq('period_month', periodMonth)
        .order('created_at', { ascending: false })
        .limit(30)

      if (auditResult.error) {
        const text = normalize(auditResult.error.message)
        const migrationMissing =
          text.includes('does not exist') ||
          text.includes('could not find') ||
          text.includes('schema cache')

        setAuditAvailable(!migrationMissing)
        setAudits([])

        if (!migrationMissing) {
          setMessage({
            type: 'info',
            text: `Dataset berhasil dibaca, tetapi audit Auto Sync belum dapat dibaca: ${auditResult.error.message}`,
          })
        }
      } else {
        setAuditAvailable(true)
        setAudits((auditResult.data || []) as SyncAuditRow[])
      }
    } catch (error: any) {
      setDataset(null)
      setAudits([])
      setMessage({
        type: 'error',
        text: error?.message || 'Data sinkronisasi gagal dibaca.',
      })
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function handleReconcile() {
    const confirmed = window.confirm(
      [
        `Jalankan Recovery/Reconciliation untuk ${range.label}?`,
        '',
        'Normal workflow HARMONY sudah menggunakan Auto Sync.',
        'Tombol ini hanya membaca ulang sumber approved/cancelled dan memperbaiki data lama atau data yang tertinggal.',
        '',
        'Tidak memotong saldo cuti/PHL untuk kedua kali.',
      ].join('\n'),
    )

    if (!confirmed) return

    setReconciling(true)
    setMessage(null)
    setLastResult(null)

    try {
      const { data, error } = await supabase.rpc(
        'harmony_reconcile_attendance_period_v1',
        { p_period_month: periodMonth },
      )

      if (error) throw error

      const result = (data || {}) as ReconcileResult
      setLastResult(result)

      setMessage({
        type: result.success === false ? 'info' : 'success',
        text:
          result.message ||
          `Reconciliation ${range.label} selesai. Normal workflow tetap Auto Sync.`,
      })

      await fetchData(false)
    } catch (error: any) {
      const text = String(error?.message || '')

      setMessage({
        type: 'error',
        text:
          text ||
          'Reconciliation gagal. Pastikan HARMONY_AUTO_SYNC_V7_4_NON_DESTRUCTIVE.sql sudah SUCCESS.',
      })
    } finally {
      setReconciling(false)
    }
  }

  return (
    <>
      <Topbar
        title="Auto Sync & Recovery"
        description="Normal workflow tersinkron otomatis. Halaman ini khusus monitoring, audit, dan recovery."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 p-4 sm:p-6">
        {message && <MessageBox type={message.type} text={message.text} />}
        {dataset?.warnings.map((warning) => (
          <MessageBox key={warning} type="info" text={warning} />
        ))}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Link
                href={`/hr/attendance?period=${periodMonth}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/75"
              >
                <ArrowLeft size={15} /> Kembali
              </Link>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200">
                <CheckCircle2 size={15} /> NORMAL FLOW: AUTO SYNC
              </div>

              <h1 className="mt-3 text-3xl font-semibold">Closed-Loop Attendance Sync</h1>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-white/60">
                Cuti/Izin/Sakit/ST/Tugas Luar direkonsiliasi saat status final berubah. Klaim PHL final juga dimaterialisasi otomatis. Kerja hari libur tetap memakai Auto-PHL setelah approval atasan. Final Report dan Export membaca sumber approved langsung sehingga tidak perlu menunggu tombol Sync.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 xl:min-w-[330px]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">
                Periode Cut-off
              </p>
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Approved Source" value={stats.approvedSources} />
          <Metric label="Cuti / Izin / ST" value={stats.leaveRequests} />
          <Metric label="Klaim PHL" value={stats.phlClaims} />
          <Metric label="Materialized Log" value={stats.materializedLogs} />
          <Metric label="Error Audit" value={stats.failures} warning={stats.failures > 0} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="harmony-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1d1d1f]">Alur normal sekarang</h2>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  HR tidak perlu membuka halaman ini setiap periode. Auto Sync berjalan mengikuti approval/reversal sumber data.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <FlowRow
                title="Cuti / Izin / Sakit / ST"
                text="HR final approve/cancel → attendance_logs otomatis direkonsiliasi oleh engine existing."
              />
              <FlowRow
                title="Klaim PHL"
                text="HR final approve → Klaim PHL otomatis ditautkan ke tanggal attendance; cancel/reject → materialisasi dibersihkan."
              />
              <FlowRow
                title="Kerja Sabtu/Minggu/Libur"
                text="Supervisor approve periode → Auto-PHL +1 melalui engine V5.2 jika sudah terpasang."
              />
              <FlowRow
                title="Final Report / Export"
                text="Tetap membaca direct source. Tidak perlu menekan Reconcile terlebih dahulu."
              />
            </div>
          </div>

          <div className="harmony-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <RotateCcw size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1d1d1f]">Recovery Tool</h2>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Gunakan hanya jika ada data lama, deployment sebelumnya gagal, atau HR menemukan perbedaan sumber dengan attendance.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReconcile}
              disabled={reconciling || loading}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white transition hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reconciling ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Database size={18} />
              )}
              {reconciling ? 'Reconciliation berjalan...' : 'Reconcile Periode Sekarang'}
            </button>

            <button
              type="button"
              onClick={() => fetchData()}
              disabled={reconciling || loading}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-black/10 bg-white px-5 text-sm font-bold text-[#1d1d1f] disabled:opacity-50"
            >
              <RefreshCcw size={17} /> Refresh Monitoring
            </button>

            {lastResult && (
              <div className="mt-4 rounded-[22px] border border-black/5 bg-[#f5f5f7] p-4 text-xs leading-6 text-[#515154]">
                <ResultLine label="Leave employee" value={lastResult.leave_employees_processed} error={lastResult.leave_errors} />
                <ResultLine label="Klaim PHL" value={lastResult.phl_claims_processed} error={lastResult.phl_claim_errors} />
                <ResultLine label="Auto-PHL employee" value={lastResult.auto_phl_employees_processed} error={lastResult.auto_phl_errors} />
                <div className="mt-2 border-t border-black/5 pt-2">
                  Auto-PHL V5.2:{' '}
                  <strong>{lastResult.auto_phl_v5_2_available ? 'Terdeteksi' : 'Belum terdeteksi'}</strong>
                </div>
              </div>
            )}
          </div>
        </section>

        {!auditAvailable && (
          <MessageBox
            type="info"
            text="Audit Auto Sync belum tersedia. Jalankan migration HARMONY_AUTO_SYNC_V7_4_NON_DESTRUCTIVE.sql terlebih dahulu."
          />
        )}

        <section className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-black/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-[#1d1d1f]">Audit Auto Sync</h2>
              <p className="mt-1 text-sm text-[#6e6e73]">
                30 aktivitas terbaru pada periode {range.label}.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-3 py-2 text-xs font-bold text-[#6e6e73]">
              <ShieldCheck size={15} /> {audits.length} event
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" /> Memuat monitoring...
            </div>
          ) : audits.length === 0 ? (
            <div className="p-8 text-center text-sm leading-6 text-[#6e6e73]">
              Belum ada audit pada periode ini. Ini normal jika migration baru dipasang dan belum ada approval/recovery baru.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-[#f5f5f7] text-[11px] uppercase tracking-wide text-[#86868b]">
                  <tr>
                    <th className="px-5 py-3">Waktu</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Result</th>
                    <th className="px-5 py-3">Pesan</th>
                    <th className="px-5 py-3">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-[#6e6e73]">
                        {formatDateTime(audit.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#1d1d1f]">{audit.source_table || '-'}</div>
                        <div className="mt-1 max-w-[190px] truncate text-[11px] text-[#86868b]">
                          {audit.source_id || audit.employee_id || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-[#515154]">
                        {formatAction(audit.action)}
                      </td>
                      <td className="px-5 py-4">
                        <ResultPill value={audit.result_status} />
                      </td>
                      <td className="max-w-[360px] px-5 py-4 text-xs leading-5 text-[#6e6e73]">
                        {audit.message || '-'}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#6e6e73]">
                        {audit.actor_email || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="harmony-card p-5 sm:p-6">
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-800">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-1 shrink-0" />
              <div>
                <strong>Final rule HARMONY:</strong>
                <p className="mt-1">
                  Tombol Reconcile bukan bagian workflow wajib. Kalau semua approval berjalan normal, HR bisa langsung menuju Final Report / Export. Reconcile hanya digunakan sebagai recovery dan audit consistency check.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/hr/attendance/data?period=${periodMonth}`} className="harmony-button-secondary">
              Data Absensi
            </Link>
            <Link href={`/hr/attendance/approvals?period=${periodMonth}`} className="harmony-button-secondary">
              HR Review
            </Link>
            <Link href={`/hr/attendance/final-report?period=${periodMonth}`} className="harmony-button-secondary">
              Final Report
            </Link>
            <Link href={`/hr/attendance/export?period=${periodMonth}`} className="harmony-button-secondary">
              <FileSpreadsheet size={16} /> Laporan
            </Link>
          </div>
        </section>
      </section>
    </>
  )
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string
  value: number
  warning?: boolean
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${warning ? 'text-orange-600' : 'text-[#1d1d1f]'}`}>
        {value}
      </p>
    </div>
  )
}

function FlowRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white/70 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-bold text-[#1d1d1f]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">{text}</p>
        </div>
      </div>
    </div>
  )
}

function ResultLine({
  label,
  value,
  error,
}: {
  label: string
  value?: number
  error?: number
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-bold">
        {value ?? 0} processed · {error ?? 0} error
      </span>
    </div>
  )
}

function MessageBox({ type, text }: SyncMessage) {
  const className =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : type === 'error'
        ? 'border-orange-200 bg-orange-50 text-orange-700'
        : 'border-blue-200 bg-blue-50 text-blue-700'

  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${className}`}>
      <div className="flex items-start gap-2">
        {type === 'success' ? (
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        )}
        {text}
      </div>
    </div>
  )
}

function ResultPill({ value }: { value: string }) {
  const normalized = normalize(value)
  const className =
    normalized === 'success'
      ? 'bg-green-50 text-green-700'
      : normalized === 'error' || normalized === 'failed'
        ? 'bg-red-50 text-red-700'
        : 'bg-orange-50 text-orange-700'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${className}`}>
      {value || '-'}
    </span>
  )
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function isApproved(value: unknown) {
  return ['approved', 'approve', 'finalized', 'final', 'hr_approved', 'disetujui'].includes(
    normalize(value),
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatAction(value: string) {
  return String(value || '-')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
