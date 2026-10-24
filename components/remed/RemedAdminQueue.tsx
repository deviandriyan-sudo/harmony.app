'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, ClipboardCheck, Download, RefreshCw } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { FinanceReviewControls, HrReviewControls, PaymentControls } from '@/components/remed/ReviewControls'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'
import { downloadRemedClaimsXlsx } from '@/lib/export/remed-report'

type QueueMode = 'hr_review' | 'finance_review' | 'payment'
const meta = {
  hr_review: { role: 'HR', title: 'Review Klaim HR',
    description: 'Validasi dokumen dan nominal sebelum klaim diteruskan ke Finance. Semua klaim outstanding tampil dalam satu antrean.',
    status: 'pending_hr' },
  finance_review: { role: 'Finance', title: 'Review Finance',
    description: 'Review klaim yang telah disetujui HR sebelum masuk ke proses pembayaran.',
    status: 'pending_finance' },
  payment: { role: 'Finance', title: 'Pembayaran',
    description: 'Upload bukti transfer, lengkapi referensi pembayaran, dan tandai klaim selesai dari satu antrean.',
    status: 'waiting_payment' },
} as const

export function RemedAdminQueue({ mode }: { mode: QueueMode }) {
  const config = meta[mode]
  const [claims, setClaims] = useState<RemedClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await remedFetch<{ claims: RemedClaim[] }>(`/api/remed/claims?status=${config.status}`)
      setClaims(payload.claims || [])
    } catch (issue: unknown) {
      setError(issue instanceof Error ? issue.message : 'Gagal memuat klaim.')
    } finally {
      setLoading(false)
    }
  }, [config.status])
  useEffect(() => { void load() }, [load])
  return <section className={`harmony-glass-showcase harmony-glass-showcase-${config.role.toLowerCase()} mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8`}>
    <RemedPageHeader eyebrow={`Re-Med · ${config.role}`} title={config.title}
      description={config.description} icon={mode === 'payment' ? Banknote : ClipboardCheck}
      actions={<div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => downloadRemedClaimsXlsx(claims, mode.toUpperCase())} disabled={loading || !claims.length} className="harmony-button-secondary min-h-10 px-4 disabled:opacity-50"><Download size={16} /> Excel Berwarna</button>
        <button type="button" onClick={() => void load()} disabled={loading} className="harmony-button-secondary min-h-10 px-4"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
      </div>} />
    {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    <div className="harmony-unified-surface p-4 sm:p-5">
      <RemedClaimList claims={claims} showEmployee showBalanceImpact={mode !== 'payment'}
        action={(claim) => mode === 'hr_review'
          ? <HrReviewControls claim={claim} onDone={load} />
          : mode === 'finance_review'
            ? <FinanceReviewControls claim={claim} onDone={load} />
            : <PaymentControls claim={claim} onDone={load} /> } />
    </div>
  </section>
}
