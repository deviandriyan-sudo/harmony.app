import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  sendHarmonyServerEmail,
} from '@/lib/notifications-server'
import type { HarmonyEmployeeIdentity } from '@/lib/server/user-api-auth'

function clean(value: unknown) {
  return String(value || '').trim()
}

function normalize(value: unknown) {
  return clean(value).toLowerCase()
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalize).filter(Boolean)))
}

function isEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value))
}

export function employeeIdentityKeys(employee: HarmonyEmployeeIdentity | null) {
  if (!employee) return []
  return unique([
    employee.id,
    employee.employee_number,
    employee.machine_pin,
    employee.full_name,
    employee.email,
  ])
}

function supervisorFieldMatches(value: unknown, keys: string[]) {
  const target = normalize(value)
  return Boolean(target && keys.includes(target))
}

function assignmentIsEffective(row: any, today: string) {
  if (row?.is_active === false || row?.is_primary === true) return false
  const start = clean(row?.start_date).slice(0, 10)
  const end = clean(row?.end_date).slice(0, 10)
  if (start && start > today) return false
  if (end && end < today) return false
  return true
}

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

export async function getPHLSubordinateIds(
  admin: SupabaseClient,
  supervisor: HarmonyEmployeeIdentity,
) {
  const keys = employeeIdentityKeys(supervisor)
  if (keys.length === 0) return [] as string[]

  const [employeesResult, assignmentsResult] = await Promise.all([
    admin
      .from('employees')
      .select('id,supervisor_1,supervisor_2,is_active')
      .eq('is_active', true),
    admin
      .from('employee_assignments')
      .select('employee_id,supervisor_1,supervisor_2,start_date,end_date,is_primary,is_active')
      .eq('is_active', true),
  ])

  if (employeesResult.error) throw employeesResult.error
  if (assignmentsResult.error) throw assignmentsResult.error

  const ids = new Set<string>()

  for (const row of employeesResult.data || []) {
    if (row.id === supervisor.id) continue
    if (
      supervisorFieldMatches(row.supervisor_1, keys) ||
      supervisorFieldMatches(row.supervisor_2, keys)
    ) {
      ids.add(row.id)
    }
  }

  const today = todayWita()
  for (const row of assignmentsResult.data || []) {
    if (!assignmentIsEffective(row, today)) continue
    if (!row.employee_id || row.employee_id === supervisor.id) continue
    if (
      supervisorFieldMatches(row.supervisor_1, keys) ||
      supervisorFieldMatches(row.supervisor_2, keys)
    ) {
      ids.add(row.employee_id)
    }
  }

  return [...ids]
}

export async function isPHLSupervisorOf(
  admin: SupabaseClient,
  supervisor: HarmonyEmployeeIdentity,
  employeeId: string,
) {
  const ids = await getPHLSubordinateIds(admin, supervisor)
  return ids.includes(employeeId)
}

async function supervisorEmailsForEmployee(
  admin: SupabaseClient,
  employeeId: string,
) {
  const [{ data: employee, error }, assignmentsResult] = await Promise.all([
    admin
      .from('employees')
      .select('supervisor_1,supervisor_2')
      .eq('id', employeeId)
      .maybeSingle(),
    admin
      .from('employee_assignments')
      .select('supervisor_1,supervisor_2,start_date,end_date,is_primary,is_active')
      .eq('employee_id', employeeId)
      .eq('is_active', true),
  ])

  if (error || !employee) return [] as string[]

  const refs = new Set(unique([employee.supervisor_1, employee.supervisor_2]))
  const today = todayWita()
  if (!assignmentsResult.error) {
    for (const assignment of assignmentsResult.data || []) {
      if (!assignmentIsEffective(assignment, today)) continue
      for (const ref of unique([assignment.supervisor_1, assignment.supervisor_2])) refs.add(ref)
    }
  }

  if (refs.size === 0) return []

  const { data: candidates } = await admin
    .from('employees')
    .select('id,employee_number,machine_pin,full_name,email,is_active')
    .eq('is_active', true)

  return unique(
    (candidates || [])
      .filter((candidate: any) => {
        const candidateKeys = unique([
          candidate.id,
          candidate.employee_number,
          candidate.machine_pin,
          candidate.full_name,
          candidate.email,
        ])
        return [...refs].some((ref) => candidateKeys.includes(ref))
      })
      .map((candidate: any) => candidate.email)
      .filter(isEmail),
  )
}

