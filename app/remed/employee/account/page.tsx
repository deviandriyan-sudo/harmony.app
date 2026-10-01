'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Settings, ShieldCheck } from 'lucide-react'

import { remedFetch } from '@/lib/remed-client'
import type { RemedSession } from '@/types/remed'

export default function RemedEmployeeAccountPage() {
  const [session, setSession] = useState<RemedSession | null>(null)

  useEffect(() => {
    remedFetch<{ session: RemedSession }>('/api/remed/session')
      .then((result) => setSession(result.session))
      .catch(() => setSession(null))
  }, [])

  return (
    <section className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Akun Re-Med</h1>
      <div className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <ShieldCheck size={22} />
        </div>
        <p className="mt-4 text-lg font-semibold">{session?.userName || 'Employee'}</p>
        <p className="mt-1 text-sm text-[#6e6e73]">{session?.email || '-'}</p>
        <p className="mt-4 text-sm leading-6 text-[#6e6e73]">Re-Med menggunakan akun HARMONY yang sama. Tidak ada login atau password Re-Med terpisah.</p>
        <Link href="/employee/settings" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-sm font-semibold text-white">
          <Settings size={17} /> Pengaturan HARMONY
        </Link>
      </div>
    </section>
  )
}
