'use client'
import { useEffect,useState } from 'react'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { HrReviewControls } from '@/components/remed/ReviewControls'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'
export default function Page(){const [claims,setClaims]=useState<RemedClaim[]>([]);const load=()=>remedFetch<{claims:RemedClaim[]}>('/api/remed/claims?status=pending_hr').then(x=>setClaims(x.claims));useEffect(()=>{load().catch(()=>{})},[]);return <section className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-semibold">Review Klaim HR</h1><p className="mt-2 text-sm text-[#6e6e73]">Validasi dokumen dan nominal sebelum diteruskan ke Finance.</p><div className="mt-6"><RemedClaimList claims={claims} showEmployee action={(c)=><HrReviewControls claim={c} onDone={()=>load()}/>} /></div></section>}
