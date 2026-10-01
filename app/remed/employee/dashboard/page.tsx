'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, CircleDollarSign, FileClock, Plus, WalletCards } from 'lucide-react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedStatCard } from '@/components/remed/RemedStatCard'
import { formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim, RemedEntitlement } from '@/types/remed'

type DashboardPayload = { entitlement: RemedEntitlement | null; recentClaims: RemedClaim[] }

export default function RemedEmployeeDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    remedFetch<DashboardPayload>('/api/remed/dashboard').then(setData).catch((e) => setError(e.message))
  }, [])

  const ent = data?.entitlement
  const used = Number(ent?.legacy_used || 0) + Number(ent?.current_used || 0)

  return (
    <section className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="rounded-[32px] bg-[linear-gradient(135deg,#12372a,#18794e)] p-6 text-white shadow-[0_24px_60px_rgba(24,121,78,0.2)] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Medical Reimbursement</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Re-Med Employee</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Ajukan reimbursement, pantau plafond, dan lihat status proses HR sampai pembayaran Finance.</p></div>
          <Link href="/remed/employee/claims/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#12372a] shadow-lg"><Plus size={18} /> Ajukan Reimbursement</Link>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RemedStatCard label="Plafond" value={ent ? formatRupiah(ent.plafond_total) : '-'} helper={ent ? `Tahun ${ent.period_year}` : 'Belum diatur HR'} icon={WalletCards} />
        <RemedStatCard label="Terpakai" value={ent ? formatRupiah(used) : '-'} helper="Legacy + pembayaran Re-Med" icon={CircleDollarSign} />
        <RemedStatCard label="Pending" value={ent ? formatRupiah(ent.reserved_amount) : '-'} helper="Klaim yang sedang diproses" icon={Activity} />
        <RemedStatCard label="Tersedia" value={ent ? formatRupiah(ent.available_amount) : '-'} helper="Bisa diajukan" icon={FileClock} />
      </div>

      {!ent && !error ? <div className="mt-5 rounded-[24px] border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">Plafond tahun berjalan belum diatur. Hubungi HR sebelum membuat klaim.</div> : null}

      <div className="mt-7 flex items-center justify-between"><div><h2 className="text-xl font-semibold text-[#1d1d1f]">Klaim Terbaru</h2><p className="mt-1 text-sm text-[#6e6e73]">Status reimbursement terakhir Anda.</p></div><Link href="/remed/employee/claims" className="text-sm font-semibold text-[#18794e]">Lihat semua</Link></div>
      <div className="mt-4"><RemedClaimList claims={data?.recentClaims || []} /></div>
    </section>
  )
}
