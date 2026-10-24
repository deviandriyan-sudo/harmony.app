import { NextRequest, NextResponse } from 'next/server'
import { requireProfileAccess, profileError } from '@/lib/server/employee-profile-auth'
import { PROFILE_SECTIONS, isProfileSection } from '@/lib/profile-schema'
import { calculatePtkp, currentTaxYearWita } from '@/lib/ptkp'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  try {
    const target = request.nextUrl.searchParams.get('employee_id')
    const ctx = await requireProfileAccess(request, target)
    const [profile, documents, verification] = await Promise.all([
      ctx.admin.from('harmony_employee_profile_sections').select('sections,updated_at').eq('employee_id',ctx.employeeId).maybeSingle(),
      ctx.admin.from('harmony_employee_profile_documents').select('id,category,original_name,mime_type,created_at').eq('employee_id',ctx.employeeId).order('created_at',{ascending:false}),
      ctx.admin.from('harmony_employee_ptkp_reviews').select('tax_year,code,annual_amount,fingerprint,reviewed_at').eq('employee_id',ctx.employeeId).eq('tax_year',currentTaxYearWita()).maybeSingle(),
    ])
    if(profile.error) throw profile.error
    if(documents.error) throw documents.error
    if(verification.error) throw verification.error
    const sections=profile.data?.sections || {}
    const ptkp=calculatePtkp(sections)
    return NextResponse.json({employee:ctx.identity, sections,ptkp:{...ptkp,verified:verification.data?.fingerprint===ptkp.fingerprint?verification.data:null}, updated_at:profile.data?.updated_at || null,documents:documents.data || []})
  } catch(error){ const e=profileError(error);return NextResponse.json({message:e.message},{status:e.status}) }
}
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireProfileAccess(request)
    const body = await request.json().catch(()=>null)
    const section = body?.section
    if(!isProfileSection(section) || !body?.values || typeof body.values!=='object' || Array.isArray(body.values)) return NextResponse.json({message:'Kategori atau data tidak valid.'},{status:400})
    const allowed = new Set(Object.keys(PROFILE_SECTIONS[section].fields).filter(k=>k!=='tax_status'))
    const clean: Record<string,string> = {}
    for(const [k,v] of Object.entries(body.values as Record<string,unknown>)){
      if(!allowed.has(k) || typeof v !== 'string' || v.length>(k.endsWith('_json')?18000:1500)) return NextResponse.json({message:`Nilai tidak valid: ${k}`},{status:400})
      clean[k]=v.trim()
    }
    if(Object.keys(clean).length===0) return NextResponse.json({message:'Tidak ada isian untuk disimpan.'},{status:400})
    // Atomic, row-locked JSON merge + audit; prevents concurrent category edits overwriting one another.
    const result = await ctx.admin.rpc('harmony_save_employee_profile_section_v1',{p_employee_id:ctx.employeeId,p_actor_id:ctx.authUserId,p_section:section,p_values:clean})
    if(result.error) throw result.error
    return NextResponse.json({message:'Biodata tersimpan.',sections:result.data})
  }catch(error){const e=profileError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
