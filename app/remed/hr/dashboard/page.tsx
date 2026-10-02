'use client'

import { useEffect, useState } from 'react'
import { Banknote, ClipboardCheck, FileText, WalletCards } from 'lucide-react'
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
    <section className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-semibold">Re-Med HR</h1>
      <p className="mt-2 text-sm text-[#6e6e73]">Review klaim, kelola plafond, cetak form pembayaran, dan koreksi data klaim.</p>

      {error ? <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RemedStatCard label="Total Klaim" value={String(data?.stats?.totalClaims ?? 0)} icon={FileText} />
        <RemedStatCard label="Menunggu HR" value={String(data?.stats?.pending ?? 0)} icon={ClipboardCheck} />
        <RemedStatCard label="Paid" value={String(data?.stats?.paidCount ?? 0)} icon={Banknote} />
        <RemedStatCard label="Total Dibayar" value={formatRupiah(data?.stats?.paidTotal ?? 0)} icon={WalletCards} />
      </div>

      <div className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Klaim Terbaru</h2>
            <p className="mt-1 text-xs text-[#6e6e73]">Print membuat form pembayaran. Hapus akan mengoreksi saldo secara transactional dan menyimpan jejak audit.</p>
          </div>
        </div>
        <div className="mt-4">
          <RemedClaimList
            claims={data?.recentClaims || []}
            showEmployee
            action={(claim) => <ClaimAdminActions claim={claim} role="hr" onDone={load} />}
          />
        </div>
      </div>
    </section>
  )
}
