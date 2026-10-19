import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { processAttendanceEmailOutbox } from '@/lib/server/attendance-email-outbox'
import { processHarmonyJobQueue } from '@/lib/server/job-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET || ''
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (secret.length < 16 || !supplied) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  const general = { completed: 0, failed: 0, remaining: 0, paused: false, batches: 0, error: '', message: '' }
  const attendance = { sent: 0, failed: 0, remaining: 0, paused: false, batches: 0, error: '', message: '' }

  try {
    while (general.batches < 6 && Date.now() - started < 24_000) {
      const batch = await processHarmonyJobQueue(supabaseAdmin, { limit: 2 })
      general.completed += batch.completed
      general.failed += batch.failed
      general.remaining = batch.remaining
      general.paused = batch.paused
      general.message = batch.message
      general.batches++
      if (batch.paused || !batch.claimed || !batch.remaining) break
    }
  } catch (error: any) {
    general.error = error?.message || 'Queue umum gagal diproses.'
    console.error('HARMONY general notification queue cron failed:', error)
  }

  try {
    while (attendance.batches < 8 && Date.now() - started < 32_000) {
      const batch = await processAttendanceEmailOutbox(supabaseAdmin)
      attendance.sent += batch.sent
      attendance.failed += batch.failed
      attendance.remaining = batch.remaining
      attendance.paused = batch.paused
      attendance.message = batch.message
      attendance.batches++
      if (batch.paused || !batch.claimed || !batch.remaining) break
    }
  } catch (error: any) {
    attendance.error = error?.message || 'Queue upload absensi gagal diproses.'
    console.error('HARMONY attendance queue cron failed:', error)
  }

  const ok = !general.error && !attendance.error && general.failed === 0 && attendance.failed === 0 && !general.paused && !attendance.paused
  return NextResponse.json(
    { ok, general, attendance },
    { status: ok ? 200 : 207, headers: { 'Cache-Control': 'no-store' } },
  )
}

