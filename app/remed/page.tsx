'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { getRemedUiSession } from '@/lib/remed-session-client'

export default function RemedIndexPage() {
  const router = useRouter()

  useEffect(() => {
    getRemedUiSession()
      .then(({ session }) => {
        if (session.role === 'hr') router.replace('/remed/hr/dashboard')
        else if (session.role === 'finance') router.replace('/remed/finance/dashboard')
        else router.replace('/remed/employee/dashboard')
      })
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin harmony-text-success" />
    </main>
  )
}
