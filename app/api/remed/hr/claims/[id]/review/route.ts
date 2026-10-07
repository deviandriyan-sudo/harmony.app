import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { notifyRemedHrDecision } from '@/lib/server/workflow-notifications'

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

    if (decision === 'approve') {
      const { data: signatory } = await ctx.admin
        .from('remed_signature_profiles')
        .select('employee_id')
        .eq('signer_role', 'hr')
        .maybeSingle()

      if (signatory?.employee_id) {
        await ctx.admin
          .from('remed_claims')
          .update({ hr_signatory_employee_id: signatory.employee_id })
          .eq('id', id)
      }
    }

    let notification = null
    try {
      notification = await notifyRemedHrDecision(
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
        message: notificationError?.message || 'Notifikasi email keputusan HR gagal diproses.',
      }
      console.warn('Re-Med HR email notification warning:', notificationError)
    }

    return NextResponse.json({ success: true, notification })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
