'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'

import { remedFetch } from '@/lib/remed-client'
import { supabase } from '@/lib/supabase'
import type { RemedSession } from '@/types/remed'

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
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run() {
    try {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) throw exchangeError
      }

      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) throw new Error('Sesi Google tidak ditemukan.')

      setMessage('Memeriksa akses HARMONY...')
      const email = (data.user.email || '').trim().toLowerCase()

      let appUser: AppUser | null = null
      const byId = await supabase
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .eq('id', data.user.id)
        .maybeSingle()

      if (byId.data) appUser = byId.data as AppUser

      if (!appUser && email) {
        const byEmail = await supabase
          .from('app_users')
          .select('id,email,role,employee_id,is_active')
          .ilike('email', email)
          .maybeSingle()
        if (byEmail.data) appUser = byEmail.data as AppUser
      }

      if (appUser) {
        if (appUser.is_active === false) throw new Error('Akun HARMONY tidak aktif.')
        localStorage.setItem('harmony_user', JSON.stringify({
          id: appUser.id,
          email: appUser.email,
          role: appUser.role,
          employee_id: appUser.employee_id,
        }))
        router.replace(appUser.role === 'hr' ? '/hr/dashboard' : '/employee/dashboard')
        return
      }

      // Finance menggunakan login HARMONY yang sama tanpa memperoleh role HR HARMONY.
      try {
        const result = await remedFetch<{ session: RemedSession }>('/api/remed/session')
        if (result.session.role === 'finance') {
          localStorage.setItem('remed_user', JSON.stringify(result.session))
          router.replace('/remed/finance/dashboard')
          return
        }
      } catch {
        // Lanjut ke error akses tunggal di bawah.
      }

      throw new Error('Email Google belum terdaftar atau tidak aktif pada HARMONY.')
    } catch (error: any) {
      await supabase.auth.signOut()
      localStorage.removeItem('harmony_user')
      localStorage.removeItem('remed_user')
      router.replace(`/login?google_error=${encodeURIComponent(error?.message || 'Login Google gagal.')}`)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
      <div className="w-full max-w-md rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e8f2ff] text-[#007aff]">
          <ShieldCheck size={28} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Google Login</h1>
        <p className="mt-3 text-sm text-[#6e6e73]">{message}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2 text-sm">
          <Loader2 size={16} className="animate-spin" /> Mohon tunggu
        </div>
      </div>
    </main>
  )
}
