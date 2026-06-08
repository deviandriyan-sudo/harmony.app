'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertTriangle,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCcw,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'
import type { AnnualLeaveCycle } from '@/types/annualLeaveCycle'
import type { LeavePostponeRequest } from '@/types/leavePostpone'

type PostponeForm = {
  employee_number: string
  full_name: string
  department: string

  source_cycle_id: string

  remaining_days: number
  requested_days: number

  request_date: string
  old_cycle_end: string
  new_expired_at: string

  reason: string

  approval_status: string

  supervisor_1: string
  supervisor_1_status: string
  supervisor_1_notes: string

  supervisor_2: string
  supervisor_2_status: string
  supervisor_2_notes: string

  hr_status: string
  hr_notes: string

  is_active: boolean
}

const initialForm: PostponeForm = {
  employee_number: '',
  full_name: '',
  department: '',

  source_cycle_id: '',

  remaining_days: 0,
  requested_days: 0,

  request_date: '',
  old_cycle_end: '',
  new_expired_at: '',

  reason: '',

  approval_status: 'pending',

  supervisor_1: '',
  supervisor_1_status: 'pending',
  supervisor_1_notes: '',

  supervisor_2: '',
  supervisor_2_status: 'pending',
  supervisor_2_notes: '',

  hr_status: 'pending',
  hr_notes: '',

  is_active: true,
}

