import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  sendHarmonyServerEmail,
  type HarmonyServerEmailResult,
} from '@/lib/notifications-server'
import { enrichRemedClaims } from '@/lib/server/remed-data'

export type WorkflowNotificationResult = {
  ok: boolean
  sent: number
  failed: number
  message: string
  details?: Array<{ target: string; ok: boolean; message: string }>
}

type RemedClaimContext = any & {
  employee?: {
    id?: string | null
    full_name?: string | null
    employee_number?: string | null
    department?: string | null
    position?: string | null
    email?: string | null
  } | null
  claim_type?: { name?: string | null } | null
}

type EntitlementSnapshot = {
  plafond_total: number
  legacy_used: number
  current_used: number
  reserved_amount: number
  balance_adjustment: number
  available_amount: number
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase()
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeEmail).filter(Boolean)))
}

function rupiah(value: unknown) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function dateId(value: unknown) {
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

async function resolveActorName(admin: SupabaseClient, actorEmail: string) {
  const email = normalizeEmail(actorEmail)
  if (!email) return 'HARMONY'

  const { data } = await admin
    .from('employees')
    .select('full_name')
    .ilike('email', email)
    .maybeSingle()

  return clean(data?.full_name) || actorEmail
}

async function getClaim(admin: SupabaseClient, claimId: string): Promise<RemedClaimContext | null> {
  const { data, error } = await admin
    .from('remed_claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle()

  if (error || !data) return null
  const enriched = await enrichRemedClaims(admin, [data])
  return (enriched[0] || null) as RemedClaimContext | null
}

async function getRemedRoleEmails(admin: SupabaseClient, role: 'hr' | 'finance') {
  const { data } = await admin
    .from('remed_user_access')
    .select('email,role,is_active')
    .eq('role', role)
    .eq('is_active', true)

  let emails = uniqueEmails((data || []).map((row: any) => row.email))

  if (role === 'hr' && emails.length === 0) {
    const fallback = await admin
      .from('app_users')
      .select('email,role,is_active')
      .eq('is_active', true)

    emails = uniqueEmails(
      (fallback.data || [])
        .filter((row: any) => clean(row.role).toLowerCase().includes('hr'))
        .map((row: any) => row.email),
    )
  }

  return emails
}

async function sendTemplate({
  to,
  subject,
  title,
  message,
  actionLabel,
  path,
}: {
  to: string | string[]
  subject: string
  title: string
  message: string
  actionLabel: string
  path: string
}): Promise<HarmonyServerEmailResult> {
  const url = actionUrl(path)
  return sendHarmonyServerEmail({
    to,
    subject,
    html: buildServerHarmonyEmailHtml({ title, message, actionLabel, actionUrl: url }),
    text: buildServerHarmonyEmailText({ title, message, actionLabel, actionUrl: url }),
  })
}

function summarize(results: Array<{ target: string; result: HarmonyServerEmailResult }>): WorkflowNotificationResult {
  const sent = results.filter((item) => item.result.ok).length
  const failed = results.length - sent
  return {
    ok: failed === 0 && sent > 0,
    sent,
    failed,
    message:
      results.length === 0
        ? 'Tidak ada penerima email yang tersedia.'
        : failed === 0
          ? `${sent} email notifikasi berhasil dikirim.`
          : `${sent} email terkirim, ${failed} gagal.`,
    details: results.map((item) => ({
      target: item.target,
      ok: item.result.ok,
      message: item.result.message,
    })),
  }
}

function missingRecipient(message: string): HarmonyServerEmailResult {
  return { ok: false, message }
}

export async function notifyRemedClaimSubmitted(
  admin: SupabaseClient,
  claimId: string,
): Promise<WorkflowNotificationResult> {
  const claim = await getClaim(admin, claimId)
  if (!claim) return { ok: false, sent: 0, failed: 0, message: 'Data claim tidak ditemukan untuk notifikasi.' }

  const hrEmails = await getRemedRoleEmails(admin, 'hr')
  if (!hrEmails.length) return { ok: false, sent: 0, failed: 0, message: 'Email HR Re-Med tidak ditemukan.' }

  const employeeName = clean(claim.employee?.full_name) || 'Karyawan'
  const result = await sendTemplate({
    to: hrEmails,
    subject: `[HARMONY Re-Med] Klaim Baru ${clean(claim.claim_number) || claim.id} - ${employeeName}`,
    title: 'Klaim Re-Med Baru Menunggu Verifikasi HR',
    message: [
      'Yth. Tim HR Re-Med,',
      '',
      `${employeeName} telah mengajukan klaim medical reimbursement baru.`,
      '',
      `Nomor klaim: ${clean(claim.claim_number) || '-'}`,
      `Jenis klaim: ${clean(claim.claim_type?.name) || '-'}`,
      `Tanggal pengobatan: ${dateId(claim.treatment_date)}`,
      `Provider: ${clean(claim.provider_name) || '-'}`,
      `Nominal diajukan: ${rupiah(claim.submitted_amount)}`,
      `Catatan employee: ${clean(claim.employee_note) || '-'}`,
      '',
      'Actor: Employee',
      'Status berikutnya: Menunggu verifikasi HR.',
    ].join('\n'),
    actionLabel: 'Review Klaim Re-Med',
    path: '/remed/hr/claims',
  })

  return summarize([{ target: hrEmails.join(', '), result }])
}

export async function notifyRemedClaimCancelled(
  admin: SupabaseClient,
  claimId: string,
  actorEmail: string,
  reason: string,
  priorStatus?: string | null,
): Promise<WorkflowNotificationResult> {
  const claim = await getClaim(admin, claimId)
  if (!claim) return { ok: false, sent: 0, failed: 0, message: 'Data claim tidak ditemukan untuk notifikasi pembatalan.' }

  const actorName = await resolveActorName(admin, actorEmail)
  const employeeName = clean(claim.employee?.full_name) || actorName || 'Karyawan'
  const hrEmails = await getRemedRoleEmails(admin, 'hr')
  const normalizedPriorStatus = clean(priorStatus).toLowerCase()
  const financeWasInvolved = [
    'pending_finance',
    'waiting_payment',
    'approved_finance',
    'paid',
  ].includes(normalizedPriorStatus)
  const results: Array<{ target: string; result: HarmonyServerEmailResult }> = []

  const baseMessage = [
    `${employeeName} telah membatalkan klaim Re-Med.`,
    '',
    `Nomor klaim: ${clean(claim.claim_number) || '-'}`,
    `Jenis klaim: ${clean(claim.claim_type?.name) || '-'}`,
    `Nominal diajukan: ${rupiah(claim.submitted_amount)}`,
    `Dibatalkan oleh: ${actorName}`,
    `Alasan pembatalan: ${clean(reason) || '-'}`,
    'Status berikutnya: Dibatalkan. Klaim tidak lagi diproses.',
  ]

  if (hrEmails.length) {
    results.push({
      target: hrEmails.join(', '),
      result: await sendTemplate({
        to: hrEmails,
        subject: `[HARMONY Re-Med] Klaim Dibatalkan Employee - ${clean(claim.claim_number) || claim.id}`,
        title: 'Klaim Re-Med Dibatalkan Employee',
        message: ['Yth. Tim HR Re-Med,', '', ...baseMessage].join('\n'),
        actionLabel: 'Buka Klaim Re-Med HR',
        path: '/remed/hr/claims',
      }),
    })
  } else {
    results.push({
      target: 'HR',
      result: missingRecipient('Email HR Re-Med wajib tetapi tidak ditemukan.'),
    })
  }

  if (financeWasInvolved) {
    const financeEmails = await getRemedRoleEmails(admin, 'finance')
    if (financeEmails.length) {
      results.push({
        target: financeEmails.join(', '),
        result: await sendTemplate({
          to: financeEmails,
          subject: `[HARMONY Re-Med] Klaim Dibatalkan Employee - ${clean(claim.claim_number) || claim.id}`,
          title: 'Klaim Re-Med Dibatalkan Employee',
          message: ['Yth. Tim Finance Re-Med,', '', ...baseMessage].join('\n'),
          actionLabel: 'Buka Klaim Re-Med Finance',
          path: '/remed/finance/claims',
        }),
      })
    } else {
      results.push({
        target: 'Finance',
        result: missingRecipient('Email Finance Re-Med wajib tetapi tidak ditemukan.'),
      })
    }
  }

  return summarize(results)
}

export async function notifyRemedHrDecision(
  admin: SupabaseClient,
  claimId: string,
  decision: 'approve' | 'reject',
  actorEmail: string,
  note: string,
): Promise<WorkflowNotificationResult> {
  const claim = await getClaim(admin, claimId)
  if (!claim) return { ok: false, sent: 0, failed: 0, message: 'Data claim tidak ditemukan untuk notifikasi.' }

  const actorName = await resolveActorName(admin, actorEmail)
  const employeeEmail = normalizeEmail(claim.employee?.email)
  const employeeName = clean(claim.employee?.full_name) || 'Karyawan'
  const approved = decision === 'approve'
  const results: Array<{ target: string; result: HarmonyServerEmailResult }> = []

  if (employeeEmail) {
    const employeeResult = await sendTemplate({
      to: employeeEmail,
      subject: `[HARMONY Re-Med] Klaim ${approved ? 'Disetujui' : 'Ditolak'} HR - ${clean(claim.claim_number) || claim.id}`,
      title: `Klaim Re-Med ${approved ? 'Disetujui' : 'Ditolak'} HR`,
      message: [
        `Yth. ${employeeName},`,
        '',
        `Klaim Re-Med Anda telah ${approved ? 'disetujui' : 'ditolak'} oleh HR.`,
        '',
        `Nomor klaim: ${clean(claim.claim_number) || '-'}`,
        `Jenis klaim: ${clean(claim.claim_type?.name) || '-'}`,
        `Nominal diajukan: ${rupiah(claim.submitted_amount)}`,
        `Nominal disetujui: ${approved ? rupiah(claim.approved_amount) : '-'}`,
        `Diproses oleh: ${actorName}`,
        `Catatan/alasan HR: ${clean(note || claim.hr_note) || '-'}`,
        `Status berikutnya: ${approved ? 'Menunggu verifikasi Finance.' : 'Ditolak HR. Proses klaim selesai.'}`,
      ].join('\n'),
      actionLabel: 'Lihat Klaim Saya',
      path: '/remed/employee/claims',
    })
    results.push({ target: employeeEmail, result: employeeResult })
  } else {
    results.push({
      target: 'Employee',
      result: missingRecipient('Email employee wajib tetapi tidak ditemukan.'),
    })
  }

  if (approved) {
    const financeEmails = await getRemedRoleEmails(admin, 'finance')
    if (financeEmails.length) {
      const financeResult = await sendTemplate({
        to: financeEmails,
        subject: `[HARMONY Re-Med] Klaim Menunggu Finance - ${clean(claim.claim_number) || claim.id}`,
        title: 'Klaim Re-Med Menunggu Verifikasi Finance',
        message: [
          'Yth. Tim Finance Re-Med,',
          '',
          `HR telah menyetujui klaim ${clean(claim.claim_number) || '-'} milik ${employeeName}.`,
          '',
          `Jenis klaim: ${clean(claim.claim_type?.name) || '-'}`,
          `Nominal diajukan: ${rupiah(claim.submitted_amount)}`,
          `Nominal disetujui HR: ${rupiah(claim.approved_amount)}`,
          `Diproses HR oleh: ${actorName}`,
          `Catatan HR: ${clean(note || claim.hr_note) || '-'}`,
          'Status berikutnya: Menunggu verifikasi Finance.',
        ].join('\n'),
        actionLabel: 'Review Finance',
        path: '/remed/finance/claims',
      })
      results.push({ target: financeEmails.join(', '), result: financeResult })
    } else {
      results.push({
        target: 'Finance',
        result: missingRecipient('Email Finance Re-Med wajib tetapi tidak ditemukan.'),
      })
    }
  }

  return summarize(results)
}

export async function notifyRemedFinanceDecision(
  admin: SupabaseClient,
  claimId: string,
  decision: 'approve' | 'reject',
  actorEmail: string,
  note: string,
): Promise<WorkflowNotificationResult> {
  const claim = await getClaim(admin, claimId)
  if (!claim) return { ok: false, sent: 0, failed: 0, message: 'Data claim tidak ditemukan untuk notifikasi.' }

  const employeeEmail = normalizeEmail(claim.employee?.email)
  if (!employeeEmail) return { ok: false, sent: 0, failed: 0, message: 'Email employee tidak ditemukan.' }

  const actorName = await resolveActorName(admin, actorEmail)
  const employeeName = clean(claim.employee?.full_name) || 'Karyawan'
  const approved = decision === 'approve'
  const result = await sendTemplate({
    to: employeeEmail,
    subject: `[HARMONY Re-Med] Klaim ${approved ? 'Disetujui' : 'Ditolak'} Finance - ${clean(claim.claim_number) || claim.id}`,
    title: `Klaim Re-Med ${approved ? 'Disetujui' : 'Ditolak'} Finance`,
    message: [
      `Yth. ${employeeName},`,
      '',
      `Klaim Re-Med Anda telah ${approved ? 'disetujui' : 'ditolak'} oleh Finance.`,
      '',
      `Nomor klaim: ${clean(claim.claim_number) || '-'}`,
      `Jenis klaim: ${clean(claim.claim_type?.name) || '-'}`,
      `Nominal disetujui: ${rupiah(claim.approved_amount)}`,
      `Diproses oleh: ${actorName}`,
      `Catatan/alasan Finance: ${clean(note || claim.finance_note) || '-'}`,
      `Status berikutnya: ${approved ? 'Menunggu proses pembayaran.' : 'Ditolak Finance. Proses klaim selesai.'}`,
    ].join('\n'),
    actionLabel: 'Lihat Klaim Saya',
    path: '/remed/employee/claims',
  })

  return summarize([{ target: employeeEmail, result }])
}

export async function notifyRemedPaymentCompleted(
  admin: SupabaseClient,
  claimId: string,
  actorEmail: string,
  note: string,
  paymentDate: string,
  paymentReference: string,
): Promise<WorkflowNotificationResult> {
  const claim = await getClaim(admin, claimId)
  if (!claim) return { ok: false, sent: 0, failed: 0, message: 'Data claim tidak ditemukan untuk notifikasi.' }

  const employeeEmail = normalizeEmail(claim.employee?.email)
  if (!employeeEmail) return { ok: false, sent: 0, failed: 0, message: 'Email employee tidak ditemukan.' }

  const actorName = await resolveActorName(admin, actorEmail)
  const employeeName = clean(claim.employee?.full_name) || 'Karyawan'
  const result = await sendTemplate({
    to: employeeEmail,
    subject: `[HARMONY Re-Med] Pembayaran Selesai - ${clean(claim.claim_number) || claim.id}`,
    title: 'Pembayaran Re-Med Selesai',
    message: [
      `Yth. ${employeeName},`,
      '',
      'Pembayaran klaim Re-Med Anda telah diproses oleh Finance.',
      '',
      `Nomor klaim: ${clean(claim.claim_number) || '-'}`,
      `Nominal dibayar: ${rupiah(claim.approved_amount)}`,
      `Tanggal pembayaran: ${dateId(paymentDate)}`,
      `Referensi pembayaran: ${clean(paymentReference) || '-'}`,
      `Diproses oleh: ${actorName}`,
      `Catatan Finance: ${clean(note || claim.finance_note) || '-'}`,
      'Status berikutnya: Dibayar / selesai.',
    ].join('\n'),
    actionLabel: 'Lihat Riwayat Re-Med',
    path: '/remed/employee/history',
  })

  return summarize([{ target: employeeEmail, result }])
}

export async function notifyRemedEntitlementChanged(
  admin: SupabaseClient,
  params: {
    employeeId: string
    year: number
    action: 'adjust_balance' | 'set_plafond'
    actorEmail: string
    note: string
    before: EntitlementSnapshot | null
    after: EntitlementSnapshot | null
  },
): Promise<WorkflowNotificationResult> {
  const { data: employee } = await admin
    .from('employees')
    .select('full_name,email,employee_number')
    .eq('id', params.employeeId)
    .maybeSingle()

  const employeeEmail = normalizeEmail(employee?.email)
  if (!employeeEmail) return { ok: false, sent: 0, failed: 0, message: 'Email employee tidak ditemukan.' }

  const actorName = await resolveActorName(admin, params.actorEmail)
  const employeeName = clean(employee?.full_name) || 'Karyawan'
  const isBalance = params.action === 'adjust_balance'
  const result = await sendTemplate({
    to: employeeEmail,
    subject: `[HARMONY Re-Med] ${isBalance ? 'Penyesuaian Sisa Plafond' : 'Perubahan Plafond Dasar'} ${params.year}`,
    title: isBalance ? 'Sisa Plafond Re-Med Disesuaikan' : 'Plafond Dasar Re-Med Diperbarui',
    message: [
      `Yth. ${employeeName},`,
      '',
      isBalance
        ? 'HR telah melakukan penyesuaian terhadap sisa plafond Re-Med Anda.'
        : 'HR telah memperbarui plafond dasar Re-Med Anda.',
      '',
      `Periode: ${params.year}`,
      `Plafond sebelumnya: ${rupiah(params.before?.plafond_total)}`,
      `Plafond sekarang: ${rupiah(params.after?.plafond_total)}`,
      `Sisa sebelumnya: ${rupiah(params.before?.available_amount)}`,
      `Sisa sekarang: ${rupiah(params.after?.available_amount)}`,
      `Diproses oleh: ${actorName}`,
      `Catatan/alasan HR: ${clean(params.note) || '-'}`,
      'Status berikutnya: Saldo Re-Med terbaru sudah aktif dan dapat digunakan sesuai ketentuan.',
    ].join('\n'),
    actionLabel: 'Buka Dashboard Re-Med',
    path: '/remed/employee/dashboard',
  })

  return summarize([{ target: employeeEmail, result }])
}
