import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Source of truth for approved absence -> daily attendance. A fingerprint or
 * already-recorded manual work interval always outranks an absence request.
 * This module never touches leave balances, request approvals, period decisions,
 * employee-submitted evidence, or HR-locked periods.
 */
export type SourceConflict = {
  date: string
  requestId: string
  requestType: string
  kind: 'worked_on_approved_absence' | 'different_approved_absence' | 'locked_without_sync'
}
export type SourceSyncResult = {
  employeeId: string
  checkedDays: number
  updatedDays: number
  createdDays: number
  linkedEvidence: number
  skippedLocked: number
  conflicts: SourceConflict[]
}

type DailyLog = {
  id: string
  attendance_date: string
  employee_id: string | null
  status: string | null
  source: string | null
  check_in: string | null
  check_out: string | null
  manual_check_in: string | null
  manual_check_out: string | null
  total_punches: number | null
  leave_request_id: string | null
  phl_claim_record_id: string | null
  absence_request_type: string | null
  absence_request_status: string | null
  absence_request_source: string | null
  absence_proof_url: string | null
  absence_proof_name: string | null
  phl_proof_url: string | null
  phl_proof_name: string | null
  employee_confirmation_status: string | null
  is_locked: boolean | null
  updated_at: string | null
}

type SourceRequest = {
  id: string
  employee_id: string
  request_type: string
  leave_type: string | null
  reason: string | null
  start_date: string
  end_date: string
  total_days: number | null
  status: string
  hr_status: string
  supervisor_status: string
  proof_file_url: string | null
  proof_file_name: string | null
}

type SourceClaim = {
  id: string
  employee_id: string
  phl_date: string
  status: string | null
  hr_status: string | null
  supervisor_status: string | null
  proof_file_url: string | null
  proof_file_name: string | null
}

const iso = /^\d{4}-\d{2}-\d{2}$/
const validUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const approved = (value: unknown) => String(value || '').trim().toLowerCase() === 'approved'

export function workEvidence(log: Pick<DailyLog,'check_in'|'check_out'|'manual_check_in'|'manual_check_out'|'total_punches'> | null | undefined) {
  if (!log) return false
  return Boolean(log.check_in || log.check_out || log.manual_check_in || log.manual_check_out || Number(log.total_punches || 0) > 0)
}

export function absenceStatus(requestType: string): string {
  const code = requestType.trim().toLowerCase()
  if (code === 'phl_claim') return 'phl_claim'
  if (code === 'sick') return 'sick'
  if (code === 'permit' || code === 'permission') return 'permit'
  if (code === 'official_travel') return 'official_travel'
  return 'leave'
}

