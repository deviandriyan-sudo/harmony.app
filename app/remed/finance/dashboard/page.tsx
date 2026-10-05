'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Banknote, ClipboardCheck, FileText, History, Landmark, WalletCards } from 'lucide-react'
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
      setError(issue?.message || 'Gagal memuat dashboard Re-Med Finance.')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="harmony-hero-v25 p-6 sm:p-8" data-accent="remed">
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-bold text-white/75 backdrop-blur-xl">
              <Landmark size={15} className="text-emerald-300" /> Re-Med · Finance Control
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Medical Reimbursement Finance</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Proses klaim yang telah disetujui HR, siapkan form pembayaran, dan pantau pembayaran tanpa berpindah workflow.</p>
          </div>
          <div className="harmony-action-group border-white/10 bg-white/10 p-1">
            <Link href="/remed/finance/claims" className="harmony-action-soft inline-flex items-center justify-center gap-2 px-4 text-sm font-bold">
              <ClipboardCheck size={16} /> Review Finance
            </Link>
            <Link href="/remed/finance/history" className="inline-flex items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-bold text-white transition hover:bg-white/10">
              <History size={16} /> Riwayat Proses
            </Link>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RemedStatCard label="Total Klaim" value={String(data?.stats?.totalClaims ?? 0)} icon={FileText} />
        <RemedStatCard label="Perlu Diproses" value={String(data?.stats?.pending ?? 0)} icon={ClipboardCheck} />
        <RemedStatCard label="Paid" value={String(data?.stats?.paidCount ?? 0)} icon={Banknote} />
        <RemedStatCard label="Total Dibayar" value={formatRupiah(data?.stats?.paidTotal ?? 0)} icon={WalletCards} />
      </div>

      <div className="harmony-unified-surface">
        <div className="flex flex-col gap-3 border-b border-black/[0.055] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 className="harmony-section-title">Klaim Terbaru</h2>
            <p className="harmony-section-copy">Print membuat form pembayaran. Hapus melakukan reversal saldo otomatis sesuai status klaim dan tetap menyimpan audit.</p>
          </div>
          <button type="button" onClick={load} className="harmony-button-secondary min-h-10 px-4">Refresh</button>
        </div>
        <div className="p-4 sm:p-5">
          <RemedClaimList
            claims={data?.recentClaims || []}
            showEmployee
            action={(claim) => <ClaimAdminActions claim={claim} role="finance" onDone={load} />}
          />
        </div>
      </div>
    </section>
  )
}
