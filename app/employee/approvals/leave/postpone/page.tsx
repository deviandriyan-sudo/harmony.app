'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'

type Employee = {
  id: string
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  email?: string | null
}

type AppUser = {
  id: string
  email: string
  role: string
  employee_id?: string | null
}

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

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getEmployeeName(employee?: Employee | null) {
  return (
    employee?.full_name ||
    employee?.employee_name ||
    employee?.name ||
    employee?.email ||
    '-'
  )
}

function employeeIdentityList(employee?: Employee | null) {
  return [
    employee?.id,
    employee?.full_name,
    employee?.employee_name,
    employee?.name,
    employee?.employee_number,
    employee?.nip,
    employee?.machine_pin,
    employee?.email,
  ]
    .filter(Boolean)
    .map((item) => normalize(String(item)))
}

function isSamePerson(value: string | null | undefined, employee: Employee | null) {
  const target = normalize(value)

  if (!target || !employee) return false

  return employeeIdentityList(employee).includes(target)
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

  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export default function EmployeePostponeApprovalPage() {
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [requests, setRequests] = useState<LeavePostponeRequest[]>([])
  const [search, setSearch] = useState('')

  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const filteredRequests = useMemo(() => {
    const keyword = normalize(search)

    return requests
      .filter((item) => {
        const asSupervisor1 =
          isSamePerson(item.supervisor_1, currentEmployee) &&
          normalize(item.supervisor_1_status) === 'pending'

        const asSupervisor2 =
          isSamePerson(item.supervisor_2, currentEmployee) &&
          normalize(item.supervisor_1_status) === 'approved' &&
          normalize(item.supervisor_2_status) === 'pending'

        return asSupervisor1 || asSupervisor2
      })
      .filter((item) => {
        if (!keyword) return true

        const haystack = [
          item.full_name,
          item.employee_number,
          item.department,
          item.reason,
          item.approval_status,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(keyword)
      })
  }, [requests, currentEmployee, search])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setMessage(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error('Session tidak ditemukan. Silakan login ulang.')
      }

      const { data: appUserData, error: appUserError } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle<AppUser>()

      if (appUserError) throw appUserError

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .or(
          appUserData?.employee_id
            ? `id.eq.${appUserData.employee_id},email.eq.${authData.user.email}`
            : `email.eq.${authData.user.email}`
        )
        .limit(1)

      if (employeeError) throw employeeError

      setCurrentEmployee((employeeData?.[0] || null) as Employee | null)

      const { data: postponeData, error: postponeError } = await supabase
        .from('leave_postpone_requests')
        .select('*')
        .eq('is_active', true)
        .in('approval_status', ['pending_supervisor', 'pending_supervisor_2'])
        .order('created_at', { ascending: false })

      if (postponeError) throw postponeError

      setRequests((postponeData || []) as LeavePostponeRequest[])
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal mengambil data approval postpone.',
      })
    } finally {
      setLoading(false)
    }
  }

  function getSupervisorLevel(request: LeavePostponeRequest) {
    if (
      isSamePerson(request.supervisor_1, currentEmployee) &&
      normalize(request.supervisor_1_status) === 'pending'
    ) {
      return 1
    }

    if (
      isSamePerson(request.supervisor_2, currentEmployee) &&
      normalize(request.supervisor_1_status) === 'approved' &&
      normalize(request.supervisor_2_status) === 'pending'
    ) {
      return 2
    }

    return 0
  }

  async function handleApprove(request: LeavePostponeRequest) {
    const level = getSupervisorLevel(request)

    if (!level) {
      setMessage({
        type: 'error',
        text: 'Akun ini tidak memiliki approval aktif untuk pengajuan tersebut.',
      })
      return
    }

    const note = window.prompt('Catatan approval atasan:', 'Disetujui oleh atasan.')

    if (note === null) return

    setProcessingId(request.id)
    setMessage(null)

    try {
      const hasSupervisor2 = Boolean(request.supervisor_2)

      let payload: Record<string, any> = {
        edited_by: getEmployeeName(currentEmployee),
        updated_at: new Date().toISOString(),
      }

      if (level === 1) {
        payload = {
          ...payload,
          supervisor_1_status: 'approved',
          supervisor_1_notes: note || 'Disetujui oleh atasan.',
          supervisor_1_approved_at: new Date().toISOString(),
          approval_status: hasSupervisor2 ? 'pending_supervisor_2' : 'pending_hr',
          hr_status: hasSupervisor2 ? 'waiting_supervisor' : 'pending',
        }
      }

      if (level === 2) {
        payload = {
          ...payload,
          supervisor_2_status: 'approved',
          supervisor_2_notes: note || 'Disetujui oleh atasan.',
          supervisor_2_approved_at: new Date().toISOString(),
          approval_status: 'pending_hr',
          hr_status: 'pending',
        }
      }

      const { error } = await supabase
        .from('leave_postpone_requests')
        .update(payload)
        .eq('id', request.id)

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Pengajuan postpone berhasil disetujui dan diteruskan ke tahap berikutnya.',
      })

      await fetchData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal approve pengajuan postpone.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(request: LeavePostponeRequest) {
    const level = getSupervisorLevel(request)

    if (!level) {
      setMessage({
        type: 'error',
        text: 'Akun ini tidak memiliki approval aktif untuk pengajuan tersebut.',
      })
      return
    }

    const note = window.prompt('Alasan penolakan:')

    if (note === null) return

    if (!note.trim()) {
      setMessage({
        type: 'error',
        text: 'Alasan penolakan wajib diisi.',
      })
      return
    }

    setProcessingId(request.id)
    setMessage(null)

    try {
      let payload: Record<string, any> = {
        approval_status: 'rejected',
        hr_status: 'rejected',
        edited_by: getEmployeeName(currentEmployee),
        updated_at: new Date().toISOString(),
      }

      if (level === 1) {
        payload = {
          ...payload,
          supervisor_1_status: 'rejected',
          supervisor_1_notes: note,
          supervisor_1_rejected_at: new Date().toISOString(),
        }
      }

      if (level === 2) {
        payload = {
          ...payload,
          supervisor_2_status: 'rejected',
          supervisor_2_notes: note,
          supervisor_2_rejected_at: new Date().toISOString(),
        }
      }

      const { error } = await supabase
        .from('leave_postpone_requests')
        .update(payload)
        .eq('id', request.id)

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Pengajuan postpone berhasil ditolak.',
      })

      await fetchData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal reject pengajuan postpone.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <>
      <Topbar
        title="Approval Postpone Cuti"
        description="Persetujuan atasan untuk pengajuan carry forward sisa cuti tahunan."
      />

      <main className="space-y-6 p-4 sm:p-6">
        <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <Link
            href="/employee/approvals"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={14} />
            Kembali ke Approval Tim
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <RotateCcw size={14} />
                Supervisor Approval
              </div>

              <h1 className="mt-3 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">
                Approval Postpone Cuti
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                Login sebagai: <span className="font-bold text-[#1d1d1f]">{getEmployeeName(currentEmployee)}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>
        </section>

        {message && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </section>
        )}

        <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIK, unit..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:w-auto">
              <MiniStat icon={<Clock3 size={14} />} label="Pending" value={filteredRequests.length} />
              <MiniStat icon={<CheckCircle2 size={14} />} label="Approve" value={requests.filter((item) => item.approval_status === 'pending_hr').length} />
              <MiniStat icon={<XCircle size={14} />} label="Reject" value={requests.filter((item) => item.approval_status === 'rejected').length} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Memuat pengajuan...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Tidak ada pengajuan postpone yang menunggu approval akun ini.
              </div>
            ) : (
              filteredRequests.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-bold text-[#1d1d1f]">
                        {item.full_name || '-'}
                      </p>
                      <p className="mt-1 text-xs text-[#6e6e73]">
                        {item.employee_number || '-'} · {item.department || '-'}
                      </p>

                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                        <Info label="Sisa Lama" value={`${item.remaining_days || 0} hari`} />
                        <Info label="Diajukan" value={`${item.requested_days || 0} hari`} />
                        <Info label="Expired" value={formatDate(item.new_expired_at)} />
                      </div>

                      {item.reason && (
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                          {item.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:items-end">
                      <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusClass(item.approval_status)}`}>
                        {getStatusLabel(item.approval_status)}
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          disabled={processingId === item.id}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          <XCircle size={14} />
                          Tolak
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          disabled={processingId === item.id}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#1d1d1f] px-3 py-2 text-xs font-bold text-white transition hover:bg-black disabled:opacity-60"
                        >
                          {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Setujui
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mx-auto flex w-fit items-center justify-center text-slate-500">
        {icon}
      </div>
      <p className="mt-1 text-[11px] font-bold text-slate-400">
        {label}
      </p>
      <p className="text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  )
}