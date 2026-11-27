'use client'


import { readErrorMessage } from '@/lib/error-utils'
import Link from 'next/link'
import { useEffectEvent, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  ChevronDown,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { fetchPHLWorkRequests, type PHLWorkRequest } from '@/lib/phl-work'

import { useAttendancePeriodQuery } from "@/lib/use-attendance-period";
import './approval-rc3c.css'
type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

type Employee = {
  id: string
  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
  is_active: boolean | null
}

type EmployeeAssignment = {
  id: string
  employee_id: string
  employee_number: string | null
  full_name: string | null
  assignment_department: string | null
  assignment_position: string | null
  assignment_type: string | null
  supervisor_1: string | null
  supervisor_2: string | null
  start_date: string | null
  end_date: string | null
  is_primary: boolean | null
  is_active: boolean | null
}

type SupervisorRelation = {
  source: 'homebase' | 'assignment'
  level: 'Atasan 1' | 'Atasan 2'
  assignment_id: string | null
  department: string | null
  position: string | null
  assignment_type: string | null
}

type AttendancePeriodConfirmation = {
  id: string
  employee_id: string

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null

  period_month: string
  period_start: string | null
  period_end: string | null

  employee_status: string | null
  employee_submitted_at: string | null

  supervisor_status: string | null
  supervisor_id: string | null
  supervisor_name: string | null
  supervisor_approved_at: string | null
  supervisor_rejected_at: string | null
  supervisor_note: string | null

  hr_status: string | null
  hr_finalized_at: string | null

  is_locked: boolean | null
  locked_by: string | null
  locked_at: string | null

  created_at: string | null
  updated_at: string | null
}

type LeaveRequest = {
  id: string
  employee_id: string | null

  employee_number: string | null
  machine_pin: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null

  request_category: string | null
  leave_type: string | null
  request_type: string | null

  start_date: string | null
  end_date: string | null
  total_days: number | null

  reason: string | null
  job_pending: string | null
  handover_to: string | null

  status: string | null
  supervisor_status: string | null
  supervisor_name: string | null
  hr_status: string | null

  created_at: string | null
}
type ModuleTone = 'blue' | 'purple' | 'green'

export default function EmployeeApprovalsPage() {
  const [, setAppUser] = useState<AppUser | null>(null)
  const [supervisor, setSupervisor] = useState<Employee | null>(null)
  const [subordinates, setSubordinates] = useState<Employee[]>([])
  const [subordinateRelations, setSubordinateRelations] = useState<
    Map<string, SupervisorRelation[]>
  >(new Map())
  const [employeeAssignments, setEmployeeAssignments] = useState<EmployeeAssignment[]>([])
  const [attendanceConfirmations, setAttendanceConfirmations] = useState<AttendancePeriodConfirmation[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [phlWorkRequests, setPHLWorkRequests] = useState<PHLWorkRequest[]>([])

  const { periodMonth, setPeriodMonth, periodReady } = useAttendancePeriodQuery()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const periodRange = useMemo(() => {
    return getCutoffRange(periodMonth)
  }, [periodMonth])

  const attendanceSummary = useMemo(() => {
    return attendanceConfirmations.reduce(
      (acc, item) => {
        acc.total += 1

        if (normalizeText(item.supervisor_status) === 'pending') acc.pending += 1
        if (normalizeText(item.supervisor_status) === 'approved') acc.approved += 1
        if (normalizeText(item.supervisor_status) === 'rejected') acc.rejected += 1
        if (item.is_locked) acc.locked += 1

        return acc
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        locked: 0,
      }
    )
  }, [attendanceConfirmations])

  const leaveSummary = useMemo(() => {
    return leaveRequests.reduce(
      (acc, item) => {
        acc.total += 1

        if (normalizeText(item.supervisor_status) === 'pending') acc.pending += 1
        if (normalizeText(item.supervisor_status) === 'approved') acc.approved += 1
        if (normalizeText(item.supervisor_status) === 'rejected') acc.rejected += 1

        return acc
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    )
  }, [leaveRequests])

  const phlWorkSummary = useMemo(() => ({
    total: phlWorkRequests.length,
    pending: phlWorkRequests.filter((item) => item.status === 'pending_supervisor').length,
    approved: phlWorkRequests.filter((item) => item.status === 'approved').length,
    rejected: phlWorkRequests.filter((item) => item.status === 'rejected').length,
  }), [phlWorkRequests])

  const onPeriodLoad = useEffectEvent(fetchData)
  useEffect(() => {
    if (!periodReady) return
    onPeriodLoad()
  }, [periodMonth, periodReady])

  async function fetchData() {
    setLoading(true)
    setErrorMessage('')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      setErrorMessage('Session user belum ditemukan. Silakan login ulang.')
      setLoading(false)
      return
    }

    const { data: appUserData, error: appUserError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    if (appUserError) {
      setErrorMessage(appUserError.message)
      setLoading(false)
      return
    }

    if (!appUserData?.employee_id) {
      setErrorMessage('Akun belum terhubung ke data employee.')
      setLoading(false)
      return
    }

    setAppUser(appUserData)

    const { data: supervisorData, error: supervisorError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', appUserData.employee_id)
      .maybeSingle<Employee>()

    if (supervisorError) {
      setErrorMessage(supervisorError.message)
      setLoading(false)
      return
    }

    if (!supervisorData) {
      setErrorMessage('Data atasan tidak ditemukan.')
      setLoading(false)
      return
    }

    setSupervisor(supervisorData)

    const [employeeResult, assignmentResult] = await Promise.all([
      supabase
        .from('harmony_employee_directory')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('harmony_assignment_directory')
        .select(
          'id,employee_id,employee_number,full_name,assignment_department,assignment_position,assignment_type,supervisor_1,supervisor_2,start_date,end_date,is_primary,is_active'
        )
        .eq('is_active', true),
    ])

    if (employeeResult.error) {
      setErrorMessage(employeeResult.error.message)
      setLoading(false)
      return
    }

    if (assignmentResult.error) {
      setErrorMessage(assignmentResult.error.message)
      setLoading(false)
      return
    }

    const employeeList = (employeeResult.data || []) as Employee[]
    const assignmentList = (assignmentResult.data || []) as EmployeeAssignment[]
    const relationMap = buildSubordinateRelationMap(
      supervisorData,
      employeeList,
      assignmentList
    )

    const subordinateList = employeeList.filter((employee) =>
      relationMap.has(employee.id)
    )

    setSubordinates(subordinateList)
    setSubordinateRelations(relationMap)
    setEmployeeAssignments(assignmentList)

    if (subordinateList.length === 0) {
      setSubordinateRelations(new Map())
      setAttendanceConfirmations([])
      setLeaveRequests([])
      setPHLWorkRequests([])
      setLoading(false)
      return
    }

    const subordinateIds = subordinateList.map((item) => item.id)

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_period_confirmations')
      .select('*')
      .in('employee_id', subordinateIds)
      .eq('period_month', periodMonth)
      .order('employee_submitted_at', { ascending: false })

    if (attendanceError) {
      setErrorMessage(attendanceError.message)
      setAttendanceConfirmations([])
    } else {
      setAttendanceConfirmations(attendanceData || [])
    }

    const [leaveResult, phlResult] = await Promise.all([
      supabase
        .from('leave_requests')
        .select('*')
        .in('employee_id', subordinateIds)
        .neq('request_type', 'phl_claim')
        .order('created_at', { ascending: false }),
      supabase.rpc('harmony_supervisor_get_phl_claims_v1'),
    ])

    if (leaveResult.error) {
      setErrorMessage(leaveResult.error.message)
      setLeaveRequests([])
    } else {
      const canonicalPHL = phlResult.error
        ? []
        : (((phlResult.data || []) as unknown) as LeaveRequest[])

      setLeaveRequests([
        ...((leaveResult.data || []) as LeaveRequest[]),
        ...canonicalPHL,
      ])
    }

    try {
      setPHLWorkRequests(await fetchPHLWorkRequests('team'))
    } catch (phlError: unknown) {
      setErrorMessage(readErrorMessage(phlError) || 'Data approval PHL kerja gagal dimuat.')
      setPHLWorkRequests([])
    }

    setLoading(false)
  }

  return (
    <>
      <Topbar
        title="Approval Tim"
        description="Persetujuan absensi, cuti, dan PHL bawahan."
      />

      <section className="harmony-supervisor-dashboard harmony-approval-unslop space-y-4 p-4 sm:p-5">
        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <ApprovalLiquidToolbar
          periodMonth={periodMonth}
          periodStart={periodRange.start}
          periodEnd={periodRange.end}
          loading={loading}
          attendanceTotal={attendanceSummary.total}
          attendancePending={attendanceSummary.pending}
          subordinateCount={subordinates.length}
          leavePending={leaveSummary.pending}
          phlPending={phlWorkSummary.pending}
          onMonthChange={setPeriodMonth}
          onRefresh={fetchData}
        />

        <div className="harmony-approval-module-grid">
          <ApprovalModuleCard
            title="Approval Absensi"
            description="Konfirmasi absensi bawahan untuk periode terpilih."
            href={`/employee/approvals/attendance?period=${encodeURIComponent(periodMonth)}`}
            icon={<CalendarCheck size={25} />}
            tone="blue"
            metrics={[
              {
                label: 'Total Submit',
                value: attendanceSummary.total,
              },
              {
                label: 'Pending',
                value: attendanceSummary.pending,
              },
              {
                label: 'Approved',
                value: attendanceSummary.approved,
              },
              {
                label: 'Locked',
                value: attendanceSummary.locked,
              },
            ]}
            highlights={[
              'Approval absensi per periode',
              'Detail harian, bukti, dan keterangan',
              'PHL approved hanya tampil sebagai hasil workflow PHL terpisah',
            ]}
          />

          <ApprovalModuleCard
            title="Approval Cuti & Izin"
            description="Tinjau cuti, izin, sakit, tugas luar, dan penggunaan saldo PHL."
            href="/employee/approvals/leave"
            icon={<FileText size={25} />}
            tone="purple"
            metrics={[
              {
                label: 'Total Request',
                value: leaveSummary.total,
              },
              {
                label: 'Pending',
                value: leaveSummary.pending,
              },
              {
                label: 'Approved',
                value: leaveSummary.approved,
              },
              {
                label: 'Rejected',
                value: leaveSummary.rejected,
              },
            ]}
            highlights={[
              'Approval cuti, izin, sakit, tugas luar',
              'Klaim penggunaan saldo PHL tetap di workflow cuti',
              'Approval atasan meneruskan request ke HR',
            ]}
          />

          <ApprovalModuleCard
            title="Approval PHL Kerja"
            description="Setujui penugasan PHL sesuai bukti dan durasi kerja."
            href={`/employee/approvals/phl?status=${phlWorkSummary.pending > 0 ? 'pending' : 'all'}`}
            metricHref={(label) => `/employee/approvals/phl?status=${
              label === 'Total Request' ? 'all' : label.toLowerCase()
            }`}
            icon={<WalletCards size={25} />}
            tone="green"
            metrics={[
              { label: 'Total Request', value: phlWorkSummary.total },
              { label: 'Pending', value: phlWorkSummary.pending },
              { label: 'Approved', value: phlWorkSummary.approved },
              { label: 'Rejected', value: phlWorkSummary.rejected },
            ]}
            highlights={[
              'Terpisah dari cutoff absensi',
              'Minimal 4 jam kerja tercatat + evidence',
              'Approve atasan langsung membentuk saldo 90 hari',
            ]}
          />
        </div>

        <SubordinateOrgChart
          supervisor={supervisor}
          employees={subordinates}
          relations={subordinateRelations}
          assignments={employeeAssignments}
          loading={loading}
        />

      </section>
    </>
  )
}

function ApprovalLiquidToolbar({
  periodMonth,
  periodStart,
  periodEnd,
  loading,
  attendanceTotal,
  attendancePending,
  subordinateCount,
  leavePending,
  phlPending,
  onMonthChange,
  onRefresh,
}: {
  periodMonth: string
  periodStart: string
  periodEnd: string
  loading: boolean
  attendanceTotal: number
  attendancePending: number
  subordinateCount: number
  leavePending: number
  phlPending: number
  onMonthChange: (value: string) => void
  onRefresh: () => void
}) {
  const approvalNormalizedPeriod = /^\d{4}-\d{2}$/.test(periodMonth)
    ? periodMonth
    : getCurrentPeriodMonth()
  const [approvalSelectedYear, approvalSelectedMonth] = approvalNormalizedPeriod.split('-')
  const approvalCurrentYear = new Date().getFullYear()
  const approvalStartYear = 2020
  const approvalMaxYear = Math.max(approvalCurrentYear + 5, Number(approvalSelectedYear) || approvalCurrentYear)
  const approvalYearOptions = Array.from(
    { length: approvalMaxYear - approvalStartYear + 1 },
    (_, index) => approvalStartYear + index,
  )

  return (
    <div className="harmony-approval-toolbar" role="group" aria-label="Kontrol approval tim">
      <div className="harmony-approval-toolbar-pills">
        <span className="harmony-approval-toolbar-pill is-period">
          <Clock3 size={15} aria-hidden="true" />
          {formatDisplayDate(periodStart)} – {formatDisplayDate(periodEnd)}
        </span>
        <span className="harmony-approval-toolbar-pill is-blue">{subordinateCount} bawahan aktif</span>
        <span className="harmony-approval-toolbar-pill is-gold">{attendancePending} / {attendanceTotal} submit</span>
        <span className="harmony-approval-toolbar-pill is-violet">{leavePending} cuti pending</span>
        <span className="harmony-approval-toolbar-pill is-green">{phlPending} PHL pending</span>
      </div>

      <div className="harmony-approval-toolbar-controls">
        <label>
          <span className="sr-only">Bulan periode absensi</span>
          <select
            aria-label="Bulan periode absensi"
            value={approvalSelectedMonth}
            onChange={(event) => onMonthChange(`${approvalSelectedYear}-${event.target.value}`)}
            className="harmony-input"
          >
            {[
              ['01','Januari'],['02','Februari'],['03','Maret'],['04','April'],
              ['05','Mei'],['06','Juni'],['07','Juli'],['08','Agustus'],
              ['09','September'],['10','Oktober'],['11','November'],['12','Desember'],
            ].map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="harmony-approval-toolbar-year">
          <span className="sr-only">Tahun periode absensi</span>
          <select
            aria-label="Tahun periode absensi"
            value={approvalSelectedYear}
            onChange={(event) => onMonthChange(`${event.target.value}-${approvalSelectedMonth}`)}
            className="harmony-input"
          >
            {approvalYearOptions.map((year) => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>
        </label>

        <button type="button" onClick={onRefresh} disabled={loading} className="harmony-approval-refresh">
          {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCcw size={16} aria-hidden="true" />}
          Refresh
        </button>
      </div>
    </div>
  )
}

function SubordinateOrgChart({
  supervisor,
  employees,
  relations,
  assignments,
  loading,
}: {
  supervisor: Employee | null
  employees: Employee[]
  relations: Map<string, SupervisorRelation[]>
  assignments: EmployeeAssignment[]
  loading: boolean
}) {
  const today = formatDateToISO(new Date())

  const activeAssignmentsByEmployee = new Map<string, EmployeeAssignment[]>()

  assignments.forEach((assignment) => {
    if (!isAssignmentEffective(assignment, today)) return

    const current = activeAssignmentsByEmployee.get(assignment.employee_id) || []
    activeAssignmentsByEmployee.set(assignment.employee_id, [...current, assignment])
  })
  return (
    <details className="harmony-card harmony-approval-directory">
      <summary className="harmony-approval-directory-summary">
        <div className="harmony-approval-directory-title">
          <span className="harmony-approval-directory-icon" aria-hidden="true"><UsersRound size={18} /></span>
          <div>
            <h2>Bawahan terhubung</h2>
            <p>Struktur supervisor dan jabatan tambahan</p>
          </div>
        </div>
        <div className="harmony-approval-directory-trailing">
          <span className="harmony-approval-directory-count">{employees.length} aktif</span>
          <span className="harmony-approval-directory-expand">Lihat struktur <ChevronDown size={16} aria-hidden="true" /></span>
        </div>
      </summary>
      <div className="harmony-approval-directory-content">
      {loading ? (
        <div className="flex items-center gap-3 p-6 text-sm harmony-text-secondary">
          <Loader2 size={18} className="animate-spin" />
          Memuat struktur bawahan...
        </div>
      ) : employees.length === 0 ? (
        <div className="p-6">
          <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white harmony-text-link shadow-sm">
              <UsersRound size={24} />
            </div>

            <h3 className="mt-5 text-lg font-semibold harmony-text-primary">
              Belum ada bawahan terhubung
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 harmony-text-secondary">
              Pastikan supervisor homebase atau supervisor pada jabatan tambahan
              aktif menunjuk ke atasan yang sesuai.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 lg:p-6">
          <div className="flex justify-center">
            <OrgSupervisorNode supervisor={supervisor} />
          </div>

          <div className="mx-auto h-8 w-px bg-black/10" />

          <div className="relative mx-auto max-w-6xl">
            <div className="absolute left-4 right-4 top-0 hidden h-px bg-black/10 sm:block" />

            <div className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {employees.map((employee) => (
                <div key={employee.id} className="relative">
                  <div className="absolute left-1/2 top-[-24px] hidden h-6 w-px bg-black/10 sm:block" />
                  <OrgEmployeeNode
                    employee={employee}
                    relations={relations.get(employee.id) || []}
                    assignments={activeAssignmentsByEmployee.get(employee.id) || []}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </details>
  )
}

function OrgSupervisorNode({
  supervisor,
}: {
  supervisor: Employee | null
}) {
  return (
    <div className="w-full max-w-xl rounded-[30px] border border-black/5 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
          <ShieldCheck size={21} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-white/45">
            Atasan / Supervisor
          </p>
          <h3 className="mt-1 break-words text-lg font-semibold leading-6 text-white">
            {supervisor?.full_name || supervisor?.email || '-'}
          </h3>
          <p className="mt-1 break-words text-xs leading-5 text-white/55">
            {supervisor?.employee_number || '-'} · {supervisor?.department || '-'}
          </p>
          <p className="mt-1 break-words text-xs leading-5 text-white/45">
            {supervisor?.position || '-'}
          </p>
        </div>
      </div>
    </div>
  )
}

function OrgEmployeeNode({
  employee,
  relations,
  assignments,
}: {
  employee: Employee
  relations: SupervisorRelation[]
  assignments: EmployeeAssignment[]
}) {
  const relationLabel = getSupervisorRelationLabel(relations)

  return (
    <div className="h-full rounded-[28px] border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] harmony-text-link">
          <UserRound size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-bold harmony-text-secondary">
              {relationLabel}
            </span>

            {assignments.length > 0 && (
              <span className="inline-flex rounded-full bg-[#f7edfc] px-2.5 py-1 text-[11px] font-bold harmony-text-violet">
                Jabatan Tambahan
              </span>
            )}

            {employee.is_active && (
              <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                Aktif
              </span>
            )}
          </div>

          <h3 className="mt-3 break-words text-sm font-bold leading-5 harmony-text-primary">
            {employee.full_name || '-'}
          </h3>

          <p className="mt-1 break-words text-xs leading-5 harmony-text-secondary">
            {employee.employee_number || '-'} · {employee.department || '-'}
          </p>

          <p className="mt-1 break-words text-xs leading-5 harmony-text-muted">
            {employee.position || '-'}
          </p>

          {assignments.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
              {assignments.map((assignment) => {
                const assignmentRelations = relations.filter(
                  (relation) =>
                    relation.source === 'assignment' &&
                    relation.assignment_id === assignment.id
                )
                const assignmentLevel = getSupervisorRelationLabel(assignmentRelations)

                return (
                  <div
                    key={assignment.id}
                    className="rounded-2xl bg-[#f7f3fb] px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide harmony-text-violet">
                        Jabatan Tambahan
                      </span>

                      {assignmentRelations.length > 0 && (
                        <span className="text-[10px] font-semibold harmony-text-muted">
                          {assignmentLevel}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 break-words text-xs font-semibold leading-5 harmony-text-primary">
                      {assignment.assignment_position || '-'}
                    </p>
                    <p className="mt-0.5 break-words text-[11px] leading-4 harmony-text-secondary">
                      {assignment.assignment_department || '-'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ApprovalModuleCard({
  title,
  description,
  href,
  icon,
  tone,
  metrics,
  highlights,
  metricHref,
}: {
  title: string
  description: string
  href: string
  icon: ReactNode
  tone: ModuleTone
  metrics: {
    label: string
    value: number
  }[]
  highlights: string[]
  metricHref?: (label: string) => string
}) {
  return (
    <article className={`harmony-approval-module harmony-approval-module-${tone}`}>
      <div className="harmony-approval-module-header">
        <div className="harmony-approval-module-identity">
          <span className="harmony-approval-module-icon" aria-hidden="true">{icon}</span>
          <div className="min-w-0">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        <Link href={href} className="harmony-approval-module-open" aria-label={`Buka modul ${title}`}>
          Buka <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="harmony-approval-module-metrics">
        {metrics.map((item) => (
          <Link
            key={item.label}
            href={metricHref ? metricHref(item.label) : href}
            aria-label={`Lihat ${item.label}: ${item.value} - ${title}`}
            className={`harmony-approval-module-metric${item.label === 'Pending' ? ' is-pending' : ''}`}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Link>
        ))}
      </div>
      <details className="harmony-approval-module-details">
        <summary>Alur dan ketentuan <ChevronDown size={14} aria-hidden="true" /></summary>
        <div className="harmony-approval-module-details-body">
          {highlights.map((item) => (
            <div key={item} className="harmony-approval-module-highlight">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </details>
    </article>
  )
}

function supervisorIdentitySet(supervisor: Employee | null) {
  if (!supervisor) return new Set<string>()

  return new Set(
    [
      supervisor.id,
      supervisor.full_name,
      supervisor.employee_number,
      supervisor.machine_pin,
      supervisor.email,
    ]
      .map(normalizeText)
      .filter(Boolean)
  )
}

function matchesSupervisor(
  value: string | null | undefined,
  supervisor: Employee | null
) {
  const target = normalizeText(value)
  return Boolean(target && supervisorIdentitySet(supervisor).has(target))
}

function isAssignmentEffective(assignment: EmployeeAssignment, today: string) {
  if (assignment.is_active === false || assignment.is_primary === true) {
    return false
  }

  const startDate = String(assignment.start_date || '').slice(0, 10)
  const endDate = String(assignment.end_date || '').slice(0, 10)

  if (startDate && startDate > today) return false
  if (endDate && endDate < today) return false

  return true
}

function buildSubordinateRelationMap(
  supervisor: Employee,
  employees: Employee[],
  assignments: EmployeeAssignment[]
) {
  const today = formatDateToISO(new Date())
  const result = new Map<string, SupervisorRelation[]>()
  const employeeIds = new Set(employees.map((employee) => employee.id))

  const append = (employeeId: string, relation: SupervisorRelation) => {
    const existing = result.get(employeeId) || []

    const duplicate = existing.some(
      (item) =>
        item.source === relation.source &&
        item.level === relation.level &&
        item.assignment_id === relation.assignment_id
    )

    if (!duplicate) {
      result.set(employeeId, [...existing, relation])
    }
  }

  employees.forEach((employee) => {
    if (employee.id === supervisor.id) return

    if (matchesSupervisor(employee.supervisor_1, supervisor)) {
      append(employee.id, {
        source: 'homebase',
        level: 'Atasan 1',
        assignment_id: null,
        department: employee.department,
        position: employee.position,
        assignment_type: null,
      })
    }

    if (matchesSupervisor(employee.supervisor_2, supervisor)) {
      append(employee.id, {
        source: 'homebase',
        level: 'Atasan 2',
        assignment_id: null,
        department: employee.department,
        position: employee.position,
        assignment_type: null,
      })
    }
  })

  assignments.forEach((assignment) => {
    if (!isAssignmentEffective(assignment, today)) return
    if (!employeeIds.has(assignment.employee_id)) return
    if (assignment.employee_id === supervisor.id) return

    if (matchesSupervisor(assignment.supervisor_1, supervisor)) {
      append(assignment.employee_id, {
        source: 'assignment',
        level: 'Atasan 1',
        assignment_id: assignment.id,
        department: assignment.assignment_department,
        position: assignment.assignment_position,
        assignment_type: assignment.assignment_type,
      })
    }

    if (matchesSupervisor(assignment.supervisor_2, supervisor)) {
      append(assignment.employee_id, {
        source: 'assignment',
        level: 'Atasan 2',
        assignment_id: assignment.id,
        department: assignment.assignment_department,
        position: assignment.assignment_position,
        assignment_type: assignment.assignment_type,
      })
    }
  })

  return result
}

function getSupervisorRelationLabel(relations: SupervisorRelation[]) {
  const levels = Array.from(new Set(relations.map((relation) => relation.level)))

  if (levels.length > 1) return 'Atasan 1 & 2'
  return levels[0] || 'Bawahan'
}

function getCurrentPeriodMonth() {
  const today = new Date()
  const day = today.getDate()
  const period = new Date(today)

  if (day <= 10) {
    period.setMonth(period.getMonth() - 1)
  }

  const periodMonth = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`

  return periodMonth < '2026-01' ? '2026-01' : periodMonth
}

function getCutoffRange(periodMonth: string) {
  const [yearText, monthText] = periodMonth.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  const start = new Date(year, month - 1, 11)
  const end = new Date(year, month, 10)

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  }
}

function formatDateToISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}