'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Menu, ShieldAlert, X } from 'lucide-react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { employeeMenu, employeeRemedEntry } from '@/lib/menu'
import { harmonyFetch } from '@/lib/harmony-client'
import { remedFetch } from '@/lib/remed-client'
import type { RemedSession } from '@/types/remed'
import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [userName, setUserName] = useState('Employee')
  const [message, setMessage] = useState('Memeriksa akses akun...')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [hasRemedAccess, setHasRemedAccess] = useState(false)

  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mobileSidebarOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

  async function checkAccess() {
    setLoading(true)
    setAllowed(false)
    setMessage('Memeriksa akses akun...')

    try {
      const payload = await harmonyFetch<{
        kind: 'harmony' | 'finance'
        appUser: AppUser | null
        employee: { full_name?: string | null } | null
        home: string
      }>('/api/auth/access')

      if (payload.kind !== 'harmony' || !payload.appUser) {
        router.replace(payload.home || '/login')
        return
      }

      if (String(payload.appUser.role || '').toLowerCase() === 'hr') {
        router.replace(payload.home || '/hr/dashboard')
        return
      }

      setUserName(payload.employee?.full_name || formatEmailName(payload.appUser.email))

      try {
        const remed = await remedFetch<{ session: RemedSession }>('/api/remed/session')
        setHasRemedAccess(remed.session.role === 'employee')
      } catch {
        setHasRemedAccess(false)
      }

      setAllowed(true)
    } catch (error: any) {
      setMessage(error?.message || 'Akses Employee tidak dapat diverifikasi.')
      await supabase.auth.signOut()
      router.replace('/login')
      return
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <AccessLoading message={message} />
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><ShieldAlert size={26} /></div>
          <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">Akses Ditolak</h1>
          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">Akun ini tidak memiliki akses Employee HARMONY.</p>
        </div>
      </main>
    )
  }

  return (
    <div className="harmony-shell min-h-screen overflow-x-hidden">
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <div className="hidden lg:block">
          <AppSidebar
            menu={hasRemedAccess ? [...employeeMenu, employeeRemedEntry] : employeeMenu}
            title="HARMONY"
            subtitle="Integrated HR Platform"
            userName={userName}
            userRole="Employee"
            logoSrc="/logo.png"
          />
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full max-w-[86vw]">
              <AppSidebar
                menu={hasRemedAccess ? [...employeeMenu, employeeRemedEntry] : employeeMenu}
                title="HARMONY"
                subtitle="Integrated HR Platform"
                userName={userName}
                userRole="Employee"
                logoSrc="/logo.png"
                onNavigate={() => setMobileSidebarOpen(false)}
              />
              <button type="button" aria-label="Tutup menu" onClick={() => setMobileSidebarOpen(false)} className="absolute right-[-48px] top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#1d1d1f] shadow-lg"><X size={20} /></button>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="harmony-mobile-topbar sticky top-0 z-40 border-b px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setMobileSidebarOpen(true)} className="harmony-mobile-glass flex h-11 w-11 items-center justify-center rounded-2xl text-[#1d1d1f]" aria-label="Buka menu"><Menu size={22} /></button>
              <div className="harmony-mobile-brand flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white">
                  <Image src="/logo.png" alt="HARMONY Logo" width={30} height={30} className="h-7 w-7 object-contain" priority />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1d1d1f]">HARMONY</p>
                  <p className="truncate text-[11px] font-medium text-[#6e6e73]">Employee Dashboard</p>
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

function formatEmailName(email: string) {
  return String(email || '')
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Employee'
}

function AccessLoading({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
      <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]"><Loader2 size={26} className="animate-spin" /></div>
        <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">Memeriksa Akses</h1>
        <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{message}</p>
      </div>
    </main>
  )
}
