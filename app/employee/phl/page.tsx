'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react'

import { HarmonyPendingAttachmentPicker } from '@/components/attachments/HarmonyAttachments'
import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  cancelPHLWorkRequest,
  fetchPHLWorkRequests,
  formatPHLMinutes,
  phlWorkStatusLabel,
  submitPHLWorkRequest,
  type PHLWorkRequest,
} from '@/lib/phl-work'

type BalanceSummary = {
  total_available_days?: number | null
  active_ledger_balance?: number | null
  expiring_30_days?: number | null
  next_expiry?: string | null
}

const initialForm = {
  workDate: '',
  startTime: '',
  endTime: '',
  purpose: '',
  notes: '',
  files: [] as File[],
}

export default function EmployeePHLPage() {
  const [requests, setRequests] = useState<PHLWorkRequest[]>([])
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const stats = useMemo(() => ({
    pending: requests.filter((item) => item.status === 'pending_supervisor').length,
    approved: requests.filter((item) => item.status === 'approved').length,
    rejected: requests.filter((item) => item.status === 'rejected').length,
  }), [requests])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setMessage(null)
    try {
      const [requestRows, balanceResult] = await Promise.all([
        fetchPHLWorkRequests('mine'),
        supabase.rpc('get_my_phl_balance_summary'),
      ])
      setRequests(requestRows)
      if (!balanceResult.error) setBalance((balanceResult.data || null) as BalanceSummary | null)
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Data PHL gagal dimuat.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)

    if (!form.workDate || !form.startTime || !form.endTime) {
      setMessage({ type: 'error', text: 'Tanggal serta jam mulai/selesai wajib diisi.' })
      return
    }
    if (form.purpose.trim().length < 5) {
      setMessage({ type: 'error', text: 'Keperluan/penugasan minimal 5 karakter.' })
      return
    }
    if (form.files.length < 1) {
      setMessage({ type: 'error', text: 'Surat Tugas/evidence wajib dilampirkan.' })
      return
    }

    setSubmitting(true)
    try {
      const result = await submitPHLWorkRequest({
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose.trim(),
        notes: form.notes.trim(),
        files: form.files,
      })
      setForm(initialForm)
      setMessage({
        type: 'success',
        text: result.notification?.ok === false
          ? `Pengajuan tersimpan dan menunggu atasan. Namun email notifikasi belum terkirim: ${result.notification.message}`
          : 'Pengajuan PHL tersimpan dan langsung dikirim ke atasan.',
      })
      await load()
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Pengajuan PHL gagal dikirim.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(item: PHLWorkRequest) {
    const note = window.prompt('Alasan pembatalan pengajuan PHL:')
    if (note === null) return
    try {
      await cancelPHLWorkRequest(item.id, note)
      setMessage({ type: 'success', text: 'Pengajuan PHL berhasil dibatalkan.' })
      await load()
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Pengajuan PHL gagal dibatalkan.' })
    }
  }

  return (
    <>
      <Topbar
        title="Pengajuan Saldo PHL"
        description="Ajukan saldo PHL berdasarkan penugasan, evidence, dan minimal 4 jam kerja tercatat."
      />

      <section className="space-y-6 p-4 sm:p-6">
        {message && (
          <div className={[
            'rounded-2xl border p-4 text-sm leading-6',
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-orange-200 bg-orange-50 text-orange-700',
          ].join(' ')}>
            <div className="flex items-start gap-2 font-semibold">
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="harmony-hero-v25 p-6 sm:p-7">
          <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
                <ShieldCheck size={15} /> Workflow Saldo PHL
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">Pengajuan Saldo PHL</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
                Ajukan penugasan PHL dengan Surat Tugas/evidence. Setelah disetujui atasan, saldo +1 PHL langsung terbentuk dan berlaku 90 hari.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[540px]">
              <Metric label="Saldo Aktif" value={String(Number(balance?.total_available_days || 0))} />
              <Metric label="Pending" value={String(stats.pending)} />
              <Metric label="Approved" value={String(stats.approved)} />
              <Metric label="Rejected" value={String(stats.rejected)} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={handleSubmit} className="harmony-card p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                <FilePlus2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1d1d1f]">Ajukan PHL</h2>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">Weekday, weekend, maupun hari libur diperbolehkan selama absensi pada tanggal tersebut minimal 4 jam.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal Pelaksanaan">
                <input
                  type="date"
                  value={form.workDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, workDate: event.target.value }))}
                  className="harmony-input"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jam Mulai">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                    className="harmony-input"
                    required
                  />
                </Field>
                <Field label="Jam Selesai">
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                    className="harmony-input"
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Ditugaskan untuk apa?">
                <textarea
                  value={form.purpose}
                  onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                  className="harmony-input min-h-24 py-3"
                  placeholder="Contoh: Pendampingan kegiatan mahasiswa / maintenance / kegiatan institusi"
                  required
                />
              </Field>
              <Field label="Catatan tambahan">
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="harmony-input min-h-20 py-3"
                  placeholder="Opsional"
                />
              </Field>

              <HarmonyPendingAttachmentPicker
                files={form.files}
                onChange={(files) => setForm((prev) => ({ ...prev, files }))}
                label="Surat Tugas / Evidence"
                description="Wajib minimal 1 file dan maksimal 3 file."
                required
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-5 text-sm font-bold text-white transition hover:bg-[#006ee6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <FilePlus2 size={18} />}
              Kirim ke Atasan
            </button>
          </form>

          <div className="harmony-card overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 border-b border-black/5 p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-semibold text-[#1d1d1f]">Riwayat Pengajuan</h2>
                <p className="mt-1 text-sm text-[#6e6e73]">Saldo otomatis bertambah setelah status Approved.</p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#007aff] disabled:opacity-50"
              >
                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]"><Loader2 size={18} className="animate-spin" />Memuat pengajuan...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#86868b]">Belum ada pengajuan PHL.</div>
            ) : (
              <div className="divide-y divide-black/5">
                {requests.map((item) => (
                  <div key={item.id} className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                          <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#6e6e73]">{dayTypeLabel(item.work_day_type)}</span>
                          {item.origin === 'legacy_attendance' && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Migrasi Absensi Lama</span>}
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-[#1d1d1f]">{item.work_purpose}</h3>
                        <p className="mt-2 text-sm text-[#6e6e73]">{formatDate(item.work_date)} · {item.work_start_time.slice(0, 5)}–{item.work_end_time.slice(0, 5)}</p>
                      </div>
                      {item.status === 'pending_supervisor' && (
                        <button
                          type="button"
                          onClick={() => void handleCancel(item)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 text-xs font-bold text-red-600"
                        >
                          <XCircle size={15} /> Batalkan
                        </button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Info label="Durasi Form" value={formatPHLMinutes(item.requested_work_minutes)} icon={<Clock3 size={15} />} />
                      <Info label="Durasi Absensi" value={formatPHLMinutes(item.recorded_work_minutes)} icon={<CheckCircle2 size={15} />} />
                      <Info label="Saldo" value={item.status === 'approved' ? '+1 PHL' : 'Belum berubah'} icon={<WalletCards size={15} />} />
                    </div>

                    {item.attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.signed_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2 text-xs font-bold text-[#0059b8]"
                          >
                            <FileText size={14} /> {attachment.file_name}
                          </a>
                        ))}
                      </div>
                    )}

                    {item.supervisor_note && (
                      <p className="mt-4 rounded-2xl bg-[#f5f5f7] p-3 text-xs leading-5 text-[#6e6e73]">Catatan atasan: <strong>{item.supervisor_note}</strong></p>
                    )}
                    {item.status === 'approved' && item.expired_at && (
                      <p className="mt-3 text-xs font-semibold text-green-700">Saldo berlaku sampai {formatDate(item.expired_at)}.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#86868b]">{label}</span>
      {children}
    </label>
  )
}

function Info({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7] p-3">
      <div className="flex items-center gap-2 text-[#007aff]">{icon}<span className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">{label}</span></div>
      <p className="mt-2 text-sm font-bold text-[#1d1d1f]">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const value = String(status || '').toLowerCase()
  const className = value === 'approved'
    ? 'bg-green-50 text-green-700'
    : value === 'rejected' || value === 'cancelled'
      ? 'bg-red-50 text-red-600'
      : 'bg-orange-50 text-orange-700'
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
