'use client'

import { useState } from 'react'
import { Check, Loader2, Upload, X } from 'lucide-react'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

type NotificationResult = {
  ok?: boolean
  message?: string
}

type ActionResponse = {
  success?: boolean
  notification?: NotificationResult | null
}

function warnNotification(result: ActionResponse | null | undefined, actionLabel: string) {
  if (result?.notification?.ok === false) {
    window.alert(`${actionLabel} berhasil, tetapi email notifikasi belum terkirim lengkap: ${result.notification.message || 'cek konfigurasi notifikasi.'}`)
  }
}

export function HrReviewControls({ claim, onDone }: { claim: RemedClaim; onDone: () => void }) {
  const [loading, setLoading] = useState(false)

  async function decide(decision: 'approve' | 'reject') {
    const amountText = decision === 'approve' ? window.prompt('Nominal yang disetujui HR:', String(claim.submitted_amount)) : null
    if (decision === 'approve' && amountText === null) return
    const note = window.prompt(decision === 'approve' ? 'Catatan HR (opsional):' : 'Alasan penolakan HR:', '')
    if (decision === 'reject' && note === null) return
    setLoading(true)
    try {
      const result = await remedFetch<ActionResponse>(`/api/remed/hr/claims/${claim.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, approved_amount: decision === 'approve' ? Number(amountText) : null, note: note || '' }),
      })
      warnNotification(result, `Keputusan HR ${decision === 'approve' ? 'approve' : 'reject'}`)
      onDone()
    } catch (error: any) {
      window.alert(error?.message || 'Gagal memproses klaim.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="inline-flex min-h-9 items-center gap-2 rounded-[13px] bg-[#eef0f3] px-3 text-xs font-bold text-[#646971]"><Loader2 size={14} className="animate-spin" /> Memproses</div>
  }

  return (
    <div className="harmony-action-group">
      <button type="button" onClick={() => decide('approve')} className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"><Check size={14} /> Approve</button>
      <button type="button" onClick={() => decide('reject')} className="harmony-action-danger inline-flex items-center gap-1.5 px-3 text-xs font-bold"><X size={14} /> Reject</button>
    </div>
  )
}

export function FinanceReviewControls({ claim, onDone }: { claim: RemedClaim; onDone: () => void }) {
  const [loading, setLoading] = useState(false)

  async function decide(decision: 'approve' | 'reject') {
    const note = window.prompt(decision === 'approve' ? 'Catatan Finance (opsional):' : 'Alasan penolakan Finance:', '')
    if (decision === 'reject' && note === null) return
    setLoading(true)
    try {
      const result = await remedFetch<ActionResponse>(`/api/remed/finance/claims/${claim.id}/review`, { method: 'POST', body: JSON.stringify({ decision, note: note || '' }) })
      warnNotification(result, `Keputusan Finance ${decision === 'approve' ? 'approve' : 'reject'}`)
      onDone()
    } catch (error: any) {
      window.alert(error?.message || 'Gagal memproses klaim.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="inline-flex min-h-9 items-center rounded-[13px] bg-[#eef0f3] px-3 text-[#646971]"><Loader2 size={16} className="animate-spin" /></div>

  return (
    <div className="harmony-action-group">
      <button type="button" onClick={() => decide('approve')} className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"><Check size={14} /> Approve</button>
      <button type="button" onClick={() => decide('reject')} className="harmony-action-danger inline-flex items-center gap-1.5 px-3 text-xs font-bold"><X size={14} /> Reject</button>
    </div>
  )
}

export function PaymentControls({ claim, onDone }: { claim: RemedClaim; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function pay() {
    if (!file) {
      window.alert('Upload bukti pembayaran terlebih dahulu.')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('payment_date', date)
      formData.append('payment_reference', reference)
      formData.append('payment_proof', file)
      const result = await remedFetch<ActionResponse>(`/api/remed/finance/claims/${claim.id}/payment`, { method: 'POST', body: formData })
      warnNotification(result, 'Pembayaran')
      onDone()
    } catch (error: any) {
      window.alert(error?.message || 'Gagal memproses pembayaran.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-[18px] border border-black/[0.055] bg-[#f7f8fa] p-3.5">
      <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="harmony-input min-h-10 text-xs" />
      <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Referensi pembayaran (opsional)" className="harmony-input min-h-10 text-xs" />
      <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[13px] border border-dashed border-black/[0.09] bg-white px-3 text-xs font-bold text-[#646971] transition hover:border-emerald-200 hover:text-emerald-700">
        <Upload size={14} />
        <span className="truncate">{file ? file.name : 'Upload bukti bayar'}</span>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      </label>
      <button type="button" onClick={pay} disabled={loading} className="harmony-button-primary min-h-10 w-full text-xs disabled:opacity-50">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Memproses...</> : 'Tandai Dibayar'}
      </button>
    </div>
  )
}
