import { NextRequest,NextResponse } from 'next/server'
import { requireProfileAccess,profileError } from '@/lib/server/employee-profile-auth'
import { calculatePtkp } from '@/lib/ptkp'
import { PROFILE_SECTIONS } from '@/lib/profile-schema'
export const runtime='nodejs'
export async function POST(request:NextRequest){
 try{
  const ctx=await requireProfileAccess(request)
  const body=await request.json().catch(()=>null)
  if(!body||!['family','identity'].includes(body.section)||typeof body.values!=='object'||Array.isArray(body.values))return NextResponse.json({message:'Data tidak valid.'},{status:400})
  const values:Record<string,string>={}
  for(const [k,v] of Object.entries(body.values as Record<string,unknown>)){
   if(!Object.hasOwn(PROFILE_SECTIONS[body.section as 'family'|'identity'].fields,k)||typeof v!=='string'||v.length>18000)return NextResponse.json({message:'Data tidak valid.'},{status:400})
   values[k]=v
  }
  const row=await ctx.admin.from('harmony_employee_profile_sections').select('sections').eq('employee_id',ctx.employeeId).maybeSingle()
  if(row.error)throw row.error
  const sections=row.data?.sections||{}
  const newSections={...sections,[body.section]:{...(sections[body.section]||{}),...values}}
  return NextResponse.json({ptkp:calculatePtkp(newSections)})
 }catch(e){const err=profileError(e);return NextResponse.json({message:err.message},{status:err.status})}
}
