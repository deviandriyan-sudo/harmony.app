'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  BadgeCheck,
  Building2,
  Clock3,
  Eye,
  Fingerprint,
  HeartHandshake,
  Mail,
  MapPin,
  Pencil,
  Power,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

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
  join_date: string | null
  employment_status: string | null
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
  created_at?: string | null
  updated_at?: string | null
}

type ProfileUpdateLog = {
  id: string
  employee_id: string | null
  employee_number: string | null
  full_name: string | null
  email: string | null
  updated_by: string | null
  update_source: string | null
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  created_at: string | null
}

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
  personal_phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
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
  personal_phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [profileLogs, setProfileLogs] = useState<ProfileUpdateLog[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [syncFilter, setSyncFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<EmployeeForm>(initialForm)

  useEffect(() => {
    fetchEmployees()
  }, [])

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

    setEmployees((data || []) as Employee[])

    const { data: logsData, error: logsError } = await supabase
      .from('employee_profile_update_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)

    if (!logsError) {
      setProfileLogs((logsData || []) as ProfileUpdateLog[])
    }

    setLoading(false)
  }

  function updateForm(field: keyof EmployeeForm, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingEmployeeId(null)
    setEditModalOpen(false)
    setErrorMessage('')
  }

  function handleAddNew() {
    setForm(initialForm)
    setEditingEmployeeId(null)
    setSelectedEmployee(null)
    setEditModalOpen(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  function openEditModal(employee: Employee) {
    setEditingEmployeeId(employee.id)
    setForm(employeeToForm(employee))
    setEditModalOpen(true)
    setSelectedEmployee(null)
    setSuccessMessage('')
    setErrorMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.employee_number || !form.full_name || !form.machine_pin) {
      setErrorMessage('Employee number, nama, dan machine PIN wajib diisi.')
      setSaving(false)
      return
    }

    const now = new Date().toISOString()
    const payload = {
      employee_number: form.employee_number.trim(),
      machine_pin: form.machine_pin.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      gender: form.gender || 'all',
      department: form.department.trim() || null,
      position: form.position.trim() || null,
      join_date: form.join_date || null,
      employment_status: form.employment_status || 'active',
      supervisor_1: form.supervisor_1.trim() || null,
      supervisor_2: form.supervisor_2.trim() || null,
      schedule_group: 'regular',
      auto_detect_schedule: true,
      annual_leave_balance: form.annual_leave_balance,
      phl_balance: form.phl_balance,
      is_active: form.is_active,
      personal_phone: form.personal_phone.trim() || null,
      address: form.address.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      updated_at: now,
    }

    if (editingEmployeeId) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingEmployeeId)
      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }
      setSuccessMessage('Data karyawan berhasil diperbarui.')
    } else {
      const { error } = await supabase.from('employees').insert({ ...payload, created_at: now })
      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }
      setSuccessMessage('Data karyawan berhasil ditambahkan.')
    }

    setSaving(false)
    resetForm()
    await fetchEmployees()
  }

  async function handleToggleActive(employee: Employee) {
    setErrorMessage('')
    setSuccessMessage('')

    const nextStatus = !employee.is_active
    const { error } = await supabase
      .from('employees')
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', employee.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage(nextStatus ? 'Karyawan berhasil diaktifkan kembali.' : 'Karyawan berhasil dinonaktifkan.')
    await fetchEmployees()
  }

  const departments = useMemo(() => {
    const unique = new Set<string>()
    employees.forEach((employee) => {
      if (employee.department) unique.add(employee.department)
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
        employee.email?.toLowerCase().includes(keyword) ||
        employee.phone?.toLowerCase().includes(keyword) ||
        employee.personal_phone?.toLowerCase().includes(keyword) ||
        employee.emergency_contact_name?.toLowerCase().includes(keyword) ||
        employee.emergency_contact_phone?.toLowerCase().includes(keyword) ||
        employee.address?.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && employee.is_active !== false) ||
        (statusFilter === 'inactive' && employee.is_active === false)

      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
      const hasPersonalUpdate = Boolean(employee.personal_updated_at)
      const matchesSync =
        syncFilter === 'all' ||
        (syncFilter === 'updated_by_employee' && hasPersonalUpdate) ||
        (syncFilter === 'not_updated' && !hasPersonalUpdate)

      return matchesKeyword && matchesStatus && matchesDepartment && matchesSync
    })
  }, [employees, search, statusFilter, departmentFilter, syncFilter])

  const totalEmployees = employees.length
  const activeEmployees = employees.filter((employee) => employee.is_active !== false).length
  const inactiveEmployees = employees.filter((employee) => employee.is_active === false).length
  const withMachinePin = employees.filter((employee) => Boolean(employee.machine_pin)).length
  const withEmail = employees.filter((employee) => Boolean(employee.email)).length
  const updatedPersonalData = employees.filter((employee) => Boolean(employee.personal_updated_at)).length

  return (
    <>
      <Topbar
        title="Data Karyawan"
        description="Kelola master employee dalam bentuk list compact. Detail dan edit dibuka melalui modal."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 overflow-x-hidden p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SummaryCard title="Total Employee" value={String(totalEmployees)} description="Seluruh data" icon={<Users size={20} />} tone="blue" />
          <SummaryCard title="Active" value={String(activeEmployees)} description="Karyawan aktif" icon={<BadgeCheck size={20} />} tone="green" />
          <SummaryCard title="Machine PIN" value={String(withMachinePin)} description="Siap absensi" icon={<Fingerprint size={20} />} tone="purple" />
          <SummaryCard title="Email" value={String(withEmail)} description="Siap notifikasi" icon={<Mail size={20} />} tone="cyan" />
          <SummaryCard title="Update Pribadi" value={String(updatedPersonalData)} description="Diupdate employee" icon={<Clock3 size={20} />} tone="orange" />
          <SummaryCard title="Inactive" value={String(inactiveEmployees)} description="Nonaktif" icon={<Power size={20} />} tone="red" />
        </div>

        {profileLogs.length > 0 && (
          <div className="harmony-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-black/5 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-[#1d1d1f]">Update Data Pribadi Terbaru</h2>
                <p className="mt-1 text-sm text-[#6e6e73]">Ringkasan perubahan dari Employee Settings.</p>
              </div>
              <span className="w-fit rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                {profileLogs.length} update terakhir
              </span>
            </div>

            <div className="grid gap-3 p-5 lg:grid-cols-2 xl:grid-cols-3">
              {profileLogs.map((log) => <ProfileUpdateCard key={log.id} log={log} />)}
            </div>
          </div>
        )}

        {successMessage && <AlertBox type="success" message={successMessage} />}
        {errorMessage && <AlertBox type="error" message={`Error: ${errorMessage}`} />}

        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-[#1d1d1f]">Master Employee</h2>
              <p className="mt-1 text-sm text-[#6e6e73]">
                List dibuat tanpa tabel agar teks tidak keluar area. Klik Detail untuk melihat data lengkap.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center">
              <button type="button" onClick={fetchEmployees} className="harmony-button-secondary">
                <RefreshCcw size={18} />
                Refresh
              </button>
              <button type="button" onClick={handleAddNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,122,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0067d8]">
                <UserPlus size={18} />
                Tambah Karyawan
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_190px_220px_220px]">
            <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
              <Search size={18} className="shrink-0 text-[#6e6e73]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIP, PIN, email, unit..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#86868b]"
              />
            </div>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="harmony-select">
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="harmony-select">
              <option value="all">Semua Departemen</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>

            <select value={syncFilter} onChange={(event) => setSyncFilter(event.target.value)} className="harmony-select">
              <option value="all">Semua Sinkronisasi</option>
              <option value="updated_by_employee">Sudah Update Pribadi</option>
              <option value="not_updated">Belum Update Pribadi</option>
            </select>
          </div>

          {loading && <div className="p-6 text-sm text-[#6e6e73]">Loading data karyawan...</div>}

          {!loading && (
            <div className="space-y-3 p-5">
              {filteredEmployees.map((employee) => (
                <EmployeeCompactCard
                  key={employee.id}
                  employee={employee}
                  onDetail={() => setSelectedEmployee(employee)}
                  onEdit={() => openEditModal(employee)}
                  onToggleActive={() => handleToggleActive(employee)}
                />
              ))}

              {filteredEmployees.length === 0 && (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
                    <Users size={24} />
                  </div>
                  <h3 className="mt-4 font-semibold text-[#1d1d1f]">Data karyawan tidak ditemukan</h3>
                  <p className="mt-1 text-sm text-[#6e6e73]">Coba ubah keyword pencarian, status, departemen, atau filter sinkronisasi.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedEmployee && (
          <EmployeeDetailModal
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
            onEdit={() => openEditModal(selectedEmployee)}
          />
        )}

        {editModalOpen && (
          <EmployeeFormModal
            form={form}
            saving={saving}
            editingEmployeeId={editingEmployeeId}
            onSubmit={handleSubmit}
            onClose={resetForm}
            onUpdate={updateForm}
          />
        )}
      </section>
    </>
  )
}

function EmployeeCompactCard({ employee, onDetail, onEdit, onToggleActive }: { employee: Employee; onDetail: () => void; onEdit: () => void; onToggleActive: () => void }) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_240px_220px_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm font-bold text-white shadow-sm">
            {getInitials(employee.full_name || '-')}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="max-w-full truncate text-base font-semibold text-[#1d1d1f]">{employee.full_name || '-'}</h3>
              <StatusBadge active={employee.is_active !== false} />
              {employee.personal_updated_at && <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">Personal updated</span>}
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#6e6e73]">
              <span className="max-w-[120px] truncate">{employee.employee_number || '-'}</span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-[#c7c7cc]" />
              <span className="max-w-[120px] truncate">{formatEmploymentStatus(employee.employment_status)}</span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-[#c7c7cc]" />
              <span className="max-w-[240px] truncate">{employee.email || '-'}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl bg-[#f5f5f7]/80 px-4 py-3">
          <p className="truncate text-sm font-semibold text-[#1d1d1f]">{employee.department || '-'}</p>
          <p className="mt-1 truncate text-xs text-[#6e6e73]">{employee.position || '-'}</p>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <SmallBadge icon={<Fingerprint size={13} />} label={employee.machine_pin || '-'} />
          <SmallBadge icon={<WalletCards size={13} />} label={`Cuti ${employee.annual_leave_balance || 0}`} />
          <SmallBadge icon={<WalletCards size={13} />} label={`PHL ${employee.phl_balance || 0}`} />
        </div>

        <div className="flex shrink-0 flex-wrap justify-start gap-2 xl:justify-end">
          <button type="button" onClick={onDetail} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8] transition hover:bg-blue-100">
            <Eye size={15} />
            Detail
          </button>
          <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-4 text-xs font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7]">
            <Pencil size={15} />
            Edit
          </button>
          <button type="button" onClick={onToggleActive} className={['flex h-9 w-9 items-center justify-center rounded-2xl transition', employee.is_active === false ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'].join(' ')}>
            <Power size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeeDetailModal({ employee, onClose, onEdit }: { employee: Employee; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex min-w-0 items-start justify-between gap-4 border-b border-black/5 p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#1d1d1f] text-base font-bold text-white">
              {getInitials(employee.full_name || '-')}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-[#1d1d1f]">{employee.full_name || '-'}</h2>
              <p className="mt-1 truncate text-sm text-[#6e6e73]">{employee.employee_number || '-'} · {employee.department || '-'} · {employee.position || '-'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]">
            <X size={18} />
          </button>
        </div>

        <div className="min-w-0 overflow-y-auto p-6">
          <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
            <DetailSection title="Identitas" icon={<UserRound size={18} />}>
              <DetailItem label="Nama" value={employee.full_name} />
              <DetailItem label="NIP / Employee Number" value={employee.employee_number} />
              <DetailItem label="Machine PIN" value={employee.machine_pin} />
              <DetailItem label="Gender" value={formatGender(employee.gender)} />
              <DetailItem label="Employment Status" value={formatEmploymentStatus(employee.employment_status)} />
              <DetailItem label="Status Data" value={employee.is_active === false ? 'Inactive' : 'Active'} />
            </DetailSection>

            <DetailSection title="Organisasi" icon={<Building2 size={18} />}>
              <DetailItem label="Departemen" value={employee.department} />
              <DetailItem label="Jabatan" value={employee.position} />
              <DetailItem label="Join Date" value={formatDisplayDate(employee.join_date || '')} />
              <DetailItem label="Atasan 1" value={employee.supervisor_1} />
              <DetailItem label="Atasan 2" value={employee.supervisor_2} />
              <DetailItem label="Update Terakhir" value={formatDateTime(employee.updated_at || '')} />
            </DetailSection>

            <DetailSection title="Kontak" icon={<Mail size={18} />}>
              <DetailItem label="Email" value={employee.email} />
              <DetailItem label="Nomor HP Utama" value={employee.phone} />
              <DetailItem label="No. HP Pribadi" value={employee.personal_phone} />
              <DetailItem label="Kontak Darurat" value={employee.emergency_contact_name} />
              <DetailItem label="No. Kontak Darurat" value={employee.emergency_contact_phone} />
              <DetailItem label="Personal Updated" value={formatDateTime(employee.personal_updated_at || '')} />
            </DetailSection>

            <DetailSection title="Alamat Domisili" icon={<MapPin size={18} />} wide>
              <DetailItem label="Alamat" value={employee.address} long />
            </DetailSection>

            <DetailSection title="Saldo" icon={<WalletCards size={18} />}>
              <DetailItem label="Saldo Cuti Tahunan" value={`${employee.annual_leave_balance || 0} hari`} />
              <DetailItem label="Saldo PHL" value={`${employee.phl_balance || 0} hari`} />
            </DetailSection>

            <DetailSection title="Audit Sinkronisasi" icon={<Clock3 size={18} />}>
              <DetailItem label="Personal Updated By" value={employee.personal_updated_by} />
              <DetailItem label="Personal Updated At" value={formatDateTime(employee.personal_updated_at || '')} />
              <DetailItem label="Created At" value={formatDateTime(employee.created_at || '')} />
              <DetailItem label="Updated At" value={formatDateTime(employee.updated_at || '')} />
            </DetailSection>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 p-6 md:flex-row md:justify-end">
          <button type="button" onClick={onClose} className="harmony-button-secondary">Tutup</button>
          <button type="button" onClick={onEdit} className="harmony-button-primary">
            <Pencil size={18} />
            Edit Data
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeeFormModal({ form, saving, editingEmployeeId, onSubmit, onClose, onUpdate }: { form: EmployeeForm; saving: boolean; editingEmployeeId: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void; onUpdate: (field: keyof EmployeeForm, value: string | number | boolean) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex min-w-0 items-start justify-between gap-4 border-b border-black/5 p-6">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Sparkles size={14} />
              Employee Master
            </div>
            <h2 className="truncate text-xl font-semibold text-[#1d1d1f]">{editingEmployeeId ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h2>
            <p className="mt-1 text-sm text-[#6e6e73]">Form dibuat dalam modal agar halaman utama tetap compact.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-6 overflow-y-auto p-6">
            <FormSection title="Identitas Karyawan" description="Data utama untuk pencarian, user account, dan mapping employee." icon={<Users size={18} />}>
              <InputField label="Employee Number" value={form.employee_number} onChange={(value) => onUpdate('employee_number', value)} placeholder="Contoh: EMP001" required />
              <InputField label="Machine PIN" value={form.machine_pin} onChange={(value) => onUpdate('machine_pin', value)} placeholder="PIN dari mesin fingerprint" required />
              <InputField label="Nama Lengkap" value={form.full_name} onChange={(value) => onUpdate('full_name', value)} placeholder="Nama karyawan" required />
              <InputField label="Email" type="email" value={form.email} onChange={(value) => onUpdate('email', value)} placeholder="email@company.com" />
              <InputField label="Nomor HP Kantor/Utama" value={form.phone} onChange={(value) => onUpdate('phone', value)} placeholder="08xxxxxxxxxx" />
              <SelectField label="Gender" value={form.gender} onChange={(value) => onUpdate('gender', value)} options={[{ label: 'Semua / Tidak diset', value: 'all' }, { label: 'Laki-laki', value: 'male' }, { label: 'Perempuan', value: 'female' }]} />
            </FormSection>

            <FormSection title="Organisasi & Status" description="Struktur unit, jabatan, tanggal masuk, dan status employment." icon={<Building2 size={18} />}>
              <InputField label="Departemen" value={form.department} onChange={(value) => onUpdate('department', value)} placeholder="Contoh: PSDM" />
              <InputField label="Jabatan" value={form.position} onChange={(value) => onUpdate('position', value)} placeholder="Contoh: Staff HR" />
              <InputField label="Join Date" type="date" value={form.join_date} onChange={(value) => onUpdate('join_date', value)} />
              <SelectField label="Employment Status" value={form.employment_status} onChange={(value) => onUpdate('employment_status', value)} options={[{ label: 'Active', value: 'active' }, { label: 'Probation', value: 'probation' }, { label: 'Contract', value: 'contract' }, { label: 'Permanent', value: 'permanent' }, { label: 'Resigned', value: 'resigned' }, { label: 'Inactive', value: 'inactive' }]} />
              <InputField label="Atasan 1" value={form.supervisor_1} onChange={(value) => onUpdate('supervisor_1', value)} placeholder="Employee number / nama / email atasan" />
              <InputField label="Atasan 2" value={form.supervisor_2} onChange={(value) => onUpdate('supervisor_2', value)} placeholder="Employee number / nama / email atasan" />
            </FormSection>

            <FormSection title="Data Pribadi Tersinkron" description="Data ini dapat diperbarui oleh employee dari Employee Settings, dan juga dapat dikoreksi oleh HR." icon={<HeartHandshake size={18} />}>
              <InputField label="No. HP Pribadi" value={form.personal_phone} onChange={(value) => onUpdate('personal_phone', value)} placeholder="No. HP pribadi" />
              <InputField label="Nama Kontak Darurat" value={form.emergency_contact_name} onChange={(value) => onUpdate('emergency_contact_name', value)} placeholder="Nama keluarga / wali" />
              <InputField label="No. Kontak Darurat" value={form.emergency_contact_phone} onChange={(value) => onUpdate('emergency_contact_phone', value)} placeholder="No. kontak darurat" />
              <TextareaField label="Alamat Domisili" value={form.address} onChange={(value) => onUpdate('address', value)} placeholder="Alamat domisili karyawan" />
            </FormSection>

            <FormSection title="Saldo & Status Data" description="Saldo cuti tahunan, saldo PHL, dan status aktif data employee." icon={<WalletCards size={18} />}>
              <InputField label="Saldo Cuti Tahunan" type="number" value={String(form.annual_leave_balance)} onChange={(value) => onUpdate('annual_leave_balance', Number(value))} />
              <InputField label="Saldo PHL" type="number" value={String(form.phl_balance)} onChange={(value) => onUpdate('phl_balance', Number(value))} />
              <SelectField label="Status Data" value={form.is_active ? 'active' : 'inactive'} onChange={(value) => onUpdate('is_active', value === 'active')} options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} />
            </FormSection>
          </div>

          <div className="flex flex-col gap-3 border-t border-black/5 p-6 md:flex-row md:justify-end">
            <button type="button" onClick={onClose} className="harmony-button-secondary">Batal</button>
            <button type="submit" disabled={saving} className="harmony-button-primary">
              <Save size={18} />
              {saving ? 'Menyimpan...' : editingEmployeeId ? 'Update Data' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProfileUpdateCard({ log }: { log: ProfileUpdateLog }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-black/5 bg-[#f5f5f7]/70 p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">{getInitials(log.full_name || '-')}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1d1d1f]">{log.full_name || '-'}</p>
          <p className="mt-1 truncate text-xs text-[#6e6e73]">{log.employee_number || '-'} · {log.email || '-'}</p>
          <p className="mt-2 text-xs font-semibold text-[#007aff]">{formatDateTime(log.created_at || '')}</p>
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, description, icon, children }: { title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">{icon}</div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#1d1d1f]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  )
}

function DetailSection({ title, icon, children, wide = false }: { title: string; icon: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-[26px] border border-black/5 bg-[#f5f5f7]/70 p-5 ${wide ? 'xl:col-span-2 2xl:col-span-2' : ''}`}>
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <div className="shrink-0 rounded-2xl bg-white p-2 text-[#007aff] shadow-sm">{icon}</div>
        <h3 className="truncate font-semibold text-[#1d1d1f]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function DetailItem({ label, value, long = false }: { label: string; value?: string | number | null; long?: boolean }) {
  return (
    <div className={long ? 'min-w-0 rounded-2xl bg-white p-4' : 'grid min-w-0 grid-cols-1 gap-1.5 rounded-2xl bg-white px-4 py-3 sm:grid-cols-[145px_minmax(0,1fr)] sm:items-start sm:gap-4'}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>

      <p className={`${long ? 'mt-2 text-left leading-6' : 'text-left sm:text-right'} min-w-0 break-words text-sm font-semibold leading-6 text-[#1d1d1f]`}>
        {value || '-'}
      </p>
    </div>
  )
}

function SummaryCard({ title, value, description, icon, tone }: { title: string; value: string; description: string; icon: ReactNode; tone: 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'red' }) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
    cyan: 'text-[#0077a3] bg-[#e8f8ff]',
    red: 'text-red-700 bg-red-50',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift harmony-slide-up min-w-0 p-5">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6e6e73]">{title}</p>
          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#1d1d1f]">{value}</h3>
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#86868b]">{description}</p>
        </div>
        <div className={`shrink-0 rounded-2xl p-3 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  )
}

function SmallBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#1d1d1f] ring-1 ring-black/5">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className="harmony-label">{label}</span>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="harmony-input" />
    </label>
  )
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block min-w-0 xl:col-span-3">
      <span className="harmony-label">{label}</span>
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="harmony-textarea" />
    </label>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) {
  return (
    <label className="block min-w-0">
      <span className="harmony-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="harmony-select">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={['inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-bold', active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'].join(' ')}>{active ? 'Active' : 'Inactive'}</span>
}

function AlertBox({ type, message }: { type: 'success' | 'error'; message: string }) {
  const className = type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'
  return <div className={`rounded-2xl border p-4 text-sm ${className}`}>{message}</div>
}

function employeeToForm(employee: Employee): EmployeeForm {
  return {
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
    personal_phone: employee.personal_phone || '',
    address: employee.address || '',
    emergency_contact_name: employee.emergency_contact_name || '',
    emergency_contact_phone: employee.emergency_contact_phone || '',
  }
}

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)
  if (words.length === 0) return 'E'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
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

function formatGender(value: string | null | undefined) {
  if (value === 'male') return 'Laki-laki'
  if (value === 'female') return 'Perempuan'
  if (value === 'all') return 'Tidak diset'
  return value || '-'
}

function formatDisplayDate(value: string) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
