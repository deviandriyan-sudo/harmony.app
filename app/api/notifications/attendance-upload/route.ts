import { NextRequest, NextResponse } from 'next/server'
import { requireHRApi, apiError } from '@/lib/server/hr-api-auth'
import { getAttendanceEmailStats, processAttendanceEmailOutbox } from '@/lib/server/attendance-email-outbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    return NextResponse.json({ ok: true, counts: await getAttendanceEmailStats(admin) },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const details = apiError(error)
    return NextResponse.json({ ok: false, message: details.message }, { status: details.status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    const requestBody = await request.json().catch(() => null)
    if (requestBody?.retry_failed === true) {
      const reset = await admin.from('harmony_attendance_email_outbox')
        .update({ status: 'pending', attempts: 0, next_attempt_at: new Date().toISOString(),
          lease_until: null, updated_at: new Date().toISOString() })
        .eq('status', 'failed')
      if (reset.error) throw new Error(reset.error.message)
    }
    const result = await processAttendanceEmailOutbox(admin)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const details = apiError(error)
    return NextResponse.json({ ok: false, message: details.message }, { status: details.status })
  }
}
