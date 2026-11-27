import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupHR,scaleupRouteError } from '@/lib/server/scaleup'
import { readCompletePages, readIdBatches } from '@/lib/server/read-complete-pages'
export const runtime='nodejs'
type AuthorityRow={id:string;employee_id:string;created_at:string;[key:string]:unknown}
type AuthorityPerson={id:string;full_name:string|null;position:string|null;department:string|null}
const KEYS=new Set(['wadirsdk','finance','director','supervisor_delegate'])
export async function GET(request:NextRequest) {
  try {const ctx=await scaleupContext(request);requireScaleupHR(ctx)
    const authorities=await readCompletePages<AuthorityRow>((from,to)=>ctx.admin.from('scaleup_role_authorities').select('*',{count:'exact'}).order('id').range(from,to),'Pemetaan pejabat SCALE UP')
    authorities.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||b.id.localeCompare(a.id))
    const names=await readIdBatches<AuthorityPerson>(authorities.map(row=>row.employee_id),async ids=>{
      const response=await ctx.admin.from('employees').select('id,full_name,position,department').in('id',ids)
      if(response.error)throw response.error
      return response.data||[]
    })
    const people=new Map(names.map(row=>[row.id,row]))
    return NextResponse.json({authorities:authorities.map(a=>({...a,employee:people.get(a.employee_id)}))},{headers:{'Cache-Control':'private, no-store'}})
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
