'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'

type LeavePostponeRequest = {
  id: string
  employee_id?: string | null
  employee_number?: string | null
  full_name?: string | null
  department?: string | null
  source_cycle_id?: string | null
  remaining_days?: number | null
  requested_days?: number | null
  request_date?: string | null
  old_cycle_end?: string | null
  next_matured_at?: string | null
  postpone_deadline?: string | null
  new_expired_at?: string | null
  reason?: string | null
  approval_status?: string | null
  supervisor_1?: string | null
  supervisor_1_status?: string | null
  supervisor_1_notes?: string | null
  supervisor_2?: string | null
  supervisor_2_status?: string | null
  supervisor_2_notes?: string | null
  hr_status?: string | null
  hr_notes?: string | null
  is_active?: boolean | null
  created_at?: string | null
}

type FilterStatus =
  | 'pending_hr'
  | 'waiting_supervisor'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'all'

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return null

  return date
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = parseDate(value)

  if (!date) return value

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getStatusLabel(status?: string | null) {
  const value = normalize(status)

  const map: Record<string, string> = {
    pending_supervisor: 'Menunggu Atasan',
    pending_supervisor_2: 'Menunggu Atasan 2',
    pending_hr: 'Menunggu HR',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
    waiting_supervisor: 'Menunggu Atasan',
    pending: 'Pending',
    skipped: 'Dilewati',
  }

  return map[value] || status || '-'
}

