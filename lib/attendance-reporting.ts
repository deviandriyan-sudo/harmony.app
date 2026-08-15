export type AttendanceReportingLog = {
  id?: string | null
  upload_id?: string | null
  employee_id?: string | null
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
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
  notes?: string | null
  employee_daily_note?: string | null
  correction_reason?: string | null
  absence_request_type?: string | null
  absence_request_label?: string | null
  absence_request_status?: string | null
  absence_request_source?: string | null
  employee_confirmation_status?: string | null
  supervisor_approval_status?: string | null
  hr_approval_status?: string | null
  hr_final_status?: string | null
  is_phl_candidate?: boolean | null
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null
  is_locked?: boolean | null
}

export type AttendanceHoliday = {
  holiday_date?: string | null
  holiday_name?: string | null
  holiday_type?: string | null
  is_active?: boolean | null
}

export type AttendanceReportingRequest = {
  id?: string | null
  source_table?: 'leave_requests' | 'phl_records' | 'attendance_logs' | string
  employee_id?: string | null
  employee_number?: string | null
  machine_pin?: string | null
  start_date?: string | null
  end_date?: string | null
  request_type?: string | null
  request_label?: string | null
  request_category?: string | null
  status?: string | null
  supervisor_status?: string | null
  hr_status?: string | null
  reason?: string | null
  source?: string | null
  proof_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AttendanceRequestTypeMeta = {
  code?: string | null
  label?: string | null
  request_category?: string | null
  attendance_status?: string | null
  is_leave_like?: boolean | null
  is_absence_like?: boolean | null
  is_phl_claim?: boolean | null
  is_active?: boolean | null
}

export type AttendanceDayBucket =
  | 'office_present'
  | 'manual_present'
  | 'official_travel'
  | 'offday_work'
  | 'leave'
  | 'phl_claim'
  | 'sick'
  | 'permit'
  | 'absent'
  | 'incomplete'
  | 'pending_request'
  | 'conflict'
  | 'no_record'
  | 'offday'

export type AttendanceDayClassification = {
  date: string
  dayName: string
  bucket: AttendanceDayBucket
  label: string
  isWeekend: boolean
  isHoliday: boolean
  holidayName: string

  machineCheckIn: string
  machineCheckOut: string
  manualCheckIn: string
  manualCheckOut: string
  effectiveCheckIn: string
  effectiveCheckOut: string
  hasMachineTime: boolean
  hasManualTime: boolean
  completeTime: boolean

  sourceLabel: string
  isLate: boolean
  manualApproved: boolean

  requestId: string
  requestCode: string
  requestLabel: string
  requestCategory: string
  requestStatus: string
  requestSource: string
  requestReason: string
  requestApproved: boolean
  requestPending: boolean

  workAttendanceRecorded: boolean
  compensationReady: boolean
  transportBasis: boolean
  mealBasis: boolean

  note: string
}

export type AttendancePeriodSummary = {
  scheduledWorkdays: number
  officePresent: number
  late: number
  manualPresent: number
  /** Backward-compatible alias for older HR review route. */
  manualExternal: number
  officialTravel: number
  offdayWork: number

  recordedWorkAttendance: number
  verifiedWorkAttendance: number
  transportBasisDays: number
  mealBasisDays: number
  manualPendingVerification: number

  leave: number
  phlClaim: number
  sick: number
  permit: number
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

const REJECTED_WORDS = new Set([
  'rejected',
  'cancelled',
  'canceled',
  'declined',
  'void',
])

const WORK_ASSIGNMENT_TOKENS = [
  'official_travel',
  'business_trip',
  'tugas_luar',
  'tugas_dinas',
  'surat_tugas',
  'dinas_luar',
  'perjalanan_dinas',
  'luar_kota',
  'luar_daerah',
  'kerja_luar',
  'kerja_lapangan',
  'field_work',
  'site_visit',
  'kunjungan_kerja',
  'kunjungan_dinas',
]

export function normalizeAttendanceText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\/\\-]+/g, '_')
    .replace(/[^a-z0-9_\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
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

export function formatDayNameID(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
  }).format(date)
}

