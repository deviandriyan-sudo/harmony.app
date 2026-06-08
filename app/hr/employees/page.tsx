'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Users,
  UserPlus,
  Pencil,
  Power,
  Save,
  X,
  RefreshCcw,
  BadgeCheck,
  Building2,
  Fingerprint,
  WalletCards,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  BriefcaseBusiness,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/employee'

type EmployeeForm = {
  employee_number: string
  machine_pin: string
  full_name: string
  email: string
  phone: string
  gender: string
  department: string
  position: string
  join_date: string
  employment_status: string
  supervisor_1: string
  supervisor_2: string
  annual_leave_balance: number
  phl_balance: number
  is_active: boolean
}

const initialForm: EmployeeForm = {
  employee_number: '',
  machine_pin: '',
  full_name: '',
  email: '',
  phone: '',
  gender: 'all',
  department: '',
  position: '',
  join_date: '',
  employment_status: 'active',
  supervisor_1: '',
  supervisor_2: '',
  annual_leave_balance: 12,
  phl_balance: 0,
  is_active: true,
}

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<EmployeeForm>(initialForm)

  async function fetchEmployees() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setEmployees([])
      setLoading(false)
      return
    }

    setEmployees(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  function updateForm(
    field: keyof EmployeeForm,
    value: string | number | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingEmployeeId(null)
    setShowForm(false)
    setErrorMessage('')
  }

  function handleAddNew() {
    setForm(initialForm)
    setEditingEmployeeId(null)
    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleEdit(employee: Employee) {
    setEditingEmployeeId(employee.id)

    setForm({
      employee_number: employee.employee_number || '',
      machine_pin: employee.machine_pin || '',
      full_name: employee.full_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      gender: employee.gender || 'all',
      department: employee.department || '',
      position: employee.position || '',
      join_date: employee.join_date || '',
      employment_status: employee.employment_status || 'active',
      supervisor_1: employee.supervisor_1 || '',
      supervisor_2: employee.supervisor_2 || '',
      annual_leave_balance: Number(employee.annual_leave_balance || 0),
      phl_balance: Number(employee.phl_balance || 0),
      is_active: employee.is_active ?? true,
    })

    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.employee_number || !form.full_name || !form.machine_pin) {
      setErrorMessage('Employee number, nama, dan machine PIN wajib diisi.')
      setSaving(false)
      return
    }

    const payload = {
      employee_number: form.employee_number,
      machine_pin: form.machine_pin,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      gender: form.gender || 'all',
      department: form.department || null,
      position: form.position || null,
      join_date: form.join_date || null,
      employment_status: form.employment_status || 'active',
      supervisor_1: form.supervisor_1 || null,
      supervisor_2: form.supervisor_2 || null,
      schedule_group: 'regular',
      auto_detect_schedule: true,
      annual_leave_balance: form.annual_leave_balance,
      phl_balance: form.phl_balance,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    if (editingEmployeeId) {
      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', editingEmployeeId)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Data karyawan berhasil diperbarui.')
    } else {
      const { error } = await supabase
        .from('employees')
        .insert(payload)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Data karyawan berhasil ditambahkan.')
    }

    setForm(initialForm)
    setEditingEmployeeId(null)
    setShowForm(false)
    setSaving(false)

    await fetchEmployees()
  }

  async function handleToggleActive(employee: Employee) {
    setErrorMessage('')
    setSuccessMessage('')

    const nextStatus = !employee.is_active

    const { error } = await supabase
      .from('employees')
      .update({
        is_active: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage(
      nextStatus
        ? 'Karyawan berhasil diaktifkan kembali.'
        : 'Karyawan berhasil dinonaktifkan.'
    )

    await fetchEmployees()
  }

  const departments = useMemo(() => {
    const unique = new Set<string>()

    employees.forEach((employee) => {
      if (employee.department) {
        unique.add(employee.department)
      }
    })

    return Array.from(unique).sort()
  }, [employees])

  const filteredEmployees = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return employees.filter((employee) => {
      const matchesKeyword =
        !keyword ||
        employee.full_name?.toLowerCase().includes(keyword) ||
        employee.employee_number?.toLowerCase().includes(keyword) ||
        employee.machine_pin?.toLowerCase().includes(keyword) ||
        employee.department?.toLowerCase().includes(keyword) ||
        employee.position?.toLowerCase().includes(keyword) ||
        employee.email?.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && employee.is_active !== false) ||
        (statusFilter === 'inactive' && employee.is_active === false)

      const matchesDepartment =
        departmentFilter === 'all' || employee.department === departmentFilter

      return matchesKeyword && matchesStatus && matchesDepartment
    })
  }, [employees, search, statusFilter, departmentFilter])

  const totalEmployees = employees.length

  const activeEmployees = employees.filter(
    (employee) => employee.is_active !== false
  ).length

  const inactiveEmployees = employees.filter(
    (employee) => employee.is_active === false
  ).length

  const withMachinePin = employees.filter(
    (employee) => Boolean(employee.machine_pin)
  ).length

  const withEmail = employees.filter(
    (employee) => Boolean(employee.email)
  ).length

  return (
    <>
      <Topbar
        title="Data Karyawan"
        description="Kelola master employee, machine PIN, struktur atasan, saldo cuti, dan status aktif karyawan Poltek."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total Employee"
            value={String(totalEmployees)}
            description="Seluruh data karyawan"
            icon={<Users size={20} />}
            tone="blue"
          />

          <SummaryCard
            title="Active"
            value={String(activeEmployees)}
            description="Karyawan aktif"
            icon={<BadgeCheck size={20} />}
            tone="green"
          />

          <SummaryCard
            title="Machine PIN"
            value={String(withMachinePin)}
            description="Siap mapping absensi"
            icon={<Fingerprint size={20} />}
            tone="purple"
          />

          <SummaryCard
            title="Email"
            value={String(withEmail)}
            description="Siap dibuat user"
            icon={<Mail size={20} />}
            tone="cyan"
          />

          <SummaryCard
            title="Inactive"
            value={String(inactiveEmployees)}
            description="Karyawan nonaktif"
            icon={<Power size={20} />}
            tone="orange"
          />
        </div>

        {successMessage && (
          <AlertBox
            type="success"
            message={successMessage}
          />
        )}

        {errorMessage && (
          <AlertBox
            type="error"
            message={`Error: ${errorMessage}`}
          />
        )}

        {showForm && (
          <div className="harmony-card harmony-slide-up overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                  <Sparkles size={14} />
                  Employee Master
                </div>

                <h2 className="text-lg font-semibold text-[#1d1d1f]">
                  {editingEmployeeId
                    ? 'Edit Data Karyawan'
                    : 'Tambah Karyawan Baru'}
                </h2>

                <p className="mt-1 text-sm text-[#6e6e73]">
                  Data ini digunakan untuk mapping absensi berdasarkan machine PIN dan koneksi user login.
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="harmony-button-secondary"
              >
                <X size={18} />
                Tutup
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-white/35 p-5"
            >
              <FormSection
                title="Identitas Karyawan"
                description="Data utama untuk pencarian, user account, dan mapping employee."
                icon={<Users size={18} />}
              >
                <InputField
                  label="Employee Number"
                  value={form.employee_number}
                  onChange={(value) => updateForm('employee_number', value)}
                  placeholder="Contoh: EMP001"
                  required
                />

                <InputField
                  label="Machine PIN"
                  value={form.machine_pin}
                  onChange={(value) => updateForm('machine_pin', value)}
                  placeholder="PIN dari mesin fingerprint"
                  required
                />

                <InputField
                  label="Nama Lengkap"
                  value={form.full_name}
                  onChange={(value) => updateForm('full_name', value)}
                  placeholder="Nama karyawan"
                  required
                />

                <InputField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(value) => updateForm('email', value)}
                  placeholder="email@company.com"
                />

                <InputField
                  label="Nomor HP"
                  value={form.phone}
                  onChange={(value) => updateForm('phone', value)}
                  placeholder="08xxxxxxxxxx"
                />

                <SelectField
                  label="Gender"
                  value={form.gender}
                  onChange={(value) => updateForm('gender', value)}
                  options={[
                    { label: 'Semua / Tidak diset', value: 'all' },
                    { label: 'Laki-laki', value: 'male' },
                    { label: 'Perempuan', value: 'female' },
                  ]}
                />
              </FormSection>

              <FormSection
                title="Organisasi & Status"
                description="Struktur unit, jabatan, tanggal masuk, dan status employment."
                icon={<Building2 size={18} />}
              >
                <InputField
                  label="Departemen"
                  value={form.department}
                  onChange={(value) => updateForm('department', value)}
                  placeholder="Contoh: PSDM"
                />

                <InputField
                  label="Jabatan"
                  value={form.position}
                  onChange={(value) => updateForm('position', value)}
                  placeholder="Contoh: Staff HR"
                />

                <InputField
                  label="Join Date"
                  type="date"
                  value={form.join_date}
                  onChange={(value) => updateForm('join_date', value)}
                />

                <SelectField
                  label="Employment Status"
                  value={form.employment_status}
                  onChange={(value) => updateForm('employment_status', value)}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Probation', value: 'probation' },
                    { label: 'Contract', value: 'contract' },
                    { label: 'Permanent', value: 'permanent' },
                    { label: 'Resigned', value: 'resigned' },
                    { label: 'Inactive', value: 'inactive' },
                  ]}
                />

                <InputField
                  label="Atasan 1"
                  value={form.supervisor_1}
                  onChange={(value) => updateForm('supervisor_1', value)}
                  placeholder="Employee number / nama atasan"
                />

                <InputField
                  label="Atasan 2"
                  value={form.supervisor_2}
                  onChange={(value) => updateForm('supervisor_2', value)}
                  placeholder="Employee number / nama atasan"
                />
              </FormSection>

              <FormSection
                title="Saldo & Status Data"
                description="Saldo cuti tahunan, saldo PHL, dan status aktif data employee."
                icon={<WalletCards size={18} />}
              >
                <InputField
                  label="Saldo Cuti Tahunan"
                  type="number"
                  value={String(form.annual_leave_balance)}
                  onChange={(value) =>
                    updateForm('annual_leave_balance', Number(value))
                  }
                />

                <InputField
                  label="Saldo PHL"
                  type="number"
                  value={String(form.phl_balance)}
                  onChange={(value) =>
                    updateForm('phl_balance', Number(value))
                  }
                />

                <SelectField
                  label="Status Data"
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(value) => updateForm('is_active', value === 'active')}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' },
                  ]}
                />
              </FormSection>

              <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
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
                  {saving
                    ? 'Menyimpan...'
                    : editingEmployeeId
                      ? 'Update Data'
                      : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Master Employee
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Tabel dibuat lebih compact. Detail lengkap tersedia melalui tombol edit.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={fetchEmployees}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleAddNew}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,122,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0067d8] hover:shadow-[0_18px_42px_rgba(0,122,255,0.28)]"
              >
                <UserPlus size={18} />
                Tambah Karyawan
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_220px_240px]">
            <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
              <Search size={18} className="text-[#6e6e73]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIK, PIN, departemen..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Departemen</option>
              {departments.map((department) => (
                <option
                  key={department}
                  value={department}
                >
                  {department}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Loading data karyawan...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="w-[25%] px-5 py-4 font-semibold">Employee</th>
                    <th className="w-[12%] px-5 py-4 font-semibold">Machine PIN</th>
                    <th className="w-[22%] px-5 py-4 font-semibold">Unit / Position</th>
                    <th className="w-[15%] px-5 py-4 font-semibold">Contact</th>
                    <th className="w-[12%] px-5 py-4 font-semibold">Balance</th>
                    <th className="w-[7%] px-5 py-4 font-semibold">Status</th>
                    <th className="w-[7%] px-5 py-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-black/5 transition hover:bg-white/55"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white shadow-sm">
                            {getInitials(employee.full_name || '-')}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#1d1d1f]">
                              {employee.full_name || '-'}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6e6e73]">
                              <span>{employee.employee_number || '-'}</span>
                              <span className="h-1 w-1 rounded-full bg-[#c7c7cc]" />
                              <span>{formatEmploymentStatus(employee.employment_status)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                          <Fingerprint size={13} />
                          {employee.machine_pin || '-'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-2">
                          <Building2
                            size={15}
                            className="mt-0.5 shrink-0 text-[#007aff]"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[#1d1d1f]">
                              {employee.department || '-'}
                            </div>
                            <div className="mt-1 line-clamp-1 text-xs text-[#6e6e73]">
                              {employee.position || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-1.5 text-xs text-[#6e6e73]">
                          <div className="flex min-w-0 items-center gap-2">
                            <Mail size={13} className="shrink-0 text-[#007aff]" />
                            <span className="truncate">
                              {employee.email || '-'}
                            </span>
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            <Phone size={13} className="shrink-0 text-[#34c759]" />
                            <span className="truncate">
                              {employee.phone || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-black/5">
                          <WalletCards size={14} className="text-[#007aff]" />
                          <div className="text-xs leading-4">
                            <div className="font-bold text-[#1d1d1f]">
                              Cuti {employee.annual_leave_balance || 0}
                            </div>
                            <div className="text-[#6e6e73]">
                              PHL {employee.phl_balance || 0}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge active={employee.is_active !== false} />
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="Edit employee"
                            onClick={() => handleEdit(employee)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-black/5 bg-white text-[#1d1d1f] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            title={
                              employee.is_active === false
                                ? 'Aktifkan employee'
                                : 'Nonaktifkan employee'
                            }
                            onClick={() => handleToggleActive(employee)}
                            className={[
                              'flex h-9 w-9 items-center justify-center rounded-2xl transition hover:-translate-y-0.5',
                              employee.is_active === false
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100',
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

              {filteredEmployees.length === 0 && (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
                    <Users size={24} />
                  </div>

                  <h3 className="mt-4 font-semibold text-[#1d1d1f]">
                    Data karyawan tidak ditemukan
                  </h3>

                  <p className="mt-1 text-sm text-[#6e6e73]">
                    Coba ubah keyword pencarian, status, atau departemen.
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

function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-[#1d1d1f]">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </div>
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

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-input"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    label: string
    value: string
  }[]
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-select"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
  type: 'success' | 'error'
  message: string
}) {
  const className =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-600'

  return (
    <div className={`rounded-2xl border p-4 text-sm ${className}`}>
      {message}
    </div>
  )
}

function getInitials(name: string) {
  const words = name
    .trim()
    .split(' ')
    .filter(Boolean)

  if (words.length === 0) return 'E'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function formatEmploymentStatus(value: string | null | undefined) {
  if (!value) return 'Active'

  if (value === 'active') return 'Active'
  if (value === 'probation') return 'Probation'
  if (value === 'contract') return 'Contract'
  if (value === 'permanent') return 'Permanent'
  if (value === 'resigned') return 'Resigned'
  if (value === 'inactive') return 'Inactive'

  return value
}