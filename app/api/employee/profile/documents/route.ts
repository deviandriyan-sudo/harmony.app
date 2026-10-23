import { NextRequest, NextResponse } from 'next/server'
import { requireProfileAccess, profileError } from '@/lib/server/employee-profile-auth'
import { requireHarmonyApi } from '@/lib/server/user-api-auth'
import { PROFILE_DOC_CATEGORIES } from '@/lib/profile-schema'
export const runtime = 'nodejs'
const BUCKET='harmony-employee-private'
const MAX_BYTES=8*1024*1024
const MIME: Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
function uuid(v:string){return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v)}
export async function POST(request:NextRequest){
  try{
    const ctx=await requireProfileAccess(request)
    const form=await request.formData()
    const file=form.get('file'), category=String(form.get('category')||'other')
    if(!(file instanceof File) || !PROFILE_DOC_CATEGORIES.includes(category as typeof PROFILE_DOC_CATEGORIES[number]))return NextResponse.json({message:'Dokumen atau kategori tidak valid.'},{status:400})
    const extension=file.name.toLowerCase().split('.').pop()||''
    const isImage= ['jpg','jpeg','png','webp'].includes(extension)
    if(!MIME[extension] || file.size<=0 || file.size>MAX_BYTES || (category==='avatar'&&!isImage) || (file.type&&file.type!==MIME[extension]))return NextResponse.json({message:'Format/ukuran file tidak valid (maks 8 MB).'}, {status:400})
    const id=crypto.randomUUID(),path=`${ctx.employeeId}/${id}.${extension}`
    const bytes=new Uint8Array(await file.arrayBuffer())
    const hasPrefix=(magic:number[])=>magic.every((v,i)=>bytes[i]===v)
    const magicOkay=extension==='pdf'?hasPrefix([37,80,68,70,45]):extension==='png'?hasPrefix([137,80,78,71,13,10,26,10]):['jpg','jpeg'].includes(extension)?hasPrefix([255,216,255]):extension==='webp'?hasPrefix([82,73,70,70])&&String.fromCharCode(...bytes.slice(8,12))==='WEBP':extension==='docx'?hasPrefix([80,75,3,4]):false
    if(!magicOkay)return NextResponse.json({message:'Isi dokumen tidak sesuai format file.'},{status:400})
    const res=await ctx.admin.storage.from(BUCKET).upload(path,bytes,{contentType:MIME[extension],upsert:false})
    if(res.error) throw res.error
    const saved=await ctx.admin.from('harmony_employee_profile_documents').insert({id,employee_id:ctx.employeeId,category,storage_path:path,original_name:file.name.slice(0,180),mime_type:MIME[extension],size_bytes:file.size,uploaded_by:ctx.authUserId}).select('id').single()
    if(saved.error){await ctx.admin.storage.from(BUCKET).remove([path]);throw saved.error}
    return NextResponse.json({message:'Dokumen berhasil disimpan.',id})
  }catch(error){const e=profileError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
export async function GET(request:NextRequest){
  try{
    const fileId=request.nextUrl.searchParams.get('id')||''
    if(!uuid(fileId))return NextResponse.json({message:'ID dokumen tidak valid.'},{status:400})
    // Check authenticated actor before reading metadata; file owner / HR verified afterwards.
    const actor=await requireHarmonyApi(request)
    const isHR=new Set(['hr','admin','administrator','super_admin','human_resources']).has(String(actor.appUser.role||'').toLowerCase())
    const query=await actor.admin.from('harmony_employee_profile_documents').select('id,employee_id,storage_path,original_name,category').eq('id',fileId).maybeSingle()
    if(query.error||!query.data)return NextResponse.json({message:'Dokumen tidak ditemukan.'},{status:404})
    if(query.data.employee_id!==actor.employee?.id && !isHR)return NextResponse.json({message:'Akses ditolak.'},{status:403})
    const signed=await actor.admin.storage.from(BUCKET).createSignedUrl(query.data.storage_path,60,query.data.category==='avatar'?{}:{download:query.data.original_name})
    if(signed.error||!signed.data?.signedUrl)throw signed.error||new Error('Dokumen tidak bisa dibuka.')
    return NextResponse.json({url:signed.data.signedUrl})
  }catch(error){const e=profileError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
