'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardList, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { harmonyFetch } from '@/lib/harmony-client'

type AuditRow = {
  employee_id: string; employee_number: string | null; full_name: string | null
  join_date: string | null; maturity_2026: string | null; matured_this_year: boolean
  maturity_cycle_count: number; master_days: number; canonical_days: number | null
  regular_days: number; postpone_days: number; adjustment_days: number
  legacy_active_cycles: number; legacy_remaining_days: number | null; legacy_used_days: number | null
  debt_outstanding_days: number; debt_due_days: number; next_debt_maturity: string | null
  hr_verified_maturity: string | null; hr_verified_days: number | null
  finding: string; severity: string
}
type AuditResult = {
  success: boolean; reference_date: string
  summary: { active_employees: number; matured_this_year: number; missing_maturity: number; high_priority: number; review_needed: number; overdue_debt: number; outstanding_debt: number }
  scheduler?: {
    checked_environment: string; enabled_here: boolean; cron_secret_configured_here: boolean
    configured_schedule_wita: string; telemetry_available: boolean
    last_run: null | { reference_date: string; environment: string; succeeded: boolean
      processed_count: number; failed_count: number; remaining_count: number
      created_cycles: number; expired_postpone_count: number; created_at: string }
  }
  rows: AuditRow[]
}

const fmt = (n: number | null | undefined) => n == null ? '—' : `${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })} hari`
const severityLabel = (s: string) => s === 'critical' ? 'Kritis' : s === 'high' ? 'Prioritas' : s === 'review' ? 'Perlu review' : s === 'verified' ? 'Terverifikasi HR' : 'Sesuai'
const severityClass = (s: string) => s === 'critical' ? 'bg-rose-100 text-rose-800' : s === 'high' ? 'bg-amber-100 text-amber-900' : s === 'review' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'

