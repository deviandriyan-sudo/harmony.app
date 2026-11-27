import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getHarmonySystemControl } from '@/lib/server/system-control'
import { syncEmployeeAttendanceSources } from '@/lib/server/attendance-source-sync'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60

function authorized(request:NextRequest) {
  const expected=process.env.CRON_SECRET || ''
  const supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim() || ''
  if(expected.length<16 || !supplied) return false
  const a=Buffer.from(expected),b=Buffer.from(supplied)
  return a.length===b.length && timingSafeEqual(a,b)
}

function witaDate() {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value || '').join('-')
}
export async function GET(request:NextRequest) {
  if(!authorized(request)) return NextResponse.json({ok:false},{status:401})
  if(process.env.HARMONY_ATTENDANCE_SOURCE_WRITE_ENABLED!=='true') return NextResponse.json({ok:true,disabled:true})
  if(process.env.HARMONY_ATTENDANCE_SOURCE_SYNC_ENABLED!=='true') return NextResponse.json({ok:true,disabled:true})
  const control=await getHarmonySystemControl(supabaseAdmin)
  if(!control.configured) return NextResponse.json({ok:false,reason:'system_control_unavailable'},{status:503})
  if(!control.systemEnabled) return NextResponse.json({ok:true,paused:true})
  const today=witaDate()
  const begin=new Date(`${today}T00:00:00Z`)
  begin.setUTCDate(begin.getUTCDate()-39)
  const start=begin.toISOString().slice(0,10)
  const {data, error}=await supabaseAdmin.from('employees').select('id').or('is_active.eq.true,is_active.is.null').order('id').limit(201)
  if(error || !data || data.length>200) return NextResponse.json({ok:false,reason:'employee_list_failed'},{status:503})
  let processed=0,updated=0,created=0,conflicts=0,failed=0
  const started=Date.now()
  for(const employee of data) {
    if(Date.now()-started>45_000) break
    try {
      const s=await syncEmployeeAttendanceSources(supabaseAdmin,employee.id,start,today)
      processed++;updated+=s.updatedDays;created+=s.createdDays;conflicts+=s.conflicts.length
    } catch {processed++;failed++}
  }
  const remaining=data.length-processed
  return NextResponse.json({ok:remaining===0&&failed===0,processed,remaining,failed,updated,created,conflicts},
    {status:remaining===0&&failed===0?200:503,headers:{'Cache-Control':'no-store'}})
}
