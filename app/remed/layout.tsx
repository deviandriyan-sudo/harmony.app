'use client'
import { HarmonyPortaledOverlay } from '@/components/ui/HarmonyPortaledOverlay'


import { readErrorMessage } from '@/lib/error-utils'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ShieldAlert, X } from 'lucide-react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { navigationForRole } from '@/lib/navigation'
import { ModuleSubnav } from '@/components/layout/ModuleSubnav'
import { REMED_ROLE_LABELS } from '@/lib/remed'
import { hasSupervisorAssignments } from '@/lib/supervisor-navigation'
import { getRemedUiSession } from '@/lib/remed-session-client'
import type { RemedSession } from '@/types/remed'
import { HarmonyAccessState } from '@/components/system/HarmonyAccessState'
import { supabase } from '@/lib/supabase'

export default function RemedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<RemedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('Memeriksa akses Re-Med...')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [hasSubordinates, setHasSubordinates] = useState(false)

  async function loadSession(isActive: () => boolean) {
    setLoading(true)
    try {
      const payload = await getRemedUiSession()
      if (!isActive()) return
      setSession(payload.session)
      // Session contains bank data; never persist it to localStorage.
      try { localStorage.removeItem('remed_user') } catch { /* private mode */ }
    } catch (error: unknown) {
      if (!isActive()) return
      setSession(null)
      try { localStorage.removeItem('remed_user') } catch { /* private mode */ }
      setMessage(readErrorMessage(error) || 'Akses Re-Med tidak tersedia.')
    } finally {
      if (isActive()) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    // Start session/data loading after the effect setup, avoiding a cascading synchronous render.
    queueMicrotask(() => { if (active) void loadSession(() => active) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { active = false; setSession(null); router.replace('/login') }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [router])

  useEffect(() => {
    if (session?.role !== 'employee' || !session.employeeId) return
    let active = true
    void hasSupervisorAssignments(session.employeeId).then(value => { if (active) setHasSubordinates(value) })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session) return

    const required = pathname.startsWith('/remed/hr')
      ? 'hr'
      : pathname.startsWith('/remed/finance')
        ? 'finance'
        : pathname.startsWith('/remed/employee')
          ? 'employee'
          : null

    if (required && session.role !== required) router.replace(roleHome(session.role))
  }, [pathname, router, session])

  useEffect(() => {
    if (!mobileSidebarOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

  const menu = session?.role === 'hr'
    ? navigationForRole('hr', { remed: true })
    : session?.role === 'finance'
      ? navigationForRole('finance')
      : navigationForRole('employee', { remed: true, supervisor: hasSubordinates })

  if (loading) return (
    <main className="harmony-shell min-h-screen">
      <div className="harmony-workspace mx-auto max-w-[1540px] p-4 sm:p-6">
        <header className="flex items-center gap-3 border-b border-black/5 pb-4">
          <Image src="/logo.png" alt="HARMONY" width={36} height={36} />
          <h1 className="text-xl font-semibold harmony-text-primary">Re-Med</h1>
        </header>
        <p className="mt-4 text-xs harmony-text-secondary" role="status">{message}</p>
      </div>
    </main>
  )

  if (!session) {
    return (
      <HarmonyAccessState
        title="Akses Re-Med Ditolak"
        message={message}
        tone="danger"
        icon={<ShieldAlert size={28} />}
        actionLabel="Kembali ke HARMONY"
        onAction={() => router.replace('/login')}
      />
    )
  }

  // Wrong-role routes may display the authorized shell, never the protected child.
  const requestedRole = pathname.startsWith('/remed/hr') ? 'hr' : pathname.startsWith('/remed/finance') ? 'finance' : pathname.startsWith('/remed/employee') ? 'employee' : null
  const routeAllowed = !requestedRole || requestedRole === session.role

  const roleLabel = session.role === 'finance'
    ? 'Finance · Re-Med'
    : session.role === 'hr'
      ? 'HR Administrator · Re-Med'
      : 'Employee · Re-Med'

  return (
    <div className="harmony-shell min-h-screen overflow-x-hidden">
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <div className="fixed inset-y-0 left-0 z-30 hidden h-screen w-[88px] print:hidden lg:block harmony-desktop-sidebar">
          <AppSidebar
            menu={menu}
            title="HARMONY"
           
            userName={session.userName}
            userRole={roleLabel}
            logoSrc="/logo.png"
          />
        </div>

        {mobileSidebarOpen && (
          <HarmonyPortaledOverlay role="navigation" aria-label="Menu navigasi HARMONY" className="harmony-mobile-drawer-layer fixed inset-0 z-50 print:hidden lg:hidden">
            <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full max-w-[86vw]">
              <AppSidebar
                menu={menu}
                title="HARMONY"
               
                userName={session.userName}
                userRole={roleLabel}
                logoSrc="/logo.png"
                mobile
                onNavigate={() => setMobileSidebarOpen(false)}
              />
              <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute right-[-48px] top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white harmony-text-primary shadow-lg">
                <X size={20} />
              </button>
            </div>
          </HarmonyPortaledOverlay>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden lg:ml-[88px] harmony-desktop-main">
          <div className="harmony-mobile-topbar sticky top-0 z-40 border-b px-4 py-3 print:hidden lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setMobileSidebarOpen(true)} className="harmony-mobile-glass flex h-11 w-11 items-center justify-center rounded-2xl harmony-text-primary" aria-label="Buka menu">
                <Menu size={22} />
              </button>
              <div className="harmony-mobile-brand flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white">
                  <Image src="/logo.png" alt="HARMONY Logo" width={30} height={30} className="h-7 w-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold harmony-text-primary">HARMONY</p>
                  <p className="truncate text-[11px] font-medium harmony-text-secondary">Re-Med · {REMED_ROLE_LABELS[session.role]}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="harmony-workspace w-full min-w-0">
            <div className="harmony-rc2o-remed-topbar flex min-h-[56px] items-center justify-between gap-3 px-4 py-2.5 print:hidden sm:px-6">
              <p className="truncate text-sm font-semibold harmony-text-primary">Re-Med · {REMED_ROLE_LABELS[session.role]}</p>
                </div>
            <ModuleSubnav role={session.role} />{routeAllowed ? children : null}
          </div>
        </main>
      </div>
    </div>
  )
}

function roleHome(role: RemedSession['role']) {
  if (role === 'hr') return '/remed/hr/dashboard'
  if (role === 'finance') return '/remed/finance/dashboard'
  return '/remed/employee/dashboard'
}

