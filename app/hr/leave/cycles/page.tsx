'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  WalletCards,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCcw,
  RotateCcw,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'
import type { Employee } from '@/types/employee'
import type { AnnualLeaveCycle } from '@/types/annualLeaveCycle'

type CycleForm = {
  employee_number: string
  full_name: string
  department: string
  join_date: string

  cycle_start: string
  cycle_end: string
  matured_at: string

  entitlement_days: number
  used_days: number
  remaining_days: number

  carry_forward_days: number
  carry_forward_used_days: number
  carry_forward_remaining_days: number
  carry_forward_expired_at: string

  status: string
  notes: string
  is_active: boolean
}

const initialForm: CycleForm = {
  employee_number: '',
  full_name: '',
  department: '',
  join_date: '',

  cycle_start: '',
  cycle_end: '',
  matured_at: '',

  entitlement_days: 12,
  used_days: 0,
  remaining_days: 12,

  carry_forward_days: 0,
  carry_forward_used_days: 0,
  carry_forward_remaining_days: 0,
  carry_forward_expired_at: '',

  status: 'active',
  notes: '',
  is_active: true,
}

export default function HRLeaveCyclesPage() {
  const [cycles, setCycles] = useState<AnnualLeaveCycle[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<CycleForm>(initialForm)

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    const { data: cycleData, error: cycleError } = await supabase
      .from('annual_leave_cycles')
      .select('*')
      .order('matured_at', { ascending: false })
      .order('full_name', { ascending: true })

    if (cycleError) {
      setErrorMessage(cycleError.message)
      setCycles([])
      setLoading(false)
      return
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (employeeError) {
      setErrorMessage(employeeError.message)
      setEmployees([])
      setLoading(false)
      return
    }

    setCycles(cycleData || [])
    setEmployees(employeeData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function updateForm(
    field: keyof CycleForm,
    value: string | number | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingCycleId(null)
    setShowForm(false)
    setErrorMessage('')
  }

  function parseJoinDateToISO(joinDate: string | null) {
    if (!joinDate) return ''

    const raw = joinDate.trim()

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split('/')
      return `${year}-${month}-${day}`
    }

    return ''
  }

  function formatDateToISO(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function addYears(date: Date, years: number) {
    const copied = new Date(date)
    copied.setFullYear(copied.getFullYear() + years)
    return copied
  }

  function addMonths(date: Date, months: number) {
    const copied = new Date(date)
    copied.setMonth(copied.getMonth() + months)
    return copied
  }

  function subtractDays(date: Date, days: number) {
    const copied = new Date(date)
    copied.setDate(copied.getDate() - days)
    return copied
  }

  function getCycleFromJoinDate(joinDate: string, cycleNumber: number) {
  const isoJoinDate = parseJoinDateToISO(joinDate)

  if (!isoJoinDate) {
    return null
  }

  const join = new Date(`${isoJoinDate}T00:00:00`)

  if (Number.isNaN(join.getTime())) {
    return null
  }

  /**
   * Logic yang benar:
   *
   * Join date: 02/06/2024
   *
   * Cycle 1:
   * matured_at  = 2025-06-02
   * cycle_start = 2025-06-02
   * cycle_end   = 2026-06-01
   *
   * Cycle 2:
   * matured_at  = 2026-06-02
   * cycle_start = 2026-06-02
   * cycle_end   = 2027-06-01
   */

  const maturedAtDate = addYears(join, cycleNumber)
  const nextMatureDate = addYears(join, cycleNumber + 1)
  const cycleEndDate = subtractDays(nextMatureDate, 1)

  return {
    cycle_start: formatDateToISO(maturedAtDate),
    matured_at: formatDateToISO(maturedAtDate),
    cycle_end: formatDateToISO(cycleEndDate),
  }
}

  function getCurrentCycleNumber(joinDate: string) {
    const isoJoinDate = parseJoinDateToISO(joinDate)

    if (!isoJoinDate) return 0

    const join = new Date(`${isoJoinDate}T00:00:00`)
    const today = new Date()

    if (Number.isNaN(join.getTime())) return 0

    let cycleNumber = 0

    for (let i = 1; i <= 50; i++) {
      const maturedAt = addYears(join, i)

      if (today >= maturedAt) {
        cycleNumber = i
      }
    }

    return cycleNumber
  }

  function hasCycle(employeeNumber: string, maturedAt: string) {
    return cycles.some(
      (cycle) =>
        cycle.employee_number === employeeNumber &&
        cycle.matured_at === maturedAt
    )
  }

  async function handleGenerateCurrentCycles() {
    setGenerating(true)
    setErrorMessage('')
    setSuccessMessage('')

    const payload = []

    for (const employee of employees) {
      const joinDate = employee.join_date || ''
      const cycleNumber = getCurrentCycleNumber(joinDate)

      if (cycleNumber <= 0) {
        continue
      }

      const cycle = getCycleFromJoinDate(joinDate, cycleNumber)

      if (!cycle) {
        continue
      }

      if (hasCycle(employee.employee_number, cycle.matured_at)) {
        continue
      }

      payload.push({
        employee_number: employee.employee_number,
        full_name: employee.full_name,
        department: employee.department,
        join_date: employee.join_date,

        cycle_start: cycle.cycle_start,
        cycle_end: cycle.cycle_end,
        matured_at: cycle.matured_at,

        entitlement_days: 12,
        used_days: 0,
        remaining_days: 12,

        carry_forward_days: 0,
        carry_forward_used_days: 0,
        carry_forward_remaining_days: 0,
        carry_forward_expired_at: null,

        status: 'active',
        notes: 'Generated otomatis berdasarkan anniversary tanggal masuk kerja.',
        is_active: true,
        edited_by: 'HR',
        updated_at: new Date().toISOString(),
      })
    }

    if (payload.length === 0) {
      setSuccessMessage('Tidak ada cycle baru yang perlu dibuat.')
      setGenerating(false)
      return
    }

    const { error } = await supabase
      .from('annual_leave_cycles')
      .insert(payload)

    if (error) {
      setErrorMessage(error.message)
      setGenerating(false)
      return
    }

    setSuccessMessage(`${payload.length} cycle cuti tahunan berhasil dibuat.`)
    setGenerating(false)

    await fetchData()
  }

  function handleAddNew() {
    setForm(initialForm)
    setEditingCycleId(null)
    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  function handleEmployeeSelect(employeeNumber: string) {
    const employee = employees.find(
      (item) => item.employee_number === employeeNumber
    )

    if (!employee) {
      updateForm('employee_number', employeeNumber)
      return
    }

    const cycleNumber = getCurrentCycleNumber(employee.join_date || '')
    const cycle = getCycleFromJoinDate(
      employee.join_date || '',
      Math.max(cycleNumber, 1)
    )

    setForm((prev) => ({
      ...prev,
      employee_number: employee.employee_number || '',
      full_name: employee.full_name || '',
      department: employee.department || '',
      join_date: employee.join_date || '',
      cycle_start: cycle?.cycle_start || '',
      cycle_end: cycle?.cycle_end || '',
      matured_at: cycle?.matured_at || '',
      entitlement_days: 12,
      used_days: 0,
      remaining_days: 12,
    }))
  }

  function handleEdit(cycle: AnnualLeaveCycle) {
    setEditingCycleId(cycle.id)

    setForm({
      employee_number: cycle.employee_number || '',
      full_name: cycle.full_name || '',
      department: cycle.department || '',
      join_date: cycle.join_date || '',

      cycle_start: cycle.cycle_start || '',
      cycle_end: cycle.cycle_end || '',
      matured_at: cycle.matured_at || '',

      entitlement_days: Number(cycle.entitlement_days || 12),
      used_days: Number(cycle.used_days || 0),
      remaining_days: Number(cycle.remaining_days || 0),

      carry_forward_days: Number(cycle.carry_forward_days || 0),
      carry_forward_used_days: Number(cycle.carry_forward_used_days || 0),
      carry_forward_remaining_days: Number(
        cycle.carry_forward_remaining_days || 0
      ),
      carry_forward_expired_at: cycle.carry_forward_expired_at || '',

      status: cycle.status || 'active',
      notes: cycle.notes || '',
      is_active: cycle.is_active ?? true,
    })

    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleBalanceChange(
    field: 'entitlement_days' | 'used_days',
    value: number
  ) {
    const nextForm = {
      ...form,
      [field]: value,
    }

    const remaining =
      Number(nextForm.entitlement_days || 0) - Number(nextForm.used_days || 0)

    setForm({
      ...nextForm,
      remaining_days: Math.max(remaining, 0),
    })
  }

  function handleCarryForwardChange(
    field: 'carry_forward_days' | 'carry_forward_used_days',
    value: number
  ) {
    const nextForm = {
      ...form,
      [field]: value,
    }

    const remaining =
      Number(nextForm.carry_forward_days || 0) -
      Number(nextForm.carry_forward_used_days || 0)

    setForm({
      ...nextForm,
      carry_forward_remaining_days: Math.max(remaining, 0),
    })
  }

  function setCarryForwardSixMonths() {
    if (!form.matured_at) {
      setErrorMessage('Matured at belum tersedia.')
      return
    }

    const matured = new Date(`${form.matured_at}T00:00:00`)

    if (Number.isNaN(matured.getTime())) {
      setErrorMessage('Format matured at tidak valid.')
      return
    }

    const expired = addMonths(matured, 6)

    setForm((prev) => ({
      ...prev,
      carry_forward_days: prev.remaining_days,
      carry_forward_remaining_days: prev.remaining_days,
      carry_forward_used_days: 0,
      carry_forward_expired_at: formatDateToISO(expired),
      status: 'carried_forward',
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.employee_number || !form.full_name) {
      setErrorMessage('Employee wajib dipilih.')
      setSaving(false)
      return
    }

    if (!form.cycle_start || !form.cycle_end || !form.matured_at) {
      setErrorMessage('Cycle start, cycle end, dan matured at wajib diisi.')
      setSaving(false)
      return
    }

    const payload = {
      employee_number: form.employee_number,
      full_name: form.full_name,
      department: form.department || null,
      join_date: form.join_date || null,

      cycle_start: form.cycle_start,
      cycle_end: form.cycle_end,
      matured_at: form.matured_at,

      entitlement_days: form.entitlement_days,
      used_days: form.used_days,
      remaining_days: form.remaining_days,

      carry_forward_days: form.carry_forward_days,
      carry_forward_used_days: form.carry_forward_used_days,
      carry_forward_remaining_days: form.carry_forward_remaining_days,
      carry_forward_expired_at: form.carry_forward_expired_at || null,

      status: form.status,
      notes: form.notes || null,
      is_active: form.is_active,
      edited_by: 'HR',
      updated_at: new Date().toISOString(),
    }

    if (editingCycleId) {
      const { error } = await supabase
        .from('annual_leave_cycles')
        .update(payload)
        .eq('id', editingCycleId)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Cycle cuti tahunan berhasil diperbarui.')
    } else {
      const { error } = await supabase
        .from('annual_leave_cycles')
        .insert(payload)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Cycle cuti tahunan berhasil ditambahkan.')
    }

    setForm(initialForm)
    setEditingCycleId(null)
    setShowForm(false)
    setSaving(false)

    await fetchData()
  }

  const filteredCycles = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    if (!keyword) return cycles

    return cycles.filter((cycle) => {
      return (
        cycle.full_name?.toLowerCase().includes(keyword) ||
        cycle.employee_number?.toLowerCase().includes(keyword) ||
        cycle.department?.toLowerCase().includes(keyword) ||
        cycle.status?.toLowerCase().includes(keyword) ||
        cycle.cycle_start?.toLowerCase().includes(keyword) ||
        cycle.cycle_end?.toLowerCase().includes(keyword) ||
        cycle.matured_at?.toLowerCase().includes(keyword)
      )
    })
  }, [cycles, search])

  const totalCycles = cycles.length

  const activeCycles = cycles.filter(
    (cycle) => cycle.status === 'active' && cycle.is_active !== false
  ).length

  const carriedForward = cycles.filter(
    (cycle) => cycle.status === 'carried_forward'
  ).length

  const totalRemaining = cycles.reduce(
    (total, cycle) => total + Number(cycle.remaining_days || 0),
    0
  )

  return (
    <>
      <Topbar
        title="Saldo Cuti Tahunan"
        description="Generate dan kelola hak cuti tahunan berdasarkan anniversary tanggal masuk kerja."
      />

      <section className="space-y-6 p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Cycle"
            value={String(totalCycles)}
            description="Cycle cuti tersimpan"
            icon={<WalletCards size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Active"
            value={String(activeCycles)}
            description="Cycle aktif"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Carry Forward"
            value={String(carriedForward)}
            description="Postpone/carry forward"
            icon={<RotateCcw size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Total Sisa"
            value={String(totalRemaining)}
            description="Akumulasi sisa cuti"
            icon={<CalendarDays size={22} />}
            tone="blue"
          />
        </div>

        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            Error: {errorMessage}
          </div>
        )}

        {showForm && (
          <div className="harmony-card overflow-hidden">
            <div className="border-b border-[#e5e5ea] bg-white p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">
                    {editingCycleId
                      ? 'Edit Cycle Cuti'
                      : 'Tambah Cycle Cuti Manual'}
                  </h2>
                  <p className="mt-1 text-sm text-[#6e6e73]">
                    HR bisa koreksi entitlement, used, remaining, status, dan carry forward.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                >
                  <X size={18} />
                  Tutup
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-[#fbfbfd] p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#1d1d1f]">
                    Employee
                  </span>
                  <select
                    value={form.employee_number}
                    onChange={(event) => handleEmployeeSelect(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007aff]"
                    required
                  >
                    <option value="">Pilih employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.employee_number}>
                        {employee.full_name} - {employee.employee_number}
                      </option>
                    ))}
                  </select>
                </label>

                <ReadOnlyField label="Nama" value={form.full_name || '-'} />

                <ReadOnlyField label="Departemen" value={form.department || '-'} />

                <InputField
                  label="Join Date"
                  value={form.join_date}
                  onChange={(value) => updateForm('join_date', value)}
                  placeholder="Contoh: 02/01/2024"
                />

                <InputField
                  label="Cycle Start"
                  type="date"
                  value={form.cycle_start}
                  onChange={(value) => updateForm('cycle_start', value)}
                  required
                />

                <InputField
                  label="Cycle End"
                  type="date"
                  value={form.cycle_end}
                  onChange={(value) => updateForm('cycle_end', value)}
                  required
                />

                <InputField
                  label="Matured At"
                  type="date"
                  value={form.matured_at}
                  onChange={(value) => updateForm('matured_at', value)}
                  required
                />

                <InputField
                  label="Entitlement Days"
                  type="number"
                  value={String(form.entitlement_days)}
                  onChange={(value) =>
                    handleBalanceChange('entitlement_days', Number(value))
                  }
                />

                <InputField
                  label="Used Days"
                  type="number"
                  value={String(form.used_days)}
                  onChange={(value) =>
                    handleBalanceChange('used_days', Number(value))
                  }
                />

                <ReadOnlyField
                  label="Remaining Days"
                  value={String(form.remaining_days)}
                />

                <InputField
                  label="Carry Forward Days"
                  type="number"
                  value={String(form.carry_forward_days)}
                  onChange={(value) =>
                    handleCarryForwardChange('carry_forward_days', Number(value))
                  }
                />

                <InputField
                  label="Carry Forward Used"
                  type="number"
                  value={String(form.carry_forward_used_days)}
                  onChange={(value) =>
                    handleCarryForwardChange(
                      'carry_forward_used_days',
                      Number(value)
                    )
                  }
                />

                <ReadOnlyField
                  label="Carry Forward Remaining"
                  value={String(form.carry_forward_remaining_days)}
                />

                <InputField
                  label="Carry Forward Expired At"
                  type="date"
                  value={form.carry_forward_expired_at}
                  onChange={(value) =>
                    updateForm('carry_forward_expired_at', value)
                  }
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) => updateForm('status', value)}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Upcoming', value: 'upcoming' },
                    { label: 'Expired', value: 'expired' },
                    { label: 'Carried Forward', value: 'carried_forward' },
                    { label: 'Closed', value: 'closed' },
                  ]}
                />

                <SelectField
                  label="Data Status"
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(value) => updateForm('is_active', value === 'active')}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' },
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={setCarryForwardSixMonths}
                    className="w-full rounded-2xl border border-[#e5e5ea] bg-white px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                  >
                    Set Carry Forward 6 Bulan
                  </button>
                </div>

                <TextAreaField
                  label="Notes"
                  value={form.notes}
                  onChange={(value) => updateForm('notes', value)}
                  placeholder="Catatan HR"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-[#e5e5ea] bg-white px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {saving
                    ? 'Menyimpan...'
                    : editingCycleId
                      ? 'Update Data'
                      : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#e5e5ea] p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Annual Leave Cycle
              </h2>
              <p className="mt-1 text-sm text-[#6e6e73]">
                Hak cuti tahunan dibuat berdasarkan tanggal masuk kerja masing-masing employee.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3 rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3">
                <Search size={18} className="text-[#6e6e73]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIK, status..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#6e6e73] md:w-72"
                />
              </div>

              <button
                onClick={fetchData}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#e5e5ea] bg-white px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>

              <button
                onClick={handleGenerateCurrentCycles}
                disabled={generating}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                <CalendarDays size={18} />
                {generating ? 'Generating...' : 'Generate Current Cycle'}
              </button>

              <button
                onClick={handleAddNew}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0067d8]"
              >
                <Plus size={18} />
                Tambah Manual
              </button>
            </div>
          </div>

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Loading data cycle cuti...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5ea] bg-[#f5f5f7] text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="px-6 py-4 font-semibold">Employee</th>
                    <th className="px-6 py-4 font-semibold">Join Date</th>
                    <th className="px-6 py-4 font-semibold">Cycle</th>
                    <th className="px-6 py-4 font-semibold">Matured</th>
                    <th className="px-6 py-4 font-semibold">Entitlement</th>
                    <th className="px-6 py-4 font-semibold">Used</th>
                    <th className="px-6 py-4 font-semibold">Remaining</th>
                    <th className="px-6 py-4 font-semibold">Carry Forward</th>
                    <th className="px-6 py-4 font-semibold">CF Expired</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCycles.map((cycle) => (
                    <tr
                      key={cycle.id}
                      className="border-b border-[#f0f0f2] transition hover:bg-[#f9f9fb]"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#1d1d1f]">
                          {cycle.full_name || '-'}
                        </div>
                        <div className="mt-1 text-xs text-[#6e6e73]">
                          {cycle.employee_number || '-'} · {cycle.department || '-'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {cycle.join_date || '-'}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {cycle.cycle_start} s.d. {cycle.cycle_end}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {cycle.matured_at}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {cycle.entitlement_days || 0}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {cycle.used_days || 0}
                      </td>

                      <td className="px-6 py-4 font-semibold text-[#1d1d1f]">
                        {cycle.remaining_days || 0}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {cycle.carry_forward_remaining_days || 0}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {cycle.carry_forward_expired_at || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={cycle.status || 'active'} />
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEdit(cycle)}
                          className="flex items-center gap-1 rounded-xl border border-[#e5e5ea] bg-white px-3 py-2 text-xs font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCycles.length === 0 && (
                <div className="p-6 text-center text-sm text-[#6e6e73]">
                  Data cycle cuti tidak ditemukan.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

type SummaryCardProps = {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange'
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: SummaryCardProps) {
  const toneClass = {
    blue: 'text-[#007aff]',
    green: 'text-[#34c759]',
    orange: 'text-[#ff9500]',
  }[tone]

  return (
    <div className="harmony-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#6e6e73]">{title}</p>
          <h3 className="mt-2 text-3xl font-semibold text-[#1d1d1f]">
            {value}
          </h3>
          <p className="mt-1 text-xs text-[#6e6e73]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl bg-[#f5f5f7] p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

type InputFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: InputFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#1d1d1f]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007aff]"
      />
    </label>
  )
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="block">
      <span className="text-sm font-medium text-[#1d1d1f]">
        {label}
      </span>
      <div className="mt-2 rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3 text-sm text-[#6e6e73]">
        {value}
      </div>
    </div>
  )
}

type TextAreaFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <label className="block xl:col-span-3">
      <span className="text-sm font-medium text-[#1d1d1f]">
        {label}
      </span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007aff]"
      />
    </label>
  )
}

type SelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    label: string
    value: string
  }[]
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#1d1d1f]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007aff]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'active'
      ? 'bg-green-50 text-green-700'
      : status === 'carried_forward'
        ? 'bg-blue-50 text-blue-700'
        : status === 'expired' || status === 'closed'
          ? 'bg-red-50 text-red-700'
          : 'bg-orange-50 text-orange-700'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}>
      {status.replace('_', ' ')}
    </span>
  )
}