import { after } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getHarmonySystemControl } from '@/lib/server/system-control'

export type HarmonyEmailQueuePayload = {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  idempotencyKey: string
}

type HarmonyJobRow = {
  id: string
  job_type: string
  job_key: string | null
  payload: HarmonyEmailQueuePayload | Record<string, unknown>
  status: string
  priority: number
  attempts: number
  max_attempts: number
}

export async function enqueueHarmonyEmailJob(
  admin: SupabaseClient,
  payload: HarmonyEmailQueuePayload,
) {
  const jobKey = `email:${payload.idempotencyKey}`
  const inserted = await admin
    .from('harmony_job_queue')
    .insert({
      job_type: 'email',
      job_key: jobKey,
      payload,
      status: 'pending',
      priority: 50,
      attempts: 0,
      max_attempts: 6,
      next_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id,status')
    .single()

  if (inserted.error) {
    // Idempotent retry: if the same business notification is already queued,
    // reuse it instead of creating a duplicate message.
    if (inserted.error.code === '23505') {
      const existing = await admin
        .from('harmony_job_queue')
        .select('id,status')
        .eq('job_key', jobKey)
        .maybeSingle()
      if (!existing.error && existing.data) {
        return {
          ok: true as const,
          id: String(existing.data.id),
          status: String(existing.data.status || 'pending'),
          duplicate: true,
        }
      }
    }

    return {
      ok: false as const,
      id: null,
      status: 'error',
      duplicate: false,
      error: inserted.error,
    }
  }

  return {
    ok: true as const,
    id: String(inserted.data.id),
    status: String(inserted.data.status || 'pending'),
    duplicate: false,
  }
}

function cleanError(value: unknown) {
  return String(value || 'Job gagal diproses.')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 400)
}

function retryDelayMinutes(attempts: number) {
  return Math.min(360, Math.max(1, 2 ** Math.max(0, attempts - 1)))
}

export async function processHarmonyJobQueue(
  admin: SupabaseClient,
  options: { limit?: number } = {},
) {
  const control = await getHarmonySystemControl(admin)
  if (!control.configured || !control.emailEnabled) {
    return {
      ok: true,
      paused: true,
      claimed: 0,
      completed: 0,
      failed: 0,
      remaining: 0,
      message: control.emailEnabled
        ? 'Kontrol sistem belum siap. Queue notifikasi ditunda.'
        : 'Email sedang dinonaktifkan. Queue notifikasi ditunda.',
    }
  }

  const { getNotificationEnvironmentStatus } = await import('@/lib/notifications-server')
  const env = getNotificationEnvironmentStatus()
  if (!env.resendApiKeyConfigured || !env.fromConfigured) {
    return { ok: false, paused: true, claimed: 0, completed: 0, failed: 0, remaining: 0,
      message: 'Resend belum siap: cek RESEND_API_KEY dan NOTIFICATION_FROM_EMAIL.' }
  }

  const { data, error } = await admin.rpc('harmony_claim_jobs_v1', {
    p_job_type: 'email',
    p_limit: Math.max(1, Math.min(Number(options.limit || 8), 25)),
  })

  if (error) {
    throw new Error(`Queue HARMONY belum siap: ${error.message}`)
  }

  const jobs = (data || []) as HarmonyJobRow[]
  let completed = 0
  let failed = 0

  for (const job of jobs) {
    let result: { ok: boolean; message: string; providerId?: string | null }
    try {
      const payload = job.payload as HarmonyEmailQueuePayload
      const { deliverHarmonyServerEmail } = await import('@/lib/notifications-server')
      result = await deliverHarmonyServerEmail({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo,
        idempotencyKey: payload.idempotencyKey,
      }, { maxAttempts: 1, timeoutMs: 10000 })
    } catch (error: unknown) {
      result = {
        ok: false,
        message: error instanceof Error ? error.message : 'Worker queue gagal memproses email.',
      }
    }

    const now = new Date().toISOString()
    const attempts = Math.max(1, Number(job.attempts || 1))
    const terminal = attempts >= Math.max(1, Number(job.max_attempts || 6))

    if (result.ok) {
      const saved = await admin
        .from('harmony_job_queue')
        .update({
          status: 'completed',
          completed_at: now,
          provider_id: result.providerId || null,
          last_error: null,
          lease_until: null,
          // Remove recipient/body data after successful delivery.
          payload: { redacted: true, delivered: true },
          result: { provider_id: result.providerId || null },
          updated_at: now,
        })
        .eq('id', job.id)
        .eq('status', 'processing')

      if (saved.error) {
        console.error('HARMONY queue completion update failed:', saved.error.message)
        failed++
      } else {
        completed++
      }
    } else {
      const saved = await admin
        .from('harmony_job_queue')
        .update({
          status: terminal ? 'failed' : 'pending',
          last_error: cleanError(result.message),
          lease_until: null,
          next_attempt_at: new Date(
            Date.now() + retryDelayMinutes(attempts) * 60_000,
          ).toISOString(),
          updated_at: now,
        })
        .eq('id', job.id)
        .eq('status', 'processing')

      if (saved.error) {
        console.error('HARMONY queue retry update failed:', saved.error.message)
      }
      failed++
    }

    if (jobs.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 550))
    }
  }

  // Keep operational metadata, but remove old completed rows entirely after 30 days.
  await admin
    .from('harmony_job_queue')
    .delete()
    .eq('status', 'completed')
    .lt('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const { count, error: countError } = await admin
    .from('harmony_job_queue')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'processing'])

  if (countError) throw new Error(countError.message)

  return {
    ok: failed === 0,
    paused: false,
    claimed: jobs.length,
    completed,
    failed,
    remaining: count || 0,
    message: `${completed} job selesai, ${failed} gagal; ${count || 0} masih antre.`,
  }
}

