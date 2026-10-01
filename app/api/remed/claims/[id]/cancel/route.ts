import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request, ['employee'])
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))

    const { error } = await ctx.admin.rpc('remed_cancel_claim_v1', {
      p_claim_id: id,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_reason: String(body?.reason || 'Dibatalkan oleh employee.').trim(),
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
