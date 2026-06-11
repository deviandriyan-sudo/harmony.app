'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id?: string | null
  is_active?: boolean | null
}

type Employee = {
  id: string
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  email?: string | null
  department?: string | null
  unit?: string | null
  work_unit?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
}

type AnnualLeaveCycle = {
  id: string
  employee_number?: string | null
  full_name?: string | null
  department?: string | null
  matured_at?: string | null
  cycle_start?: string | null
  cycle_end?: string | null
  total_days?: number | null
  used_days?: number | null
  remaining_days?: number | null
  is_active?: boolean | null
  status?: string | null
}

type LeavePostponeRequest = {
  id: string
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

function todayISO() {
  return formatDateToISO(new Date())
}

function formatDateToISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDate(value?: string | null) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return null

  return date
}

function addMonths(dateString: string, months: number) {
  const date = parseDate(dateString)

  if (!date) return ''

  date.setMonth(date.getMonth() + months)

  return formatDateToISO(date)
}

function subtractDays(dateString: string, days: number) {
  const date = parseDate(dateString)

  if (!date) return ''

  date.setDate(date.getDate() - days)

  return formatDateToISO(date)
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

function getName(employee?: Employee | null) {
  return (
    employee?.full_name ||
    employee?.employee_name ||
    employee?.name ||
    employee?.email ||
    '-'
  )
}

function getEmployeeNumber(employee?: Employee | null) {
  return (
    employee?.employee_number ||
    employee?.nip ||
    employee?.machine_pin ||
    ''
  )
}

function getDepartment(employee?: Employee | null) {
  return employee?.department || employee?.unit || employee?.work_unit || ''
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function isBeforeOrSame(dateA: string, dateB: string) {
  const a = parseDate(dateA)
  const b = parseDate(dateB)

  if (!a || !b) return false

  return a.getTime() <= b.getTime()
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

export default function EmployeeLeavePostponePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [cycles, setCycles] = useState<AnnualLeaveCycle[]>([])
  const [requests, setRequests] = useState<LeavePostponeRequest[]>([])

  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [requestedDays, setRequestedDays] = useState(0)
  const [reason, setReason] = useState('')

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  const selectedCycle = useMemo(() => {
    return cycles.find((item) => item.id === selectedCycleId) || null
  }, [cycles, selectedCycleId])

  const computed = useMemo(() => {
    if (!selectedCycle?.cycle_end) {
      return {
        oldCycleEnd: '',
        deadline: '',
        expiredAt: '',
        eligible: false,
      }
    }

    const oldCycleEnd = selectedCycle.cycle_end
    const deadline = subtractDays(oldCycleEnd, 7)
    const expiredAt = addMonths(oldCycleEnd, 6)
    const eligible = isBeforeOrSame(todayISO(), deadline)

    return {
      oldCycleEnd,
      deadline,
      expiredAt,
      eligible,
    }
  }, [selectedCycle])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setMessage(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        setMessage({
          type: 'error',
          text: 'Session tidak ditemukan. Silakan login ulang.',
        })
        setLoading(false)
        return
      }

      const { data: appUserData, error: appUserError } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle<AppUser>()

      if (appUserError) throw appUserError

      const fallbackUser: AppUser = {
        id: authData.user.id,
        email: authData.user.email || '',
        role: 'employee',
        employee_id: null,
        is_active: true,
      }

      const currentAppUser = appUserData || fallbackUser

      setAppUser(currentAppUser)

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .or(
          currentAppUser.employee_id
            ? `id.eq.${currentAppUser.employee_id},email.eq.${authData.user.email}`
            : `email.eq.${authData.user.email}`
        )
        .limit(1)

      if (employeeError) throw employeeError

      const currentEmployee = (employeeData?.[0] || null) as Employee | null

      setEmployee(currentEmployee)

      const employeeNumber = getEmployeeNumber(currentEmployee)

      if (!employeeNumber) {
        setCycles([])
        setRequests([])
        setMessage({
          type: 'error',
          text: 'Nomor karyawan/NIP/machine pin tidak ditemukan pada data employee.',
        })
        setLoading(false)
        return
      }

      const { data: cycleData, error: cycleError } = await supabase
        .from('annual_leave_cycles')
        .select('*')
        .eq('employee_number', employeeNumber)
        .eq('is_active', true)
        .gt('remaining_days', 0)
        .order('cycle_end', { ascending: true })

      if (cycleError) throw cycleError

      const { data: requestData, error: requestError } = await supabase
        .from('leave_postpone_requests')
        .select('*')
        .eq('employee_number', employeeNumber)
        .order('created_at', { ascending: false })

      if (requestError) throw requestError

      setCycles((cycleData || []) as AnnualLeaveCycle[])
      setRequests((requestData || []) as LeavePostponeRequest[])

      const firstCycle = (cycleData || [])[0] as AnnualLeaveCycle | undefined

      if (firstCycle) {
        setSelectedCycleId(firstCycle.id)
        setRequestedDays(Number(firstCycle.remaining_days || 0))
      }
    } catch (error: any) {
      console.error(error)
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal mengambil data postpone cuti.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setMessage(null)

    try {
      if (!employee || !appUser) {
        throw new Error('Data karyawan tidak ditemukan.')
      }

      if (!selectedCycle) {
        throw new Error('Cycle cuti belum dipilih.')
      }

      const employeeNumber = getEmployeeNumber(employee)

      if (!employeeNumber) {
        throw new Error('Nomor karyawan tidak ditemukan.')
      }

      if (!selectedCycle.remaining_days || Number(selectedCycle.remaining_days) <= 0) {
        throw new Error('Tidak ada sisa cuti tahunan yang dapat diajukan postpone.')
      }

      if (requestedDays <= 0) {
        throw new Error('Jumlah hari postpone harus lebih dari 0.')
      }

      if (requestedDays > Number(selectedCycle.remaining_days || 0)) {
        throw new Error('Jumlah postpone tidak boleh lebih besar dari sisa cuti.')
      }

      if (!computed.oldCycleEnd || !computed.deadline || !computed.expiredAt) {
        throw new Error('Tanggal cycle cuti tidak valid.')
      }

      if (!computed.eligible) {
        throw new Error(
          `Pengajuan sudah melewati batas. Batas akhir pengajuan adalah ${formatDate(computed.deadline)}.`
        )
      }

      const existingActive = requests.find((item) => {
        return (
          item.source_cycle_id === selectedCycle.id &&
          !['rejected', 'cancelled'].includes(normalize(item.approval_status))
        )
      })

      if (existingActive) {
        throw new Error('Cycle ini sudah memiliki pengajuan postpone aktif.')
      }

      const supervisor1 = employee.supervisor_1 || ''
      const supervisor2 = employee.supervisor_2 || ''

      const hasSupervisor1 = Boolean(supervisor1)
      const hasSupervisor2 = Boolean(supervisor2)

      const payload = {
        employee_id: employee.id,
        employee_number: employeeNumber,
        full_name: getName(employee),
        department: getDepartment(employee) || selectedCycle.department || null,

        source_cycle_id: selectedCycle.id,

        remaining_days: Number(selectedCycle.remaining_days || 0),
        requested_days: requestedDays,

        request_date: todayISO(),
        old_cycle_end: computed.oldCycleEnd,
        next_matured_at: computed.oldCycleEnd,
        postpone_deadline: computed.deadline,
        new_expired_at: computed.expiredAt,

        reason: reason || null,

        approval_status: hasSupervisor1 ? 'pending_supervisor' : 'pending_hr',

        supervisor_1: supervisor1 || null,
        supervisor_1_status: hasSupervisor1 ? 'pending' : 'skipped',
        supervisor_1_notes: null,

        supervisor_2: supervisor2 || null,
        supervisor_2_status: hasSupervisor2 ? 'pending' : 'skipped',
        supervisor_2_notes: null,

        hr_status: hasSupervisor1 ? 'waiting_supervisor' : 'pending',
        hr_notes: null,

        is_active: true,
        created_by: getName(employee),
        edited_by: getName(employee),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('leave_postpone_requests')
        .insert(payload)

      if (error) throw error

      setReason('')
      setMessage({
        type: 'success',
        text: 'Pengajuan postpone berhasil dikirim. Silakan menunggu approval atasan dan HR.',
      })

      await fetchData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Gagal mengirim pengajuan postpone.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar
        title="Pengajuan Postpone Cuti"
        description="Ajukan carry forward sisa cuti tahunan sebelum batas H-7 dari tanggal akhir cycle."
      />

      <main className="space-y-6 p-4 sm:p-6">
        <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <Link
            href="/employee/leave"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={14} />
            Kembali ke Leave
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <RotateCcw size={14} />
                Annual Leave Carry Forward
              </div>

              <h1 className="mt-3 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">
                Postpone Sisa Cuti Tahunan
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
                Sisa cuti tahunan dapat diajukan postpone paling lambat H-7 sebelum tanggal akhir cycle.
                Jika disetujui HR, sisa cuti berlaku selama 6 bulan dari tanggal matang berikutnya.
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
                : message.type === 'info'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1d1d1f]">
              Form Pengajuan
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Pilih cycle cuti tahunan yang masih memiliki sisa cuti.
            </p>

            {loading ? (
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Memuat data...
              </div>
            ) : cycles.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                Tidak ada sisa cuti tahunan aktif yang bisa diajukan postpone.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    Cycle Cuti Tahunan
                  </span>

                  <select
                    value={selectedCycleId}
                    onChange={(event) => {
                      const cycleId = event.target.value
                      const cycle = cycles.find((item) => item.id === cycleId)

                      setSelectedCycleId(cycleId)
                      setRequestedDays(Number(cycle?.remaining_days || 0))
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                    required
                  >
                    {cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {formatDate(cycle.cycle_start)} - {formatDate(cycle.cycle_end)} · Sisa {cycle.remaining_days || 0} hari
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox label="Sisa Cuti" value={`${selectedCycle?.remaining_days || 0} hari`} />
                  <InfoBox label="Batas Pengajuan" value={formatDate(computed.deadline)} />
                  <InfoBox label="Berlaku Sampai" value={formatDate(computed.expiredAt)} />
                  <InfoBox
                    label="Status Eligibility"
                    value={computed.eligible ? 'Masih bisa diajukan' : 'Lewat batas H-7'}
                    tone={computed.eligible ? 'green' : 'red'}
                  />
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    Jumlah Hari Diajukan
                  </span>

                  <input
                    type="number"
                    min={1}
                    max={Number(selectedCycle?.remaining_days || 0)}
                    value={requestedDays}
                    onChange={(event) => setRequestedDays(Number(event.target.value))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    Alasan Pengajuan
                  </span>

                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Contoh: sisa cuti belum dapat digunakan karena kebutuhan operasional pekerjaan."
                    className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving || !computed.eligible}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Kirim Pengajuan Postpone
                </button>
              </form>
            )}
          </div>

          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1d1d1f]">
              Riwayat Pengajuan
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Pantau status approval atasan dan HR.
            </p>

            <div className="mt-5 space-y-3">
              {requests.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada pengajuan postpone.
                </div>
              ) : (
                requests.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-[#1d1d1f]">
                          {item.requested_days || 0} hari postpone
                        </p>
                        <p className="mt-1 text-xs text-[#6e6e73]">
                          Cycle end: {formatDate(item.old_cycle_end)} · Expired: {formatDate(item.new_expired_at)}
                        </p>
                      </div>

                      <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusClass(item.approval_status)}`}>
                        {getStatusLabel(item.approval_status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                      <MiniStatus label="Atasan 1" status={item.supervisor_1_status} />
                      <MiniStatus label="Atasan 2" status={item.supervisor_2_status} />
                      <MiniStatus label="HR" status={item.hr_status} />
                    </div>

                    {item.reason && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {item.reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

function InfoBox({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'green' | 'red'
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold">
        {value}
      </p>
    </div>
  )
}

function MiniStatus({
  label,
  status,
}: {
  label: string
  status?: string | null
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-700">
        {getStatusLabel(status)}
      </p>
    </div>
  )
}