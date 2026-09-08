'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Lock,
  MapPin,
  Phone,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

type EmployeeProfile = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  supervisor_1: string | null
  supervisor_2: string | null

  gender: string | null
  personal_phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null

  is_active: boolean | null
}

type ProfileForm = {
  gender: string
  personal_phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

type PasswordForm = {
  new_password: string
  confirm_password: string
}

const initialProfileForm: ProfileForm = {
  gender: '',
  personal_phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

const initialPasswordForm: PasswordForm = {
  new_password: '',
  confirm_password: '',
}

export default function EmployeeSettingsPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null)

  const [profileForm, setProfileForm] = useState<ProfileForm>(initialProfileForm)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(initialPasswordForm)

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState('')

  const passwordStrength = useMemo(() => {
    return getPasswordStrength(passwordForm.new_password)
  }, [passwordForm.new_password])

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    setErrorMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session user belum ditemukan. Silakan login ulang.')
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
      setErrorMessage('Akun belum terhubung ke app_users. Silakan hubungi HR.')
      setLoading(false)
      return
    }

    setAppUser(appUserData)

    if (!appUserData.employee_id) {
      setErrorMessage('Akun belum terhubung ke data employee. Silakan hubungi HR.')
      setLoading(false)
      return
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', appUserData.employee_id)
      .maybeSingle<EmployeeProfile>()

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setLoading(false)
      return
    }

    if (!employeeData) {
      setErrorMessage('Data employee tidak ditemukan.')
      setLoading(false)
      return
    }

    setEmployee(employeeData)

    setProfileForm({
      gender: employeeData.gender || '',
      personal_phone: employeeData.personal_phone || '',
      address: employeeData.address || '',
      emergency_contact_name: employeeData.emergency_contact_name || '',
      emergency_contact_phone: employeeData.emergency_contact_phone || '',
    })

    setLoading(false)
  }

  function updateProfileForm(field: keyof ProfileForm, value: string) {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function updatePasswordForm(field: keyof PasswordForm, value: string) {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSavingProfile(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!employee) {
      setErrorMessage('Data employee tidak ditemukan.')
      setSavingProfile(false)
      return
    }

    const payload = {
      gender: profileForm.gender || null,
      personal_phone: profileForm.personal_phone.trim() || null,
      address: profileForm.address.trim() || null,
      emergency_contact_name: profileForm.emergency_contact_name.trim() || null,
      emergency_contact_phone: profileForm.emergency_contact_phone.trim() || null,
      personal_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', employee.id)
      .select('*')
      .maybeSingle<EmployeeProfile>()

    if (error) {
      setErrorMessage(error.message)
      setSavingProfile(false)
      return
    }

    if (!updatedEmployee) {
      setErrorMessage('Data belum berhasil dibaca setelah update. Silakan refresh halaman.')
      setSavingProfile(false)
      return
    }

    setEmployee(updatedEmployee)

    const savedTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })

    setLastSavedAt(savedTime)
    setSuccessMessage(`Data pribadi berhasil disimpan dan diperbarui pada database HR pukul ${savedTime}.`)

    setProfileForm(initialProfileForm)
    setSavingProfile(false)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSavingPassword(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      setErrorMessage('Password baru minimal 8 karakter.')
      setSavingPassword(false)
      return
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setErrorMessage('Konfirmasi password tidak sama.')
      setSavingPassword(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.new_password,
    })

    if (error) {
      setErrorMessage(error.message)
      setSavingPassword(false)
      return
    }

    setPasswordForm(initialPasswordForm)
    setSuccessMessage('Password berhasil diperbarui.')
    setSavingPassword(false)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function closeSuccessMessage() {
    setSuccessMessage('')
  }

  function closeErrorMessage() {
    setErrorMessage('')
  }

  return (
    <>
      <Topbar
        title="Pengaturan"
        description="Kelola data pribadi dan password akun employee."
      />

      <section className="space-y-6 p-6">
        {successMessage && (
          <div className="sticky top-4 z-30 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700 shadow-[0_18px_45px_rgba(22,128,52,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <CheckCircle2 size={18} />
                  Berhasil
                </div>
                {successMessage}
              </div>

              <button
                type="button"
                onClick={closeSuccessMessage}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-green-700 transition hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="sticky top-4 z-30 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700 shadow-[0_18px_45px_rgba(194,92,0,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <AlertTriangle size={18} />
                  Perhatian
                </div>
                {errorMessage}
              </div>

              <button
                type="button"
                onClick={closeErrorMessage}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-orange-700 transition hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-[34px] border border-black/5 bg-[#1d1d1f] p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-xl">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                Employee Account
              </div>

              <h2 className="max-w-4xl text-3xl font-semibold tracking-[-0.045em] md:text-5xl">
                {employee?.full_name || appUser?.email || 'Employee'}
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62">
                Beberapa data organisasi seperti jabatan, departemen, NIP, dan machine PIN bersifat read-only dan hanya dapat diubah oleh HR.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchProfile}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="harmony-card p-6 text-sm text-[#6e6e73]">
            Memuat data pengaturan...
          </div>
        )}

        {!loading && (
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1fr]">
            <div className="space-y-6">
              <div className="harmony-card overflow-hidden">
                <div className="border-b border-black/5 p-6">
                  <h3 className="text-lg font-semibold text-[#1d1d1f]">
                    Data Organisasi
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Data berikut hanya dapat diperbarui oleh HR.
                  </p>
                </div>

                <div className="grid gap-4 p-6">
                  <ReadOnlyItem
                    icon={<UserRound size={18} />}
                    label="Nama"
                    value={employee?.full_name || '-'}
                  />

                  <ReadOnlyItem
                    icon={<IdCard size={18} />}
                    label="NIP"
                    value={employee?.employee_number || '-'}
                  />

                  <ReadOnlyItem
                    icon={<KeyRound size={18} />}
                    label="Machine PIN"
                    value={employee?.machine_pin || '-'}
                  />

                  <ReadOnlyItem
                    icon={<Building2 size={18} />}
                    label="Departemen"
                    value={employee?.department || '-'}
                  />

                  <ReadOnlyItem
                    icon={<Users size={18} />}
                    label="Jabatan"
                    value={employee?.position || '-'}
                  />

                  <ReadOnlyItem
                    icon={<ShieldCheck size={18} />}
                    label="Atasan 1"
                    value={employee?.supervisor_1 || '-'}
                  />

                  <ReadOnlyItem
                    icon={<ShieldCheck size={18} />}
                    label="Atasan 2"
                    value={employee?.supervisor_2 || '-'}
                  />
                </div>
              </div>

              <div className="harmony-card overflow-hidden">
                <div className="border-b border-black/5 p-6">
                  <h3 className="text-lg font-semibold text-[#1d1d1f]">
                    Ubah Password
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Password akan diperbarui langsung ke Supabase Auth.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 p-6">
                  <PasswordField
                    label="Password Baru"
                    value={passwordForm.new_password}
                    show={showPassword}
                    onToggle={() => setShowPassword((prev) => !prev)}
                    onChange={(value) => updatePasswordForm('new_password', value)}
                  />

                  {passwordForm.new_password && (
                    <PasswordStrengthBox
                      label={passwordStrength.label}
                      percent={passwordStrength.percent}
                      tone={passwordStrength.tone}
                    />
                  )}

                  <PasswordField
                    label="Konfirmasi Password"
                    value={passwordForm.confirm_password}
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((prev) => !prev)}
                    onChange={(value) => updatePasswordForm('confirm_password', value)}
                  />

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="harmony-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Lock size={18} />
                    {savingPassword ? 'Menyimpan...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>

            <div className="harmony-card overflow-hidden">
              <div className="border-b border-black/5 p-6">
                <h3 className="text-lg font-semibold text-[#1d1d1f]">
                  Data Pribadi
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Data berikut dapat diperbarui oleh employee dan otomatis tersimpan pada database HR.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5 p-6">
                <div className="rounded-[24px] border border-blue-100 bg-[#e8f2ff]/65 p-4 text-sm leading-6 text-[#305b86]">
                  Isi data yang ingin disimpan. Setelah berhasil, form akan dikosongkan.
                  Data lama di database akan otomatis diganti dengan data terbaru.
                  {lastSavedAt ? ` Terakhir disimpan pukul ${lastSavedAt}.` : ''}
                </div>

                <label className="block">
                  <span className="harmony-label">
                    Jenis Kelamin
                  </span>

                  <select
                    value={profileForm.gender}
                    onChange={(event) => updateProfileForm('gender', event.target.value)}
                    className="harmony-select"
                  >
                    <option value="">Kosongkan / Pilih jenis kelamin</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </label>

                <InputField
                  label="No. HP Pribadi"
                  value={profileForm.personal_phone}
                  onChange={(value) => updateProfileForm('personal_phone', value)}
                  placeholder="Contoh: 081234567890"
                  icon={<Phone size={17} />}
                />

                <TextareaField
                  label="Alamat Domisili"
                  value={profileForm.address}
                  onChange={(value) => updateProfileForm('address', value)}
                  placeholder="Masukkan alamat domisili saat ini."
                  icon={<MapPin size={17} />}
                />

                <InputField
                  label="Nama Kontak Darurat"
                  value={profileForm.emergency_contact_name}
                  onChange={(value) => updateProfileForm('emergency_contact_name', value)}
                  placeholder="Contoh: Nama keluarga / wali"
                  icon={<Users size={17} />}
                />

                <InputField
                  label="No. Kontak Darurat"
                  value={profileForm.emergency_contact_phone}
                  onChange={(value) => updateProfileForm('emergency_contact_phone', value)}
                  placeholder="Contoh: 081234567890"
                  icon={<Phone size={17} />}
                />

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={18} />
                    {savingProfile ? 'Menyimpan...' : 'Simpan / Update Data Pribadi'}
                  </button>

                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => setProfileForm(initialProfileForm)}
                    className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Kosongkan Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function ReadOnlyItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-[#1d1d1f]">
          {value}
        </p>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <div className="flex min-h-12 items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#86868b] shadow-sm">
            {icon}
          </div>
        )}

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-12 w-full min-w-0 bg-transparent text-sm font-medium text-[#1d1d1f] outline-none placeholder:text-[#9a9aa0]"
        />
      </div>
    </label>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <div className="flex min-h-32 items-start gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 py-3 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
        {icon && (
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#86868b] shadow-sm">
            {icon}
          </div>
        )}

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-28 w-full min-w-0 resize-none bg-transparent text-sm font-medium text-[#1d1d1f] outline-none placeholder:text-[#9a9aa0]"
        />
      </div>
    </label>
  )
}

function PasswordField({
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <div className="flex min-h-12 items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#86868b] shadow-sm">
          <Lock size={17} />
        </div>

        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Minimal 8 karakter"
          className="min-h-12 w-full min-w-0 bg-transparent text-sm font-medium text-[#1d1d1f] outline-none placeholder:text-[#9a9aa0]"
        />

        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[#86868b] transition hover:bg-white hover:text-[#1d1d1f]"
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  )
}

function PasswordStrengthBox({
  label,
  percent,
  tone,
}: {
  label: string
  percent: number
  tone: 'red' | 'orange' | 'green'
}) {
  const textClass =
    tone === 'red'
      ? 'text-red-600'
      : tone === 'orange'
        ? 'text-orange-600'
        : 'text-green-700'

  const barClass =
    tone === 'red'
      ? 'bg-red-500'
      : tone === 'orange'
        ? 'bg-orange-500'
        : 'bg-green-500'

  return (
    <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7]/75 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
          Kekuatan Password
        </p>

        <p className={`text-xs font-bold ${textClass}`}>
          {label}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
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