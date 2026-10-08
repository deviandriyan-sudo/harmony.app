'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import {
  fetchPHLWorkRequests,
  formatPHLMinutes,
  phlWorkStatusLabel,
  reviewPHLWorkRequest,
  type PHLWorkRequest,
} from '@/lib/phl-work'

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

export default function PHLApprovalPage() {
  const [requests, setRequests] = useState<PHLWorkRequest[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filtered = useMemo(() => requests.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'pending') return item.status === 'pending_supervisor'
    return item.status === filter
  }), [requests, filter])

  const counts = useMemo(() => ({
    pending: requests.filter((item) => item.status === 'pending_supervisor').length,
    approved: requests.filter((item) => item.status === 'approved').length,
    rejected: requests.filter((item) => item.status === 'rejected').length,
  }), [requests])

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    setMessage(null)
    try {
      setRequests(await fetchPHLWorkRequests('team'))
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Data approval PHL gagal dimuat.' })
    } finally {
      setLoading(false)
    }
  }

  async function decide(item: PHLWorkRequest, decision: 'approve' | 'reject') {
    const defaultText = decision === 'approve' ? 'Disetujui oleh atasan.' : ''
    const note = window.prompt(
      decision === 'approve' ? 'Catatan approval atasan:' : 'Alasan penolakan:',
      defaultText,
    )
    if (note === null) return
    if (decision === 'reject' && note.trim().length < 3) {
      setMessage({ type: 'error', text: 'Alasan penolakan minimal 3 karakter.' })
      return
    }

    const confirmText = decision === 'approve'
      ? 'Approve PHL ini? Saldo employee akan langsung bertambah +1 PHL dan masuk ke absensi.'
      : 'Tolak pengajuan PHL ini?'
    if (!window.confirm(confirmText)) return

    setProcessing(item.id)
    setMessage(null)
    try {
      const result = await reviewPHLWorkRequest(item.id, decision, note.trim())
      setMessage({
        type: 'success',
        text: result.notification?.ok === false
          ? `${result.message} Namun email employee belum terkirim: ${result.notification.message}`
          : result.message,
      })
      await load()
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Approval PHL gagal diproses.' })
    } finally {
      setProcessing('')
    }
  }

  return (
    <>
      <Topbar title="Approval Saldo PHL" description="Review pengajuan saldo PHL bawahan melalui workflow khusus PHL." />
      <section className="space-y-6 p-4 sm:p-6">
        {message && (
          <div className={[
            'rounded-2xl border p-4 text-sm leading-6',
            message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700',
          ].join(' ')}>
            <div className="flex items-start gap-2 font-semibold">
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              {message.text}
            </div>
          </div>
        )}

        <div className="harmony-hero-v25 p-6 sm:p-7">
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75"><ShieldCheck size={15} />Supervisor PHL</div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">Review Pengajuan Saldo PHL</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Pastikan Surat Tugas, tujuan penugasan, jam kerja, dan absensi minimal 4 jam sudah sesuai.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 xl:min-w-[420px]">
              <Metric label="Pending" value={counts.pending} />
              <Metric label="Approved" value={counts.approved} />
              <Metric label="Rejected" value={counts.rejected} />
            </div>
          </div>
        </div>

        <div className="harmony-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={[
                    'rounded-full px-4 py-2 text-xs font-bold transition',
                    filter === item ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] text-[#6e6e73]',
                  ].join(' ')}
                >
                  {item === 'pending' ? 'Pending' : item === 'approved' ? 'Approved' : item === 'rejected' ? 'Rejected' : 'Semua'}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8] disabled:opacity-50">
              <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="harmony-card flex items-center gap-3 p-6 text-sm text-[#6e6e73]"><Loader2 size={18} className="animate-spin" />Memuat approval PHL...</div>
        ) : filtered.length === 0 ? (
          <div className="harmony-card p-8 text-center text-sm text-[#86868b]">Tidak ada pengajuan PHL pada filter ini.</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((item) => (
              <article key={item.id} className="harmony-card p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#6e6e73]">{dayTypeLabel(item.work_day_type)}</span>
                      {item.origin === 'legacy_attendance' && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Migrasi Absensi Lama</span>}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-[#1d1d1f]">{item.full_name || '-'}</h2>
                    <p className="mt-1 text-xs text-[#86868b]">{item.employee_number || '-'} · {item.department || '-'} · {item.position || '-'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-[#1d1d1f]">{formatDate(item.work_date)}</p>
                    <p className="mt-1 text-xs text-[#86868b]">{item.work_start_time.slice(0, 5)}–{item.work_end_time.slice(0, 5)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-[#f5f5f7] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">Penugasan</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#1d1d1f]">{item.work_purpose}</p>
                  {item.notes && <p className="mt-2 text-xs leading-5 text-[#6e6e73]">{item.notes}</p>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Info label="Durasi Form" value={formatPHLMinutes(item.requested_work_minutes)} icon={<Clock3 size={15} />} />
                  <Info label="Durasi Absensi" value={formatPHLMinutes(item.recorded_work_minutes)} icon={<CheckCircle2 size={15} />} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.signed_url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#e8f2ff] px-3 py-2 text-xs font-bold text-[#0059b8]">
                      <FileText size={14} />{attachment.file_name}
                    </a>
                  ))}
                </div>

                {item.supervisor_note && item.status !== 'pending_supervisor' && (
                  <p className="mt-4 rounded-2xl border border-black/5 bg-white p-3 text-xs leading-5 text-[#6e6e73]">Catatan: <strong>{item.supervisor_note}</strong></p>
                )}

                {item.status === 'pending_supervisor' && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={processing === item.id}
                      onClick={() => void decide(item, 'reject')}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 text-sm font-bold text-red-600 disabled:opacity-50"
                    >
                      <XCircle size={17} />Reject
                    </button>
                    <button
                      type="button"
                      disabled={processing === item.id}
                      onClick={() => void decide(item, 'approve')}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {processing === item.id ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                      Approve +1 PHL
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>
}

function Info({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="rounded-2xl bg-[#f5f5f7] p-3"><div className="flex items-center gap-2 text-[#007aff]">{icon}<span className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">{label}</span></div><p className="mt-2 text-sm font-bold text-[#1d1d1f]">{value}</p></div>
}

function StatusBadge({ status }: { status: string }) {
  const value = status.toLowerCase()
  const className = value === 'approved' ? 'bg-green-50 text-green-700' : value === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-700'
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{phlWorkStatusLabel(status)}</span>
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
