'use client'
import { useEffect,useState } from 'react'
import { remedFetch } from '@/lib/remed-client'
import type { RemedSession } from '@/types/remed'
export default function Page(){const [s,setS]=useState<RemedSession|null>(null);useEffect(()=>{remedFetch<{session:RemedSession}>('/api/remed/session').then(x=>setS(x.session)).catch(()=>{})},[]);return <section className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-semibold">Profil Finance</h1><div className="mt-6 rounded-[26px] border border-black/5 bg-white p-6"><p className="font-semibold">{s?.userName||'Finance'}</p><p className="mt-1 text-sm text-[#6e6e73]">{s?.email||'-'}</p><p className="mt-4 text-sm text-[#6e6e73]">Akses Finance hanya berlaku untuk modul Re-Med dan tidak memberikan akses HR HARMONY.</p></div></section>}
