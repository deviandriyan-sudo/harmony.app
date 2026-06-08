'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldAlert } from 'lucide-react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { hrMenu } from '@/lib/menu'
import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

export default function HRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [userName, setUserName] = useState('HR Administrator')
  const [message, setMessage] = useState('Memeriksa akses akun...')

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    setLoading(true)
    setAllowed(false)
    setMessage('Memeriksa akses akun...')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      router.replace('/login')
      return
    }

    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, email, role, employee_id, is_active')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    if (appUserError) {
      setMessage(appUserError.message)
      setLoading(false)
      return
    }

    if (!appUser) {
      await supabase.auth.signOut()
      router.replace('/login')
      return
    }

    if (!appUser.is_active) {
      await supabase.auth.signOut()
      router.replace('/login')
      return
    }

    if (appUser.role !== 'hr') {
      router.replace('/employee/dashboard')
      return
    }

    const fallbackName =
      appUser.email
        ?.split('@')[0]
        ?.replace(/[._-]/g, ' ')
        ?.replace(/\b\w/g, (char) => char.toUpperCase()) || 'HR Administrator'

    setUserName(fallbackName)
    setAllowed(true)
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
            <Loader2 size={26} className="animate-spin" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">
            Memeriksa Akses
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            {message}
          </p>
        </div>
      </main>
    )
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert size={26} />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">
            Akses Ditolak
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            Akun ini tidak memiliki akses ke dashboard HR.
          </p>

          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-[#007aff] px-5 text-sm font-bold text-white transition hover:bg-[#0067d8]"
          >
            Kembali ke Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="flex min-h-screen">
        <AppSidebar
          menu={hrMenu}
          title="HARMONY"
          subtitle="Human Attendance & Leave System"
          userName={userName}
          userRole="HR Administrator"
          logoSrc="/logo.png"
        />

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}