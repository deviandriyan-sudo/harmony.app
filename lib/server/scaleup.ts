import type { NextRequest } from 'next/server'
import { requireHarmonyApi, harmonyApiError, type HarmonyApiContext } from '@/lib/server/user-api-auth'
import { normalizePolicy, type ApprovalPolicy } from '@/lib/scaleup/workflow'
import { COMPLETE_READ_MAX, readCompletePages, readIdBatches } from '@/lib/server/read-complete-pages'

const HR_ROLES = new Set(['hr', 'admin', 'administrator', 'super_admin', 'human_resources'])
export const isScaleupHR = (role: string) => HR_ROLES.has(String(role).toLowerCase())
export async function scaleupContext(request: NextRequest) {
  const context = await requireHarmonyApi(request)
  return { ...context, isHR: isScaleupHR(context.appUser.role) }
}
export function requireScaleupEmployee(context: HarmonyApiContext) {
  if (!context.employee?.id || context.employee.is_active === false) {
    throw Object.assign(new Error('Akses SCALE UP memerlukan employee master aktif yang terhubung.'), { status: 403 })
  }
  return context.employee.id
}
export function requireScaleupHR(context: HarmonyApiContext) {
  if (!isScaleupHR(context.appUser.role)) {
    throw Object.assign(new Error('Hanya HR Administrator yang dapat mengubah konfigurasi SCALE UP.'), { status: 403 })
  }
}
export async function currentScaleupPolicy(context: HarmonyApiContext) {
  const { data, error } = await context.admin.from('scaleup_approval_policies')
    .select('policy_version,configuration').eq('is_current', true).single()
  if (error || !data) throw Object.assign(new Error('SCALE UP belum dikonfigurasi. Jalankan migrasi SQL dan periksa policy HR.'), { status: 503 })
  return { version: Number(data.policy_version), config: normalizePolicy(data.configuration) as ApprovalPolicy }
}
export function scaleupRouteError(error: unknown) {
  const e = harmonyApiError(error, 'SCALE UP tidak dapat memproses permintaan.')
  if (e.status === 500 && /constraint|invalid|missing|unauthorized|incomplete|not eligible|not found|needs hr|must|stage|approval|requester|duplicate/i.test(e.message)) e.status = 422
  return { status: e.status, message: e.message }
}
type VisibleRequest = { id:string; requester_employee_id:string; request_version:number; submitted_at:string; [key:string]:unknown }
type VisibleStage = { id:string; request_id:string; request_version:number; stage_order:number; [key:string]:unknown }
type VisiblePerson = { id:string; full_name:string|null; employee_number:string|null; department:string|null; position:string|null }
const REQUEST_FIELDS = 'id,requester_employee_id,training,nominees,policy_version,request_version,approval_status,execution_status,total_estimated_budget,submitted_at,updated_at'

export async function getVisibleRequests(context: Awaited<ReturnType<typeof scaleupContext>>) {
  const employeeId = context.employee?.id
  const readRequests = (owner?: string, ids?: string[]) => readCompletePages<VisibleRequest>((from,to) => {
    let query = context.admin.from('scaleup_training_requests').select(REQUEST_FIELDS,{count:'exact'}).order('id')
    if (owner) query=query.eq('requester_employee_id',owner)
    if (ids) query=query.in('id',ids)
    return query.range(from,to)
  },'Pengajuan SCALE UP')
  let requests: VisibleRequest[]
  if (context.isHR) requests=await readRequests()
  else {
    if (!employeeId) return []
    const [own, assigned] = await Promise.all([
      readRequests(employeeId),
      readCompletePages<{id:string;request_id:string}>((from,to)=>context.admin.from('scaleup_approval_stages').select('id,request_id',{count:'exact'}).eq('approver_employee_id',employeeId).order('id').range(from,to),'Penugasan approval SCALE UP', COMPLETE_READ_MAX * 5),
    ])
    const ownIds = new Set(own.map(row=>row.id))
    const others = await readIdBatches(assigned.map(row=>row.request_id).filter(id=>!ownIds.has(id)), ids=>readRequests(undefined,ids))
    requests=[...new Map([...own,...others].map(row=>[row.id,row])).values()]
    if(requests.length>COMPLETE_READ_MAX)throw Object.assign(new Error('Pengajuan SCALE UP melebihi batas pembacaan aman.'),{status:409})
  }
  requests.sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at))||b.id.localeCompare(a.id))
  const requestIds = requests.map(item=>item.id)
  if (!requestIds.length) return []
  const [stages, people] = await Promise.all([
    readIdBatches(requestIds, ids=>readCompletePages<VisibleStage>((from,to)=>context.admin.from('scaleup_approval_stages').select('*',{count:'exact'}).in('request_id',ids).order('id').range(from,to),'Tahapan approval SCALE UP', COMPLETE_READ_MAX * 5)),
    readIdBatches<VisiblePerson>(requests.map(row=>row.requester_employee_id), async ids=>{
      const response=await context.admin.from('employees').select('id,full_name,employee_number,department,position').in('id',ids)
      if(response.error)throw response.error
      return response.data||[]
    }),
  ])
  const nameMap = new Map(people.map(row=>[row.id,row]))
  const stagesByVersion = new Map<string,VisibleStage[]>()
  for(const stage of stages){
    const key=`${stage.request_id}:${stage.request_version}`
    const rows=stagesByVersion.get(key)||[];rows.push(stage);stagesByVersion.set(key,rows)
  }
  return requests.map(row=>({...row,
    requester:nameMap.get(row.requester_employee_id)||null,
    stages:(stagesByVersion.get(`${row.id}:${row.request_version}`)||[]).sort((a,b)=>a.stage_order-b.stage_order),
  }))
}