// A Vercel request may enqueue several notifications. Drain multiple small batches,
// not only the first eight jobs, so later emails are not stranded until the next cron.
// next/server.after() keeps the worker attached to the request lifecycle.
export function scheduleHarmonyJobQueueDrain(): boolean {
  try {
    after(async () => {
      const startedAt = Date.now()
      try {
        for (let batchNumber = 0; batchNumber < 4; batchNumber++) {
          if (Date.now() - startedAt > 18_000) break
          const batch = await processHarmonyJobQueue(supabaseAdmin, { limit: 2 })
          if (batch.paused || !batch.claimed || !batch.remaining) break
          // Do not repeatedly claim jobs during a provider outage.
          if (batch.failed && !batch.completed) break
        }
      } catch (error) {
        console.error('HARMONY background notification drain failed:', error)
      }
    })
    return true
  } catch (error) {
    // A background context is not always available (scripts, tests).
    // A scheduled cron or an authenticated HR manual drain is still required.
    console.warn('HARMONY after() queue scheduling unavailable:', error)
    return false
  }
}

// Never return recipient addresses, email body, or database payload from diagnostics.
export async function getHarmonyJobQueueDiagnostics(admin: SupabaseClient) {
  const [counts, control, provider] = await Promise.all([
    getHarmonyJobQueueStats(admin),
    getHarmonySystemControl(admin),
    import('@/lib/notifications-server').then(({ getNotificationEnvironmentStatus }) =>
      getNotificationEnvironmentStatus(),
    ),
  ])
  const now = new Date().toISOString()
  const [{ count: due, error: dueError }, { data: recent, error: recentError }] = await Promise.all([
    admin.from('harmony_job_queue').select('id', { head: true, count: 'exact' })
      .eq('job_type', 'email').eq('status', 'pending').lte('next_attempt_at', now),
    admin.from('harmony_job_queue')
      .select('status,attempts,last_error,updated_at,next_attempt_at')
      .eq('job_type', 'email')
      .in('status', ['failed', 'pending', 'processing'])
      .order('updated_at', { ascending: false }).limit(12),
  ])
  if (dueError) throw new Error(dueError.message)
  if (recentError) throw new Error(recentError.message)
  const errors = (recent || []).filter((row) => Boolean(row.last_error)).slice(0, 5)
    .map((row) => ({
      status: row.status,
      attempts: Number(row.attempts || 0),
      at: row.updated_at,
      message: String(row.last_error || '').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]').slice(0, 250),
    }))
  const pausedReason = !control.configured
    ? 'System Control belum tersedia/terbaca. Worker berhenti agar maintenance tidak dilanggar.'
    : !control.emailEnabled
      ? 'Maintenance Mode aktif; pengiriman email ditunda.'
      : !provider.resendApiKeyConfigured || !provider.fromConfigured
        ? 'Konfigurasi RESEND_API_KEY atau NOTIFICATION_FROM_EMAIL belum lengkap.'
        : null
  return {
    counts,
    due: due || 0,
    paused: Boolean(pausedReason),
    paused_reason: pausedReason,
    system_control_configured: control.configured,
    email_enabled: control.emailEnabled,
    sender_configured: provider.fromConfigured,
    provider_configured: provider.resendApiKeyConfigured,
    last_errors: errors,
    checked_at: now,
  }
}

export async function getHarmonyJobQueueStats(admin: SupabaseClient) {
  const statuses = ['pending', 'processing', 'completed', 'failed'] as const
  const rows = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await admin
        .from('harmony_job_queue')
        .select('id', { count: 'exact', head: true })
        .eq('job_type', 'email')
        .eq('status', status)
      if (error) throw new Error(error.message)
      return [status, count || 0] as const
    }),
  )

  return Object.fromEntries(rows) as Record<(typeof statuses)[number], number>
}
