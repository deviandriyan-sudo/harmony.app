'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Save, UsersRound, WalletCards, X } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedEntitlement } from '@/types/remed'

function parseMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9]/g, '')
  return cleaned ? Number(cleaned) : 0
}

function formatMoneyInput(value: number) {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value)))
}

export default function Page() {
  const [rows, setRows] = useState<RemedEntitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RemedEntitlement | null>(null)
  const [remainingInput, setRemainingInput] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const year = new Date().getFullYear()

  async function load() {
    setLoading(true)
    try {
      const payload = await remedFetch<{ entitlements: RemedEntitlement[] }>(`/api/remed/hr/entitlements?year=${year}`)
      setRows(payload.entitlements || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!selected) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) closeModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, saving])

  const usedAndReserved = useMemo(() => {
    if (!selected) return 0
    return Number(selected.legacy_used || 0) + Number(selected.current_used || 0) + Number(selected.reserved_amount || 0)
  }, [selected])

  const targetRemaining = parseMoneyInput(remainingInput)
  const targetPlafond = usedAndReserved + targetRemaining

  function openModal(row: RemedEntitlement) {
    setSelected(row)
    setRemainingInput(formatMoneyInput(Number(row.available_amount || 0)))
    setNote('Penyesuaian sisa plafond oleh HR')
    setModalError('')
  }

  function closeModal() {
    if (saving) return
    setSelected(null)
    setRemainingInput('')
    setNote('')
    setModalError('')
  }

  async function saveAdjustment() {
    if (!selected) return
    const remaining = parseMoneyInput(remainingInput)
    if (!Number.isFinite(remaining) || remaining < 0) {
      setModalError('Sisa plafond baru tidak valid.')
      return
    }

    setSaving(true)
    setModalError('')
    try {
      await remedFetch('/api/remed/hr/entitlements', {
        method: 'PUT',
        body: JSON.stringify({
          employee_id: selected.employee_id,
          period_year: year,
          plafond_total: usedAndReserved + remaining,
          note: note.trim() || 'Penyesuaian sisa plafond oleh HR',
        }),
      })
      await load()
      setSelected(null)
    } catch (error: any) {
      setModalError(error?.message || 'Gagal memperbarui sisa plafond.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · HR"
        title="Plafond Karyawan"
        description={`Kelola plafond medical reimbursement tahun ${year}. Tombol Edit Plafond menyesuaikan sisa saldo tanpa mengubah nilai pemakaian dan reserve yang sudah tercatat.`}
        icon={UsersRound}
        actions={(
          <button type="button" onClick={load} disabled={loading} className="harmony-button-secondary min-h-10 px-4">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      />

      <div className="harmony-unified-surface overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-[#f6f7f9]/70 text-[11px] font-bold uppercase tracking-[0.08em] text-[#777c85] backdrop-blur-xl">
            <tr>
              <th className="px-5 py-4 text-left">Karyawan</th>
              <th className="px-5 py-4 text-left">Plafond</th>
              <th className="px-5 py-4 text-left">Legacy Used</th>
              <th className="px-5 py-4 text-left">Current Used</th>
              <th className="px-5 py-4 text-left">Reserved</th>
              <th className="px-5 py-4 text-left">Tersedia</th>
              <th className="px-5 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.055]">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-white/35">
                <td className="px-5 py-4">
                  <p className="font-bold text-[#17181b]">{row.employee?.full_name || row.employee_id}</p>
                  <p className="mt-1 text-xs text-[#858a93]">{row.employee?.employee_number || '-'}</p>
                </td>
                <td className="px-5 py-4 font-semibold text-[#25272c]">{formatRupiah(row.plafond_total)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.legacy_used)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.current_used)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.reserved_amount)}</td>
                <td className="px-5 py-4 font-bold text-emerald-700">{formatRupiah(row.available_amount)}</td>
                <td className="px-5 py-4 text-right">
                  <button type="button" onClick={() => openModal(row)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-100/80 bg-emerald-50/80 px-4 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-xl transition hover:bg-emerald-100/85">
                    <WalletCards size={14} /> Edit Plafond
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0b1220]/28 p-4 backdrop-blur-[18px]" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal()
        }}>
          <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/70 bg-white/62 shadow-[0_32px_100px_rgba(20,36,62,0.28)] backdrop-blur-[42px] backdrop-saturate-[185%]">
            <div className="flex items-start justify-between border-b border-white/55 p-5 sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <WalletCards size={14} /> Re-Med · Penyesuaian Plafond
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#17181b]">{selected.employee?.full_name || 'Karyawan'}</h2>
                <p className="mt-1 text-sm text-[#737880]">{selected.employee?.employee_number || '-'} · Tahun {year}</p>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/75 bg-white/60 text-[#626872] shadow-sm transition hover:bg-white/85 disabled:opacity-50" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <BalanceCard label="Plafond Saat Ini" value={formatRupiah(selected.plafond_total)} />
                <BalanceCard label="Pemakaian" value={formatRupiah(Number(selected.legacy_used || 0) + Number(selected.current_used || 0))} />
                <BalanceCard label="Reserved" value={formatRupiah(selected.reserved_amount)} />
                <BalanceCard label="Sisa Saat Ini" value={formatRupiah(selected.available_amount)} accent />
              </div>

              <div className="rounded-[26px] border border-white/75 bg-white/46 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-5">
                <label className="block">
                  <span className="text-sm font-bold text-[#25272c]">Sisa Plafond Baru</span>
                  <p className="mt-1 text-xs leading-5 text-[#787d85]">Masukkan saldo yang ingin tersedia untuk karyawan. Sistem menghitung total plafond baru secara otomatis tanpa menghapus pemakaian atau reserve.</p>
                  <div className="mt-3 flex min-h-13 items-center rounded-[20px] border border-white/80 bg-white/60 px-4 shadow-sm">
                    <span className="mr-2 text-sm font-bold text-[#4c5159]">Rp</span>
                    <input
                      autoFocus
                      inputMode="numeric"
                      value={remainingInput}
                      onChange={(event) => setRemainingInput(formatMoneyInput(parseMoneyInput(event.target.value)))}
                      className="w-full bg-transparent text-base font-semibold text-[#17181b] outline-none"
                      placeholder="0"
                    />
                  </div>
                </label>

                <div className="mt-4 flex items-center justify-between rounded-[20px] border border-blue-100/70 bg-blue-50/60 px-4 py-3 text-sm">
                  <span className="text-[#5f6670]">Total plafond setelah penyesuaian</span>
                  <strong className="text-[#174f94]">{formatRupiah(targetPlafond)}</strong>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-[#25272c]">Catatan HR</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full rounded-[22px] border border-white/80 bg-white/52 px-4 py-3 text-sm outline-none shadow-sm backdrop-blur-xl focus:border-blue-200" placeholder="Alasan penyesuaian saldo" />
              </label>

              {modalError ? <div className="rounded-[20px] border border-red-100 bg-red-50/85 px-4 py-3 text-sm text-red-700">{modalError}</div> : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/55 p-5 sm:flex-row sm:justify-end sm:p-6">
              <button type="button" onClick={closeModal} disabled={saving} className="harmony-button-secondary min-h-11 px-5 disabled:opacity-50">Batal</button>
              <button type="button" onClick={saveAdjustment} disabled={saving} className="harmony-button-primary min-h-11 px-5 disabled:opacity-60">
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Menyimpan...' : 'Simpan Penyesuaian'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function BalanceCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-[22px] border p-4 shadow-sm backdrop-blur-xl ${accent ? 'border-emerald-100/80 bg-emerald-50/70' : 'border-white/75 bg-white/48'}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7b8088]">{label}</p>
      <p className={`mt-2 text-sm font-bold ${accent ? 'text-emerald-700' : 'text-[#25272c]'}`}>{value}</p>
    </div>
  )
}