export default function LeaveAuditPage() {
  const [data, setData] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('attention')
  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await harmonyFetch<AuditResult>('/api/hr/leave/lifecycle-audit', { cache: 'no-store' })
      if (!result.success) throw new Error('Audit saldo tidak tersedia.')
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit saldo belum dapat dimuat.')
    } finally { setBusy(false) }
  }, [])
  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void load() })
    return () => { active = false }
  }, [load])
  const rows = useMemo(() => (data?.rows || []).filter((row) => {
    if (filter === 'attention' && ['ok', 'verified'].includes(row.severity)) return false
    if (filter === 'high' && !['critical', 'high'].includes(row.severity)) return false
    if (filter === 'debt' && row.debt_outstanding_days <= 0) return false
    if (filter === 'verified' && row.severity !== 'verified') return false
    const q = search.trim().toLowerCase()
    return !q || `${row.full_name || ''} ${row.employee_number || ''}`.toLowerCase().includes(q)
  }), [data, filter, search])
  const metrics = data?.summary
  return (
    <main className="harmony-workspace min-h-screen px-4 pb-12 pt-6 sm:px-7">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/hr/leave/administration" className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-lg hover:bg-white/90"><ArrowLeft size={16} /> Administrasi Cuti</Link>
          <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/75 px-4 py-2.5 text-sm font-semibold text-sky-800 shadow-sm hover:bg-white disabled:opacity-60"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Refresh audit</button>
        </div>
        <section className="mb-5 rounded-[30px] border border-white/75 bg-gradient-to-br from-white/85 via-sky-50/75 to-blue-100/65 p-6 shadow-[0_18px_50px_rgba(50,95,151,0.12)] backdrop-blur-xl sm:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-xs font-bold tracking-[.07em] text-sky-800"><ShieldCheck size={15} /> HARMONY • READ-ONLY</div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Audit Siklus & Saldo Cuti</h1>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">Bandingkan siklus matang, saldo kanonis, pemakaian ledger lama, penyesuaian HR, dan hutang cuti. Hasil verifikasi HR 2026 ditandai terpisah dari selisih yang belum dikonfirmasi. Audit ini hanya membaca data. Selisih bukan izin untuk menambah saldo otomatis; verifikasi riwayat dan lakukan koreksi melalui proses HR yang sudah diaudit.</p>
          {data?.reference_date && <p className="mt-3 text-xs font-semibold text-sky-900">Tanggal acuan WITA: {data.reference_date}</p>}
        </section>
        <section aria-label="Status maturity otomatis" className="mb-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[24px] border border-white/75 bg-white/75 p-5 shadow-[0_10px_30px_rgba(43,86,139,0.09)] backdrop-blur-xl">
            <p className="text-sm font-semibold text-slate-900">Maturity otomatis • {data?.scheduler?.checked_environment || 'Memuat'}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Jadwal source: setiap hari pukul 00.10 WITA. Status di bawah hanya untuk environment yang sedang dibuka, bukan bukti cron production berhasil.</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{data?.scheduler ? (
              data.scheduler.enabled_here && data.scheduler.cron_secret_configured_here
                ? 'Konfigurasi environment tersedia; periksa riwayat eksekusi.'
                : 'Belum siap: HARMONY_LEAVE_CRON_ENABLED atau CRON_SECRET belum valid.'
            ) : '—'}</p>
          </div>
          <div className="rounded-[24px] border border-white/75 bg-white/75 p-5 shadow-[0_10px_30px_rgba(43,86,139,0.09)] backdrop-blur-xl">
            <p className="text-sm font-semibold text-slate-900">Eksekusi terakhir tercatat</p>
            {data?.scheduler?.last_run ? <>
              <p className="mt-2 text-sm text-slate-700">{data.scheduler.last_run.reference_date} • {data.scheduler.last_run.environment} • {data.scheduler.last_run.succeeded ? 'Berhasil' : 'Tidak lengkap'}</p>
              <p className="mt-1 text-sm text-slate-600">Diproses {data.scheduler.last_run.processed_count}; gagal {data.scheduler.last_run.failed_count}; tersisa {data.scheduler.last_run.remaining_count}; siklus baru {data.scheduler.last_run.created_cycles}.</p>
              <p className="mt-2 text-xs text-slate-500">Waktu catatan: {new Date(data.scheduler.last_run.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA.</p>
            </> : <p className="mt-2 text-sm text-slate-600">Belum ada eksekusi tercatat{data?.scheduler?.telemetry_available === false ? ' (SQL tabel monitoring belum tersedia).' : '.'}</p>}
          </div>
        </section>
        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={17} /> {error}</div>}
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ['Karyawan aktif', metrics?.active_employees, 'Total diperiksa'],
            ['Matang tahun ini', metrics?.matured_this_year, 'Hak cuti jatuh tempo'],
            ['Prioritas audit', (metrics?.high_priority || 0) + (metrics?.missing_maturity || 0) + (metrics?.overdue_debt || 0), 'Periksa sebelum koreksi'],
            ['Hutang belum lunas', metrics?.outstanding_debt, 'Tidak berarti jatuh tempo'],
          ] as const).map(([label, value, note]) => (
            <div key={label} className="rounded-[24px] border border-white/75 bg-white/65 p-5 shadow-[0_10px_32px_rgba(43,86,139,0.1)] backdrop-blur-xl">
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value ?? '—'}</p>
              <p className="mt-1 text-xs text-slate-500">{note}</p>
            </div>
          ))}
        </div>
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/75 shadow-[0_16px_48px_rgba(43,86,139,0.1)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ClipboardList size={19} className="text-sky-700" /> Hasil pemeriksaan</h2><p className="text-xs text-slate-500">{rows.length} karyawan ditampilkan. Tidak ada saldo yang diubah.</p></div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><Search size={15} /><input aria-label="Cari nama atau NPK" className="min-w-0 w-36 bg-transparent text-slate-900 outline-none sm:w-48" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / NPK" /></label>
              <select aria-label="Filter hasil audit" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"><option value="attention">Perlu perhatian</option><option value="high">Kritis & prioritas</option><option value="debt">Ada hutang</option><option value="verified">Terverifikasi HR</option><option value="all">Semua karyawan</option></select>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50/70 text-xs font-bold uppercase tracking-wide text-slate-600"><tr><th className="px-5 py-4">Karyawan</th><th className="px-4 py-4">Matang 2026</th><th className="px-4 py-4">Saldo kanonis</th><th className="px-4 py-4">Ledger aktif</th><th className="px-4 py-4">Digunakan</th><th className="px-4 py-4">Penyesuaian</th><th className="px-4 py-4">Hutang</th><th className="px-5 py-4">Status audit</th></tr></thead>
              <tbody className="divide-y divide-slate-200/70">
                {rows.map((r) => <tr key={r.employee_id} className="align-top hover:bg-sky-50/60"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{r.full_name || 'Tanpa nama'}</div><div className="mt-1 text-xs text-slate-500">NPK {r.employee_number || '—'}</div></td><td className="px-4 py-4 text-slate-700">{r.maturity_2026 || 'Belum matang'}</td><td className="px-4 py-4 font-semibold tabular-nums text-slate-900">{fmt(r.canonical_days)}</td><td className="px-4 py-4 tabular-nums text-slate-700">{fmt(r.legacy_remaining_days)}</td><td className="px-4 py-4 tabular-nums text-slate-700">{fmt(r.legacy_used_days)}</td><td className="px-4 py-4 tabular-nums text-slate-700">{fmt(r.adjustment_days)}</td><td className="px-4 py-4 tabular-nums text-slate-700">{fmt(r.debt_outstanding_days)}{r.next_debt_maturity && <div className="mt-1 text-xs text-slate-500">{r.next_debt_maturity}</div>}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${severityClass(r.severity)}`}>{['ok','verified'].includes(r.severity) ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>} {severityLabel(r.severity)}</span><p className="mt-2 max-w-[260px] text-xs leading-5 text-slate-600">{r.finding}</p></td></tr>)}
              </tbody>
            </table>
          </div>
          {!busy && rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Tidak ada karyawan pada filter ini.</p>}
          {busy && !data && <p className="p-8 text-center text-sm text-slate-500">Memuat audit cuti…</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 px-5 py-4 text-xs text-slate-600"><span>Catatan: angka legacy adalah sisa dari siklus aktif, bukan penjumlahan semua siklus lama.</span><Link className="font-semibold text-sky-700 hover:underline" href="/hr/leave/administration">Buka administrasi cuti</Link></div>
        </section>
      </div>
    </main>
  )
}
