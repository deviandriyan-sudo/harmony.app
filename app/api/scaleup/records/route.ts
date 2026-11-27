import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupHR,requireScaleupEmployee,scaleupRouteError } from '@/lib/server/scaleup'
import { readCompletePages, readIdBatches } from '@/lib/server/read-complete-pages'
export const runtime='nodejs'
type TrainingRecord={id:string;employee_id:string;created_at:string;[key:string]:unknown}
type RecordPerson={id:string;full_name:string|null;employee_number:string|null;department:string|null}
type Certificate={id:string;record_id:string;[key:string]:unknown}
export async function GET(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request)
    const employeeId=ctx.isHR?null:requireScaleupEmployee(ctx)
    const data=await readCompletePages<TrainingRecord>((from,to)=>{
      let query=ctx.admin.from('scaleup_training_records').select('*',{count:'exact'}).order('id')
      if(employeeId)query=query.eq('employee_id',employeeId)
      return query.range(from,to)
    },'Riwayat training SCALE UP')
    data.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||b.id.localeCompare(a.id))
    const [employees,docs]=await Promise.all([
      readIdBatches<RecordPerson>(data.map(row=>row.employee_id),async ids=>{
        const response=await ctx.admin.from('employees').select('id,full_name,employee_number,department').in('id',ids)
        if(response.error)throw response.error
        return response.data||[]
      }),
      readIdBatches(data.map(row=>row.id),ids=>readCompletePages<Certificate>((from,to)=>{
        let query=ctx.admin.from('scaleup_training_documents').select('id,record_id,category,certificate_number,issue_date,expiration_date,original_name',{count:'exact'}).eq('category','certificate').in('record_id',ids).order('id')
        if(employeeId)query=query.eq('employee_id',employeeId)
        return query.range(from,to)
      },'Sertifikat SCALE UP',10000)),
    ])
    const names=new Map(employees.map(row=>[row.id,row]))
    const certificates=new Map<string,Certificate[]>()
    for(const doc of docs){const rows=certificates.get(doc.record_id)||[];rows.push(doc);certificates.set(doc.record_id,rows)}
    return NextResponse.json({records:data.map(row=>({...row,employee:names.get(row.employee_id)||null,certificates:certificates.get(row.id)||[]}))},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
export async function POST(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request);requireScaleupHR(ctx)
    const body=await request.json();const action=String(body?.action||'')
    if(action==='complete') {
      const id=String(body?.request_id||'')
      const cost=Number(body?.realized_cost||0)
      const date=String(body?.completed_at||'')
      if(!/^[\w-]{36}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(cost)||cost<0) throw Error('Data completion tidak valid.')
      const {data,error}=await ctx.admin.rpc('scaleup_complete_v1',{
        p_actor_user_id:ctx.appUser.id,p_request_id:id,p_completed_at:date,
        p_realized_cost:cost,p_competency:String(body?.competency||'').slice(0,3000),
      })
      if(error)throw error
      return NextResponse.json({id:data,message:'Training selesai, record karyawan telah diperbarui.'})
    }
    if(action==='legacy') {
      const employeeId=String(body?.employee_id||''),title=String(body?.title||'').trim().slice(0,160)
      const cost=Number(body?.realized_cost||0),date=String(body?.completed_at||'')
      if(!/^[\w-]{36}$/.test(employeeId)||title.length<3 || !/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(cost)||cost<0)
        throw Error('Data training historis tidak lengkap.')
      const {data:person,error:personError}=await ctx.admin.from('employees')
        .select('id').eq('id',employeeId).maybeSingle()
      if(personError||!person)throw Error('Employee historis tidak ditemukan.')
      const {data,error}=await ctx.admin.from('scaleup_training_records').insert({
        employee_id:employeeId,source:'legacy_manual',training:{
          title,provider:String(body?.provider||'').slice(0,200),category:String(body?.category||'').slice(0,100),
        },completed_at:date,realized_cost:cost,
        competency_acquired:String(body?.competency||'').slice(0,3000),verified_by:ctx.appUser.id,
      }).select('id').single()
      if(error)throw error
      await ctx.admin.from('scaleup_audit_events').insert({actor_user_id:ctx.appUser.id,event_name:'legacy_record_created',context:{record_id:data.id,employee_id:employeeId}})
      return NextResponse.json({id:data.id,message:'Training historis berhasil dicatat.'})
    }
    return NextResponse.json({message:'Aksi tidak dikenal.'},{status:400})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
