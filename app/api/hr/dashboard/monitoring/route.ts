import { NextRequest, NextResponse } from 'next/server'
import { requireHRApi, apiError } from '@/lib/server/hr-api-auth'
import { approvalOf, cleanStatus, leaveCategory, validOnDate, witaToday, type MonitorItem, type WorkflowRecord } from '@/lib/dashboard-monitoring'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    const requested = request.nextUrl.searchParams.get('date') || witaToday()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requested) || Number.isNaN(Date.parse(`${requested}T00:00:00Z`))) {
      return NextResponse.json({message:'Tanggal tidak valid.'},{status:400})
    }
    // One-year bound prevents accidental unbounded dashboard scans.
    if (Math.abs(Date.parse(`${requested}T00:00:00Z`) - Date.now()) > 366 * 86_400_000) {
      return NextResponse.json({message:'Tanggal di luar rentang monitoring.'},{status:400})
    }
    const period = new Date(`${requested}T00:00:00Z`)
    const monthDate = requested.slice(8,10) < '11'
      ? new Date(Date.UTC(period.getUTCFullYear(),period.getUTCMonth()-1,1)) : period
    const periodKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth()+1).padStart(2,'0')}`
    const [people, confirmations, leave, claims, work, attendance] = await Promise.all([
      admin.from('employees').select('id,full_name,department,is_active,employment_status,work_schedule_id'),
      admin.from('attendance_period_confirmations').select('employee_id,employee_status,supervisor_status,hr_status,is_locked,hr_finalized_at').eq('period_month', periodKey),
      admin.from('leave_requests').select('id,employee_id,full_name,department,request_type,leave_type,start_date,end_date,status,supervisor_status,hr_status').neq('request_type', 'phl_claim').order('created_at',{ascending:false}).limit(1000),
      admin.from('phl_records').select('id,employee_id,full_name,department,phl_date,claim_start_date,claim_end_date,source,status,supervisor_status,hr_status,created_at').eq('source','employee_phl_claim').order('created_at',{ascending:false}).limit(800),
      admin.from('phl_work_requests').select('id,employee_id,full_name,department,work_date,status,supervisor_status,created_at').order('created_at',{ascending:false}).limit(500),
      admin.from('attendance_logs').select('id,employee_id,attendance_date,status,check_in,check_out,manual_check_in,manual_check_out,absence_request_type,absence_request_status,deleted_at,planned_schedule_id').eq('attendance_date',requested).is('deleted_at',null).limit(1000),
    ])
    const required = [people, confirmations, leave, claims, work, attendance]
    const failed = required.find(result => result.error)
    if (failed?.error) throw failed.error
    type Person = { id: string; full_name: string | null; department: string | null; is_active: boolean | null; employment_status?: string | null }
    const eligible = (people.data || []).filter(row => row.is_active !== false && !['resigned','terminated','inactive','non_aktif','keluar'].includes(cleanStatus(row.employment_status))) as Person[]
    const peopleById = new Map(eligible.map(row => [row.id,row]))
    const items: MonitorItem[] = []
    for (const row of leave.data || []) {
      if (!peopleById.has(row.employee_id) || !validOnDate(row.start_date,row.end_date,requested)) continue
      const value = approvalOf(row as WorkflowRecord)
      if (value === 'excluded') continue
      const person = peopleById.get(row.employee_id)!
      items.push({id:`leave-${row.id}`,employeeId:row.employee_id,name:person.full_name||'Karyawan',department:person.department||'—',category:leaveCategory(row),startDate:row.start_date||requested,endDate:row.end_date||requested,approval:value,href:'/hr/leave'})
    }
    for (const row of claims.data || []) {
      if (!row.employee_id || !peopleById.has(row.employee_id) || !validOnDate(row.claim_start_date||row.phl_date,row.claim_end_date||row.phl_date,requested)) continue
      const value = approvalOf(row as WorkflowRecord)
      if (value === 'excluded') continue
      const person = peopleById.get(row.employee_id)!
      items.push({id:`phl-${row.id}`,employeeId:row.employee_id,name:person.full_name||'Karyawan',department:person.department||'—',category:'phl',startDate:row.claim_start_date||row.phl_date||requested,endDate:row.claim_end_date||row.phl_date||requested,approval:value,href:'/hr/phl'})
    }
    // Explicitly recorded absences only: missing check-ins are never labelled alpa.
    const seen = new Set(items.filter(x=>x.approval==='approved').map(x=>x.employeeId))
    for (const row of attendance.data || []) {
      if (!row.employee_id || !peopleById.has(row.employee_id) || seen.has(row.employee_id)) continue
      if (row.check_in || row.check_out || row.manual_check_in || row.manual_check_out) continue
      const status = cleanStatus(row.status)
      const type = cleanStatus(row.absence_request_type)
      const absenceCategory = /sakit|sick/.test(type+' '+status) ? 'sakit' : /izin|permit/.test(type+' '+status) ? 'izin' : /tugas|travel|dinas/.test(type+' '+status) ? 'tugas_luar' : 'belum_tercatat'
      if (!row.planned_schedule_id && !/absen|absent|alpha|alpa|tidak_hadir|missing|incomplete/.test(status) && !type) continue
      const person = peopleById.get(row.employee_id)!
      items.push({id:`attendance-${row.id}`,employeeId:row.employee_id,name:person.full_name||'Karyawan',department:person.department||'—',category:absenceCategory,startDate:requested,endDate:requested,approval:row.absence_request_status === 'approved' ? 'approved' : 'review',href:'/hr/attendance/data'})
      seen.add(row.employee_id)
    }
    const dedup = new Map<string,MonitorItem>()
    for (const item of items) {
      const key = `${item.employeeId}-${item.category}`
      if (!dedup.has(key) || (dedup.get(key)?.approval !== 'approved' && item.approval === 'approved')) dedup.set(key,item)
    }
    const absence = [...dedup.values()].sort((a,b) => a.name.localeCompare(b.name,'id'))
    const workRequests = (work.data || []).filter(row => row.employee_id && peopleById.has(row.employee_id)).slice(0,200).map(row=>({id:row.id,name:peopleById.get(row.employee_id!)?.full_name||'Karyawan',department:peopleById.get(row.employee_id!)?.department||'—',type:'Pengajuan Saldo PHL',date:row.work_date,status:row.supervisor_status||row.status,href:'/hr/phl'}))
    const claimRequests = (claims.data || []).filter(row=>row.employee_id && peopleById.has(row.employee_id) && approvalOf(row as WorkflowRecord)!=='excluded').slice(0,200).map(row=>({id:row.id,name:peopleById.get(row.employee_id!)?.full_name||'Karyawan',department:peopleById.get(row.employee_id!)?.department||'—',type:'Klaim PHL',date:row.claim_start_date||row.phl_date,status:row.hr_status||row.supervisor_status||row.status,href:'/hr/phl'}))
    const requiredConfirmation = new Set(eligible.map(row=>row.id))
    const confirmed = new Set((confirmations.data||[]).filter(row=>row.is_locked || row.hr_finalized_at || ['submitted','approved'].includes(cleanStatus(row.employee_status))).map(row=>row.employee_id))
    const waitingHR = (leave.data||[]).filter(row => approvalOf(row as WorkflowRecord)==='pending' && cleanStatus(row.supervisor_status)==='approved').length + (claims.data||[]).filter(row=> approvalOf(row as WorkflowRecord)==='pending' && cleanStatus(row.supervisor_status)==='approved').length
    return NextResponse.json({date:requested,periodMonth:periodKey,summary:{needsHR:waitingHR,notConfirmed:[...requiredConfirmation].filter(id=>!confirmed.has(id)).length,absent:absence.filter(row=>row.approval==='approved'||row.approval==='review').length,pendingPHL:workRequests.filter(row=>!['approved','rejected','cancelled'].includes(cleanStatus(row.status))).length+claimRequests.filter(row=>!['approved','rejected','cancelled'].includes(cleanStatus(row.status))).length},absence,phl:[...workRequests,...claimRequests].slice(0,60),updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {const issue=apiError(error,'Monitoring HR belum dapat dimuat.');return NextResponse.json({message:issue.message},{status:issue.status})}
}
