'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  getCurrentPeriodMonthWita,
  getCutoffRange,
} from '@/lib/attendance-reporting'
import {
  loadAttendanceReportingDataset,
  type AttendanceReportingDataset,
} from '@/lib/attendance-reporting-data'

export default function HRAttendanceSyncPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
  const [dataset, setDataset] = useState<AttendanceReportingDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  const requestStats = useMemo(() => {
    const requests = dataset?.requests || []
    const approved = requests.filter((request) => isApproved(request.hr_status) || isApproved(request.status))
    const travel = approved.filter((request) => isWorkAssignment(request.request_type, request.request_label, request.request_category))
    const absence = approved.length - travel.length
    return { all: requests.length, approved: approved.length, travel: travel.length, absence }
  }, [dataset])

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
    try {
      setDataset(await loadAttendanceReportingDataset(supabase, periodMonth))
    } catch (error: any) {
      setDataset(null)
      setMessage({ type: 'error', text: error?.message || 'Sumber approved request gagal dibaca.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    const confirmed = window.confirm(
      `Sinkron approved request periode ${range.label} ke attendance_logs?\n\n` +
        `Laporan HR sebenarnya sudah membaca approved request langsung. Sync ini hanya materialisasi untuk kompatibilitas HR Review/finalisasi/audit.`,
    )

    if (!confirmed) return

    setSyncing(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('sync_approved_leave_requests_to_attendance', {
        p_period_month: periodMonth,
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text:
          data?.message ||
          `Approved request ${range.label} berhasil disinkronkan ke attendance_logs. Laporan tetap menggunakan cross-check sumber asli agar tidak ada ST/tugas luar yang hilang.`,
      })

      await fetchData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Sinkron gagal. Jangan finalisasi dulu. Laporan masih dapat dibuka karena membaca leave_requests/PHL langsung.',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <Topbar
        title="Sinkron Approved Request"
        description="Materialisasi approved request untuk workflow; bukan sumber tunggal laporan kehadiran."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 p-4 sm:p-6">
        {message && <MessageBox type={message.type} text={message.text} />}
        {dataset?.warnings.map((warning) => <MessageBox key={warning} type="info" text={warning} />)}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Link href={`/hr/attendance?period=${periodMonth}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold text-white/75">
                <ArrowLeft size={15} /> Kembali
              </Link>
              <h1 className="mt-5 text-3xl font-semibold">Sinkron Workflow</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
                Approved cuti, sakit, izin, ST/tugas luar, dan klaim PHL dimaterialisasi ke attendance_logs. Laporan tidak lagi bergantung pada langkah ini karena sumber request asli juga dibaca langsung.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 xl:min-w-[330px]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Periode</p>
              <input type="month" min="2026-01" value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none" />
              <p className="mt-1 text-xs text-white/55">{range.label}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Request Terbaca" value={requestStats.all} />
          <Metric label="Approved" value={requestStats.approved} />
          <Metric label="ST/Tugas Luar" value={requestStats.travel} />
          <Metric label="Cuti/Sakit/Izin/PHL" value={requestStats.absence} />
        </section>

        <section className="harmony-card p-5 sm:p-6">
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-800">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-1 shrink-0" />
              <div>
                <strong>Kenapa masih ada menu Sync?</strong>
                <p className="mt-1">
                  Karena HR Review/finalisasi lama memakai attendance_logs sebagai ledger harian. Reporting baru tidak menunggu Sync,
                  tetapi finalisasi tetap sebaiknya melakukan Sync agar attendance_logs dan sumber approved request konsisten untuk audit.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={handleSync} disabled={syncing || loading} className="harmony-button-primary disabled:opacity-50">
              {syncing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCcw size={17} />}
              {syncing ? 'Menyinkronkan...' : 'Sinkron Approved Request'}
            </button>

            <Link href={`/hr/attendance/data?period=${periodMonth}`} className="harmony-button-secondary">
              Data Absensi
            </Link>
            <Link href={`/hr/attendance/final-report?period=${periodMonth}`} className="harmony-button-secondary">
              Finalisasi
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

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[22px] border border-black/5 bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">{label}</p><p className="mt-2 text-3xl font-bold text-[#1d1d1f]">{value}</p></div>
}

function MessageBox({ type, text }: { type: 'success' | 'error' | 'info'; text: string }) {
  const cls = type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : type === 'error' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-blue-200 bg-blue-50 text-blue-700'
  return <div className={`rounded-2xl border p-4 text-sm leading-6 ${cls}`}><div className="flex items-start gap-2">{type === 'success' ? <CheckCircle2 size={17} className="mt-0.5" /> : <AlertTriangle size={17} className="mt-0.5" />}{text}</div></div>
}

function normalize(value: unknown) { return String(value || '').trim().toLowerCase() }
function isApproved(value: unknown) { return ['approved', 'finalized', 'final', 'hr_approved'].includes(normalize(value)) }

function isWorkAssignment(code: unknown, label: unknown, category: unknown) {
  const text = [code, label, category].map((value) => normalize(value).replace(/[\s/-]+/g, '_')).join('_')
  return ['official_travel', 'business_trip', 'tugas_luar', 'surat_tugas', 'dinas', 'perjalanan_dinas', 'luar_kota', 'kerja_luar', 'lapangan'].some((token) => text.includes(token))
}
