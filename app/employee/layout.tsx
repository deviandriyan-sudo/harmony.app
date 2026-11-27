'use client'
import { HarmonyPortaledOverlay } from '@/components/ui/HarmonyPortaledOverlay'


import { readErrorMessage } from '@/lib/error-utils'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, ShieldAlert, X } from 'lucide-react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { navigationForRole } from '@/lib/navigation'
import { ModuleSubnav } from '@/components/layout/ModuleSubnav'
import { getHarmonyUiAccess } from '@/lib/harmony-ui-access'
import { RouteLoading } from '@/components/layout/RouteLoading'
import { HarmonyRequestError } from '@/lib/harmony-client'
import { supabase } from '@/lib/supabase'
import { hasSupervisorAssignments } from '@/lib/supervisor-navigation'
import { HarmonyAccessState } from '@/components/system/HarmonyAccessState'


export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [userName, setUserName] = useState('Employee')
  const [message, setMessage] = useState('Memeriksa akses akun...')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [hasSubordinates, setHasSubordinates] = useState(false)

  useEffect(() => {
    if (!mobileSidebarOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

  async function checkAccess(isActive: () => boolean = () => true) {
    setLoading(true)
    setAllowed(false)
    setMessage('Memeriksa akses akun...')

    try {
      const payload = await getHarmonyUiAccess()
      if (!isActive()) return

      if (payload.kind !== 'harmony' || !payload.appUser) {
        router.replace(payload.home || '/login')
        return
      }

      if (String(payload.appUser.role || '').toLowerCase() === 'hr') {
        router.replace(payload.home || '/hr/dashboard')
        return
      }

      setUserName(payload.employee?.full_name || formatEmailName(payload.appUser.email))

      // Same supervisor identifiers as the canonical Approval Tim page (homebase and assignments).
      // Navigation is convenience only; the original page/API keep authorization checks.
      if (payload.appUser.employee_id) {
        void hasSupervisorAssignments(payload.appUser.employee_id).then(value => { if (isActive()) setHasSubordinates(value) })
      }
      setAllowed(true)
    } catch (error: unknown) {
      if (!isActive()) return
      setMessage(readErrorMessage(error) || 'Akses Employee tidak dapat diverifikasi.')
      if (error instanceof HarmonyRequestError && error.status === 401) router.replace('/login')
      return
    } finally {
      if (isActive()) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    // Start session/data loading after the effect setup, avoiding a cascading synchronous render.
    queueMicrotask(() => { if (active) void checkAccess(() => active) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { active = false; setAllowed(false); router.replace('/login') }
    })
    return () => { active = false; subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <RouteLoading label={message} />
  }

  if (!allowed) {
    return (
      <HarmonyAccessState
        title="Akses Employee Ditolak"
        message={message}
        actionLabel="Coba lagi"
        onAction={() => window.location.reload()}
        tone="danger"
        icon={<ShieldAlert size={28} />}
      />
    )
  }

  return (
    <div className="harmony-shell min-h-screen overflow-x-hidden">
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <div className="fixed inset-y-0 left-0 z-30 hidden h-screen w-[88px] lg:block harmony-desktop-sidebar">
          <AppSidebar
            menu={navigationForRole('employee', { remed: true, supervisor: hasSubordinates })}
            title="HARMONY"
           
            userName={userName}
            userRole="Employee"
            logoSrc="/logo.png"
          />
        </div>

        {mobileSidebarOpen && (
          <HarmonyPortaledOverlay role="navigation" aria-label="Menu navigasi HARMONY" className="harmony-mobile-drawer-layer fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full max-w-[86vw]">
              <AppSidebar
                menu={navigationForRole('employee', { remed: true, supervisor: hasSubordinates })}
                title="HARMONY"
               
                userName={userName}
                userRole="Employee"
                logoSrc="/logo.png"
                mobile
                onNavigate={() => setMobileSidebarOpen(false)}
              />
              <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute right-[-48px] top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white harmony-text-primary shadow-lg"><X size={20} /></button>
            </div>
          </HarmonyPortaledOverlay>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden lg:ml-[88px] harmony-desktop-main">
          <div className="harmony-mobile-topbar sticky top-0 z-40 border-b px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setMobileSidebarOpen(true)} className="harmony-mobile-glass flex h-11 w-11 items-center justify-center rounded-2xl harmony-text-primary" aria-label="Buka menu"><Menu size={22} /></button>
              <div className="harmony-mobile-brand flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white">
                  <Image src="/logo.png" alt="HARMONY Logo" width={30} height={30} className="h-7 w-7 object-contain" priority />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold harmony-text-primary">HARMONY</p>
                  <p className="truncate text-[11px] font-medium harmony-text-secondary">Employee Dashboard</p>
                </div>
              </div>
            </div>
          </div>
          <div className="harmony-workspace w-full min-w-0"><ModuleSubnav role="employee" />{children}</div>
        </main>
      </div>
    </div>
  )
}

function formatEmailName(email: string | null) {
  return String(email || '')
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Employee'
}

