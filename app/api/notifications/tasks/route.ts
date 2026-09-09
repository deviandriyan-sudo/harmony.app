import { NextRequest, NextResponse } from 'next/server'

import {
  harmonyApiError,
  normalizeHarmonyRole,
  normalizeHarmonyText,
  requireHarmonyApi,
  type HarmonyEmployeeIdentity,
} from '@/lib/server/user-api-auth'
import type {
  HarmonyActionTask,
  HarmonyTaskCenterResponse,
  HarmonyTaskPriority,
} from '@/types/notificationTask'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HR_ROLES = new Set([
  'hr',
  'admin',
  'administrator',
  'super_admin',
  'human_resources',
])

function todayWita() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const map = new Map(parts.map((part) => [part.type, part.value]))
  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`
}

function parseIsoDate(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function periodMonthForDate(value: string) {
  const parsed = parseIsoDate(value)
  if (!parsed) return ''

  if (parsed.day >= 11) {
    return `${parsed.year}-${String(parsed.month).padStart(2, '0')}`
  }

  const previous = new Date(parsed.year, parsed.month - 2, 1)
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`
}

function addMonthsToPeriod(periodMonth: string, delta: number) {
  const match = String(periodMonth || '').match(/^(\d{4})-(\d{2})$/)
  if (!match) return ''
  const date = new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function periodRange(periodMonth: string) {
  const match = String(periodMonth || '').match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const toIso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`

  return {
    start: toIso(new Date(year, month - 1, 11)),
    end: toIso(new Date(year, month, 10)),
  }
}

function formatPeriod(periodMonth: string) {
  const range = periodRange(periodMonth)
  if (!range) return periodMonth

  const fmt = (value: string) => {
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(date)
  }

  return `${fmt(range.start)} - ${fmt(range.end)}`
}

function employeeIdentitySet(employee: HarmonyEmployeeIdentity | null) {
  if (!employee) return new Set<string>()

  return new Set(
    [
      employee.id,
      employee.employee_number,
      employee.machine_pin,
      employee.full_name,
      employee.email,
    ]
      .map(normalizeHarmonyText)
      .filter(Boolean),
  )
}

function isSamePerson(
  value: unknown,
  employee: HarmonyEmployeeIdentity | null,
) {
  const target = normalizeHarmonyText(value)
  return Boolean(target && employeeIdentitySet(employee).has(target))
}

function listNames(
  rows: Array<Record<string, any>>,
  employeeById: Map<string, HarmonyEmployeeIdentity>,
) {
  const names = Array.from(
    new Set(
      rows
        .map((row) => {
          const employee = employeeById.get(String(row.employee_id || ''))
          return String(
            row.full_name || employee?.full_name || row.employee_number || '',
          ).trim()
        })
        .filter(Boolean),
    ),
  )

  if (names.length === 0) return ''
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')}, +${names.length - 3} lainnya`
}

function oldestCreatedAt(rows: Array<Record<string, any>>) {
  const values = rows
    .map((row) => String(row.created_at || row.employee_submitted_at || '').trim())
    .filter(Boolean)
    .sort()

  return values[0] || null
}

function task(
  input: Omit<HarmonyActionTask, 'count'> & { count?: number },
): HarmonyActionTask {
  return {
    ...input,
    count: Math.max(1, Number(input.count || 1)),
  }
}

function priorityRank(value: HarmonyTaskPriority) {
  if (value === 'urgent') return 0
  if (value === 'high') return 1
  return 2
}

export async function GET(request: NextRequest) {
  try {
    const { admin, appUser, employee } = await requireHarmonyApi(request)
    const role = normalizeHarmonyRole(appUser.role)
    const tasks: HarmonyActionTask[] = []
    const nowDate = todayWita()

    const employeeDirectoryResult = await admin
      .from('employees')
      .select(
        'id,employee_number,machine_pin,full_name,department,position,email,supervisor_1,supervisor_2,join_date,is_active',
      )
      .eq('is_active', true)

    if (employeeDirectoryResult.error) {
      throw employeeDirectoryResult.error
    }

    const employees = (employeeDirectoryResult.data || []) as HarmonyEmployeeIdentity[]
    const employeeById = new Map(employees.map((item) => [item.id, item]))

    // ------------------------------------------------------------
    // A. PERSONAL / EMPLOYEE ACTIONS
    // ------------------------------------------------------------
    if (employee?.id) {
      const [confirmationResult, rejectedLogsResult] = await Promise.all([
        admin
          .from('attendance_period_confirmations')
          .select(
            'id,employee_id,period_month,employee_status,supervisor_status,hr_status,is_locked,created_at,updated_at',
          )
          .eq('employee_id', employee.id)
          .order('period_month', { ascending: false })
          .limit(12),
        admin
          .from('attendance_logs')
          .select(
            'id,employee_id,attendance_date,supervisor_approval_status,hr_final_status,created_at,updated_at',
          )
          .eq('employee_id', employee.id)
          .or(
            'supervisor_approval_status.eq.rejected,hr_final_status.eq.rejected_by_supervisor',
          )
          .order('attendance_date', { ascending: false })
          .limit(100),
      ])

      if (confirmationResult.error) throw confirmationResult.error
      if (rejectedLogsResult.error) throw rejectedLogsResult.error

      const confirmations = (confirmationResult.data || []) as Array<
        Record<string, any>
      >
      const rejectedLogs = (rejectedLogsResult.data || []) as Array<
        Record<string, any>
      >

      const rejectedPeriods = new Set<string>()

      confirmations.forEach((row) => {
        const supervisor = normalizeHarmonyText(row.supervisor_status)
        const hr = normalizeHarmonyText(row.hr_status)
        if (supervisor === 'rejected' || hr === 'rejected_by_supervisor') {
          if (row.period_month) rejectedPeriods.add(String(row.period_month))
        }
      })

      rejectedLogs.forEach((row) => {
        // attendance_logs live tidak memiliki period_month.
        // Period 11-10 selalu diturunkan secara deterministik dari attendance_date.
        const period = periodMonthForDate(String(row.attendance_date || ''))
        if (period) rejectedPeriods.add(period)
      })

      if (rejectedPeriods.size > 0) {
        const periods = Array.from(rejectedPeriods).sort().reverse()
        tasks.push(
          task({
            id: 'employee-attendance-revision',
            category: 'attendance',
            scope: 'employee',
            priority: 'urgent',
            title: 'Absensi perlu direvisi',
            message:
              rejectedPeriods.size === 1
                ? `Periode ${formatPeriod(periods[0])} dikembalikan oleh atasan. Lengkapi koreksi lalu kirim ulang seluruh periode.`
                : `${rejectedPeriods.size} periode absensi masih membutuhkan revisi. Selesaikan koreksi dan kirim ulang ke atasan.`,
            action_url: `/employee/attendance?period=${encodeURIComponent(periods[0])}`,
            count: rejectedPeriods.size,
            period_month: periods[0],
          }),
        )
      }

      const activePeriod = periodMonthForDate(nowDate)
      const previousPeriod = addMonthsToPeriod(activePeriod, -1)
      const duePeriods = new Set<string>([previousPeriod])
      const activeRange = periodRange(activePeriod)
      if (activeRange?.end === nowDate) duePeriods.add(activePeriod)

      const confirmationByPeriod = new Map(
        confirmations.map((row) => [String(row.period_month || ''), row]),
      )

      const outstandingDue = Array.from(duePeriods)
        .filter(Boolean)
        .filter((period) => !rejectedPeriods.has(period))
        .filter((period) => {
          const range = periodRange(period)
          if (!range) return false

          const joinDate = String(employee.join_date || '').slice(0, 10)
          if (joinDate && joinDate > range.end) return false

          const row = confirmationByPeriod.get(period)
          if (!row) return true

          const employeeStatus = normalizeHarmonyText(row.employee_status)
          const supervisorStatus = normalizeHarmonyText(row.supervisor_status)
          const hrStatus = normalizeHarmonyText(row.hr_status)

          if (hrStatus === 'finalized') return false
          if (
            employeeStatus === 'submitted' ||
            ['pending', 'approved'].includes(supervisorStatus)
          ) {
            return false
          }

          return true
        })
        .sort()
        .reverse()

      if (outstandingDue.length > 0) {
        const period = outstandingDue[0]
        tasks.push(
          task({
            id: 'employee-attendance-submit-due',
            category: 'attendance',
            scope: 'employee',
            priority: activeRange?.end === nowDate ? 'urgent' : 'high',
            title: 'Absensi periode belum dikirim',
            message:
              outstandingDue.length === 1
                ? `Periode ${formatPeriod(period)} belum selesai dikirim ke atasan.`
                : `${outstandingDue.length} periode absensi belum selesai dikirim ke atasan.`,
            action_url: `/employee/attendance?period=${encodeURIComponent(period)}`,
            count: outstandingDue.length,
            period_month: period,
          }),
        )
      }
    }

    // ------------------------------------------------------------
    // B. SUPERVISOR ACTIONS - berlaku untuk role apa pun yang punya bawahan
    // ------------------------------------------------------------
    if (employee?.id) {
      const supervisorRefs = employeeIdentitySet(employee)
      const subordinates = employees.filter((item) => {
        if (item.id === employee.id) return false
        return [item.supervisor_1, item.supervisor_2]
          .map(normalizeHarmonyText)
          .some((value) => value && supervisorRefs.has(value))
      })
      const subordinateIds = subordinates.map((item) => item.id)

      if (subordinateIds.length > 0) {
        const [attendanceResult, leaveResult, phlResult, postponeResult] =
          await Promise.all([
            admin
              .from('attendance_period_confirmations')
              .select(
                'id,employee_id,period_month,employee_status,supervisor_status,hr_status,employee_submitted_at,created_at',
              )
              .in('employee_id', subordinateIds)
              .order('employee_submitted_at', { ascending: false })
              .limit(500),
            admin
              .from('leave_requests')
              .select(
                'id,employee_id,employee_number,full_name,request_type,leave_type,supervisor_status,status,hr_status,created_at',
              )
              .in('employee_id', subordinateIds)
              .order('created_at', { ascending: false })
              .limit(500),
            admin
              .from('phl_records')
              .select(
                'id,employee_id,employee_number,full_name,source,status,supervisor_status,hr_status,created_at',
              )
              .eq('source', 'employee_phl_claim')
              .in('employee_id', subordinateIds)
              .order('created_at', { ascending: false })
              .limit(500),
            admin
              .from('leave_postpone_requests')
              .select(
                'id,employee_id,employee_number,full_name,approval_status,supervisor_1,supervisor_1_status,supervisor_2,supervisor_2_status,hr_status,is_active,created_at',
              )
              .eq('is_active', true)
              .in('approval_status', [
                'pending_supervisor',
                'pending_supervisor_2',
              ])
              .order('created_at', { ascending: false })
              .limit(500),
          ])

        if (attendanceResult.error) throw attendanceResult.error
        if (leaveResult.error) throw leaveResult.error
        if (phlResult.error) throw phlResult.error
        if (postponeResult.error) throw postponeResult.error

        const attendancePending = (
          (attendanceResult.data || []) as Array<Record<string, any>>
        ).filter((row) => {
          const employeeStatus = normalizeHarmonyText(row.employee_status)
          const supervisorStatus = normalizeHarmonyText(row.supervisor_status)
          return (
            employeeStatus === 'submitted' &&
            (supervisorStatus === 'pending' || supervisorStatus === '')
          )
        })

        if (attendancePending.length > 0) {
          const periods = attendancePending
            .map((row) => String(row.period_month || ''))
            .filter(Boolean)
            .sort()
          tasks.push(
            task({
              id: 'supervisor-attendance-approval',
              category: 'attendance',
              scope: 'supervisor',
              priority: 'high',
              title: 'Approval absensi tim menunggu',
              message: `${attendancePending.length} periode bawahan belum direview atasan. ${listNames(attendancePending, employeeById)}`,
              action_url: '/employee/approvals/attendance',
              count: attendancePending.length,
              period_month: periods[0] || null,
              oldest_created_at: oldestCreatedAt(attendancePending),
            }),
          )
        }

        const leavePending = (
          (leaveResult.data || []) as Array<Record<string, any>>
        ).filter((row) => {
          if (normalizeHarmonyText(row.request_type) === 'phl_claim') return false
          const status = normalizeHarmonyText(row.supervisor_status || row.status)
          return ['pending', 'submitted', 'menunggu', ''].includes(status)
        })

        if (leavePending.length > 0) {
          tasks.push(
            task({
              id: 'supervisor-leave-approval',
              category: 'leave',
              scope: 'supervisor',
              priority: 'high',
              title: 'Cuti / izin menunggu approval',
              message: `${leavePending.length} pengajuan bawahan belum diproses. ${listNames(leavePending, employeeById)}`,
              action_url: '/employee/approvals/leave',
              count: leavePending.length,
              oldest_created_at: oldestCreatedAt(leavePending),
            }),
          )
        }

        const phlPending = (
          (phlResult.data || []) as Array<Record<string, any>>
        ).filter((row) => {
          const supervisor = normalizeHarmonyText(row.supervisor_status)
          const hr = normalizeHarmonyText(row.hr_status)
          const status = normalizeHarmonyText(row.status)
          return (
            (supervisor === 'pending' || supervisor === '') &&
            hr !== 'approved' &&
            !['approved', 'rejected', 'cancelled', 'canceled'].includes(status)
          )
        })

        if (phlPending.length > 0) {
          tasks.push(
            task({
              id: 'supervisor-phl-approval',
              category: 'phl',
              scope: 'supervisor',
              priority: 'high',
              title: 'Klaim PHL menunggu approval',
              message: `${phlPending.length} klaim PHL bawahan belum diproses atasan. ${listNames(phlPending, employeeById)}`,
              action_url: '/employee/approvals/leave',
              count: phlPending.length,
              oldest_created_at: oldestCreatedAt(phlPending),
            }),
          )
        }

        const postponePending = (
          (postponeResult.data || []) as Array<Record<string, any>>
        ).filter((row) => {
          const asSupervisor1 =
            isSamePerson(row.supervisor_1, employee) &&
            normalizeHarmonyText(row.supervisor_1_status) === 'pending'

          const asSupervisor2 =
            isSamePerson(row.supervisor_2, employee) &&
            normalizeHarmonyText(row.supervisor_1_status) === 'approved' &&
            normalizeHarmonyText(row.supervisor_2_status) === 'pending'

          return asSupervisor1 || asSupervisor2
        })

        if (postponePending.length > 0) {
          tasks.push(
            task({
              id: 'supervisor-postpone-approval',
              category: 'postpone',
              scope: 'supervisor',
              priority: 'high',
              title: 'Postpone cuti menunggu approval',
              message: `${postponePending.length} pengajuan postpone bawahan belum diproses. ${listNames(postponePending, employeeById)}`,
              action_url: '/employee/approvals/leave/postpone',
              count: postponePending.length,
              oldest_created_at: oldestCreatedAt(postponePending),
            }),
          )
        }
      }
    }

    // ------------------------------------------------------------
    // C. HR ACTIONS
    // ------------------------------------------------------------
    if (HR_ROLES.has(role)) {
      const [leaveResult, phlResult, postponeResult, attendanceResult] =
        await Promise.all([
          admin
            .from('leave_requests')
            .select(
              'id,employee_id,employee_number,full_name,request_type,leave_type,status,supervisor_status,hr_status,created_at',
            )
            .order('created_at', { ascending: false })
            .limit(1000),
          admin
            .from('phl_records')
            .select(
              'id,employee_id,employee_number,full_name,source,status,supervisor_status,hr_status,created_at',
            )
            .eq('source', 'employee_phl_claim')
            .order('created_at', { ascending: false })
            .limit(1000),
          admin
            .from('leave_postpone_requests')
            .select(
              'id,employee_id,employee_number,full_name,approval_status,hr_status,is_active,created_at',
            )
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1000),
          admin
            .from('attendance_period_confirmations')
            .select(
              'id,employee_id,period_month,employee_status,supervisor_status,hr_status,is_locked,employee_submitted_at,created_at',
            )
            .order('period_month', { ascending: false })
            .limit(1000),
        ])

      if (leaveResult.error) throw leaveResult.error
      if (phlResult.error) throw phlResult.error
      if (postponeResult.error) throw postponeResult.error
      if (attendanceResult.error) throw attendanceResult.error

      const leaveReady = (
        (leaveResult.data || []) as Array<Record<string, any>>
      ).filter((row) => {
        if (normalizeHarmonyText(row.request_type) === 'phl_claim') return false
        const supervisor = normalizeHarmonyText(row.supervisor_status)
        const hr = normalizeHarmonyText(row.hr_status || row.status)
        return (
          supervisor === 'approved' &&
          ['pending', 'submitted', 'waiting_hr'].includes(hr)
        )
      })

      if (leaveReady.length > 0) {
        tasks.push(
          task({
            id: 'hr-leave-approval',
            category: 'leave',
            scope: 'hr',
            priority: 'high',
            title: 'Cuti / izin siap diproses HR',
            message: `${leaveReady.length} pengajuan sudah disetujui atasan dan masih menunggu HR. ${listNames(leaveReady, employeeById)}`,
            action_url: '/hr/leave',
            count: leaveReady.length,
            oldest_created_at: oldestCreatedAt(leaveReady),
          }),
        )
      }

      const phlReady = (
        (phlResult.data || []) as Array<Record<string, any>>
      ).filter((row) => {
        const supervisor = normalizeHarmonyText(row.supervisor_status)
        const hr = normalizeHarmonyText(row.hr_status)
        const status = normalizeHarmonyText(row.status)
        return (
          supervisor === 'approved' &&
          hr === 'pending' &&
          ['pending', 'submitted', 'waiting_hr'].includes(status)
        )
      })

      if (phlReady.length > 0) {
        tasks.push(
          task({
            id: 'hr-phl-approval',
            category: 'phl',
            scope: 'hr',
            priority: 'high',
            title: 'Klaim PHL siap diproses HR',
            message: `${phlReady.length} klaim sudah disetujui atasan dan masih menunggu HR. ${listNames(phlReady, employeeById)}`,
            action_url: '/hr/leave',
            count: phlReady.length,
            oldest_created_at: oldestCreatedAt(phlReady),
          }),
        )
      }

      const postponeReady = (
        (postponeResult.data || []) as Array<Record<string, any>>
      ).filter((row) => {
        return (
          normalizeHarmonyText(row.approval_status) === 'pending_hr' &&
          normalizeHarmonyText(row.hr_status) === 'pending'
        )
      })

      if (postponeReady.length > 0) {
        tasks.push(
          task({
            id: 'hr-postpone-approval',
            category: 'postpone',
            scope: 'hr',
            priority: 'high',
            title: 'Postpone cuti siap diproses HR',
            message: `${postponeReady.length} pengajuan postpone sudah sampai tahap HR. ${listNames(postponeReady, employeeById)}`,
            action_url: '/hr/leave/postpone',
            count: postponeReady.length,
            oldest_created_at: oldestCreatedAt(postponeReady),
          }),
        )
      }

      const attendanceReady = (
        (attendanceResult.data || []) as Array<Record<string, any>>
      ).filter((row) => {
        return (
          normalizeHarmonyText(row.supervisor_status) === 'approved' &&
          normalizeHarmonyText(row.hr_status) === 'ready_for_hr' &&
          row.is_locked !== true
        )
      })

      if (attendanceReady.length > 0) {
        const periods = attendanceReady
          .map((row) => String(row.period_month || ''))
          .filter(Boolean)
          .sort()
        const period = periods[0] || ''

        tasks.push(
          task({
            id: 'hr-attendance-review-finalize',
            category: 'attendance',
            scope: 'hr',
            priority: 'high',
            title: 'Absensi menunggu proses HR',
            message: `${attendanceReady.length} periode karyawan sudah disetujui atasan tetapi belum selesai difinalisasi HR. ${listNames(attendanceReady, employeeById)}`,
            action_url: period
              ? `/hr/attendance/approvals?period=${encodeURIComponent(period)}`
              : '/hr/attendance/approvals',
            count: attendanceReady.length,
            period_month: period || null,
            oldest_created_at: oldestCreatedAt(attendanceReady),
          }),
        )
      }
    }

    tasks.sort((a, b) => {
      const priority = priorityRank(a.priority) - priorityRank(b.priority)
      if (priority !== 0) return priority
      return a.title.localeCompare(b.title, 'id')
    })

    const response: HarmonyTaskCenterResponse = {
      success: true,
      tasks,
      pending_count: tasks.reduce((sum, item) => sum + item.count, 0),
      role: role || null,
      employee_id: employee?.id || appUser.employee_id || null,
      checked_at: new Date().toISOString(),
      warning:
        !employee?.id && !HR_ROLES.has(role)
          ? 'Akun belum terhubung ke employee sehingga task personal/supervisor tidak dapat dihitung.'
          : null,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    const parsed = harmonyApiError(
      error,
      'Gagal menghitung task HARMONY yang belum selesai.',
    )

    const response: HarmonyTaskCenterResponse = {
      success: false,
      tasks: [],
      pending_count: 0,
      error: parsed.message,
    }

    return NextResponse.json(response, { status: parsed.status })
  }
}
