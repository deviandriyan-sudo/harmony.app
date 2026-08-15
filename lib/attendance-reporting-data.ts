import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getCutoffRange,
  getEmployeeLogs,
  getEmployeeRequests,
  summarizeAttendancePeriod,
  type AttendanceHoliday,
  type AttendanceReportingLog,
  type AttendanceReportingRequest,
  type AttendanceRequestTypeMeta,
} from '@/lib/attendance-reporting'

export type AttendanceReportingEmployee = {
  id: string
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
  email?: string | null
  join_date?: string | null
  is_active?: boolean | null
  synthetic?: boolean
}

export type AttendancePeriodConfirmation = {
  id?: string | null
  employee_id?: string | null
  period_month?: string | null
  period_start?: string | null
  period_end?: string | null
  employee_status?: string | null
  employee_submitted_at?: string | null
  employee_submitted_by?: string | null
  supervisor_status?: string | null
  supervisor_name?: string | null
  supervisor_approved_at?: string | null
  supervisor_rejected_at?: string | null
  supervisor_note?: string | null
  hr_status?: string | null
  hr_finalized_at?: string | null
  hr_finalized_by?: string | null
  hr_note?: string | null
  is_locked?: boolean | null
  locked_at?: string | null
  locked_by?: string | null
  locked_by_name?: string | null
}

export type AttendanceRawLog = AttendanceReportingLog & {
  full_name?: string | null
  department?: string | null
  position?: string | null
  correction_status?: string | null
  correction_type?: string | null
  correction_proof_url?: string | null
  absence_proof_url?: string | null
  phl_proof_url?: string | null
}

export type AttendanceReportingDataset = {
  employees: AttendanceReportingEmployee[]
  logs: AttendanceRawLog[]
  holidays: AttendanceHoliday[]
  confirmations: AttendancePeriodConfirmation[]
  requests: AttendanceReportingRequest[]
  requestTypes: AttendanceRequestTypeMeta[]
  warnings: string[]
}

export type AttendanceReportingRow = {
  employee: AttendanceReportingEmployee
  confirmation: AttendancePeriodConfirmation | null
  logs: AttendanceRawLog[]
  requests: AttendanceReportingRequest[]
  summary: ReturnType<typeof summarizeAttendancePeriod>
  locked: boolean
  synthetic: boolean
}

