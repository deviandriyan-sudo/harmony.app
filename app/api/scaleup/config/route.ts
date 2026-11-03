import { NextRequest,NextResponse } from 'next/server'
import { scaleupContext,requireScaleupHR,currentScaleupPolicy,scaleupRouteError } from '@/lib/server/scaleup'
import { normalizePolicy } from '@/lib/scaleup/workflow'
export const runtime='nodejs'
export async function GET(request:NextRequest) {
  try {const ctx=await scaleupContext(request);requireScaleupHR(ctx)
    const policy=await currentScaleupPolicy(ctx)
    const {data,error}=await ctx.admin.from('scaleup_approval_policies')
      .select('policy_version,created_at,actor_user_id').order('policy_version',{ascending:false}).limit(20)
    if(error)throw error
    return NextResponse.json({policy,versions:data})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
export async function POST(request:NextRequest) {
  try {const ctx=await scaleupContext(request);requireScaleupHR(ctx)
    const body=await request.json(); const config=normalizePolicy(body?.configuration)
    if(!config.mandatory_roles.includes('supervisor_1')) throw Error('Atasan 1 wajib di seluruh policy.')
    const {data,error}=await ctx.admin.rpc('scaleup_change_policy_v1',{
      p_actor_user_id:ctx.appUser.id,p_configuration:config,
    })
    if(error)throw error
    return NextResponse.json({policy_version:data,message:'Kebijakan baru berlaku untuk pengajuan baru.'})
  }catch(error){const e=scaleupRouteError(error);return NextResponse.json({message:e.message},{status:e.status})}
}
