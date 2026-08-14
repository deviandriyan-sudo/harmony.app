export type AttendanceReportingLog = {
  id?: string | null
  employee_id?: string | null
  employee_number?: string | null
  machine_pin?: string | null
  attendance_date?: string | null
  check_in?: string | null
  check_out?: string | null
  manual_check_in?: string | null
  manual_check_out?: string | null
  requested_check_in?: string | null
  requested_check_out?: string | null
  status?: string | null
  attendance_status?: string | null
  source?: string | null
  absence_request_type?: string | null
  absence_request_label?: string | null
  absence_request_status?: string | null
  absence_request_source?: string | null
  employee_confirmation_status?: string | null
  supervisor_approval_status?: string | null
  hr_approval_status?: string | null
  is_phl_candidate?: boolean | null
  updated_at?: string | null
  created_at?: string | null
}

export type AttendanceHoliday = {
  holiday_date?: string | null
  holiday_name?: string | null
  holiday_type?: string | null
  is_active?: boolean | null
}

export type AttendanceDayBucket =
  | 'office_present'
  | 'manual_external'
  | 'offday_work'
  | 'leave'
  | 'phl_claim'
  | 'sick'
  | 'permit'
  | 'official_travel'
  | 'absent'
  | 'incomplete'
  | 'pending_request'
  | 'conflict'
  | 'no_record'
  | 'offday'

export type AttendanceDayClassification = {
  date: string
  bucket: AttendanceDayBucket
  label: string
  isWeekend: boolean
  isHoliday: boolean
  holidayName: string
  hasMachineTime: boolean
  hasManualTime: boolean
  effectiveCheckIn: string
  effectiveCheckOut: string
  isLate: boolean
  requestCode: string
  requestLabel: string
  requestApproved: boolean
  note: string
}

export type AttendancePeriodSummary = {
  scheduledWorkdays: number
  officePresent: number
  late: number
  manualExternal: number
  offdayWork: number
  leave: number
  phlClaim: number
  sick: number
  permit: number
  officialTravel: number
  absent: number
  incomplete: number
  pendingRequest: number
  conflict: number
  noRecord: number
  offday: number
  classifiedDays: AttendanceDayClassification[]
}

const LEAVE_CODES = new Set([
  'leave',
  'annual_leave',
  'special_leave',
  'marriage_leave',
  'maternity_leave',
  'miscarriage_leave',
  'bereavement_leave',
  'child_circumcision_leave',
  'worship_leave',
  'menstrual_leave',
  'pregnancy_check_leave',
  'other_leave',
])

const APPROVED_WORDS = new Set([
  'approved',
  'hr_approved',
  'finalized',
  'final',
  'synced',
  'sync',
  'active',
])

export function normalizeAttendanceText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? '').trim(),
  )
}

export function isValidPeriodMonth(value: unknown) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value ?? '').trim())
}