export function buildHolidayMap(holidays: AttendanceHoliday[]) {
  const map = new Map<string, AttendanceHoliday>()
  holidays.forEach((holiday) => {
    const date = normalizeISODate(holiday.holiday_date)
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

export function getEmployeeRequests<T extends AttendanceReportingRequest>(
  employee: {
    id?: string | null
    employee_number?: string | null
    machine_pin?: string | null
  },
  requests: T[],
) {
  const employeeId = String(employee.id || '').trim()
  const employeeNumber = String(employee.employee_number || '').trim()
  const machinePin = String(employee.machine_pin || '').trim()

  return requests.filter((request) => {
    const requestEmployeeId = String(request.employee_id || '').trim()
    const requestEmployeeNumber = String(request.employee_number || '').trim()
    const requestMachinePin = String(request.machine_pin || '').trim()

    if (employeeId && requestEmployeeId === employeeId) return true
    if (machinePin && requestMachinePin === machinePin) return true
    if (employeeNumber && requestEmployeeNumber === employeeNumber) return true
    return false
  })
}

export function summarizeAttendancePeriod({
  logs,
  requests = [],
  requestTypes = [],
  holidays,
  periodStart,
  periodEnd,
  employmentStart,
}: {
  logs: AttendanceReportingLog[]
  requests?: AttendanceReportingRequest[]
  requestTypes?: AttendanceRequestTypeMeta[]
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
    manualPresent: 0,
    manualExternal: 0,
    officialTravel: 0,
    offdayWork: 0,

    recordedWorkAttendance: 0,
    verifiedWorkAttendance: 0,
    transportBasisDays: 0,
    mealBasisDays: 0,
    manualPendingVerification: 0,

    leave: 0,
    phlClaim: 0,
    sick: 0,
    permit: 0,
    absent: 0,
    incomplete: 0,
    pendingRequest: 0,
    conflict: 0,
    noRecord: 0,
    offday: 0,
    classifiedDays: [],
  }

  if (!start || !cappedEnd || start > cappedEnd) return result

  const groupedLogs = groupLogsByDate(logs)
  const groupedRequests = groupRequestsByDate(requests, start, cappedEnd)

  for (const date of getDateRange(start, cappedEnd)) {
    const isWeekend = isWeekendISO(date)
    const holiday = holidayMap.get(date)
    const isHoliday = Boolean(holiday)

    if (!isWeekend && !isHoliday) result.scheduledWorkdays += 1

    const classification = classifyAttendanceDay({
      date,
      logs: groupedLogs.get(date) || [],
      requests: groupedRequests.get(date) || [],
      requestTypes,
      holiday,
    })

    result.classifiedDays.push(classification)

    switch (classification.bucket) {
      case 'office_present':
        result.officePresent += 1
        if (classification.isLate) result.late += 1
        break
      case 'manual_present':
        result.manualPresent += 1
        result.manualExternal += 1
        if (!classification.compensationReady) result.manualPendingVerification += 1
        break
      case 'official_travel':
        result.officialTravel += 1
        break
      case 'offday_work':
        result.offdayWork += 1
        if (classification.hasManualTime && !classification.hasMachineTime && !classification.compensationReady) {
          result.manualPendingVerification += 1
        }
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

    if (classification.workAttendanceRecorded) result.recordedWorkAttendance += 1
    if (classification.compensationReady) result.verifiedWorkAttendance += 1
    if (classification.transportBasis) result.transportBasisDays += 1
    if (classification.mealBasis) result.mealBasisDays += 1
  }

  return result
}

export function classifyAttendanceDay({
  date,
  logs,
  requests = [],
  requestTypes = [],
  holiday,
}: {
  date: string
  logs: AttendanceReportingLog[]
  requests?: AttendanceReportingRequest[]
  requestTypes?: AttendanceRequestTypeMeta[]
  holiday?: AttendanceHoliday
}): AttendanceDayClassification {
  const isWeekend = isWeekendISO(date)
  const isHoliday = Boolean(holiday)
  const holidayName = String(holiday?.holiday_name || '')

  const orderedLogs = [...logs].sort((a, b) => {
    const left = String(a.updated_at || a.created_at || '')
    const right = String(b.updated_at || b.created_at || '')
    return right.localeCompare(left)
  })

  const machineCheckIn = pickEarliestTime(orderedLogs.map((log) => log.check_in))
  const machineCheckOut = pickLatestTime(orderedLogs.map((log) => log.check_out))
  const manualCheckIn = pickEarliestTime(
    orderedLogs.flatMap((log) => [log.manual_check_in, log.requested_check_in]),
  )
  const manualCheckOut = pickLatestTime(
    orderedLogs.flatMap((log) => [log.manual_check_out, log.requested_check_out]),
  )

  const effectiveCheckIn = machineCheckIn || manualCheckIn
  const effectiveCheckOut = machineCheckOut || manualCheckOut
  const hasMachineTime = Boolean(machineCheckIn || machineCheckOut)
  const hasManualTime = Boolean(manualCheckIn || manualCheckOut)
  const hasAnyTime = Boolean(effectiveCheckIn || effectiveCheckOut)
  const completeTime = Boolean(effectiveCheckIn && effectiveCheckOut)
  const pureManual = hasManualTime && !hasMachineTime
  const isLate = orderedLogs.some((log) => normalizeAttendanceText(log.status) === 'late')
  const manualApproved = isManualAttendanceApproved(orderedLogs)

  const embeddedRequests = orderedLogs
    .map(logToEmbeddedRequest)
    .filter((request): request is AttendanceReportingRequest => Boolean(request))

  const request = resolveRequest([...requests, ...embeddedRequests], requestTypes)
  const approvedNonWorkRequest =
    request.approved &&
    ['leave', 'phl_claim', 'sick', 'permit', 'absent'].includes(request.category)
  const approvedWorkRequest = request.approved && request.category === 'official_travel'

  const base = {
    date,
    dayName: formatDayNameID(date),
    isWeekend,
    isHoliday,
    holidayName,
    machineCheckIn,
    machineCheckOut,
    manualCheckIn,
    manualCheckOut,
    effectiveCheckIn,
    effectiveCheckOut,
    hasMachineTime,
    hasManualTime,
    completeTime,
    sourceLabel: resolveSourceLabel({
      hasMachineTime,
      hasManualTime,
      approvedWorkRequest,
      requestLabel: request.label,
    }),
    isLate,
    manualApproved,
    requestId: request.id,
    requestCode: request.code,
    requestLabel: request.label,
    requestCategory: request.category,
    requestStatus: request.status,
    requestSource: request.source,
    requestReason: request.reason,
    requestApproved: request.approved,
    requestPending: request.pending,
  }

  // Sabtu/Minggu/libur tidak otomatis dihitung sebagai cuti/ST hanya karena request rentang
  // melewati hari libur. Hari libur baru menjadi hari kerja bila ada aktivitas waktu nyata.
  if (isWeekend || isHoliday) {
    if (hasAnyTime && !completeTime) {
      return makeDay({
        ...base,
        bucket: 'incomplete',
        note: 'Ada aktivitas pada hari libur, tetapi jam masuk/pulang belum lengkap.',
      })
    }

    if (completeTime) {
      const compensationReady = hasMachineTime || manualApproved
      return makeDay({
        ...base,
        bucket: 'offday_work',
        workAttendanceRecorded: true,
        compensationReady,
        transportBasis: compensationReady,
        mealBasis: compensationReady,
        note: approvedWorkRequest
          ? `Kerja pada hari libur dalam ${request.label || 'ST/Tugas Luar'} dengan jam kehadiran tersedia.`
          : pureManual
            ? 'Kerja Sabtu/Minggu/libur tercatat manual. Dasar tunjangan aktif setelah manual attendance disetujui.'
            : 'Kerja Sabtu/Minggu/libur dengan data mesin/fingerprint lengkap.',
      })
    }

    return makeDay({
      ...base,
      bucket: 'offday',
      note: approvedWorkRequest
        ? `Rentang ${request.label || 'ST/Tugas Luar'} melewati hari libur tanpa jam kerja; tidak otomatis dihitung sebagai hari kehadiran.`
        : 'Hari libur tanpa aktivitas kerja.',
    })
  }

  // ST / Tugas Luar / kerja luar kota adalah aktivitas kerja, bukan ketidakhadiran.
  // Approved request pada hari kerja dihitung sebagai kehadiran kerja walaupun tidak ada fingerprint.
  if (approvedWorkRequest) {
    return makeDay({
      ...base,
      bucket: 'official_travel',
      workAttendanceRecorded: true,
      compensationReady: true,
      transportBasis: true,
      mealBasis: true,
      note: completeTime
        ? `${request.label || 'ST/Tugas Luar'} approved dan terdapat jam kehadiran ${hasMachineTime ? 'mesin' : 'manual'}.`
        : `${request.label || 'ST/Tugas Luar'} approved. Dihitung sebagai kehadiran kerja untuk dasar laporan/tunjangan walaupun tidak ada fingerprint kantor.`,
    })
  }

  // Cuti/sakit/izin/PHL approved yang bertabrakan dengan jam kerja nyata harus direview,
  // agar tidak double-count sebagai hadir sekaligus tidak hadir.
  if (approvedNonWorkRequest && hasAnyTime) {
    return makeDay({
      ...base,
      bucket: 'conflict',
      note: `Ada jam kehadiran dan request approved (${request.label || request.code}) pada tanggal yang sama. HR perlu menentukan data yang benar sebelum payroll.`,
    })
  }

  if (approvedNonWorkRequest) {
    return makeDay({
      ...base,
      bucket: request.category as AttendanceDayBucket,
      note: `Request approved: ${request.label || request.code}.`,
    })
  }

  // Kehadiran kantor: minimal ada sumber mesin dan pasangan jam efektif lengkap.
  // Manual boleh melengkapi salah satu sisi fingerprint tanpa mengubahnya menjadi pure manual.
  if (completeTime && hasMachineTime) {
    return makeDay({
      ...base,
      bucket: 'office_present',
      workAttendanceRecorded: true,
      compensationReady: true,
      transportBasis: true,
      mealBasis: true,
      note: hasManualTime
        ? 'Kehadiran kantor dengan fingerprint dan koreksi manual pelengkap.'
        : 'Kehadiran kantor dengan fingerprint/jam mesin lengkap.',
    })
  }

  // Pure manual selalu ikut laporan kehadiran tercatat. Untuk dasar tunjangan, manual harus sudah approved.
  if (completeTime && pureManual) {
    return makeDay({
      ...base,
      bucket: 'manual_present',
      workAttendanceRecorded: true,
      compensationReady: manualApproved,
      transportBasis: manualApproved,
      mealBasis: manualApproved,
      note: manualApproved
        ? 'Kehadiran manual/lapangan lengkap dan sudah terverifikasi approval.'
        : 'Kehadiran manual/lapangan lengkap tetapi belum terverifikasi approval; tetap muncul di laporan namun belum masuk dasar tunjangan final.',
    })
  }

  if (hasAnyTime) {
    return makeDay({
      ...base,
      bucket: 'incomplete',
      note: 'Hanya salah satu sisi jam masuk/pulang tersedia.',
    })
  }

  if (request.pending) {
    return makeDay({
      ...base,
      bucket: 'pending_request',
      note: `Request ${request.label || request.code} belum final/approved.`,
    })
  }

  const normalizedStatuses = orderedLogs.map((log) => normalizeAttendanceText(log.status))
  if (normalizedStatuses.some((status) => ['absent', 'alpa', 'alpha'].includes(status))) {
    return makeDay({
      ...base,
      bucket: 'absent',
      note: 'Status absensi menunjukkan alpa/tidak hadir.',
    })
  }

  return makeDay({
    ...base,
    bucket: 'no_record',
    note: logs.length
      ? 'Ada row attendance, tetapi tidak ada pasangan jam atau request final yang dapat dihitung sebagai kehadiran.'
      : 'Belum ada fingerprint, manual attendance, atau request kerja/ketidakhadiran final.',
  })
}

export function attendanceBucketLabel(bucket: AttendanceDayBucket) {
  const labels: Record<AttendanceDayBucket, string> = {
    office_present: 'Hadir Kantor',
    manual_present: 'Hadir Manual / Lapangan',
    official_travel: 'ST / Tugas Luar / Luar Kota',
    offday_work: 'Kerja Sabtu/Minggu/Libur',
    leave: 'Cuti',
    phl_claim: 'Klaim PHL',
    sick: 'Sakit',
    permit: 'Izin',
    absent: 'Alpa',
    incomplete: 'Incomplete',
    pending_request: 'Request Pending',
    conflict: 'Konflik Data',
    no_record: 'Tanpa Data',
    offday: 'Hari Libur',
  }
  return labels[bucket]
}

export function isWorkAttendanceBucket(bucket: AttendanceDayBucket) {
  return ['office_present', 'manual_present', 'official_travel', 'offday_work'].includes(bucket)
}

function resolveRequest(
  requests: AttendanceReportingRequest[],
  requestTypes: AttendanceRequestTypeMeta[],
) {
  const normalized = requests
    .map((request) => normalizeRequest(request, requestTypes))
    .filter((request) => request.category)

  if (!normalized.length) {
    return {
      id: '',
      code: '',
      label: '',
      category: '',
      status: '',
      source: '',
      reason: '',
      approved: false,
      pending: false,
    }
  }

  // Final approved request has priority over pending/history.
  const approved = normalized.find((request) => request.approved)
  if (approved) return approved

  const pending = normalized.find((request) => request.pending)
  if (pending) return pending

  return normalized[0]
}

function normalizeRequest(
  request: AttendanceReportingRequest,
  requestTypes: AttendanceRequestTypeMeta[],
) {
  const code = normalizeAttendanceText(request.request_type)
  const label = String(request.request_label || '').trim()
  const rawCategory = normalizeAttendanceText(request.request_category)
  const meta = requestTypes.find((item) => normalizeAttendanceText(item.code) === code)

  const category = requestCategory({
    code,
    label,
    rawCategory,
    meta,
  })

  const status = normalizeAttendanceText(request.hr_status || request.status || request.supervisor_status)
  const approved = isRequestApproved(request)
  const pending = isRequestPending(request)

  return {
    id: String(request.id || ''),
    code,
    label: label || String(meta?.label || requestCodeLabel(code)),
    category,
    status,
    source: String(request.source_table || request.source || ''),
    reason: String(request.reason || ''),
    approved,
    pending,
  }
}

function isRequestApproved(request: AttendanceReportingRequest) {
  const hrStatus = normalizeAttendanceText(request.hr_status)
  const status = normalizeAttendanceText(request.status)
  const source = normalizeAttendanceText(request.source)

  if (APPROVED_WORDS.has(hrStatus)) return true
  if (APPROVED_WORDS.has(status)) return true
  if (source.includes('approved') || source.includes('synced')) return true
  return false
}

function isRequestPending(request: AttendanceReportingRequest) {
  const hrStatus = normalizeAttendanceText(request.hr_status)
  const status = normalizeAttendanceText(request.status)
  const supervisorStatus = normalizeAttendanceText(request.supervisor_status)

  if ([hrStatus, status, supervisorStatus].some((value) => REJECTED_WORDS.has(value))) {
    return false
  }

  if (isRequestApproved(request)) return false

  return Boolean(
    [hrStatus, status, supervisorStatus].some((value) =>
      ['pending', 'submitted', 'waiting_supervisor', 'pending_supervisor', 'waiting_hr', 'pending_hr', 'approved'].includes(value),
    ),
  )
}

function requestCategory({
  code,
  label,
  rawCategory,
  meta,
}: {
  code: string
  label: string
  rawCategory: string
  meta?: AttendanceRequestTypeMeta
}): AttendanceDayBucket | '' {
  const normalizedLabel = normalizeAttendanceText(label)
  const metaCategory = normalizeAttendanceText(meta?.request_category)
  const metaAttendance = normalizeAttendanceText(meta?.attendance_status)

  if (meta?.is_phl_claim || code === 'phl_claim' || code === 'claim_phl' || normalizedLabel.includes('klaim_phl')) {
    return 'phl_claim'
  }

  if (meta?.is_leave_like || LEAVE_CODES.has(code) || rawCategory === 'leave' || metaCategory === 'leave' || normalizedLabel.includes('cuti')) {
    return 'leave'
  }

  if (isWorkAssignment({ code, label: normalizedLabel, rawCategory, metaCategory, metaAttendance })) {
    return 'official_travel'
  }

  if (code === 'sick' || rawCategory === 'sick' || metaCategory === 'sick' || normalizedLabel.includes('sakit')) return 'sick'

  if (
    ['permit', 'permission', 'izin'].includes(code) ||
    ['permit', 'permission', 'izin'].includes(rawCategory) ||
    ['permit', 'permission', 'izin'].includes(metaCategory) ||
    normalizedLabel.includes('izin')
  ) {
    return 'permit'
  }

  if (
    ['absent', 'alpa', 'alpha', 'absence'].includes(code) ||
    ['absent', 'alpa', 'alpha', 'absence'].includes(rawCategory) ||
    ['absent', 'alpa', 'alpha', 'absence'].includes(metaCategory) ||
    normalizedLabel.includes('alpa')
  ) {
    return 'absent'
  }

  // Custom type yang berstatus absence tetapi tidak dikenali secara spesifik tetap dianggap permit,
  // agar tidak pernah dihitung sebagai kehadiran kerja/tunjangan secara otomatis.
  if (meta?.is_absence_like) return 'permit'

  return ''
}

function isWorkAssignment({
  code,
  label,
  rawCategory,
  metaCategory,
  metaAttendance,
}: {
  code: string
  label: string
  rawCategory: string
  metaCategory: string
  metaAttendance: string
}) {
  const exactValues = new Set([code, rawCategory, metaCategory, metaAttendance])
  if ([...exactValues].some((value) => WORK_ASSIGNMENT_TOKENS.includes(value))) return true
  if (code === 'st') return true

  return WORK_ASSIGNMENT_TOKENS.some((token) => label.includes(token))
}

function requestCodeLabel(code: string) {
  if (code === 'phl_claim' || code === 'claim_phl') return 'Klaim PHL'
  if (LEAVE_CODES.has(code)) return 'Cuti'
  if (code === 'sick') return 'Sakit'
  if (['permit', 'permission', 'izin'].includes(code)) return 'Izin'
  if (WORK_ASSIGNMENT_TOKENS.includes(code) || code === 'st') return 'ST / Tugas Luar'
  if (['absent', 'alpa', 'alpha'].includes(code)) return 'Alpa'
  return code || '-'
}

function logToEmbeddedRequest(log: AttendanceReportingLog): AttendanceReportingRequest | null {
  const code = String(log.absence_request_type || '').trim()
  const label = String(log.absence_request_label || '').trim()

  if (!code && !label) return null

  return {
    id: log.id,
    source_table: 'attendance_logs',
    employee_id: log.employee_id,
    employee_number: log.employee_number,
    machine_pin: log.machine_pin,
    start_date: log.attendance_date,
    end_date: log.attendance_date,
    request_type: code,
    request_label: label,
    status: log.absence_request_status,
    supervisor_status: log.supervisor_approval_status,
    hr_status: log.hr_approval_status || log.hr_final_status,
    reason: log.employee_daily_note || log.correction_reason || log.notes,
    source: log.absence_request_source || log.source,
    created_at: log.created_at,
    updated_at: log.updated_at,
  }
}

function isManualAttendanceApproved(logs: AttendanceReportingLog[]) {
  return logs.some((log) => {
    const supervisor = normalizeAttendanceText(log.supervisor_approval_status)
    const hr = normalizeAttendanceText(log.hr_approval_status)
    const final = normalizeAttendanceText(log.hr_final_status)

    return (
      supervisor === 'approved' ||
      hr === 'approved' ||
      ['ready_for_hr', 'finalized', 'approved'].includes(final)
    )
  })
}

function resolveSourceLabel({
  hasMachineTime,
  hasManualTime,
  approvedWorkRequest,
  requestLabel,
}: {
  hasMachineTime: boolean
  hasManualTime: boolean
  approvedWorkRequest: boolean
  requestLabel: string
}) {
  const sources: string[] = []
  if (hasMachineTime) sources.push('Mesin/Fingerprint')
  if (hasManualTime) sources.push('Manual')
  if (approvedWorkRequest) sources.push(requestLabel || 'ST/Tugas Luar Approved')
  return sources.length ? sources.join(' + ') : '-'
}

function makeDay(
  input: Partial<AttendanceDayClassification> &
    Pick<AttendanceDayClassification, 'date' | 'bucket' | 'isWeekend' | 'isHoliday' | 'holidayName' | 'note'>,
): AttendanceDayClassification {
  return {
    date: input.date,
    dayName: input.dayName || formatDayNameID(input.date),
    bucket: input.bucket,
    label: attendanceBucketLabel(input.bucket),
    isWeekend: input.isWeekend,
    isHoliday: input.isHoliday,
    holidayName: input.holidayName,

    machineCheckIn: String(input.machineCheckIn || ''),
    machineCheckOut: String(input.machineCheckOut || ''),
    manualCheckIn: String(input.manualCheckIn || ''),
    manualCheckOut: String(input.manualCheckOut || ''),
    effectiveCheckIn: String(input.effectiveCheckIn || ''),
    effectiveCheckOut: String(input.effectiveCheckOut || ''),
    hasMachineTime: Boolean(input.hasMachineTime),
    hasManualTime: Boolean(input.hasManualTime),
    completeTime: Boolean(input.completeTime),

    sourceLabel: String(input.sourceLabel || '-'),
    isLate: Boolean(input.isLate),
    manualApproved: Boolean(input.manualApproved),

    requestId: String(input.requestId || ''),
    requestCode: String(input.requestCode || ''),
    requestLabel: String(input.requestLabel || ''),
    requestCategory: String(input.requestCategory || ''),
    requestStatus: String(input.requestStatus || ''),
    requestSource: String(input.requestSource || ''),
    requestReason: String(input.requestReason || ''),
    requestApproved: Boolean(input.requestApproved),
    requestPending: Boolean(input.requestPending),

    workAttendanceRecorded: Boolean(input.workAttendanceRecorded),
    compensationReady: Boolean(input.compensationReady),
    transportBasis: Boolean(input.transportBasis),
    mealBasis: Boolean(input.mealBasis),

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

function groupRequestsByDate(
  requests: AttendanceReportingRequest[],
  start: string,
  end: string,
) {
  const map = new Map<string, AttendanceReportingRequest[]>()

  requests.forEach((request) => {
    const requestStart = maxISODate(normalizeISODate(request.start_date) || start, start)
    const requestEnd = minISODate(normalizeISODate(request.end_date) || requestStart, end)
    if (!requestStart || !requestEnd || requestStart > requestEnd) return

    for (const date of getDateRange(requestStart, requestEnd)) {
      const existing = map.get(date) || []
      existing.push(request)
      map.set(date, existing)
    }
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

function minISODate(a: string, b: string) {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeClock(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return raw

  const hour = Math.min(Math.max(Number(match[1]), 0), 23)
  const minute = Math.min(Math.max(Number(match[2]), 0), 59)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function clockMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function pickEarliestTime(values: Array<string | null | undefined>) {
  const normalized = values.map(normalizeClock).filter(Boolean)
  if (!normalized.length) return ''

  return normalized.sort((a, b) => {
    const left = clockMinutes(a)
    const right = clockMinutes(b)
    if (left === null || right === null) return a.localeCompare(b)
    return left - right
  })[0]
}

function pickLatestTime(values: Array<string | null | undefined>) {
  const normalized = values.map(normalizeClock).filter(Boolean)
  if (!normalized.length) return ''

  return normalized.sort((a, b) => {
    const left = clockMinutes(a)
    const right = clockMinutes(b)
    if (left === null || right === null) return b.localeCompare(a)
    return right - left
  })[0]
}