function statusClass(status?: string | null) {
  const value = normalize(status)

  if (value === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (value === 'rejected' || value === 'cancelled') return 'border-red-200 bg-red-50 text-red-700'
  if (value === 'pending_hr') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (value === 'skipped') return 'border-slate-200 bg-slate-50 text-slate-500'

  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function isSupervisorApproved(item: LeavePostponeRequest) {
  const supervisor1Ok =
    !item.supervisor_1 ||
    normalize(item.supervisor_1_status) === 'approved' ||
    normalize(item.supervisor_1_status) === 'skipped'

  const supervisor2Ok =
    !item.supervisor_2 ||
    normalize(item.supervisor_2_status) === 'approved' ||
    normalize(item.supervisor_2_status) === 'skipped'

  return supervisor1Ok && supervisor2Ok
}

function isReadyForHR(item: LeavePostponeRequest) {
  return (
    isSupervisorApproved(item) &&
    normalize(item.approval_status) === 'pending_hr' &&
    normalize(item.hr_status) === 'pending'
  )
}

export default function HRLeavePostponePage() {
  const [postpones, setPostpones] = useState<LeavePostponeRequest[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending_hr')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  const filteredPostpones = useMemo(() => {
    const keyword = normalize(search)

    return postpones
      .filter((item) => {
        if (filterStatus === 'all') return true

        if (filterStatus === 'pending_hr') {
          return isReadyForHR(item)
        }

        if (filterStatus === 'waiting_supervisor') {
          return (
            normalize(item.approval_status) === 'pending_supervisor' ||
            normalize(item.approval_status) === 'pending_supervisor_2' ||
            normalize(item.hr_status) === 'waiting_supervisor'
          )
        }

        return normalize(item.approval_status) === filterStatus
      })
      .filter((item) => {
        if (!keyword) return true

        const haystack = [
          item.full_name,
          item.employee_number,
          item.department,
          item.approval_status,
          item.hr_status,
          item.reason,
          item.supervisor_1,
          item.supervisor_2,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(keyword)
      })
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  }, [postpones, search, filterStatus])

  const stats = useMemo(() => {
    return {
      total: postpones.length,
      waitingSupervisor: postpones.filter(
        (item) =>
          normalize(item.approval_status) === 'pending_supervisor' ||
          normalize(item.approval_status) === 'pending_supervisor_2' ||
          normalize(item.hr_status) === 'waiting_supervisor'
      ).length,
      pendingHR: postpones.filter((item) => isReadyForHR(item)).length,
      approved: postpones.filter((item) => normalize(item.approval_status) === 'approved').length,
      rejected: postpones.filter((item) => normalize(item.approval_status) === 'rejected').length,
    }
  }, [postpones])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('leave_postpone_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPostpones((data || []) as LeavePostponeRequest[])
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal mengambil data postpone cuti.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function applyCarryForwardToCycle(postpone: LeavePostponeRequest) {
    if (!postpone.source_cycle_id) {
      return {
        error: 'Source cycle tidak ditemukan.',
      }
    }

    const requestedDays = Number(postpone.requested_days || 0)

    const { error } = await supabase
      .from('annual_leave_cycles')
      .update({
        carry_forward_days: requestedDays,
        carry_forward_used_days: 0,
        carry_forward_remaining_days: requestedDays,
        carry_forward_expired_at: postpone.new_expired_at,
        status: 'carried_forward',
        notes: 'Carry forward approved melalui pengajuan postpone.',
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

  async function handleApproveHR(postpone: LeavePostponeRequest) {
    if (!isReadyForHR(postpone)) {
      setMessage({
        type: 'error',
        text: 'Pengajuan belum bisa di-approve HR karena approval atasan belum selesai.',
      })
      return
    }

    const note = window.prompt(
      'Catatan final approval HR:',
      'Disetujui HR. Sisa cuti dibawa sebagai saldo postpone/carry forward.'
    )

    if (note === null) return

    setSavingId(postpone.id)
    setMessage(null)

    try {
      const applyResult = await applyCarryForwardToCycle(postpone)

      if (applyResult.error) {
        throw new Error(applyResult.error)
      }

      const { error } = await supabase
        .from('leave_postpone_requests')
        .update({
          approval_status: 'approved',
          hr_status: 'approved',
          hr_notes: note || 'Disetujui HR.',
          hr_approved_at: new Date().toISOString(),
          edited_by: 'HR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postpone.id)

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Postpone berhasil disetujui HR. Saldo carry forward sudah diterapkan.',
      })

      await fetchData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal approve postpone oleh HR.',
      })
    } finally {
      setSavingId(null)
    }
  }

  async function handleRejectHR(postpone: LeavePostponeRequest) {
    if (normalize(postpone.approval_status) === 'approved') {
      setMessage({
        type: 'error',
        text: 'Postpone yang sudah approved tidak bisa reject langsung. Gunakan Cancel.',
      })
      return
    }

    const note = window.prompt('Alasan HR menolak pengajuan postpone:')

    if (note === null) return

    if (!note.trim()) {
      setMessage({
        type: 'error',
        text: 'Alasan penolakan wajib diisi.',
      })
      return
    }

    setSavingId(postpone.id)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('leave_postpone_requests')
        .update({
          approval_status: 'rejected',
          hr_status: 'rejected',
          hr_notes: note,
          hr_rejected_at: new Date().toISOString(),
          edited_by: 'HR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postpone.id)

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Postpone berhasil ditolak oleh HR.',
      })

      await fetchData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal reject postpone oleh HR.',
      })
    } finally {
      setSavingId(null)
    }
  }

  async function handleCancel(postpone: LeavePostponeRequest) {
    const confirmCancel = window.confirm(
      'Batalkan postpone ini? Jika sebelumnya sudah approved, saldo carry forward akan dihapus dari cycle.'
    )

    if (!confirmCancel) return

    setSavingId(postpone.id)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('leave_postpone_requests')
        .update({
          approval_status: 'cancelled',
          hr_status: 'cancelled',
          is_active: false,
          hr_notes: postpone.hr_notes || 'Postpone cancelled by HR.',
          hr_cancelled_at: new Date().toISOString(),
          edited_by: 'HR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postpone.id)

      if (error) throw error

      if (postpone.source_cycle_id && normalize(postpone.approval_status) === 'approved') {
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

      setMessage({
        type: 'success',
        text: 'Postpone berhasil dibatalkan.',
      })

      await fetchData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal cancel postpone.',
      })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <Topbar
        title="Postpone Cuti"
        description="Final approval HR untuk carry forward sisa cuti tahunan yang sudah disetujui atasan."
      />

      <main className="space-y-6 p-4 sm:p-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Total" value={stats.total} icon={<RotateCcw size={20} />} />
          <SummaryCard title="Menunggu Atasan" value={stats.waitingSupervisor} icon={<Clock3 size={20} />} />
          <SummaryCard title="Menunggu HR" value={stats.pendingHR} icon={<ShieldCheck size={20} />} />
          <SummaryCard title="Approved" value={stats.approved} icon={<CheckCircle2 size={20} />} />
          <SummaryCard title="Rejected" value={stats.rejected} icon={<XCircle size={20} />} />
        </section>

        {message && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type === 'info'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </section>
        )}

        <section className="rounded-[28px] border border-black/5 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1d1d1f]">
                  Daftar Pengajuan Postpone
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  HR hanya bisa final approve setelah seluruh approval atasan selesai.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-80">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama, NIK, status..."
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="pending_hr">Menunggu HR</option>
                  <option value="waiting_supervisor">Menunggu Atasan</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="all">Semua</option>
                </select>

                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Memuat data postpone...
              </div>
            </div>
          ) : filteredPostpones.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6e6e73]">
              Data postpone cuti tidak ditemukan.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4 font-bold">Employee</th>
                      <th className="px-5 py-4 font-bold">Cycle</th>
                      <th className="px-5 py-4 text-center font-bold">Sisa</th>
                      <th className="px-5 py-4 text-center font-bold">Diajukan</th>
                      <th className="px-5 py-4 font-bold">Expired</th>
                      <th className="px-5 py-4 font-bold">Atasan 1</th>
                      <th className="px-5 py-4 font-bold">Atasan 2</th>
                      <th className="px-5 py-4 font-bold">HR</th>
                      <th className="px-5 py-4 font-bold">Status</th>
                      <th className="px-5 py-4 text-right font-bold">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPostpones.map((item) => (
                      <PostponeRow
                        key={item.id}
                        item={item}
                        savingId={savingId}
                        onApprove={handleApproveHR}
                        onReject={handleRejectHR}
                        onCancel={handleCancel}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 xl:hidden">
                {filteredPostpones.map((item) => (
                  <PostponeMobileCard
                    key={item.id}
                    item={item}
                    savingId={savingId}
                    onApprove={handleApproveHR}
                    onReject={handleRejectHR}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  )
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black text-[#1d1d1f]">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status?: string | null
}) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  )
}

function PostponeRow({
  item,
  savingId,
  onApprove,
  onReject,
  onCancel,
}: {
  item: LeavePostponeRequest
  savingId: string | null
  onApprove: (item: LeavePostponeRequest) => void
  onReject: (item: LeavePostponeRequest) => void
  onCancel: (item: LeavePostponeRequest) => void
}) {
  const readyForHR = isReadyForHR(item)
  const approved = normalize(item.approval_status) === 'approved'
  const cancelled = normalize(item.approval_status) === 'cancelled'
  const saving = savingId === item.id

  return (
    <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50">
      <td className="px-5 py-4">
        <div className="font-bold text-[#1d1d1f]">
          {item.full_name || '-'}
        </div>
        <div className="mt-1 text-xs text-[#6e6e73]">
          {item.employee_number || '-'} · {item.department || '-'}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Submit: {formatDateTime(item.created_at)}
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="text-sm font-semibold text-[#1d1d1f]">
          End: {formatDate(item.old_cycle_end)}
        </div>
        <div className="mt-1 text-xs text-[#6e6e73]">
          Deadline: {formatDate(item.postpone_deadline)}
        </div>
      </td>

      <td className="px-5 py-4 text-center font-bold">
        {item.remaining_days || 0}
      </td>

      <td className="px-5 py-4 text-center font-bold text-blue-700">
        {item.requested_days || 0}
      </td>

      <td className="px-5 py-4">
        {formatDate(item.new_expired_at)}
      </td>

      <td className="px-5 py-4">
        <div className="mb-1 text-xs text-[#6e6e73]">
          {item.supervisor_1 || '-'}
        </div>
        <StatusBadge status={item.supervisor_1_status} />
      </td>

      <td className="px-5 py-4">
        <div className="mb-1 text-xs text-[#6e6e73]">
          {item.supervisor_2 || '-'}
        </div>
        <StatusBadge status={item.supervisor_2_status} />
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={item.hr_status} />
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={item.approval_status} />
      </td>

      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onReject(item)}
            disabled={saving || approved || cancelled}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle size={14} />
            Reject
          </button>

          <button
            type="button"
            onClick={() => onApprove(item)}
            disabled={saving || !readyForHR || approved || cancelled}
            className="inline-flex items-center gap-1 rounded-xl bg-[#1d1d1f] px-3 py-2 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve HR
          </button>

          <button
            type="button"
            onClick={() => onCancel(item)}
            disabled={saving || cancelled}
            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AlertTriangle size={14} />
            Cancel
          </button>
        </div>

        {!readyForHR && !approved && !cancelled && (
          <p className="mt-2 text-xs font-semibold text-amber-600">
            Menunggu approval atasan.
          </p>
        )}
      </td>
    </tr>
  )
}

function PostponeMobileCard({
  item,
  savingId,
  onApprove,
  onReject,
  onCancel,
}: {
  item: LeavePostponeRequest
  savingId: string | null
  onApprove: (item: LeavePostponeRequest) => void
  onReject: (item: LeavePostponeRequest) => void
  onCancel: (item: LeavePostponeRequest) => void
}) {
  const readyForHR = isReadyForHR(item)
  const approved = normalize(item.approval_status) === 'approved'
  const cancelled = normalize(item.approval_status) === 'cancelled'
  const saving = savingId === item.id

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#1d1d1f]">
            {item.full_name || '-'}
          </p>
          <p className="mt-1 text-xs text-[#6e6e73]">
            {item.employee_number || '-'} · {item.department || '-'}
          </p>
        </div>

        <StatusBadge status={item.approval_status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <MiniInfo label="Sisa" value={`${item.remaining_days || 0} hari`} />
        <MiniInfo label="Diajukan" value={`${item.requested_days || 0} hari`} />
        <MiniInfo label="End Cycle" value={formatDate(item.old_cycle_end)} />
        <MiniInfo label="Expired" value={formatDate(item.new_expired_at)} />
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <MiniInfo label="Atasan 1" value={`${item.supervisor_1 || '-'} · ${getStatusLabel(item.supervisor_1_status)}`} />
        <MiniInfo label="Atasan 2" value={`${item.supervisor_2 || '-'} · ${getStatusLabel(item.supervisor_2_status)}`} />
        <MiniInfo label="HR" value={getStatusLabel(item.hr_status)} />
      </div>

      {!readyForHR && !approved && !cancelled && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
          Menunggu approval atasan. HR belum bisa final approve.
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onReject(item)}
          disabled={saving || approved || cancelled}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle size={14} />
          Reject
        </button>

        <button
          type="button"
          onClick={() => onApprove(item)}
          disabled={saving || !readyForHR || approved || cancelled}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#1d1d1f] px-3 py-2 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Approve HR
        </button>

        <button
          type="button"
          onClick={() => onCancel(item)}
          disabled={saving || cancelled}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AlertTriangle size={14} />
          Cancel
        </button>
      </div>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-700">
        {value}
      </p>
    </div>
  )
}