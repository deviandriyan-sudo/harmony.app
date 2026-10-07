import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { notifyRemedFinanceDecision } from '@/lib/server/workflow-notifications'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request, ['finance'])
    const { id } = await context.params
    const body = await request.json()
    const decision = String(body?.decision || '').trim().toLowerCase()
    const note = String(body?.note || '').trim()

    if (!['approve', 'reject'].includes(decision)) {
      throw Object.assign(new Error('Keputusan Finance tidak valid.'), { status: 400 })
    }

    const { error } = await ctx.admin.rpc('remed_finance_review_claim_v1', {
      p_claim_id: id,
      p_decision: decision,
      p_note: note || null,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    if (decision === 'approve') {
      const { data: signatory } = await ctx.admin
        .from('remed_signature_profiles')
        .select('employee_id')
        .eq('signer_role', 'finance')
        .maybeSingle()

      if (signatory?.employee_id) {
        await ctx.admin
          .from('remed_claims')
          .update({ finance_signatory_employee_id: signatory.employee_id })
          .eq('id', id)
      }
    }

    let notification = null
    try {
      notification = await notifyRemedFinanceDecision(
        ctx.admin,
        id,
        decision as 'approve' | 'reject',
        ctx.access.email,
        note,
      )
    } catch (notificationError: any) {
      notification = {
        ok: false,
        sent: 0,
        failed: 1,
        message: notificationError?.message || 'Notifikasi email keputusan Finance gagal diproses.',
      }
      console.warn('Re-Med Finance email notification warning:', notificationError)
    }

    return NextResponse.json({ success: true, notification })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
