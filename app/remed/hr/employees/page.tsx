'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Save, SlidersHorizontal, UsersRound, WalletCards, X } from 'lucide-react'
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

type AdjustmentMode = 'balance' | 'plafond'

export default function Page() {
  const [rows, setRows] = useState<RemedEntitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RemedEntitlement | null>(null)
  const [mode, setMode] = useState<AdjustmentMode>('balance')
  const [remainingInput, setRemainingInput] = useState('')
  const [plafondInput, setPlafondInput] = useState('')
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

  function openModal(row: RemedEntitlement, nextMode: AdjustmentMode = 'balance') {
    setSelected(row)
    setMode(nextMode)
    setRemainingInput(formatMoneyInput(Math.max(0, Number(row.available_amount || 0))))
    setPlafondInput(formatMoneyInput(Number(row.plafond_total || 0)))
    setNote(nextMode === 'balance' ? 'Penyesuaian sisa plafond oleh HR' : 'Perubahan plafond dasar karena perubahan level jabatan')
    setModalError('')
  }

  function closeModal() {
    if (saving) return
    setSelected(null)
    setModalError('')
  }

  function changeMode(nextMode: AdjustmentMode) {
    setMode(nextMode)
    setModalError('')
    setNote(nextMode === 'balance' ? 'Penyesuaian sisa plafond oleh HR' : 'Perubahan plafond dasar karena perubahan level jabatan')
  }

  async function saveAdjustment() {
    if (!selected) return
    setSaving(true)
    setModalError('')

    try {
      let result: { notification?: { ok?: boolean; message?: string } | null }

      if (mode === 'balance') {
        const targetAvailable = parseMoneyInput(remainingInput)
        result = await remedFetch('/api/remed/hr/entitlements', {
          method: 'PUT',
          body: JSON.stringify({
            action: 'adjust_balance',
            employee_id: selected.employee_id,
            period_year: year,
            target_available: targetAvailable,
            note: note.trim() || 'Penyesuaian sisa plafond oleh HR',
          }),
        })
      } else {
        const plafondTotal = parseMoneyInput(plafondInput)
        result = await remedFetch('/api/remed/hr/entitlements', {
          method: 'PUT',
          body: JSON.stringify({
            action: 'set_plafond',
            employee_id: selected.employee_id,
            period_year: year,
            plafond_total: plafondTotal,
            note: note.trim() || 'Perubahan plafond dasar karena perubahan level jabatan',
          }),
        })
      }

      await load()
      setSelected(null)
      if (result.notification?.ok === false) {
        window.alert(`Data plafond berhasil disimpan, tetapi email notifikasi belum terkirim lengkap: ${result.notification.message || 'cek konfigurasi notifikasi.'}`)
      }
    } catch (error: any) {
      setModalError(error?.message || 'Gagal memperbarui plafond.')
    } finally {
      setSaving(false)
    }
  }

  const previewPlafond = parseMoneyInput(plafondInput)
  const plafondDelta = selected ? previewPlafond - Number(selected.plafond_total || 0) : 0
  const projectedAvailable = selected ? Number(selected.available_amount || 0) + plafondDelta : 0

  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · HR"
        title="Plafond Karyawan"
        description={`Pisahkan plafond dasar berdasarkan level jabatan dari sisa saldo yang benar-benar tersedia untuk tahun ${year}.`}
        icon={UsersRound}
        actions={(
          <button type="button" onClick={load} disabled={loading} className="harmony-button-secondary min-h-10 px-4">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      />

      <div className="harmony-unified-surface overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-[#f6f7f9]/70 text-[11px] font-bold uppercase tracking-[0.08em] text-[#777c85] backdrop-blur-xl">
            <tr>
              <th className="px-5 py-4 text-left">Karyawan</th>
              <th className="px-5 py-4 text-left">Plafond Dasar</th>
              <th className="px-5 py-4 text-left">Penyesuaian HR</th>
              <th className="px-5 py-4 text-left">Pemakaian</th>
              <th className="px-5 py-4 text-left">Reserved</th>
              <th className="px-5 py-4 text-left">Sisa Tersedia</th>
              <th className="px-5 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.055]">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-white/35">
                <td className="px-5 py-4">
                  <p className="font-bold text-[#17181b]">{row.employee?.full_name || row.employee_id}</p>
                  <p className="mt-1 text-xs text-[#858a93]">{row.employee?.employee_number || '-'} · {row.employee?.position || '-'}</p>
                </td>
                <td className="px-5 py-4 font-semibold text-[#25272c]">{formatRupiah(row.plafond_total)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.balance_adjustment || 0)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(Number(row.legacy_used || 0) + Number(row.current_used || 0))}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.reserved_amount)}</td>
                <td className={`px-5 py-4 font-bold ${Number(row.available_amount || 0) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatRupiah(row.available_amount)}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex rounded-full border border-white/75 bg-white/55 p-1 shadow-sm backdrop-blur-xl">
                    <button type="button" onClick={() => openModal(row, 'balance')} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50/90">
                      <WalletCards size={14} /> Edit Sisa
                    </button>
                    <button type="button" onClick={() => openModal(row, 'plafond')} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50/90">
                      <SlidersHorizontal size={14} /> Ubah Plafond
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="harmony-modal-surface fixed inset-0 z-[120] flex items-center justify-center bg-[#0b1220]/28 p-4 backdrop-blur-[18px]" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal()
        }}>
          <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/70 bg-white/62 shadow-[0_32px_100px_rgba(20,36,62,0.28)] backdrop-blur-[42px] backdrop-saturate-[185%]">
            <div className="flex items-start justify-between border-b border-white/55 p-5 sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <WalletCards size={14} /> Re-Med · Kelola Plafond
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#17181b]">{selected.employee?.full_name || 'Karyawan'}</h2>
                <p className="mt-1 text-sm text-[#737880]">{selected.employee?.employee_number || '-'} · {selected.employee?.position || '-'} · Tahun {year}</p>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/75 bg-white/60 text-[#626872] shadow-sm transition hover:bg-white/85 disabled:opacity-50" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <BalanceCard label="Plafond Dasar" value={formatRupiah(selected.plafond_total)} />
                <BalanceCard label="Pemakaian" value={formatRupiah(Number(selected.legacy_used || 0) + Number(selected.current_used || 0))} />
                <BalanceCard label="Reserved" value={formatRupiah(selected.reserved_amount)} />
                <BalanceCard label="Sisa Saat Ini" value={formatRupiah(selected.available_amount)} accent />
              </div>

              <div className="grid grid-cols-2 rounded-[22px] border border-white/75 bg-white/48 p-1 shadow-sm backdrop-blur-xl">
                <button type="button" onClick={() => changeMode('balance')} className={`min-h-10 rounded-[18px] px-4 text-sm font-bold transition ${mode === 'balance' ? 'bg-[#17191d] text-white shadow-md' : 'text-[#666b73] hover:bg-white/65'}`}>
                  Sesuaikan Sisa
                </button>
                <button type="button" onClick={() => changeMode('plafond')} className={`min-h-10 rounded-[18px] px-4 text-sm font-bold transition ${mode === 'plafond' ? 'bg-[#17191d] text-white shadow-md' : 'text-[#666b73] hover:bg-white/65'}`}>
                  Ubah Plafond Dasar
                </button>
              </div>

              {mode === 'balance' ? (
                <div className="rounded-[26px] border border-white/75 bg-white/46 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-5">
                  <label className="block">
                    <span className="text-sm font-bold text-[#25272c]">Sisa Plafond Baru</span>
                    <p className="mt-1 text-xs leading-5 text-[#787d85]">Mengubah saldo yang tersedia tanpa mengubah plafond dasar, pemakaian, atau reserve.</p>
                    <div className="mt-3 flex min-h-13 items-center rounded-[20px] border border-white/80 bg-white/60 px-4 shadow-sm">
                      <span className="mr-2 text-sm font-bold text-[#4c5159]">Rp</span>
                      <input autoFocus inputMode="numeric" value={remainingInput} onChange={(event) => setRemainingInput(formatMoneyInput(parseMoneyInput(event.target.value)))} className="w-full bg-transparent text-base font-semibold text-[#17181b] outline-none" placeholder="0" />
                    </div>
                  </label>
                  <div className="mt-4 rounded-[20px] border border-emerald-100/70 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                    Plafond dasar tetap <strong>{formatRupiah(selected.plafond_total)}</strong>. Sistem hanya mencatat penyesuaian saldo HR.
                  </div>
                </div>
              ) : (
                <div className="rounded-[26px] border border-white/75 bg-white/46 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-5">
                  <label className="block">
                    <span className="text-sm font-bold text-[#25272c]">Plafond Dasar Baru</span>
                    <p className="mt-1 text-xs leading-5 text-[#787d85]">Gunakan untuk promosi/demosi atau perubahan level jabatan. Penyesuaian saldo HR yang sudah ada tetap dipertahankan.</p>
                    <div className="mt-3 flex min-h-13 items-center rounded-[20px] border border-white/80 bg-white/60 px-4 shadow-sm">
                      <span className="mr-2 text-sm font-bold text-[#4c5159]">Rp</span>
                      <input autoFocus inputMode="numeric" value={plafondInput} onChange={(event) => setPlafondInput(formatMoneyInput(parseMoneyInput(event.target.value)))} className="w-full bg-transparent text-base font-semibold text-[#17181b] outline-none" placeholder="0" />
                    </div>
                  </label>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <PreviewCard label="Perubahan Plafond" value={`${plafondDelta >= 0 ? '+' : ''}${formatRupiah(plafondDelta)}`} />
                    <PreviewCard label="Perkiraan Sisa Setelah Perubahan" value={formatRupiah(projectedAvailable)} />
                  </div>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-bold text-[#25272c]">Catatan HR</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full rounded-[22px] border border-white/80 bg-white/52 px-4 py-3 text-sm outline-none shadow-sm backdrop-blur-xl focus:border-blue-200" placeholder="Alasan penyesuaian" />
              </label>

              {modalError ? <div className="rounded-[20px] border border-red-100 bg-red-50/85 px-4 py-3 text-sm text-red-700">{modalError}</div> : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/55 p-5 sm:flex-row sm:justify-end sm:p-6">
              <button type="button" onClick={closeModal} disabled={saving} className="harmony-button-secondary min-h-11 px-5 disabled:opacity-50">Batal</button>
              <button type="button" onClick={saveAdjustment} disabled={saving} className="harmony-button-primary min-h-11 px-5 disabled:opacity-60">
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Menyimpan...' : mode === 'balance' ? 'Simpan Sisa' : 'Simpan Plafond'}
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

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-blue-100/70 bg-blue-50/55 px-4 py-3">
      <p className="text-xs text-[#657083]">{label}</p>
      <p className="mt-1 font-bold text-[#174f94]">{value}</p>
    </div>
  )
}
