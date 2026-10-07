'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { changeHarmonyPassword } from '@/lib/account-password'
import { remedFetch } from '@/lib/remed-client'
import type { RemedSession } from '@/types/remed'

export default function Page() {
  const [session, setSession] = useState<RemedSession | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    remedFetch<{ session: RemedSession }>('/api/remed/session')
      .then((payload) => setSession(payload.session))
      .catch(() => {})
  }, [])

  const passwordStrength = useMemo(() => {
    let score = 0
    if (newPassword.length >= 8) score += 1
    if (newPassword.length >= 12) score += 1
    if (/[A-Z]/.test(newPassword)) score += 1
    if (/[a-z]/.test(newPassword)) score += 1
    if (/[0-9]/.test(newPassword)) score += 1
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1
    return score >= 5 ? 'Kuat' : score >= 3 ? 'Cukup' : 'Lemah'
  }, [newPassword])

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setSaving(true)
    try {
      const result = await changeHarmonyPassword(newPassword, 'finance_self_service')
      setNewPassword('')
      setConfirmPassword('')
      setMessage(result.message)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Gagal memperbarui password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader eyebrow="Re-Med · Finance" title="Profil & Keamanan Finance" description="Identitas akses Finance dan keamanan akun HARMONY." icon={ShieldCheck} />

      <div className="harmony-unified-surface p-6">
        <p className="text-lg font-bold text-[#17181b]">{session?.userName || 'Finance'}</p>
        <p className="mt-1 text-sm text-[#747982]">{session?.email || '-'}</p>
        <div className="mt-5 rounded-[18px] border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          Akses Finance hanya berlaku untuk modul Re-Med dan tidak memberikan akses HR HARMONY.
        </div>
      </div>

      <form onSubmit={changePassword} className="harmony-unified-surface p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="font-bold text-[#17181b]">Ganti Password</h2>
            <p className="mt-1 text-sm text-[#747982]">Setelah password berubah, HARMONY mengirim email keamanan ke email akun Finance.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <PasswordField label="Password Baru" value={newPassword} show={showPassword} onChange={setNewPassword} onToggle={() => setShowPassword((value) => !value)} />
          <PasswordField label="Konfirmasi Password" value={confirmPassword} show={showConfirmPassword} onChange={setConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />
        </div>

        {newPassword && <p className="mt-3 text-xs font-semibold text-[#747982]">Kekuatan password: {passwordStrength}</p>}
        {message && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        {error && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={saving} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          Simpan Password
        </button>
      </form>
    </section>
  )
}

function PasswordField({
  label,
  value,
  show,
  onChange,
  onToggle,
}: {
  label: string
  value: string
  show: boolean
  onChange: (value: string) => void
  onToggle: () => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-[#747982]">{label}</span>
      <div className="mt-2 flex min-h-12 items-center rounded-2xl border border-black/10 bg-white px-4">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button type="button" onClick={onToggle} className="ml-2 text-[#747982]" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  )
}
