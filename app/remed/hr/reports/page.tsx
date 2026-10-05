'use client'

import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export default function Page() {
  const [claims, setClaims] = useState<RemedClaim[]>([])

  useEffect(() => {
    remedFetch<{ claims: RemedClaim[] }>('/api/remed/reports').then((payload) => setClaims(payload.claims || [])).catch(() => {})
  }, [])

  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader eyebrow="Re-Med · HR" title="Laporan Re-Med" description="Rekap seluruh klaim medical reimbursement dengan tampilan yang sama seperti modul Re-Med lainnya." icon={BarChart3} />
      <div className="harmony-unified-surface p-4 sm:p-5"><RemedClaimList claims={claims} showEmployee /></div>
    </section>
  )
}
