'use client'


import { readErrorMessage } from '@/lib/error-utils'
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

import { HarmonyThemeToggle } from '@/components/theme/ThemeToggle'
import { harmonyFetch } from '@/lib/harmony-client'
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
  const [systemEnabled, setSystemEnabled] = useState(true)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
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

      void loadSystemStatus()
      void checkExistingSession()
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  async function loadSystemStatus() {
    try {
      const response = await fetch('/api/system/status', { cache: 'no-store' })
      if (!response.ok) return
      const payload = await response.json()
      setSystemEnabled(payload?.systemEnabled !== false)
      setMaintenanceMessage(String(payload?.maintenanceMessage || ''))
    } catch {
      setSystemEnabled(true)
    }
  }

  async function checkExistingSession() {
    setCheckingSession(true)
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      setCheckingSession(false)
      return
    }

    try {
      await redirectAuthenticatedUser()
    } catch {
      setCheckingSession(false)
    }
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

  async function redirectAuthenticatedUser() {
    const result = await harmonyFetch<{
      kind: 'harmony' | 'finance'
      appUser: AppUser | null
      home: string
    }>('/api/auth/access')

    if (result.kind === 'harmony' && result.appUser) {
      saveHarmonySession(result.appUser)
      router.replace(result.home)
      return
    }

    if (result.kind === 'finance') {
      const remed = await remedFetch<{ session: RemedSession }>('/api/remed/session')
      localStorage.setItem('remed_user', JSON.stringify(remed.session))
      router.replace(result.home || '/remed/finance/dashboard')
      return
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
      await redirectAuthenticatedUser()
    } catch (error: unknown) {
      setMessage(readErrorMessage(error) || 'Login gagal.')
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
    if (!systemEnabled) {
      setMessage('Reset password sementara dinonaktifkan selama maintenance HARMONY.')
      setMessageType('error')
      return
    }

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
      <main className="harmony-login-v383 harmony-login-checking" aria-label="Memeriksa sesi HARMONY">
        <div className="harmony-login-checking-card" role="status">
          <Loader2 size={26} className="animate-spin" aria-hidden="true" />
          <span>Memeriksa sesi aman...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="harmony-login-v383">
      <div className="harmony-login-background-lines" aria-hidden="true" />
      <div className="harmony-login-atmosphere harmony-login-atmosphere--one" aria-hidden="true" />
      <div className="harmony-login-atmosphere harmony-login-atmosphere--two" aria-hidden="true" />

      <div className="harmony-login-stage">
        <div className="harmony-login-shell">
          <div className="harmony-login-shell-glint" aria-hidden="true" />

          <section className="harmony-login-brand" aria-label="Tentang HARMONY">
            <div className="harmony-login-campus" aria-hidden="true" />
            <div className="harmony-login-brand-rings" aria-hidden="true" />
            <div className="harmony-login-brand-content">
              <div className="harmony-login-reveal harmony-login-reveal--1">
                <div className="harmony-login-eyebrow"><Sparkles size={14} aria-hidden="true" /> INTEGRATED HR PLATFORM</div>
              </div>

              <div className="harmony-login-brand-center harmony-login-reveal harmony-login-reveal--2">
                <div className="harmony-login-logo-plate">
                  <Image src="/logo.png" alt="Logo Politeknik Sinar Mas Berau Coal" width={110} height={110} priority className="harmony-login-logo" />
                </div>
                <p className="harmony-login-brand-kicker">WELCOME TO</p>
                <h1>HARMONY<span>.</span></h1>
                <p className="harmony-login-brand-description">
                  A smarter way to manage your people, attendance, leave, and employee services.
                </p>
                <div className="harmony-login-brand-rule" aria-hidden="true"><i /><span /><i /></div>
              </div>

              <div className="harmony-login-brand-features harmony-login-reveal harmony-login-reveal--3">
                <Feature icon={<Fingerprint size={18} />} title="Attendance & Leave" text="Kehadiran dan pengajuan" />
                <Feature icon={<HeartPulse size={18} />} title="Re-Med" text="Medical reimbursement" />
                <Feature icon={<ShieldCheck size={18} />} title="Secure by Role" text="Akses HR, Employee, Finance" />
              </div>
            </div>
          </section>

          <section className="harmony-login-form-panel" aria-label="Login akun HARMONY">
            <div className="harmony-login-panel-glow" aria-hidden="true" />
            <div className="harmony-login-panel-corner harmony-login-panel-corner--top" aria-hidden="true" />
            <div className="harmony-login-panel-corner harmony-login-panel-corner--bottom" aria-hidden="true" />

            <div className="harmony-login-form-inner">
              <HarmonyThemeToggle className="harmony-login-theme-control" />
              <header className="harmony-login-intro harmony-login-reveal harmony-login-reveal--2">
                <span className="harmony-login-secure"><Lock size={13} aria-hidden="true" /> SECURE LOGIN <span className="harmony-login-secure-dot" /></span>
                <p className="harmony-login-overline">YOUR WORKSPACE AWAITS</p>
                <h2>Welcome <span>Back.</span></h2>
                <p className="harmony-login-subtitle">Masuk untuk mengakses workspace HARMONY Anda.</p>
              </header>

              {!systemEnabled && (
                <div className="harmony-login-notice harmony-login-notice--warning" role="status">
                  <strong>Maintenance aktif.</strong> {maintenanceMessage || 'Akses Employee dan Finance dihentikan sementara. HR Administrator tetap dapat masuk untuk menyelesaikan pembaruan.'}
                </div>
              )}

              {message && (
                <div className={`harmony-login-notice ${messageType === 'info' ? 'harmony-login-notice--info' : 'harmony-login-notice--error'}`} role={messageType === 'error' ? 'alert' : 'status'}>
                  {message}
                </div>
              )}

              <form onSubmit={handleLogin} className="harmony-login-form harmony-login-reveal harmony-login-reveal--3">
                <LoginField icon={<Mail size={19} />} label="Email Address" id="harmony-login-email">
                  <input
                    id="harmony-login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@domain.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </LoginField>

                <LoginField icon={<Lock size={19} />} label="Password" id="harmony-login-password">
                  <input
                    id="harmony-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="harmony-login-toggle-password"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </LoginField>

                <div className="harmony-login-form-options">
                  <span><ShieldCheck size={13} aria-hidden="true" /> Encrypted session</span>
                  <button type="button" onClick={handleForgotPassword} disabled={loading || googleLoading}>Lupa password?</button>
                </div>

                <button type="submit" disabled={loading || googleLoading} className="harmony-login-submit">
                  {loading ? <Loader2 size={19} className="animate-spin" aria-hidden="true" /> : null}
                  <span>{loading ? 'Memproses...' : 'Sign In'}</span>
                  {!loading && <ArrowRight size={19} aria-hidden="true" />}
                </button>
              </form>

              <div className="harmony-login-alternative harmony-login-reveal harmony-login-reveal--4">
                <div className="harmony-login-divider"><span>OR CONTINUE WITH</span></div>
                <button type="button" onClick={handleGoogleLogin} disabled={loading || googleLoading} className="harmony-login-google">
                  {googleLoading ? <Loader2 size={19} className="animate-spin" aria-hidden="true" /> : <GoogleIcon />}
                  <span>{googleLoading ? 'Menghubungkan Google...' : 'Google'}</span>
                </button>
              </div>

              <footer className="harmony-login-footer harmony-login-reveal harmony-login-reveal--4">
                <div><UserRound size={13} aria-hidden="true" /> © {new Date().getFullYear()} HARMONY · Poltek Sinar Mas Berau Coal</div>
                <span>Developed by Devan</span>
              </footer>
            </div>
          </section>

          <div className="harmony-login-shutter harmony-login-shutter--left" aria-hidden="true" />
          <div className="harmony-login-shutter harmony-login-shutter--right" aria-hidden="true" />
        </div>
      </div>
    </main>
  )
}

function LoginField({ icon, label, id, children }: { icon: React.ReactNode; label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="harmony-login-field-group">
      <label htmlFor={id}>{label}</label>
      <div className="harmony-login-field">
        <span className="harmony-login-field-icon" aria-hidden="true">{icon}</span>
        {children}
      </div>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="harmony-login-feature">
      <span className="harmony-login-feature-icon" aria-hidden="true">{icon}</span>
      <span className="harmony-login-feature-copy"><strong>{title}</strong><small>{text}</small></span>
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
