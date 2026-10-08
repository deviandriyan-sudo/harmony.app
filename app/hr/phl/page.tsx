'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import {
  fetchPHLWorkRequests,
  formatPHLMinutes,
  phlWorkStatusLabel,
  type PHLWorkRequest,
} from '@/lib/phl-work'

type Filter = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all'

export default function HRPHLPage() {
  const [requests, setRequests] = useState<PHLWorkRequest[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'pending_supervisor').length,
    approved: requests.filter((item) => item.status === 'approved').length,
    rejected: requests.filter((item) => item.status === 'rejected').length,
  }), [requests])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return requests.filter((item) => {
      if (filter !== 'all') {
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

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      setRequests(await fetchPHLWorkRequests('all'))
    } catch (error: any) {
      setMessage(error?.message || 'Data monitoring PHL gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="PHL" description="Monitoring pengajuan, approval atasan, dan pembentukan saldo PHL." />
      <section className="space-y-6 p-4 sm:p-6">
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
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">HR memonitor dan melakukan adjustment bila diperlukan. Approval saldo dilakukan langsung oleh atasan.</p>
            </div>
            <div className="grid grid-cols-4 gap-3 xl:min-w-[560px]">
              <Metric label="Total" value={counts.total} />
              <Metric label="Pending" value={counts.pending} />
              <Metric label="Approved" value={counts.approved} />
              <Metric label="Rejected" value={counts.rejected} />
            </div>
          </div>
        </div>

        <div className="harmony-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as Filter[]).map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)} className={[
                  'rounded-full px-4 py-2 text-xs font-bold',
                  filter === item ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] text-[#6e6e73]',
                ].join(' ')}>
                  {item === 'all' ? 'Semua' : item === 'pending' ? 'Pending' : item === 'approved' ? 'Approved' : item === 'rejected' ? 'Rejected' : 'Cancelled'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="harmony-input min-w-0 xl:w-[320px]" placeholder="Cari karyawan / tugas / unit..." />
              <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#0059b8]"><RefreshCcw size={17} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="harmony-card flex items-center gap-3 p-6 text-sm text-[#6e6e73]"><Loader2 size={18} className="animate-spin" />Memuat data PHL...</div>
        ) : filtered.length === 0 ? (
          <div className="harmony-card p-8 text-center text-sm text-[#86868b]">Tidak ada data PHL pada filter ini.</div>
        ) : (
          <div className="harmony-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-[#f5f5f7] text-xs uppercase tracking-wide text-[#86868b]">
                  <tr>
                    <th className="px-4 py-3">Karyawan</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Penugasan</th>
                    <th className="px-4 py-3">Durasi</th>
                    <th className="px-4 py-3">Evidence</th>
                    <th className="px-4 py-3">Atasan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-bold text-[#1d1d1f]">{item.full_name || '-'}</p>
                        {item.origin === 'legacy_attendance' && <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Migrasi Absensi Lama</span>}
                        <p className="mt-1 text-xs text-[#86868b]">{item.employee_number || '-'} · {item.department || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#1d1d1f]">{formatDate(item.work_date)}</p>
                        <p className="mt-1 text-xs text-[#86868b]">{dayTypeLabel(item.work_day_type)}</p>
                      </td>
                      <td className="max-w-[260px] px-4 py-4">
                        <p className="font-semibold leading-5 text-[#1d1d1f]">{item.work_purpose}</p>
                        <p className="mt-1 text-xs text-[#86868b]">{item.work_start_time.slice(0, 5)}–{item.work_end_time.slice(0, 5)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-[#1d1d1f]">{formatPHLMinutes(item.recorded_work_minutes)}</p>
                        <p className="mt-1 text-xs text-[#86868b]">Absensi tercatat</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[220px] flex-col gap-1.5">
                          {item.attachments.map((attachment) => (
                            <a key={attachment.id} href={attachment.signed_url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-[#0059b8]"><FileText size={13} />{attachment.file_name}</a>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#1d1d1f]">{item.supervisor_name || '-'}</p>
                        {item.supervisor_note && <p className="mt-1 max-w-[220px] text-xs leading-5 text-[#86868b]">{item.supervisor_note}</p>}
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-4">
                        {item.status === 'approved' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"><WalletCards size={13} />+1 PHL</span>
                            <p className="mt-2 text-xs text-[#86868b]">s.d. {item.expired_at ? formatDate(item.expired_at) : '-'}</p>
                          </div>
                        ) : <span className="text-xs font-semibold text-[#86868b]">Tidak berubah</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>
}

function StatusBadge({ status }: { status: string }) {
  const value = status.toLowerCase()
  const className = value === 'approved' ? 'bg-green-50 text-green-700' : value === 'rejected' || value === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-700'
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
