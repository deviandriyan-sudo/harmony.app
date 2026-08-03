'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'

import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string
  role: 'hr' | 'employee'
  employee_id: string | null
  is_active: boolean | null
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Menghubungkan akun Google...')

  useEffect(() => {
    handleOAuthCallback()
  }, [])

  function redirectToLoginWithError(message: string) {
    const encoded = encodeURIComponent(message)
    router.replace(`/login?google_error=${encoded}`)
  }

  function saveLocalSession(appUser: AppUser) {
    localStorage.setItem(
      'harmony_user',
      JSON.stringify({
        id: appUser.id,
        email: appUser.email,
        role: appUser.role,
        employee_id: appUser.employee_id,
      })
    )
  }

  function redirectByRole(role: AppUser['role']) {
    if (role === 'hr') {
      router.replace('/hr/dashboard')
      return
    }

    router.replace('/employee/dashboard')
  }

  async function findAppUser(authUserId: string, userEmail: string) {
    const { data: userById, error: userByIdError } = await supabase
      .from('app_users')
      .select('id, email, role, employee_id, is_active')
      .eq('id', authUserId)
      .maybeSingle()

    if (userByIdError) throw userByIdError

    if (userById) return userById as AppUser

    const cleanEmail = userEmail.trim().toLowerCase()

    if (!cleanEmail) return null

    const { data: userByEmail, error: userByEmailError } = await supabase
      .from('app_users')
      .select('id, email, role, employee_id, is_active')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (userByEmailError) throw userByEmailError

    return (userByEmail || null) as AppUser | null
  }

  async function handleOAuthCallback() {
    try {
      setMessage('Memvalidasi callback Google...')

      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) throw error
      }

      setMessage('Memeriksa sesi Google...')

      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error('Sesi Google tidak ditemukan. Silakan login ulang.')
      }

      const authUser = authData.user
      const authEmail = authUser.email?.trim().toLowerCase() || ''

      if (!authEmail) {
        throw new Error('Email Google tidak terbaca. Gunakan akun Google dengan email aktif.')
      }

      setMessage('Mencocokkan email dengan master user HARMONY...')

      const appUser = await findAppUser(authUser.id, authEmail)

      if (!appUser) {
        await supabase.auth.signOut()
        localStorage.removeItem('harmony_user')
        redirectToLoginWithError(
          'Email Google belum terdaftar pada sistem HARMONY. Hubungi HR Administrator.'
        )
        return
      }

      if (appUser.is_active === false) {
        await supabase.auth.signOut()
        localStorage.removeItem('harmony_user')
        redirectToLoginWithError(
          'Akun Anda sedang tidak aktif. Hubungi HR Administrator.'
        )
        return
      }

      setMessage('Login berhasil. Mengalihkan ke dashboard...')

      saveLocalSession(appUser)
      redirectByRole(appUser.role)
    } catch (error: any) {
      await supabase.auth.signOut()
      localStorage.removeItem('harmony_user')

      redirectToLoginWithError(
        error?.message || 'Login Google gagal. Silakan coba lagi.'
      )
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6 text-[#1d1d1f]">
      <div className="w-full max-w-md rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e8f2ff] text-[#007aff]">
          <ShieldCheck size={28} />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Google Login
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#6e6e73]">
          {message}
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2 text-sm font-semibold text-[#6e6e73]">
          <Loader2 size={16} className="animate-spin" />
          Mohon tunggu
        </div>
      </div>
    </main>
  )
}