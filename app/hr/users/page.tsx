'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Plus,
  RefreshCcw,
  Save,
  X,
  UserCog,
  ShieldCheck,
  Users,
  KeyRound,
  Power,
  AlertTriangle,
  ListChecks,
  UserPlus,
  Layers,
  Sparkles,
  Mail,
  BadgeCheck,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type EmployeeOption = {
  id: string
  employee_number: string | null
  full_name: string | null
  email: string | null
  department: string | null
  position: string | null
  machine_pin: string | null
}

type AppUser = {
  id: string
  email: string
  role: 'hr' | 'employee'
  employee_id: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  employees?: EmployeeOption | null
}

type UserForm = {
  email: string
  password: string
  role: 'hr' | 'employee'
  employee_id: string
}

type ResetPasswordForm = {
  user_id: string
  email: string
  new_password: string
}

type InputMode = 'manual' | 'checklist' | 'bulk'

const initialUserForm: UserForm = {
  email: '',
  password: '',
  role: 'employee',
  employee_id: '',
}

const initialResetForm: ResetPasswordForm = {
  user_id: '',
  email: '',
  new_password: '',
}

export default function HRUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [inputMode, setInputMode] = useState<InputMode>('manual')
  const [showForm, setShowForm] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)

  const [form, setForm] = useState<UserForm>(initialUserForm)
  const [resetForm, setResetForm] = useState<ResetPasswordForm>(initialResetForm)

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [bulkPassword, setBulkPassword] = useState('')
  const [bulkRole, setBulkRole] = useState<'employee' | 'hr'>('employee')

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [bulkResultMessage, setBulkResultMessage] = useState('')

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    const userResponse = await fetch('/api/hr/users')
    const userJson = await userResponse.json()

    if (!userResponse.ok) {
      setErrorMessage(userJson.message || 'Gagal memuat data user.')
      setUsers([])
      setLoading(false)
      return
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id, employee_number, full_name, email, department, position, machine_pin')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setEmployees([])
      setLoading(false)
      return
    }

    setUsers(userJson.users || [])
    setEmployees(employeeData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const existingEmployeeIds = useMemo(() => {
    return new Set(
      users
        .map((user) => user.employee_id)
        .filter(Boolean)
    )
  }, [users])

  const existingEmails = useMemo(() => {
    return new Set(
      users
        .map((user) => String(user.email || '').toLowerCase())
        .filter(Boolean)
    )
  }, [users])

  const employeesWithoutUser = useMemo(() => {
    return employees.filter((employee) => {
      const email = String(employee.email || '').trim().toLowerCase()

      if (!employee.email) return false
      if (existingEmployeeIds.has(employee.id)) return false
      if (existingEmails.has(email)) return false

      return true
    })
  }, [employees, existingEmployeeIds, existingEmails])

  const employeesWithoutEmail = useMemo(() => {
    return employees.filter((employee) => {
      return !employee.email
    })
  }, [employees])

  function resetUserForm() {
    setForm(initialUserForm)
    setShowForm(false)
    setSelectedEmployeeIds([])
    setBulkPassword('')
    setBulkRole('employee')
    setBulkResultMessage('')
    setErrorMessage('')
  }

  function openAddUserForm(mode: InputMode = 'manual') {
    setInputMode(mode)
    setForm(initialUserForm)
    setSelectedEmployeeIds([])
    setBulkPassword('')
    setBulkRole('employee')
    setBulkResultMessage('')
    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function updateForm(field: keyof UserForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function handleEmployeeSelect(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId)

    setForm((prev) => ({
      ...prev,
      employee_id: employeeId,
      email: employee?.email || prev.email,
      role: prev.role || 'employee',
    }))
  }

  function toggleSelectedEmployee(employeeId: string) {
    setSelectedEmployeeIds((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId)
      }

      return [...prev, employeeId]
    })
  }

  function selectAllEmployeesWithoutUser() {
    setSelectedEmployeeIds(employeesWithoutUser.map((employee) => employee.id))
  }

  function clearSelectedEmployees() {
    setSelectedEmployeeIds([])
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    setBulkResultMessage('')

    if (!form.email) {
      setErrorMessage('Email wajib diisi.')
      setSaving(false)
      return
    }

    if (!form.password || form.password.length < 6) {
      setErrorMessage('Password minimal 6 karakter.')
      setSaving(false)
      return
    }

    const response = await fetch('/api/hr/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        role: form.role,
        employee_id: form.employee_id || null,
      }),
    })

    const json = await response.json()

    if (!response.ok) {
      setErrorMessage(json.message || 'Gagal membuat user.')
      setSaving(false)
      return
    }

    setSuccessMessage('User berhasil dibuat dan masuk ke Supabase Auth.')
    setForm(initialUserForm)
    setShowForm(false)
    setSaving(false)

    await fetchData()
  }

  async function handleBulkSelected(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    setBulkResultMessage('')

    if (selectedEmployeeIds.length === 0) {
      setErrorMessage('Pilih minimal satu employee.')
      setSaving(false)
      return
    }

    if (!bulkPassword || bulkPassword.length < 6) {
      setErrorMessage('Password default minimal 6 karakter.')
      setSaving(false)
      return
    }

    const response = await fetch('/api/hr/users/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'selected',
        employee_ids: selectedEmployeeIds,
        default_password: bulkPassword,
        role: bulkRole,
      }),
    })

    const json = await response.json()

    if (!response.ok) {
      setErrorMessage(json.message || 'Gagal membuat user checklist.')
      setSaving(false)
      return
    }

    setSuccessMessage(json.message || 'User checklist berhasil dibuat.')
    setBulkResultMessage(buildBulkSummary(json))
    setSelectedEmployeeIds([])
    setBulkPassword('')
    setSaving(false)

    await fetchData()
  }

  async function handleBulkAll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    setBulkResultMessage('')

    if (!bulkPassword || bulkPassword.length < 6) {
      setErrorMessage('Password default minimal 6 karakter.')
      setSaving(false)
      return
    }

    const confirmed = window.confirm(
      `Buat user untuk semua employee aktif yang belum punya akun dan memiliki email?\n\nTotal kandidat: ${employeesWithoutUser.length}`
    )

    if (!confirmed) {
      setSaving(false)
      return
    }

    const response = await fetch('/api/hr/users/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'all_missing',
        default_password: bulkPassword,
        role: bulkRole,
      }),
    })

    const json = await response.json()

    if (!response.ok) {
      setErrorMessage(json.message || 'Gagal membuat bulk user.')
      setSaving(false)
      return
    }

    setSuccessMessage(json.message || 'Bulk user berhasil dibuat.')
    setBulkResultMessage(buildBulkSummary(json))
    setBulkPassword('')
    setSaving(false)

    await fetchData()
  }

  function buildBulkSummary(json: any) {
    const createdCount = json.created?.length || 0
    const skippedCount = json.skipped?.length || 0
    const failedCount = json.failed?.length || 0

    return `Created: ${createdCount} · Skipped: ${skippedCount} · Failed: ${failedCount}`
  }

  function openResetPassword(user: AppUser) {
    setResetForm({
      user_id: user.id,
      email: user.email,
      new_password: '',
    })

    setShowResetModal(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!resetForm.user_id) {
      setErrorMessage('User tidak ditemukan.')
      setSaving(false)
      return
    }

    if (!resetForm.new_password || resetForm.new_password.length < 6) {
      setErrorMessage('Password baru minimal 6 karakter.')
      setSaving(false)
      return
    }

    const response = await fetch('/api/hr/users/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: resetForm.user_id,
        new_password: resetForm.new_password,
      }),
    })

    const json = await response.json()

    if (!response.ok) {
      setErrorMessage(json.message || 'Gagal reset password.')
      setSaving(false)
      return
    }

    setSuccessMessage(`Password untuk ${resetForm.email} berhasil direset.`)
    setResetForm(initialResetForm)
    setShowResetModal(false)
    setSaving(false)
  }

  async function updateUser(user: AppUser, payload: Record<string, unknown>) {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const response = await fetch('/api/hr/users/update', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        ...payload,
      }),
    })

    const json = await response.json()

    if (!response.ok) {
      setErrorMessage(json.message || 'Gagal update user.')
      setSaving(false)
      return
    }

    setSuccessMessage('User berhasil diperbarui.')
    setSaving(false)

    await fetchData()
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return users.filter((user) => {
      const employee = user.employees

      const matchesKeyword =
        !keyword ||
        user.email.toLowerCase().includes(keyword) ||
        user.role.toLowerCase().includes(keyword) ||
        employee?.full_name?.toLowerCase().includes(keyword) ||
        employee?.employee_number?.toLowerCase().includes(keyword) ||
        employee?.department?.toLowerCase().includes(keyword) ||
        employee?.position?.toLowerCase().includes(keyword)

      const matchesRole =
        roleFilter === 'all' || user.role === roleFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)

      return matchesKeyword && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const totalUsers = users.length
  const hrCount = users.filter((item) => item.role === 'hr').length
  const employeeCount = users.filter((item) => item.role === 'employee').length
  const activeCount = users.filter((item) => item.is_active).length
  const inactiveCount = users.filter((item) => !item.is_active).length

  return (
    <>
      <Topbar
        title="User Management"
        description="Kelola akun login, role HR/Employee, koneksi employee, reset password, dan bulk user creation."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total User"
            value={String(totalUsers)}
            description="Akun terdaftar"
            icon={<UserCog size={20} />}
            tone="blue"
          />

          <SummaryCard
            title="HR"
            value={String(hrCount)}
            description="Akses dashboard HR"
            icon={<ShieldCheck size={20} />}
            tone="purple"
          />

          <SummaryCard
            title="Employee"
            value={String(employeeCount)}
            description="Akses dashboard employee"
            icon={<Users size={20} />}
            tone="green"
          />

          <SummaryCard
            title="Active"
            value={String(activeCount)}
            description="User aktif"
            icon={<BadgeCheck size={20} />}
            tone="cyan"
          />

          <SummaryCard
            title="Belum Ada User"
            value={String(employeesWithoutUser.length)}
            description="Employee aktif dengan email"
            icon={<AlertTriangle size={20} />}
            tone="orange"
          />
        </div>

        {successMessage && (
          <AlertBox
            type="success"
            message={successMessage}
          />
        )}

        {bulkResultMessage && (
          <AlertBox
            type="info"
            message={bulkResultMessage}
          />
        )}

        {errorMessage && (
          <AlertBox
            type="error"
            message={`Error: ${errorMessage}`}
          />
        )}

        <div className="harmony-card harmony-slide-up p-3">
          <div className="grid gap-3 md:grid-cols-3">
            <ModeButton
              title="Manual"
              description="Buat satu user"
              icon={<UserPlus size={18} />}
              active={inputMode === 'manual' && showForm}
              onClick={() => openAddUserForm('manual')}
            />

            <ModeButton
              title="Checklist"
              description="Pilih beberapa employee"
              icon={<ListChecks size={18} />}
              active={inputMode === 'checklist' && showForm}
              onClick={() => openAddUserForm('checklist')}
            />

            <ModeButton
              title="Bulk Semua"
              description="Generate semua kandidat"
              icon={<Layers size={18} />}
              active={inputMode === 'bulk' && showForm}
              onClick={() => openAddUserForm('bulk')}
            />
          </div>
        </div>

        {showForm && inputMode === 'manual' && (
          <ManualCreateUserForm
            form={form}
            employees={employees}
            saving={saving}
            onClose={resetUserForm}
            onSubmit={handleCreateUser}
            onEmployeeSelect={handleEmployeeSelect}
            onUpdate={updateForm}
          />
        )}

        {showForm && inputMode === 'checklist' && (
          <ChecklistCreateUserForm
            employeesWithoutUser={employeesWithoutUser}
            employeesWithoutEmail={employeesWithoutEmail}
            selectedEmployeeIds={selectedEmployeeIds}
            bulkPassword={bulkPassword}
            bulkRole={bulkRole}
            saving={saving}
            onClose={resetUserForm}
            onSubmit={handleBulkSelected}
            onToggleEmployee={toggleSelectedEmployee}
            onSelectAll={selectAllEmployeesWithoutUser}
            onClearSelected={clearSelectedEmployees}
            onPasswordChange={setBulkPassword}
            onRoleChange={setBulkRole}
          />
        )}

        {showForm && inputMode === 'bulk' && (
          <BulkCreateUserForm
            totalCandidates={employeesWithoutUser.length}
            employeesWithoutEmail={employeesWithoutEmail.length}
            bulkPassword={bulkPassword}
            bulkRole={bulkRole}
            saving={saving}
            onClose={resetUserForm}
            onSubmit={handleBulkAll}
            onPasswordChange={setBulkPassword}
            onRoleChange={setBulkRole}
          />
        )}

        {showResetModal && (
          <ResetPasswordModal
            resetForm={resetForm}
            saving={saving}
            onClose={() => setShowResetModal(false)}
            onSubmit={handleResetPassword}
            onChange={(value) =>
              setResetForm((prev) => ({
                ...prev,
                new_password: value,
              }))
            }
          />
        )}

        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                <Sparkles size={14} />
                Access Control
              </div>

              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Daftar User
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Kelola akun login yang terhubung ke Supabase Auth.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={fetchData}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => openAddUserForm('manual')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,122,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0067d8] hover:shadow-[0_18px_42px_rgba(0,122,255,0.28)]"
              >
                <Plus size={18} />
                Tambah User
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_200px_200px]">
            <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
              <Search size={18} className="text-[#6e6e73]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari email, nama employee, NIP, unit..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Role</option>
              <option value="hr">HR</option>
              <option value="employee">Employee</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Memuat data user...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="w-[24%] px-5 py-4 font-semibold">User</th>
                    <th className="w-[24%] px-5 py-4 font-semibold">Employee</th>
                    <th className="w-[12%] px-5 py-4 font-semibold">Role</th>
                    <th className="w-[12%] px-5 py-4 font-semibold">Status</th>
                    <th className="w-[14%] px-5 py-4 font-semibold">Created</th>
                    <th className="w-[14%] px-5 py-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-black/5 transition hover:bg-white/55"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white shadow-sm">
                            {getInitials(user.email)}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#1d1d1f]">
                              {user.email}
                            </div>
                            <div className="mt-1 truncate text-xs text-[#6e6e73]">
                              Auth ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#1d1d1f]">
                          {user.employees?.full_name || '-'}
                        </div>
                        <div className="mt-1 text-xs text-[#6e6e73]">
                          {user.employees?.employee_number || '-'} · {user.employees?.department || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <select
                          value={user.role}
                          onChange={(event) =>
                            updateUser(user, {
                              role: event.target.value,
                              employee_id: user.employee_id,
                            })
                          }
                          className="harmony-select min-w-[130px]"
                          disabled={saving}
                        >
                          <option value="employee">Employee</option>
                          <option value="hr">HR</option>
                        </select>
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge active={user.is_active} />
                      </td>

                      <td className="px-5 py-3.5 text-[#6e6e73]">
                        {formatDateTime(user.created_at)}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="Reset password"
                            onClick={() => openResetPassword(user)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-black/5 bg-white text-[#007aff] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
                          >
                            <KeyRound size={15} />
                          </button>

                          <button
                            type="button"
                            title={user.is_active ? 'Nonaktifkan user' : 'Aktifkan user'}
                            onClick={() =>
                              updateUser(user, {
                                is_active: !user.is_active,
                              })
                            }
                            className={[
                              'flex h-9 w-9 items-center justify-center rounded-2xl transition hover:-translate-y-0.5',
                              user.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100',
                            ].join(' ')}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
                    <UserCog size={24} />
                  </div>

                  <h3 className="mt-4 font-semibold text-[#1d1d1f]">
                    Data user tidak ditemukan
                  </h3>

                  <p className="mt-1 text-sm text-[#6e6e73]">
                    Tambahkan user baru untuk mulai menggunakan sistem login berbasis role.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function ManualCreateUserForm({
  form,
  employees,
  saving,
  onClose,
  onSubmit,
  onEmployeeSelect,
  onUpdate,
}: {
  form: UserForm
  employees: EmployeeOption[]
  saving: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onEmployeeSelect: (employeeId: string) => void
  onUpdate: (field: keyof UserForm, value: string) => void
}) {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <FormHeader
        title="Manual · Tambah User Satu-Satu"
        description="User akan dibuat ke Supabase Auth dan tercatat pada app_users."
        icon={<UserPlus size={18} />}
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="bg-white/35 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="harmony-label">Hubungkan Employee</span>
            <select
              value={form.employee_id}
              onChange={(event) => onEmployeeSelect(event.target.value)}
              className="harmony-select"
            >
              <option value="">Tanpa employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} · {employee.employee_number || '-'}
                </option>
              ))}
            </select>
          </label>

          <EmailInput
            value={form.email}
            onChange={(value) => onUpdate('email', value)}
          />

          <PasswordInput
            label="Password Awal"
            value={form.password}
            onChange={(value) => onUpdate('password', value)}
          />

          <RoleSelect
            value={form.role}
            onChange={(value) => onUpdate('role', value)}
          />
        </div>

        <FormFooter
          saving={saving}
          submitLabel="Buat User"
          loadingLabel="Menyimpan..."
          onCancel={onClose}
        />
      </form>
    </div>
  )
}

