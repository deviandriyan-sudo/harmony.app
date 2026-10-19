import { NextRequest, NextResponse } from 'next/server'

import { apiError, requireHRApi } from '@/lib/server/hr-api-auth'
import { getHarmonyJobQueueDiagnostics, processHarmonyJobQueue } from '@/lib/server/job-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    const diagnostics = await getHarmonyJobQueueDiagnostics(admin)
    return NextResponse.json({ ok: true, ...diagnostics }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const details = apiError(error)
    return NextResponse.json({ ok: false, message: details.message }, { status: details.status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    const body = await request.json().catch(() => null)

    if (body?.retry_failed === true) {
      const reset = await admin
        .from('harmony_job_queue')
        .update({
          status: 'pending',
          attempts: 0,
          next_attempt_at: new Date().toISOString(),
          lease_until: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('job_type', 'email')
        .eq('status', 'failed')
      if (reset.error) throw new Error(reset.error.message)
    }

    const result = await processHarmonyJobQueue(admin, { limit: 12 })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const details = apiError(error)
    return NextResponse.json({ ok: false, message: details.message }, { status: details.status })
  }
}
