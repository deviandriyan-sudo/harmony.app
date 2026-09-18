'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  getAvailableJobFunctions,
  getJobFunctionLabel,
  getWorkforceSchedulePolicy,
  type WorkforceType,
} from '@/lib/workforce'

type Vendor = {
  id: string
  vendor_code: string
  vendor_name: string
  description: string | null
  is_active: boolean | null
}

type Schedule = {
  id: string
  schedule_name: string
  schedule_code: string
  schedule_group: string | null
  schedule_type: string | null
  expected_check_in: string
  expected_check_out: string
  is_active: boolean | null
}

type WorkforceEmployee = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  email: string | null
  department: string | null
  position: string | null
  employment_status: string | null
  is_active: boolean | null
  workforce_type: WorkforceType | string | null
  vendor_id: string | null
  job_function: string | null
  work_schedule_id: string | null
  work_schedule_name: string | null
  work_schedule_code: string | null
  schedule_group: string | null
  auto_detect_schedule: boolean | null
  vendor?: Vendor | null
  schedule?: Schedule | null
}

type WorkforceResponse = {
  success: boolean
  employees?: WorkforceEmployee[]
  vendors?: Vendor[]
  schedules?: Schedule[]
  error?: string
}

type EditForm = {
  employee_id: string
  workforce_type: WorkforceType
  vendor_id: string
  job_function: string
}

const emptyForm: EditForm = {
  employee_id: '',
  workforce_type: 'organic',
  vendor_id: '',
  job_function: '',
}

