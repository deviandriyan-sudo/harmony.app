'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Copy,
  DatabaseZap,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Power,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  WalletCards,
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
  created_at?: string | null
  updated_at?: string | null
}

type Employee = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  gender: string | null
  department: string | null
  position: string | null
  supervisor_1: string | null
  supervisor_2: string | null
  annual_leave_balance: number | null
  phl_balance: number | null
  is_active: boolean | null

  personal_phone?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  personal_updated_at?: string | null
  personal_updated_by?: string | null

  updated_at?: string | null
}

type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

type EmployeePasswordForm = {
  new_password: string
  confirm_password: string
}

type ConfirmAction =
  | {
      type: 'reset_profile'
      title: string
      description: string
      confirmLabel: string
    }
  | {
      type: 'reset_balance'
      title: string
      description: string
      confirmLabel: string
    }
  | {
      type: 'toggle_active'
      title: string
      description: string
      confirmLabel: string
      nextActive: boolean
    }

const initialPasswordForm: PasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

const initialEmployeePasswordForm: EmployeePasswordForm = {
  new_password: '',
  confirm_password: '',
}

export default function HRSettingsPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [appUsers, setAppUsers] = useState<AppUser[]>([])

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [showEmployeePassword, setShowEmployeePassword] = useState(false)
  const [showEmployeeConfirmPassword, setShowEmployeeConfirmPassword] = useState(false)

  const [form, setForm] = useState<PasswordForm>(initialPasswordForm)
  const [employeePasswordForm, setEmployeePasswordForm] = useState<EmployeePasswordForm>(initialEmployeePasswordForm)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const passwordStrength = useMemo(() => getPasswordStrength(form.new_password), [form.new_password])
  const employeePasswordStrength = useMemo(() => getPasswordStrength(employeePasswordForm.new_password), [employeePasswordForm.new_password])

  const selectedEmployee = useMemo(() => {
    return employees.find((employee) => employee.id === selectedEmployeeId) || null
  }, [employees, selectedEmployeeId])

  const selectedEmployeeAppUser = useMemo(() => {
    if (!selectedEmployee) return null

    return (
      appUsers.find((user) => user.employee_id === selectedEmployee.id) ||
      appUsers.find((user) => normalize(user.email) === normalize(selectedEmployee.email)) ||
      null
    )
  }, [appUsers, selectedEmployee])

  const filteredEmployees = useMemo(() => {
    const keyword = normalize(employeeSearch)

    if (!keyword) return employees

    return employees.filter((employee) => {
      return (
        normalize(employee.full_name).includes(keyword) ||
        normalize(employee.employee_number).includes(keyword) ||
        normalize(employee.email).includes(keyword) ||
        normalize(employee.department).includes(keyword) ||
        normalize(employee.position).includes(keyword)
      )
    })
  }, [employees, employeeSearch])

  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    await Promise.all([
      fetchAccount(),
      fetchEmployees(),
      fetchAppUsers(),
    ])

    setLoading(false)
  }

  async function fetchAccount() {
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session login tidak ditemukan. Silakan login ulang.')
      return
    }

    const { data: appUserData, error: appUserError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (appUserError) {
      setErrorMessage(appUserError.message)
      return
    }

    if (!appUserData) {
      setErrorMessage('Data akun tidak ditemukan pada app_users.')
      return
    }

    const currentAppUser = appUserData as AppUser

    if (currentAppUser.role !== 'hr') {
      setErrorMessage('Akun ini tidak memiliki akses ke pengaturan HR.')
      return
    }

    setAppUser(currentAppUser)
  }

  async function fetchEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      setEmployees([])
      setErrorMessage(error.message)
      return
    }

    setEmployees((data || []) as Employee[])
  }

  async function fetchAppUsers() {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('email', { ascending: true })

    if (error) {
      setAppUsers([])
      return
    }

    setAppUsers((data || []) as AppUser[])
  }

  function updateForm(field: keyof PasswordForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function updateEmployeePasswordForm(field: keyof EmployeePasswordForm, value: string) {
    setEmployeePasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function writeActionLog({
    actionType,
    targetEmployee,
    metadata = {},
  }: {
    actionType: string
    targetEmployee?: Employee | null
    metadata?: Record<string, any>
  }) {
    await supabase
      .from('hr_setting_action_logs')
      .insert({
        actor_user_id: appUser?.id || null,
        actor_email: appUser?.email || null,
        action_type: actionType,
        target_employee_id: targetEmployee?.id || null,
        target_employee_number: targetEmployee?.employee_number || null,
        target_full_name: targetEmployee?.full_name || null,
        metadata,
      })
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

    await writeActionLog({
      actionType: 'hr_changed_own_password',
      metadata: {
        source: 'hr_settings',
      },
    })

    setSuccessMessage('Password HR berhasil diperbarui.')
    setForm(initialPasswordForm)
    setSaving(false)
  }

  function generateEmployeePassword() {
    const generated = generatePassword()

    setEmployeePasswordForm({
      new_password: generated,
      confirm_password: generated,
    })

    setSuccessMessage('Password sementara berhasil dibuat. Salin password sebelum melakukan reset.')
    setErrorMessage('')
  }

  async function copyEmployeePassword() {
    if (!employeePasswordForm.new_password) {
      setErrorMessage('Belum ada password untuk disalin.')
      return
    }

    await navigator.clipboard.writeText(employeePasswordForm.new_password)
    setSuccessMessage('Password berhasil disalin ke clipboard.')
    setErrorMessage('')
  }

  async function handleResetEmployeePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setProcessing(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!selectedEmployee) {
      setErrorMessage('Pilih karyawan terlebih dahulu.')
      setProcessing(false)
      return
    }

    if (!selectedEmployeeAppUser) {
      setErrorMessage('Karyawan ini belum memiliki app_users. Buat atau sinkronkan akun login terlebih dahulu.')
      setProcessing(false)
      return
    }

    if (!employeePasswordForm.new_password || employeePasswordForm.new_password.length < 8) {
      setErrorMessage('Password karyawan minimal 8 karakter.')
      setProcessing(false)
      return
    }

    if (employeePasswordForm.new_password !== employeePasswordForm.confirm_password) {
      setErrorMessage('Konfirmasi password karyawan tidak sama.')
      setProcessing(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      setErrorMessage('Session HR tidak valid. Silakan login ulang.')
      setProcessing(false)
      return
    }

    const response = await fetch('/api/hr/users/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        app_user_id: selectedEmployeeAppUser.id,
        employee_id: selectedEmployee.id,
        new_password: employeePasswordForm.new_password,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setErrorMessage(result?.error || 'Gagal reset password karyawan.')
      setProcessing(false)
      return
    }

    setSuccessMessage(`Password ${selectedEmployee.full_name || selectedEmployee.email || 'karyawan'} berhasil direset.`)
    setEmployeePasswordForm(initialEmployeePasswordForm)
    setProcessing(false)
  }

  async function resetEmployeeProfile() {
    if (!selectedEmployee) return

    setProcessing(true)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('employees')
      .update({
        gender: 'all',
        personal_phone: null,
        address: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        personal_updated_at: null,
        personal_updated_by: null,
        updated_at: now,
      })
      .eq('id', selectedEmployee.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessing(false)
      return
    }

    await writeActionLog({
      actionType: 'reset_employee_personal_data',
      targetEmployee: selectedEmployee,
    })

    setSuccessMessage('Data pribadi karyawan berhasil direset.')
    setConfirmAction(null)
    setProcessing(false)
    await fetchEmployees()
  }

  async function resetEmployeeBalance() {
    if (!selectedEmployee) return

    setProcessing(true)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('employees')
      .update({
        annual_leave_balance: 12,
        phl_balance: 0,
        updated_at: now,
      })
      .eq('id', selectedEmployee.id)

    if (error) {
      setErrorMessage(error.message)
      setProcessing(false)
      return
    }

    await writeActionLog({
      actionType: 'reset_employee_leave_phl_balance',
      targetEmployee: selectedEmployee,
      metadata: {
        annual_leave_balance: 12,
        phl_balance: 0,
      },
    })

    setSuccessMessage('Saldo cuti dan PHL karyawan berhasil direset.')
    setConfirmAction(null)
    setProcessing(false)
    await fetchEmployees()
  }

  async function toggleEmployeeActive(nextActive: boolean) {
    if (!selectedEmployee) return

    setProcessing(true)
    setErrorMessage('')
    setSuccessMessage('')

    const now = new Date().toISOString()

    const { error: employeeError } = await supabase
      .from('employees')
      .update({
        is_active: nextActive,
        updated_at: now,
      })
      .eq('id', selectedEmployee.id)

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setProcessing(false)
      return
    }

    if (selectedEmployeeAppUser) {
      await supabase
        .from('app_users')
        .update({
          is_active: nextActive,
          updated_at: now,
        })
        .eq('id', selectedEmployeeAppUser.id)
    }

    await writeActionLog({
      actionType: nextActive ? 'activate_employee_access' : 'deactivate_employee_access',
      targetEmployee: selectedEmployee,
      metadata: {
        app_user_id: selectedEmployeeAppUser?.id || null,
      },
    })

    setSuccessMessage(nextActive ? 'Akses karyawan berhasil diaktifkan.' : 'Akses karyawan berhasil dinonaktifkan.')
    setConfirmAction(null)
    setProcessing(false)
    await Promise.all([fetchEmployees(), fetchAppUsers()])
  }

  async function handleConfirmAction() {
    if (!confirmAction) return

    if (confirmAction.type === 'reset_profile') {
      await resetEmployeeProfile()
      return
    }

    if (confirmAction.type === 'reset_balance') {
      await resetEmployeeBalance()
      return
    }

    if (confirmAction.type === 'toggle_active') {
      await toggleEmployeeActive(confirmAction.nextActive)
    }
  }

  return (
    <>
      <Topbar
        title="Pengaturan"
        description="Kelola keamanan akun HR, reset password karyawan, reset data dummy, dan kontrol akses."
      />

      <section className="space-y-5 overflow-x-hidden p-4 sm:p-6">
        {successMessage && (
          <AlertBox
            type="success"
            title="Berhasil"
            message={successMessage}
          />
        )}

        {errorMessage && (
          <AlertBox
            type="error"
            title="Perhatian"
            message={errorMessage}
          />
        )}

        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
            <AccountPanel
              appUser={appUser}
              loading={loading}
              onRefresh={fetchAllData}
            />

            <SecurityNote />

            <HRPasswordPanel
              form={form}
              saving={saving}
              loading={loading}
              passwordStrength={passwordStrength}
              showCurrentPassword={showCurrentPassword}
              showNewPassword={showNewPassword}
              showConfirmPassword={showConfirmPassword}
              onSubmit={handleChangePassword}
              onUpdate={updateForm}
              onReset={() => {
                setForm(initialPasswordForm)
                setErrorMessage('')
                setSuccessMessage('')
              }}
              onToggleCurrent={() => setShowCurrentPassword((prev) => !prev)}
              onToggleNew={() => setShowNewPassword((prev) => !prev)}
              onToggleConfirm={() => setShowConfirmPassword((prev) => !prev)}
            />
          </div>

          <div className="space-y-5">
            <EmployeeToolsPanel
              employees={filteredEmployees}
              selectedEmployee={selectedEmployee}
              selectedEmployeeAppUser={selectedEmployeeAppUser}
              search={employeeSearch}
              selectedEmployeeId={selectedEmployeeId}
              onSearchChange={setEmployeeSearch}
              onSelectedEmployeeChange={setSelectedEmployeeId}
              onRefresh={fetchAllData}
            />

            <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <EmployeePasswordResetPanel
                selectedEmployee={selectedEmployee}
                selectedEmployeeAppUser={selectedEmployeeAppUser}
                form={employeePasswordForm}
                strength={employeePasswordStrength}
                processing={processing}
                showPassword={showEmployeePassword}
                showConfirmPassword={showEmployeeConfirmPassword}
                onSubmit={handleResetEmployeePassword}
                onUpdate={updateEmployeePasswordForm}
                onGenerate={generateEmployeePassword}
                onCopy={copyEmployeePassword}
                onTogglePassword={() => setShowEmployeePassword((prev) => !prev)}
                onToggleConfirmPassword={() => setShowEmployeeConfirmPassword((prev) => !prev)}
              />

              <EmployeeDangerToolsPanel
                selectedEmployee={selectedEmployee}
                selectedEmployeeAppUser={selectedEmployeeAppUser}
                processing={processing}
                onResetProfile={() => {
                  if (!selectedEmployee) return
                  setConfirmAction({
                    type: 'reset_profile',
                    title: 'Reset Data Pribadi',
                    description: `Data pribadi ${selectedEmployee.full_name || selectedEmployee.email || 'karyawan'} akan dikosongkan. Cocok untuk membersihkan data dummy/testing.`,
                    confirmLabel: 'Reset Data Pribadi',
                  })
                }}
                onResetBalance={() => {
                  if (!selectedEmployee) return
                  setConfirmAction({
                    type: 'reset_balance',
                    title: 'Reset Saldo Cuti & PHL',
                    description: `Saldo ${selectedEmployee.full_name || selectedEmployee.email || 'karyawan'} akan dikembalikan ke Cuti 12 hari dan PHL 0 hari.`,
                    confirmLabel: 'Reset Saldo',
                  })
                }}
                onToggleActive={() => {
                  if (!selectedEmployee) return
                  const nextActive = selectedEmployee.is_active === false

                  setConfirmAction({
                    type: 'toggle_active',
                    nextActive,
                    title: nextActive ? 'Aktifkan Akses Karyawan' : 'Nonaktifkan Akses Karyawan',
                    description: `${selectedEmployee.full_name || selectedEmployee.email || 'Karyawan'} akan ${nextActive ? 'diaktifkan kembali' : 'dinonaktifkan'} pada data employee dan app_users.`,
                    confirmLabel: nextActive ? 'Aktifkan Akses' : 'Nonaktifkan Akses',
                  })
                }}
              />
            </div>
          </div>
        </div>

        {confirmAction && (
          <ConfirmActionModal
            action={confirmAction}
            processing={processing}
            onClose={() => setConfirmAction(null)}
            onConfirm={handleConfirmAction}
          />
        )}
      </section>
    </>
  )
}

