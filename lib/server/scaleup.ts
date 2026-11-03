import type { NextRequest } from 'next/server'
import { requireHarmonyApi, harmonyApiError, type HarmonyApiContext } from '@/lib/server/user-api-auth'
import { normalizePolicy, type ApprovalPolicy } from '@/lib/scaleup/workflow'

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
export async function getVisibleRequests(context: Awaited<ReturnType<typeof scaleupContext>>) {
  const employeeId = context.employee?.id
  let ids: string[] = []
  if (!context.isHR) {
    if (!employeeId) return []
    const assigned = await context.admin.from('scaleup_approval_stages').select('request_id').eq('approver_employee_id', employeeId)
    if (assigned.error) throw assigned.error
    ids = [...new Set((assigned.data || []).map(row => String(row.request_id)))]
  }
  let query = context.admin.from('scaleup_training_requests')
    .select('id,requester_employee_id,training,nominees,policy_version,request_version,approval_status,execution_status,total_estimated_budget,submitted_at,updated_at')
    .order('submitted_at', { ascending: false }).limit(150)
  if (!context.isHR) {
    if (ids.length) query = query.or(`requester_employee_id.eq.${employeeId},id.in.(${ids.join(',')})`)
    else query = query.eq('requester_employee_id', employeeId)
  }
  const { data: requests, error } = await query
  if (error) throw error
  const requestIds = (requests || []).map(item => item.id)
  if (requestIds.length === 0) return []
  const [stageResponse, personResponse] = await Promise.all([
    context.admin.from('scaleup_approval_stages').select('*').in('request_id',requestIds).order('stage_order'),
    context.admin.from('employees').select('id,full_name,employee_number,department,position').in('id',[...new Set((requests || []).map(x => x.requester_employee_id))]),
  ])
  if (stageResponse.error) throw stageResponse.error
  if (personResponse.error) throw personResponse.error
  const nameMap = new Map((personResponse.data || []).map(x => [x.id,x]))
  return (requests || []).map(row => ({ ...row,
    requester: nameMap.get(row.requester_employee_id) || null,
    stages: (stageResponse.data || []).filter(stage => stage.request_id === row.id && stage.request_version === row.request_version),
  }))
}
