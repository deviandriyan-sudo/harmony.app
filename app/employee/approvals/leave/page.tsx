'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type Employee = {
  id: string
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  email?: string | null
  position?: string | null
  position_name?: string | null
  job_position?: string | null
  department?: string | null
  unit?: string | null
  work_unit?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
}

type AppUser = {
  id: string
  email: string
  role: string
  employee_id?: string | null
  is_active?: boolean | null
}

type LeaveRequest = {
  id: string
  employee_id?: string | null

  employee_name?: string | null
  full_name?: string | null
  employee_number?: string | null
  department?: string | null
  position?: string | null

  request_type?: string | null
  leave_type?: string | null
  request_category?: string | null

  start_date?: string | null
  end_date?: string | null
  total_days?: number | null

  reason?: string | null
  job_pending?: string | null
  handover_to?: string | null
  handover_note?: string | null

  proof_file_url?: string | null
  proof_url?: string | null
  attachment_url?: string | null

  status?: string | null
  supervisor_status?: string | null
  supervisor_id?: string | null
  supervisor_name?: string | null
  supervisor_note?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_at?: string | null

  hr_status?: string | null
  hr_note?: string | null

  source?: string | null
  is_locked?: boolean | null
  locked_reason?: string | null

  created_at?: string | null
  updated_at?: string | null
}

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all'

function getEmployeeName(employee?: Employee | null) {
  if (!employee) return '-'

  return (
    employee.full_name ||
    employee.employee_name ||
    employee.name ||
    employee.email ||
    '-'
  )
}

function getRequestEmployeeName(request: LeaveRequest, employee?: Employee) {
  return (
    request.employee_name ||
    request.full_name ||
    getEmployeeName(employee) ||
    '-'
  )
}

function getEmployeeNumber(employee?: Employee | null, request?: LeaveRequest) {
  return (
    request?.employee_number ||
    employee?.employee_number ||
    employee?.nip ||
    employee?.machine_pin ||
    '-'
  )
}

function getEmployeeUnit(employee?: Employee | null, request?: LeaveRequest) {
  return request?.department || employee?.department || employee?.unit || employee?.work_unit || '-'
}

