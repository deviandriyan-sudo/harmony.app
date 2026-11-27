'use client'


import { readErrorMessage } from '@/lib/error-utils'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FileText, Loader2, RefreshCcw, ShieldCheck, WalletCards, XCircle } from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { HarmonyPortaledOverlay } from '@/components/ui/HarmonyPortaledOverlay'
import { harmonyFetch } from '@/lib/harmony-client'
import { phlWorkApprovalExpired } from '@/lib/phl-work-expiry'
import {
  fetchPHLWorkRequests,
  formatPHLMinutes,
  openPHLWorkEvidence,
  phlWorkStatusLabel,
  type PHLWorkRequest,
} from '@/lib/phl-work'

type Filter = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'legacy' | 'historical' | 'all'

export default function HRPHLPage() {
  const [requests, setRequests] = useState<PHLWorkRequest[]>([])
  const [filter, setFilter] = useState<Filter>('legacy')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [message, setMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [reviewTarget, setReviewTarget] = useState<PHLWorkRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewOutcome, setReviewOutcome] = useState<'validated_historical' | 'rejected_historical'>('validated_historical')
  const [processing, setProcessing] = useState(false)

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'pending_supervisor').length,
    approved: requests.filter((item) => item.status === 'approved').length,
    rejected: requests.filter((item) => item.status === 'rejected').length,
    legacy: requests.filter((item) => item.status === 'pending_supervisor' && item.origin === 'legacy_attendance' && phlWorkApprovalExpired(item.work_date)).length,
    historical: requests.filter((item) => item.status === 'resolved_legacy').length,
  }), [requests])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return requests.filter((item) => {
      if (filter === 'legacy') {
        if (!(item.status === 'pending_supervisor' && item.origin === 'legacy_attendance' && phlWorkApprovalExpired(item.work_date))) return false
      } else if (filter === 'historical') {
        if (item.status !== 'resolved_legacy') return false
      } else if (filter !== 'all') {
        if (filter === 'pending' && item.status !== 'pending_supervisor') return false
        if (filter !== 'pending' && item.status !== filter) return false
      }
      if (!keyword) return true
      return [
        item.full_name,
        item.employee_number,
        item.department,
        item.position,
        item.work_purpose,
        item.supervisor_name,
      ].join(' ').toLowerCase().includes(keyword)
    })
  }, [requests, filter, search])

  useEffect(() => { void load() }, [])

  async function submitHistoricalReview() {
    if (!reviewTarget || processing) return
    if (reviewNote.trim().length < 10) {
      setReviewError('Catatan HR minimal 10 karakter dan harus menjelaskan hasil verifikasi migrasi.')
      return
    }
    if (!window.confirm('Konfirmasi validasi historis? Keputusan tercatat permanen, tanpa menambah saldo PHL.')) return
    setProcessing(true)
    setReviewError('')
    setMessage('')
    setSuccessMessage('')
    try {
      const response = await harmonyFetch<{success:boolean;message:string}>('/api/hr/phl/legacy-review', {
        method:'POST', body:JSON.stringify({id:reviewTarget.id,outcome:reviewOutcome,note:reviewNote.trim()})
      })
      setReviewTarget(null)
      setReviewNote('')
      await load()
      setSuccessMessage(response.message || 'Validasi historis disimpan tanpa perubahan saldo.')
    } catch (error:unknown) {
      setReviewError(readErrorMessage(error) || 'Validasi PHL historis gagal.')
    } finally {
      setProcessing(false)
    }
  }

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      setRequests(await fetchPHLWorkRequests('all'))
      setHasLoaded(true)
    } catch (error: unknown) {
      setMessage(readErrorMessage(error) || 'Data monitoring PHL gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="PHL" description="Monitoring pengajuan, approval atasan, dan pembentukan saldo PHL." />
      <section className="space-y-6 p-4 sm:p-6">
        {successMessage && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{successMessage}</div>}
        {message && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <div className="flex gap-2 font-semibold"><AlertTriangle size={18} />{message}</div>
          </div>
        )}

        <div className="harmony-hero-v25 p-6 sm:p-7">
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75"><ShieldCheck size={15} />PHL Monitoring</div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">Monitoring Pengajuan Saldo PHL</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">HR memonitor saldo PHL dan memvalidasi pengajuan migrasi lama dengan catatan. Validasi historis tidak menambah saldo yang sudah kedaluwarsa.</p>
            </div>
            <div className="grid grid-cols-4 gap-3 xl:min-w-[560px]">
              <Metric label="Total" value={hasLoaded ? counts.total : '—'} />
              <Metric label="Pending" value={hasLoaded ? counts.pending : '—'} />
              <Metric label="Approved" value={hasLoaded ? counts.approved : '—'} />
              <Metric label="Rejected" value={hasLoaded ? counts.rejected : '—'} />
            </div>
          </div>
        </div>

        <div className="harmony-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['legacy', 'historical', 'pending', 'approved', 'rejected', 'cancelled', 'all'] as Filter[]).map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)} className={[
                  'rounded-full px-4 py-2 text-xs font-bold',
                  filter === item ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] harmony-text-secondary',
                ].join(' ')}>
                  {item === 'legacy' ? `Migrasi · Perlu HR (${hasLoaded ? counts.legacy : '—'})` : item === 'historical' ? `Selesai Historis (${hasLoaded ? counts.historical : '—'})` : item === 'all' ? 'Semua' : item === 'pending' ? 'Pending' : item === 'approved' ? 'Approved' : item === 'rejected' ? 'Rejected' : 'Cancelled'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="harmony-input min-w-0 xl:w-[320px]" placeholder="Cari karyawan / tugas / unit..." />
              <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] harmony-text-link"><RefreshCcw size={17} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="harmony-card flex items-center gap-3 p-6 text-sm harmony-text-secondary"><Loader2 size={18} className="animate-spin" />Memuat data PHL...</div>
        ) : !hasLoaded ? (
          <div className="harmony-card p-8 text-center text-sm harmony-text-muted">Data belum berhasil dimuat. Gunakan tombol refresh.</div>
        ) : filtered.length === 0 ? (
          <div className="harmony-card p-8 text-center text-sm harmony-text-muted">Tidak ada data PHL pada filter ini.</div>
        ) : (
          <div className="harmony-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-[#f5f5f7] text-xs uppercase tracking-wide harmony-text-muted">
                  <tr>
                    <th className="px-4 py-3">Karyawan</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Penugasan</th>
                    <th className="px-4 py-3">Durasi</th>
                    <th className="px-4 py-3">Evidence</th>
                    <th className="px-4 py-3">Atasan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Saldo</th>
                    <th className="px-4 py-3">Tindakan HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-bold harmony-text-primary">{item.full_name || '-'}</p>
                        {item.origin === 'legacy_attendance' && <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Migrasi Absensi Lama</span>}
                        <p className="mt-1 text-xs harmony-text-muted">{item.employee_number || '-'} · {item.department || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold harmony-text-primary">{formatDate(item.work_date)}</p>
                        <p className="mt-1 text-xs harmony-text-muted">{dayTypeLabel(item.work_day_type)}</p>
                      </td>
                      <td className="max-w-[260px] px-4 py-4">
                        <p className="font-semibold leading-5 harmony-text-primary">{item.work_purpose}</p>
                        <p className="mt-1 text-xs harmony-text-muted">{item.work_start_time.slice(0, 5)}–{item.work_end_time.slice(0, 5)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold harmony-text-primary">{item.attendance_verified ? formatPHLMinutes(item.recorded_work_minutes) : formatPHLMinutes(item.requested_work_minutes)}</p>
                        <p className="mt-1 text-xs harmony-text-muted">{item.attendance_verified ? 'Absensi tercatat' : 'Jam form · sinkron saat approve'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[220px] flex-col gap-1.5">
                          {item.attachments.map((attachment) => (
                            <button key={attachment.id} type="button" onClick={() => void openPHLWorkEvidence(attachment.id).catch((error: unknown) => setMessage(readErrorMessage(error) || 'Evidence tidak dapat dibuka.'))} className="inline-flex items-center gap-2 text-left text-xs font-bold harmony-text-link"><FileText size={13} />{attachment.file_name}</button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold harmony-text-primary">{item.supervisor_name || '-'}</p>
                        {item.supervisor_note && <p className="mt-1 max-w-[220px] text-xs leading-5 harmony-text-muted">{item.supervisor_note}</p>}
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={item.status} />{item.status === 'resolved_legacy' && <p className="mt-2 max-w-[240px] text-xs leading-5 text-slate-700">{item.hr_review_outcome === 'validated_historical' ? 'Divalidasi historis' : 'Dinyatakan tidak valid'}<span className="mt-1 block text-slate-500">{item.hr_review_note || ''}</span></p>}</td>
                      <td className="px-4 py-4">
                        {item.status === 'approved' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"><WalletCards size={13} />+1 PHL</span>
                            <p className="mt-2 text-xs harmony-text-muted">s.d. {item.expired_at ? formatDate(item.expired_at) : '-'}</p>
                          </div>
                        ) : <span className="text-xs font-semibold harmony-text-muted">Tidak berubah</span>}
                      </td>
                      <td className="px-4 py-4">
                        {item.status === 'pending_supervisor' && item.origin === 'legacy_attendance' && phlWorkApprovalExpired(item.work_date) ? (
                          <button type="button" onClick={() => {setReviewTarget(item);setReviewNote('');setReviewOutcome('validated_historical');setReviewError('');setMessage('')}} className="inline-flex min-h-10 items-center rounded-full border border-blue-200 bg-blue-50 px-4 text-xs font-semibold text-blue-800 hover:bg-blue-100">Validasi Historis HR</button>
                        ) : <span className="text-xs text-slate-500">{item.status === 'resolved_legacy' ? 'Sudah diputuskan' : '—'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      {reviewTarget && (
        <HarmonyPortaledOverlay role="dialog" aria-modal="true" aria-label="Validasi Historis PHL oleh HR" className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <button type="button" aria-label="Tutup validasi" onClick={() => !processing && setReviewTarget(null)} className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-xl rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_34px_90px_rgba(15,23,42,.24)]">
            <h2 className="text-xl font-semibold text-slate-900">Validasi Historis PHL</h2>
            <p className="mt-2 text-sm text-slate-600">{reviewTarget.full_name} · {reviewTarget.work_date}</p>
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Hanya untuk data migrasi kedaluwarsa. Keputusan HR dicatat untuk audit dan <strong>tidak menghasilkan saldo PHL</strong>. Koreksi hak saldo harus dilakukan melalui mekanisme adjustment HR yang terpisah.</p>
            <fieldset className="mt-4 space-y-2">
              <legend className="text-xs font-semibold text-slate-700">Keputusan HR</legend>
              <label className="flex items-center gap-2 text-sm text-slate-800"><input type="radio" checked={reviewOutcome === 'validated_historical'} onChange={() => setReviewOutcome('validated_historical')} /> Validasi riwayat penugasan (tanpa kredit saldo)</label>
              <label className="flex items-center gap-2 text-sm text-slate-800"><input type="radio" checked={reviewOutcome === 'rejected_historical'} onChange={() => setReviewOutcome('rejected_historical')} /> Data historis tidak valid / ditolak</label>
            </fieldset>
            <label htmlFor="rc3g-hr-note" className="mt-4 block text-xs font-semibold text-slate-700">Catatan pemeriksaan HR (wajib)</label>
            <textarea id="rc3g-hr-note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={2000} rows={4} placeholder="Jelaskan bukti absensi lama, alasan keputusan, dan hasil rekonsiliasi..." className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500" />
            <p className="text-xs text-slate-500">Minimal 10 karakter. Keputusan tidak dapat diulang pada record yang sama.</p>
            {reviewError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{reviewError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setReviewTarget(null)} disabled={processing} className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700">Batal</button>
              <button type="button" disabled={processing || reviewNote.trim().length < 10} onClick={() => void submitHistoricalReview()} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{processing ? 'Menyimpan...' : 'Simpan Keputusan HR'}</button>
            </div>
          </div>
        </HarmonyPortaledOverlay>
      )}
    </>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>
}

function StatusBadge({ status }: { status: string }) {
  const value = status.toLowerCase()
  const className = value === 'resolved_legacy' ? 'bg-blue-50 text-blue-700' : value === 'approved' ? 'bg-green-50 text-green-700' : value === 'rejected' || value === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-700'
  const icon = value === 'approved' ? <CheckCircle2 size={13} /> : value === 'rejected' || value === 'cancelled' ? <XCircle size={13} /> : <Clock3 size={13} />
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${className}`}>{icon}{phlWorkStatusLabel(status)}</span>
}

function dayTypeLabel(value: string) {
  if (value === 'holiday') return 'Hari Libur'
  if (value === 'weekend') return 'Weekend'
  return 'Weekday'
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
