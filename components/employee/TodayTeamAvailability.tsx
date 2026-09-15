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

type EmployeeDirectoryEntry = {
  id: string
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
  email?: string | null
  is_active?: boolean | null
}

type TeamHistoryItem = {
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
  source: 'leave_requests' | 'phl_records' | 'attendance_logs'
}

type MonthOption = {
  value: string
  label: string
}

const categoryMeta = {
  leave: {
    label: 'Cuti',
    emptyLabel: (period: string) => `Tidak ada karyawan cuti pada ${period}.`,
    icon: CalendarDays,
    tone: 'border-blue-100 bg-blue-50 text-blue-700',
  },
  phl_claim: {
    label: 'Klaim PHL',
    emptyLabel: (period: string) => `Tidak ada karyawan klaim PHL pada ${period}.`,
    icon: Plane,
    tone: 'border-violet-100 bg-violet-50 text-violet-700',
  },
  absence: {
    label: 'Tidak Hadir',
    emptyLabel: (period: string) => `Tidak ada data tidak hadir pada ${period}.`,
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

function currentMonthKey() {
  return todayISO().slice(0, 7)
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

function formatMonthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  const label = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function getMonthRange(monthKey: string) {
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const lastDay = new Date(year, month, 0).getDate()

  return {
    start: `${yearText}-${monthText}-01`,
    end: `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`,
  }
}

function monthKeyFromDate(value?: string | null) {
  const text = String(value || '').trim()
  const matched = text.match(/^(\d{4})-(\d{2})/)
  return matched ? `${matched[1]}-${matched[2]}` : ''
}

function buildMonthOptions(earliestMonth?: string | null) {
  const current = currentMonthKey()
  const fallbackDate = new Date()
  fallbackDate.setMonth(fallbackDate.getMonth() - 11)

  const fallback = `${fallbackDate.getFullYear()}-${String(
    fallbackDate.getMonth() + 1,
  ).padStart(2, '0')}`

  const startKey = earliestMonth && /^\d{4}-\d{2}$/.test(earliestMonth)
    ? earliestMonth
    : fallback

  const [startYear, startMonth] = startKey.split('-').map(Number)
  const [currentYear, currentMonth] = current.split('-').map(Number)

  const startIndex = startYear * 12 + (startMonth - 1)
  const currentIndex = currentYear * 12 + (currentMonth - 1)
  const safeStartIndex = Math.min(startIndex, currentIndex)

  const options: MonthOption[] = []

  for (let index = currentIndex; index >= safeStartIndex; index -= 1) {
    const year = Math.floor(index / 12)
    const month = (index % 12) + 1
    const value = `${year}-${String(month).padStart(2, '0')}`

    options.push({
      value,
      label: formatMonthLabel(value),
    })
  }

  return options
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

function rangesOverlap(
  start: string,
  end: string,
  periodStart: string,
  periodEnd: string,
) {
  if (!start) return false

  const safeEnd = end || start
  return start <= periodEnd && safeEnd >= periodStart
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
    waiting_hr: 'Menunggu HR',
    pending_hr: 'Menunggu HR',
    waiting_supervisor: 'Menunggu Atasan',
    pending_supervisor: 'Menunggu Atasan',
    pending_supervisor_2: 'Menunggu Atasan 2',
    pending: 'Menunggu Approval',
    submitted: 'Diajukan',
  }

  return map[status] || (status ? status.replace(/_/g, ' ') : 'Terdata')
}

function statusTone(status: string): TeamHistoryItem['statusTone'] {
  if (['approved', 'finalized'].includes(status)) return 'green'
  if (['pending_hr', 'ready_for_hr', 'waiting_hr'].includes(status)) return 'blue'
  if (['rejected', 'cancelled', 'canceled', 'ditolak'].includes(status)) return 'red'
  if (status) return 'amber'

  return 'slate'
}

function classifyCategory(row: AnyRow): TeamHistoryItem['category'] {
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

function categoryLabel(row: AnyRow, category: TeamHistoryItem['category']) {
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

function looksLikeUuid(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  )
}

function findEmployeeByReference(
  directory: EmployeeDirectoryEntry[],
  reference?: string | null,
) {
  const target = normalize(reference)
  if (!target) return null

  return (
    directory.find((employee) => {
      return [
        employee.id,
        employee.employee_number,
        employee.machine_pin,
        employee.email,
        employee.full_name,
      ].some((value) => normalize(value) === target)
    }) || null
  )
}

function getHandoverTo(
  row: AnyRow,
  directory: EmployeeDirectoryEntry[] = [],
) {
  const directName = firstValue(row, [
    'handover_to_full_name',
    'job_handover_to_name',
    'handover_to_name',
    'delegated_to_name',
    'delegate_to_name',
    'replacement_employee_name',
    'receiver_name',
    'pic_name',
    'backup_person_name',
    'assigned_to_name',
  ])

  if (directName && !looksLikeUuid(directName)) return directName

  const references = [
    row?.handover_to_employee_id,
    row?.handover_to_employee_number,
    row?.job_handover_to,
    row?.handover_to,
    row?.delegated_to,
    row?.delegate_to,
    row?.replacement_employee,
    row?.receiver,
    row?.pic,
    row?.backup_person,
    row?.assigned_to,
  ]

  for (const reference of references) {
    const matched = findEmployeeByReference(directory, reference)
    if (matched?.full_name) return matched.full_name
  }

  const legacyText = references
    .map((value) => String(value || '').trim())
    .find((value) => value && !looksLikeUuid(value))

  return legacyText || ''
}

function mapLeaveRow(
  row: AnyRow,
  periodStart: string,
  periodEnd: string,
  directory: EmployeeDirectoryEntry[],
): TeamHistoryItem | null {
  const startDate = getLeaveStart(row)
  const endDate = getLeaveEnd(row) || startDate

  if (!rangesOverlap(startDate, endDate, periodStart, periodEnd)) return null

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
    handoverTo: getHandoverTo(row, directory),
    source: 'leave_requests',
  }
}

function mapPHLClaimRow(
  row: AnyRow,
  periodStart: string,
  periodEnd: string,
  directory: EmployeeDirectoryEntry[],
): TeamHistoryItem | null {
  if (normalize(row.source) !== 'employee_phl_claim') return null

  const startDate = firstValue(row, ['claim_start_date', 'phl_date'])
  const endDate = firstValue(row, ['claim_end_date', 'phl_date']) || startDate

  if (!rangesOverlap(startDate, endDate, periodStart, periodEnd)) return null

  const status = normalize(row.hr_status || row.supervisor_status || row.status)
  if (isInactiveStatus(status)) return null

  return {
    id: `phl-${row.id || `${getEmployeeName(row)}-${startDate}`}`,
    employeeId: String(row.employee_id || row.employee_number || row.id || ''),
    employeeName: getEmployeeName(row),
    employeeNumber: getEmployeeNumber(row),
    department: getDepartment(row),
    position: getPosition(row),
    category: 'phl_claim',
    categoryLabel: 'Klaim PHL',
    statusLabel: statusLabel(status),
    statusTone: statusTone(status),
    startDate,
    endDate,
    jobPending: firstValue(row, [
      'job_pending_summary',
      'job_pending',
      'pending_job',
      'handover_note',
      'notes',
    ]),
    handoverTo: getHandoverTo(row, directory),
    source: 'phl_records',
  }
}

function mapAttendanceRow(
  row: AnyRow,
  periodStart: string,
  periodEnd: string,
  directory: EmployeeDirectoryEntry[],
): TeamHistoryItem | null {
  const attendanceDate = firstValue(row, ['attendance_date'])

  if (!isDateInside(attendanceDate, periodStart, periodEnd)) return null

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

  const approvalStatus = normalize(
    row.hr_final_status ||
      row.supervisor_approval_status ||
      row.absence_request_status,
  )

  if (isInactiveStatus(approvalStatus)) return null

  const category = classifyCategory({
    ...row,
    request_type: absenceType || status,
  })

  return {
    id: `attendance-${row.id || `${getEmployeeName(row)}-${attendanceDate}`}`,
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
    startDate: attendanceDate,
    endDate: attendanceDate,
    jobPending: getJobPending(row),
    handoverTo: getHandoverTo(row, directory),
    source: 'attendance_logs',
  }
}

function sameEmployee(a: TeamHistoryItem, b: TeamHistoryItem) {
  const aId = normalize(a.employeeId)
  const bId = normalize(b.employeeId)

  if (aId && bId && aId === bId) return true

  return normalize(a.employeeName) === normalize(b.employeeName)
}

function isCoveredByCanonicalRequest(
  attendanceItem: TeamHistoryItem,
  requestItems: TeamHistoryItem[],
) {
  return requestItems.some((requestItem) => {
    return (
      requestItem.category === attendanceItem.category &&
      sameEmployee(requestItem, attendanceItem) &&
      isDateInside(
        attendanceItem.startDate,
        requestItem.startDate,
        requestItem.endDate,
      )
    )
  })
}

function personKey(item: TeamHistoryItem) {
  return normalize(item.employeeId) || normalize(item.employeeName)
}

function uniquePersonCount(items: TeamHistoryItem[]) {
  return new Set(items.map(personKey).filter(Boolean)).size
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'HR'
  )
}

function toneClass(tone: TeamHistoryItem['statusTone']) {
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
  const [items, setItems] = useState<TeamHistoryItem[]>([])
  const [message, setMessage] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey())
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>(() =>
    buildMonthOptions(),
  )

  const monthRange = useMemo(
    () => getMonthRange(selectedMonth),
    [selectedMonth],
  )

  const periodLabel = useMemo(
    () => formatMonthLabel(selectedMonth),
    [selectedMonth],
  )

  const grouped = useMemo(() => {
    return {
      leave: items.filter((item) => item.category === 'leave'),
      phl_claim: items.filter((item) => item.category === 'phl_claim'),
      absence: items.filter((item) => item.category === 'absence'),
    }
  }, [items])

  const totalPeople = useMemo(() => uniquePersonCount(items), [items])
  const isCurrentMonth = selectedMonth === currentMonthKey()

  useEffect(() => {
    fetchAvailableMonths()
  }, [])

  useEffect(() => {
    fetchMonthData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  async function fetchAvailableMonths() {
    try {
      const [leaveEarliest, phlEarliest, attendanceEarliest] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('start_date')
          .not('start_date', 'is', null)
          .order('start_date', { ascending: true })
          .limit(1),
        supabase
          .from('phl_records')
          .select('phl_date,created_at')
          .eq('source', 'employee_phl_claim')
          .order('created_at', { ascending: true })
          .limit(1),
        supabase
          .from('attendance_logs')
          .select('attendance_date')
          .is('deleted_at', null)
          .order('attendance_date', { ascending: true })
          .limit(1),
      ])

      const candidates = [
        monthKeyFromDate((leaveEarliest.data?.[0] as AnyRow | undefined)?.start_date),
        monthKeyFromDate((phlEarliest.data?.[0] as AnyRow | undefined)?.phl_date),
        monthKeyFromDate((attendanceEarliest.data?.[0] as AnyRow | undefined)?.attendance_date),
      ].filter(Boolean)

      if (candidates.length === 0) return

      candidates.sort()
      setMonthOptions(buildMonthOptions(candidates[0]))
    } catch (error) {
      console.warn('Periode histori tim tidak dapat diperluas otomatis:', error)
    }
  }

  async function fetchMonthData() {
    setLoading(true)
    setMessage('')

    try {
      const [
        leaveResponse,
        phlResponse,
        attendanceResponse,
        employeeDirectoryResponse,
      ] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*')
          .lte('start_date', monthRange.end)
          .or(`end_date.gte.${monthRange.start},end_date.is.null`)
          .order('start_date', { ascending: false }),
        supabase
          .from('phl_records')
          .select('*')
          .eq('source', 'employee_phl_claim')
          .order('created_at', { ascending: false }),
        supabase
          .from('attendance_logs')
          .select('*')
          .gte('attendance_date', monthRange.start)
          .lte('attendance_date', monthRange.end)
          .is('deleted_at', null)
          .order('attendance_date', { ascending: false }),
        supabase
          .from('employees')
          .select(
            'id,employee_number,machine_pin,full_name,department,position,email,is_active',
          )
          .eq('is_active', true)
          .limit(1000),
      ])

      if (leaveResponse.error) throw leaveResponse.error
      if (phlResponse.error) throw phlResponse.error
      if (attendanceResponse.error) throw attendanceResponse.error

      if (employeeDirectoryResponse.error) {
        console.warn(
          'Direktori karyawan untuk resolusi PIC tidak dapat dimuat:',
          employeeDirectoryResponse.error.message,
        )
      }

      const employeeDirectory = (
        employeeDirectoryResponse.data || []
      ) as EmployeeDirectoryEntry[]

      const leaveItems = (leaveResponse.data || [])
        .filter((row: AnyRow) => normalize(row.request_type) !== 'phl_claim')
        .map((row) =>
          mapLeaveRow(
            row,
            monthRange.start,
            monthRange.end,
            employeeDirectory,
          ),
        )
        .filter(Boolean) as TeamHistoryItem[]

      const phlItems = (phlResponse.data || [])
        .map((row) =>
          mapPHLClaimRow(
            row,
            monthRange.start,
            monthRange.end,
            employeeDirectory,
          ),
        )
        .filter(Boolean) as TeamHistoryItem[]

      const canonicalRequestItems = [...leaveItems, ...phlItems]

      const attendanceItems = (attendanceResponse.data || [])
        .map((row) =>
          mapAttendanceRow(
            row,
            monthRange.start,
            monthRange.end,
            employeeDirectory,
          ),
        )
        .filter(Boolean) as TeamHistoryItem[]

      const attendanceOnlyItems = attendanceItems.filter(
        (item) => !isCoveredByCanonicalRequest(item, canonicalRequestItems),
      )

      const merged = [
        ...canonicalRequestItems,
        ...attendanceOnlyItems,
      ]

      merged.sort((a, b) => {
        const dateCompare = String(b.startDate || '').localeCompare(
          String(a.startDate || ''),
        )

        if (dateCompare !== 0) return dateCompare
        return a.employeeName.localeCompare(b.employeeName)
      })

      setItems(merged)
    } catch (error: any) {
      console.error(error)
      setItems([])
      setMessage(
        error?.message ||
          `Gagal memuat riwayat kehadiran tim periode ${periodLabel}.`,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[32px] border border-black/5 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              <CalendarDays size={14} />
              Periode · {periodLabel}
            </div>

            {isCurrentMonth && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={13} />
                Bulan berjalan
              </div>
            )}
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-tight text-[#1d1d1f] sm:text-2xl">
            Informasi Kehadiran Tim
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
            Riwayat cuti, klaim PHL, dan ketidakhadiran tim berdasarkan bulan. Pilih periode untuk melihat histori yang tersimpan.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-3 shadow-sm">
            <CalendarDays size={16} className="shrink-0 text-[#007aff]" />
            <span className="sr-only">Pilih periode bulan</span>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              disabled={loading}
              className="min-w-[170px] bg-transparent py-2 text-sm font-bold text-[#1d1d1f] outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm">
            <span className="font-bold text-[#1d1d1f]">{totalPeople}</span>{' '}
            <span className="text-[#6e6e73]">orang terdata</span>
          </div>

          <button
            type="button"
            onClick={fetchMonthData}
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
        <HistoryColumn
          category="leave"
          items={grouped.leave}
          loading={loading}
          periodLabel={periodLabel}
        />
        <HistoryColumn
          category="phl_claim"
          items={grouped.phl_claim}
          loading={loading}
          periodLabel={periodLabel}
        />
        <HistoryColumn
          category="absence"
          items={grouped.absence}
          loading={loading}
          periodLabel={periodLabel}
        />
      </div>
    </section>
  )
}

function HistoryColumn({
  category,
  items,
  loading,
  periodLabel,
}: {
  category: keyof typeof categoryMeta
  items: TeamHistoryItem[]
  loading: boolean
  periodLabel: string
}) {
  const meta = categoryMeta[category]
  const Icon = meta.icon
  const peopleCount = uniquePersonCount(items)

  return (
    <div className="rounded-[28px] border border-black/5 bg-[#f5f5f7]/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${meta.tone}`}
          >
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[#1d1d1f]">
              {meta.label}
            </h3>
            <p className="text-xs font-semibold text-[#86868b]">
              {peopleCount} orang
              {items.length > peopleCount ? ` · ${items.length} catatan` : ''}
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
          {meta.emptyLabel(periodLabel)}
        </div>
      ) : (
        <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <HistoryPersonCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryPersonCard({ item }: { item: TeamHistoryItem }) {
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

            <span
              className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClass(
                item.statusTone,
              )}`}
            >
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
              <BriefcaseBusiness
                size={15}
                className="mt-0.5 shrink-0 text-[#007aff]"
              />

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
