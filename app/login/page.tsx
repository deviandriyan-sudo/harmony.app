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
    localStorage.setItem(
      'harmony_user',
      JSON.stringify({
        id: appUser.id,
        email: appUser.email,
        role: appUser.role,
        employee_id: appUser.employee_id,
      }),
    )
  }

  function redirectHarmony(role: AppUser['role']) {
    router.replace(role === 'hr' ? '/hr/dashboard' : '/employee/dashboard')
  }

  async function redirectAuthenticatedUser(authUserId: string, userEmail: string) {
    const appUser = await findAppUser(authUserId, userEmail)

    if (appUser) {
      if (appUser.is_active === false) throw new Error('Akun HARMONY tidak aktif.')
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
      // Gunakan pesan akses umum di bawah.
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
      <main className="flex min-h-screen items-center justify-center bg-[#eef4fb]">
        <Loader2 className="animate-spin text-[#1d5fd0]" size={28} />
      </main>
    )
  }

  return (
    <main className="harmony-reference-login-bg relative min-h-screen overflow-hidden px-4 py-5 text-[#101828] sm:px-6 sm:py-7 lg:px-8 lg:py-10">
      <div className="harmony-reference-orb harmony-reference-orb-one" />
      <div className="harmony-reference-orb harmony-reference-orb-two" />
      <div className="harmony-reference-orb harmony-reference-orb-three" />

      <section className="relative mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-[1180px] items-center justify-center sm:min-h-[calc(100vh-56px)] lg:min-h-[calc(100vh-80px)]">
        <div className="harmony-reference-shell grid w-full overflow-hidden rounded-[34px] border lg:grid-cols-2 lg:rounded-[38px]">
          <section className="harmony-reference-brand relative overflow-hidden px-5 py-6 text-white sm:px-7 sm:py-7 lg:min-h-[700px] lg:px-8 lg:py-8">
            <div className="harmony-reference-brand-glow harmony-reference-brand-glow-one" />
            <div className="harmony-reference-brand-glow harmony-reference-brand-glow-two" />

            <div className="relative flex h-full flex-col gap-5 lg:justify-between">
              <div>
                <div className="harmony-reference-chip inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold text-white/86">
                  <Sparkles size={14} /> Integrated HR Platform
                </div>

                <div className="harmony-reference-brand-card mt-6 flex flex-col items-center rounded-[32px] border px-6 py-7 text-center sm:px-8 sm:py-8 lg:mt-7 lg:min-h-[376px] lg:justify-center">
                  <h1 className="text-[28px] font-semibold tracking-[0.24em] text-white sm:text-[34px]">HARMONY</h1>
                  <p className="mt-3 max-w-[420px] text-[14px] leading-6 text-white/68 sm:text-[15px]">
                    Human Resources Attendance, Requests &amp;<br className="hidden sm:block" /> Medical Operations System
                  </p>

                  <div className="harmony-reference-logo-wrap mt-6 flex h-[154px] w-[154px] items-center justify-center rounded-[34px] border sm:h-[170px] sm:w-[170px] lg:h-[172px] lg:w-[172px]">
                    <Image src="/logo.png" alt="Poltek Sinar Mas Berau" width={126} height={126} className="h-auto w-[112px] object-contain sm:w-[124px]" priority />
                  </div>

                  <div className="mt-6 flex w-full max-w-[430px] items-center gap-4 text-[13px] leading-5 text-white/64 sm:text-sm">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/45" />
                    <span className="max-w-[300px]">Integrated Attendance, Leave &amp; Medical Claim Management System</span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/45" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Feature icon={<Fingerprint size={19} />} tone="blue" title="Attendance & Leave" text="Absensi, cuti, izin, PHL, dan approval dalam satu workspace." />
                <Feature icon={<HeartPulse size={19} />} tone="violet" title="Re-Med" text="Medical reimbursement kini menjadi modul langsung di HARMONY." />
                <Feature icon={<ShieldCheck size={19} />} tone="green" title="Role Access" text="Menu otomatis mengikuti akses Employee, HR, atau Finance." />
              </div>
            </div>
          </section>

          <section className="harmony-reference-form-panel relative px-5 py-8 sm:px-8 sm:py-10 lg:min-h-[700px] lg:px-12 lg:py-12">
            <div className="harmony-reference-form-glow harmony-reference-form-glow-one" />
            <div className="harmony-reference-form-glow harmony-reference-form-glow-two" />

            <div className="relative mx-auto flex h-full max-w-[480px] flex-col justify-center">
              <div className="mb-7">
                <div className="harmony-reference-secure inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold text-[#0876db]">
                  <Lock size={13} /> Secure Login
                </div>
                <h2 className="mt-5 text-[34px] font-semibold tracking-[-0.035em] text-[#101828] sm:text-[40px]">Masuk ke HARMONY</h2>
              </div>

              {message && (
                <div className={`mb-5 rounded-[22px] border px-4 py-3 text-sm ${messageType === 'info' ? 'border-blue-100/80 bg-blue-50/75 text-blue-700' : 'border-red-100/80 bg-red-50/75 text-red-700'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <Field icon={<Mail size={19} />} label="Email">
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-13 w-full bg-transparent text-[15px] text-[#101828] outline-none placeholder:text-[#98a2b3]" autoComplete="email" />
                </Field>

                <Field icon={<Lock size={19} />} label="Password">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-13 w-full bg-transparent text-[15px] text-[#101828] outline-none placeholder:text-[#98a2b3]" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="rounded-full p-1 text-[#6f7f9b] transition hover:bg-white/45" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </Field>

                <div className="text-right">
                  <button type="button" onClick={handleForgotPassword} className="text-sm font-semibold text-[#0876db] transition hover:text-[#005eb8]">Lupa password?</button>
                </div>

                <button disabled={loading || googleLoading} className="harmony-reference-primary flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full px-5 text-[15px] font-bold text-white transition disabled:opacity-60">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={20} />}
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#c9d4e3]/70" />
                <span className="text-xs font-medium tracking-wide text-[#8492a6]">ATAU</span>
                <div className="h-px flex-1 bg-[#c9d4e3]/70" />
              </div>

              <button onClick={handleGoogleLogin} disabled={loading || googleLoading} className="harmony-reference-google flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full border px-5 text-[15px] font-semibold text-[#101828] transition disabled:opacity-60">
                {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                {googleLoading ? 'Menghubungkan Google...' : 'Masuk dengan Google'}
              </button>

              <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-[#7c8ca4]">
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
      <span className="text-[14px] font-semibold text-[#101828]">{label}</span>
      <div className="harmony-reference-field mt-2 flex min-h-[56px] items-center gap-3 rounded-full border px-5 text-[#72809b]">
        {icon}
        {children}
      </div>
    </label>
  )
}

function Feature({ icon, tone, title, text }: { icon: React.ReactNode; tone: 'blue' | 'violet' | 'green'; title: string; text: string }) {
  return (
    <div className="harmony-reference-feature rounded-[24px] border px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3.5">
        <div className={`harmony-reference-feature-icon harmony-reference-feature-${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-full`}>{icon}</div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-white/58">{text}</p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.18c0-.64-.06-1.26-.16-1.85H12v3.5h5.25a4.49 4.49 0 0 1-1.95 2.94v2.44h3.16c1.85-1.7 2.89-4.22 2.89-7.03Z" />
      <path fill="#34A853" d="M12 21.72c2.64 0 4.86-.87 6.48-2.37l-3.16-2.44c-.88.59-2 .94-3.32.94-2.55 0-4.7-1.72-5.48-4.03H3.26v2.52A9.79 9.79 0 0 0 12 21.72Z" />
      <path fill="#FBBC05" d="M6.52 13.82A5.9 5.9 0 0 1 6.21 12c0-.63.11-1.24.31-1.82V7.66H3.26A9.72 9.72 0 0 0 2.21 12c0 1.56.37 3.04 1.05 4.34l3.26-2.52Z" />
      <path fill="#EA4335" d="M12 6.15c1.44 0 2.72.49 3.73 1.45l2.8-2.8C16.85 3.23 14.64 2.28 12 2.28A9.79 9.79 0 0 0 3.26 7.66l3.26 2.52C7.3 7.87 9.45 6.15 12 6.15Z" />
    </svg>
  )
}
