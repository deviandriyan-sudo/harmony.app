'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plane,
  RefreshCcw,
  UserRound,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type AnyRow = Record<string, any>

type TodayItem = {
  id: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  department: string
  position: string
  category: 'leave' | 'phl_claim' | 'absence'
  categoryLabel: string
  statusLabel: string
  statusTone: 'green' | 'blue' | 'amber' | 'red' | 'slate'
  startDate: string
  endDate: string
  jobPending: string
  handoverTo: string
  source: 'leave_requests' | 'attendance_logs'
}

const categoryMeta = {
  leave: {
    label: 'Cuti',
    empty: 'Tidak ada karyawan cuti hari ini.',
    icon: CalendarDays,
    tone: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  phl_claim: {
    label: 'Klaim PHL',
    empty: 'Tidak ada karyawan klaim PHL hari ini.',
    icon: Plane,
    tone: 'border-violet-100 bg-violet-50 text-violet-700',
  },
  absence: {
    label: 'Tidak Hadir',
    empty: 'Tidak ada data tidak hadir hari ini.',
    icon: AlertTriangle,
    tone: 'border-orange-100 bg-orange-50 text-orange-700',
  },
} as const

function todayISO() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function firstValue(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key]

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }

  return ''
}

function isDateInside(date: string, start: string, end: string) {
  if (!date || !start || !end) return false

  return date >= start && date <= end
}

function getLeaveStart(row: AnyRow) {
  return firstValue(row, [
    'start_date',
    'date_start',
    'leave_start_date',
    'from_date',
    'date_from',
    'request_start_date',
    'period_start',
    'leave_date',
    'request_date',
    'start',
  ])
}

function getLeaveEnd(row: AnyRow) {
  return firstValue(row, [
    'end_date',
    'date_end',
    'leave_end_date',
    'to_date',
    'date_to',
    'request_end_date',
    'period_end',
    'leave_date',
    'request_date',
    'end',
  ])
}

function getEmployeeName(row: AnyRow) {
  return firstValue(row, [
    'full_name',
    'employee_name',
    'name',
    'created_by',
    'email',
  ]) || '-'
}

function getEmployeeNumber(row: AnyRow) {
  return firstValue(row, [
    'employee_number',
    'nip',
    'machine_pin',
    'employee_code',
  ])
}

function getDepartment(row: AnyRow) {
  return firstValue(row, [
    'department',
    'unit',
    'work_unit',
    'division',
  ])
}

function getPosition(row: AnyRow) {
  return firstValue(row, [
    'position',
    'job_position',
    'title',
    'jabatan',
  ])
}

function getRequestType(row: AnyRow) {
  return normalize(
    firstValue(row, [
      'request_type',
      'leave_type',
      'leave_type_code',
      'type',
      'category',
      'absence_request_type',
      'status',
    ]),
  )
}

function getRequestLabel(row: AnyRow) {
  return firstValue(row, [
    'leave_type_label',
    'request_type_label',
    'absence_request_label',
    'type_label',
    'category_label',
  ])
}

function getApprovalStatus(row: AnyRow) {
  return normalize(
    firstValue(row, [
      'approval_status',
      'request_status',
      'status',
      'hr_status',
      'supervisor_status',
      'absence_request_status',
      'supervisor_approval_status',
      'hr_final_status',
    ]),
  )
}

function isInactiveStatus(status: string) {
  return [
    'rejected',
    'ditolak',
    'cancelled',
    'canceled',
    'dibatalkan',
    'draft',
  ].includes(status)
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    approved: 'Disetujui',
    finalized: 'Final',
    ready_for_hr: 'Menunggu HR',
    pending_hr: 'Menunggu HR',
    waiting_supervisor: 'Menunggu Atasan',
    pending_supervisor: 'Menunggu Atasan',
    pending_supervisor_2: 'Menunggu Atasan 2',
    pending: 'Menunggu Approval',
    submitted: 'Diajukan',
  }

  return map[status] || (status ? status.replace(/_/g, ' ') : 'Terdata')
}

function statusTone(status: string): TodayItem['statusTone'] {
  if (['approved', 'finalized'].includes(status)) return 'green'
  if (['pending_hr', 'ready_for_hr'].includes(status)) return 'blue'
  if (['rejected', 'cancelled', 'canceled', 'ditolak'].includes(status)) return 'red'
  if (status) return 'amber'

  return 'slate'
}

function classifyCategory(row: AnyRow): TodayItem['category'] {
  const value = `${getRequestType(row)} ${getRequestLabel(row)}`.toLowerCase()

  if (value.includes('phl')) return 'phl_claim'

  if (
    value.includes('annual_leave') ||
    value.includes('leave') ||
    value.includes('cuti') ||
    value.includes('menstrual') ||
    value.includes('maternity') ||
    value.includes('bereavement') ||
    value.includes('worship')
  ) {
    return 'leave'
  }

  return 'absence'
}

