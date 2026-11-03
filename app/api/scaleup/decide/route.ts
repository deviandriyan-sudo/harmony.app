import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupEmployee,scaleupRouteError } from '@/lib/server/scaleup'
import { enqueueHarmonyEmailJob, scheduleHarmonyJobQueueDrain } from '@/lib/server/job-queue'
export const runtime='nodejs'
export async function POST(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request), me=requireScaleupEmployee(ctx)
    const body=await request.json()
    const action=String(body?.action||'')
    const stageId=String(body?.stage_id||'')
    const note=String(body?.remarks||'').trim().slice(0,2000)
    const key=String(body?.idempotency_key||'')
    if(!['approve','reject','revision'].includes(action) || !/^[\w-]{36}$/.test(stageId) || !/^[\w-]{36}$/.test(key))
      return NextResponse.json({message:'Keputusan tidak valid.'},{status:400})
    const {data,error}=await ctx.admin.rpc('scaleup_decide_v1',{
      p_actor_user_id:ctx.appUser.id,p_actor_employee_id:me,p_stage_id:stageId,
      p_action:action,p_note:note,p_key:key,
    })
    if(error)throw error
    // Queue after committed decision. Queue failures are reported but do not roll back an approved stage.
    let notification='not_configured'
    if(!data?.duplicate && data?.request_id) {
      const req=await ctx.admin.from('scaleup_training_requests').select('requester_employee_id,approval_status')
        .eq('id',data.request_id).maybeSingle()
      const targetEmployeeId=data.next_stage_id
        ? (await ctx.admin.from('scaleup_approval_stages').select('approver_employee_id')
          .eq('id',data.next_stage_id).maybeSingle()).data?.approver_employee_id
        : req.data?.requester_employee_id
      if(targetEmployeeId) {
        const email=(await ctx.admin.from('employees').select('email').eq('id',targetEmployeeId).maybeSingle()).data?.email
        if(email) {
          const enqueued=await enqueueHarmonyEmailJob(ctx.admin,{
            to:[email],subject:`HARMONY SCALE UP — ${data.next_stage_id?'Persetujuan Menunggu':'Status Pengajuan'}`,
            text:`Pengajuan SCALE UP ${String(data.request_id)} diperbarui. Buka HARMONY untuk melihat rincian.`,
            idempotencyKey:`scaleup:${data.request_id}:${stageId}:${action}`,
          })
          notification=enqueued.ok?'queued':'queue_failed'
          if(enqueued.ok)scheduleHarmonyJobQueueDrain()
        }
      }
    }
    return NextResponse.json({ ...data,notification })
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