function ChecklistCreateUserForm({
  employeesWithoutUser,
  employeesWithoutEmail,
  selectedEmployeeIds,
  bulkPassword,
  bulkRole,
  saving,
  onClose,
  onSubmit,
  onToggleEmployee,
  onSelectAll,
  onClearSelected,
  onPasswordChange,
  onRoleChange,
}: {
  employeesWithoutUser: EmployeeOption[]
  employeesWithoutEmail: EmployeeOption[]
  selectedEmployeeIds: string[]
  bulkPassword: string
  bulkRole: 'employee' | 'hr'
  saving: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onToggleEmployee: (employeeId: string) => void
  onSelectAll: () => void
  onClearSelected: () => void
  onPasswordChange: (value: string) => void
  onRoleChange: (value: 'employee' | 'hr') => void
}) {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <FormHeader
        title="Checklist · Pilih Employee yang Belum Punya User"
        description="Pilih beberapa employee, lalu sistem akan membuat akun login secara bersamaan."
        icon={<ListChecks size={18} />}
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="space-y-5 bg-white/35 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PasswordInput
            label="Password Default"
            value={bulkPassword}
            onChange={onPasswordChange}
          />

          <RoleSelect
            value={bulkRole}
            onChange={onRoleChange}
          />

          <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
              Terpilih
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#1d1d1f]">
              {selectedEmployeeIds.length}
            </p>
          </div>
        </div>

        {employeesWithoutEmail.length > 0 && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            {employeesWithoutEmail.length} employee tidak memiliki email, sehingga tidak dapat dibuatkan user otomatis.
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-[#6e6e73]">
            Kandidat tersedia: <b>{employeesWithoutUser.length}</b> employee.
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={onSelectAll}
              className="harmony-button-secondary"
            >
              Pilih Semua
            </button>

            <button
              type="button"
              onClick={onClearSelected}
              className="harmony-button-secondary"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto rounded-[28px] border border-black/5 bg-white/70">
          {employeesWithoutUser.map((employee) => {
            const checked = selectedEmployeeIds.includes(employee.id)

            return (
              <label
                key={employee.id}
                className={[
                  'flex cursor-pointer items-center gap-4 border-b border-black/5 p-4 transition last:border-b-0',
                  checked ? 'bg-[#e8f2ff]' : 'hover:bg-white',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleEmployee(employee.id)}
                  className="h-4 w-4"
                />

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">
                  {getInitials(employee.full_name || employee.email || '-')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-[#1d1d1f]">
                    {employee.full_name || '-'}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#6e6e73]">
                    {employee.employee_number || '-'} · {employee.email || '-'} · {employee.department || '-'}
                  </div>
                </div>
              </label>
            )
          })}

          {employeesWithoutUser.length === 0 && (
            <div className="p-8 text-center text-sm text-[#6e6e73]">
              Tidak ada employee aktif dengan email yang belum punya user.
            </div>
          )}
        </div>

        <FormFooter
          saving={saving}
          submitLabel="Buat User Terpilih"
          loadingLabel="Memproses..."
          onCancel={onClose}
        />
      </form>
    </div>
  )
}

function BulkCreateUserForm({
  totalCandidates,
  employeesWithoutEmail,
  bulkPassword,
  bulkRole,
  saving,
  onClose,
  onSubmit,
  onPasswordChange,
  onRoleChange,
}: {
  totalCandidates: number
  employeesWithoutEmail: number
  bulkPassword: string
  bulkRole: 'employee' | 'hr'
  saving: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onPasswordChange: (value: string) => void
  onRoleChange: (value: 'employee' | 'hr') => void
}) {
  return (
    <div className="harmony-card harmony-slide-up overflow-hidden">
      <FormHeader
        title="Bulk Semua · Generate Semua User"
        description="Sistem akan membuat user untuk seluruh employee aktif yang belum punya user dan memiliki email."
        icon={<Layers size={18} />}
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="space-y-5 bg-white/35 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
              Kandidat
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#1d1d1f]">
              {totalCandidates}
            </p>
          </div>

          <div className="rounded-[22px] border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
              Tanpa Email
            </p>
            <p className="mt-2 text-3xl font-semibold text-orange-700">
              {employeesWithoutEmail}
            </p>
          </div>

          <PasswordInput
            label="Password Default"
            value={bulkPassword}
            onChange={onPasswordChange}
          />

          <RoleSelect
            value={bulkRole}
            onChange={onRoleChange}
          />
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
          Sistem akan melewati employee yang sudah punya user atau tidak memiliki email.
        </div>

        <FormFooter
          saving={saving}
          submitLabel="Generate Semua User"
          loadingLabel="Memproses..."
          onCancel={onClose}
        />
      </form>
    </div>
  )
}

function ResetPasswordModal({
  resetForm,
  saving,
  onClose,
  onSubmit,
  onChange,
}: {
  resetForm: ResetPasswordForm
  saving: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onChange: (value: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 bg-white/70 p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <KeyRound size={14} />
              Reset Access
            </div>

            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              Reset Password
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Password baru akan langsung tersimpan di Supabase Auth.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f] transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7]/80 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
              User
            </p>
            <p className="mt-2 font-semibold text-[#1d1d1f]">
              {resetForm.email}
            </p>
          </div>

          <PasswordInput
            label="Password Baru"
            value={resetForm.new_password}
            onChange={onChange}
          />

          <FormFooter
            saving={saving}
            submitLabel="Reset Password"
            loadingLabel="Memproses..."
            onCancel={onClose}
          />
        </form>
      </div>
    </div>
  )
}

function FormHeader({
  title,
  description,
  icon,
  onClose,
}: {
  title: string
  description: string
  icon: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="border-b border-black/5 bg-white/55 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
            {icon}
            User Workflow
          </div>

          <h2 className="text-lg font-semibold text-[#1d1d1f]">
            {title}
          </h2>

          <p className="mt-1 text-sm text-[#6e6e73]">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="harmony-button-secondary"
        >
          <X size={18} />
          Tutup
        </button>
      </div>
    </div>
  )
}

function FormFooter({
  saving,
  submitLabel,
  loadingLabel,
  onCancel,
}: {
  saving: boolean
  submitLabel: string
  loadingLabel: string
  onCancel: () => void
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="harmony-button-secondary"
      >
        Batal
      </button>

      <button
        type="submit"
        disabled={saving}
        className="harmony-button-primary"
      >
        <Save size={18} />
        {saving ? loadingLabel : submitLabel}
      </button>
    </div>
  )
}

function ModeButton({
  title,
  description,
  icon,
  active,
  onClick,
}: {
  title: string
  description: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-[24px] p-4 text-left transition hover:-translate-y-0.5',
        active
          ? 'bg-[#1d1d1f] text-white shadow-sm'
          : 'bg-white/60 text-[#1d1d1f] hover:bg-white',
      ].join(' ')}
    >
      <div
        className={[
          'rounded-2xl p-3',
          active ? 'bg-white/10 text-white' : 'bg-[#e8f2ff] text-[#007aff]',
        ].join(' ')}
      >
        {icon}
      </div>

      <div>
        <div className="text-sm font-semibold">
          {title}
        </div>

        <div
          className={[
            'mt-1 text-xs',
            active ? 'text-white/60' : 'text-[#6e6e73]',
          ].join(' ')}
        >
          {description}
        </div>
      </div>
    </button>
  )
}

function EmailInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="harmony-label">Email</span>

      <input
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="employee@email.com"
        className="harmony-input"
        required
      />
    </label>
  )
}

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="harmony-label">{label}</span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Minimal 6 karakter"
        className="harmony-input"
        required
      />
    </label>
  )
}

function RoleSelect({
  value,
  onChange,
}: {
  value: 'employee' | 'hr'
  onChange: (value: 'employee' | 'hr') => void
}) {
  return (
    <label className="block">
      <span className="harmony-label">Role</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as 'employee' | 'hr')}
        className="harmony-select"
      >
        <option value="employee">Employee</option>
        <option value="hr">HR</option>
      </select>
    </label>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'cyan'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
    cyan: 'text-[#0077a3] bg-[#e8f8ff]',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift harmony-slide-up p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  active,
}: {
  active: boolean
}) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        active
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700',
      ].join(' ')}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function AlertBox({
  type,
  message,
}: {
  type: 'success' | 'error' | 'info'
  message: string
}) {
  const className =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : type === 'info'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-red-200 bg-red-50 text-red-600'

  return (
    <div className={`rounded-2xl border p-4 text-sm ${className}`}>
      {message}
    </div>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(value: string) {
  const clean = value.trim()

  if (!clean) return 'U'

  if (clean.includes('@')) {
    return clean.slice(0, 2).toUpperCase()
  }

  const words = clean.split(' ').filter(Boolean)

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}