'use client'
import { useEffect,useState } from 'react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { PaymentControls } from '@/components/remed/ReviewControls'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'
export default function Page(){const [claims,setClaims]=useState<RemedClaim[]>([]);const load=()=>remedFetch<{claims:RemedClaim[]}>('/api/remed/claims?status=waiting_payment').then(x=>setClaims(x.claims));useEffect(()=>{load().catch(()=>{})},[]);return <section className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-semibold">Pembayaran</h1><p className="mt-2 text-sm text-[#6e6e73]">Upload bukti transfer dan tandai klaim selesai.</p><div className="mt-6"><RemedClaimList claims={claims} showEmployee action={c=><PaymentControls claim={c} onDone={()=>load()}/>} /></div></section>}
