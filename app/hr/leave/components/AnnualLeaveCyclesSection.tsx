'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  WalletCards,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCcw,
  RotateCcw,
  Eye,
  UserRound,
  Building2,
  TimerReset,
  Sparkles,
  BadgeCheck,
  CircleGauge,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
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

export function AnnualLeaveCyclesSection() {
  const [cycles, setCycles] = useState<AnnualLeaveCycle[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [detailCycle, setDetailCycle] = useState<AnnualLeaveCycle | null>(null)

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

      if (cycleNumber <= 0) continue

      const cycle = getCycleFromJoinDate(joinDate, cycleNumber)

      if (!cycle) continue

      if (hasCycle(employee.employee_number, cycle.matured_at)) continue

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
    setDetailCycle(null)
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
    setDetailCycle(null)
    setSuccessMessage('')
    setErrorMessage('')
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

    return cycles.filter((cycle) => {
      const matchesKeyword =
        !keyword ||
        cycle.full_name?.toLowerCase().includes(keyword) ||
        cycle.employee_number?.toLowerCase().includes(keyword) ||
        cycle.department?.toLowerCase().includes(keyword) ||
        cycle.status?.toLowerCase().includes(keyword) ||
        cycle.cycle_start?.toLowerCase().includes(keyword) ||
        cycle.cycle_end?.toLowerCase().includes(keyword) ||
        cycle.matured_at?.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' || cycle.status === statusFilter

      return matchesKeyword && matchesStatus
    })
  }, [cycles, search, statusFilter])

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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Cycle"
          value={String(totalCycles)}
          description="Cycle cuti tersimpan"
          icon={<WalletCards size={20} />}
          tone="blue"
        />

        <SummaryCard
          title="Active"
          value={String(activeCycles)}
          description="Cycle aktif"
          icon={<CheckCircle2 size={20} />}
          tone="green"
        />

        <SummaryCard
          title="Carry Forward"
          value={String(carriedForward)}
          description="Postpone / carry forward"
          icon={<RotateCcw size={20} />}
          tone="orange"
        />

        <SummaryCard
          title="Total Sisa"
          value={String(totalRemaining)}
          description="Akumulasi sisa cuti"
          icon={<CalendarDays size={20} />}
          tone="purple"
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
        <CycleFormModal
          form={form}
          employees={employees}
          saving={saving}
          editingCycleId={editingCycleId}
          onClose={resetForm}
          onSubmit={handleSubmit}
          onEmployeeSelect={handleEmployeeSelect}
          onUpdateForm={updateForm}
          onBalanceChange={handleBalanceChange}
          onCarryForwardChange={handleCarryForwardChange}
          onSetCarryForwardSixMonths={setCarryForwardSixMonths}
        />
      )}

      {detailCycle && (
        <CycleDetailModal
          cycle={detailCycle}
          onClose={() => setDetailCycle(null)}
          onEdit={() => handleEdit(detailCycle)}
        />
      )}

      <div className="harmony-card harmony-slide-up overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <WalletCards size={14} />
              Annual Leave Balance
            </div>

            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Annual Leave Cycle
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Tabel dibuat ringkas. Detail lengkap bisa dibuka melalui tombol Detail.
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
              onClick={handleGenerateCurrentCycles}
              disabled={generating}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#1d1d1f] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CalendarDays size={18} />
              {generating ? 'Generating...' : 'Generate Cycle'}
            </button>

            <button
              type="button"
              onClick={handleAddNew}
              className="harmony-button-primary"
            >
              <Plus size={18} />
              Tambah Manual
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_220px]">
          <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
            <Search size={18} className="text-[#6e6e73]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIK, status, periode..."
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
            <option value="upcoming">Upcoming</option>
            <option value="expired">Expired</option>
            <option value="carried_forward">Carried Forward</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {loading && (
          <div className="p-6 text-sm text-[#6e6e73]">
            Loading data cycle cuti...
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                  <th className="w-[25%] px-5 py-4 font-semibold">Employee</th>
                  <th className="w-[18%] px-5 py-4 font-semibold">Cycle</th>
                  <th className="w-[12%] px-5 py-4 font-semibold">Matured</th>
                  <th className="w-[10%] px-5 py-4 font-semibold">Ent.</th>
                  <th className="w-[10%] px-5 py-4 font-semibold">Used</th>
                  <th className="w-[10%] px-5 py-4 font-semibold">Sisa</th>
                  <th className="w-[10%] px-5 py-4 font-semibold">CF</th>
                  <th className="w-[10%] px-5 py-4 font-semibold">Status</th>
                  <th className="w-[5%] px-5 py-4 text-center font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCycles.map((cycle) => (
                  <tr
                    key={cycle.id}
                    className="border-b border-black/5 transition hover:bg-white/55"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">
                          {getInitials(cycle.full_name || '-')}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[#1d1d1f]">
                            {cycle.full_name || '-'}
                          </div>
                          <div className="mt-1 truncate text-xs text-[#6e6e73]">
                            {cycle.employee_number || '-'} · {cycle.department || '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-xs leading-5 text-[#1d1d1f]">
                      <div className="font-semibold">
                        {formatDisplayDate(cycle.cycle_start)}
                      </div>
                      <div className="text-[#6e6e73]">
                        s.d. {formatDisplayDate(cycle.cycle_end)}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-[#1d1d1f]">
                      {formatDisplayDate(cycle.matured_at)}
                    </td>

                    <td className="px-5 py-3.5">
                      <CountBadge
                        value={Number(cycle.entitlement_days || 0)}
                        tone="blue"
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <CountBadge
                        value={Number(cycle.used_days || 0)}
                        tone="orange"
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <CountBadge
                        value={Number(cycle.remaining_days || 0)}
                        tone="green"
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <CountBadge
                        value={Number(cycle.carry_forward_remaining_days || 0)}
                        tone="purple"
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <StatusBadge status={cycle.status || 'active'} />
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <ActionButton
                          title="Detail"
                          icon={<Eye size={15} />}
                          tone="blue"
                          onClick={() => setDetailCycle(cycle)}
                        />

                        <ActionButton
                          title="Edit"
                          icon={<Pencil size={15} />}
                          tone="neutral"
                          onClick={() => handleEdit(cycle)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCycles.length === 0 && (
              <EmptyState
                title="Data cycle cuti tidak ditemukan"
                description="Coba ubah filter pencarian atau generate cycle cuti terbaru."
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CycleFormModal({
  form,
  employees,
  saving,
  editingCycleId,
  onClose,
  onSubmit,
  onEmployeeSelect,
  onUpdateForm,
  onBalanceChange,
  onCarryForwardChange,
  onSetCarryForwardSixMonths,
}: {
  form: CycleForm
  employees: Employee[]
  saving: boolean
  editingCycleId: string | null
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onEmployeeSelect: (employeeNumber: string) => void
  onUpdateForm: (
    field: keyof CycleForm,
    value: string | number | boolean
  ) => void
  onBalanceChange: (
    field: 'entitlement_days' | 'used_days',
    value: number
  ) => void
  onCarryForwardChange: (
    field: 'carry_forward_days' | 'carry_forward_used_days',
    value: number
  ) => void
  onSetCarryForwardSixMonths: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="harmony-slide-up flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 bg-white/75 p-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Sparkles size={14} />
              Annual Leave Cycle
            </div>

            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {editingCycleId
                ? 'Edit Cycle Cuti'
                : 'Tambah Cycle Cuti Manual'}
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Data cycle, saldo cuti, dan carry forward dapat diedit dalam modal ini.
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

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto bg-white/35 p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <div className="space-y-5">
                <FormPanel
                  title="Data Employee"
                  description="Pilih karyawan untuk membuat atau mengedit cycle cuti tahunan."
                  icon={<UserRound size={18} />}
                  tone="blue"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="harmony-label">
                        Employee
                      </span>

                      <select
                        value={form.employee_number}
                        onChange={(event) =>
                          onEmployeeSelect(event.target.value)
                        }
                        className="harmony-select"
                        required
                      >
                        <option value="">Pilih employee</option>
                        {employees.map((employee) => (
                          <option
                            key={employee.id}
                            value={employee.employee_number}
                          >
                            {employee.full_name} · {employee.employee_number}
                          </option>
                        ))}
                      </select>
                    </label>

                    <ReadOnlyField
                      label="Nama"
                      value={form.full_name || '-'}
                    />

                    <ReadOnlyField
                      label="Departemen"
                      value={form.department || '-'}
                    />

                    <InputField
                      label="Join Date"
                      value={form.join_date}
                      onChange={(value) => onUpdateForm('join_date', value)}
                      placeholder="Contoh: 2024-01-02"
                    />
                  </div>
                </FormPanel>

                <FormPanel
                  title="Periode Cycle"
                  description="Cycle start, matured, dan cycle end mengikuti anniversary tanggal masuk kerja."
                  icon={<CalendarDays size={18} />}
                  tone="green"
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <InputField
                      label="Cycle Start"
                      type="date"
                      value={form.cycle_start}
                      onChange={(value) => onUpdateForm('cycle_start', value)}
                      required
                    />

                    <InputField
                      label="Matured At"
                      type="date"
                      value={form.matured_at}
                      onChange={(value) => onUpdateForm('matured_at', value)}
                      required
                    />

                    <InputField
                      label="Cycle End"
                      type="date"
                      value={form.cycle_end}
                      onChange={(value) => onUpdateForm('cycle_end', value)}
                      required
                    />
                  </div>
                </FormPanel>

                <FormPanel
                  title="Status & Notes"
                  description="Tentukan status cycle dan catatan HR jika ada koreksi manual."
                  icon={<BadgeCheck size={18} />}
                  tone="neutral"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => onUpdateForm('status', value)}
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
                      onChange={(value) =>
                        onUpdateForm('is_active', value === 'active')
                      }
                      options={[
                        { label: 'Active', value: 'active' },
                        { label: 'Inactive', value: 'inactive' },
                      ]}
                    />

                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Notes"
                        value={form.notes}
                        onChange={(value) => onUpdateForm('notes', value)}
                        placeholder="Catatan HR"
                      />
                    </div>
                  </div>
                </FormPanel>
              </div>

              <div className="space-y-5">
                <FormPanel
                  title="Saldo Cuti"
                  description="Remaining otomatis dihitung dari entitlement dikurangi used."
                  icon={<CircleGauge size={18} />}
                  tone="orange"
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <InputField
                      label="Entitlement"
                      type="number"
                      value={String(form.entitlement_days)}
                      onChange={(value) =>
                        onBalanceChange('entitlement_days', Number(value))
                      }
                    />

                    <InputField
                      label="Used"
                      type="number"
                      value={String(form.used_days)}
                      onChange={(value) =>
                        onBalanceChange('used_days', Number(value))
                      }
                    />

                    <ReadOnlyField
                      label="Remaining"
                      value={String(form.remaining_days)}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <CompactMetric
                      label="Entitlement"
                      value={form.entitlement_days}
                      tone="blue"
                    />

                    <CompactMetric
                      label="Used"
                      value={form.used_days}
                      tone="orange"
                    />

                    <CompactMetric
                      label="Remaining"
                      value={form.remaining_days}
                      tone="green"
                    />
                  </div>
                </FormPanel>

                <FormPanel
                  title="Carry Forward"
                  description="Sisa cuti dapat menjadi carry forward dan berlaku maksimal 6 bulan."
                  icon={<RotateCcw size={18} />}
                  tone="purple"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="CF Days"
                      type="number"
                      value={String(form.carry_forward_days)}
                      onChange={(value) =>
                        onCarryForwardChange(
                          'carry_forward_days',
                          Number(value)
                        )
                      }
                    />

                    <InputField
                      label="CF Used"
                      type="number"
                      value={String(form.carry_forward_used_days)}
                      onChange={(value) =>
                        onCarryForwardChange(
                          'carry_forward_used_days',
                          Number(value)
                        )
                      }
                    />

                    <ReadOnlyField
                      label="CF Remaining"
                      value={String(form.carry_forward_remaining_days)}
                    />

                    <InputField
                      label="CF Expired"
                      type="date"
                      value={form.carry_forward_expired_at}
                      onChange={(value) =>
                        onUpdateForm('carry_forward_expired_at', value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={onSetCarryForwardSixMonths}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-black/5 bg-white px-5 text-sm font-bold text-[#1d1d1f] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
                  >
                    <TimerReset size={18} />
                    Set Carry Forward 6 Bulan
                  </button>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <CompactMetric
                      label="CF Days"
                      value={form.carry_forward_days}
                      tone="purple"
                    />

                    <CompactMetric
                      label="CF Used"
                      value={form.carry_forward_used_days}
                      tone="orange"
                    />

                    <CompactMetric
                      label="CF Left"
                      value={form.carry_forward_remaining_days}
                      tone="green"
                    />
                  </div>
                </FormPanel>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-black/5 bg-white/80 p-5 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
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
                : editingCycleId
                  ? 'Update Data'
                  : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormPanel({
  title,
  description,
  icon,
  tone,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'neutral'
  children: React.ReactNode
}) {
  const toneClass = {
    blue: 'bg-[#e8f2ff] text-[#007aff]',
    green: 'bg-[#eaf8ee] text-[#168034]',
    orange: 'bg-[#fff4e5] text-[#b35b00]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
    neutral: 'bg-[#f5f5f7] text-[#1d1d1f]',
  }[tone]

  return (
    <div className="rounded-[28px] border border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-5 flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${toneClass}`}>
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

      {children}
    </div>
  )
}

function CompactMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const className = {
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${className}`}>
        {value}
      </p>
    </div>
  )
}

function CycleDetailModal({
  cycle,
  onClose,
  onEdit,
}: {
  cycle: AnnualLeaveCycle
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 bg-white/70 p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Eye size={14} />
              Detail Cycle
            </div>

            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {cycle.full_name || '-'}
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              {cycle.employee_number || '-'} · {cycle.department || '-'}
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

        <div className="max-h-[62vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard
              label="Employee"
              value={cycle.full_name || '-'}
              subValue={`${cycle.employee_number || '-'} · ${cycle.department || '-'}`}
              icon={<UserRound size={18} />}
            />

            <DetailCard
              label="Join Date"
              value={cycle.join_date || '-'}
              subValue="Tanggal masuk kerja"
              icon={<Building2 size={18} />}
            />

            <DetailCard
              label="Status"
              value={formatStatusText(cycle.status || 'active')}
              subValue={cycle.is_active === false ? 'Inactive data' : 'Active data'}
              icon={<BadgeCheck size={18} />}
            />

            <DetailCard
              label="Cycle Start"
              value={formatDisplayDate(cycle.cycle_start)}
              subValue="Mulai periode cuti"
              icon={<CalendarDays size={18} />}
            />

            <DetailCard
              label="Matured At"
              value={formatDisplayDate(cycle.matured_at)}
              subValue="Tanggal hak cuti matang"
              icon={<CheckCircle2 size={18} />}
            />

            <DetailCard
              label="Cycle End"
              value={formatDisplayDate(cycle.cycle_end)}
              subValue="Akhir periode cuti"
              icon={<CalendarDays size={18} />}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <BalanceCard
              title="Entitlement"
              value={Number(cycle.entitlement_days || 0)}
              tone="blue"
            />

            <BalanceCard
              title="Used"
              value={Number(cycle.used_days || 0)}
              tone="orange"
            />

            <BalanceCard
              title="Remaining"
              value={Number(cycle.remaining_days || 0)}
              tone="green"
            />

            <BalanceCard
              title="Carry Forward"
              value={Number(cycle.carry_forward_remaining_days || 0)}
              tone="purple"
            />
          </div>

          <div className="mt-5 rounded-[26px] border border-black/5 bg-[#f5f5f7]/70 p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-[#1d1d1f]">
              <RotateCcw size={18} className="text-[#007aff]" />
              Carry Forward Detail
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MiniInfo
                label="CF Days"
                value={String(cycle.carry_forward_days || 0)}
              />

              <MiniInfo
                label="CF Used"
                value={String(cycle.carry_forward_used_days || 0)}
              />

              <MiniInfo
                label="CF Expired"
                value={formatDisplayDate(cycle.carry_forward_expired_at)}
              />
            </div>
          </div>

          <div className="mt-5 rounded-[26px] border border-black/5 bg-[#f5f5f7]/70 p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-[#1d1d1f]">
              <AlertTriangle size={18} className="text-[#b35b00]" />
              Notes
            </div>

            <p className="min-h-16 text-sm leading-6 text-[#6e6e73]">
              {cycle.notes || '-'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 bg-white/70 p-5 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="harmony-button-secondary"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="harmony-button-primary"
          >
            <Pencil size={18} />
            Edit Cycle
          </button>
        </div>
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
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
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

function DetailCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string
  value: string
  subValue: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-4 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className="mt-2 truncate font-semibold text-[#1d1d1f]">
        {value}
      </p>

      <p className="mt-1 truncate text-xs text-[#6e6e73]">
        {subValue}
      </p>
    </div>
  )
}

function BalanceCard({
  title,
  value,
  tone,
}: {
  title: string
  value: number
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const className = {
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {title}
      </p>

      <p className={`mt-3 inline-flex rounded-full px-4 py-2 text-lg font-bold ${className}`}>
        {value}
      </p>
    </div>
  )
}

function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-white/80 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className="mt-2 font-semibold text-[#1d1d1f]">
        {value}
      </p>
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

function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="block">
      <span className="harmony-label">
        {label}
      </span>

      <div className="mt-2 rounded-2xl border border-black/5 bg-[#f5f5f7]/90 px-4 py-3 text-sm font-medium text-[#6e6e73]">
        {value}
      </div>
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-textarea"
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

function CountBadge({
  value,
  tone,
}: {
  value: number
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const className = {
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <span className={`inline-flex min-w-10 justify-center rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {value}
    </span>
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
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}>
      {formatStatusText(status)}
    </span>
  )
}

function ActionButton({
  title,
  icon,
  tone,
  onClick,
}: {
  title: string
  icon: React.ReactNode
  tone: 'blue' | 'neutral'
  onClick: () => void
}) {
  const className = {
    blue: 'border border-black/5 bg-white text-[#007aff] hover:bg-[#f5f5f7]',
    neutral: 'border border-black/5 bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
  }[tone]

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {icon}
    </button>
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

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
        <WalletCards size={24} />
      </div>

      <h3 className="mt-4 font-semibold text-[#1d1d1f]">
        {title}
      </h3>

      <p className="mt-1 text-sm text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatStatusText(status: string) {
  if (status === 'active') return 'Active'
  if (status === 'upcoming') return 'Upcoming'
  if (status === 'expired') return 'Expired'
  if (status === 'carried_forward') return 'Carried Forward'
  if (status === 'closed') return 'Closed'

  return status.replace('_', ' ')
}

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)

  if (words.length === 0) return 'C'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}