function categoryLabel(row: AnyRow, category: TodayItem['category']) {
  const rawLabel = getRequestLabel(row)
  const rawType = getRequestType(row)

  if (category === 'leave') return rawLabel || 'Cuti'
  if (category === 'phl_claim') return 'Klaim PHL'

  if (rawType.includes('official_travel')) return 'Tugas Luar / Dinas'
  if (rawType.includes('permit')) return 'Izin'
  if (rawType.includes('sick')) return 'Sakit'
  if (rawType.includes('absent') || rawType.includes('alpa')) return 'Tidak Hadir'

  return rawLabel || 'Tidak Hadir'
}

function getJobPending(row: AnyRow) {
  return firstValue(row, [
    'job_pending',
    'pending_job',
    'pending_jobs',
    'pending_task',
    'pending_tasks',
    'work_pending',
    'job_handover',
    'handover_job',
    'work_handover',
    'task_handover',
    'handover_notes',
    'handover_note',
    'job_pending_note',
    'delegation_note',
    'delegation_notes',
    'job_description',
    'description',
  ])
}

function getHandoverTo(row: AnyRow) {
  return firstValue(row, [
    'job_handover_to_name',
    'handover_to_name',
    'delegated_to_name',
    'delegate_to_name',
    'replacement_employee_name',
    'receiver_name',
    'pic_name',
    'backup_person_name',
    'assigned_to_name',
    'job_handover_to',
    'handover_to',
    'delegated_to',
    'delegate_to',
    'replacement_employee',
    'receiver',
    'pic',
    'backup_person',
    'assigned_to',
  ])
}

function mapLeaveRow(row: AnyRow, today: string): TodayItem | null {
  const startDate = getLeaveStart(row)
  const endDate = getLeaveEnd(row) || startDate

  if (!isDateInside(today, startDate, endDate)) return null

  const status = getApprovalStatus(row)

  if (isInactiveStatus(status)) return null

  const category = classifyCategory(row)

  return {
    id: `leave-${row.id || `${getEmployeeName(row)}-${startDate}`}`,
    employeeId: String(row.employee_id || row.employee_number || row.id || ''),
    employeeName: getEmployeeName(row),
    employeeNumber: getEmployeeNumber(row),
    department: getDepartment(row),
    position: getPosition(row),
    category,
    categoryLabel: categoryLabel(row, category),
    statusLabel: statusLabel(status),
    statusTone: statusTone(status),
    startDate,
    endDate,
    jobPending: getJobPending(row),
    handoverTo: getHandoverTo(row),
    source: 'leave_requests',
  }
}

