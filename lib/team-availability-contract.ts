/** Company-wide business availability only: never include private reasons, raw
 * fingerprint records, personal notes, financial data or proof URLs. */
const PERSON = 'id,employee_id,employee_number,machine_pin,full_name,department,position'
export const TEAM_LEAVE_COLUMNS = `${PERSON},request_type,leave_type,start_date,end_date,status,supervisor_status,hr_status,job_pending,handover_to,handover_to_employee_id,handover_to_employee_number,handover_to_full_name,job_handover_to,job_handover_to_name`
export const TEAM_PHL_COLUMNS = `${PERSON},source,phl_date,claim_start_date,claim_end_date,status,supervisor_status,hr_status,job_pending_summary,handover_to_employee_id,handover_to_employee_number,handover_to_full_name`
export const TEAM_ATTENDANCE_COLUMNS = `${PERSON},attendance_date,status,absence_request_type,absence_request_label,absence_request_status,supervisor_approval_status,hr_final_status,job_pending,handover_to`
export const TEAM_DIRECTORY_COLUMNS = 'id,employee_number,machine_pin,full_name,department,position,email,is_active'

export function teamMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [year, number] = month.split('-').map(Number)
  if (year < 2000 || year > 2100) return null
  return { start: `${month}-01`, end: `${month}-${String(new Date(Date.UTC(year,number,0)).getUTCDate()).padStart(2,'0')}` }
}

// Return either complete results or an explicit error, not a silently truncated list.
export async function collectTeamPages<T>(read: (from: number, to: number) => PromiseLike<{data:T[]|null,error:unknown,count:number|null}>, size=500, max=10000) {
  const rows:T[]=[]
  let expected:number|null=null
  for (let from=0; from<=max; from+=size) {
    const result=await read(from,from+size-1)
    if(result.error || !Array.isArray(result.data) || result.count===null || result.count>max) throw new Error('Inventaris histori tim tidak lengkap.')
    if(expected===null) expected=result.count
    if(result.count!==expected || rows.length+result.data.length>expected) throw new Error('Histori tim berubah saat dimuat; muat ulang.')
    rows.push(...result.data)
    if(rows.length===expected) return rows
    if(result.data.length!==size) break
  }
  throw new Error('Histori tim tidak lengkap; muat ulang.')
}
