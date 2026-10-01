'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export default function EmployeeClaimsPage() {
  const [claims, setClaims] = useState<RemedClaim[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    try { const data = await remedFetch<{ claims: RemedClaim[] }>('/api/remed/claims'); setClaims(data.claims); setMessage('') } catch (e: any) { setMessage(e.message) }
  }
  useEffect(() => { load() }, [])

  async function cancel(claim: RemedClaim) {
    if (!window.confirm(`Batalkan ${claim.claim_number}?`)) return
    try { await remedFetch(`/api/remed/claims/${claim.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Dibatalkan oleh employee.' }) }); await load() } catch (e: any) { window.alert(e.message) }
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#18794e]">Employee</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Klaim Saya</h1><p className="mt-2 text-sm text-[#6e6e73]">Pantau proses HR, Finance, dan pembayaran.</p></div><Link href="/remed/employee/claims/new" className="inline-flex items-center gap-2 rounded-2xl bg-[#18794e] px-5 py-3 text-sm font-bold text-white"><Plus size={18} /> Klaim Baru</Link></div>
      {message ? <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</div> : null}
      <div className="mt-6"><RemedClaimList claims={claims} action={(claim) => claim.status === 'pending_hr' ? <button type="button" onClick={() => cancel(claim)} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Batalkan</button> : null} /></div>
    </section>
  )
}
