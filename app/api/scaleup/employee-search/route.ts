import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupHR,scaleupRouteError } from '@/lib/server/scaleup'
export const runtime='nodejs'
export async function GET(request:NextRequest) {
  try {
    const ctx=await scaleupContext(request);requireScaleupHR(ctx)
    const q=(request.nextUrl.searchParams.get('q')||'').trim().replace(/[%_,]/g,'').slice(0,70)
    if(q.length<2)return NextResponse.json({employees:[]})
    const {data,error}=await ctx.admin.from('employees')
      .select('id,full_name,employee_number,department,position,is_active')
      .ilike('full_name',`%${q}%`).eq('is_active',true).limit(30)
    if(error)throw error
    return NextResponse.json({employees:data||[]})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
