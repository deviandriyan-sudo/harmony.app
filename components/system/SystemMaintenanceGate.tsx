'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ShieldCheck, Wrench } from 'lucide-react'

import Image from 'next/image'

type SystemStatus = {
  systemEnabled: boolean
  emailEnabled: boolean
  maintenanceMessage: string
  configured: boolean
}

const HR_ALLOWED_PREFIXES = ['/hr', '/remed/hr', '/login', '/auth/callback']

export function SystemMaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    let active = true

    async function refresh() {
      try {
        const response = await fetch('/api/system/status', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json()
        if (active) setStatus(payload)
      } catch {
        // Fail-open if the status endpoint is temporarily unavailable.
      }
    }

    refresh()
    const timer = window.setInterval(refresh, 5000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pathname])

  const hrAllowed = HR_ALLOWED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (status && !status.systemEnabled && !hrAllowed) {
    return (
      <main className="harmony-access-state flex min-h-screen items-center justify-center bg-[#eef3f8] p-6 harmony-text-primary">
        <div className="w-full max-w-xl rounded-[34px] border border-white/80 bg-white/75 p-7 text-center shadow-[0_24px_80px_rgba(40,55,80,.16)] backdrop-blur-3xl sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-white bg-white shadow-sm">
            <Image src="/logo.png" alt="HARMONY" width={58} height={58} className="h-14 w-14 object-contain" />
          </div>
          <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            <Wrench size={14} /> Maintenance Mode
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-[-0.04em]">HARMONY sedang diperbarui</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 harmony-text-secondary">
            {status.maintenanceMessage}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={14} /> Data tetap aman selama maintenance
          </div>
        </div>
      </main>
    )
  }

  if (!status && pathname !== '/login') {
    return <>{children}</>
  }

  return <>{children}</>
}
