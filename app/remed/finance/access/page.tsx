'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { remedFetch } from '@/lib/remed-client'
import type { RemedSession } from '@/types/remed'

export default function Page() {
  const [session, setSession] = useState<RemedSession | null>(null)

  useEffect(() => {
    remedFetch<{ session: RemedSession }>('/api/remed/session').then((payload) => setSession(payload.session)).catch(() => {})
  }, [])

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader eyebrow="Re-Med · Finance" title="Profil Finance" description="Identitas akses Finance pada modul Re-Med." icon={ShieldCheck} />
      <div className="harmony-unified-surface p-6">
        <p className="text-lg font-bold text-[#17181b]">{session?.userName || 'Finance'}</p>
        <p className="mt-1 text-sm text-[#747982]">{session?.email || '-'}</p>
        <div className="mt-5 rounded-[18px] border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          Akses Finance hanya berlaku untuk modul Re-Med dan tidak memberikan akses HR HARMONY.
        </div>
      </div>
    </section>
  )
}
