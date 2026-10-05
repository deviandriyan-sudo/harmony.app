'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export default function EmployeeHistoryPage() {
  const [claims, setClaims] = useState<RemedClaim[]>([])

  useEffect(() => {
    remedFetch<{ claims: RemedClaim[] }>('/api/remed/claims')
      .then((payload) => setClaims((payload.claims || []).filter((claim) => ['paid', 'rejected_hr', 'rejected_finance', 'cancelled', 'legacy_record'].includes(claim.status))))
      .catch(() => {})
  }, [])

  return (
    <section className="mx-auto w-full max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader eyebrow="Re-Med · Employee" title="Riwayat Re-Med" description="Klaim yang sudah selesai, ditolak, dibatalkan, atau berasal dari histori legacy." icon={History} />
      <div className="harmony-unified-surface p-4 sm:p-5"><RemedClaimList claims={claims} /></div>
    </section>
  )
}
