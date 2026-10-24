import { NextRequest, NextResponse } from 'next/server'
import { requireProfileAccess, profileError } from '@/lib/server/employee-profile-auth'
import { calculatePtkp, currentTaxYearWita } from '@/lib/ptkp'
export const runtime='nodejs'
/** HR approval records a year-specific tax verification, never updates payroll. */
export async function POST(request:NextRequest){
 try{
  const body=await request.json().catch(()=>null)
  const id=String(body?.employee_id||'')
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({message:'Karyawan tidak valid.'},{status:400})
  const ctx=await requireProfileAccess(request,id)
  if(!ctx.isHR)return NextResponse.json({message:'Hanya HR yang dapat memverifikasi PTKP.'},{status:403})
  const year=Number(body?.tax_year)
  const thisYear=currentTaxYearWita()
  if(!Number.isInteger(year)||year<thisYear-1||year>thisYear+1)return NextResponse.json({message:'Tahun pajak tidak valid.'},{status:400})
  if(String(body?.note||'').trim().length<10)return NextResponse.json({message:'Catatan pemeriksaan HR minimal 10 karakter.'},{status:400})
  const profile=await ctx.admin.from('harmony_employee_profile_sections').select('sections').eq('employee_id',id).maybeSingle()
  if(profile.error)throw profile.error
  const proposal=calculatePtkp(profile.data?.sections||{},year)
  if(!proposal.code||proposal.unresolvedCount>0)return NextResponse.json({message:'Periksa dan lengkapi data tanggungan yang belum tervalidasi terlebih dahulu.'},{status:422})
  if(proposal.fingerprint!==String(body?.fingerprint||''))return NextResponse.json({message:'Data keluarga sudah berubah. Refresh sebelum melakukan verifikasi.'},{status:409})
  if(proposal.code.startsWith('K/I/') || (proposal.code.startsWith('K/') && String(profile.data?.sections?.identity?.gender||'').toLowerCase()==='perempuan')){
   const docs=await ctx.admin.from('harmony_employee_profile_documents').select('id').eq('employee_id',id).in('category',proposal.code.startsWith('K/I/')?['tax_statement','family_document']:['spouse_no_income_letter']).limit(1)
   if(docs.error)throw docs.error
   if(!docs.data?.length)return NextResponse.json({message:'Unggah bukti penunjang status pajak khusus sebelum diverifikasi HR.'},{status:422})
  }
  const res=await ctx.admin.from('harmony_employee_ptkp_reviews').upsert({employee_id:id,tax_year:year,code:proposal.code,annual_amount:proposal.annualAmount,fingerprint:proposal.fingerprint,review_note:String(body.note).trim().slice(0,1000),reviewed_by:ctx.authUserId,reviewed_at:new Date().toISOString()},{onConflict:'employee_id,tax_year'})
  if(res.error)throw res.error
  return NextResponse.json({message:`PTKP ${year} diverifikasi HR. Pengaturan payroll tidak diubah.`,code:proposal.code})
 }catch(e){const error=profileError(e);return NextResponse.json({message:error.message},{status:error.status})}
}
