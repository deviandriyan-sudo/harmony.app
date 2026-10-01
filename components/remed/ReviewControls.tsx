'use client'

import { useState } from 'react'
import { Check, Loader2, Upload, X } from 'lucide-react'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export function HrReviewControls({ claim, onDone }: { claim: RemedClaim; onDone: () => void }) {
  const [loading, setLoading] = useState(false)

  async function decide(decision: 'approve' | 'reject') {
    const amountText = decision === 'approve' ? window.prompt('Nominal yang disetujui HR:', String(claim.submitted_amount)) : null
    if (decision === 'approve' && amountText === null) return
    const note = window.prompt(decision === 'approve' ? 'Catatan HR (opsional):' : 'Alasan penolakan HR:', '')
    if (decision === 'reject' && note === null) return
    setLoading(true)
    try {
      await remedFetch(`/api/remed/hr/claims/${claim.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, approved_amount: decision === 'approve' ? Number(amountText) : null, note: note || '' }),
      })
      onDone()
    } catch (error: any) { window.alert(error.message) } finally { setLoading(false) }
  }

  return <div className="flex flex-wrap gap-2">{loading ? <div className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2 text-xs"><Loader2 size={14} className="animate-spin" /> Memproses</div> : <><button onClick={() => decide('approve')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Check size={14} /> Approve</button><button onClick={() => decide('reject')} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><X size={14} /> Reject</button></>}</div>
}

export function FinanceReviewControls({ claim, onDone }: { claim: RemedClaim; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  async function decide(decision: 'approve' | 'reject') {
    const note = window.prompt(decision === 'approve' ? 'Catatan Finance (opsional):' : 'Alasan penolakan Finance:', '')
    if (decision === 'reject' && note === null) return
    setLoading(true)
    try {
      await remedFetch(`/api/remed/finance/claims/${claim.id}/review`, { method: 'POST', body: JSON.stringify({ decision, note: note || '' }) })
      onDone()
    } catch (error: any) { window.alert(error.message) } finally { setLoading(false) }
  }
  return <div className="flex flex-wrap gap-2">{loading ? <Loader2 size={18} className="animate-spin" /> : <><button onClick={() => decide('approve')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Check size={14} /> Approve</button><button onClick={() => decide('reject')} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><X size={14} /> Reject</button></>}</div>
}

export function PaymentControls({ claim, onDone }: { claim: RemedClaim; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function pay() {
    if (!file) { window.alert('Upload bukti pembayaran terlebih dahulu.'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('payment_date', date)
      fd.append('payment_reference', reference)
      fd.append('payment_proof', file)
      await remedFetch(`/api/remed/finance/claims/${claim.id}/payment`, { method: 'POST', body: fd })
      onDone()
    } catch (error: any) { window.alert(error.message) } finally { setLoading(false) }
  }

  return <div className="w-full max-w-sm space-y-2 rounded-2xl bg-[#f5f5f7] p-3"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs" /><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referensi pembayaran (opsional)" className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs" /><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-black/10 bg-white px-3 py-2 text-xs font-semibold"><Upload size={14} />{file ? file.name : 'Upload bukti bayar'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button type="button" onClick={pay} disabled={loading} className="w-full rounded-xl bg-[#18794e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{loading ? 'Memproses...' : 'Tandai Dibayar'}</button></div>
}
