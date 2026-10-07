import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { notifyRemedClaimCancelled } from '@/lib/server/workflow-notifications'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request, ['employee'])
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || 'Dibatalkan oleh employee.').trim()

    const { data: beforeClaim } = await ctx.admin
      .from('remed_claims')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    const { error } = await ctx.admin.rpc('remed_cancel_claim_v1', {
      p_claim_id: id,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_reason: reason,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    let notification = null
    try {
      notification = await notifyRemedClaimCancelled(
        ctx.admin,
        id,
        ctx.access.email,
        reason,
        beforeClaim?.status || null,
      )
    } catch (notificationError: any) {
      notification = {
        ok: false,
        sent: 0,
        failed: 1,
        message:
          notificationError?.message ||
          'Notifikasi pembatalan Re-Med gagal diproses.',
      }
      console.warn('Re-Med cancellation email notification warning:', notificationError)
    }

    return NextResponse.json({ success: true, notification })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
