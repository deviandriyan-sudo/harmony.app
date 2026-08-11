'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Globe2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCcw,
  Send,
  Server,
  ShieldCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { sendHarmonyEmail } from '@/lib/notifications'

type DiagnosticData = {
  ok?: boolean
  ready?: boolean
  environment?: {
    resend_api_key_configured?: boolean
    notification_from_configured?: boolean
    notification_from?: string | null
    sender_email?: string | null
    sender_domain?: string | null
    notification_reply_to?: string | null
    app_url?: string | null
  }
  domain?: {
    checked?: boolean
    found?: boolean
    name?: string
    status?: string
    sendingCapability?: string
    message?: string
  }
  checked_at?: string
}

type AppUser = {
  id: string
  email: string
  role: string
  is_active?: boolean | null
}

type MessageState = {
  type: 'success' | 'error' | 'info'
  text: string
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  )
}

export default function HRNotificationDiagnosticsPage() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [diagnostic, setDiagnostic] =
    useState<DiagnosticData | null>(null)
  const [appUser, setAppUser] =
    useState<AppUser | null>(null)
  const [recipient, setRecipient] =
    useState('')
  const [message, setMessage] =
    useState<MessageState | null>(null)

  const canAccess = useMemo(() => {
    const role = normalize(appUser?.role)

    return [
      'hr',
      'admin',
      'administrator',
      'super_admin',
      'human_resources',
    ].includes(role)
  }, [appUser?.role])

  useEffect(() => {
    initialize()
  }, [])

  async function initialize() {
    setLoading(true)
    setMessage(null)

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error(
          'Session login tidak ditemukan. Silakan login ulang.'
        )
      }

      let currentAppUser: AppUser | null =
        null

      const { data: byId } =
        await supabase
          .from('app_users')
          .select('id, email, role, is_active')
          .eq('id', authData.user.id)
          .maybeSingle<AppUser>()

      if (byId) {
        currentAppUser = byId
      } else if (authData.user.email) {
        const { data: byEmail } =
          await supabase
            .from('app_users')
            .select(
              'id, email, role, is_active'
            )
            .eq(
              'email',
              authData.user.email
            )
            .maybeSingle<AppUser>()

        currentAppUser =
          byEmail || null
      }

      if (!currentAppUser) {
        throw new Error(
          'Data app_users untuk akun ini tidak ditemukan.'
        )
      }

      setAppUser(currentAppUser)
      setRecipient(
        currentAppUser.email ||
          authData.user.email ||
          ''
      )

      await fetchDiagnostic()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Diagnostik email belum dapat dibuka.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchDiagnostic() {
    setMessage(null)

    const { data: sessionData } =
      await supabase.auth.getSession()

    const token =
      sessionData.session?.access_token

    if (!token) {
      throw new Error(
        'Session HARMONY tidak valid.'
      )
    }

    const response = await fetch(
      '/api/notifications/send-email',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      }
    )

    const result =
      await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        result?.message ||
          'Diagnostik email gagal dijalankan.'
      )
    }

    setDiagnostic(result)
  }

  async function handleRefresh() {
    setLoading(true)

    try {
      await fetchDiagnostic()
      setMessage({
        type: 'info',
        text:
          'Status konfigurasi email berhasil diperbarui.',
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Status email gagal diperbarui.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleTestEmail() {
    setMessage(null)

    if (!recipient.trim()) {
      setMessage({
        type: 'error',
        text: 'Email tujuan wajib diisi.',
      })
      return
    }

    if (!isValidEmail(recipient)) {
      setMessage({
        type: 'error',
        text:
          'Format email tujuan belum valid.',
      })
      return
    }

    setSending(true)

    try {
      const result =
        await sendHarmonyEmail({
          to: recipient.trim(),
          subject:
            '[HARMONY] Test Email Notification',
          title:
            'Test Email Notification HARMONY',
          message: [
            `Halo,`,
            '',
            'Ini adalah email test dari pusat notifikasi HARMONY.',
            '',
            'Jika email ini diterima, berarti konfigurasi Resend, sender, domain, route API, dan autentikasi HARMONY sudah berhasil.',
            '',
            `Dikirim oleh: ${appUser?.email || 'HR Administrator'}`,
            `Waktu test: ${new Date().toLocaleString('id-ID')}`,
          ].join('\n'),
          actionLabel: 'Buka HARMONY',
          actionUrl:
            diagnostic?.environment?.app_url ||
            'https://harmony-app-ten.vercel.app',
          footer:
            'Email test ini dikirim dari menu Diagnostik Email HARMONY.',
        })

      setMessage({
        type: 'success',
        text:
          `Email test berhasil dikirim ke ${recipient.trim()}. Provider ID: ${result.provider_id || '-'}. Cek inbox dan folder spam.`,
      })

      await fetchDiagnostic()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Email test belum berhasil dikirim.',
      })
    } finally {
      setSending(false)
    }
  }

  const environment =
    diagnostic?.environment
  const domain =
    diagnostic?.domain

  return (
    <>
      <Topbar
        title="Diagnostik Email"
        description="Pusat pengecekan notifikasi email HARMONY untuk seluruh workflow."
      />

      <main className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/hr/settings"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Kembali ke Pengaturan
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <RefreshCcw size={16} />
            )}
            Refresh Status
          </button>
        </div>

        {message && (
          <section
            className={[
              'rounded-[24px] border p-4 text-sm leading-6',
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              {message.type === 'success' ? (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              )}
              <div>
                <p className="font-bold">
                  {message.type === 'success'
                    ? 'Berhasil'
                    : message.type === 'error'
                      ? 'Perhatian'
                      : 'Informasi'}
                </p>
                <p className="mt-1">
                  {message.text}
                </p>
              </div>
            </div>
          </section>
        )}

        {!loading && !canAccess ? (
          <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Menu ini hanya dapat dibuka oleh HR/Admin.
          </section>
        ) : (
          <>
            <section
              className={[
                'rounded-[30px] border p-5 shadow-sm sm:p-6',
                diagnostic?.ready
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-orange-200 bg-orange-50',
              ].join(' ')}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {diagnostic?.ready ? (
                      <CheckCircle2
                        size={20}
                        className="text-emerald-600"
                      />
                    ) : (
                      <AlertTriangle
                        size={20}
                        className="text-orange-600"
                      />
                    )}
                    Status Pusat Notifikasi
                  </div>

                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f]">
                    {diagnostic?.ready
                      ? 'Email siap digunakan'
                      : 'Email belum siap digunakan'}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
                    Semua workflow email HARMONY memakai mesin pusat yang sama.
                    Jika status ini belum siap, notifikasi absensi, cuti, PHL,
                    postpone, approval, dan finalisasi juga akan gagal.
                  </p>
                </div>

                <div
                  className={[
                    'rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide',
                    diagnostic?.ready
                      ? 'bg-emerald-600 text-white'
                      : 'bg-orange-500 text-white',
                  ].join(' ')}
                >
                  {diagnostic?.ready
                    ? 'READY'
                    : 'NEEDS SETUP'}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                icon={<KeyRound size={19} />}
                label="RESEND_API_KEY"
                value={
                  environment?.resend_api_key_configured
                    ? 'Tersedia'
                    : 'Belum Ada'
                }
                ok={
                  environment?.resend_api_key_configured ===
                  true
                }
              />

              <StatusCard
                icon={<Mail size={19} />}
                label="Sender Email"
                value={
                  environment?.notification_from ||
                  'Belum diatur'
                }
                ok={
                  environment?.notification_from_configured ===
                  true
                }
              />

              <StatusCard
                icon={<Globe2 size={19} />}
                label="Domain Resend"
                value={
                  domain?.name ||
                  environment?.sender_domain ||
                  'Belum tersedia'
                }
                subvalue={
                  domain?.status
                    ? `Status: ${domain.status}`
                    : domain?.message
                }
                ok={
                  Boolean(domain?.found) &&
                  domain?.status === 'verified' &&
                  domain?.sendingCapability !==
                    'disabled'
                }
              />

              <StatusCard
                icon={<Server size={19} />}
                label="Production URL"
                value={
                  environment?.app_url ||
                  'Belum tersedia'
                }
                ok={Boolean(environment?.app_url)}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
                    <Send size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1d1d1f]">
                      Kirim Email Test
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                      Gunakan email yang sudah terdaftar pada employees atau
                      app_users HARMONY.
                    </p>
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="text-xs font-bold text-slate-600">
                    Email Tujuan
                  </span>
                  <input
                    value={recipient}
                    onChange={(event) =>
                      setRecipient(
                        event.target.value
                      )
                    }
                    placeholder="nama@polteksimasberau.ac.id"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#007aff] focus:bg-white"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={
                    sending ||
                    loading ||
                    !diagnostic?.ready
                  }
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-4 text-sm font-bold text-white transition hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={17} />
                  )}
                  {sending
                    ? 'Mengirim...'
                    : 'Kirim Test Email'}
                </button>
              </div>

              <div className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1d1d1f]">
                      Checklist Konfigurasi
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                      Semua poin berikut harus aman sebelum email workflow dipakai.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <Checklist
                    done={
                      environment?.resend_api_key_configured ===
                      true
                    }
                    text="RESEND_API_KEY tersedia di Vercel."
                  />
                  <Checklist
                    done={
                      environment?.notification_from_configured ===
                      true
                    }
                    text="NOTIFICATION_FROM_EMAIL valid."
                  />
                  <Checklist
                    done={
                      Boolean(domain?.found) &&
                      domain?.status === 'verified'
                    }
                    text="Domain sender sudah verified di Resend."
                  />
                  <Checklist
                    done={
                      domain?.sendingCapability !==
                        'disabled' &&
                      Boolean(domain?.found)
                    }
                    text="Capability sending tidak disabled."
                  />
                  <Checklist
                    done={Boolean(environment?.app_url)}
                    text="URL production HARMONY tersedia."
                  />
                </div>

                {domain?.message && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    {domain.message}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  )
}

function StatusCard({
  icon,
  label,
  value,
  subvalue,
  ok,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subvalue?: string
  ok: boolean
}) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            'rounded-2xl p-2.5',
            ok
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-orange-50 text-orange-600',
          ].join(' ')}
        >
          {icon}
        </div>

        <span
          className={[
            'rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase',
            ok
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-orange-50 text-orange-700',
          ].join(' ')}
        >
          {ok ? 'OK' : 'CHECK'}
        </span>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-[#1d1d1f]">
        {value}
      </p>
      {subvalue && (
        <p className="mt-1 break-words text-xs leading-5 text-slate-500">
          {subvalue}
        </p>
      )}
    </div>
  )
}

function Checklist({
  done,
  text,
}: {
  done: boolean
  text: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3">
      {done ? (
        <CheckCircle2
          size={18}
          className="mt-0.5 shrink-0 text-emerald-600"
        />
      ) : (
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-orange-500"
        />
      )}
      <span className="text-sm leading-6 text-slate-700">
        {text}
      </span>
    </div>
  )
}