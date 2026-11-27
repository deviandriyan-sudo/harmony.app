import { NextRequest, NextResponse } from 'next/server'
import { requireHRApi, apiError } from '@/lib/server/hr-api-auth'
import { isValidPeriod, dateSpan, workEvidence, syncEmployeeAttendanceSources } from '@/lib/server/attendance-source-sync'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60

type Employee={id:string;employee_number:string|null;full_name:string|null}
type Leave={id:string;employee_id:string;request_type:string;start_date:string;end_date:string;total_days:number|null;proof_file_url:string|null}
type Log={id:string;employee_id:string;attendance_date:string;status:string|null;source:string|null;check_in:string|null;check_out:string|null;manual_check_in:string|null;manual_check_out:string|null;total_punches:number|null;absence_request_type:string|null;absence_request_status:string|null;leave_request_id:string|null;absence_proof_url:string|null;correction_proof_url:string|null;proof_source:string|null}

function parseRange(request:NextRequest) {
  const url=new URL(request.url)
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const now=['year','month','day'].map(k=>today.find(p=>p.type===k)?.value || '').join('-')
  const date=new Date(`${now}T00:00:00Z`);date.setUTCDate(date.getUTCDate()-30)
  const start=url.searchParams.get('start')||date.toISOString().slice(0,10)
  const end=url.searchParams.get('end')||now
  if(!isValidPeriod(start,end)) throw Object.assign(new Error('Rentang audit maksimum 45 hari.'),{status:400})
  return {start,end}
}
export async function GET(request:NextRequest) {
  try {
    const {admin}=await requireHRApi(request)
    const {start,end}=parseRange(request)
    const [empResult,leaveResult,holidayResult]=await Promise.all([
      admin.from('employees').select('id,employee_number,full_name').or('is_active.eq.true,is_active.is.null').limit(201),
      admin.from('leave_requests').select('id,employee_id,request_type,start_date,end_date,total_days,proof_file_url').eq('status','approved').eq('hr_status','approved').eq('supervisor_status','approved').lte('start_date',end).gte('end_date',start).limit(1000),
      admin.from('holidays').select('holiday_date').eq('is_active',true).gte('holiday_date',start).lte('holiday_date',end),
    ])
    if(empResult.error || leaveResult.error || holidayResult.error) throw new Error('Gagal membaca sumber audit.')
    if(!empResult.data || empResult.data.length>=201 || (leaveResult.data || []).length>=1000) throw new Error('Audit melebihi kapasitas; persempit tanggal.')
    const people=(empResult.data||[]) as Employee[]
    const activeIds=new Set(people.map(e=>e.id))
    const names=new Map(people.map(e=>[e.id,e]))
    const holidays=new Set((holidayResult.data||[]).map(row=>row.holiday_date))
    const attendance:Log[]=[]
    for(let from=0;from<12000;from+=900) {
      const batch=await admin.from('attendance_logs').select('id,employee_id,attendance_date,status,source,check_in,check_out,manual_check_in,manual_check_out,total_punches,absence_request_type,absence_request_status,leave_request_id,absence_proof_url,correction_proof_url,proof_source')
        .is('deleted_at',null).gte('attendance_date',start).lte('attendance_date',end).order('attendance_date').order('id').range(from,from+899)
      if(batch.error) throw new Error('Gagal mengambil riwayat harian.')
      attendance.push(...(batch.data||[]) as Log[])
      if((batch.data||[]).length<900) break
      if(from+900>=12000) throw new Error('Batas data audit terlampaui.')
    }
    const map=new Map(attendance.map(a=>[`${a.employee_id}|${a.attendance_date}`,a]))
    const conflicts:Array<{employee:string;employee_number:string|null;date:string;request_id:string;request_type:string;attendance_status:string|null;clock_in:string|null;clock_out:string|null;issue:string}>=[]
    let approvedDays=0, matchedAbsence=0, approvedMissing=0, evidenceMissing=0, manualEvidenceMissing=0, officialEvidenceMissing=0
    for(const request of (leaveResult.data||[]) as Leave[]) {
      if(!activeIds.has(request.employee_id))continue
      const first=request.start_date>start?request.start_date:start
      const last=request.end_date<end?request.end_date:end
      if(!isValidPeriod(first,last))continue
      for(const date of dateSpan(first,last)) {
        const weekday=new Date(`${date}T00:00:00Z`).getUTCDay()
        if(weekday===0 || weekday===6 || holidays.has(date))continue
        approvedDays++
        const log=map.get(`${request.employee_id}|${date}`)
        if(log && workEvidence(log) && request.request_type !== 'official_travel') {
          const e=names.get(request.employee_id)
          conflicts.push({employee:e?.full_name||'Karyawan',employee_number:e?.employee_number||null,
            date,request_id:request.id,request_type:request.request_type,attendance_status:log.status,
            clock_in:log.check_in||log.manual_check_in,clock_out:log.check_out||log.manual_check_out,
            issue:'Hadir bekerja pada tanggal ketidakhadiran disetujui'})
        } else if(log && log.leave_request_id===request.id && ['leave','permit','sick','phl_claim','official_travel'].includes(String(log.status||''))) {
          matchedAbsence++
        } else approvedMissing++
        if(request.request_type!=='annual_leave' && request.proof_file_url && log && !log.absence_proof_url) evidenceMissing++
      }
    }
    for(const log of attendance) {
      if(!activeIds.has(log.employee_id))continue
      if(log.source==='employee_live_manual' && !(log.absence_proof_url||log.correction_proof_url)) manualEvidenceMissing++
      if(log.absence_request_type==='official_travel' && !(log.absence_proof_url||log.correction_proof_url)) officialEvidenceMissing++
    }
    return NextResponse.json({ok:true,start,end,employees:people.length,approvedDays,matchedAbsence,approvedMissing,
      evidenceMissing,manualEvidenceMissing,officialEvidenceMissing,conflicts},
      {headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    const e=apiError(error,'Audit kehadiran tidak tersedia.')
    return NextResponse.json({ok:false,error:e.message},{status:e.status})
  }
}

/** HR-only, bounded, explicit repair of a period; never modifies leave balances. */
export async function POST(request:NextRequest) {
  try {
    const {admin}=await requireHRApi(request)
    const {start,end}=parseRange(request)
    const body=await request.json().catch(()=>null)
    if(body?.confirm!==true) return NextResponse.json({ok:false,error:'Konfirmasi HR diperlukan.'},{status:400})
    if (process.env.HARMONY_ATTENDANCE_SOURCE_WRITE_ENABLED !== 'true') return NextResponse.json({ok:false,error:'Penulisan sumber dinonaktifkan. Audit read-only tetap tersedia.'},{status:503})
    const employees=await admin.from('employees').select('id').or('is_active.eq.true,is_active.is.null').order('id').limit(201)
    if(employees.error || !employees.data || employees.data.length>=201) throw new Error('Daftar karyawan gagal diperiksa.')
    let processed=0,updated=0,created=0,linkedEvidence=0,conflictCount=0,failed=0
    const started=Date.now()
    for(const employee of employees.data) {
      if(Date.now()-started>42_000) break
      try {
        const result=await syncEmployeeAttendanceSources(admin,employee.id,start,end)
        processed++;updated+=result.updatedDays;created+=result.createdDays
        linkedEvidence+=result.linkedEvidence;conflictCount+=result.conflicts.length
      } catch {processed++;failed++}
    }
    const remaining=employees.data.length-processed
    return NextResponse.json({ok:remaining===0&&failed===0,processed,remaining,failed,updated,created,linkedEvidence,conflictCount},
      {status:remaining===0&&failed===0?200:503,headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    const e=apiError(error,'Rekonsiliasi sumber absensi tidak berhasil.')
    return NextResponse.json({ok:false,error:e.message},{status:e.status})
  }
}
