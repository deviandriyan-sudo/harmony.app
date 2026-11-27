import { NextRequest, NextResponse } from 'next/server'
import { requireHarmonyApi, harmonyApiError, normalizeHarmonyRole } from '@/lib/server/user-api-auth'
import { collectTeamPages, teamMonthRange, TEAM_LEAVE_COLUMNS, TEAM_PHL_COLUMNS, TEAM_ATTENDANCE_COLUMNS, TEAM_DIRECTORY_COLUMNS } from '@/lib/team-availability-contract'

export const dynamic='force-dynamic'
const HR=new Set(['hr','admin','administrator','super_admin','human_resources'])
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}})

export async function GET(request:NextRequest) {
  try {
    const ctx=await requireHarmonyApi(request)
    const role=normalizeHarmonyRole(ctx.appUser.role)
    if(!HR.has(role) && (role!=='employee'||!ctx.employee||ctx.employee.id!==ctx.appUser.employee_id||ctx.employee.is_active===false)) return reply({error:'Akses histori tim ditolak.'},403)
    const {admin}=ctx
    if(request.nextUrl.searchParams.get('mode')==='months') {
      const results=await Promise.all([
        admin.from('leave_requests').select('start_date').not('start_date','is',null).order('start_date').limit(1),
        admin.from('phl_records').select('phl_date').eq('source','employee_phl_claim').not('phl_date','is',null).order('phl_date').limit(1),
        admin.from('phl_records').select('claim_start_date').eq('source','employee_phl_claim').not('claim_start_date','is',null).order('claim_start_date').limit(1),
        admin.from('attendance_logs').select('attendance_date').is('deleted_at',null).not('attendance_date','is',null).order('attendance_date').limit(1),
      ])
      if(results.some(r=>r.error))throw new Error('Histori periode tidak tersedia.')
      const candidates=[results[0].data?.[0]?.start_date,results[1].data?.[0]?.phl_date,results[2].data?.[0]?.claim_start_date,results[3].data?.[0]?.attendance_date].map(v=>String(v||'').slice(0,7)).filter(v=>!!teamMonthRange(v)).sort()
      return reply({earliestMonth:candidates[0]||null})
    }
    const range=teamMonthRange(request.nextUrl.searchParams.get('month')||'')
    if(!range) return reply({error:'Periode tidak valid.'},400)
    const {start,end}=range
    const [leaves,claims,attendance,directory]=await Promise.all([
      collectTeamPages((from,to)=>admin.from('leave_requests').select(TEAM_LEAVE_COLUMNS,{count:'exact'}).lte('start_date',end).or(`end_date.gte.${start},end_date.is.null`).order('id').range(from,to)),
      collectTeamPages((from,to)=>admin.from('phl_records').select(TEAM_PHL_COLUMNS,{count:'exact'}).eq('source','employee_phl_claim').or(`claim_start_date.lte.${end},and(claim_start_date.is.null,phl_date.lte.${end})`).or(`claim_end_date.gte.${start},and(claim_end_date.is.null,phl_date.gte.${start}),and(claim_end_date.is.null,phl_date.is.null,claim_start_date.gte.${start})`).order('id').range(from,to)),
      collectTeamPages((from,to)=>admin.from('attendance_logs').select(TEAM_ATTENDANCE_COLUMNS,{count:'exact'}).gte('attendance_date',start).lte('attendance_date',end).is('deleted_at',null).order('id').range(from,to)),
      collectTeamPages((from,to)=>admin.from('harmony_employee_directory').select(TEAM_DIRECTORY_COLUMNS,{count:'exact'}).eq('is_active',true).order('id').range(from,to)),
    ])
    return reply({leaves,claims,attendance,directory})
  }catch(error){const issue=harmonyApiError(error,'Gagal memuat histori tim.');return reply({error:issue.message},issue.status)}
}
