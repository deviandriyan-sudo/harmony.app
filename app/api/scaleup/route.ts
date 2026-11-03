import { NextRequest, NextResponse } from 'next/server'
import { scaleupContext, requireScaleupEmployee, currentScaleupPolicy, scaleupRouteError, getVisibleRequests } from '@/lib/server/scaleup'
import { planScaleupApproval, type Nominees } from '@/lib/scaleup/workflow'

export const runtime = 'nodejs'
const clean = (x: unknown, max=3000) => String(x ?? '').trim().slice(0,max)
const validDate = (x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(`${x}T00:00:00Z`))
const money = (x: unknown) => { const n=Number(x || 0); if(!Number.isFinite(n) || n<0 || n>1e12) throw Error('Biaya tidak valid.'); return Math.round(n) }

export async function GET(request: NextRequest) {
  try {
    const ctx = await scaleupContext(request)
    const [policy, requests] = await Promise.all([currentScaleupPolicy(ctx),getVisibleRequests(ctx)])
    return NextResponse.json({ policy, requests, employee: ctx.employee, isHR: ctx.isHR })
  } catch (error) { const e=scaleupRouteError(error); return NextResponse.json({ message:e.message }, { status:e.status }) }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await scaleupContext(request)
    const employeeId = requireScaleupEmployee(ctx)
    const body = await request.json()
    const title = clean(body?.title,160)
    const start = clean(body?.start_date,10)
    const end = clean(body?.end_date,10)
    if (title.length<3 || !validDate(start) || !validDate(end) || end<start) throw Error('Judul dan tanggal training wajib valid.')
    const nominees = Object.fromEntries(['supervisor_1','supervisor_2','wadirsdk','finance','director']
      .map(key => [key,clean(body?.nominees?.[key],50)])) as Nominees
    const policy = await currentScaleupPolicy(ctx)
    const plan = planScaleupApproval(nominees, policy.config)
    // Director is compulsory when selected as supervisor, and every executive choice is explicit.
    const uniqueIds = [...new Set(plan.map(stage => stage.approver_employee_id))]
    const people = await ctx.admin.from('employees')
      .select('id,full_name,employee_number,department,position,is_active').in('id',uniqueIds)
    if (people.error) throw people.error
    const personMap = new Map((people.data || []).map(p => [p.id,p]))
    if (uniqueIds.some(id => personMap.get(id)?.is_active===false)) throw Error('Semua approver harus merupakan karyawan aktif.')
    const directorMatchesSupervisor = [nominees.supervisor_1,nominees.supervisor_2].some(id => id && id===nominees.director)
    const directorAuthorities = await ctx.admin.from('scaleup_role_authorities')
      .select('employee_id').eq('role_key','director').eq('is_active',true)
      .in('employee_id',[nominees.supervisor_1,nominees.supervisor_2].filter(Boolean))
    if (directorAuthorities.error) throw directorAuthorities.error
    if (directorAuthorities.data?.length && !directorMatchesSupervisor) {
      throw Error('Atasan adalah Direktur. Pilih nama yang sama secara manual pada slot Direktur.')
    }
    const checks = await Promise.all(plan.flatMap(stage => stage.obligations.map(async role => {
      const { data, error } = await ctx.admin.rpc('scaleup_is_eligible_v1', {
        p_requester: employeeId, p_role: role, p_employee: stage.approver_employee_id,
      })
      if (error) throw error
      if (!data) throw Error(`Approver ${role} tidak memenuhi kewenangan. Minta HR mengonfigurasi jabatan/delegasi.`)
    })))
    void checks
    const keys = ['estimated_cost','transportation_cost','accommodation_cost','other_cost'] as const
    const costs = Object.fromEntries(keys.map(key=>[key,money(body?.[key])]))
    const total = Object.values(costs).reduce((a,b)=>a+Number(b),0)
    const training = {
      title, start_date:start, end_date:end, category:clean(body?.category,100), type:clean(body?.type,30),
      provider:clean(body?.provider,200), objective:clean(body?.objective), competency:clean(body?.competency),
      description:clean(body?.description), method:clean(body?.method,30), location:clean(body?.location,200),
      justification:clean(body?.justification), ...costs,total_budget:total,
    }
    const snapshotPlan = plan.map(stage => ({ ...stage,identity_snapshot: {
      name: personMap.get(stage.approver_employee_id)?.full_name,
      position: personMap.get(stage.approver_employee_id)?.position,
      unit: personMap.get(stage.approver_employee_id)?.department,
    } }))
    const idempotency = clean(body?.idempotency_key,36)
    if (!/^[0-9a-f-]{36}$/i.test(idempotency)) throw Error('Request key tidak valid.')
    const existingId = body?.existing_id ? clean(body.existing_id,36) : null
    const { data: id, error } = await ctx.admin.rpc('scaleup_submit_v1', {
      p_actor_user_id:ctx.appUser.id,p_requester_id:employeeId,p_training:training,p_nominees:nominees,
      p_plan:snapshotPlan,p_key:idempotency,p_existing_id:existingId,
    })
    if (error) throw error
    return NextResponse.json({ id, status:'pending_approval',message:'Pengajuan berhasil dikirim.' })
  } catch (error) { const e=scaleupRouteError(error); return NextResponse.json({ message:e.message }, { status:e.status }) }
}
