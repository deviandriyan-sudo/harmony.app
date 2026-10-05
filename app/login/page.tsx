'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'

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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'info'>('error')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleError = params.get('google_error')
    const info = params.get('info')
    if (googleError) {
      setMessage(decodeURIComponent(googleError))
      setMessageType('error')
    } else if (info) {
      setMessage(decodeURIComponent(info))
      setMessageType('info')
    }
    checkExistingSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkExistingSession() {
    setCheckingSession(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      setCheckingSession(false)
      return
    }

    try {
      await redirectAuthenticatedUser(data.user.id, data.user.email || '')
    } catch {
      setCheckingSession(false)
    }
  }

  async function findAppUser(authUserId: string, userEmail: string) {
    const byId = await supabase
      .from('app_users')
      .select('id,email,role,employee_id,is_active')
      .eq('id', authUserId)
      .maybeSingle()

    if (byId.data) return byId.data as AppUser

    const cleanEmail = userEmail.trim().toLowerCase()
    if (!cleanEmail) return null

    const byEmail = await supabase
      .from('app_users')
      .select('id,email,role,employee_id,is_active')
      .ilike('email', cleanEmail)
      .maybeSingle()

    return (byEmail.data || null) as AppUser | null
  }

  function saveHarmonySession(appUser: AppUser) {
    localStorage.setItem('harmony_user', JSON.stringify({
      id: appUser.id,
      email: appUser.email,
      role: appUser.role,
      employee_id: appUser.employee_id,
    }))
  }

  function redirectHarmony(role: AppUser['role']) {
    router.replace(role === 'hr' ? '/hr/dashboard' : '/employee/dashboard')
  }

  async function redirectAuthenticatedUser(authUserId: string, userEmail: string) {
    const appUser = await findAppUser(authUserId, userEmail)

    if (appUser) {
      if (appUser.is_active === false) {
        throw new Error('Akun HARMONY tidak aktif.')
      }
      saveHarmonySession(appUser)
      redirectHarmony(appUser.role)
      return
    }

    try {
      const result = await remedFetch<{ session: RemedSession }>('/api/remed/session')
      if (result.session.role === 'finance') {
        localStorage.setItem('remed_user', JSON.stringify(result.session))
        router.replace('/remed/finance/dashboard')
        return
      }
    } catch {
      // fallback ke pesan error umum
    }

    throw new Error('Akun belum terdaftar atau tidak aktif pada HARMONY.')
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('error')

    try {
      if (!email.trim() || !password) throw new Error('Email dan password wajib diisi.')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error || !data.user) throw new Error(error?.message || 'Login gagal.')
      await redirectAuthenticatedUser(data.user.id, data.user.email || email)
    } catch (error: any) {
      setMessage(error?.message || 'Login gagal.')
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    })

    if (error) {
      setMessage(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessage('Masukkan email terlebih dahulu.')
      setMessageType('error')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setMessage(error?.message || 'Link reset password telah dikirim jika akun tersedia.')
    setMessageType(error ? 'error' : 'info')
    setLoading(false)
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <Loader2 className="animate-spin text-[#007aff]" size={28} />
      </main>
    )
  }

  return (
    <main className="harmony-login-bg relative min-h-screen overflow-hidden px-5 py-6 text-[#1d1d1f]">
      <div className="pointer-events-none absolute -left-24 -top-20 h-[26rem] w-[26rem] rounded-full bg-[#4da1ff]/30 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 top-[10%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-white/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-[32rem] w-[32rem] rounded-full bg-[#8b6fff]/22 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-[18%] h-[22rem] w-[22rem] rounded-full bg-[#30caa0]/18 blur-[120px]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl items-center justify-center">
        <div className="harmony-login-shell grid w-full overflow-hidden rounded-[42px] border lg:grid-cols-[1.05fr_0.95fr]">
          <section className="harmony-login-dark relative hidden min-h-[660px] overflow-hidden p-9 text-white lg:block">
            <div className="pointer-events-none absolute left-[10%] top-[12%] h-44 w-44 rounded-full bg-[#2d9cff]/22 blur-[80px]" />
            <div className="pointer-events-none absolute bottom-[18%] right-[8%] h-48 w-48 rounded-full bg-[#34d0a8]/16 blur-[90px]" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-semibold text-white/78 backdrop-blur-xl">
                  <Sparkles size={14} /> Human Attendance, Request, Monitoring & Leave System
                </div>

                <div className="harmony-login-brand-panel mt-8 flex min-h-[360px] flex-col items-center justify-center rounded-[34px] border border-white/14 px-8 py-10 text-center backdrop-blur-3xl">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.42em] text-white/52">HARMONY</p>
                  <h1 className="mt-3 max-w-[28rem] text-lg font-medium leading-7 text-white/74">
                    Human Attendance, Request, Monitoring &amp; Leave System
                  </h1>

                  <div className="relative mt-10">
                    <div className="absolute inset-[-18px] rounded-[38px] bg-white/12 blur-2xl" />
                    <div className="relative flex h-[180px] w-[180px] items-center justify-center rounded-[42px] border border-white/18 bg-white/16 shadow-[0_24px_60px_rgba(11,18,34,0.35)] backdrop-blur-3xl">
                      <Image src="/logo.png" alt="HARMONY Logo" width={126} height={126} className="object-contain" priority />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Feature icon={<Fingerprint size={19} />} title="Attendance & Leave" text="Absensi, cuti, izin, PHL, dan approval dalam satu workspace." />
                <Feature icon={<HeartPulse size={19} />} title="Re-Med" text="Medical reimbursement kini menjadi modul langsung di HARMONY." />
                <Feature icon={<ShieldCheck size={19} />} title="Role Access" text="Menu otomatis mengikuti akses Employee, HR, atau Finance." />
              </div>
            </div>
          </section>

          <section className="relative p-6 sm:p-8 md:p-10">
            <div className="mx-auto flex min-h-[660px] max-w-md flex-col justify-center">
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/38 px-3 py-1.5 text-xs font-bold text-[#0059b8] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <Lock size={13} /> Secure Login
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Masuk ke HARMONY</h2>
              </div>

              {message && (
                <div className={`mb-5 rounded-[24px] border p-4 text-sm backdrop-blur-xl ${messageType === 'info' ? 'border-blue-100/80 bg-blue-50/78 text-blue-700' : 'border-red-100/80 bg-red-50/78 text-red-700'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <Field icon={<Mail size={18} />} label="Email">
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full bg-transparent text-sm outline-none" autoComplete="email" />
                </Field>

                <Field icon={<Lock size={18} />} label="Password">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full bg-transparent text-sm outline-none" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </Field>

                <div className="text-right">
                  <button type="button" onClick={handleForgotPassword} className="text-sm font-semibold text-[#007aff]">Lupa password?</button>
                </div>

                <button disabled={loading || googleLoading} className="harmony-login-primary flex min-h-13 w-full items-center justify-center gap-2 rounded-[24px] px-5 text-sm font-bold text-white disabled:opacity-60">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/10" />
                <span className="text-xs text-[#86868b]">ATAU</span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <button onClick={handleGoogleLogin} disabled={loading || googleLoading} className="harmony-login-google flex min-h-13 w-full items-center justify-center gap-3 rounded-[24px] border px-5 text-sm font-bold disabled:opacity-60">
                {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                {googleLoading ? 'Menghubungkan Google...' : 'Masuk dengan Google'}
              </button>

              <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-[#86868b]">
                <UserRound size={14} />
                <span>© {new Date().getFullYear()} HARMONY · Poltek Sinar Mas Berau Coal</span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="harmony-login-field mt-2 flex min-h-13 items-center gap-3 rounded-[24px] border px-4 text-[#86868b]">
        {icon}
        {children}
      </div>
    </label>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="harmony-login-feature rounded-[26px] border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-white/55">{text}</p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.18c0-.64-.06-1.26-.16-1.85H12v3.5h5.25a4.49 4.49 0 0 1-1.95 2.94v2.44h3.16c1.85-1.7 2.89-4.22 2.89-7.03Z" />
      <path fill="#34A853" d="M12 21.72c2.64 0 4.86-.87 6.48-2.37l-3.16-2.44c-.88.59-2 .94-3.32.94-2.55 0-4.7-1.72-5.48-4.03H3.26v2.52A9.79 9.79 0 0 0 12 21.72Z" />
      <path fill="#FBBC05" d="M6.52 13.82A5.9 5.9 0 0 1 6.21 12c0-.63.11-1.24.31-1.82V7.66H3.26A9.72 9.72 0 0 0 2.21 12c0 1.56.37 3.04 1.05 4.34l3.26-2.52Z" />
      <path fill="#EA4335" d="M12 6.15c1.44 0 2.72.49 3.73 1.45l2.8-2.8C16.85 3.23 14.64 2.28 12 2.28A9.79 9.79 0 0 0 3.26 7.66l3.26 2.52C7.3 7.87 9.45 6.15 12 6.15Z" />
    </svg>
  )
}