function AccountPanel({
  appUser,
  loading,
  onRefresh,
}: {
  appUser: AppUser | null
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="harmony-card overflow-hidden">
      <div className="border-b border-black/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-[#e8f2ff] text-[#007aff]">
            <UserRound size={22} />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#1d1d1f]">
              Informasi Akun
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Akun HR yang sedang aktif.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-[#6e6e73]">
          Memuat informasi akun...
        </div>
      ) : (
        <div className="space-y-3 p-5">
          <AccountInfoRow icon={<Mail size={17} />} label="Email" value={appUser?.email || '-'} />
          <AccountInfoRow icon={<ShieldCheck size={17} />} label="Role" value={formatRole(appUser?.role || '-')} />
          <AccountInfoRow icon={<CheckCircle2 size={17} />} label="Status" value={appUser?.is_active ? 'Aktif' : 'Tidak Aktif'} />

          <button type="button" onClick={onRefresh} className="harmony-button-secondary mt-2">
            <RefreshCcw size={17} />
            Refresh Data
          </button>
        </div>
      )}
    </div>
  )
}

function SecurityNote() {
  return (
    <div className="rounded-[28px] border border-blue-100 bg-[#e8f2ff]/70 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
          <Lock size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-[#1d1d1f]">
            Catatan Keamanan
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#406080]">
            Reset password karyawan dijalankan lewat API server agar aman. Password sementara sebaiknya segera diganti oleh karyawan setelah login.
          </p>
        </div>
      </div>
    </div>
  )
}

function HRPasswordPanel({
  form,
  saving,
  loading,
  passwordStrength,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  onSubmit,
  onUpdate,
  onReset,
  onToggleCurrent,
  onToggleNew,
  onToggleConfirm,
}: {
  form: PasswordForm
  saving: boolean
  loading: boolean
  passwordStrength: ReturnType<typeof getPasswordStrength>
  showCurrentPassword: boolean
  showNewPassword: boolean
  showConfirmPassword: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onUpdate: (field: keyof PasswordForm, value: string) => void
  onReset: () => void
  onToggleCurrent: () => void
  onToggleNew: () => void
  onToggleConfirm: () => void
}) {
  return (
    <div className="harmony-card overflow-hidden">
      <div className="border-b border-black/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-[#1d1d1f] text-white">
            <KeyRound size={22} />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#1d1d1f]">
              Ganti Password HR
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Verifikasi password lama sebelum membuat password baru.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-5">
        <PasswordInput label="Password Lama" value={form.current_password} show={showCurrentPassword} placeholder="Masukkan password lama" autoComplete="current-password" onChange={(value) => onUpdate('current_password', value)} onToggleShow={onToggleCurrent} />
        <PasswordInput label="Password Baru" value={form.new_password} show={showNewPassword} placeholder="Minimal 8 karakter" autoComplete="new-password" onChange={(value) => onUpdate('new_password', value)} onToggleShow={onToggleNew} />

        {form.new_password && <PasswordStrengthBox passwordStrength={passwordStrength} />}

        <PasswordInput label="Konfirmasi Password Baru" value={form.confirm_password} show={showConfirmPassword} placeholder="Ulangi password baru" autoComplete="new-password" onChange={(value) => onUpdate('confirm_password', value)} onToggleShow={onToggleConfirm} />

        <div className="flex flex-col gap-3 border-t border-black/5 pt-5 md:flex-row md:justify-end">
          <button type="button" onClick={onReset} disabled={saving} className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60">
            Reset Form
          </button>

          <button type="submit" disabled={saving || loading} className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60">
            <Save size={18} />
            {saving ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EmployeeToolsPanel({
  employees,
  selectedEmployee,
  selectedEmployeeAppUser,
  search,
  selectedEmployeeId,
  onSearchChange,
  onSelectedEmployeeChange,
  onRefresh,
}: {
  employees: Employee[]
  selectedEmployee: Employee | null
  selectedEmployeeAppUser: AppUser | null
  search: string
  selectedEmployeeId: string
  onSearchChange: (value: string) => void
  onSelectedEmployeeChange: (value: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="harmony-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
            <Sparkles size={14} />
            Employee Admin Tools
          </div>

          <h2 className="text-base font-semibold text-[#1d1d1f]">
            Pilih Karyawan
          </h2>

          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            Pilih karyawan untuk reset password, reset data dummy, saldo, atau akses.
          </p>
        </div>

        <button type="button" onClick={onRefresh} className="harmony-button-secondary">
          <RefreshCcw size={17} />
          Refresh
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex min-h-12 items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
          <Search size={18} className="shrink-0 text-[#86868b]" />

          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari nama, NIP, email, unit..."
            className="min-h-12 w-full bg-transparent text-sm font-medium text-[#1d1d1f] outline-none placeholder:text-[#9a9aa0]"
          />
        </div>

        <label className="block">
          <span className="harmony-label">Karyawan</span>

          <select
            value={selectedEmployeeId}
            onChange={(event) => onSelectedEmployeeChange(event.target.value)}
            className="harmony-select"
          >
            <option value="">Pilih karyawan</option>

            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name || '-'} · {employee.employee_number || '-'} · {employee.email || '-'}
              </option>
            ))}
          </select>
        </label>

        {selectedEmployee && (
          <div className="grid gap-3 md:grid-cols-2">
            <MiniInfo icon={<UserRound size={17} />} label="Nama" value={selectedEmployee.full_name || '-'} />
            <MiniInfo icon={<Mail size={17} />} label="Email" value={selectedEmployee.email || '-'} />
            <MiniInfo icon={<Users size={17} />} label="Unit" value={selectedEmployee.department || '-'} />
            <MiniInfo icon={<BadgeCheck size={17} />} label="Employee Status" value={selectedEmployee.is_active === false ? 'Tidak Aktif' : 'Aktif'} />
            <MiniInfo icon={<ShieldCheck size={17} />} label="App User" value={selectedEmployeeAppUser ? formatRole(selectedEmployeeAppUser.role) : 'Belum Ada'} />
            <MiniInfo icon={<Power size={17} />} label="Login Status" value={selectedEmployeeAppUser?.is_active === false ? 'Tidak Aktif' : selectedEmployeeAppUser ? 'Aktif' : '-'} />
          </div>
        )}
      </div>
    </div>
  )
}

function EmployeePasswordResetPanel({
  selectedEmployee,
  selectedEmployeeAppUser,
  form,
  strength,
  processing,
  showPassword,
  showConfirmPassword,
  onSubmit,
  onUpdate,
  onGenerate,
  onCopy,
  onTogglePassword,
  onToggleConfirmPassword,
}: {
  selectedEmployee: Employee | null
  selectedEmployeeAppUser: AppUser | null
  form: EmployeePasswordForm
  strength: ReturnType<typeof getPasswordStrength>
  processing: boolean
  showPassword: boolean
  showConfirmPassword: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onUpdate: (field: keyof EmployeePasswordForm, value: string) => void
  onGenerate: () => void
  onCopy: () => void
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
}) {
  const disabled = !selectedEmployee || !selectedEmployeeAppUser

  return (
    <div className="harmony-card overflow-hidden">
      <div className="border-b border-black/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-[#e8f2ff] text-[#007aff]">
            <KeyRound size={22} />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#1d1d1f]">
              Reset Password Karyawan
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Reset password login Supabase Auth karyawan terpilih.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-5">
        {disabled && (
          <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            Pilih karyawan yang sudah memiliki akun app_users terlebih dahulu.
          </div>
        )}

        <PasswordInput label="Password Baru Karyawan" value={form.new_password} show={showPassword} placeholder="Minimal 8 karakter" autoComplete="new-password" onChange={(value) => onUpdate('new_password', value)} onToggleShow={onTogglePassword} />
        <PasswordInput label="Konfirmasi Password" value={form.confirm_password} show={showConfirmPassword} placeholder="Ulangi password" autoComplete="new-password" onChange={(value) => onUpdate('confirm_password', value)} onToggleShow={onToggleConfirmPassword} />

        {form.new_password && <PasswordStrengthBox passwordStrength={strength} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onGenerate} disabled={!selectedEmployee || processing} className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCcw size={17} />
            Generate
          </button>

          <button type="button" onClick={onCopy} disabled={!form.new_password || processing} className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60">
            <Copy size={17} />
            Copy
          </button>
        </div>

        <button type="submit" disabled={disabled || processing} className="harmony-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
          <KeyRound size={18} />
          {processing ? 'Memproses...' : 'Reset Password Karyawan'}
        </button>
      </form>
    </div>
  )
}

function EmployeeDangerToolsPanel({
  selectedEmployee,
  selectedEmployeeAppUser,
  processing,
  onResetProfile,
  onResetBalance,
  onToggleActive,
}: {
  selectedEmployee: Employee | null
  selectedEmployeeAppUser: AppUser | null
  processing: boolean
  onResetProfile: () => void
  onResetBalance: () => void
  onToggleActive: () => void
}) {
  const disabled = !selectedEmployee

  return (
    <div className="harmony-card overflow-hidden">
      <div className="border-b border-black/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-red-50 text-red-600">
            <DatabaseZap size={22} />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#1d1d1f]">
              Reset & Kontrol Data
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Untuk membersihkan data dummy/testing atau mengatur akses.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <DangerActionButton icon={<Trash2 size={17} />} title="Reset Data Pribadi" description="Kosongkan HP pribadi, alamat, kontak darurat, dan flag update pribadi." disabled={disabled || processing} onClick={onResetProfile} />

        <DangerActionButton icon={<WalletCards size={17} />} title="Reset Saldo Cuti & PHL" description="Kembalikan saldo cuti ke 12 dan saldo PHL ke 0." disabled={disabled || processing} onClick={onResetBalance} />

        <DangerActionButton
          icon={<Power size={17} />}
          title={selectedEmployee?.is_active === false ? 'Aktifkan Akses' : 'Nonaktifkan Akses'}
          description={selectedEmployeeAppUser ? 'Mengubah status aktif di employees dan app_users.' : 'Mengubah status aktif di employees. App_users belum ditemukan.'}
          disabled={disabled || processing}
          onClick={onToggleActive}
        />
      </div>
    </div>
  )
}

function ConfirmActionModal({
  action,
  processing,
  onClose,
  onConfirm,
}: {
  action: ConfirmAction
  processing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="relative overflow-hidden bg-[#1d1d1f] p-6 text-white">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-red-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#007aff]/20 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-300/20">
              <AlertTriangle size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                Konfirmasi Aksi HR
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {action.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/62">
                {action.description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 p-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={processing} className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60">
            Batal
          </button>

          <button type="button" onClick={onConfirm} disabled={processing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
            {processing ? <RefreshCcw size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
            {processing ? 'Memproses...' : action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function AccountInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-black/5 bg-[#f5f5f7]/70 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6e6e73]">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-[#1d1d1f]">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function MiniInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7]/70 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#007aff] shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6e6e73]">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-[#1d1d1f]">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function DangerActionButton({ icon, title, description, disabled, onClick }: { icon: ReactNode; title: string; description: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full rounded-[24px] border border-black/5 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-[#1d1d1f]">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}

function AlertBox({ type, title, message }: { type: 'success' | 'error'; title: string; message: string }) {
  const className = type === 'success'
    ? 'border-green-200 bg-green-50 text-green-700'
    : 'border-orange-200 bg-orange-50 text-orange-700'

  const icon = type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />

  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${className}`}>
      <div className="mb-1 flex items-center gap-2 font-bold">
        {icon}
        {title}
      </div>
      {message}
    </div>
  )
}

function PasswordInput({ label, value, show, placeholder, autoComplete, onChange, onToggleShow }: { label: string; value: string; show: boolean; placeholder: string; autoComplete: string; onChange: (value: string) => void; onToggleShow: () => void }) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <div className="flex min-h-12 items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
        <Lock size={18} className="shrink-0 text-[#86868b]" />

        <input type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="min-h-12 w-full bg-transparent text-sm font-medium text-[#1d1d1f] outline-none placeholder:text-[#9a9aa0]" />

        <button type="button" onClick={onToggleShow} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[#86868b] transition hover:bg-white hover:text-[#1d1d1f]" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  )
}

function PasswordStrengthBox({ passwordStrength }: { passwordStrength: ReturnType<typeof getPasswordStrength> }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7]/75 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
          Kekuatan Password
        </p>

        <p className={['text-xs font-bold', passwordStrength.tone === 'red' ? 'text-red-600' : passwordStrength.tone === 'orange' ? 'text-orange-600' : 'text-green-700'].join(' ')}>
          {passwordStrength.label}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
        <div className={['h-full rounded-full transition-all', passwordStrength.tone === 'red' ? 'bg-red-500' : passwordStrength.tone === 'orange' ? 'bg-orange-500' : 'bg-green-500'].join(' ')} style={{ width: `${passwordStrength.percent}%` }} />
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
    return { label: 'Lemah', percent: 34, tone: 'red' as const }
  }

  if (score <= 4) {
    return { label: 'Cukup', percent: 67, tone: 'orange' as const }
  }

  return { label: 'Kuat', percent: 100, tone: 'green' as const }
}

function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const number = '23456789'
  const symbol = '!@#$%'

  const all = upper + lower + number + symbol

  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    number[Math.floor(Math.random() * number.length)],
    symbol[Math.floor(Math.random() * symbol.length)],
  ]

  const rest = Array.from({ length: 8 }).map(() => all[Math.floor(Math.random() * all.length)])

  return [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('')
}

function normalize(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function formatRole(role: string) {
  if (role === 'hr') return 'HR Administrator'
  if (role === 'employee') return 'Employee'

  return role
}
