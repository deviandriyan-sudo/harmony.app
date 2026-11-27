import { scannedSignedUrl } from '@/lib/server/private-evidence'
import { requireCleanFile } from '@/lib/server/malware-scan'
import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupEmployee,scaleupRouteError } from '@/lib/server/scaleup'
import { validUploadFileContent } from '@/lib/server/upload-validation'
export const runtime='nodejs'
const BUCKET='scaleup-private'
const allowed=new Set(['application/pdf','image/png','image/jpeg'])
const safeExtension=(mime:string)=>mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg'
async function access(ctx: Awaited<ReturnType<typeof scaleupContext>>,recordId:string|null,requestId:string|null) {
  let ownerId:string|null=null
  if(recordId) {
    const res=await ctx.admin.from('scaleup_training_records').select('id,employee_id,request_id').eq('id',recordId).maybeSingle()
    if(res.error||!res.data)throw Object.assign(new Error('Training record tidak ditemukan.'),{status:404})
    ownerId=res.data.employee_id
    requestId=requestId||res.data.request_id
  }
  if(requestId) {
    const res=await ctx.admin.from('scaleup_training_requests').select('id,requester_employee_id').eq('id',requestId).maybeSingle()
    if(res.error||!res.data)throw Object.assign(new Error('Training request tidak ditemukan.'),{status:404})
    if(ownerId && ownerId!==res.data.requester_employee_id)throw Error('Referensi dokumen tidak sesuai.')
    ownerId=res.data.requester_employee_id
  }
  if(!ownerId)throw Error('Dokumen memerlukan referensi training.')
  if(!ctx.isHR && ctx.employee?.id!==ownerId) {
    const {data,error}=requestId ? await ctx.admin.from('scaleup_approval_stages')
      .select('id').eq('request_id',requestId).eq('approver_employee_id',requireScaleupEmployee(ctx)).limit(1) : {data:[],error:null}
    if(error||!data?.length)throw Object.assign(new Error('Tidak berhak mengakses dokumen.'),{status:403})
  }
  return ownerId
}
export async function POST(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request),form=await request.formData()
    const file=form.get('file')
    if(!(file instanceof File) || file.size<1 || file.size>8*1024*1024 || !allowed.has(file.type))
      throw Error('Dokumen harus PDF/JPG/PNG berukuran maksimum 8 MB.')
    if(!(await validUploadFileContent(file)))
      throw Object.assign(new Error('Isi file tidak sesuai format PDF/JPG/PNG.'),{status:400})
    const requestId=String(form.get('request_id')||'')||null
    const recordId=String(form.get('record_id')||'')||null
    const category=String(form.get('category')||'supporting')
    if(!['proposal','supporting','certificate'].includes(category))throw Error('Jenis dokumen tidak valid.')
    if(category==='certificate'&&!recordId)throw Error('Sertifikat harus terkait training record.')
    const owner=await access(ctx,recordId,requestId)
    await requireCleanFile(ctx.admin,file)
    const id=crypto.randomUUID(),ext=safeExtension(file.type)
    const path=`${owner}/${id}.${ext}`
    const {error:uploadError}=await ctx.admin.storage.from(BUCKET).upload(path,await file.arrayBuffer(),{
      contentType:file.type,upsert:false,
    })
    if(uploadError)throw uploadError
    const payload={request_id:requestId,record_id:recordId,employee_id:owner,category,
      storage_path:path,original_name:file.name.slice(0,180),mime_type:file.type,
      certificate_number:String(form.get('certificate_number')||'').slice(0,100)||null,
      issue_date:String(form.get('issue_date')||'')||null,
      expiration_date:String(form.get('expiration_date')||'')||null,
      uploaded_by:ctx.appUser.id}
    const {data,error}=await ctx.admin.from('scaleup_training_documents').insert(payload).select('id').single()
    if(error){console.warn('HARMONY training document retained after metadata error');throw error}
    return NextResponse.json({id:data.id})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
export async function GET(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request),id=request.nextUrl.searchParams.get('id')||''
    const {data,error}=await ctx.admin.from('scaleup_training_documents')
      .select('id,request_id,record_id,storage_path').eq('id',id).maybeSingle()
    if(error||!data)throw Object.assign(new Error('Dokumen tidak ditemukan.'),{status:404})
    await access(ctx,data.record_id,data.request_id)
    const url=await scannedSignedUrl(ctx.admin,BUCKET,data.storage_path)
    if(!url)return NextResponse.json({message:'Dokumen belum lolos pemeriksaan keamanan.'},{status:503,headers:{'Cache-Control':'private, no-store'}})
    return NextResponse.json({url,expires_in:60},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