export function getCurrentPeriodMonthWita() {
  const today = getTodayWita()
  const [yearText, monthText, dayText] = today.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (day >= 11) {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  const previous = new Date(year, month - 2, 1)
  const result = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`
  return result < '2026-01' ? '2026-01' : result
}

export function getCutoffRange(periodMonth: string) {
  if (!isValidPeriodMonth(periodMonth)) {
    return { start: '', end: '', label: '-' }
  }

  const [yearText, monthText] = periodMonth.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  const start = new Date(year, month - 1, 11)
  const end = new Date(year, month, 10)

  const startText = toISODate(start)
  const endText = toISODate(end)

  return {
    start: startText,
    end: endText,
    label: `${formatDateID(startText)} - ${formatDateID(endText)}`,
  }
}

export function getTodayWita() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const map = new Map(parts.map((part) => [part.type, part.value]))
  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`
}

export function clampReportingEnd(periodEnd: string) {
  const today = getTodayWita()
  return periodEnd > today ? today : periodEnd
}

export function formatDateID(value: string | null | undefined) {
  if (!value) return '-'
  const raw = String(value).slice(0, 10)
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTimeID(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function buildHolidayMap(holidays: AttendanceHoliday[]) {
  const map = new Map<string, AttendanceHoliday>()
  holidays.forEach((holiday) => {
    const date = String(holiday.holiday_date || '').slice(0, 10)
    if (!date || holiday.is_active === false) return
    map.set(date, holiday)
  })
  return map
}

export function getEmployeeLogs<T extends AttendanceReportingLog>(
  employee: {
    id?: string | null
    employee_number?: string | null
    machine_pin?: string | null
  },
  logs: T[],
) {
  const employeeId = String(employee.id || '').trim()
  const employeeNumber = String(employee.employee_number || '').trim()
  const machinePin = String(employee.machine_pin || '').trim()

  return logs.filter((log) => {
    const logEmployeeId = String(log.employee_id || '').trim()
    const logEmployeeNumber = String(log.employee_number || '').trim()
    const logMachinePin = String(log.machine_pin || '').trim()

    if (employeeId && logEmployeeId === employeeId) return true
    if (machinePin && logMachinePin === machinePin) return true
    if (employeeNumber && logEmployeeNumber === employeeNumber) return true
    return false
  })
}

export function summarizeAttendancePeriod({
  logs,
  holidays,
  periodStart,
  periodEnd,
  employmentStart,
}: {
  logs: AttendanceReportingLog[]
  holidays: AttendanceHoliday[]
  periodStart: string
  periodEnd: string
  employmentStart?: string | null
}): AttendancePeriodSummary {
  const holidayMap = buildHolidayMap(holidays)
  const cappedEnd = clampReportingEnd(periodEnd)
  const start = maxISODate(periodStart, normalizeISODate(employmentStart) || periodStart)

  const result: AttendancePeriodSummary = {
    scheduledWorkdays: 0,
    officePresent: 0,
    late: 0,
    manualExternal: 0,
    offdayWork: 0,
    leave: 0,
    phlClaim: 0,
    sick: 0,
    permit: 0,
    officialTravel: 0,
    absent: 0,
    incomplete: 0,
    pendingRequest: 0,
    conflict: 0,
    noRecord: 0,
    offday: 0,
    classifiedDays: [],
  }

  if (!start || !cappedEnd || start > cappedEnd) return result

  const grouped = groupLogsByDate(logs)

  for (const date of getDateRange(start, cappedEnd)) {
    const isWeekend = isWeekendISO(date)
    const holiday = holidayMap.get(date)
    const isHoliday = Boolean(holiday)

    if (!isWeekend && !isHoliday) result.scheduledWorkdays += 1

    const classification = classifyAttendanceDay({
      date,
      logs: grouped.get(date) || [],
      holiday,
    })

    result.classifiedDays.push(classification)

    switch (classification.bucket) {
      case 'office_present':
        result.officePresent += 1
        if (classification.isLate) result.late += 1
        break
      case 'manual_external':
        result.manualExternal += 1
        break
      case 'offday_work':
        result.offdayWork += 1
        break
      case 'leave':
        result.leave += 1
        break
      case 'phl_claim':
        result.phlClaim += 1
        break
      case 'sick':
        result.sick += 1
        break
      case 'permit':
        result.permit += 1
        break
      case 'official_travel':
        result.officialTravel += 1
        break
      case 'absent':
        result.absent += 1
        break
      case 'incomplete':
        result.incomplete += 1
        break
      case 'pending_request':
        result.pendingRequest += 1
        break
      case 'conflict':
        result.conflict += 1
        break
      case 'no_record':
        result.noRecord += 1
        break
      case 'offday':
        result.offday += 1
        break
    }
  }

  return result
}

export function classifyAttendanceDay({
  date,
  logs,
  holiday,
}: {
  date: string
  logs: AttendanceReportingLog[]
  holiday?: AttendanceHoliday
}): AttendanceDayClassification {
  const isWeekend = isWeekendISO(date)
  const isHoliday = Boolean(holiday)
  const holidayName = String(holiday?.holiday_name || '')

  if (!logs.length) {
    return makeDay({
      date,
      bucket: isWeekend || isHoliday ? 'offday' : 'no_record',
      isWeekend,
      isHoliday,
      holidayName,
      note: isWeekend || isHoliday ? 'Hari libur tanpa aktivitas kerja.' : 'Belum ada log fingerprint/manual/request approved.',
    })
  }

  const ordered = [...logs].sort((a, b) => {
    const left = String(a.updated_at || a.created_at || '')
    const right = String(b.updated_at || b.created_at || '')
    return right.localeCompare(left)
  })

  const machineIn = firstNonEmpty(ordered.map((log) => log.check_in))
  const machineOut = firstNonEmpty(ordered.map((log) => log.check_out))
  const manualIn = firstNonEmpty(
    ordered.flatMap((log) => [log.manual_check_in, log.requested_check_in]),
  )
  const manualOut = firstNonEmpty(
    ordered.flatMap((log) => [log.manual_check_out, log.requested_check_out]),
  )

  const effectiveCheckIn = machineIn || manualIn
  const effectiveCheckOut = machineOut || manualOut
  const hasMachineTime = Boolean(machineIn || machineOut)
  const hasManualTime = Boolean(manualIn || manualOut)
  const hasAnyTime = Boolean(effectiveCheckIn || effectiveCheckOut)
  const completeTime = Boolean(effectiveCheckIn && effectiveCheckOut)
  const isLate = ordered.some((log) => normalizeAttendanceText(log.status) === 'late')

  const request = resolveRequest(ordered)
  const approvedRequest = request.category && request.approved
  const pendingRequest = request.category && !request.approved

  // Approved absence + fingerprint on the same date is a reporting conflict.
  // This prevents the same date from silently being counted as both office presence and leave.
  if (approvedRequest && hasMachineTime) {
    return makeDay({
      date,
      bucket: 'conflict',
      isWeekend,
      isHoliday,
      holidayName,
      hasMachineTime,
      hasManualTime,
      effectiveCheckIn,
      effectiveCheckOut,
      isLate,
      requestCode: request.code,
      requestLabel: request.label,
      requestApproved: true,
      note: `Ada fingerprint dan request approved (${request.label || request.code}) pada tanggal yang sama. Perlu review HR.`,
    })
  }

  if (approvedRequest) {
    return makeDay({
      date,
      bucket: request.category as AttendanceDayBucket,
      isWeekend,
      isHoliday,
      holidayName,
      hasMachineTime,
      hasManualTime,
      effectiveCheckIn,
      effectiveCheckOut,
      isLate,
      requestCode: request.code,
      requestLabel: request.label,
      requestApproved: true,
      note: `Request approved: ${request.label || request.code}.`,
    })
  }

  if (pendingRequest && !hasAnyTime) {
    return makeDay({
      date,
      bucket: 'pending_request',
      isWeekend,
      isHoliday,
      holidayName,
      requestCode: request.code,
      requestLabel: request.label,
      requestApproved: false,
      note: `Request ${request.label || request.code} belum final/approved.`,
    })
  }

  if (isWeekend || isHoliday) {
    if (hasAnyTime) {
      return makeDay({
        date,
        bucket: 'offday_work',
        isWeekend,
        isHoliday,
        holidayName,
        hasMachineTime,
        hasManualTime,
        effectiveCheckIn,
        effectiveCheckOut,
        isLate,
        requestCode: request.code,
        requestLabel: request.label,
        requestApproved: request.approved,
        note: 'Aktivitas kerja pada Sabtu/Minggu/libur. Tidak dihitung sebagai Hadir Kantor reguler.',
      })
    }

    return makeDay({
      date,
      bucket: 'offday',
      isWeekend,
      isHoliday,
      holidayName,
      note: 'Hari libur tanpa aktivitas kerja.',
    })
  }

  const pureManual = hasManualTime && !hasMachineTime
  if (pureManual && completeTime) {
    return makeDay({
      date,
      bucket: 'manual_external',
      isWeekend,
      isHoliday,
      holidayName,
      hasMachineTime,
      hasManualTime,
      effectiveCheckIn,
      effectiveCheckOut,
      isLate,
      requestCode: request.code,
      requestLabel: request.label,
      requestApproved: request.approved,
      note: 'Jam lengkap hanya berasal dari absensi manual. Dipisahkan dari Hadir Kantor fingerprint.',
    })
  }

  if (completeTime) {
    return makeDay({
      date,
      bucket: 'office_present',
      isWeekend,
      isHoliday,
      holidayName,
      hasMachineTime,
      hasManualTime,
      effectiveCheckIn,
      effectiveCheckOut,
      isLate,
      requestCode: request.code,
      requestLabel: request.label,
      requestApproved: request.approved,
      note: hasManualTime
        ? 'Kehadiran reguler dengan fingerprint dan/atau koreksi manual pelengkap.'
        : 'Kehadiran reguler dengan jam masuk dan pulang lengkap.',
    })
  }

  if (hasAnyTime) {
    return makeDay({
      date,
      bucket: 'incomplete',
      isWeekend,
      isHoliday,
      holidayName,
      hasMachineTime,
      hasManualTime,
      effectiveCheckIn,
      effectiveCheckOut,
      isLate,
      requestCode: request.code,
      requestLabel: request.label,
      requestApproved: request.approved,
      note: 'Hanya salah satu sisi jam masuk/pulang tersedia.',
    })
  }

  const normalizedStatuses = ordered.map((log) => normalizeAttendanceText(log.status))
  if (normalizedStatuses.some((status) => ['absent', 'alpa', 'alpha'].includes(status))) {
    return makeDay({
      date,
      bucket: 'absent',
      isWeekend,
      isHoliday,
      holidayName,
      note: 'Status absensi menunjukkan alpa/tidak hadir.',
    })
  }

  return makeDay({
    date,
    bucket: 'no_record',
    isWeekend,
    isHoliday,
    holidayName,
    requestCode: request.code,
    requestLabel: request.label,
    requestApproved: request.approved,
    note: 'Belum ada jam kehadiran yang dapat dihitung sebagai hadir.',
  })
}

export function attendanceBucketLabel(bucket: AttendanceDayBucket) {
  const labels: Record<AttendanceDayBucket, string> = {
    office_present: 'Hadir Kantor',
    manual_external: 'Manual / Luar Kantor',
    offday_work: 'Kerja Sabtu/Minggu/Libur',
    leave: 'Cuti',
    phl_claim: 'Klaim PHL',
    sick: 'Sakit',
    permit: 'Izin',
    official_travel: 'Tugas Luar',
    absent: 'Alpa',
    incomplete: 'Incomplete',
    pending_request: 'Request Pending',
    conflict: 'Konflik Data',
    no_record: 'Tanpa Data',
    offday: 'Hari Libur',
  }
  return labels[bucket]
}

function resolveRequest(logs: AttendanceReportingLog[]) {
  for (const log of logs) {
    const code = normalizeAttendanceText(log.absence_request_type || log.status)
    const label = String(log.absence_request_label || '').trim()
    const category = requestCategory(code, label)

    if (!category) continue

    return {
      code,
      label: label || requestCodeLabel(code),
      category,
      approved: isRequestApproved(log),
    }
  }

  return { code: '', label: '', category: '', approved: false }
}

function isRequestApproved(log: AttendanceReportingLog) {
  const requestStatus = normalizeAttendanceText(log.absence_request_status)
  const hrStatus = normalizeAttendanceText(log.hr_approval_status)
  const source = normalizeAttendanceText(log.absence_request_source || log.source)

  if (APPROVED_WORDS.has(requestStatus)) return true
  // Supervisor approval alone is not final reporting truth.
  // Final absence categories require HR/request final approval or an approved sync source.
  if (hrStatus === 'approved') return true
  if (source.includes('approved') || source.includes('sync')) return true
  return false
}

function requestCategory(code: string, rawLabel: string): AttendanceDayBucket | '' {
  const label = normalizeAttendanceText(rawLabel)

  if (code === 'phl_claim' || code === 'claim_phl' || label.includes('klaim_phl')) {
    return 'phl_claim'
  }

  if (LEAVE_CODES.has(code) || label.includes('cuti')) return 'leave'
  if (code === 'sick' || label.includes('sakit')) return 'sick'
  if (['permit', 'permission', 'izin'].includes(code) || label.includes('izin')) return 'permit'
  if (
    ['official_travel', 'business_trip', 'dinas', 'tugas_luar'].includes(code) ||
    label.includes('tugas_luar') ||
    label.includes('dinas')
  ) {
    return 'official_travel'
  }
  if (['absent', 'alpa', 'alpha'].includes(code) || label.includes('alpa')) return 'absent'

  // manual_attendance is intentionally not an absence bucket.
  return ''
}

function requestCodeLabel(code: string) {
  if (code === 'phl_claim' || code === 'claim_phl') return 'Klaim PHL'
  if (LEAVE_CODES.has(code)) return 'Cuti'
  if (code === 'sick') return 'Sakit'
  if (['permit', 'permission', 'izin'].includes(code)) return 'Izin'
  if (['official_travel', 'business_trip', 'dinas', 'tugas_luar'].includes(code)) return 'Tugas Luar'
  if (['absent', 'alpa', 'alpha'].includes(code)) return 'Alpa'
  return code || '-'
}

function makeDay(
  input: Partial<AttendanceDayClassification> &
    Pick<AttendanceDayClassification, 'date' | 'bucket' | 'isWeekend' | 'isHoliday' | 'holidayName' | 'note'>,
): AttendanceDayClassification {
  return {
    date: input.date,
    bucket: input.bucket,
    label: attendanceBucketLabel(input.bucket),
    isWeekend: input.isWeekend,
    isHoliday: input.isHoliday,
    holidayName: input.holidayName,
    hasMachineTime: Boolean(input.hasMachineTime),
    hasManualTime: Boolean(input.hasManualTime),
    effectiveCheckIn: String(input.effectiveCheckIn || ''),
    effectiveCheckOut: String(input.effectiveCheckOut || ''),
    isLate: Boolean(input.isLate),
    requestCode: String(input.requestCode || ''),
    requestLabel: String(input.requestLabel || ''),
    requestApproved: Boolean(input.requestApproved),
    note: input.note,
  }
}

function groupLogsByDate(logs: AttendanceReportingLog[]) {
  const map = new Map<string, AttendanceReportingLog[]>()
  logs.forEach((log) => {
    const date = normalizeISODate(log.attendance_date)
    if (!date) return
    const existing = map.get(date) || []
    existing.push(log)
    map.set(date, existing)
  })
  return map
}

function getDateRange(start: string, end: string) {
  const result: string[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const finish = new Date(`${end}T00:00:00`)
  while (cursor <= finish) {
    result.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function isWeekendISO(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const day = date.getDay()
  return day === 0 || day === 6
}

function normalizeISODate(value: unknown) {
  const raw = String(value ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

function maxISODate(a: string, b: string) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) return normalized
  }
  return ''
}
