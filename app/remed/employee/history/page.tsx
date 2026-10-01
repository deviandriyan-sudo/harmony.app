'use client'

import { useEffect, useState } from 'react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export default function EmployeeHistoryPage() {
  const [claims, setClaims] = useState<RemedClaim[]>([])
  useEffect(() => { remedFetch<{ claims: RemedClaim[] }>('/api/remed/claims').then((x) => setClaims(x.claims.filter((c) => ['paid','rejected_hr','rejected_finance','cancelled','legacy_record'].includes(c.status)))).catch(() => {}) }, [])
  return <section className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-semibold tracking-tight">Riwayat Re-Med</h1><p className="mt-2 text-sm text-[#6e6e73]">Klaim yang sudah selesai, ditolak, dibatalkan, atau berasal dari histori legacy.</p><div className="mt-6"><RemedClaimList claims={claims} /></div></section>
}
