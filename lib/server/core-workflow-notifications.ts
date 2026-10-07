import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  sendHarmonyServerEmail,
  type HarmonyServerEmailResult,
} from '@/lib/notifications-server'
import type {
  HarmonyWorkflowKey,
  HarmonyWorkflowNotificationResult,
} from '@/types/notificationWorkflow'

type AppUserLike = {
  id?: string | null
  email?: string | null
  role?: string | null
  employee_id?: string | null
  is_active?: boolean | null
}

type EmployeeRow = {
  id: string
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  department?: string | null
  unit?: string | null
  work_unit?: string | null
  position?: string | null
  position_name?: string | null
  job_position?: string | null
  email?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
  is_active?: boolean | null
}

type WorkflowInput = {
  admin: SupabaseClient
  appUser: AppUserLike
  authEmail: string
  workflow: HarmonyWorkflowKey
  entityId?: string | null
  data?: Record<string, unknown>
}

type Delivery = {
  target: string
  result: HarmonyServerEmailResult
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function normalize(value: unknown) {
  return clean(value).toLowerCase()
}

function normalizeEmail(value: unknown) {
  return normalize(value)
}

function isEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value))
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeEmail(value))
        .filter((value) => value && isEmail(value)),
    ),
  )
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value: unknown) {
  const raw = clean(value)
  if (!raw) return '-'

  const date = new Date(raw.length <= 10 ? `${raw}T00:00:00` : raw)
  if (Number.isNaN(date.getTime())) return raw

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function actionUrl(path: string) {
  return `${getNotificationEnvironmentStatus().appUrl}${path}`
}

function failureResult(message: string): HarmonyServerEmailResult {
  return { ok: false, message }
}

function summarize(deliveries: Delivery[]): HarmonyWorkflowNotificationResult {
  const sent = deliveries.filter((item) => item.result.ok).length
  const failed = deliveries.length - sent

  return {
    ok: deliveries.length > 0 && failed === 0,
    sent,
    failed,
    message:
      deliveries.length === 0
        ? 'Tidak ada penerima email yang tersedia.'
        : failed === 0
          ? `${sent} email notifikasi berhasil dikirim.`
          : `${sent} email terkirim, ${failed} gagal.`,
    details: deliveries.map((item) => ({
      target: item.target,
      ok: item.result.ok,
      message: item.result.message,
    })),
  }
}

async function sendTemplate({
  to,
  subject,
  title,
  message,
  actionLabel,
  path,
  footer,
}: {
  to: string | string[]
  subject: string
  title: string
  message: string
  actionLabel?: string
  path?: string
  footer?: string
}) {
  const url = path ? actionUrl(path) : undefined

  return sendHarmonyServerEmail({
    to,
    subject,
    html: buildServerHarmonyEmailHtml({
      title,
      message,
      actionLabel,
      actionUrl: url,
      footer,
    }),
    text: buildServerHarmonyEmailText({
      title,
      message,
      actionLabel,
      actionUrl: url,
      footer,
    }),
  })
}

async function getEmployeeById(admin: SupabaseClient, employeeId: string) {
  if (!clean(employeeId)) return null

  const { data } = await admin
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle()

  return (data || null) as EmployeeRow | null
}

async function resolveActorEmployee(
  admin: SupabaseClient,
  appUser: AppUserLike,
  authEmail: string,
) {
  if (appUser.employee_id) {
    const byId = await getEmployeeById(admin, appUser.employee_id)
    if (byId) return byId
  }

  const email = normalizeEmail(authEmail || appUser.email)
  if (!email) return null

  const { data } = await admin
    .from('employees')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  return (data || null) as EmployeeRow | null
}

function employeeName(employee?: EmployeeRow | null) {
  return (
    clean(employee?.full_name) ||
    clean(employee?.employee_name) ||
    clean(employee?.name) ||
    clean(employee?.email) ||
    '-'
  )
}

function employeeNumber(employee?: EmployeeRow | null) {
  return (
    clean(employee?.employee_number) ||
    clean(employee?.machine_pin) ||
    '-'
  )
}

function employeeDepartment(employee?: EmployeeRow | null) {
  return (
    clean(employee?.department) ||
    clean(employee?.unit) ||
    clean(employee?.work_unit) ||
    '-'
  )
}

function employeePosition(employee?: EmployeeRow | null) {
  return (
    clean(employee?.position) ||
    clean(employee?.position_name) ||
    clean(employee?.job_position) ||
    '-'
  )
}

function identityValues(employee?: EmployeeRow | null) {
  if (!employee) return []
  return [
    employee.id,
    employee.full_name,
    employee.employee_name,
    employee.name,
    employee.employee_number,
    employee.machine_pin,
    employee.email,
  ]
    .map(normalize)
    .filter(Boolean)
}

function employeeMatchesReference(employee: EmployeeRow, reference: unknown) {
  const target = normalize(reference)
  return Boolean(target && identityValues(employee).includes(target))
}

async function getActiveEmployees(admin: SupabaseClient) {
  const { data } = await admin
    .from('employees')
    .select('*')
    .eq('is_active', true)

  return ((data || []) as EmployeeRow[])
}

async function getSupervisorReferences(admin: SupabaseClient, employee: EmployeeRow) {
  const references = new Set<string>()

  ;[employee.supervisor_1, employee.supervisor_2].forEach((value) => {
    const cleaned = clean(value)
    if (cleaned) references.add(cleaned)
  })

  const { data } = await admin
    .from('employee_assignments')
    .select('supervisor_1,supervisor_2,is_active')
    .eq('employee_id', employee.id)
    .eq('is_active', true)

  ;(data || []).forEach((row: any) => {
    ;[row?.supervisor_1, row?.supervisor_2].forEach((value) => {
      const cleaned = clean(value)
      if (cleaned) references.add(cleaned)
    })
  })

  return Array.from(references)
}

async function getSupervisorEmails(admin: SupabaseClient, employee: EmployeeRow) {
  const references = await getSupervisorReferences(admin, employee)
  if (!references.length) return []

  const directEmails = references.filter(isEmail).map(normalizeEmail)
  const nonEmailRefs = references.filter((reference) => !isEmail(reference))
  const employees = nonEmailRefs.length > 0 ? await getActiveEmployees(admin) : []

  const resolved = employees
    .filter((candidate) =>
      nonEmailRefs.some((reference) => employeeMatchesReference(candidate, reference)),
    )
    .map((candidate) => candidate.email)

  return uniqueEmails([...directEmails, ...resolved])
}

async function getHrEmails(admin: SupabaseClient) {
  const { data } = await admin
    .from('app_users')
    .select('email,role,is_active')
    .eq('is_active', true)

  return uniqueEmails(
    (data || [])
      .filter((row: any) => normalize(row?.role).includes('hr'))
      .map((row: any) => row?.email),
  )
}

async function isSupervisorOf(
  admin: SupabaseClient,
  actor: EmployeeRow,
  target: EmployeeRow,
) {
  const actorIdentities = new Set(identityValues(actor))
  const references = await getSupervisorReferences(admin, target)

  return references.some((reference) => actorIdentities.has(normalize(reference)))
}

async function getLeaveRequest(
  admin: SupabaseClient,
  entityId: string,
  sourceHint?: unknown,
) {
  const hint = normalize(sourceHint)
  const order = hint === 'phl_records' || hint === 'phl_record'
    ? ['phl_records', 'leave_requests']
    : ['leave_requests', 'phl_records']

  for (const table of order) {
    const { data, error } = await admin
      .from(table)
      .select('*')
      .eq('id', entityId)
      .maybeSingle()

    if (!error && data) {
      return {
        table,
        row: data as Record<string, any>,
      }
    }
  }

  return null
}

function leaveRequestTypeLabel(row: Record<string, any>, table: string, data: Record<string, unknown>) {
  if (table === 'phl_records') return 'Klaim PHL'

  return (
    clean(data.requestTypeLabel) ||
    clean(row.leave_type) ||
    clean(row.request_type) ||
    'Cuti/Izin'
  )
}

function leavePeriod(row: Record<string, any>, table: string) {
  const start = table === 'phl_records'
    ? clean(row.claim_start_date || row.phl_date || row.valid_from)
    : clean(row.start_date)
  const end = table === 'phl_records'
    ? clean(row.claim_end_date || row.phl_date || row.valid_from)
    : clean(row.end_date)

  if (!start && !end) return '-'
  if (!end || start === end) return formatDate(start || end)
  return `${formatDate(start)} s.d. ${formatDate(end)}`
}

function leaveTotalDays(row: Record<string, any>, table: string) {
  return table === 'phl_records'
    ? numberValue(row.used_days || row.balance_days)
    : numberValue(row.total_days)
}

function leaveReason(row: Record<string, any>) {
  return clean(row.reason || row.notes) || '-'
}

function leaveJobPending(row: Record<string, any>) {
  return clean(row.job_pending || row.job_pending_summary || row.job_pending_detail) || '-'
}

function leaveHandover(row: Record<string, any>) {
  return clean(row.handover_to_full_name || row.handover_to) || '-'
}

function leaveHandoverNote(row: Record<string, any>) {
  return clean(row.handover_note) || '-'
}

async function ensureOwnedRequest(
  admin: SupabaseClient,
  actor: EmployeeRow,
  entityId: string,
  sourceHint?: unknown,
) {
  const request = await getLeaveRequest(admin, entityId, sourceHint)
  if (!request) {
    throw Object.assign(new Error('Data pengajuan tidak ditemukan untuk notifikasi.'), { status: 404 })
  }

  const targetEmployee = await getEmployeeById(admin, clean(request.row.employee_id))
  if (!targetEmployee || targetEmployee.id !== actor.id) {
    throw Object.assign(new Error('Pengajuan ini bukan milik akun employee yang sedang login.'), { status: 403 })
  }

  return { ...request, employee: targetEmployee }
}

async function ensureSupervisorRequest(
  admin: SupabaseClient,
  actor: EmployeeRow,
  entityId: string,
  sourceHint?: unknown,
) {
  const request = await getLeaveRequest(admin, entityId, sourceHint)
  if (!request) {
    throw Object.assign(new Error('Data pengajuan tidak ditemukan untuk notifikasi.'), { status: 404 })
  }

  const targetEmployee = await getEmployeeById(admin, clean(request.row.employee_id))
  if (!targetEmployee) {
    throw Object.assign(new Error('Data employee pemohon tidak ditemukan.'), { status: 404 })
  }

  if (!(await isSupervisorOf(admin, actor, targetEmployee))) {
    throw Object.assign(new Error('Akun ini bukan atasan yang berhak memproses pengajuan tersebut.'), { status: 403 })
  }

  return { ...request, employee: targetEmployee }
}

async function getPostponeRequest(
  admin: SupabaseClient,
  actor: EmployeeRow,
  entityId: string,
  sourceCycleId: string,
) {
  if (entityId) {
    const { data } = await admin
      .from('leave_postpone_requests')
      .select('*')
      .eq('id', entityId)
      .maybeSingle()
    if (data) return data as Record<string, any>
  }

  if (!sourceCycleId) return null

  const { data } = await admin
    .from('leave_postpone_requests')
    .select('*')
    .eq('source_cycle_id', sourceCycleId)
    .order('created_at', { ascending: false })
    .limit(20)

  const actorIds = new Set(identityValues(actor))

  return (
    (data || []).find((row: any) => {
      return [row.employee_id, row.employee_number, row.full_name]
        .map(normalize)
        .some((value) => value && actorIds.has(value))
    }) || null
  ) as Record<string, any> | null
}

async function ensureOwnedPostpone(
  admin: SupabaseClient,
  actor: EmployeeRow,
  entityId: string,
  sourceCycleId: string,
) {
  const row = await getPostponeRequest(admin, actor, entityId, sourceCycleId)
  if (!row) {
    throw Object.assign(new Error('Data postpone tidak ditemukan untuk notifikasi.'), { status: 404 })
  }

  const matchesActor = [row.employee_id, row.employee_number, row.full_name]
    .map(normalize)
    .some((value) => value && identityValues(actor).includes(value))

  if (!matchesActor) {
    throw Object.assign(new Error('Postpone ini bukan milik employee yang sedang login.'), { status: 403 })
  }

  return row
}

async function ensureSupervisorPostpone(
  admin: SupabaseClient,
  actor: EmployeeRow,
  entityId: string,
) {
  const { data: row } = await admin
    .from('leave_postpone_requests')
    .select('*')
    .eq('id', entityId)
    .maybeSingle()

  if (!row) {
    throw Object.assign(new Error('Data postpone tidak ditemukan untuk notifikasi.'), { status: 404 })
  }

  let targetEmployee: EmployeeRow | null = null
  if (row.employee_id) targetEmployee = await getEmployeeById(admin, row.employee_id)

  if (!targetEmployee) {
    const { data: employees } = await admin
      .from('employees')
      .select('*')
      .eq('is_active', true)

    targetEmployee = ((employees || []) as EmployeeRow[]).find((item) =>
      [row.employee_number, row.full_name]
        .map(normalize)
        .filter(Boolean)
        .some((reference) => employeeMatchesReference(item, reference)),
    ) || null
  }

  if (!targetEmployee) {
    throw Object.assign(new Error('Data employee pemohon postpone tidak ditemukan.'), { status: 404 })
  }

  const directRefs = [row.supervisor_1, row.supervisor_2]
    .map(normalize)
    .filter(Boolean)
  const actorIds = new Set(identityValues(actor))
  const directMatch = directRefs.some((reference) => actorIds.has(reference))
  const employeeMatch = await isSupervisorOf(admin, actor, targetEmployee)

  if (!directMatch && !employeeMatch) {
    throw Object.assign(new Error('Akun ini bukan atasan yang berhak memproses postpone tersebut.'), { status: 403 })
  }

  return { row: row as Record<string, any>, employee: targetEmployee }
}

async function notifyAttendancePeriodSubmitted(input: WorkflowInput, actor: EmployeeRow) {
  const periodMonth = clean(input.data?.periodMonth)
  if (!periodMonth) {
    throw Object.assign(new Error('Periode absensi tidak tersedia.'), { status: 400 })
  }

  const { data: confirmation } = await input.admin
    .from('attendance_period_confirmations')
    .select('*')
    .eq('employee_id', actor.id)
    .eq('period_month', periodMonth)
    .maybeSingle()

  if (!confirmation || normalize(confirmation.employee_status) !== 'submitted') {
    throw Object.assign(new Error('Submit periode absensi belum ditemukan atau statusnya belum submitted.'), { status: 409 })
  }

  const recipients = await getSupervisorEmails(input.admin, actor)
  const fallbackHr = recipients.length === 0 ? await getHrEmails(input.admin) : []
  const to = recipients.length > 0 ? recipients : fallbackHr

  if (!to.length) {
    return summarize([{ target: 'Atasan/HR', result: failureResult('Email atasan atau HR belum ditemukan.') }])
  }

  const batchId = clean(input.data?.batchId)
  const result = await sendTemplate({
    to,
    subject: `[HARMONY] Pengajuan Absensi Menunggu Approval - ${employeeName(actor)}`,
    title: 'Pengajuan Absensi Menunggu Approval',
    message: [
      'Ada pengajuan absensi baru yang menunggu approval atasan.',
      '',
      `Nama: ${employeeName(actor)}`,
      `NPK: ${employeeNumber(actor)}`,
      `Departemen: ${employeeDepartment(actor)}`,
      `Jabatan: ${employeePosition(actor)}`,
      `Periode: ${formatDate(confirmation.period_start)} s.d. ${formatDate(confirmation.period_end)}`,
      `Jumlah hari disubmit: ${numberValue(input.data?.submittedRows)}`,
      `Hadir: ${numberValue(confirmation.total_present_days)}`,
      `Cuti: ${numberValue(confirmation.total_leave_days)}`,
      `Izin: ${numberValue(confirmation.total_permit_days)}`,
      `Sakit: ${numberValue(confirmation.total_sick_days)}`,
      `Potensi/Klaim PHL: ${numberValue(input.data?.phlTotal ?? confirmation.total_phl_days)}`,
      '',
      `Batch ID: ${batchId || '-'}`,
    ].join('\n'),
    actionLabel: 'Buka Approval Absensi',
    path: '/employee/approvals/attendance',
    footer: 'Email ini dikirim otomatis oleh HARMONY setelah employee melakukan submit absensi periode.',
  })

  return summarize([{ target: to.join(', '), result }])
}

async function notifyLeaveSubmitted(input: WorkflowInput, actor: EmployeeRow) {
  const entityId = clean(input.entityId)
  if (!entityId) throw Object.assign(new Error('ID pengajuan tidak tersedia.'), { status: 400 })

  const request = await ensureOwnedRequest(input.admin, actor, entityId, input.data?.sourceTable)
  const requestLabel = leaveRequestTypeLabel(request.row, request.table, input.data || {})
  const supervisorEmails = await getSupervisorEmails(input.admin, actor)
  const hrEmails = await getHrEmails(input.admin)
  const deliveries: Delivery[] = []

  const body = [
    `Karyawan ${employeeName(actor)} mengajukan ${requestLabel}.`,
    '',
    `NIP / Employee Number: ${employeeNumber(actor)}`,
    `Departemen: ${employeeDepartment(actor)}`,
    `Jabatan: ${employeePosition(actor)}`,
    `Periode: ${leavePeriod(request.row, request.table)}`,
    `Total hari kerja: ${leaveTotalDays(request.row, request.table)} hari`,
    '',
    `Alasan: ${leaveReason(request.row)}`,
    '',
    `Job pending: ${leaveJobPending(request.row)}`,
    `Dialihkan kepada: ${leaveHandover(request.row)}`,
    `Catatan serah terima: ${leaveHandoverNote(request.row)}`,
    `ID Pengajuan: ${entityId}`,
    '',
    'Silakan buka HARMONY untuk melakukan pengecekan dan approval.',
  ].join('\n')

  if (supervisorEmails.length > 0) {
    deliveries.push({
      target: supervisorEmails.join(', '),
      result: await sendTemplate({
        to: supervisorEmails,
        subject: `[HARMONY] Pengajuan ${requestLabel} - ${employeeName(actor)}`,
        title: `Pengajuan ${requestLabel} Baru`,
        message: body,
        actionLabel: 'Buka Approval HARMONY',
        path: '/employee/approvals/leave',
      }),
    })
  } else {
    deliveries.push({
      target: 'Atasan',
      result: failureResult('Email atasan belum ditemukan.'),
    })
  }

  if (hrEmails.length > 0) {
    deliveries.push({
      target: hrEmails.join(', '),
      result: await sendTemplate({
        to: hrEmails,
        subject: `[HARMONY] Pengajuan ${requestLabel} - ${employeeName(actor)}`,
        title: `Pengajuan ${requestLabel} Baru`,
        message: body,
        actionLabel: 'Buka Cuti & Izin HR',
        path: '/hr/leave',
      }),
    })
  } else {
    deliveries.push({
      target: 'HR',
      result: failureResult('Email HR belum ditemukan.'),
    })
  }

  return summarize(deliveries)
}

async function notifyPostponeSubmitted(input: WorkflowInput, actor: EmployeeRow) {
  const entityId = clean(input.entityId)
  const sourceCycleId = clean(input.data?.sourceCycleId)
  const row = await ensureOwnedPostpone(input.admin, actor, entityId, sourceCycleId)
  const supervisorEmails = await getSupervisorEmails(input.admin, actor)
  const hrEmails = await getHrEmails(input.admin)
  const deliveries: Delivery[] = []

  const body = [
    `Karyawan ${employeeName(actor)} mengajukan postpone sisa cuti tahunan.`,
    '',
    `NIP / Employee Number: ${employeeNumber(actor)}`,
    `Departemen: ${employeeDepartment(actor)}`,
    `Jumlah hari diajukan: ${numberValue(row.requested_days)} hari`,
    `Cycle berakhir: ${formatDate(row.old_cycle_end)}`,
    `Batas pengajuan: ${formatDate(row.postpone_deadline)}`,
    `Berlaku sampai: ${formatDate(row.new_expired_at || row.expired_at)}`,
    '',
    `Alasan: ${clean(row.reason) || '-'}`,
    '',
    'Silakan buka HARMONY untuk melakukan pengecekan dan approval.',
  ].join('\n')

  if (supervisorEmails.length > 0) {
    deliveries.push({
      target: supervisorEmails.join(', '),
      result: await sendTemplate({
        to: supervisorEmails,
        subject: `[HARMONY] Pengajuan Postpone Cuti - ${employeeName(actor)}`,
        title: 'Pengajuan Postpone Cuti Baru',
        message: body,
        actionLabel: 'Buka Approval Postpone',
        path: '/employee/approvals/leave/postpone',
      }),
    })
  } else {
    deliveries.push({ target: 'Atasan', result: failureResult('Email atasan belum ditemukan.') })
  }

  if (hrEmails.length > 0) {
    deliveries.push({
      target: hrEmails.join(', '),
      result: await sendTemplate({
        to: hrEmails,
        subject: `[HARMONY] Pengajuan Postpone Cuti - ${employeeName(actor)}`,
        title: 'Pengajuan Postpone Cuti Baru',
        message: body,
        actionLabel: 'Buka Postpone HR',
        path: '/hr/leave/postpone',
      }),
    })
  } else {
    deliveries.push({ target: 'HR', result: failureResult('Email HR belum ditemukan.') })
  }

  return summarize(deliveries)
}

async function notifySupervisorLeaveDecision(input: WorkflowInput, actor: EmployeeRow) {
  const entityId = clean(input.entityId)
  const decision = normalize(input.data?.decision)
  if (!entityId || !['approved', 'rejected'].includes(decision)) {
    throw Object.assign(new Error('Data keputusan approval cuti/izin tidak lengkap.'), { status: 400 })
  }

  const request = await ensureSupervisorRequest(input.admin, actor, entityId, input.data?.sourceTable)
  const requestLabel = leaveRequestTypeLabel(request.row, request.table, input.data || {})
  const targetEmail = normalizeEmail(request.employee.email)
  const approved = decision === 'approved'
  const note = clean(input.data?.note)
  const deliveries: Delivery[] = []

  if (targetEmail) {
    deliveries.push({
      target: targetEmail,
      result: await sendTemplate({
        to: targetEmail,
        subject: `[HARMONY] ${requestLabel} ${approved ? 'Disetujui' : 'Ditolak'} Atasan`,
        title: `${requestLabel} ${approved ? 'Disetujui' : 'Ditolak'} Atasan`,
        message: [
          `Yth. ${employeeName(request.employee)},`,
          '',
          `Pengajuan ${requestLabel} Anda telah ${approved ? 'disetujui' : 'ditolak'} oleh atasan.`,
          '',
          `Periode: ${leavePeriod(request.row, request.table)}`,
          `Jumlah hari: ${leaveTotalDays(request.row, request.table)} hari`,
          `Diproses oleh: ${employeeName(actor)}`,
          `Catatan/alasan atasan: ${note || clean(request.row.supervisor_note) || '-'}`,
          `Status berikutnya: ${approved ? 'Menunggu review HR.' : 'Ditolak atasan. Silakan periksa catatan dan ajukan ulang bila diperlukan.'}`,
        ].join('\n'),
        actionLabel: 'Buka Cuti & Izin',
        path: '/employee/leave',
      }),
    })
  } else {
    deliveries.push({ target: 'Employee', result: failureResult('Email employee tidak ditemukan.') })
  }

  if (approved) {
    const hrEmails = await getHrEmails(input.admin)
    if (hrEmails.length > 0) {
      deliveries.push({
        target: hrEmails.join(', '),
        result: await sendTemplate({
          to: hrEmails,
          subject: `[HARMONY] ${requestLabel} Menunggu Review HR - ${employeeName(request.employee)}`,
          title: `${requestLabel} Menunggu Review HR`,
          message: [
            'Yth. Tim HR HARMONY,',
            '',
            `${requestLabel} milik ${employeeName(request.employee)} telah disetujui oleh atasan dan menunggu review HR.`,
            '',
            `Periode: ${leavePeriod(request.row, request.table)}`,
            `Jumlah hari: ${leaveTotalDays(request.row, request.table)} hari`,
            `Atasan/actor: ${employeeName(actor)}`,
            `Catatan atasan: ${note || clean(request.row.supervisor_note) || '-'}`,
            'Status berikutnya: Menunggu review HR.',
          ].join('\n'),
          actionLabel: 'Buka Approval HR',
          path: '/hr/leave',
        }),
      })
    } else {
      deliveries.push({ target: 'HR', result: failureResult('Email HR belum ditemukan.') })
    }
  }

  return summarize(deliveries)
}

async function notifySupervisorPostponeDecision(input: WorkflowInput, actor: EmployeeRow) {
  const entityId = clean(input.entityId)
  const decision = normalize(input.data?.decision)
  if (!entityId || !['approved', 'rejected'].includes(decision)) {
    throw Object.assign(new Error('Data keputusan postpone tidak lengkap.'), { status: 400 })
  }

  const request = await ensureSupervisorPostpone(input.admin, actor, entityId)
  const approved = decision === 'approved'
  const note = clean(input.data?.note)
  const level = Math.max(1, numberValue(input.data?.level))
  const nextStage = clean(input.data?.nextStage) || '-'
  const targetEmail = normalizeEmail(request.employee.email)
  const title = approved ? 'Postpone Cuti Disetujui Atasan' : 'Postpone Cuti Ditolak Atasan'
  const subject = approved
    ? `[HARMONY] Postpone Cuti Disetujui Atasan ${level}`
    : `[HARMONY] Postpone Cuti Ditolak Atasan ${level}`
  const deliveries: Delivery[] = []

  const employeeMessage = [
    `Halo ${employeeName(request.employee)},`,
    '',
    `Pengajuan postpone sisa cuti tahunan kamu telah ${approved ? 'disetujui' : 'ditolak'} oleh ${employeeName(actor)}.`,
    '',
    'Detail Pengajuan:',
    `- Jumlah hari diajukan: ${numberValue(request.row.requested_days)} hari`,
    `- Sisa cuti lama: ${numberValue(request.row.remaining_days)} hari`,
    `- Tanggal expired baru: ${formatDate(request.row.new_expired_at)}`,
    `- Tahap berikutnya: ${nextStage}`,
    `- Catatan atasan: ${note || '-'}`,
    '',
    approved
      ? 'Silakan pantau status lanjutan melalui menu Cuti & Izin.'
      : 'Silakan cek catatan penolakan melalui menu Cuti & Izin.',
  ].join('\n')

  if (targetEmail) {
    deliveries.push({
      target: targetEmail,
      result: await sendTemplate({
        to: targetEmail,
        subject,
        title,
        message: employeeMessage,
        actionLabel: 'Buka Cuti & Izin',
        path: '/employee/leave',
      }),
    })
  } else {
    deliveries.push({ target: 'Employee', result: failureResult('Email employee tidak ditemukan.') })
  }

  if (approved && normalize(nextStage) === 'menunggu hr') {
    const hrEmails = await getHrEmails(input.admin)
    if (hrEmails.length > 0) {
      deliveries.push({
        target: hrEmails.join(', '),
        result: await sendTemplate({
          to: hrEmails,
          subject: `[HARMONY] Postpone Cuti Menunggu Review HR - ${employeeName(request.employee)}`,
          title: 'Postpone Cuti Menunggu Review HR',
          message: [
            'Yth. Tim HR HARMONY,',
            '',
            `Pengajuan postpone cuti milik ${employeeName(request.employee)} telah disetujui oleh atasan dan menunggu review HR.`,
            '',
            `Jumlah hari diajukan: ${numberValue(request.row.requested_days)} hari`,
            `Sisa cuti lama: ${numberValue(request.row.remaining_days)} hari`,
            `Tanggal expired baru: ${formatDate(request.row.new_expired_at)}`,
            `Diproses oleh: ${employeeName(actor)}`,
            `Catatan atasan: ${note || '-'}`,
            'Status berikutnya: Menunggu review HR.',
          ].join('\n'),
          actionLabel: 'Buka Postpone HR',
          path: '/hr/leave/postpone',
        }),
      })
    } else {
      deliveries.push({ target: 'HR', result: failureResult('Email HR belum ditemukan.') })
    }
  }

  return summarize(deliveries)
}

async function notifySupervisorAttendanceDecision(input: WorkflowInput, actor: EmployeeRow) {
  const targetEmployeeId = clean(input.data?.targetEmployeeId)
  const periodMonth = clean(input.data?.periodMonth)
  const action = normalize(input.data?.action)

  if (!targetEmployeeId || !periodMonth || !['approved', 'rejected'].includes(action)) {
    throw Object.assign(new Error('Data keputusan approval absensi tidak lengkap.'), { status: 400 })
  }

  const targetEmployee = await getEmployeeById(input.admin, targetEmployeeId)
  if (!targetEmployee) {
    throw Object.assign(new Error('Data employee target tidak ditemukan.'), { status: 404 })
  }

  if (!(await isSupervisorOf(input.admin, actor, targetEmployee))) {
    throw Object.assign(new Error('Akun ini bukan atasan yang berhak memproses absensi employee tersebut.'), { status: 403 })
  }

  const { data: confirmation } = await input.admin
    .from('attendance_period_confirmations')
    .select('*')
    .eq('employee_id', targetEmployeeId)
    .eq('period_month', periodMonth)
    .maybeSingle()

  if (!confirmation) {
    throw Object.assign(new Error('Konfirmasi periode absensi tidak ditemukan.'), { status: 404 })
  }

  const approved = action === 'approved'
  const employeeEmail = normalizeEmail(targetEmployee.email)
  const hrEmails = approved ? await getHrEmails(input.admin) : []
  const scope = normalize(input.data?.scope)
  const totalDays = numberValue(input.data?.totalDays)
  const date = clean(input.data?.date)
  const note = clean(input.data?.note)
  const actionLabelText = approved ? 'disetujui' : 'ditolak'
  const scopeLabel =
    scope === 'period'
      ? 'periode absensi'
      : scope === 'selected'
        ? `${totalDays} tanggal absensi`
        : `absensi tanggal ${formatDate(date)}`
  const periodText = `${formatDate(confirmation.period_start)} s.d. ${formatDate(confirmation.period_end)}`
  const message = [
    'Halo,',
    '',
    `${scopeLabel} milik ${employeeName(targetEmployee)} untuk periode ${periodText} sudah ${actionLabelText} oleh ${employeeName(actor)}.`,
    note ? `Catatan atasan: ${note}` : '',
    approved
      ? 'Status sekarang siap diproses HR pada menu Final Report.'
      : 'Silakan cek kembali data absensi dan lakukan revisi bila diperlukan.',
  ]
    .filter(Boolean)
    .join('\n')

  const subject = `[HARMONY] Absensi ${employeeName(targetEmployee)} ${actionLabelText} atasan`
  const title = `Absensi ${actionLabelText.charAt(0).toUpperCase()}${actionLabelText.slice(1)} Atasan`
  const deliveries: Delivery[] = []

  if (employeeEmail) {
    deliveries.push({
      target: employeeEmail,
      result: await sendTemplate({
        to: employeeEmail,
        subject,
        title,
        message,
        actionLabel: 'Buka HARMONY',
        path: '/employee/attendance',
        footer: 'Email ini dikirim otomatis oleh HARMONY setelah approval absensi diproses atasan.',
      }),
    })
  } else {
    deliveries.push({ target: 'Employee', result: failureResult('Email employee tidak ditemukan.') })
  }

  if (approved) {
    if (hrEmails.length > 0) {
      deliveries.push({
        target: hrEmails.join(', '),
        result: await sendTemplate({
          to: hrEmails,
          subject,
          title,
          message,
          actionLabel: 'Buka Final Report HR',
          path: '/hr/attendance/final-report',
          footer: 'Email ini dikirim otomatis oleh HARMONY setelah approval absensi diproses atasan.',
        }),
      })
    } else {
      deliveries.push({ target: 'HR', result: failureResult('Email HR belum ditemukan.') })
    }
  }

  return summarize(deliveries)
}

async function notifyLeaveCancelled(input: WorkflowInput, actor: EmployeeRow) {
  const entityId = clean(input.entityId)
  if (!entityId) throw Object.assign(new Error('ID pengajuan tidak tersedia.'), { status: 400 })

  const request = await ensureOwnedRequest(input.admin, actor, entityId, input.data?.sourceTable)
  const requestLabel = leaveRequestTypeLabel(request.row, request.table, input.data || {})
  const note = clean(input.data?.note) || 'Dibatalkan oleh employee sebelum approval atasan.'
  const supervisorEmails = await getSupervisorEmails(input.admin, actor)
  const hrEmails = await getHrEmails(input.admin)
  const deliveries: Delivery[] = []
  const subject = `[HARMONY] ${requestLabel} Dibatalkan Employee - ${employeeName(actor)}`

  const commonLines = [
    `${employeeName(actor)} telah membatalkan pengajuan ${requestLabel} sebelum approval atasan.`,
    '',
    `Periode: ${leavePeriod(request.row, request.table)}`,
    `Jumlah hari: ${leaveTotalDays(request.row, request.table)} hari`,
    `Alasan pengajuan: ${leaveReason(request.row)}`,
    `Alasan pembatalan: ${note}`,
    'Status berikutnya: Dibatalkan. Pengajuan tidak lagi menunggu approval.',
  ]

  if (supervisorEmails.length > 0) {
    deliveries.push({
      target: supervisorEmails.join(', '),
      result: await sendTemplate({
        to: supervisorEmails,
        subject,
        title: `${requestLabel} Dibatalkan Employee`,
        message: ['Yth. Atasan HARMONY,', '', ...commonLines].join('\n'),
        actionLabel: 'Buka Approval Cuti & Izin',
        path: '/employee/approvals/leave',
      }),
    })
  }

  if (hrEmails.length > 0) {
    deliveries.push({
      target: hrEmails.join(', '),
      result: await sendTemplate({
        to: hrEmails,
        subject,
        title: `${requestLabel} Dibatalkan Employee`,
        message: ['Yth. Tim HR HARMONY,', '', ...commonLines].join('\n'),
        actionLabel: 'Buka Cuti & Izin HR',
        path: '/hr/leave',
      }),
    })
  }

  if (!deliveries.length) {
    deliveries.push({
      target: 'Atasan/HR',
      result: failureResult('Email atasan dan HR tidak ditemukan untuk notifikasi pembatalan.'),
    })
  }

  return summarize(deliveries)
}

async function notifyPostponeCancelled(input: WorkflowInput, actor: EmployeeRow) {
  const entityId = clean(input.entityId)
  if (!entityId) throw Object.assign(new Error('ID postpone tidak tersedia.'), { status: 400 })

  const row = await ensureOwnedPostpone(input.admin, actor, entityId, '')
  const note = clean(input.data?.note) || 'Dibatalkan oleh employee sebelum approval atasan.'
  const supervisorEmails = await getSupervisorEmails(input.admin, actor)
  const hrEmails = await getHrEmails(input.admin)
  const deliveries: Delivery[] = []
  const subject = `[HARMONY] Postpone Cuti Dibatalkan Employee - ${employeeName(actor)}`

  const commonLines = [
    `${employeeName(actor)} telah membatalkan pengajuan postpone sisa cuti tahunan sebelum approval atasan.`,
    '',
    `Jumlah hari diajukan: ${numberValue(row.requested_days)} hari`,
    `Cycle berakhir: ${formatDate(row.old_cycle_end)}`,
    `Berlaku sampai: ${formatDate(row.new_expired_at || row.expired_at)}`,
    `Alasan pengajuan: ${clean(row.reason) || '-'}`,
    `Alasan pembatalan: ${note}`,
    'Status berikutnya: Dibatalkan. Pengajuan tidak lagi menunggu approval.',
  ]

  if (supervisorEmails.length > 0) {
    deliveries.push({
      target: supervisorEmails.join(', '),
      result: await sendTemplate({
        to: supervisorEmails,
        subject,
        title: 'Postpone Cuti Dibatalkan Employee',
        message: ['Yth. Atasan HARMONY,', '', ...commonLines].join('\n'),
        actionLabel: 'Buka Approval Postpone',
        path: '/employee/approvals/leave/postpone',
      }),
    })
  }

  if (hrEmails.length > 0) {
    deliveries.push({
      target: hrEmails.join(', '),
      result: await sendTemplate({
        to: hrEmails,
        subject,
        title: 'Postpone Cuti Dibatalkan Employee',
        message: ['Yth. Tim HR HARMONY,', '', ...commonLines].join('\n'),
        actionLabel: 'Buka Postpone HR',
        path: '/hr/leave/postpone',
      }),
    })
  }

  if (!deliveries.length) {
    deliveries.push({
      target: 'Atasan/HR',
      result: failureResult('Email atasan dan HR tidak ditemukan untuk notifikasi pembatalan postpone.'),
    })
  }

  return summarize(deliveries)
}

export async function sendCoreWorkflowNotification(input: WorkflowInput) {
  const actor = await resolveActorEmployee(input.admin, input.appUser, input.authEmail)

  if (!actor) {
    throw Object.assign(
      new Error('Akun login belum terhubung ke data employee untuk menjalankan workflow notifikasi.'),
      { status: 403 },
    )
  }

  switch (input.workflow) {
    case 'attendance_period_submitted':
      return notifyAttendancePeriodSubmitted(input, actor)
    case 'leave_request_submitted':
      return notifyLeaveSubmitted(input, actor)
    case 'postpone_request_submitted':
      return notifyPostponeSubmitted(input, actor)
    case 'supervisor_attendance_decision':
      return notifySupervisorAttendanceDecision(input, actor)
    case 'supervisor_leave_decision':
      return notifySupervisorLeaveDecision(input, actor)
    case 'supervisor_postpone_decision':
      return notifySupervisorPostponeDecision(input, actor)
    case 'leave_request_cancelled':
      return notifyLeaveCancelled(input, actor)
    case 'postpone_request_cancelled':
      return notifyPostponeCancelled(input, actor)
    default:
      throw Object.assign(new Error('Workflow notifikasi tidak dikenali.'), { status: 400 })
  }
}
