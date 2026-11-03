import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupHR,requireScaleupEmployee,scaleupRouteError } from '@/lib/server/scaleup'
export const runtime='nodejs'
export async function GET(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request)
    let query=ctx.admin.from('scaleup_training_records').select('*').order('created_at',{ascending:false}).limit(1000)
    if(!ctx.isHR)query=query.eq('employee_id',requireScaleupEmployee(ctx))
    const {data,error}=await query;if(error)throw error
    const ids=[...new Set((data||[]).map(row=>row.employee_id))]
    const employees=ids.length ? await ctx.admin.from('employees')
      .select('id,full_name,employee_number,department').in('id',ids) : {data:[],error:null}
    if(employees.error)throw employees.error
    const documentsQuery=ctx.admin.from('scaleup_training_documents')
      .select('id,record_id,category,certificate_number,issue_date,expiration_date,original_name')
      .eq('category','certificate')
    const docs=ctx.isHR ? await documentsQuery.limit(1000) : await documentsQuery.eq('employee_id',requireScaleupEmployee(ctx)).limit(1000)
    if(docs.error)throw docs.error
    return NextResponse.json({records:(data||[]).map(row=>({...row,
      employee:(employees.data||[]).find(e=>e.id===row.employee_id)||null,
      certificates:(docs.data||[]).filter(d=>d.record_id===row.id),
    }))})
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
