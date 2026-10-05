'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export default function EmployeeClaimsPage() {
  const [claims, setClaims] = useState<RemedClaim[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const data = await remedFetch<{ claims: RemedClaim[] }>('/api/remed/claims')
      setClaims(data.claims || [])
      setMessage('')
    } catch (error: any) {
      setMessage(error?.message || 'Gagal memuat klaim.')
    }
  }

  useEffect(() => { void load() }, [])

  async function cancel(claim: RemedClaim) {
    if (!window.confirm(`Batalkan ${claim.claim_number}?`)) return
    try {
      await remedFetch(`/api/remed/claims/${claim.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Dibatalkan oleh employee.' }) })
      await load()
    } catch (error: any) {
      window.alert(error?.message || 'Gagal membatalkan klaim.')
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · Employee"
        title="Klaim Saya"
        description="Pantau proses HR, Finance, dan pembayaran dari satu daftar klaim."
        icon={FileText}
        actions={(
          <Link href="/remed/employee/claims/new" className="harmony-button-primary inline-flex min-h-10 items-center gap-2 px-4">
            <Plus size={17} /> Klaim Baru
          </Link>
        )}
      />
      {message ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{message}</div> : null}
      <div className="harmony-unified-surface p-4 sm:p-5">
        <RemedClaimList
          claims={claims}
          action={(claim) => claim.status === 'pending_hr' ? (
            <button type="button" onClick={() => cancel(claim)} className="harmony-action-danger inline-flex min-h-9 items-center rounded-[13px] px-3 text-xs font-bold">Batalkan</button>
          ) : null}
        />
      </div>
    </section>
  )
}
