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
  ShieldAlert,
  Eye,
  Trash2,
  CalendarDays,
  UserRound,
  Building2,
  WalletCards,
  MessageSquareText,
  ShieldCheck,
  TimerReset,
  Sparkles,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
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
  deadline_date: string
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

type EligibilityResult = {
  isEligible: boolean
  status:
    | 'eligible'
    | 'expired'
    | 'deadline_passed'
    | 'no_balance'
    | 'invalid_date'
  message: string
  deadlineDate: string
}

type CycleEligibilityItem = {
  cycle: AnnualLeaveCycle
  eligibility: EligibilityResult
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
  deadline_date: '',
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

const approvalOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
]

export function LeavePostponeSection() {
  const [postpones, setPostpones] = useState<LeavePostponeRequest[]>([])
  const [cycles, setCycles] = useState<AnnualLeaveCycle[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingPostponeId, setEditingPostponeId] = useState<string | null>(null)
  const [detailPostpone, setDetailPostpone] =
    useState<LeavePostponeRequest | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [warningMessage, setWarningMessage] = useState('')

  const [form, setForm] = useState<PostponeForm>(initialForm)

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')
    setWarningMessage('')

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
    setWarningMessage('')
  }

  function handleAddNew() {
    setForm({
      ...initialForm,
      request_date: getTodayISO(),
    })

    setEditingPostponeId(null)
    setShowForm(true)
    setDetailPostpone(null)
    setSuccessMessage('')
    setErrorMessage('')
    setWarningMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
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

  function parseISODate(dateString: string | null | undefined) {
    if (!dateString) return null

    const date = new Date(`${dateString}T00:00:00`)

    if (Number.isNaN(date.getTime())) return null

    return date
  }

  function addMonths(dateString: string, months: number) {
    const date = parseISODate(dateString)

    if (!date) return ''

    date.setMonth(date.getMonth() + months)

    return formatDateToISO(date)
  }

  function addYears(dateString: string, years: number) {
    const date = parseISODate(dateString)

    if (!date) return ''

    date.setFullYear(date.getFullYear() + years)

    return formatDateToISO(date)
  }

  function subtractDays(dateString: string, days: number) {
    const date = parseISODate(dateString)

    if (!date) return ''

    date.setDate(date.getDate() - days)

    return formatDateToISO(date)
  }

  function diffDays(fromDate: string, toDate: string) {
    const from = parseISODate(fromDate)
    const to = parseISODate(toDate)

    if (!from || !to) return null

    const diff = to.getTime() - from.getTime()

    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  function getDeadlineDate(cycleEnd: string | null | undefined) {
    if (!cycleEnd) return ''
    return subtractDays(cycleEnd, 7)
  }

  function getNextMaturedDate(cycle: AnnualLeaveCycle) {
    if (!cycle.matured_at) return ''

    return addYears(cycle.matured_at, 1)
  }

  function getCycleEligibility(
    cycle: AnnualLeaveCycle,
    requestDate = getTodayISO()
  ): EligibilityResult {
    const remainingDays = Number(cycle.remaining_days || 0)

    if (remainingDays <= 0) {
      return {
        isEligible: false,
        status: 'no_balance',
        message: 'Tidak bisa diajukan karena tidak ada sisa cuti.',
        deadlineDate: '',
      }
    }

    if (!cycle.cycle_end) {
      return {
        isEligible: false,
        status: 'invalid_date',
        message: 'Tidak bisa diajukan karena cycle end tidak valid.',
        deadlineDate: '',
      }
    }

    const cycleEnd = parseISODate(cycle.cycle_end)
    const request = parseISODate(requestDate)

    if (!cycleEnd || !request) {
      return {
        isEligible: false,
        status: 'invalid_date',
        message: 'Tidak bisa diajukan karena format tanggal tidak valid.',
        deadlineDate: '',
      }
    }

    const deadlineDate = getDeadlineDate(cycle.cycle_end)
    const daysToCycleEnd = diffDays(requestDate, cycle.cycle_end)
    const daysToDeadline = diffDays(requestDate, deadlineDate)

    if (daysToCycleEnd !== null && daysToCycleEnd < 0) {
      return {
        isEligible: false,
        status: 'expired',
        message: `Tidak bisa diajukan karena masa cuti sudah expired pada ${formatDisplayDate(cycle.cycle_end)}.`,
        deadlineDate,
      }
    }

    if (daysToDeadline !== null && daysToDeadline < 0) {
      return {
        isEligible: false,
        status: 'deadline_passed',
        message: `Tidak bisa diajukan karena sudah melewati batas pengajuan. Batas terakhir postpone adalah ${formatDisplayDate(deadlineDate)} atau H-7 sebelum cycle berakhir.`,
        deadlineDate,
      }
    }

    return {
      isEligible: true,
      status: 'eligible',
      message: `Masih bisa diajukan. Batas terakhir pengajuan postpone adalah ${formatDisplayDate(deadlineDate)}.`,
      deadlineDate,
    }
  }

  function validateFormEligibility() {
    const selectedCycle = cycles.find((item) => item.id === form.source_cycle_id)

    if (!selectedCycle) {
      return {
        isEligible: false,
        message: 'Cycle cuti wajib dipilih.',
      }
    }

    const eligibility = getCycleEligibility(
      selectedCycle,
      form.request_date || getTodayISO()
    )

    return {
      isEligible: eligibility.isEligible,
      message: eligibility.message,
    }
  }

  function handleCycleSelect(cycleId: string) {
    const cycle = cycles.find((item) => item.id === cycleId)

    setErrorMessage('')
    setWarningMessage('')

    if (!cycle) {
      updateForm('source_cycle_id', cycleId)
      return
    }

    const requestDate = form.request_date || getTodayISO()
    const eligibility = getCycleEligibility(cycle, requestDate)

    if (!eligibility.isEligible) {
      setForm({
        ...initialForm,
        request_date: requestDate,
      })

      setWarningMessage(eligibility.message)
      return
    }

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
      deadline_date: eligibility.deadlineDate,
      new_expired_at: newExpiredAt,
    }))

    setWarningMessage(eligibility.message)
  }

  function handleRequestDateChange(value: string) {
    setForm((prev) => ({
      ...prev,
      request_date: value,
    }))

    if (!form.source_cycle_id) return

    const cycle = cycles.find((item) => item.id === form.source_cycle_id)

    if (!cycle) return

    const eligibility = getCycleEligibility(cycle, value)

    setWarningMessage(eligibility.message)
  }

  function handleEdit(postpone: LeavePostponeRequest) {
    setEditingPostponeId(postpone.id)

    const deadlineDate = postpone.old_cycle_end
      ? getDeadlineDate(postpone.old_cycle_end)
      : ''

    setForm({
      employee_number: postpone.employee_number || '',
      full_name: postpone.full_name || '',
      department: postpone.department || '',

      source_cycle_id: postpone.source_cycle_id || '',

      remaining_days: Number(postpone.remaining_days || 0),
      requested_days: Number(postpone.requested_days || 0),

      request_date: postpone.request_date || '',
      old_cycle_end: postpone.old_cycle_end || '',
      deadline_date: deadlineDate,
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
    setDetailPostpone(null)
    setSuccessMessage('')
    setErrorMessage('')
    setWarningMessage('')

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

  async function removeCarryForwardFromCycle(postpone: LeavePostponeRequest) {
    if (!postpone.source_cycle_id) {
      return {
        error: null,
      }
    }

    const { error } = await supabase
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

    const eligibility = validateFormEligibility()

    if (!eligibility.isEligible) {
      setErrorMessage(eligibility.message)
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

    const cycle = cycles.find((item) => item.id === postpone.source_cycle_id)

    if (!cycle) {
      setErrorMessage('Source cycle tidak ditemukan.')
      setSaving(false)
      return
    }

    const eligibility = getCycleEligibility(
      cycle,
      postpone.request_date || getTodayISO()
    )

    if (!eligibility.isEligible) {
      setErrorMessage(eligibility.message)
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
    setDetailPostpone(null)

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
    setDetailPostpone(null)

    await fetchData()
  }

  async function handleCancel(postpone: LeavePostponeRequest) {
    const confirmed = window.confirm(
      `Cancel postpone ${postpone.full_name || '-'}? Jika sudah approved, carry forward pada cycle juga akan dikembalikan.`
    )

    if (!confirmed) return

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

    if (postpone.approval_status === 'approved') {
      const removeResult = await removeCarryForwardFromCycle(postpone)

      if (removeResult.error) {
        setErrorMessage(removeResult.error)
        setSaving(false)
        return
      }
    }

    setSuccessMessage('Postpone cuti berhasil cancelled.')
    setSaving(false)
    setDetailPostpone(null)

    await fetchData()
  }

  const cyclesWithEligibility = useMemo<CycleEligibilityItem[]>(() => {
    const today = getTodayISO()

    return cycles.map((cycle) => {
      const eligibility = getCycleEligibility(cycle, today)

      return {
        cycle,
        eligibility,
      }
    })
  }, [cycles])

  const eligibleCycles = cyclesWithEligibility.filter(
    (item) => item.eligibility.isEligible
  )

  const blockedCycles = cyclesWithEligibility.filter(
    (item) => !item.eligibility.isEligible
  )

  const filteredPostpones = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return postpones.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.approval_status?.toLowerCase().includes(keyword) ||
        item.old_cycle_end?.toLowerCase().includes(keyword) ||
        item.new_expired_at?.toLowerCase().includes(keyword) ||
        item.reason?.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' || item.approval_status === statusFilter

      return matchesKeyword && matchesStatus
    })
  }, [postpones, search, statusFilter])

  const total = postpones.length

  const pending = postpones.filter(
    (item) => item.approval_status === 'pending'
  ).length

  const approved = postpones.filter(
    (item) => item.approval_status === 'approved'
  ).length

  const rejected = postpones.filter(
    (item) => item.approval_status === 'rejected'
  ).length

  const cancelled = postpones.filter(
    (item) => item.approval_status === 'cancelled'
  ).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Postpone"
          value={String(total)}
          description="Seluruh pengajuan"
          icon={<RotateCcw size={20} />}
          tone="blue"
        />

        <SummaryCard
          title="Pending"
          value={String(pending)}
          description="Menunggu approval"
          icon={<Clock3 size={20} />}
          tone="orange"
        />

        <SummaryCard
          title="Approved"
          value={String(approved)}
          description="Sudah carry forward"
          icon={<CheckCircle2 size={20} />}
          tone="green"
        />

        <SummaryCard
          title="Rejected"
          value={String(rejected)}
          description="Ditolak HR"
          icon={<XCircle size={20} />}
          tone="red"
        />

        <SummaryCard
          title="Cancelled"
          value={String(cancelled)}
          description="Dibatalkan"
          icon={<AlertTriangle size={20} />}
          tone="purple"
        />
      </div>

      {successMessage && (
        <AlertBox
          type="success"
          message={successMessage}
        />
      )}

      {warningMessage && (
        <AlertBox
          type="warning"
          message={warningMessage}
        />
      )}

      {errorMessage && (
        <AlertBox
          type="error"
          message={`Error: ${errorMessage}`}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7edfc] px-3 py-1.5 text-xs font-bold text-[#7b2cbf]">
                <Sparkles size={14} />
                Postpone Workflow
              </div>

              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Master Postpone Cuti
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                Tabel dibuat compact. Action utama dipindah ke modal detail agar tampilan lebih rapi dan simetris.
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
                onClick={handleAddNew}
                className="harmony-button-primary"
              >
                <Plus size={18} />
                Tambah
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_220px]">
            <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
              <Search size={18} className="text-[#6e6e73]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari employee, NIP, unit, status, reason..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Memuat data postpone cuti...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="w-[23%] px-5 py-4 font-semibold">Employee</th>
                    <th className="w-[12%] px-5 py-4 font-semibold">Request</th>
                    <th className="w-[14%] px-5 py-4 font-semibold">Cycle End</th>
                    <th className="w-[10%] px-5 py-4 font-semibold">Sisa</th>
                    <th className="w-[10%] px-5 py-4 font-semibold">Postpone</th>
                    <th className="w-[14%] px-5 py-4 font-semibold">Expired</th>
                    <th className="w-[10%] px-5 py-4 font-semibold">Status</th>
                    <th className="w-[7%] px-5 py-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPostpones.map((item) => {
                    const deadlineDate = getDeadlineDate(item.old_cycle_end)

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-black/5 transition hover:bg-white/55"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">
                              {getInitials(item.full_name || '-')}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#1d1d1f]">
                                {item.full_name || '-'}
                              </div>
                              <div className="mt-1 truncate text-xs text-[#6e6e73]">
                                {item.employee_number || '-'} · {item.department || '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#1d1d1f]">
                            {formatDisplayDate(item.request_date)}
                          </div>
                          <div className="mt-1 text-xs text-[#6e6e73]">
                            Deadline {formatDisplayDate(deadlineDate)}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#1d1d1f]">
                            {formatDisplayDate(item.old_cycle_end)}
                          </div>
                          <div className="mt-1 text-xs text-[#6e6e73]">
                            Cycle lama
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <CountBadge
                            value={Number(item.remaining_days || 0)}
                            tone="blue"
                          />
                        </td>

                        <td className="px-5 py-3.5">
                          <CountBadge
                            value={Number(item.requested_days || 0)}
                            tone="purple"
                          />
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#1d1d1f]">
                            {formatDisplayDate(item.new_expired_at)}
                          </div>
                          <div className="mt-1 text-xs text-[#6e6e73]">
                            Valid carry forward
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <StatusBadge status={item.approval_status || 'pending'} />
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <ActionButton
                              title="Detail"
                              icon={<Eye size={15} />}
                              tone="blue"
                              onClick={() => setDetailPostpone(item)}
                            />

                            <ActionButton
                              title="Edit"
                              icon={<Pencil size={15} />}
                              tone="neutral"
                              onClick={() => handleEdit(item)}
                            />

                            <ActionButton
                              title="Cancel"
                              icon={<Trash2 size={15} />}
                              tone="red"
                              onClick={() => handleCancel(item)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredPostpones.length === 0 && (
                <EmptyState
                  title="Data postpone cuti tidak ditemukan"
                  description="Coba ubah filter pencarian atau tambahkan pengajuan postpone baru."
                />
              )}
            </div>
          )}
        </div>

        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="border-b border-black/5 bg-white/55 p-5">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <ShieldAlert size={14} />
              Eligibility Monitor
            </div>

            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Cycle Eligibility
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              Sistem membaca cycle aktif dengan sisa cuti dan mengecek apakah masih bisa diajukan postpone.
            </p>
          </div>

          <div className="grid gap-3 p-5">
            <EligibilityCard
              title="Eligible"
              value={eligibleCycles.length}
              description="Cycle masih bisa diajukan"
              tone="green"
            />

            <EligibilityCard
              title="Blocked"
              value={blockedCycles.length}
              description="Cycle tidak memenuhi window"
              tone="red"
            />

            <EligibilityCard
              title="Total Cycle Dibaca"
              value={cyclesWithEligibility.length}
              description="Annual leave cycle aktif"
              tone="blue"
            />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="border-b border-black/5 bg-white/55 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7edfc] px-3 py-1.5 text-xs font-bold text-[#7b2cbf]">
                  <RotateCcw size={14} />
                  Postpone Form
                </div>

                <h2 className="text-lg font-semibold text-[#1d1d1f]">
                  {editingPostponeId
                    ? 'Edit Pengajuan Postpone'
                    : 'Tambah Pengajuan Postpone'}
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Pilih cycle cuti yang masih eligible. Sistem akan otomatis menghitung deadline dan expired carry forward.
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
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-white/35 p-5">
            <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
                  <WalletCards size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Source Cycle
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Pilih cycle cuti lama yang ingin dibawa ke periode berikutnya.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block xl:col-span-2">
                  <span className="harmony-label">
                    Source Cycle
                  </span>

                  <select
                    value={form.source_cycle_id}
                    onChange={(event) => handleCycleSelect(event.target.value)}
                    className="harmony-select"
                    required
                  >
                    <option value="">Pilih cycle cuti yang ingin di-postpone</option>

                    {cyclesWithEligibility.map(({ cycle, eligibility }) => (
                      <option
                        key={cycle.id}
                        value={cycle.id}
                        disabled={!eligibility.isEligible}
                      >
                        {cycle.full_name} · Sisa {cycle.remaining_days} hari · End {cycle.cycle_end}
                        {!eligibility.isEligible
                          ? ` · Tidak bisa: ${eligibility.status}`
                          : ''}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-[#6e6e73]">
                    Eligible: {eligibleCycles.length} cycle · Tidak eligible: {blockedCycles.length} cycle.
                  </p>
                </label>

                <InputField
                  label="Request Date"
                  type="date"
                  value={form.request_date}
                  onChange={handleRequestDateChange}
                  required
                />

                <ReadOnlyField
                  label="Employee"
                  value={`${form.full_name || '-'} · ${form.employee_number || '-'}`}
                />

                <ReadOnlyField
                  label="Departemen"
                  value={form.department || '-'}
                />

                <ReadOnlyField
                  label="Old Cycle End"
                  value={formatDisplayDate(form.old_cycle_end)}
                />

                <ReadOnlyField
                  label="Batas Terakhir Pengajuan"
                  value={formatDisplayDate(form.deadline_date)}
                />

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
              </div>
            </div>

            <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-[#f7edfc] p-3 text-[#7b2cbf]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Approval
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Status approval bisa disesuaikan oleh HR.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SelectField
                  label="Final Status"
                  value={form.approval_status}
                  onChange={(value) => updateForm('approval_status', value)}
                  options={approvalOptions}
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
                  options={approvalOptions}
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
                  options={approvalOptions}
                />

                <SelectField
                  label="Status HR"
                  value={form.hr_status}
                  onChange={(value) => updateForm('hr_status', value)}
                  options={approvalOptions}
                />
              </div>
            </div>

            <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-[#fff4e5] p-3 text-[#b35b00]">
                  <MessageSquareText size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Reason & Notes
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Simpan alasan postpone dan catatan approval bila diperlukan.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextAreaField
                  label="Reason"
                  value={form.reason}
                  onChange={(value) => updateForm('reason', value)}
                  placeholder="Alasan postpone/carry forward."
                />

                <TextAreaField
                  label="Catatan HR"
                  value={form.hr_notes}
                  onChange={(value) => updateForm('hr_notes', value)}
                  placeholder="Catatan HR."
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
              </div>
            </div>

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
                  : editingPostponeId
                    ? 'Update Data'
                    : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      )}

      {detailPostpone && (
        <PostponeDetailModal
          postpone={detailPostpone}
          deadlineDate={getDeadlineDate(detailPostpone.old_cycle_end)}
          saving={saving}
          onClose={() => setDetailPostpone(null)}
          onApprove={() => handleApprove(detailPostpone)}
          onReject={() => handleReject(detailPostpone)}
          onEdit={() => handleEdit(detailPostpone)}
          onCancel={() => handleCancel(detailPostpone)}
        />
      )}
    </div>
  )
}

function PostponeDetailModal({
  postpone,
  deadlineDate,
  saving,
  onClose,
  onApprove,
  onReject,
  onEdit,
  onCancel,
}: {
  postpone: LeavePostponeRequest
  deadlineDate: string
  saving: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 bg-white/70 p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7edfc] px-3 py-1.5 text-xs font-bold text-[#7b2cbf]">
              <Eye size={14} />
              Detail Postpone
            </div>

            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {postpone.full_name || '-'}
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              {postpone.employee_number || '-'} · {postpone.department || '-'}
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
              value={postpone.full_name || '-'}
              subValue={`${postpone.employee_number || '-'} · ${postpone.department || '-'}`}
              icon={<UserRound size={18} />}
            />

            <DetailCard
              label="Request Date"
              value={formatDisplayDate(postpone.request_date)}
              subValue={`Deadline ${formatDisplayDate(deadlineDate)}`}
              icon={<CalendarDays size={18} />}
            />

            <DetailCard
              label="Old Cycle End"
              value={formatDisplayDate(postpone.old_cycle_end)}
              subValue="Cycle cuti lama"
              icon={<TimerReset size={18} />}
            />

            <DetailCard
              label="Remaining"
              value={`${postpone.remaining_days || 0} hari`}
              subValue="Sisa cuti lama"
              icon={<WalletCards size={18} />}
            />

            <DetailCard
              label="Requested"
              value={`${postpone.requested_days || 0} hari`}
              subValue="Akan di-carry forward"
              icon={<RotateCcw size={18} />}
            />

            <DetailCard
              label="New Expired"
              value={formatDisplayDate(postpone.new_expired_at)}
              subValue="Expired carry forward"
              icon={<Clock3 size={18} />}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ApprovalCard
              label="Atasan 1"
              name={postpone.supervisor_1 || '-'}
              status={postpone.supervisor_1_status || 'pending'}
            />

            <ApprovalCard
              label="Atasan 2"
              name={postpone.supervisor_2 || '-'}
              status={postpone.supervisor_2_status || 'pending'}
            />

            <ApprovalCard
              label="HR"
              name="HR"
              status={postpone.hr_status || 'pending'}
            />

            <ApprovalCard
              label="Final"
              name="Approval Status"
              status={postpone.approval_status || 'pending'}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[26px] border border-black/5 bg-[#f5f5f7]/70 p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold text-[#1d1d1f]">
                <MessageSquareText size={18} className="text-[#007aff]" />
                Reason
              </div>

              <p className="min-h-20 text-sm leading-6 text-[#6e6e73]">
                {postpone.reason || '-'}
              </p>
            </div>

            <div className="rounded-[26px] border border-black/5 bg-[#f5f5f7]/70 p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold text-[#1d1d1f]">
                <MessageSquareText size={18} className="text-[#007aff]" />
                Catatan HR
              </div>

              <p className="min-h-20 text-sm leading-6 text-[#6e6e73]">
                {postpone.hr_notes || '-'}
              </p>
            </div>
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
            onClick={onApprove}
            disabled={saving || postpone.approval_status === 'approved'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-green-600 px-5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} />
            Approve
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={saving || postpone.approval_status === 'approved'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <XCircle size={18} />
            Reject
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="harmony-button-secondary"
          >
            <Pencil size={18} />
            Edit
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving || postpone.approval_status === 'cancelled'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-orange-50 px-5 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={18} />
            Cancel
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
  tone: 'blue' | 'green' | 'orange' | 'red' | 'purple'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    red: 'text-red-700 bg-red-50',
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

function EligibilityCard({
  title,
  value,
  description,
  tone,
}: {
  title: string
  value: number
  description: string
  tone: 'green' | 'red' | 'blue'
}) {
  const className = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
  }[tone]

  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${className}`}>
        <ShieldAlert size={18} />
      </div>

      <p className="text-sm text-[#6e6e73]">
        {title}
      </p>

      <p className="mt-2 text-3xl font-semibold text-[#1d1d1f]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#86868b]">
        {description}
      </p>
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

function ApprovalCard({
  label,
  name,
  status,
}: {
  label: string
  name: string
  status: string
}) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white/70 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-semibold text-[#1d1d1f]">
        {name}
      </p>

      <div className="mt-2">
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

function CountBadge({
  value,
  tone,
}: {
  value: number
  tone: 'blue' | 'purple'
}) {
  const className = {
    blue: 'bg-[#e8f2ff] text-[#0059b8]',
    purple: 'bg-[#f7edfc] text-[#7b2cbf]',
  }[tone]

  return (
    <span className={`inline-flex min-w-10 justify-center rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {value}
    </span>
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
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <div className="mt-2 min-h-11 rounded-2xl border border-black/5 bg-[#f5f5f7]/80 px-4 py-3 text-sm font-semibold text-[#1d1d1f]">
        {value}
      </div>
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

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'approved'
      ? 'bg-green-50 text-green-700'
      : status === 'rejected'
        ? 'bg-red-50 text-red-700'
        : status === 'cancelled'
          ? 'bg-orange-50 text-orange-700'
          : status === 'skipped'
            ? 'bg-[#f5f5f7] text-[#6e6e73]'
            : 'bg-yellow-50 text-yellow-700'

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
  tone: 'blue' | 'neutral' | 'red'
  onClick: () => void
}) {
  const className = {
    blue: 'border border-black/5 bg-white text-[#007aff] hover:bg-[#f5f5f7]',
    neutral: 'border border-black/5 bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
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
  type: 'success' | 'error' | 'warning'
  message: string
}) {
  const className =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : type === 'warning'
        ? 'border-orange-200 bg-orange-50 text-orange-700'
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
        <RotateCcw size={24} />
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

function formatStatusText(status: string) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'pending') return 'Pending'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'skipped') return 'Skipped'

  return status.replace('_', ' ')
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

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)

  if (words.length === 0) return 'P'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}