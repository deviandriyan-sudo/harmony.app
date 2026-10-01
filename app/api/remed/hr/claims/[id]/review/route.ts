import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const { id } = await context.params
    const body = await request.json()
    const decision = String(body?.decision || '').trim().toLowerCase()
    const approvedAmount = Number(body?.approved_amount || 0)
    const note = String(body?.note || '').trim()

    if (!['approve', 'reject'].includes(decision)) {
      throw Object.assign(new Error('Keputusan HR tidak valid.'), { status: 400 })
    }
    if (decision === 'approve' && (!Number.isFinite(approvedAmount) || approvedAmount <= 0)) {
      throw Object.assign(new Error('Nominal approved HR wajib lebih dari 0.'), { status: 400 })
    }

    const { error } = await ctx.admin.rpc('remed_hr_review_claim_v1', {
      p_claim_id: id,
      p_decision: decision,
      p_approved_amount: decision === 'approve' ? approvedAmount : null,
      p_note: note || null,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