export default function HRWorkforcePage() {
  const [employees, setEmployees] = useState<WorkforceEmployee[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | WorkforceType>('all')
  const [vendorFilter, setVendorFilter] = useState('all')

  const [editEmployee, setEditEmployee] = useState<WorkforceEmployee | null>(null)
  const [form, setForm] = useState<EditForm>(emptyForm)

  useEffect(() => {
    void fetchWorkforce()
  }, [])

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.access_token) {
      throw new Error('Session HR tidak ditemukan. Silakan login ulang.')
    }
    return data.session.access_token
  }

  async function fetchWorkforce() {
    setLoading(true)
    setErrorMessage('')

    try {
      const token = await getAccessToken()
      const response = await fetch('/api/hr/workforce', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })

      const payload = (await response.json().catch(() => null)) as WorkforceResponse | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Gagal memuat data tenaga kerja.')
      }

      setEmployees(payload.employees || [])
      setVendors((payload.vendors || []).filter((item) => item.is_active !== false))
      setSchedules((payload.schedules || []).filter((item) => item.is_active !== false))
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal memuat data tenaga kerja.')
    } finally {
      setLoading(false)
    }
  }

  function openEdit(employee: WorkforceEmployee) {
    const workforceType: WorkforceType =
      String(employee.workforce_type || 'organic').toLowerCase() === 'outsource'
        ? 'outsource'
        : 'organic'

    setEditEmployee(employee)
    setForm({
      employee_id: employee.id,
      workforce_type: workforceType,
      vendor_id: workforceType === 'outsource' ? employee.vendor_id || '' : '',
      job_function: workforceType === 'outsource' ? employee.job_function || '' : '',
    })
    setErrorMessage('')
    setSuccessMessage('')
  }

  function closeEdit() {
    if (saving) return
    setEditEmployee(null)
    setForm(emptyForm)
  }

  const selectedVendor = useMemo(
    () => vendors.find((item) => item.id === form.vendor_id) || null,
    [vendors, form.vendor_id],
  )

  const availableFunctions = useMemo(
    () => getAvailableJobFunctions(selectedVendor?.vendor_code || ''),
    [selectedVendor],
  )

  const policy = useMemo(
    () => getWorkforceSchedulePolicy(form.workforce_type, form.job_function),
    [form.workforce_type, form.job_function],
  )

  const selectedFixedSchedule = useMemo(
    () => schedules.find((item) => item.schedule_code === policy.scheduleCode) || null,
    [schedules, policy.scheduleCode],
  )

  async function saveWorkforce() {
    if (!editEmployee) return

    if (form.workforce_type === 'outsource' && !form.vendor_id) {
      setErrorMessage('Vendor wajib dipilih untuk karyawan outsource.')
      return
    }

    if (form.workforce_type === 'outsource' && !form.job_function) {
      setErrorMessage('Fungsi kerja wajib dipilih untuk karyawan outsource.')
      return
    }

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const token = await getAccessToken()
      const response = await fetch('/api/hr/workforce', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Gagal menyimpan klasifikasi tenaga kerja.')
      }

      setSuccessMessage(`${editEmployee.full_name || 'Karyawan'} berhasil diperbarui.`)
      setEditEmployee(null)
      setForm(emptyForm)
      await fetchWorkforce()
    } catch (error: any) {
      setErrorMessage(error?.message || 'Gagal menyimpan klasifikasi tenaga kerja.')
    } finally {
      setSaving(false)
    }
  }

  const activeEmployees = useMemo(
    () => employees.filter((item) => item.is_active !== false),
    [employees],
  )

  const organicCount = activeEmployees.filter(
    (item) => String(item.workforce_type || 'organic').toLowerCase() !== 'outsource',
  ).length

  const outsourceCount = activeEmployees.filter(
    (item) => String(item.workforce_type || '').toLowerCase() === 'outsource',
  ).length

  const securityCount = activeEmployees.filter(
    (item) => String(item.job_function || '').toLowerCase() === 'security',
  ).length

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return activeEmployees.filter((employee) => {
      const workforceType =
        String(employee.workforce_type || 'organic').toLowerCase() === 'outsource'
          ? 'outsource'
          : 'organic'

      if (typeFilter !== 'all' && workforceType !== typeFilter) return false
      if (vendorFilter !== 'all' && employee.vendor_id !== vendorFilter) return false

      if (!keyword) return true

      const haystack = [
        employee.full_name,
        employee.employee_number,
        employee.machine_pin,
        employee.department,
        employee.position,
        employee.vendor?.vendor_name,
        employee.vendor?.vendor_code,
        getJobFunctionLabel(employee.job_function),
        employee.work_schedule_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(keyword)
    })
  }, [activeEmployees, search, typeFilter, vendorFilter])

  return (
    <>
      <Topbar
        title="Tenaga Kerja & Jadwal"
        description="Kelola kategori organik/outsource, vendor, fungsi kerja, dan kebijakan jadwal tanpa memisahkan database karyawan."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 overflow-x-hidden p-4 sm:p-6">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          <SummaryCard title="Karyawan Aktif" value={String(activeEmployees.length)} note="Satu master employee" icon={<Users size={20} />} />
          <SummaryCard title="Organik" value={String(organicCount)} note="Jadwal reguler Poltek" icon={<BadgeCheck size={20} />} />
          <SummaryCard title="Outsource" value={String(outsourceCount)} note="ABR + PCN" icon={<Building2 size={20} />} />
          <SummaryCard title="Security" value={String(securityCount)} note="Dynamic shift disiapkan" icon={<ShieldCheck size={20} />} />
        </div>

        {errorMessage && (
          <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-[22px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {successMessage}
          </div>
        )}

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 bg-white/60 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                <UserRound size={14} /> Workforce Master
              </div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">Klasifikasi & Assignment Jadwal</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
                Data identitas tetap berasal dari menu Data Karyawan. Halaman ini hanya menentukan status tenaga kerja dan aturan absensinya.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchWorkforce()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] border border-black/5 bg-white px-4 text-sm font-semibold text-[#1d1d1f] shadow-sm disabled:opacity-60"
            >
              <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="grid gap-3 border-b border-black/5 p-5 md:grid-cols-[minmax(0,1fr)_190px_220px]">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, PIN, vendor, fungsi..."
                className="harmony-input pl-11"
              />
            </div>

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | WorkforceType)} className="harmony-input">
              <option value="all">Semua kategori</option>
              <option value="organic">Organik</option>
              <option value="outsource">Outsource</option>
            </select>

            <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className="harmony-input">
              <option value="all">Semua vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.vendor_code} — {vendor.vendor_name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex min-h-60 items-center justify-center p-8 text-[#6e6e73]">
              <Loader2 size={24} className="mr-3 animate-spin text-[#007aff]" /> Memuat master tenaga kerja...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6e6e73]">Tidak ada karyawan yang sesuai filter.</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-[#f5f5f7] text-[11px] font-bold uppercase tracking-[0.08em] text-[#7c7c80]">
                    <tr>
                      <th className="px-5 py-3">Karyawan</th>
                      <th className="px-5 py-3">Kategori</th>
                      <th className="px-5 py-3">Vendor / Fungsi</th>
                      <th className="px-5 py-3">Jadwal</th>
                      <th className="px-5 py-3">Mode</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 bg-white/50">
                    {filteredEmployees.map((employee) => (
                      <EmployeeRow key={employee.id} employee={employee} onEdit={() => openEdit(employee)} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 lg:hidden">
                {filteredEmployees.map((employee) => (
                  <EmployeeCard key={employee.id} employee={employee} onEdit={() => openEdit(employee)} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoBox
            title="Mapping otomatis"
            text="ABR Landscaping dan PCN Cleaning Service otomatis 07:00–16:00. ABR Driver, PCN Electrician, dan PCN IT otomatis 08:00–17:00."
          />
          <InfoBox
            title="Security"
            text="Security disimpan sebagai dynamic shift. Pada Phase 1 data master sudah siap, tetapi fingerprint Security belum diproses otomatis sampai Shift Detection Engine Phase 2 dipasang."
          />
        </div>
      </section>

      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
            <div className="flex items-start justify-between gap-4 border-b border-black/5 p-5 sm:p-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                  <Pencil size={14} /> Edit Workforce
                </div>
                <h3 className="text-xl font-semibold text-[#1d1d1f]">{editEmployee.full_name || 'Karyawan'}</h3>
                <p className="mt-1 text-sm text-[#6e6e73]">{editEmployee.employee_number || '-'} · PIN {editEmployee.machine_pin || '-'}</p>
              </div>
              <button type="button" onClick={closeEdit} disabled={saving} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7]"><X size={18} /></button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <label className="block">
                <span className="harmony-label">Kategori Tenaga Kerja</span>
                <select
                  value={form.workforce_type}
                  onChange={(event) => {
                    const value = event.target.value as WorkforceType
                    setForm((prev) => ({ ...prev, workforce_type: value, vendor_id: '', job_function: '' }))
                  }}
                  className="harmony-input"
                >
                  <option value="organic">Karyawan Organik</option>
                  <option value="outsource">Karyawan Outsource</option>
                </select>
              </label>

              {form.workforce_type === 'outsource' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="harmony-label">Vendor</span>
                    <select
                      value={form.vendor_id}
                      onChange={(event) => setForm((prev) => ({ ...prev, vendor_id: event.target.value, job_function: '' }))}
                      className="harmony-input"
                    >
                      <option value="">Pilih vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.vendor_code} — {vendor.vendor_name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="harmony-label">Fungsi Kerja</span>
                    <select
                      value={form.job_function}
                      onChange={(event) => setForm((prev) => ({ ...prev, job_function: event.target.value }))}
                      className="harmony-input"
                      disabled={!form.vendor_id}
                    >
                      <option value="">Pilih fungsi</option>
                      {availableFunctions.map((item) => (
                        <option key={item.code} value={item.code}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="rounded-[26px] border border-black/5 bg-[#f5f5f7] p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-[#1d1d1f]"><Clock3 size={17} className="text-[#007aff]" /> Kebijakan Jadwal Otomatis</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PolicyItem label="Mode" value={policy.mode === 'security_dynamic' ? 'Dynamic Security' : 'Fixed Schedule'} />
                  <PolicyItem label="Jadwal" value={policy.mode === 'security_dynamic' ? policy.scheduleName : selectedFixedSchedule?.schedule_name || policy.scheduleName} />
                  <PolicyItem label="Jam" value={policy.mode === 'security_dynamic' ? 'S1 07–15 · S2 15–23 · S3 23–07' : selectedFixedSchedule ? `${selectedFixedSchedule.expected_check_in} - ${selectedFixedSchedule.expected_check_out}` : '-'} />
                  <PolicyItem label="Auto Detect" value={policy.autoDetectSchedule ? 'Aktif' : 'Tidak diperlukan'} />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeEdit} disabled={saving} className="min-h-11 rounded-[18px] border border-black/5 bg-white px-5 text-sm font-semibold text-[#1d1d1f]">Batal</button>
                <button type="button" onClick={() => void saveWorkforce()} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white disabled:opacity-60">
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                  Simpan Klasifikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EmployeeRow({ employee, onEdit }: { employee: WorkforceEmployee; onEdit: () => void }) {
  const isOutsource = String(employee.workforce_type || 'organic').toLowerCase() === 'outsource'
  const isSecurity = String(employee.job_function || '').toLowerCase() === 'security'

  return (
    <tr className="text-sm text-[#1d1d1f]">
      <td className="px-5 py-4">
        <div className="font-semibold">{employee.full_name || '-'}</div>
        <div className="mt-1 text-xs text-[#7c7c80]">{employee.employee_number || '-'} · PIN {employee.machine_pin || '-'}</div>
      </td>
      <td className="px-5 py-4"><WorkforceBadge outsource={isOutsource} /></td>
      <td className="px-5 py-4">
        {isOutsource ? (
          <><div className="font-medium">{employee.vendor?.vendor_code || '-'}</div><div className="mt-1 text-xs text-[#7c7c80]">{getJobFunctionLabel(employee.job_function)}</div></>
        ) : <span className="text-[#7c7c80]">Poltek</span>}
      </td>
      <td className="px-5 py-4">
        <div className="font-medium">{employee.work_schedule_name || (isSecurity ? 'Security Dynamic Shift' : '-')}</div>
        <div className="mt-1 text-xs text-[#7c7c80]">{employee.work_schedule_code || (isSecurity ? 'security_dynamic' : '-')}</div>
      </td>
      <td className="px-5 py-4">
        {isSecurity ? <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">Auto Detect</span> : <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">Fixed</span>}
      </td>
      <td className="px-5 py-4 text-right">
        <button type="button" onClick={onEdit} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/5 bg-white text-[#007aff] shadow-sm"><Pencil size={16} /></button>
      </td>
    </tr>
  )
}

function EmployeeCard({ employee, onEdit }: { employee: WorkforceEmployee; onEdit: () => void }) {
  const isOutsource = String(employee.workforce_type || 'organic').toLowerCase() === 'outsource'
  return (
    <div className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-[#1d1d1f]">{employee.full_name || '-'}</div>
          <div className="mt-1 text-xs text-[#7c7c80]">{employee.employee_number || '-'} · PIN {employee.machine_pin || '-'}</div>
        </div>
        <button type="button" onClick={onEdit} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]"><Pencil size={16} /></button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PolicyItem label="Kategori" value={isOutsource ? 'Outsource' : 'Organik'} />
        <PolicyItem label="Vendor/Fungsi" value={isOutsource ? `${employee.vendor?.vendor_code || '-'} · ${getJobFunctionLabel(employee.job_function)}` : 'Poltek'} />
        <PolicyItem label="Jadwal" value={employee.work_schedule_name || (employee.schedule_group === 'security' ? 'Security Dynamic Shift' : '-')} />
        <PolicyItem label="Mode" value={employee.auto_detect_schedule ? 'Auto Detect' : 'Fixed'} />
      </div>
    </div>
  )
}

function WorkforceBadge({ outsource }: { outsource: boolean }) {
  return outsource ? (
    <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">Outsource</span>
  ) : (
    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Organik</span>
  )
}

function SummaryCard({ title, value, note, icon }: { title: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <div className="harmony-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-medium text-[#6e6e73]">{title}</p><p className="mt-2 text-2xl font-semibold text-[#1d1d1f]">{value}</p><p className="mt-1 text-xs text-[#7c7c80]">{note}</p></div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">{icon}</div>
      </div>
    </div>
  )
}

function PolicyItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[18px] border border-black/5 bg-white px-4 py-3"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8e8e93]">{label}</div><div className="mt-1 text-sm font-semibold text-[#1d1d1f]">{value}</div></div>
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-white/80 p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2 font-semibold text-[#1d1d1f]"><Briefcase size={17} className="text-[#007aff]" /> {title}</div>
      <p className="text-sm leading-6 text-[#6e6e73]">{text}</p>
    </div>
  )
}
