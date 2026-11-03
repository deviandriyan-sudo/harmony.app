import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupHR,scaleupRouteError } from '@/lib/server/scaleup'
export const runtime='nodejs'
const KEYS=new Set(['wadirsdk','finance','director','supervisor_delegate'])
export async function GET(request:NextRequest) {
  try {const ctx=await scaleupContext(request);requireScaleupHR(ctx)
    const {data:authorities,error}=await ctx.admin.from('scaleup_role_authorities').select('*')
      .order('created_at',{ascending:false}).limit(200)
    if(error)throw error
    const ids=[...new Set((authorities||[]).map(x=>x.employee_id))]
    const names=ids.length ? await ctx.admin.from('employees').select('id,full_name,position,department').in('id',ids) : {data:[],error:null}
    if(names.error)throw names.error
    return NextResponse.json({authorities:(authorities||[]).map(a=>({...a,employee:(names.data||[]).find(e=>e.id===a.employee_id)}))})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
export async function POST(request:NextRequest) {
  try {const ctx=await scaleupContext(request);requireScaleupHR(ctx)
    const body=await request.json()
    if(body?.deactivate_id) {
      const {data,error}=await ctx.admin.rpc('scaleup_change_authority_v1',{
        p_actor_user_id:ctx.appUser.id,p_role:null,p_employee:null,p_requester:null,
        p_assignment:null,p_reason:null,p_deactivate:String(body.deactivate_id),
      })
      if(error)throw error
      return NextResponse.json({id:data,ok:true})
    }
    const role=String(body?.role_key||''),employeeId=String(body?.employee_id||'')
    const requesterId=body?.requester_id ? String(body.requester_id):null
    const reason=String(body?.reason||'').trim().slice(0,500)
    if(!KEYS.has(role)||!/^[\w-]{36}$/.test(employeeId)||reason.length<5) throw Error('Role, employee, dan alasan konfigurasi wajib valid.')
    if((role==='supervisor_delegate')!==Boolean(requesterId))throw Error('Delegasi atasan memerlukan karyawan pemohon spesifik.')
    const person=await ctx.admin.from('employees').select('id,is_active').eq('id',employeeId).maybeSingle()
    if(person.error||!person.data||person.data.is_active===false)throw Error('Pejabat harus aktif pada employee master.')
    const assignmentId=body?.assignment_id ? String(body.assignment_id):null
    if(assignmentId) {
      const assignment=await ctx.admin.from('employee_assignments').select('id,employee_id,is_active')
        .eq('id',assignmentId).maybeSingle()
      if(assignment.error||!assignment.data||assignment.data.employee_id!==employeeId||assignment.data.is_active===false)
        throw Error('Penugasan jabatan tidak sesuai karyawan atau tidak aktif.')
    }
    const {data,error}=await ctx.admin.rpc('scaleup_change_authority_v1',{
      p_actor_user_id:ctx.appUser.id,p_role:role,p_employee:employeeId,p_requester:requesterId,
      p_assignment:assignmentId,p_reason:reason,p_deactivate:null,
    })
    if(error)throw error
    return NextResponse.json({id:data})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
