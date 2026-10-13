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
      })
    } catch (error: any) {
      result = {
        ok: false,
        message: error?.message || 'Worker queue gagal memproses email.',
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
      }
      completed++
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

export function scheduleHarmonyJobQueueDrain() {
  try {
    after(async () => {
      try {
        await processHarmonyJobQueue(supabaseAdmin, { limit: 8 })
      } catch (error) {
        console.error('HARMONY background queue drain failed:', error)
      }
    })
  } catch {
    // Outside a request lifecycle there is no after() context. Cron is the fallback.
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
