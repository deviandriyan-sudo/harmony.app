import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { processAttendanceEmailOutbox } from '@/lib/server/attendance-email-outbox'

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
  try {
    const started = Date.now()
    let sent = 0
    let failed = 0
    let remaining = 0
    let paused = false
    let batches = 0
    while (batches < 10 && Date.now() - started < 42_000) {
      const batch = await processAttendanceEmailOutbox(supabaseAdmin)
      sent += batch.sent
      failed += batch.failed
      remaining = batch.remaining
      paused = batch.paused
      batches++
      if (paused || !batch.claimed || !remaining) break
    }
    return NextResponse.json({ ok: failed === 0, sent, failed, remaining, paused, batches },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('HARMONY attendance cron processing failed', error)
    return NextResponse.json({ ok: false, message: 'Proses email gagal. Periksa server logs.' }, { status: 500 })
  }
}
