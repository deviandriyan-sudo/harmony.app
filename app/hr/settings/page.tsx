'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

const initialPasswordForm: PasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function HRSettingsPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [form, setForm] = useState<PasswordForm>(initialPasswordForm)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const passwordStrength = useMemo(() => {
    return getPasswordStrength(form.new_password)
  }, [form.new_password])

  useEffect(() => {
    fetchAccount()
  }, [])

  async function fetchAccount() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session login tidak ditemukan. Silakan login ulang.')
      setLoading(false)
      return
    }

    const { data: appUserData, error: appUserError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    if (appUserError) {
      setErrorMessage(appUserError.message)
      setLoading(false)
      return
    }

    if (!appUserData) {
      setErrorMessage('Data akun tidak ditemukan pada app_users.')
      setLoading(false)
      return
    }

    if (appUserData.role !== 'hr') {
      setErrorMessage('Akun ini tidak memiliki akses ke pengaturan HR.')
      setLoading(false)
      return
    }

    setAppUser(appUserData)
    setLoading(false)
  }

  function updateForm(field: keyof PasswordForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!appUser?.email) {
      setErrorMessage('Email akun tidak ditemukan.')
      setSaving(false)
      return
    }

    if (!form.current_password) {
      setErrorMessage('Password lama wajib diisi.')
      setSaving(false)
      return
    }

    if (!form.new_password) {
      setErrorMessage('Password baru wajib diisi.')
      setSaving(false)
      return
    }

    if (form.new_password.length < 8) {
      setErrorMessage('Password baru minimal 8 karakter.')
      setSaving(false)
      return
    }

    if (form.new_password !== form.confirm_password) {
      setErrorMessage('Konfirmasi password baru tidak sama.')
      setSaving(false)
      return
    }

    if (form.current_password === form.new_password) {
      setErrorMessage('Password baru tidak boleh sama dengan password lama.')
      setSaving(false)
      return
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: appUser.email,
      password: form.current_password,
    })

    if (reauthError) {
      setErrorMessage('Password lama tidak sesuai.')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: form.new_password,
    })

    if (updateError) {
      setErrorMessage(updateError.message)
      setSaving(false)
      return
    }

    setSuccessMessage('Password berhasil diperbarui.')
    setForm(initialPasswordForm)
    setSaving(false)
  }

  return (
    <>
      <Topbar
        title="Pengaturan"
        description="Kelola informasi akun dan keamanan akses dashboard HR."
      />

      <section className="space-y-6 p-6">
        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle2 size={18} />
              Berhasil
            </div>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="harmony-card overflow-hidden">
              <div className="border-b border-black/5 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#e8f2ff] text-[#007aff]">
                    <UserRound size={24} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#1d1d1f]">
                      Informasi Akun
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                      Data akun yang sedang aktif pada dashboard HR.
                    </p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-[#6e6e73]">
                  Memuat informasi akun...
                </div>
              ) : (
                <div className="space-y-4 p-6">
                  <AccountInfoRow
                    icon={<Mail size={18} />}
                    label="Email"
                    value={appUser?.email || '-'}
                  />

                  <AccountInfoRow
                    icon={<ShieldCheck size={18} />}
                    label="Role"
                    value={formatRole(appUser?.role || '-')}
                  />

                  <AccountInfoRow
                    icon={<CheckCircle2 size={18} />}
                    label="Status"
                    value={appUser?.is_active ? 'Aktif' : 'Tidak Aktif'}
                  />

                  <button
                    type="button"
                    onClick={fetchAccount}
                    className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 text-sm font-bold text-[#1d1d1f] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  >
                    <RefreshCcw size={17} />
                    Refresh Akun
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-blue-100 bg-[#e8f2ff]/70 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
                  <Lock size={22} />
                </div>

                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Catatan Keamanan
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#406080]">
                    Gunakan password yang berbeda dari akun pribadi lain.
                    Setelah password diperbarui, gunakan password baru pada login berikutnya.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="harmony-card overflow-hidden">
            <div className="border-b border-black/5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#1d1d1f] text-white">
                  <KeyRound size={24} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">
                    Ganti Password
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Masukkan password lama untuk memverifikasi akun sebelum membuat password baru.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5 p-6">
              <PasswordInput
                label="Password Lama"
                value={form.current_password}
                show={showCurrentPassword}
                placeholder="Masukkan password lama"
                autoComplete="current-password"
                onChange={(value) => updateForm('current_password', value)}
                onToggleShow={() => setShowCurrentPassword((prev) => !prev)}
              />

              <PasswordInput
                label="Password Baru"
                value={form.new_password}
                show={showNewPassword}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                onChange={(value) => updateForm('new_password', value)}
                onToggleShow={() => setShowNewPassword((prev) => !prev)}
              />

              {form.new_password && (
                <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7]/75 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
                      Kekuatan Password
                    </p>

                    <p
                      className={[
                        'text-xs font-bold',
                        passwordStrength.tone === 'red'
                          ? 'text-red-600'
                          : passwordStrength.tone === 'orange'
                            ? 'text-orange-600'
                            : 'text-green-700',
                      ].join(' ')}
                    >
                      {passwordStrength.label}
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
                    <div
                      className={[
                        'h-full rounded-full transition-all',
                        passwordStrength.tone === 'red'
                          ? 'bg-red-500'
                          : passwordStrength.tone === 'orange'
                            ? 'bg-orange-500'
                            : 'bg-green-500',
                      ].join(' ')}
                      style={{ width: `${passwordStrength.percent}%` }}
                    />
                  </div>
                </div>
              )}

              <PasswordInput
                label="Konfirmasi Password Baru"
                value={form.confirm_password}
                show={showConfirmPassword}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                onChange={(value) => updateForm('confirm_password', value)}
                onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
              />

              <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
                Pastikan password baru sudah disimpan dengan aman sebelum keluar dari dashboard.
              </div>

              <div className="flex flex-col gap-3 border-t border-black/5 pt-6 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForm(initialPasswordForm)
                    setErrorMessage('')
                    setSuccessMessage('')
                  }}
                  disabled={saving}
                  className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset Form
                </button>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {saving ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}

function AccountInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-black/5 bg-[#f5f5f7]/70 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
          {icon}
        </div>

        <div>
          <p className="text-xs font-medium text-[#6e6e73]">
            {label}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function PasswordInput({
  label,
  value,
  show,
  placeholder,
  autoComplete,
  onChange,
  onToggleShow,
}: {
  label: string
  value: string
  show: boolean
  placeholder: string
  autoComplete: string
  onChange: (value: string) => void
  onToggleShow: () => void
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <div className="flex min-h-12 items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
        <Lock size={18} className="text-[#86868b]" />

        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-h-12 w-full bg-transparent text-sm font-medium text-[#1d1d1f] outline-none placeholder:text-[#9a9aa0]"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#86868b] transition hover:bg-white hover:text-[#1d1d1f]"
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  )
}

function getPasswordStrength(password: string) {
  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 2) {
    return {
      label: 'Lemah',
      percent: 34,
      tone: 'red' as const,
    }
  }

  if (score <= 4) {
    return {
      label: 'Cukup',
      percent: 67,
      tone: 'orange' as const,
    }
  }

  return {
    label: 'Kuat',
    percent: 100,
    tone: 'green' as const,
  }
}

function formatRole(role: string) {
  if (role === 'hr') return 'HR Administrator'
  if (role === 'employee') return 'Employee'

  return role
}