export default function HRLeavePostponePage() {
  const [postpones, setPostpones] = useState<LeavePostponeRequest[]>([])
  const [cycles, setCycles] = useState<AnnualLeaveCycle[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingPostponeId, setEditingPostponeId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<PostponeForm>(initialForm)

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    const { data: postponeData, error: postponeError } = await supabase
      .from('leave_postpone_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (postponeError) {
      setErrorMessage(postponeError.message)
      setPostpones([])
      setLoading(false)
      return
    }

    const { data: cycleData, error: cycleError } = await supabase
      .from('annual_leave_cycles')
      .select('*')
      .eq('is_active', true)
      .gt('remaining_days', 0)
      .order('cycle_end', { ascending: true })

    if (cycleError) {
      setErrorMessage(cycleError.message)
      setCycles([])
      setLoading(false)
      return
    }

    setPostpones(postponeData || [])
    setCycles(cycleData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function updateForm(
    field: keyof PostponeForm,
    value: string | number | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingPostponeId(null)
    setShowForm(false)
    setErrorMessage('')
  }

  function handleAddNew() {
    setForm({
      ...initialForm,
      request_date: getTodayISO(),
    })
    setEditingPostponeId(null)
    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  function getTodayISO() {
    const today = new Date()
    return formatDateToISO(today)
  }

  function formatDateToISO(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function addMonths(dateString: string, months: number) {
    const date = new Date(`${dateString}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    date.setMonth(date.getMonth() + months)

    return formatDateToISO(date)
  }

  function diffDays(fromDate: string, toDate: string) {
    const from = new Date(`${fromDate}T00:00:00`)
    const to = new Date(`${toDate}T00:00:00`)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return null
    }

    const diff = to.getTime() - from.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  function isWithinPostponeWindow(requestDate: string, cycleEnd: string) {
    const daysLeft = diffDays(requestDate, cycleEnd)

    if (daysLeft === null) return false

    return daysLeft >= 0 && daysLeft <= 7
  }

  function getNextMaturedDate(cycle: AnnualLeaveCycle) {
    const matured = new Date(`${cycle.matured_at}T00:00:00`)

    if (Number.isNaN(matured.getTime())) {
      return ''
    }

    matured.setFullYear(matured.getFullYear() + 1)

    return formatDateToISO(matured)
  }

  function handleCycleSelect(cycleId: string) {
    const cycle = cycles.find((item) => item.id === cycleId)

    if (!cycle) {
      updateForm('source_cycle_id', cycleId)
      return
    }

    const requestDate = form.request_date || getTodayISO()
    const nextMatured = getNextMaturedDate(cycle)
    const newExpiredAt = nextMatured ? addMonths(nextMatured, 6) : ''

    setForm((prev) => ({
      ...prev,
      source_cycle_id: cycle.id,
      employee_number: cycle.employee_number || '',
      full_name: cycle.full_name || '',
      department: cycle.department || '',
      remaining_days: Number(cycle.remaining_days || 0),
      requested_days: Number(cycle.remaining_days || 0),
      request_date: requestDate,
      old_cycle_end: cycle.cycle_end || '',
      new_expired_at: newExpiredAt,
    }))
  }

  function handleEdit(postpone: LeavePostponeRequest) {
    setEditingPostponeId(postpone.id)

    setForm({
      employee_number: postpone.employee_number || '',
      full_name: postpone.full_name || '',
      department: postpone.department || '',

      source_cycle_id: postpone.source_cycle_id || '',

      remaining_days: Number(postpone.remaining_days || 0),
      requested_days: Number(postpone.requested_days || 0),

      request_date: postpone.request_date || '',
      old_cycle_end: postpone.old_cycle_end || '',
      new_expired_at: postpone.new_expired_at || '',

      reason: postpone.reason || '',

      approval_status: postpone.approval_status || 'pending',

      supervisor_1: postpone.supervisor_1 || '',
      supervisor_1_status: postpone.supervisor_1_status || 'pending',
      supervisor_1_notes: postpone.supervisor_1_notes || '',

      supervisor_2: postpone.supervisor_2 || '',
      supervisor_2_status: postpone.supervisor_2_status || 'pending',
      supervisor_2_notes: postpone.supervisor_2_notes || '',

      hr_status: postpone.hr_status || 'pending',
      hr_notes: postpone.hr_notes || '',

      is_active: postpone.is_active ?? true,
    })

    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function applyCarryForwardToCycle(postpone: LeavePostponeRequest) {
    if (!postpone.source_cycle_id) {
      return {
        error: 'Source cycle tidak ditemukan.',
      }
    }

    const { error } = await supabase
      .from('annual_leave_cycles')
      .update({
        carry_forward_days: Number(postpone.requested_days || 0),
        carry_forward_used_days: 0,
        carry_forward_remaining_days: Number(postpone.requested_days || 0),
        carry_forward_expired_at: postpone.new_expired_at,
        status: 'carried_forward',
        notes: 'Carry forward approved melalui postpone request.',
        edited_by: 'HR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postpone.source_cycle_id)

    if (error) {
      return {
        error: error.message,
      }
    }

    return {
      error: null,
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.employee_number || !form.source_cycle_id) {
      setErrorMessage('Cycle cuti wajib dipilih.')
      setSaving(false)
      return
    }

    if (!form.request_date || !form.old_cycle_end) {
      setErrorMessage('Request date dan old cycle end wajib diisi.')
      setSaving(false)
      return
    }

    if (form.requested_days <= 0) {
      setErrorMessage('Requested days harus lebih dari 0.')
      setSaving(false)
      return
    }

    if (form.requested_days > form.remaining_days) {
      setErrorMessage('Requested days tidak boleh lebih besar dari remaining days.')
      setSaving(false)
      return
    }

    const isValidWindow = isWithinPostponeWindow(
      form.request_date,
      form.old_cycle_end
    )

    if (!isValidWindow) {
      setErrorMessage(
        'Pengajuan postpone hanya bisa dilakukan dalam 7 hari kalender sebelum cycle berakhir.'
      )
      setSaving(false)
      return
    }

    const payload = {
      employee_number: form.employee_number,
      full_name: form.full_name || null,
      department: form.department || null,

      source_cycle_id: form.source_cycle_id,

      remaining_days: form.remaining_days,
      requested_days: form.requested_days,

      request_date: form.request_date,
      old_cycle_end: form.old_cycle_end,
      new_expired_at: form.new_expired_at,

      reason: form.reason || null,

      approval_status: form.approval_status,

      supervisor_1: form.supervisor_1 || null,
      supervisor_1_status: form.supervisor_1_status,
      supervisor_1_notes: form.supervisor_1_notes || null,

      supervisor_2: form.supervisor_2 || null,
      supervisor_2_status: form.supervisor_2_status,
      supervisor_2_notes: form.supervisor_2_notes || null,

      hr_status: form.hr_status,
      hr_notes: form.hr_notes || null,

      is_active: form.is_active,
      edited_by: 'HR',
      updated_at: new Date().toISOString(),
    }

    if (editingPostponeId) {
      const { error } = await supabase
        .from('leave_postpone_requests')
        .update(payload)
        .eq('id', editingPostponeId)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Pengajuan postpone berhasil diperbarui.')
    } else {
      const { error } = await supabase
        .from('leave_postpone_requests')
        .insert(payload)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Pengajuan postpone berhasil ditambahkan.')
    }

    setForm(initialForm)
    setEditingPostponeId(null)
    setShowForm(false)
    setSaving(false)

    await fetchData()
  }

  async function handleApprove(postpone: LeavePostponeRequest) {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (postpone.approval_status === 'approved') {
      setErrorMessage('Pengajuan postpone ini sudah approved.')
      setSaving(false)
      return
    }

    if (!postpone.request_date || !postpone.old_cycle_end) {
      setErrorMessage('Request date / old cycle end tidak valid.')
      setSaving(false)
      return
    }

    const isValidWindow = isWithinPostponeWindow(
      postpone.request_date,
      postpone.old_cycle_end
    )

    if (!isValidWindow) {
      setErrorMessage(
        'Pengajuan postpone berada di luar window 7 hari kalender sebelum cycle berakhir.'
      )
      setSaving(false)
      return
    }

    const applyResult = await applyCarryForwardToCycle(postpone)

    if (applyResult.error) {
      setErrorMessage(applyResult.error)
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('leave_postpone_requests')
      .update({
        approval_status: 'approved',
        supervisor_1_status: postpone.supervisor_1 ? 'approved' : 'skipped',
        supervisor_2_status: postpone.supervisor_2 ? 'approved' : 'skipped',
        hr_status: 'approved',
        hr_notes: postpone.hr_notes || 'Postpone approved by HR.',
        edited_by: 'HR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postpone.id)

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    setSuccessMessage('Postpone cuti berhasil approved. Sisa cuti lama sudah menjadi carry forward.')
    setSaving(false)

    await fetchData()
  }

  async function handleReject(postpone: LeavePostponeRequest) {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (postpone.approval_status === 'approved') {
      setErrorMessage('Postpone approved tidak bisa langsung reject. Gunakan Cancel jika ingin membatalkan.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('leave_postpone_requests')
      .update({
        approval_status: 'rejected',
        hr_status: 'rejected',
        hr_notes: postpone.hr_notes || 'Postpone rejected by HR.',
        edited_by: 'HR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postpone.id)

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    setSuccessMessage('Postpone cuti berhasil rejected.')
    setSaving(false)

    await fetchData()
  }

  async function handleCancel(postpone: LeavePostponeRequest) {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase
      .from('leave_postpone_requests')
      .update({
        approval_status: 'cancelled',
        hr_status: 'cancelled',
        is_active: false,
        hr_notes: postpone.hr_notes || 'Postpone cancelled by HR.',
        edited_by: 'HR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postpone.id)

    if (error) {
      setErrorMessage(error.message)
      setSaving(false)
      return
    }

    if (postpone.source_cycle_id && postpone.approval_status === 'approved') {
      await supabase
        .from('annual_leave_cycles')
        .update({
          carry_forward_days: 0,
          carry_forward_used_days: 0,
          carry_forward_remaining_days: 0,
          carry_forward_expired_at: null,
          status: 'active',
          notes: 'Carry forward cancelled by HR.',
          edited_by: 'HR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postpone.source_cycle_id)
    }

    setSuccessMessage('Postpone cuti berhasil cancelled.')
    setSaving(false)

    await fetchData()
  }

  const filteredPostpones = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    if (!keyword) return postpones

    return postpones.filter((item) => {
      return (
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.approval_status?.toLowerCase().includes(keyword) ||
        item.old_cycle_end?.toLowerCase().includes(keyword) ||
        item.new_expired_at?.toLowerCase().includes(keyword)
      )
    })
  }, [postpones, search])

  const total = postpones.length
  const pending = postpones.filter((item) => item.approval_status === 'pending').length
  const approved = postpones.filter((item) => item.approval_status === 'approved').length
  const rejected = postpones.filter((item) => item.approval_status === 'rejected').length

  return (
    <>
      <Topbar
        title="Postpone Cuti"
        description="Kelola pengajuan carry forward sisa cuti tahunan berdasarkan window 7 hari kalender sebelum cycle berakhir."
      />

      <section className="space-y-6 p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Request"
            value={String(total)}
            description="Pengajuan postpone tersimpan"
            icon={<RotateCcw size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Pending"
            value={String(pending)}
            description="Menunggu approval"
            icon={<Clock3 size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Approved"
            value={String(approved)}
            description="Sudah carry forward"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Rejected"
            value={String(rejected)}
            description="Tidak disetujui"
            icon={<XCircle size={22} />}
            tone="orange"
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
                    {editingPostponeId
                      ? 'Edit Postpone Cuti'
                      : 'Tambah Postpone Cuti'}
                  </h2>
                  <p className="mt-1 text-sm text-[#6e6e73]">
                    Pengajuan hanya valid dalam 7 hari kalender sebelum cycle cuti berakhir.
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
                <label className="block xl:col-span-2">
                  <span className="text-sm font-medium text-[#1d1d1f]">
                    Source Cycle
                  </span>
                  <select
                    value={form.source_cycle_id}
                    onChange={(event) => handleCycleSelect(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#007aff]"
                    required
                  >
                    <option value="">Pilih cycle cuti yang ingin di-postpone</option>
                    {cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.full_name} - Sisa {cycle.remaining_days} hari - End {cycle.cycle_end}
                      </option>
                    ))}
                  </select>
                </label>

                <InputField
                  label="Request Date"
                  type="date"
                  value={form.request_date}
                  onChange={(value) => updateForm('request_date', value)}
                  required
                />

                <ReadOnlyField label="Employee" value={`${form.full_name || '-'} · ${form.employee_number || '-'}`} />

                <ReadOnlyField label="Departemen" value={form.department || '-'} />

                <ReadOnlyField label="Old Cycle End" value={form.old_cycle_end || '-'} />

                <InputField
                  label="Remaining Days"
                  type="number"
                  value={String(form.remaining_days)}
                  onChange={(value) => updateForm('remaining_days', Number(value))}
                />

                <InputField
                  label="Requested Days"
                  type="number"
                  value={String(form.requested_days)}
                  onChange={(value) => updateForm('requested_days', Number(value))}
                />

                <InputField
                  label="New Expired At"
                  type="date"
                  value={form.new_expired_at}
                  onChange={(value) => updateForm('new_expired_at', value)}
                />

                <SelectField
                  label="Approval Status"
                  value={form.approval_status}
                  onChange={(value) => updateForm('approval_status', value)}
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                    { label: 'Cancelled', value: 'cancelled' },
                  ]}
                />

                <InputField
                  label="Atasan 1"
                  value={form.supervisor_1}
                  onChange={(value) => updateForm('supervisor_1', value)}
                />

                <SelectField
                  label="Status Atasan 1"
                  value={form.supervisor_1_status}
                  onChange={(value) => updateForm('supervisor_1_status', value)}
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                    { label: 'Skipped', value: 'skipped' },
                  ]}
                />

                <InputField
                  label="Atasan 2"
                  value={form.supervisor_2}
                  onChange={(value) => updateForm('supervisor_2', value)}
                />

                <SelectField
                  label="Status Atasan 2"
                  value={form.supervisor_2_status}
                  onChange={(value) => updateForm('supervisor_2_status', value)}
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                    { label: 'Skipped', value: 'skipped' },
                  ]}
                />

                <SelectField
                  label="HR Status"
                  value={form.hr_status}
                  onChange={(value) => updateForm('hr_status', value)}
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                    { label: 'Cancelled', value: 'cancelled' },
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

                <TextAreaField
                  label="Reason"
                  value={form.reason}
                  onChange={(value) => updateForm('reason', value)}
                  placeholder="Alasan postpone/carry forward"
                />

                <TextAreaField
                  label="Catatan Atasan 1"
                  value={form.supervisor_1_notes}
                  onChange={(value) => updateForm('supervisor_1_notes', value)}
                />

                <TextAreaField
                  label="Catatan Atasan 2"
                  value={form.supervisor_2_notes}
                  onChange={(value) => updateForm('supervisor_2_notes', value)}
                />

                <TextAreaField
                  label="Catatan HR"
                  value={form.hr_notes}
                  onChange={(value) => updateForm('hr_notes', value)}
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
                    : editingPostponeId
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
                Master Postpone Cuti
              </h2>
              <p className="mt-1 text-sm text-[#6e6e73]">
                Semua pengajuan postpone dapat diedit oleh HR, dengan validasi window 7 hari kalender.
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
                onClick={handleAddNew}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0067d8]"
              >
                <Plus size={18} />
                Tambah Postpone
              </button>
            </div>
          </div>

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Loading data postpone cuti...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5ea] bg-[#f5f5f7] text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="px-6 py-4 font-semibold">Employee</th>
                    <th className="px-6 py-4 font-semibold">Request Date</th>
                    <th className="px-6 py-4 font-semibold">Old Cycle End</th>
                    <th className="px-6 py-4 font-semibold">Remaining</th>
                    <th className="px-6 py-4 font-semibold">Requested</th>
                    <th className="px-6 py-4 font-semibold">New Expired</th>
                    <th className="px-6 py-4 font-semibold">Atasan 1</th>
                    <th className="px-6 py-4 font-semibold">Atasan 2</th>
                    <th className="px-6 py-4 font-semibold">HR</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPostpones.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#f0f0f2] transition hover:bg-[#f9f9fb]"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#1d1d1f]">
                          {item.full_name || '-'}
                        </div>
                        <div className="mt-1 text-xs text-[#6e6e73]">
                          {item.employee_number || '-'} · {item.department || '-'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {item.request_date || '-'}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {item.old_cycle_end || '-'}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {item.remaining_days || 0}
                      </td>

                      <td className="px-6 py-4 font-semibold text-[#1d1d1f]">
                        {item.requested_days || 0}
                      </td>

                      <td className="px-6 py-4 text-[#1d1d1f]">
                        {item.new_expired_at || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-[#1d1d1f]">
                          {item.supervisor_1 || '-'}
                        </div>
                        <StatusBadge status={item.supervisor_1_status || 'pending'} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-[#1d1d1f]">
                          {item.supervisor_2 || '-'}
                        </div>
                        <StatusBadge status={item.supervisor_2_status || 'pending'} />
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={item.hr_status || 'pending'} />
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={item.approval_status || 'pending'} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={saving || item.approval_status === 'approved'}
                            className="flex items-center gap-1 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>

                          <button
                            onClick={() => handleReject(item)}
                            disabled={saving || item.approval_status === 'approved'}
                            className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>

                          <button
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-1 rounded-xl border border-[#e5e5ea] bg-white px-3 py-2 text-xs font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            onClick={() => handleCancel(item)}
                            disabled={saving || item.approval_status === 'cancelled'}
                            className="flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <AlertTriangle size={14} />
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPostpones.length === 0 && (
                <div className="p-6 text-center text-sm text-[#6e6e73]">
                  Data postpone cuti tidak ditemukan.
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
    status === 'approved'
      ? 'bg-green-50 text-green-700'
      : status === 'rejected' || status === 'cancelled'
        ? 'bg-red-50 text-red-700'
        : status === 'skipped'
          ? 'bg-[#f5f5f7] text-[#6e6e73]'
          : 'bg-orange-50 text-orange-700'

  return (
    <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}>
      {status.replace('_', ' ')}
    </span>
  )
}