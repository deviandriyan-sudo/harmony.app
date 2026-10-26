'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, History, Loader2, ShieldCheck, WalletCards } from 'lucide-react'
import { harmonyFetch } from '@/lib/harmony-client'

type Summary = {
  annual_regular_days?: number | null
  postpone_active_days?: number | null
  annual_manual_adjustment_days?: number | null
  annual_total_available_days?: number | null
}
type Audit = {
  id: string
  previous_effective_balance: number
  corrected_effective_balance: number
  reason: string
  created_at: string
}

export function AnnualLeaveCorrection({employeeId, summary, onSaved}: {
  employeeId: string | null
  summary: Summary | null
  onSaved: () => Promise<void>
}) {
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [history, setHistory] = useState<Audit[]>([])

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    void harmonyFetch<{history:Audit[]}>(`/api/hr/leave/balance-correction?employee_id=${encodeURIComponent(employeeId)}`)
      .then(x => { if (!cancelled) setHistory(x.history || []) })
      .catch(() => { /* optional when SQL migration has not been applied yet */ })
    return () => {cancelled = true}
  }, [employeeId])

  async function submit() {
    if (!employeeId || busy) return
    const days = Number(target)
    if (target.trim() === '' || !Number.isInteger(days) || days < 0 || days > 365) {
      setError('Saldo akhir harus berupa bilangan bulat 0–365 hari.'); return
    }
    if (reason.trim().length < 12) {
      setError('Tuliskan alasan koreksi minimal 12 karakter.'); return
    }
    if (!window.confirm(`Ubah saldo cuti efektif menjadi ${days} hari? Riwayat akan disimpan dan perubahan tidak bisa dihapus.`)) return
    setBusy(true); setError(''); setSuccess('')
    try {
      await harmonyFetch('/api/hr/leave/balance-correction', {
        method:'POST',body:JSON.stringify({employee_id:employeeId,target_days:days,reason:reason.trim()}),
      })
      setSuccess('Koreksi berhasil dicatat dan saldo lifecycle terverifikasi.')
      setTarget(''); setReason('')
      try {
        await onSaved()
        const response = await harmonyFetch<{history:Audit[]}>(`/api/hr/leave/balance-correction?employee_id=${encodeURIComponent(employeeId)}`)
        setHistory(response.history || [])
      } catch {
        setSuccess('Koreksi telah disimpan di database. Muat ulang halaman untuk memperbarui tampilan.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koreksi gagal. Tidak ada perubahan saldo yang disimpan.')
    } finally {setBusy(false)}
  }

  const balance = Number(summary?.annual_total_available_days ?? 0)
  return (
    <details className="harmony-hr-form-disclosure harmony-leave-correction" aria-label="Koreksi saldo cuti">
      <summary className="harmony-hr-form-summary">
        <span className="harmony-hr-form-icon"><WalletCards size={18}/></span>
        <span className="flex-1 min-w-0"><strong>Koreksi Saldo Cuti</strong><small>Penyesuaian HR dengan audit dan pemeriksaan database</small></span>
        <span className="harmony-hr-disclosure-indicator">Buka</span>
      </summary>
      <div className="harmony-hr-form-body space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="harmony-leave-value"><span>Cuti matang</span><strong>{Number(summary?.annual_regular_days ?? 0)} hari</strong></div>
          <div className="harmony-leave-value"><span>Postpone aktif</span><strong>{Number(summary?.postpone_active_days ?? 0)} hari</strong></div>
          <div className="harmony-leave-value"><span>Saldo efektif</span><strong>{balance} hari</strong></div>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">Adjustment tercatat: {Number(summary?.annual_manual_adjustment_days ?? 0)} hari. Isi <strong>saldo akhir yang benar</strong>, bukan besarnya penambahan.</p>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="block"><span className="harmony-label">Saldo akhir (hari)</span><input inputMode="numeric" type="number" step="1" min="0" max="365" value={target} onChange={e=>setTarget(e.target.value)} placeholder={`Saat ini ${balance}`} className="harmony-input w-full"/></label>
          <label className="block"><span className="harmony-label">Alasan koreksi</span><textarea rows={2} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Contoh: pembetulan adjustment historis berdasarkan verifikasi HR" className="harmony-input w-full"/></label>
        </div>
        {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
        {success && <p role="status" className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><CheckCircle2 size={15}/>{success}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-600"><ShieldCheck size={15}/> Gagal verifikasi = transaksi otomatis dibatalkan</span>
          <button type="button" onClick={()=>void submit()} disabled={!employeeId || !summary || busy} className="harmony-button-primary inline-flex min-h-10 items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="animate-spin" size={15}/> : <WalletCards size={15}/>}{busy?'Memeriksa...':'Simpan Koreksi'}
          </button>
        </div>
        {history.length>0 && <div className="border-t border-blue-100 pt-3"><p className="mb-2 flex gap-2 text-xs font-semibold text-slate-700"><History size={15}/> Riwayat terbaru</p>
          {history.slice(0,5).map(item=><p key={item.id} className="rounded-lg px-2 py-1.5 text-xs text-slate-600">{new Date(item.created_at).toLocaleDateString('id-ID')}: {item.previous_effective_balance} → {item.corrected_effective_balance} hari · {item.reason}</p>)}
        </div>}
      </div>
    </details>
  )
}
