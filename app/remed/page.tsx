'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { remedFetch } from '@/lib/remed-client'
import type { RemedSession } from '@/types/remed'

export default function RemedIndexPage() {
  const router = useRouter()

  useEffect(() => {
    remedFetch<{ session: RemedSession }>('/api/remed/session')
      .then(({ session }) => {
        if (session.role === 'hr') router.replace('/remed/hr/dashboard')
        else if (session.role === 'finance') router.replace('/remed/finance/dashboard')
        else router.replace('/remed/employee/dashboard')
      })
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-[#18794e]" />
    </main>
  )
}