export function isValidPeriod(start: string, end: string, maximumDays = 45): boolean {
  if (!iso.test(start) || !iso.test(end) || end < start) return false
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T00:00:00Z`)
  return Number.isFinite(startTime) && Number.isFinite(endTime) &&
    endTime - startTime < maximumDays * 86_400_000 &&
    new Date(startTime).toISOString().slice(0,10) === start &&
    new Date(endTime).toISOString().slice(0,10) === end
}

export function dateSpan(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  for (let i=0; i<45 && cursor.toISOString().slice(0,10) <= end; i++) {
    dates.push(cursor.toISOString().slice(0,10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

/** A HR-finalized or locked attendance period must not change silently. */
function inLockedPeriod(day: string, periods: Array<{ period_start: string; period_end: string; is_locked: boolean | null; hr_status: string | null }>) {
  return periods.some(p => p.period_start <= day && p.period_end >= day &&
    (p.is_locked === true || ['finalized','approved','locked'].includes(String(p.hr_status || '').toLowerCase())))
}

function writeFailure(context: string, error: { message?: string; code?: string } | null) {
  if (error) throw new Error(`${context}: ${error.code || 'db_error'}`)
}

export async function syncEmployeeAttendanceSources(
  admin: SupabaseClient, employeeId: string, start: string, end: string,
): Promise<SourceSyncResult> {
  if (!validUUID.test(employeeId) || !isValidPeriod(start,end)) throw new Error('Rentang absensi tidak valid.')

  const [employeeResult, logResult, requestResult, periodResult, holidayResult, phlResult] = await Promise.all([
    admin.from('employees').select('id,employee_number,machine_pin,full_name,department,position,is_active').eq('id',employeeId).maybeSingle(),
    admin.from('attendance_logs').select('id,attendance_date,employee_id,status,source,check_in,check_out,manual_check_in,manual_check_out,total_punches,leave_request_id,phl_claim_record_id,absence_request_type,absence_request_status,absence_request_source,absence_proof_url,absence_proof_name,phl_proof_url,phl_proof_name,employee_confirmation_status,is_locked,updated_at')
      .eq('employee_id',employeeId).is('deleted_at',null).gte('attendance_date',start).lte('attendance_date',end).limit(65),
    admin.from('leave_requests').select('id,employee_id,request_type,leave_type,reason,start_date,end_date,total_days,status,hr_status,supervisor_status,proof_file_url,proof_file_name')
      .eq('employee_id',employeeId).eq('status','approved').eq('hr_status','approved').eq('supervisor_status','approved').lte('start_date',end).gte('end_date',start).limit(100),
    admin.from('attendance_period_confirmations').select('period_start,period_end,is_locked,hr_status')
      .eq('employee_id',employeeId).lte('period_start',end).gte('period_end',start).limit(20),
    admin.from('holidays').select('holiday_date').eq('is_active',true).gte('holiday_date',start).lte('holiday_date',end).limit(60),
    admin.from('phl_records').select('id,employee_id,phl_date,status,hr_status,supervisor_status,proof_file_url,proof_file_name')
      .eq('employee_id',employeeId).eq('source','employee_phl_claim').eq('status','approved').eq('hr_status','approved').gte('phl_date',start).lte('phl_date',end).limit(100),
  ])
  for (const [name,result] of [['employee',employeeResult],['attendance',logResult],['requests',requestResult],['period',periodResult],['holiday',holidayResult],['phl',phlResult]] as const) {
    writeFailure(name, result.error)
  }
  const employee = employeeResult.data
  if (!employee || employee.is_active === false) throw new Error('Employee tidak aktif atau tidak ditemukan.')
  const resolvedEmployee = employee
  const logs = (logResult.data || []) as DailyLog[]
  if (logs.length > 45 || new Set(logs.map(row=>row.attendance_date)).size !== logs.length) throw new Error('Terdapat duplikasi atau rentang data absensi melebihi kapasitas aman.')
  if ((requestResult.data || []).length >= 100 || (phlResult.data || []).length >= 100 || (periodResult.data || []).length >= 20 || (holidayResult.data || []).length >= 60) throw new Error('Batas pembacaan sumber tercapai; persempit periode.')
  const logByDate = new Map(logs.map(row=>[row.attendance_date,row]))
  const periods = (periodResult.data || []) as Array<{period_start:string;period_end:string;is_locked:boolean|null;hr_status:string|null}>
  const holidays = new Set((holidayResult.data || []).map(row=>row.holiday_date))
  const result: SourceSyncResult = {employeeId,checkedDays:0,updatedDays:0,createdDays:0,linkedEvidence:0,skippedLocked:0,conflicts:[]}

  const seenSourceByDay = new Map<string,string>()

  async function reconcileDay(day:string, sourceId:string, sourceType:string, status:string, label:string,
    proofUrl:string | null, proofName:string | null, reason:string | null,
    claimId: string | null = null) {
    if ((sourcesByDay.get(day)?.size || 0)>1) {
      result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'different_approved_absence'})
      return
    }
    const priorSource = seenSourceByDay.get(day)
    if (priorSource && priorSource !== sourceId) {
      result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'different_approved_absence'})
      return
    }
    seenSourceByDay.set(day,sourceId)
    const log = logByDate.get(day) || null
    if (inLockedPeriod(day,periods) || log?.is_locked) {
      result.skippedLocked++
      if (!log || (log.leave_request_id !== sourceId && !workEvidence(log))) {
        result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'locked_without_sync'})
      }
      return
    }
    if (workEvidence(log)) {
      // Official travel is work performed away from the office, not leave.
      // Preserve valid manual/machine hours and merely backfill its evidence.
      if (sourceType === 'official_travel') {
        if (log && proofUrl && !log.absence_proof_url) {
          let evidenceQuery = admin.from('attendance_logs').update({
            absence_proof_url:proofUrl,absence_proof_name:proofName,
          }).eq('id',log.id).is('deleted_at',null).or('is_locked.is.null,is_locked.eq.false')
          evidenceQuery=log.updated_at ? evidenceQuery.eq('updated_at',log.updated_at) : evidenceQuery.is('updated_at',null)
          const linked=await evidenceQuery.select('id').maybeSingle()
          writeFailure('official_travel_evidence', linked.error)
          if (linked.data?.id) result.linkedEvidence++
        }
        return
      }
      result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'worked_on_approved_absence'})
      return
    }
    if (claimId && log?.leave_request_id) {
      result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'different_approved_absence'})
      return
    }
    if (log?.leave_request_id && log.leave_request_id !== sourceId && !claimId) {
      result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'different_approved_absence'})
      return
    }
    if (log?.phl_claim_record_id && (!claimId || log.phl_claim_record_id !== claimId)) {
      result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'different_approved_absence'})
      return
    }
    if (log?.absence_request_type && log.absence_request_type !== sourceType &&
      log.absence_request_source !== 'leave_requests' && log.absence_request_source !== 'phl_records' &&
      !['present','absent','manual_attendance'].includes(log.absence_request_type)) {
      result.conflicts.push({date:day,requestId:sourceId,requestType:sourceType,kind:'different_approved_absence'})
      return
    }
    const proofFields = claimId
      ? {phl_proof_url:log?.phl_proof_url || proofUrl || null, phl_proof_name:log?.phl_proof_name || proofName || null}
      : {absence_proof_url:log?.absence_proof_url || proofUrl || null, absence_proof_name:log?.absence_proof_name || proofName || null}
    const payload = {
      status,
      absence_request_type:sourceType,
      absence_request_label:label,
      absence_request_status:'approved',
      absence_request_source:claimId ? 'phl_records' : 'leave_requests',
      ...(claimId ? {phl_claim_record_id:claimId} : {leave_request_id:sourceId}),
      ...proofFields,
      employee_confirmation_status:log?.employee_confirmation_status || 'auto_from_approved_request',
      updated_at:new Date().toISOString(),
    }
    if (log) {
      if (log.status === status && log.absence_request_type === sourceType &&
        log.absence_request_status === 'approved' &&
        (claimId ? log.phl_claim_record_id === claimId : log.leave_request_id === sourceId) &&
        (!proofUrl || (claimId ? log.phl_proof_url : log.absence_proof_url))) return
      let query=admin.from('attendance_logs').update(payload).eq('id',log.id).is('deleted_at',null).or('is_locked.is.null,is_locked.eq.false')
      query=log.updated_at ? query.eq('updated_at',log.updated_at) : query.is('updated_at',null)
      const saved=await query.select('id').maybeSingle()
      writeFailure('attendance_update',saved.error)
      if (saved.data?.id) {
        result.updatedDays++
        if (proofUrl && !(claimId ? log.phl_proof_url : log.absence_proof_url)) result.linkedEvidence++
      }
    } else {
      const saved=await admin.from('attendance_logs').insert({
        employee_id:employeeId,employee_number:resolvedEmployee.employee_number,machine_pin:resolvedEmployee.machine_pin,
        full_name:resolvedEmployee.full_name,department:resolvedEmployee.department,position:resolvedEmployee.position,
        attendance_date:day,check_in:null,check_out:null,total_punches:0,
        source:'approved_leave_request',notes:reason, ...payload,
      }).select('id').maybeSingle()
      writeFailure('attendance_insert',saved.error)
      if (saved.data?.id) {result.createdDays++; if (proofUrl) result.linkedEvidence++}
    }
  }

  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const today = ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value || '').join('-')
  const requests=(requestResult.data || []) as SourceRequest[]
  const sourcesByDay = new Map<string,Set<string>>()
  const track = (day:string,id:string) => {
    const ids=sourcesByDay.get(day) || new Set<string>()
    ids.add(id); sourcesByDay.set(day,ids)
  }
  for (const req of requests) {
    if (!approved(req.hr_status) || !approved(req.supervisor_status) || !approved(req.status)) continue
    const first=req.start_date < start ? start : req.start_date
    const last=req.end_date > end ? end : req.end_date
    if (!isValidPeriod(first,last)) continue
    for (const day of dateSpan(first,last)) {
      const weekday=new Date(`${day}T00:00:00Z`).getUTCDay()
      if (weekday!==0 && weekday!==6 && !holidays.has(day) && day<=today) track(day,req.id)
    }
  }
  for (const claim of (phlResult.data || []) as SourceClaim[]) {
    if (approved(claim.hr_status) && approved(claim.supervisor_status) && approved(claim.status) && claim.phl_date >= start && claim.phl_date <= end && claim.phl_date <= today) track(claim.phl_date,claim.id)
  }
  for(const req of requests) {
    if (!approved(req.hr_status) || !approved(req.supervisor_status) || !approved(req.status)) continue
    const first = req.start_date < start ? start : req.start_date
    const last = req.end_date > end ? end : req.end_date
    if (last < first || !isValidPeriod(first,last)) continue
    for (const day of dateSpan(first,last)) {
      // Never manufacture an absence on a nonworking day: a request can span weekends.
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
      if (weekday === 0 || weekday === 6 || holidays.has(day) || day > today) continue
      result.checkedDays++
      await reconcileDay(day,req.id,req.request_type,absenceStatus(req.request_type),
        req.leave_type || req.request_type,req.proof_file_url,req.proof_file_name,req.reason)
    }
  }
  for (const claim of (phlResult.data || []) as SourceClaim[]) {
    if (!approved(claim.hr_status) || !approved(claim.supervisor_status) || !approved(claim.status)) continue
    if (!claim.phl_date || claim.phl_date > today || claim.phl_date < start || claim.phl_date > end) continue
    result.checkedDays++
    await reconcileDay(claim.phl_date,claim.id,'phl_claim','phl_claim','Klaim PHL',
      claim.proof_file_url,claim.proof_file_name,null,claim.id)
  }
  return result
}
