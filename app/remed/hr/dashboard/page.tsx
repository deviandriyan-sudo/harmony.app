'use client'
import { useEffect,useState } from 'react'
import { ClipboardCheck, FileText, WalletCards, Banknote } from 'lucide-react'
import { RemedStatCard } from '@/components/remed/RemedStatCard'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'
export default function Page(){const [d,setD]=useState<any>(null);useEffect(()=>{remedFetch<any>('/api/remed/dashboard').then(setD).catch(()=>{})},[]);return <section className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-semibold">Re-Med HR</h1><p className="mt-2 text-sm text-[#6e6e73]">Review klaim dan kelola plafond karyawan.</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><RemedStatCard label="Total Klaim" value={String(d?.stats?.totalClaims??0)} icon={FileText}/><RemedStatCard label="Menunggu HR" value={String(d?.stats?.pending??0)} icon={ClipboardCheck}/><RemedStatCard label="Paid" value={String(d?.stats?.paidCount??0)} icon={Banknote}/><RemedStatCard label="Total Dibayar" value={formatRupiah(d?.stats?.paidTotal??0)} icon={WalletCards}/></div><div className="mt-7"><h2 className="text-xl font-semibold">Klaim Terbaru</h2><div className="mt-4"><RemedClaimList claims={(d?.recentClaims||[]) as RemedClaim[]} showEmployee/></div></div></section>}