function mapAttendanceRow(row: AnyRow, today: string): TodayItem | null {
  const status = normalize(row.status)
  const absenceType = normalize(row.absence_request_type)
  const combined = `${status} ${absenceType}`

  const shouldShow =
    combined.includes('leave') ||
    combined.includes('cuti') ||
    combined.includes('phl_claim') ||
    combined.includes('sick') ||
    combined.includes('permit') ||
    combined.includes('absent') ||
    combined.includes('alpa') ||
    combined.includes('official_travel')

  if (!shouldShow) return null

  const approvalStatus = normalize(row.hr_final_status || row.supervisor_approval_status || row.absence_request_status)

  if (isInactiveStatus(approvalStatus)) return null

  const category = classifyCategory({
    ...row,
    request_type: absenceType || status,
  })

  return {
    id: `attendance-${row.id || `${getEmployeeName(row)}-${today}`}`,
    employeeId: String(row.employee_id || row.employee_number || row.id || ''),
    employeeName: getEmployeeName(row),
    employeeNumber: getEmployeeNumber(row),
    department: getDepartment(row),
    position: getPosition(row),
    category,
    categoryLabel: categoryLabel(
      {
        ...row,
        request_type: absenceType || status,
        request_type_label: row.absence_request_label,
      },
      category,
    ),
    statusLabel: statusLabel(approvalStatus),
    statusTone: statusTone(approvalStatus),
    startDate: today,
    endDate: today,
    jobPending: getJobPending(row),
    handoverTo: getHandoverTo(row),
    source: 'attendance_logs',
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'HR'
}

function toneClass(tone: TodayItem['statusTone']) {
  const map = {
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    slate: 'border-slate-100 bg-slate-50 text-slate-600',
  }

  return map[tone]
}

export function TodayTeamAvailability() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<TodayItem[]>([])
  const [message, setMessage] = useState('')

  const today = useMemo(() => todayISO(), [])

  const grouped = useMemo(() => {
    return {
      leave: items.filter((item) => item.category === 'leave'),
      phl_claim: items.filter((item) => item.category === 'phl_claim'),
      absence: items.filter((item) => item.category === 'absence'),
    }
  }, [items])

  const total = items.length

  useEffect(() => {
    fetchTodayData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchTodayData() {
    setLoading(true)
    setMessage('')

    try {
      const [leaveResponse, attendanceResponse] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('attendance_logs')
          .select('*')
          .eq('attendance_date', today)
          .is('deleted_at', null)
          .limit(500),
      ])

      if (leaveResponse.error) throw leaveResponse.error
      if (attendanceResponse.error) throw attendanceResponse.error

      const leaveItems = (leaveResponse.data || [])
        .map((row) => mapLeaveRow(row, today))
        .filter(Boolean) as TodayItem[]

      const attendanceItems = (attendanceResponse.data || [])
        .map((row) => mapAttendanceRow(row, today))
        .filter(Boolean) as TodayItem[]

      const seen = new Set<string>()
      const merged = [...leaveItems, ...attendanceItems].filter((item) => {
        const key = `${item.employeeId || item.employeeName}-${item.category}`

        if (seen.has(key)) return false

        seen.add(key)
        return true
      })

      merged.sort((a, b) => {
        return a.employeeName.localeCompare(b.employeeName)
      })

      setItems(merged)
    } catch (error: any) {
      console.error(error)
      setMessage(error?.message || 'Gagal memuat informasi kehadiran hari ini.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[32px] border border-black/5 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            <CalendarDays size={14} />
            Hari ini · {formatDate(today)}
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-tight text-[#1d1d1f] sm:text-2xl">
            Informasi Kehadiran Tim
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
            Daftar karyawan yang sedang cuti, klaim PHL, atau tidak hadir berdasarkan data pengajuan dan konfirmasi absensi.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm">
            <span className="font-bold text-[#1d1d1f]">{total}</span>{' '}
            <span className="text-[#6e6e73]">orang terdata</span>
          </div>

          <button
            type="button"
            onClick={fetchTodayData}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-4 text-sm font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="m-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:m-6">
          {message}
        </div>
      )}

      <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-3">
        <TodayColumn category="leave" items={grouped.leave} loading={loading} />
        <TodayColumn category="phl_claim" items={grouped.phl_claim} loading={loading} />
        <TodayColumn category="absence" items={grouped.absence} loading={loading} />
      </div>
    </section>
  )
}

function TodayColumn({
  category,
  items,
  loading,
}: {
  category: keyof typeof categoryMeta
  items: TodayItem[]
  loading: boolean
}) {
  const meta = categoryMeta[category]
  const Icon = meta.icon

  return (
    <div className="rounded-[28px] border border-black/5 bg-[#f5f5f7]/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${meta.tone}`}>
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[#1d1d1f]">
              {meta.label}
            </h3>
            <p className="text-xs font-semibold text-[#86868b]">
              {items.length} orang
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white p-4 text-sm font-semibold text-[#6e6e73]">
          Memuat data...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white p-4 text-sm leading-6 text-[#6e6e73]">
          {meta.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TodayPersonCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function TodayPersonCard({ item }: { item: TodayItem }) {
  return (
    <article className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm font-bold text-white">
          {initials(item.employeeName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h4 className="break-words text-sm font-bold leading-5 text-[#1d1d1f]">
                {item.employeeName}
              </h4>

              <p className="mt-1 break-words text-xs leading-5 text-[#6e6e73]">
                {[item.employeeNumber, item.department, item.position]
                  .filter(Boolean)
                  .join(' · ') || '-'}
              </p>
            </div>

            <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClass(item.statusTone)}`}>
              {item.statusLabel}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#1d1d1f]">
              <UserRound size={13} />
              {item.categoryLabel}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-[#6e6e73]">
              <Clock3 size={13} />
              {item.startDate === item.endDate
                ? formatDate(item.startDate)
                : `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`}
            </span>
          </div>

          <div className="mt-3 rounded-2xl bg-[#f5f5f7]/85 p-3">
            <div className="flex items-start gap-2">
              <BriefcaseBusiness size={15} className="mt-0.5 shrink-0 text-[#007aff]" />

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                  Job pending
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-[#1d1d1f]">
                  {item.jobPending || 'Belum ada detail job pending.'}
                </p>

                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                  Pengganti / PIC
                </p>
                <p className="mt-1 break-words text-xs leading-5 text-[#1d1d1f]">
                  {item.handoverTo || 'Belum ditentukan.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