function appUrl(path: string) {
  return `${getNotificationEnvironmentStatus().appUrl}${path}`
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatMinutes(value: number) {
  const minutes = Math.max(0, Number(value || 0))
  return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`
}

export async function notifyPHLWorkSubmitted(
  admin: SupabaseClient,
  requestRow: any,
) {
  const emails = await supervisorEmailsForEmployee(admin, requestRow.employee_id)
  if (emails.length === 0) {
    return { ok: false, message: 'Email atasan belum ditemukan.' }
  }

  const title = 'Pengajuan Saldo PHL Baru'
  const message = [
    'Yth. Atasan HARMONY,',
    '',
    `${clean(requestRow.full_name) || 'Karyawan'} mengajukan saldo PHL.`,
    `Tanggal: ${formatDate(requestRow.work_date)}`,
    `Jam tugas: ${clean(requestRow.work_start_time).slice(0, 5)} - ${clean(requestRow.work_end_time).slice(0, 5)}`,
    `Durasi tercatat: ${formatMinutes(Number(requestRow.recorded_work_minutes || 0))}`,
    `Penugasan: ${clean(requestRow.work_purpose)}`,
    '',
    'Silakan review Surat Tugas/evidence dan approve atau reject pengajuan.',
  ].join('\n')

  const actionUrl = appUrl('/employee/approvals/phl')
  const result = await sendHarmonyServerEmail({
    to: emails,
    subject: `[HARMONY] Pengajuan Saldo PHL - ${clean(requestRow.full_name) || 'Karyawan'}`,
    html: buildServerHarmonyEmailHtml({
      title,
      message,
      actionLabel: 'Buka Approval PHL',
      actionUrl,
    }),
    text: buildServerHarmonyEmailText({
      title,
      message,
      actionLabel: 'Buka Approval PHL',
      actionUrl,
    }),
  })

  return { ok: result.ok, message: result.message }
}

export async function notifyPHLWorkDecision(requestRow: any) {
  const email = clean(requestRow.email)
  if (!isEmail(email)) return { ok: false, message: 'Email employee belum tersedia.' }

  const approved = normalize(requestRow.status) === 'approved'
  const title = approved ? 'Pengajuan Saldo PHL Disetujui' : 'Pengajuan Saldo PHL Ditolak'
  const statusText = approved ? 'disetujui' : 'ditolak'
  const message = [
    `Yth. ${clean(requestRow.full_name) || 'Karyawan'},`,
    '',
    `Pengajuan saldo PHL tanggal ${formatDate(requestRow.work_date)} telah ${statusText} oleh ${clean(requestRow.supervisor_name) || 'atasan'}.`,
    `Penugasan: ${clean(requestRow.work_purpose)}`,
    `Catatan atasan: ${clean(requestRow.supervisor_note) || '-'}`,
    approved ? 'Saldo bertambah 1 PHL dan berlaku 90 hari sejak tanggal pelaksanaan.' : 'Saldo PHL tidak berubah.',
  ].join('\n')

  const actionUrl = appUrl('/employee/phl')
  const result = await sendHarmonyServerEmail({
    to: email,
    subject: `[HARMONY] ${title}`,
    html: buildServerHarmonyEmailHtml({
      title,
      message,
      actionLabel: 'Buka PHL HARMONY',
      actionUrl,
    }),
    text: buildServerHarmonyEmailText({
      title,
      message,
      actionLabel: 'Buka PHL HARMONY',
      actionUrl,
    }),
  })

  return { ok: result.ok, message: result.message }
}

export async function notifyPHLWorkCancelled(
  admin: SupabaseClient,
  requestRow: any,
) {
  const emails = await supervisorEmailsForEmployee(admin, requestRow.employee_id)
  if (emails.length === 0) return { ok: false, message: 'Email atasan belum ditemukan.' }

  const title = 'Pengajuan PHL Dibatalkan'
  const message = [
    'Yth. Atasan HARMONY,',
    '',
    `${clean(requestRow.full_name) || 'Karyawan'} membatalkan pengajuan PHL kerja tanggal ${formatDate(requestRow.work_date)}.`,
    `Penugasan: ${clean(requestRow.work_purpose)}`,
    `Alasan pembatalan: ${clean(requestRow.cancel_note) || '-'}`,
  ].join('\n')

  const actionUrl = appUrl('/employee/approvals/phl')
  const result = await sendHarmonyServerEmail({
    to: emails,
    subject: `[HARMONY] Pengajuan PHL Dibatalkan - ${clean(requestRow.full_name) || 'Karyawan'}`,
    html: buildServerHarmonyEmailHtml({
      title,
      message,
      actionLabel: 'Buka Approval PHL',
      actionUrl,
    }),
    text: buildServerHarmonyEmailText({
      title,
      message,
      actionLabel: 'Buka Approval PHL',
      actionUrl,
    }),
  })

  return { ok: result.ok, message: result.message }
}
