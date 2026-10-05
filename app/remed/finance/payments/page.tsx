'use client'

import { useEffect, useState } from 'react'
import { Banknote, RefreshCw } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { PaymentControls } from '@/components/remed/ReviewControls'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export default function Page() {
  const [claims, setClaims] = useState<RemedClaim[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const payload = await remedFetch<{ claims: RemedClaim[] }>('/api/remed/claims?status=waiting_payment')
      setClaims(payload.claims || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · Finance"
        title="Pembayaran"
        description="Upload bukti transfer, lengkapi referensi pembayaran, dan tandai klaim selesai dari satu antrean."
        icon={Banknote}
        actions={(
          <button type="button" onClick={load} disabled={loading} className="harmony-button-secondary min-h-10 px-4">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      />
      <div className="harmony-unified-surface p-4 sm:p-5">
        <RemedClaimList claims={claims} showEmployee action={(claim) => <PaymentControls claim={claim} onDone={load} />} />
      </div>
    </section>
  )
}
