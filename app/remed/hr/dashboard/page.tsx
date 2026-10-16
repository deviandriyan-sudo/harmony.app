'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Banknote, ClipboardCheck, FileText, History, ShieldCheck, WalletCards } from 'lucide-react'
import { ClaimAdminActions } from '@/components/remed/ClaimAdminActions'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedStatCard } from '@/components/remed/RemedStatCard'
import { formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

type DashboardPayload = {
  stats?: {
    totalClaims?: number
    pending?: number
    paidCount?: number
    paidTotal?: number
  }
  recentClaims?: RemedClaim[]
}

export default function Page() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      setData(await remedFetch<DashboardPayload>('/api/remed/dashboard'))
    } catch (issue: any) {
      setError(issue?.message || 'Gagal memuat dashboard Re-Med HR.')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="mx-auto max-w-[1540px] space-y-4 p-4 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-slate-900">Re-Med HR</h1><p className="mt-1 text-xs text-slate-500">Ringkasan dan tindakan utama</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/remed/hr/claims" className="harmony-button-secondary inline-flex min-h-10 items-center px-3 text-xs font-semibold">Review Klaim</Link>
          <Link href="/remed/hr/history" className="harmony-button-secondary inline-flex min-h-10 items-center px-3 text-xs font-semibold">Riwayat</Link>
          <Link href="/remed/hr/employees" className="harmony-button-secondary inline-flex min-h-10 items-center px-3 text-xs font-semibold">Plafond</Link>
        </div>
      </header>

      {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <RemedStatCard label="Total Klaim" value={String(data?.stats?.totalClaims ?? 0)} icon={FileText} />
        <RemedStatCard label="Menunggu HR" value={String(data?.stats?.pending ?? 0)} icon={ClipboardCheck} />
        <RemedStatCard label="Paid" value={String(data?.stats?.paidCount ?? 0)} icon={Banknote} />
        <RemedStatCard label="Total Dibayar" value={formatRupiah(data?.stats?.paidTotal ?? 0)} icon={WalletCards} />
      </div>

      <div className="harmony-unified-surface">
        <div className="flex flex-col gap-3 border-b border-black/[0.055] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <h2 className="harmony-section-title">Klaim Terbaru</h2>
            
          </div>
          <button type="button" onClick={load} className="harmony-button-secondary min-h-10 px-4">Refresh</button>
        </div>
        <div className="p-3 sm:p-4">
          <RemedClaimList
            claims={data?.recentClaims || []}
            showEmployee
            showBalanceImpact
            action={(claim) => <ClaimAdminActions claim={claim} role="hr" onDone={load} />}
          />
        </div>
      </div>
    </section>
  )
}
