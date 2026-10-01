'use client'
import { useEffect,useState } from 'react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'
export default function Page(){const [claims,setClaims]=useState<RemedClaim[]>([]);useEffect(()=>{remedFetch<{claims:RemedClaim[]}>('/api/remed/reports').then(x=>setClaims(x.claims)).catch(()=>{})},[]);return <section className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-semibold">Laporan Re-Med</h1><p className="mt-2 text-sm text-[#6e6e73]">Rekap seluruh klaim medical reimbursement.</p><div className="mt-6"><RemedClaimList claims={claims} showEmployee/></div></section>}
