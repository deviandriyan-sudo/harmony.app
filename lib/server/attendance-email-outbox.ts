import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  deliverHarmonyServerEmail,
} from '@/lib/notifications-server'
import { getHarmonySystemControl } from '@/lib/server/system-control'

export type AttendanceEmailJob = {
  id: string
  upload_id: string
  period_key: string
  period_label: string
  employee_id: string
  recipient_email: string
  attempts: number
}

// Claims are atomic in Postgres. Never process this queue from the browser or
// use a public Supabase key (the email destination is private HR data).
export async function processAttendanceEmailOutbox(admin: SupabaseClient) {
  const control = await getHarmonySystemControl(admin)
  if (!control.configured || !control.emailEnabled) {
    return { ok: true, paused: true, sent: 0, failed: 0, claimed: 0, remaining: 0,
      message: control.emailEnabled
        ? 'Kontrol sistem belum dimigrasikan. Email tidak dikirim.'
        : 'Maintenance aktif. Antrean email ditunda.' }
  }

  const env = getNotificationEnvironmentStatus()
  if (!env.resendApiKeyConfigured || !env.fromConfigured) {
    return { ok: false, paused: true, sent: 0, failed: 0, claimed: 0, remaining: 0,
      message: 'Resend belum dikonfigurasi (RESEND_API_KEY / NOTIFICATION_FROM_EMAIL).' }
  }

  const { data, error } = await admin.rpc('harmony_claim_attendance_emails_v1', { p_limit: 8 })
  if (error) throw new Error(`Antrean email belum siap: ${error.message}. Jalankan migration HARMONY_ATTENDANCE_EMAIL_OUTBOX_V1.sql.`)

  const jobs = (data || []) as AttendanceEmailJob[]
  let sent = 0
  let failed = 0

  for (const job of jobs) {
    const subject = `[HARMONY] Absensi Periode ${job.period_label} Telah Diunggah`
    const title = 'Data Absensi Periode Telah Tersedia'
    const message = `Data absensi untuk periode ${job.period_label} sudah diunggah oleh HR dan dapat diperiksa di HARMONY.\n\nSilakan buka menu Konfirmasi Absensi dan periksa tanggal, jam masuk/keluar, serta kelengkapan data Anda. Jika masih ada tanggal yang kosong, unggahan mesin mungkin masih dilakukan bertahap. Tunggu pembaruan berikutnya atau hubungi HR jika terdapat ketidaksesuaian.\n\nEmail ini adalah informasi ketersediaan data, bukan bukti absensi telah final atau disetujui.`
    const path = `${env.appUrl}/employee/attendance`
    let result: { ok: boolean; providerId?: string | null; message: string }
    try {
      result = await deliverHarmonyServerEmail({
        to: job.recipient_email,
        subject,
        html: buildServerHarmonyEmailHtml({ title, message, actionLabel: 'Periksa Absensi', actionUrl: path }),
        text: buildServerHarmonyEmailText({ title, message, actionLabel: 'Periksa Absensi', actionUrl: path }),
        idempotencyKey: `harmony-attendance-${job.id}`,
      })
    } catch (err) {
      result = { ok: false, message: err instanceof Error ? err.message : 'Gagal mengirim email.' }
    }

    // Never persist the recipient's email or credentials in error messages.
    const attempts = Math.max(1, Number(job.attempts || 1))
    const terminal = attempts >= 6
    const delayMinutes = Math.min(360, 2 ** attempts * 5)
    const update = result.ok
      ? {
          status: 'sent', provider_id: result.providerId || null,
          sent_at: new Date().toISOString(), last_error: null, lease_until: null,
          updated_at: new Date().toISOString(),
        }
      : {
          status: terminal ? 'failed' : 'pending',
          last_error: result.message.slice(0, 400), lease_until: null,
          next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        }

    const saved = await admin.from('harmony_attendance_email_outbox')
      .update(update).eq('id', job.id).eq('status', 'sending')
    if (saved.error) {
      console.error('HARMONY attendance email status update failed:', saved.error.message)
      // The lease can expire. Provider Idempotency-Key reduces accidental duplicates.
    }
    if (result.ok) sent++
    else failed++

    // Resend's standard send-email endpoint has a per-second rate limit.
    if (jobs.length > 1) await new Promise((resolve) => setTimeout(resolve, 550))
  }

  const { count, error: countError } = await admin
    .from('harmony_attendance_email_outbox')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'sending'])
  if (countError) throw new Error(countError.message)

  return { ok: failed === 0, paused: false, sent, failed,
    claimed: jobs.length, remaining: count || 0,
    message: `${sent} email diterima Resend, ${failed} gagal; ${count || 0} masih dalam antrean.` }
}

export async function getAttendanceEmailStats(admin: SupabaseClient) {
  const states = ['pending', 'sending', 'sent', 'failed'] as const
  const values = await Promise.all(states.map(async (status) => {
    const { count, error } = await admin.from('harmony_attendance_email_outbox')
      .select('id', { count: 'exact', head: true }).eq('status', status)
    if (error) throw new Error(`Gagal membaca status email ${status}: ${error.message}`)
    return [status, count || 0] as const
  }))
  const { data: active, error: employeeError } = await admin.from('employees')
    .select('id,email').eq('is_active', true)
  if (employeeError) throw new Error(`Gagal memeriksa email karyawan: ${employeeError.message}`)
  const missingEmail = (active || []).filter((row) =>
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email || '').trim()),
  ).length
  return { ...Object.fromEntries(values), missing_email: missingEmail,
    eligible_employees: (active || []).length - missingEmail } as Record<string, number>
}
