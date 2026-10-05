'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, CircleDollarSign, FileClock, HeartPulse, Plus, WalletCards } from 'lucide-react'
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
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat dashboard Re-Med.')
    }
  }

  useEffect(() => { void load() }, [])

  const ent = data?.entitlement
  const used = Number(ent?.legacy_used || 0) + Number(ent?.current_used || 0)

  return (
    <section className="mx-auto w-full max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="harmony-hero-v25 p-6 sm:p-8" data-accent="remed">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-bold text-white/75 backdrop-blur-xl">
              <HeartPulse size={15} className="text-emerald-300" /> Medical Reimbursement
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Re-Med Employee</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Ajukan reimbursement, pantau plafond, dan lihat status proses HR sampai pembayaran Finance dari satu modul HARMONY.</p>
          </div>
          <Link href="/remed/employee/claims/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[15px] bg-white px-5 text-sm font-bold text-[#174433] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
            <Plus size={18} /> Ajukan Reimbursement
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <p className="harmony-section-copy">Status reimbursement terakhir Anda.</p>
          </div>
          <Link href="/remed/employee/claims" className="rounded-[14px] bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100">Lihat Semua</Link>
        </div>
        <div className="p-4 sm:p-5"><RemedClaimList claims={data?.recentClaims || []} /></div>
      </div>
    </section>
  )
}
