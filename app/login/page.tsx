'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

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
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'info'>('error')

  useEffect(() => {
    checkExistingSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function findAppUser(userId: string, userEmail: string) {
    const normalizedEmail = userEmail.trim().toLowerCase()

    const { data: appUserById, error: userByIdError } = await supabase
      .from('app_users')
      .select('id, email, role, employee_id, is_active')
      .eq('id', userId)
      .maybeSingle<AppUser>()

    if (userByIdError) {
      throw userByIdError
    }

    if (appUserById) return appUserById

    if (!normalizedEmail) return null

    const { data: appUserByEmail, error: userByEmailError } = await supabase
      .from('app_users')
      .select('id, email, role, employee_id, is_active')
      .eq('email', normalizedEmail)
      .maybeSingle<AppUser>()

    if (userByEmailError) {
      throw userByEmailError
    }

    return appUserByEmail
  }

  function saveHarmonyUser(appUser: AppUser) {
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

  async function checkExistingSession() {
    setCheckingSession(true)
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        setCheckingSession(false)
        return
      }

      const appUser = await findAppUser(
        authData.user.id,
        authData.user.email || ''
      )

      if (!appUser) {
        await supabase.auth.signOut()
        localStorage.removeItem('harmony_user')
        setCheckingSession(false)
        return
      }

      if (appUser.is_active === false) {
        await supabase.auth.signOut()
        localStorage.removeItem('harmony_user')
        setMessage('Akun Anda sedang tidak aktif. Hubungi HR Administrator.')
        setMessageType('error')
        setCheckingSession(false)
        return
      }

      saveHarmonyUser(appUser)
      redirectByRole(appUser.role)
    } catch (error: any) {
      console.error(error)
      setMessage(
        error?.message ||
          'Gagal memeriksa sesi login. Silakan refresh halaman.'
      )
      setMessageType('error')
      setCheckingSession(false)
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setMessage('')
    setMessageType('error')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setMessage('Email dan password wajib diisi.')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

      if (authError || !authData.user) {
        setMessage(
          'Login gagal. Periksa kembali email dan password, atau hubungi HR Administrator.'
        )
        setLoading(false)
        return
      }

      const appUser = await findAppUser(
        authData.user.id,
        authData.user.email || normalizedEmail
      )

      if (!appUser) {
        await supabase.auth.signOut()
        localStorage.removeItem('harmony_user')
        setMessage('Akun belum terdaftar pada sistem HARMONY.')
        setLoading(false)
        return
      }

      if (appUser.is_active === false) {
        await supabase.auth.signOut()
        localStorage.removeItem('harmony_user')
        setMessage('Akun Anda sedang tidak aktif. Hubungi HR Administrator.')
        setLoading(false)
        return
      }

      saveHarmonyUser(appUser)
      setMessage('Login berhasil. Mengalihkan dashboard...')
      setMessageType('info')

      redirectByRole(appUser.role)
    } catch (error: any) {
      console.error(error)
      setMessage(
        error?.message ||
          'Terjadi kesalahan saat login. Silakan coba lagi.'
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setMessage('')
    setMessageType('error')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setMessage('Masukkan email terlebih dahulu untuk reset password.')
      return
    }

    setLoading(true)

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo,
        }
      )

      if (error) {
        setMessage(error.message)
        setMessageType('error')
        setLoading(false)
        return
      }

      setMessage(
        'Link reset password sudah dikirim ke email jika akun tersedia. Silakan cek inbox atau spam.'
      )
      setMessageType('info')
    } catch (error: any) {
      console.error(error)
      setMessage(
        error?.message ||
          'Gagal mengirim email reset password. Silakan coba lagi.'
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
            <Loader2 size={26} className="animate-spin" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">
            Memeriksa Sesi
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            Sistem sedang memeriksa status login akun Anda.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] px-5 py-6 text-[#1d1d1f]">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#007aff]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 right-0 h-[30rem] w-[30rem] rounded-full bg-[#af52de]/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[#34c759]/12 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[42px] border border-white/70 bg-white/72 shadow-[0_35px_100px_rgba(15,23,42,0.16)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[660px] overflow-hidden bg-[#111113] p-9 text-white lg:block">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#af52de]/25 blur-3xl" />
            <div className="pointer-events-none absolute right-20 top-1/2 h-56 w-56 rounded-full bg-[#34c759]/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.16),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(175,82,222,0.16),transparent_34%)]" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-xl">
                  <Sparkles size={14} className="text-[#5ac8fa]" />
                  Human Attendance, Request, Monitoring & Leave System
                </div>

                <div className="mt-10 rounded-[34px] border border-white/10 bg-white/[0.07] p-7 backdrop-blur-2xl">
                  <div className="flex items-center gap-5">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[32px] border border-white/10 bg-white shadow-[0_20px_55px_rgba(0,0,0,0.25)]">
                      <Image
                        src="/logo.png"
                        alt="HARMONY Logo"
                        width={72}
                        height={72}
                        className="object-contain"
                        priority
                      />
                    </div>

                    <div className="min-w-0">
                      <h1 className="text-4xl font-semibold tracking-tight text-white">
                        HARMONY
                      </h1>

                      <p className="mt-3 max-w-sm text-sm leading-6 text-white/58">
                        Human Attendance, Request, Monitoring & Leave System
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <FeatureCard
                  icon={<Fingerprint size={19} />}
                  title="Attendance"
                  description="Monitoring kehadiran berbasis data fingerprint."
                  tone="blue"
                />

                <FeatureCard
                  icon={<ShieldCheck size={19} />}
                  title="Role Access"
                  description="Akses HR dan employee dipisahkan otomatis."
                  tone="purple"
                />

                <FeatureCard
                  icon={<UserRound size={19} />}
                  title="Employee Self Service"
                  description="Karyawan masuk ke dashboard sesuai akun masing-masing."
                  tone="green"
                />
              </div>
            </div>
          </section>

          <section className="relative p-6 sm:p-8 md:p-10">
            <div className="mx-auto flex min-h-[660px] max-w-md flex-col justify-center">
              <div className="mb-9 lg:hidden">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] border border-black/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                  <Image
                    src="/logo.png"
                    alt="HARMONY Logo"
                    width={68}
                    height={68}
                    className="object-contain"
                    priority
                  />
                </div>

                <div className="mt-5 text-center">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    HARMONY
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                    Human Attendance, Request, Monitoring & Leave System
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                  <Lock size={13} />
                  Secure Login
                </div>

                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#1d1d1f] md:text-4xl">
                  Masuk ke HARMONY
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#6e6e73]">
                  Gunakan akun yang sudah dibuat oleh HR Administrator.
                </p>
              </div>

              {message && (
                <div
                  className={[
                    'mb-5 rounded-2xl border p-4 text-sm leading-6',
                    messageType === 'info'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-red-200 bg-red-50 text-red-600',
                  ].join(' ')}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-[#1d1d1f]">
                    Email
                  </span>

                  <div className="mt-2 flex min-h-13 items-center gap-3 rounded-[22px] border border-black/5 bg-[#f5f5f7]/80 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
                    <Mail size={18} className="text-[#86868b]" />

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nama@company.com"
                      className="min-h-13 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                      autoComplete="email"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#1d1d1f]">
                    Password
                  </span>

                  <div className="mt-2 flex min-h-13 items-center gap-3 rounded-[22px] border border-black/5 bg-[#f5f5f7]/80 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
                    <Lock size={18} className="text-[#86868b]" />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Masukkan password"
                      className="min-h-13 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#86868b] transition hover:bg-white hover:text-[#1d1d1f]"
                      aria-label={
                        showPassword
                          ? 'Sembunyikan password'
                          : 'Tampilkan password'
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-sm font-semibold text-[#007aff] transition hover:text-[#0059b8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Lupa password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex min-h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-[22px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_18px_45px_rgba(0,122,255,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0067d8] hover:shadow-[0_24px_60px_rgba(0,122,255,0.34)] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-[100%]" />

                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Masuk
                      <ArrowRight
                        size={18}
                        className="transition group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-10 text-center text-xs leading-5 text-[#86868b]">
                © {new Date().getFullYear()} HARMONY · Poltek Sinar Mas Berau
                Coal
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode
  title: string
  description: string
  tone: 'blue' | 'purple' | 'green'
}) {
  const toneClass = {
    blue: 'bg-[#007aff]/14 text-[#9fd4ff]',
    purple: 'bg-[#af52de]/14 text-[#e9b9ff]',
    green: 'bg-[#34c759]/14 text-[#a7f5ba]',
  }[tone]

  return (
    <div className="group rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/14">
      <div className="flex items-start gap-4">
        <div className={`rounded-2xl p-3 ${toneClass}`}>{icon}</div>

        <div>
          <h3 className="font-semibold text-white">{title}</h3>

          <p className="mt-1 text-sm leading-6 text-white/52">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}