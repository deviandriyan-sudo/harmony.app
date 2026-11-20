import { NextRequest, NextResponse } from 'next/server'
import { requireHarmonyApi } from '@/lib/server/user-api-auth'
import { getPHLSubordinateIds } from '@/lib/server/phl-work'
import { deriveApprovalStage } from '@/lib/leave-workflow-status'
import { cleanStatus, witaToday } from '@/lib/dashboard-monitoring'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const {admin, employee} = await requireHarmonyApi(request)
    if (!employee) return NextResponse.json({items:[],total:0},{headers:{'Cache-Control':'private, no-store'}})
    const ids = await getPHLSubordinateIds(admin,employee)
    if (!ids.length) return NextResponse.json({items:[],total:0},{headers:{'Cache-Control':'private, no-store'}})
    const today = witaToday()
    const month = today.slice(0,7)
    const [staff,attendance,leaves,work,claims] = await Promise.all([
      admin.from('employees').select('id,full_name').in('id',ids),
      admin.from('attendance_period_confirmations').select('id,employee_id,employee_status,supervisor_status,period_month,employee_submitted_at').in('employee_id',ids).eq('period_month',month).limit(500),
      admin.from('leave_requests').select('id,employee_id,request_type,leave_type,status,supervisor_status,hr_status,start_date,created_at').in('employee_id',ids).neq('request_type','phl_claim').order('created_at',{ascending:false}).limit(250),
      admin.from('phl_work_requests').select('id,employee_id,work_date,status,supervisor_status,created_at').in('employee_id',ids).order('created_at',{ascending:false}).limit(250),
      admin.from('phl_records').select('id,employee_id,phl_date,source,status,supervisor_status,hr_status,created_at').in('employee_id',ids).eq('source','employee_phl_claim').order('created_at',{ascending:false}).limit(250),
    ])
    const failures = [staff,attendance,leaves,work,claims]
    const firstError = failures.find(result=>result.error)
    if (firstError?.error) throw firstError.error
    const nameById=new Map((staff.data||[]).map(row=>[row.id,row.full_name||'Karyawan']))
    type Item = {id:string;name:string;category:string;date:string;href:string;status:string}
    const items: Item[]=[]
    for(const row of attendance.data||[]) {
      if (!['submitted','pending'].includes(cleanStatus(row.employee_status)) || ['approved','rejected'].includes(cleanStatus(row.supervisor_status))) continue
      items.push({id:`attendance-${row.id}`,name:nameById.get(row.employee_id)||'Karyawan',category:'Konfirmasi Absensi',date:row.period_month,status:'Menunggu Atasan',href:'/employee/approvals/attendance'})
    }
    for(const row of leaves.data||[]) {
      if (deriveApprovalStage(row)!=='waiting_supervisor') continue
      items.push({id:`leave-${row.id}`,name:nameById.get(row.employee_id)||'Karyawan',category:row.leave_type||'Cuti / Izin',date:row.start_date||'',status:'Menunggu Atasan',href:'/employee/approvals/leave'})
    }
    for(const row of work.data||[]) {
      if (['approved','rejected','cancelled'].includes(cleanStatus(row.supervisor_status || row.status))) continue
      items.push({id:`work-${row.id}`,name:nameById.get(row.employee_id)||'Karyawan',category:'Pengajuan Saldo PHL',date:row.work_date||'',status:'Menunggu Atasan',href:'/employee/approvals/phl'})
    }
    for(const row of claims.data||[]) {
      if (deriveApprovalStage(row)!=='waiting_supervisor') continue
      items.push({id:`claim-${row.id}`,name:nameById.get(row.employee_id)||'Karyawan',category:'Klaim PHL',date:row.phl_date||'',status:'Menunggu Atasan',href:'/employee/approvals/leave'})
    }
    return NextResponse.json({items:items.slice(0,7),total:items.length},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    const status=Number((error as {status?:number}).status)||500
    return NextResponse.json({message:status<500?(error as Error).message:'Ringkasan approval tidak dapat dimuat.'},{status:status>=400&&status<600?status:500})
  }
}
