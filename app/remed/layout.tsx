'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Menu, ShieldAlert, X } from 'lucide-react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { employeeMenu, hrMenu } from '@/lib/menu'
import { REMED_ROLE_LABELS } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import { remedEmployeeMenu, remedFinanceMenu, remedHrMenu } from '@/lib/remed-menu'
import type { RemedSession } from '@/types/remed'

export default function RemedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<RemedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('Memeriksa akses Re-Med...')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  async function loadSession() {
    setLoading(true)
    try {
      const payload = await remedFetch<{ session: RemedSession }>('/api/remed/session')
      setSession(payload.session)
      localStorage.setItem('remed_user', JSON.stringify(payload.session))
    } catch (error: any) {
      localStorage.removeItem('remed_user')
      setMessage(error?.message || 'Akses Re-Med tidak tersedia.')
    } finally {
      setLoading(false)
    }
  }

  const menu = useMemo(() => {
    if (session?.role === 'hr') return [...hrMenu, ...remedHrMenu]
    if (session?.role === 'finance') return remedFinanceMenu
    return [...employeeMenu, ...remedEmployeeMenu]
  }, [session?.role])

  if (loading) return <AccessLoading message={message} />

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert size={26} />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">Akses Re-Med Ditolak</h1>
          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{message}</p>
          <button type="button" onClick={() => router.replace('/login')} className="mt-5 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white">
            Kembali ke HARMONY
          </button>
        </div>
      </main>
    )
  }

  const roleLabel = session.role === 'finance'
    ? 'Finance · Re-Med'
    : session.role === 'hr'
      ? 'HR Administrator · Re-Med'
      : 'Employee · Re-Med'

  return (
    <div className="harmony-shell min-h-screen overflow-x-hidden">
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <div className="hidden print:hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start">
          <AppSidebar
            menu={menu}
            title="HARMONY"
            subtitle="Integrated HR Platform"
            userName={session.userName}
            userRole={roleLabel}
            logoSrc="/logo.png"
          />
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 print:hidden lg:hidden">
            <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full max-w-[86vw]">
              <AppSidebar
                menu={menu}
                title="HARMONY"
                subtitle="Integrated HR Platform"
                userName={session.userName}
                userRole={roleLabel}
                logoSrc="/logo.png"
                onNavigate={() => setMobileSidebarOpen(false)}
              />
              <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute right-[-48px] top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#1d1d1f] shadow-lg">
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="harmony-mobile-topbar sticky top-0 z-40 border-b px-4 py-3 print:hidden lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setMobileSidebarOpen(true)} className="harmony-mobile-glass flex h-11 w-11 items-center justify-center rounded-2xl text-[#1d1d1f]" aria-label="Buka menu">
                <Menu size={22} />
              </button>
              <div className="harmony-mobile-brand flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white">
                  <Image src="/logo.png" alt="HARMONY Logo" width={30} height={30} className="h-7 w-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1d1d1f]">HARMONY</p>
                  <p className="truncate text-[11px] font-medium text-[#6e6e73]">Re-Med · {REMED_ROLE_LABELS[session.role]}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="harmony-workspace w-full min-w-0">{children}</div>
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

function AccessLoading({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
      <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f7f1] text-[#18794e]">
          <Loader2 size={26} className="animate-spin" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">Memeriksa Akses Re-Med</h1>
        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{message}</p>
      </div>
    </main>
  )
}
