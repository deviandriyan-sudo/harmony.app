'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [loading, setLoading] = useState(false)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'info'>('info')

  useEffect(() => {
    checkRecoverySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasRecoverySession(true)
        setMessage('Silakan masukkan password baru Anda.')
        setMessageType('info')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkRecoverySession() {
    setCheckingSession(true)

    try {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setHasRecoverySession(true)
        setMessage('Silakan masukkan password baru Anda.')
        setMessageType('info')
      } else {
        setHasRecoverySession(false)
        setMessage(
          'Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru dari halaman login.'
        )
        setMessageType('error')
      }
    } catch (error: any) {
      console.error(error)
      setMessage(
        error?.message ||
          'Gagal memeriksa link reset password. Silakan coba lagi.'
      )
      setMessageType('error')
    } finally {
      setCheckingSession(false)
    }
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage('')
    setMessageType('error')

    if (!hasRecoverySession) {
      setMessage(
        'Sesi reset password tidak valid. Silakan minta link reset ulang dari halaman login.'
      )
      return
    }

    if (!password || !confirmPassword) {
      setMessage('Password baru dan konfirmasi password wajib diisi.')
      return
    }

    if (password.length < 8) {
      setMessage('Password minimal 8 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Konfirmasi password tidak sama.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setMessage(error.message)
        setMessageType('error')
        setLoading(false)
        return
      }

      await supabase.auth.signOut()
      localStorage.removeItem('harmony_user')

      setMessage('Password berhasil diperbarui. Silakan login kembali.')
      setMessageType('info')

      setTimeout(() => {
        router.replace('/login')
      }, 1300)
    } catch (error: any) {
      console.error(error)
      setMessage(
        error?.message ||
          'Gagal memperbarui password. Silakan coba lagi.'
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
            Memeriksa Link
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            Sistem sedang memeriksa sesi reset password.
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

      <section className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[42px] border border-white/70 bg-white/72 shadow-[0_35px_100px_rgba(15,23,42,0.16)] backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative hidden min-h-[580px] overflow-hidden bg-[#111113] p-9 text-white lg:block">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#af52de]/25 blur-3xl" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-xl">
                  <ShieldCheck size={14} className="text-[#5ac8fa]" />
                  Password Recovery
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
                        Buat password baru untuk melanjutkan akses ke sistem.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-2xl">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-[#007aff]/14 p-3 text-[#9fd4ff]">
                    <Lock size={20} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      Reset Aman via Email
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-white/52">
                      Password hanya dapat diperbarui dari link recovery yang
                      dikirim ke email resmi pengguna.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="relative p-6 sm:p-8 md:p-10">
            <div className="mx-auto flex min-h-[580px] max-w-md flex-col justify-center">
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
                    Reset Password
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.replace('/login')}
                className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2 text-xs font-bold text-[#6e6e73] transition hover:bg-white hover:text-[#1d1d1f]"
              >
                <ArrowLeft size={14} />
                Kembali ke Login
              </button>

              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                  <Lock size={13} />
                  Reset Password
                </div>

                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#1d1d1f] md:text-4xl">
                  Buat Password Baru
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#6e6e73]">
                  Masukkan password baru untuk akun HARMONY Anda.
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

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-[#1d1d1f]">
                    Password Baru
                  </span>

                  <div className="mt-2 flex min-h-13 items-center gap-3 rounded-[22px] border border-black/5 bg-[#f5f5f7]/80 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
                    <Lock size={18} className="text-[#86868b]" />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="min-h-13 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                      autoComplete="new-password"
                      disabled={!hasRecoverySession || loading}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#86868b] transition hover:bg-white hover:text-[#1d1d1f]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#1d1d1f]">
                    Konfirmasi Password Baru
                  </span>

                  <div className="mt-2 flex min-h-13 items-center gap-3 rounded-[22px] border border-black/5 bg-[#f5f5f7]/80 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
                    <Lock size={18} className="text-[#86868b]" />

                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Ulangi password baru"
                      className="min-h-13 w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                      autoComplete="new-password"
                      disabled={!hasRecoverySession || loading}
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#86868b] transition hover:bg-white hover:text-[#1d1d1f]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading || !hasRecoverySession}
                  className="group relative flex min-h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-[22px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_18px_45px_rgba(0,122,255,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0067d8] hover:shadow-[0_24px_60px_rgba(0,122,255,0.34)] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-[100%]" />

                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memperbarui...
                    </>
                  ) : (
                    <>
                      Simpan Password Baru
                      <CheckCircle2
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