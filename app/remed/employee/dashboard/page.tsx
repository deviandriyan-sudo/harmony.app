'use client'


import { readErrorMessage } from '@/lib/error-utils'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, CircleDollarSign, FileClock, WalletCards } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedStatCard } from '@/components/remed/RemedStatCard'
import { formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim, RemedEntitlement } from '@/types/remed'

type DashboardPayload = { entitlement: RemedEntitlement | null; recentClaims: RemedClaim[] }

export default function RemedEmployeeDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      setError('')
      setData(await remedFetch<DashboardPayload>('/api/remed/dashboard'))
    } catch (e: unknown) {
      setError(readErrorMessage(e) || 'Gagal memuat dashboard Re-Med.')
    }
  }

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void load() })
    return () => { active = false }
  }, [])

  const ent = data?.entitlement
  const used = Number(ent?.legacy_used || 0) + Number(ent?.current_used || 0)

  return (
    <section className="mx-auto w-full max-w-[1540px] space-y-4 p-4 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-slate-900">Re-Med Karyawan</h1><p className="mt-1 text-xs text-slate-500">Ringkasan dan tindakan utama</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/remed/employee/claims/new" className="harmony-button-secondary inline-flex min-h-10 items-center px-3 text-xs font-semibold">Ajukan Klaim</Link>
          <Link href="/remed/employee/claims" className="harmony-button-secondary inline-flex min-h-10 items-center px-3 text-xs font-semibold">Klaim Saya</Link>
        </div>
      </header>

      {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <RemedStatCard label="Plafond" value={ent ? formatRupiah(ent.plafond_total) : '-'} helper={ent ? `Tahun ${ent.period_year}` : 'Belum diatur HR'} icon={WalletCards} />
        <RemedStatCard label="Terpakai" value={ent ? formatRupiah(used) : '-'} helper="Legacy + pembayaran Re-Med" icon={CircleDollarSign} />
        <RemedStatCard label="Pending" value={ent ? formatRupiah(ent.reserved_amount) : '-'} helper="Klaim yang sedang diproses" icon={Activity} />
        <RemedStatCard label="Tersedia" value={ent ? formatRupiah(ent.available_amount) : '-'} helper="Bisa diajukan" icon={FileClock} />
      </div>

      {!ent && !error ? <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">Plafond tahun berjalan belum diatur. Hubungi HR sebelum membuat klaim.</div> : null}

      <div className="harmony-unified-surface">
        <div className="flex items-center justify-between gap-4 border-b border-black/[0.055] p-5 sm:p-6">
          <div>
            <h2 className="harmony-section-title">Klaim Terbaru</h2>
            
          </div>
          <Link href="/remed/employee/claims" className="rounded-[14px] bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100">Lihat Semua</Link>
        </div>
        <div className="p-3 sm:p-4"><RemedClaimList claims={data?.recentClaims || []} /></div>
      </div>
    </section>
  )
}
