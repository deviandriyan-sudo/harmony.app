import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupEmployee,scaleupRouteError } from '@/lib/server/scaleup'
export const runtime='nodejs'
const ROLES=new Set(['supervisor_1','supervisor_2','wadirsdk','finance','director'])
export async function GET(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request);const me=requireScaleupEmployee(ctx)
    const role=request.nextUrl.searchParams.get('role') || ''
    if (!ROLES.has(role)) return NextResponse.json({message:'Role pencarian tidak valid.'},{status:400})
    const q=(request.nextUrl.searchParams.get('q')||'').trim().replace(/[%_,]/g,'').slice(0,70)
    // Scope candidates before returning any data. Never expose an unrestricted staff directory.
    let employeeIds:string[]=[]
    if (role.startsWith('supervisor')) {
      const {data:requester,error}=await ctx.admin.from('employees').select('supervisor_1,supervisor_2').eq('id',me).single()
      if(error)throw error
      const {data:assignments,error:assignmentError}=await ctx.admin.from('employee_assignments')
        .select('supervisor_1,supervisor_2').eq('employee_id',me).eq('is_active',true)
      if(assignmentError)throw assignmentError
      const aliases=[requester?.supervisor_1,requester?.supervisor_2,...(assignments||[]).flatMap(a=>[a.supervisor_1,a.supervisor_2])]
        .map(x=>String(x||'').trim()).filter(Boolean)
      if(aliases.length) {
        const {data:people,error:personError}=await ctx.admin.from('employees')
          .select('id,employee_number,full_name,email,machine_pin').eq('is_active',true).limit(1000)
        if(personError)throw personError
        const aliasSet=new Set(aliases.map(x=>x.toLowerCase()))
        employeeIds=(people||[]).filter(p=>[p.id,p.employee_number,p.full_name,p.email,p.machine_pin]
          .some(value=>aliasSet.has(String(value||'').trim().toLowerCase()))).map(p=>p.id)
      }
      const {data:delegates,error:delegateError}=await ctx.admin.from('scaleup_role_authorities')
        .select('employee_id').eq('role_key','supervisor_delegate').eq('requester_id',me).eq('is_active',true)
      if(delegateError)throw delegateError
      employeeIds=[...new Set([...employeeIds,...(delegates||[]).map(d=>d.employee_id)])]
    } else {
      const {data:allowed,error}=await ctx.admin.from('scaleup_role_authorities')
        .select('employee_id').eq('role_key',role).eq('is_active',true)
      if(error)throw error
      employeeIds=[...new Set((allowed||[]).map(d=>d.employee_id))]
    }
    if(!employeeIds.length)return NextResponse.json({candidates:[],configured:false})
    let query=ctx.admin.from('employees').select('id,full_name,employee_number,department,position,is_active')
      .in('id',employeeIds).eq('is_active',true).order('full_name').limit(40)
    if(q)query=query.ilike('full_name',`%${q}%`)
    const {data,error}=await query;if(error)throw error
    const checked=await Promise.all((data||[]).map(async person=>{
      const result=await ctx.admin.rpc('scaleup_is_eligible_v1',{p_requester:me,p_role:role,p_employee:person.id})
      return result.error || !result.data ? null:person
    }))
    return NextResponse.json({candidates:checked.filter(Boolean),configured:true})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
