'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
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

type AppMode = 'harmony' | 'remed'
type AppUser = { id: string; email: string; role: 'hr' | 'employee'; employee_id: string | null; is_active: boolean | null }

export default function LoginPage() {
  const router = useRouter()
  const touchStart = useRef<number | null>(null)
  const [mode, setMode] = useState<AppMode>('harmony')
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
    const initialMode: AppMode = params.get('app') === 'remed' ? 'remed' : 'harmony'
    setMode(initialMode)
    const googleError = params.get('google_error')
    const info = params.get('info')
    if (googleError) { setMessage(decodeURIComponent(googleError)); setMessageType('error') }
    else if (info) { setMessage(decodeURIComponent(info)); setMessageType('info') }
    checkExistingSession(initialMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function switchMode(next: AppMode) {
    setMode(next)
    setMessage('')
    const url = next === 'remed' ? '/login?app=remed' : '/login'
    window.history.replaceState({}, document.title, url)
  }

  async function checkExistingSession(target: AppMode) {
    setCheckingSession(true)
    const { data } = await supabase.auth.getUser()
    if (!data.user) { setCheckingSession(false); return }
    try {
      if (target === 'remed') {
        const result = await remedFetch<{ session: RemedSession }>('/api/remed/session')
        saveRemedSession(result.session)
        redirectRemed(result.session.role)
      } else {
        const appUser = await findAppUser(data.user.id, data.user.email || '')
        if (appUser?.is_active !== false && appUser) { saveHarmonySession(appUser); redirectHarmony(appUser.role); return }
        setCheckingSession(false)
      }
    } catch {
      setCheckingSession(false)
    }
  }

  async function findAppUser(authUserId: string, userEmail: string) {
    const byId = await supabase.from('app_users').select('id,email,role,employee_id,is_active').eq('id', authUserId).maybeSingle()
    if (byId.data) return byId.data as AppUser
    const cleanEmail = userEmail.trim().toLowerCase()
    if (!cleanEmail) return null
    const byEmail = await supabase.from('app_users').select('id,email,role,employee_id,is_active').ilike('email', cleanEmail).maybeSingle()
    return (byEmail.data || null) as AppUser | null
  }

  function saveHarmonySession(appUser: AppUser) {
    localStorage.setItem('harmony_user', JSON.stringify({ id: appUser.id, email: appUser.email, role: appUser.role, employee_id: appUser.employee_id }))
  }
  function saveRemedSession(session: RemedSession) { localStorage.setItem('remed_user', JSON.stringify(session)) }
  function redirectHarmony(role: AppUser['role']) { router.replace(role === 'hr' ? '/hr/dashboard' : '/employee/dashboard') }
  function redirectRemed(role: RemedSession['role']) { router.replace(role === 'hr' ? '/remed/hr/dashboard' : role === 'finance' ? '/remed/finance/dashboard' : '/remed/employee/dashboard') }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setMessageType('error')
    try {
      if (!email.trim() || !password) throw new Error('Email dan password wajib diisi.')
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error || !data.user) throw new Error(error?.message || 'Login gagal.')
      if (mode === 'remed') {
        const result = await remedFetch<{ session: RemedSession }>('/api/remed/session')
        saveRemedSession(result.session); redirectRemed(result.session.role); return
      }
      const appUser = await findAppUser(data.user.id, data.user.email || email)
      if (!appUser || appUser.is_active === false) throw new Error('Akun belum terdaftar atau tidak aktif pada HARMONY.')
      saveHarmonySession(appUser); redirectHarmony(appUser.role)
    } catch (error: any) {
      if (mode === 'remed' && String(error?.message || '').includes('akses Re-Med')) await supabase.auth.signOut()
      setMessage(error?.message || 'Login gagal.'); setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true); setMessage('')
    const target = mode === 'remed' ? '?app=remed' : ''
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback${target}`, queryParams: { access_type: 'offline', prompt: 'select_account' } } })
    if (error) { setMessage(error.message); setGoogleLoading(false) }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setMessage('Masukkan email terlebih dahulu.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setMessage(error?.message || 'Link reset password telah dikirim jika akun tersedia.'); setMessageType(error ? 'error' : 'info'); setLoading(false)
  }

  function handleTouchStart(event: React.TouchEvent) { touchStart.current = event.touches[0]?.clientX ?? null }
  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStart.current === null) return
    const diff = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
    if (diff < -50) switchMode('remed')
    if (diff > 50) switchMode('harmony')
    touchStart.current = null
  }

  if (checkingSession) return <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7]"><Loader2 className="animate-spin text-[#007aff]" size={28} /></main>

  const isRemed = mode === 'remed'
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] px-5 py-6 text-[#1d1d1f]">
      <div className={`pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl ${isRemed ? 'bg-emerald-500/20' : 'bg-[#007aff]/20'}`} />
      <div className="pointer-events-none absolute -bottom-36 right-0 h-[30rem] w-[30rem] rounded-full bg-[#af52de]/18 blur-3xl" />
      <section className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl items-center justify-center" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="grid w-full overflow-hidden rounded-[42px] border border-white/70 bg-white/75 shadow-[0_35px_100px_rgba(15,23,42,0.16)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className={`relative hidden min-h-[660px] overflow-hidden p-9 text-white transition-colors lg:block ${isRemed ? 'bg-[#102c24]' : 'bg-[#111113]'}`}>
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/70"><Sparkles size={14} /> {isRemed ? 'Medical Reimbursement Management System' : 'Human Attendance, Request, Monitoring & Leave System'}</div>
                <div className="mt-10 rounded-[34px] border border-white/10 bg-white/[0.07] p-7 backdrop-blur-2xl"><div className="flex items-center gap-5"><div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-white shadow-xl"><Image src="/logo.png" alt="Logo" width={72} height={72} /></div><div><h1 className="text-4xl font-semibold">{isRemed ? 'Re-Med' : 'HARMONY'}</h1><p className="mt-3 text-sm text-white/60">{isRemed ? 'Medical Reimbursement Management' : 'Human Attendance, Request, Monitoring & Leave System'}</p></div></div></div>
              </div>
              <div className="space-y-4">{isRemed ? <><Feature icon={<HeartPulse size={19}/>} title="Medical Claim" text="Klaim reimbursement terintegrasi dengan plafond."/><Feature icon={<ShieldCheck size={19}/>} title="HR Review" text="Review dokumen dan nominal secara terkontrol."/><Feature icon={<Banknote size={19}/>} title="Finance Payment" text="Approval, bukti transfer, dan status paid."/></> : <><Feature icon={<Fingerprint size={19}/>} title="Attendance" text="Monitoring kehadiran berbasis fingerprint."/><Feature icon={<ShieldCheck size={19}/>} title="Role Access" text="Akses HR dan employee dipisahkan otomatis."/><Feature icon={<UserRound size={19}/>} title="Employee Self Service" text="Cuti, izin, PHL, dan verifikasi absensi."/></>}</div>
            </div>
          </section>

          <section className="relative p-6 sm:p-8 md:p-10">
            <div className="mx-auto flex min-h-[660px] max-w-md flex-col justify-center">
              <div className="mb-6 flex items-center justify-center gap-3">
                <button type="button" onClick={() => switchMode('harmony')} className={`flex h-10 w-10 items-center justify-center rounded-2xl ${!isRemed ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7]'}`}><ArrowLeft size={17}/></button>
                <div className="flex gap-2"><span className={`h-2 rounded-full transition-all ${!isRemed ? 'w-7 bg-[#007aff]' : 'w-2 bg-black/15'}`}/><span className={`h-2 rounded-full transition-all ${isRemed ? 'w-7 bg-[#18794e]' : 'w-2 bg-black/15'}`}/></div>
                <button type="button" onClick={() => switchMode('remed')} className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isRemed ? 'bg-[#18794e] text-white' : 'bg-[#f5f5f7]'}`}><ArrowRight size={17}/></button>
              </div>
              <p className="text-center text-xs font-semibold text-[#86868b]">Swipe kiri/kanan untuk ganti aplikasi</p>
              <div className="mb-7 mt-6"><div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isRemed ? 'bg-emerald-50 text-emerald-700' : 'bg-[#e8f2ff] text-[#0059b8]'}`}><Lock size={13}/> Secure Login</div><h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Masuk ke {isRemed ? 'Re-Med' : 'HARMONY'}</h2><p className="mt-3 text-sm text-[#6e6e73]">Gunakan akun yang sudah terdaftar. Re-Med dan HARMONY memakai Supabase Auth yang sama.</p></div>
              {message && <div className={`mb-5 rounded-2xl border p-4 text-sm ${messageType==='info'?'border-blue-100 bg-blue-50 text-blue-700':'border-red-100 bg-red-50 text-red-700'}`}>{message}</div>}
              <form onSubmit={handleLogin} className="space-y-5"><Field icon={<Mail size={18}/>} label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="min-h-12 w-full bg-transparent text-sm outline-none" autoComplete="email"/></Field><Field icon={<Lock size={18}/>} label="Password"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="min-h-12 w-full bg-transparent text-sm outline-none" autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></Field><div className="text-right"><button type="button" onClick={handleForgotPassword} className={`text-sm font-semibold ${isRemed?'text-[#18794e]':'text-[#007aff]'}`}>Lupa password?</button></div><button disabled={loading||googleLoading} className={`flex min-h-13 w-full items-center justify-center gap-2 rounded-[22px] px-5 text-sm font-bold text-white ${isRemed?'bg-[#18794e]':'bg-[#007aff]'}`}>{loading?<Loader2 size={18} className="animate-spin"/>:<ArrowRight size={18}/>} {loading?'Memproses...':'Masuk'}</button></form>
              <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-black/10"/><span className="text-xs text-[#86868b]">ATAU</span><div className="h-px flex-1 bg-black/10"/></div>
              <button onClick={handleGoogleLogin} disabled={loading||googleLoading} className="flex min-h-13 w-full items-center justify-center gap-3 rounded-[22px] border border-black/5 bg-white px-5 text-sm font-bold shadow-sm">{googleLoading?<Loader2 size={18} className="animate-spin"/>:<GoogleIcon/>}{googleLoading?'Menghubungkan Google...':'Masuk dengan Google'}</button>
              <p className="mt-7 text-center text-xs text-[#86868b]">© {new Date().getFullYear()} {isRemed ? 'Re-Med' : 'HARMONY'} · Poltek Sinar Mas Berau Coal</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function Field({icon,label,children}:{icon:React.ReactNode;label:string;children:React.ReactNode}){return <label className="block"><span className="text-sm font-semibold">{label}</span><div className="mt-2 flex min-h-13 items-center gap-3 rounded-[22px] border border-black/5 bg-[#f5f5f7] px-4 text-[#86868b]">{icon}{children}</div></label>}
function Feature({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="rounded-[24px] border border-white/10 bg-white/[0.08] p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">{icon}</div><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-white/55">{text}</p></div></div></div>}
function GoogleIcon(){return <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 12.18c0-.64-.06-1.26-.16-1.85H12v3.5h5.25a4.49 4.49 0 0 1-1.95 2.94v2.44h3.16c1.85-1.7 2.89-4.22 2.89-7.03Z"/><path fill="#34A853" d="M12 21.72c2.64 0 4.86-.87 6.48-2.37l-3.16-2.44c-.88.59-2 .94-3.32.94-2.55 0-4.7-1.72-5.48-4.03H3.26v2.52A9.79 9.79 0 0 0 12 21.72Z"/><path fill="#FBBC05" d="M6.52 13.82A5.9 5.9 0 0 1 6.21 12c0-.63.11-1.24.31-1.82V7.66H3.26A9.72 9.72 0 0 0 2.21 12c0 1.56.37 3.04 1.05 4.34l3.26-2.52Z"/><path fill="#EA4335" d="M12 6.15c1.44 0 2.72.49 3.73 1.45l2.8-2.8C16.85 3.23 14.64 2.28 12 2.28A9.79 9.79 0 0 0 3.26 7.66l3.26 2.52C7.3 7.87 9.45 6.15 12 6.15Z"/></svg>}