function getEmployeePosition(employee?: Employee | null, request?: LeaveRequest) {
  return (
    request?.position ||
    employee?.position_name ||
    employee?.job_position ||
    employee?.position ||
    '-'
  )
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

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

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function getRequestTypeLabel(type?: string | null, leaveType?: string | null) {
  const value = normalize(type || leaveType)

  const map: Record<string, string> = {
    annual_leave: 'Cuti Tahunan',
    marriage_leave: 'Cuti Menikah',
    maternity_leave: 'Cuti Melahirkan',
    miscarriage_leave: 'Cuti Keguguran',
    bereavement_leave: 'Cuti Duka',
    child_circumcision_leave: 'Cuti Khitan / Baptis Anak',
    worship_leave: 'Cuti Ibadah',
    menstrual_leave: 'Cuti Haid',
    pregnancy_check_leave: 'Pemeriksaan Kehamilan',
    sick: 'Sakit',
    permit: 'Izin',
    official_travel: 'Tugas Luar / Dinas',
    phl_claim: 'Klaim PHL',
    other_leave: 'Cuti Lainnya',
  }

  return map[value] || leaveType || type || '-'
}

function getStatusLabel(status?: string | null) {
  const value = normalize(status)

  const map: Record<string, string> = {
    pending: 'Menunggu Approval',
    submitted: 'Diajukan',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    waiting_hr: 'Menunggu HR',
    ready_for_hr: 'Ready for HR',
    finalized: 'Final HR',
  }

  return map[value] || value.replaceAll('_', ' ') || '-'
}

function statusBadgeClass(status?: string | null) {
  const value = normalize(status)

  if (value === 'approved') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (value === 'rejected') {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  if (value === 'pending' || value === 'submitted') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function isSameSupervisor(value: string | null | undefined, supervisor: Employee) {
  const target = normalize(value)

  if (!target) return false

  const options = [
    supervisor.id,
    supervisor.full_name,
    supervisor.name,
    supervisor.employee_name,
    supervisor.employee_number,
    supervisor.nip,
    supervisor.machine_pin,
    supervisor.email,
  ]
    .filter(Boolean)
    .map((item) => normalize(String(item)))

  return options.includes(target)
}

export default function EmployeeLeaveApprovalPage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>()

    employees.forEach((employee) => {
      map.set(employee.id, employee)
    })

    return map
  }, [employees])

  const subordinateIds = useMemo(() => {
    if (!currentEmployee) return new Set<string>()

    const ids = employees
      .filter((employee) => {
        return (
          isSameSupervisor(employee.supervisor_1, currentEmployee) ||
          isSameSupervisor(employee.supervisor_2, currentEmployee)
        )
      })
      .map((employee) => employee.id)

    return new Set(ids)
  }, [employees, currentEmployee])

  const filteredRequests = useMemo(() => {
    const keyword = normalize(search)

    return requests
      .filter((request) => {
        if (!request.employee_id) return false
        return subordinateIds.has(request.employee_id)
      })
      .filter((request) => {
        const status = normalize(request.supervisor_status || request.status)

        if (filterStatus === 'pending') {
          return (
            status === 'pending' ||
            status === 'submitted' ||
            status === '' ||
            status === 'menunggu'
          )
        }

        if (filterStatus === 'approved') return status === 'approved'
        if (filterStatus === 'rejected') return status === 'rejected'

        return true
      })
      .filter((request) => {
        if (!keyword) return true

        const employee = request.employee_id
          ? employeeById.get(request.employee_id)
          : undefined

        const haystack = [
          getRequestEmployeeName(request, employee),
          getEmployeeNumber(employee, request),
          getEmployeeUnit(employee, request),
          getEmployeePosition(employee, request),
          getRequestTypeLabel(request.request_type, request.leave_type),
          request.reason,
          request.job_pending,
          request.handover_to,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(keyword)
      })
      .sort((a, b) => {
        return String(b.created_at || '').localeCompare(String(a.created_at || ''))
      })
  }, [requests, subordinateIds, filterStatus, search, employeeById])

  const stats = useMemo(() => {
    const subordinateRequests = requests.filter((request) => {
      if (!request.employee_id) return false
      return subordinateIds.has(request.employee_id)
    })

    return {
      total: subordinateRequests.length,
      pending: subordinateRequests.filter((item) => {
        const status = normalize(item.supervisor_status || item.status)
        return status === 'pending' || status === 'submitted' || status === ''
      }).length,
      approved: subordinateRequests.filter(
        (item) => normalize(item.supervisor_status || item.status) === 'approved'
      ).length,
      rejected: subordinateRequests.filter(
        (item) => normalize(item.supervisor_status || item.status) === 'rejected'
      ).length,
    }
  }, [requests, subordinateIds])

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

      const { data: appUserData } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle<AppUser>()

      const fallbackUser: AppUser = {
        id: authData.user.id,
        email: authData.user.email || '',
        role: 'employee',
        employee_id: null,
        is_active: true,
      }

      const appUser = appUserData || fallbackUser

      setCurrentUser(appUser)

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true })

      if (employeeError) throw employeeError

      const employeeList = (employeeData || []) as Employee[]

      const matchedEmployee =
        employeeList.find((employee) => employee.id === appUser.employee_id) ||
        employeeList.find(
          (employee) =>
            normalize(employee.email) === normalize(authData.user.email || '')
        ) ||
        null

      setEmployees(employeeList)
      setCurrentEmployee(matchedEmployee)

      const { data: requestData, error: requestError } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (requestError) throw requestError

      setRequests((requestData || []) as LeaveRequest[])
    } catch (error: any) {
      console.error(error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal mengambil data approval cuti, izin, dan PHL.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(request: LeaveRequest) {
    if (!currentEmployee || !currentUser) {
      setMessage({
        type: 'error',
        text: 'Data atasan tidak ditemukan. Silakan login ulang.',
      })
      return
    }

    const note = window.prompt(
      'Catatan approval atasan:',
      'Disetujui oleh atasan.'
    )

    if (note === null) return

    setProcessingId(request.id)
    setMessage(null)

    try {
      const { error } = await supabase.rpc('approve_leave_request_by_supervisor', {
        p_request_id: request.id,
        p_supervisor_id: currentEmployee.id,
        p_supervisor_name: getEmployeeName(currentEmployee),
        p_note: note || 'Disetujui oleh atasan.',
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Pengajuan berhasil disetujui.',
      })

      await fetchData()
    } catch (error: any) {
      console.error(error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal approve pengajuan. Pastikan function approve_leave_request_by_supervisor sudah tersedia.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(request: LeaveRequest) {
    if (!currentEmployee || !currentUser) {
      setMessage({
        type: 'error',
        text: 'Data atasan tidak ditemukan. Silakan login ulang.',
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
      const { error } = await supabase.rpc('reject_leave_request_by_supervisor', {
        p_request_id: request.id,
        p_supervisor_id: currentEmployee.id,
        p_supervisor_name: getEmployeeName(currentEmployee),
        p_note: note,
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Pengajuan berhasil ditolak.',
      })

      await fetchData()
    } catch (error: any) {
      console.error(error)

      setMessage({
        type: 'error',
        text:
          error?.message ||
          'Gagal reject pengajuan. Pastikan function reject_leave_request_by_supervisor sudah tersedia.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/employee/approvals"
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Approval Tim
              </Link>

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Approval Cuti, Izin & PHL
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Approval Cuti, Izin & PHL
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Halaman ini digunakan atasan untuk menyetujui atau menolak
                pengajuan cuti, izin, sakit, tugas luar, dan klaim PHL dari
                bawahan langsung.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-bold">Atasan login:</span>{' '}
            {currentEmployee ? getEmployeeName(currentEmployee) : '-'}
          </div>
        </section>

        {message && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {message.text}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Request" value={stats.total} icon={FileText} />
          <StatCard label="Pending" value={stats.pending} icon={Clock3} />
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
          <StatCard label="Rejected" value={stats.rejected} icon={XCircle} />
        </section>

        <section className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIP, unit, jenis pengajuan..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value as FilterStatus)
              }
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="pending">Menunggu Approval</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="all">Semua Status</option>
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat data approval...
              </div>
            </div>
          ) : !currentEmployee ? (
            <EmptyState
              title="Data atasan tidak ditemukan"
              description="Akun login belum terhubung ke data employee. Pastikan app_users.employee_id atau email employee sudah sesuai."
            />
          ) : subordinateIds.size === 0 ? (
            <EmptyState
              title="Belum ada bawahan terdeteksi"
              description="Pastikan kolom supervisor_1 atau supervisor_2 pada tabel employees berisi nama, email, NIP, atau ID atasan yang sedang login."
            />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title="Belum ada pengajuan"
              description="Tidak ada pengajuan cuti, izin, sakit, tugas luar, atau PHL yang sesuai dengan filter saat ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1300px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-bold">Karyawan</th>
                    <th className="px-5 py-4 font-bold">Jenis</th>
                    <th className="px-5 py-4 font-bold">Tanggal</th>
                    <th className="px-5 py-4 text-center font-bold">Hari</th>
                    <th className="px-5 py-4 font-bold">Alasan</th>
                    <th className="px-5 py-4 font-bold">Pending Job</th>
                    <th className="px-5 py-4 font-bold">Handover</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 text-right font-bold">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => {
                    const employee = request.employee_id
                      ? employeeById.get(request.employee_id)
                      : undefined

                    const status = request.supervisor_status || request.status
                    const isPending =
                      normalize(status) === 'pending' ||
                      normalize(status) === 'submitted' ||
                      normalize(status) === ''

                    const proofUrl =
                      request.proof_file_url ||
                      request.proof_url ||
                      request.attachment_url

                    return (
                      <tr
                        key={request.id}
                        className="border-b border-slate-100 align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-950">
                            {getRequestEmployeeName(request, employee)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            NIP: {getEmployeeNumber(employee, request)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {getEmployeeUnit(employee, request)} ·{' '}
                            {getEmployeePosition(employee, request)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {getRequestTypeLabel(
                              request.request_type,
                              request.leave_type
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {formatDate(request.start_date)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            s.d. {formatDate(request.end_date)}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            Dibuat: {formatDateTime(request.created_at)}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-8 justify-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                            {request.total_days || 0}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[240px] whitespace-pre-wrap text-xs leading-5 text-slate-600">
                            {request.reason || '-'}
                          </div>

                          {proofUrl && (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Bukti
                            </a>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[220px] whitespace-pre-wrap text-xs leading-5 text-slate-600">
                            {request.job_pending || '-'}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[220px] text-xs leading-5 text-slate-600">
                            <div>
                              <span className="font-bold">Ke:</span>{' '}
                              {request.handover_to || '-'}
                            </div>

                            {request.handover_note && (
                              <div className="mt-1 whitespace-pre-wrap">
                                {request.handover_note}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusBadgeClass(
                              status
                            )}`}
                          >
                            {getStatusLabel(status)}
                          </span>

                          {request.supervisor_note && (
                            <div className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">
                              Catatan: {request.supervisor_note}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {isPending ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleReject(request)}
                                disabled={processingId === request.id}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Tolak
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApprove(request)}
                                disabled={processingId === request.id}
                                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processingId === request.id && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )}
                                Setujui
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Sudah diproses
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: any
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
          <Icon className="h-5 w-5" />
        </div>
      </div>
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
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
        <UserCheck className="h-6 w-6" />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-950">{title}</h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}