export async function loadAttendanceReportingDataset(
  supabase: SupabaseClient,
  periodMonth: string,
): Promise<AttendanceReportingDataset> {
  const range = getCutoffRange(periodMonth)
  const warnings: string[] = []

  const [employeeResult, logResult, holidayResult, confirmationResult] = await Promise.all([
    supabase.from('employees').select('*').order('full_name', { ascending: true }),
    supabase
      .from('attendance_logs')
      .select('*')
      .is('deleted_at', null)
      .gte('attendance_date', range.start)
      .lte('attendance_date', range.end)
      .order('attendance_date', { ascending: true }),
    supabase
      .from('holidays')
      .select('*')
      .eq('is_active', true)
      .gte('holiday_date', range.start)
      .lte('holiday_date', range.end),
    supabase
      .from('attendance_period_confirmations')
      .select('*')
      .eq('period_month', periodMonth),
  ])

  if (employeeResult.error) throw employeeResult.error
  if (logResult.error) throw logResult.error
  if (holidayResult.error) throw holidayResult.error
  if (confirmationResult.error) throw confirmationResult.error

  const [leaveResult, phlResult, requestTypeResult] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*')
      .lte('start_date', range.end)
      .gte('end_date', range.start)
      .order('start_date', { ascending: true }),
    supabase
      .from('phl_records')
      .select('*')
      .eq('source', 'employee_phl_claim')
      .gte('phl_date', range.start)
      .lte('phl_date', range.end)
      .order('phl_date', { ascending: true }),
    supabase
      .from('harmony_request_types')
      .select('code,label,request_category,attendance_status,is_leave_like,is_absence_like,is_phl_claim,is_active')
      .order('sort_order', { ascending: true }),
  ])

  if (leaveResult.error) {
    warnings.push(`Direct leave/ST source belum terbaca: ${leaveResult.error.message}`)
  }

  if (phlResult.error) {
    warnings.push(`Direct PHL claim source belum terbaca: ${phlResult.error.message}`)
  }

  if (requestTypeResult.error) {
    warnings.push(`Master jenis request tidak terbaca; classifier memakai fallback code/label: ${requestTypeResult.error.message}`)
  }

  const leaveRequests: AttendanceReportingRequest[] = (leaveResult.data || []).map((item: any) => ({
    id: item.id,
    source_table: 'leave_requests',
    employee_id: item.employee_id,
    employee_number: item.employee_number,
    machine_pin: item.machine_pin,
    start_date: item.start_date,
    end_date: item.end_date,
    request_type: item.request_type,
    request_label: item.leave_type,
    request_category: item.request_category,
    status: item.status,
    supervisor_status: item.supervisor_status,
    hr_status: item.hr_status,
    reason: item.reason,
    source: item.source,
    proof_url: item.proof_file_url,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))

  const phlClaims: AttendanceReportingRequest[] = (phlResult.data || []).map((item: any) => ({
    id: item.id,
    source_table: 'phl_records',
    employee_id: item.employee_id,
    employee_number: item.employee_number,
    machine_pin: item.machine_pin,
    start_date: item.phl_date,
    end_date: item.phl_date,
    request_type: 'phl_claim',
    request_label: 'Klaim PHL',
    request_category: 'phl_claim',
    status: item.status,
    supervisor_status: item.supervisor_status,
    hr_status: item.hr_status,
    reason: item.reason || item.notes,
    source: item.source,
    proof_url: item.proof_file_url,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))

  return {
    employees: (employeeResult.data || []) as AttendanceReportingEmployee[],
    logs: (logResult.data || []) as AttendanceRawLog[],
    holidays: (holidayResult.data || []) as AttendanceHoliday[],
    confirmations: (confirmationResult.data || []) as AttendancePeriodConfirmation[],
    requests: [...leaveRequests, ...phlClaims],
    requestTypes: (requestTypeResult.data || []) as AttendanceRequestTypeMeta[],
    warnings,
  }
}

export function buildAttendanceReportingRows(
  dataset: AttendanceReportingDataset,
  periodMonth: string,
): AttendanceReportingRow[] {
  const range = getCutoffRange(periodMonth)
  const confirmationMap = new Map<string, AttendancePeriodConfirmation>()

  dataset.confirmations.forEach((confirmation) => {
    const employeeId = String(confirmation.employee_id || '').trim()
    if (employeeId) confirmationMap.set(employeeId, confirmation)
  })

  const reportingEmployees = buildReportingEmployeeSet(dataset)

  return reportingEmployees
    .map((employee) => {
      const employeeLogs = getEmployeeLogs(employee, dataset.logs)
      const employeeRequests = getEmployeeRequests(employee, dataset.requests)
      const confirmation = employee.synthetic ? null : confirmationMap.get(employee.id) || null

      const summary = summarizeAttendancePeriod({
        logs: employeeLogs,
        requests: employeeRequests,
        requestTypes: dataset.requestTypes,
        holidays: dataset.holidays,
        periodStart: range.start,
        periodEnd: range.end,
        employmentStart: employee.join_date,
      })

      const hasPeriodActivity =
        employeeLogs.length > 0 ||
        employeeRequests.length > 0 ||
        Boolean(confirmation)

      return {
        employee,
        confirmation,
        logs: employeeLogs,
        requests: employeeRequests,
        summary,
        locked:
          Boolean(confirmation?.is_locked) ||
          employeeLogs.some((log) => Boolean(log.is_locked)),
        synthetic: Boolean(employee.synthetic),
        hasPeriodActivity,
      }
    })
    .filter((row) => row.employee.is_active !== false || row.hasPeriodActivity)
    .map(({ hasPeriodActivity: _hasPeriodActivity, ...row }) => row)
    .sort((a, b) =>
      String(a.employee.full_name || a.employee.employee_number || a.employee.machine_pin || '').localeCompare(
        String(b.employee.full_name || b.employee.employee_number || b.employee.machine_pin || ''),
        'id',
      ),
    )
}

function buildReportingEmployeeSet(dataset: AttendanceReportingDataset) {
  const employees = [...dataset.employees]

  const matchesKnownEmployee = (source: {
    employee_id?: string | null
    employee_number?: string | null
    machine_pin?: string | null
  }) =>
    employees.some((employee) => {
      if (source.employee_id && employee.id === source.employee_id) return true
      if (source.machine_pin && employee.machine_pin && String(employee.machine_pin) === String(source.machine_pin)) return true
      if (
        source.employee_number &&
        employee.employee_number &&
        String(employee.employee_number) === String(source.employee_number)
      ) {
        return true
      }
      return false
    })

  const orphanSources = [
    ...dataset.logs.map((log) => ({
      employee_id: log.employee_id,
      employee_number: log.employee_number,
      machine_pin: log.machine_pin,
      full_name: log.full_name,
      department: log.department,
      position: log.position,
    })),
    ...dataset.requests.map((request) => ({
      employee_id: request.employee_id,
      employee_number: request.employee_number,
      machine_pin: request.machine_pin,
      full_name: null,
      department: null,
      position: null,
    })),
  ].filter((source) => !matchesKnownEmployee(source))

  const orphanMap = new Map<string, AttendanceReportingEmployee>()

  orphanSources.forEach((source) => {
    const key =
      String(source.employee_id || '').trim() ||
      String(source.machine_pin || '').trim() ||
      String(source.employee_number || '').trim()

    if (!key || orphanMap.has(key)) return

    orphanMap.set(key, {
      id: `orphan:${key}`,
      employee_number: source.employee_number || null,
      machine_pin: source.machine_pin || null,
      full_name: source.full_name || `Data belum terhubung (${key})`,
      department: source.department || 'PERLU MAPPING',
      position: source.position || null,
      email: null,
      join_date: null,
      is_active: false,
      synthetic: true,
    })
  })

  return [...employees, ...orphanMap.values()]
}
