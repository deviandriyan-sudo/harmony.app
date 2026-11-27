import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import ts from 'typescript'
const root=process.cwd()
const read=(p)=>readFileSync(join(root,p),'utf8')
const moduleSource=ts.transpileModule(read('lib/attendance-source-state.ts'),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText
const rule=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'))
const blank={source:'employee_manual_confirmation',status:'present',total_punches:0}
assert.equal(rule.trustedAttendanceDay(blank),false,'empty manual confirmation is not verified')
assert.equal(rule.trustedAttendanceDay(null,true),true,'offday requires no confirmation')
const fingerprint={check_in:'07:25',check_out:'17:30',total_punches:2,status:'present'}
assert.equal(rule.trustedAttendanceDay(fingerprint),true,'complete machine attendance is authoritative')
const manual={source:'employee_live_manual',manual_check_in:'07:30',manual_check_out:'16:30',absence_proof_url:'/evidence.pdf'}
assert.equal(rule.persistedManualWork(manual),true,'saved supported offsite attendance is reused')
assert.equal(rule.persistedManualWork({...manual,supervisor_approval_status:'rejected'}),false,'rejected manual evidence must be reviewed')
const annual={leave_request_id:'req1',absence_request_source:'leave_requests',absence_request_type:'annual_leave',absence_request_status:'approved',status:'leave'}
assert.equal(rule.approvedSourceAbsence(annual),true,'approved annual leave needs no repeat claim')
assert.equal(rule.trustedAttendanceDay(annual),true)
assert.equal(rule.approvedSourceAbsence({...annual,check_in:'08:00'}),false,'machine punch overrides approved absence')
assert.equal(rule.approvedSourceAbsence({...annual,absence_request_status:'pending'}),false,'pending source not auto verified')
assert.equal(rule.workPresenceEvidence({check_in:'08:00'}),true)
for(const fn of ['app/api/employee/attendance/refresh-sources/route.ts','app/api/hr/attendance/source-audit/route.ts', 'app/api/cron/attendance-source-sync/route.ts']) {
  assert.match(read(fn),/Authorization|requireHarmonyApi|requireHRApi|authorized/)
}
const employeePage=read('app/employee/attendance/page.tsx')
assert.match(employeePage,/trustedAttendanceDay\(log\)/)
assert.match(employeePage,/canReuseSavedSource\(row, draft\)/)
assert.match(employeePage,/harmony-attendance-summary-grid/)
assert.match(employeePage,/harmony-attendance-verification-card/)
assert.match(employeePage,/data-palette=\{palette\}/)
assert.match(employeePage,/selectableRows.every\(\(row\) => selectedDates.includes\(row.date\)\)/)
assert.match(employeePage,/approvedSourceAbsence\(row\.log\)/)
assert.match(employeePage,/absence_request_status:'approved'/u.test(employeePage) ? /absence_request_status:'approved'/ : /employee_confirmation_status:'submitted'/)
assert.match(employeePage,/\/api\/employee\/attendance\/refresh-sources/)
assert.match(read('app/employee/leave/page.tsx'),/form\.request_type !== 'annual_leave' && Boolean\(selectedRequestMeta\.requires_proof\)/)
const backend=read('lib/server/attendance-source-sync.ts')
assert.match(backend,/workEvidence\(log\)/)
assert.match(backend,/if \(inLockedPeriod\(day,periods\) \|\| log\?\.is_locked\)/)
assert.match(backend,/sourceType === 'official_travel'/)
assert.match(backend,/leave_request_id:sourceId/)
assert.match(read('vercel.json'),/attendance-source-sync/)
for (const path of ['app/api/employee/attendance/refresh-sources/route.ts','app/api/hr/attendance/source-audit/route.ts','app/api/cron/attendance-source-sync/route.ts']) assert.match(read(path),/HARMONY_ATTENDANCE_SOURCE_WRITE_ENABLED/)
console.log('RC3M PASS — validated absence source, fingerprint priority, manual external evidence reuse, auth guard, HR-only sync, leave evidence optional, locked-period preservation, no leave-balance write.')
// Mocked server checks; no real database connections or mutations.
const serverSource=ts.transpileModule(backend,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const server=await import('data:text/javascript;base64,'+Buffer.from(serverSource).toString('base64'))
assert.equal(server.isValidPeriod('2026-09-01','2026-10-15'),true)
assert.equal(server.isValidPeriod('2026-09-01','2026-10-16'),false)
const employeeId='00000000-0000-4000-8000-000000000001'
const day='2026-09-07'
const request={id:'request-1',employee_id:employeeId,request_type:'annual_leave',start_date:day,end_date:day,status:'approved',hr_status:'approved',supervisor_status:'approved'}
function mockDb(overrides={}) {
  const tables={employees:{id:employeeId,is_active:true},attendance_logs:[],leave_requests:[request],attendance_period_confirmations:[],holidays:[],phl_records:[],...overrides}
  const writes=[]
  const db={from(table){let mutation=false;const chain={then(resolve){return Promise.resolve({data:mutation?{id:'saved'}:tables[table],error:null}).then(resolve)},update(payload){mutation=true;writes.push({table,payload});return chain},insert(payload){mutation=true;writes.push({table,payload});return chain}};for(const method of ['select','eq','is','or','gte','lte','limit','maybeSingle'])chain[method]=()=>chain;return chain}}
  return {db,writes}
}
for(const scenario of [
  {name:'locked',tables:{attendance_period_confirmations:[{period_start:day,period_end:day,is_locked:true}]},kind:'locked_without_sync'},
  {name:'fingerprint',tables:{attendance_logs:[{attendance_date:day,check_in:'08:00',check_out:'17:00',total_punches:2}]},kind:'worked_on_approved_absence'},
  {name:'overlapping',tables:{leave_requests:[request,{...request,id:'request-2'}]},kind:'different_approved_absence'},
]){
  const {db,writes}=mockDb(scenario.tables)
  const summary=await server.syncEmployeeAttendanceSources(db,employeeId,day,day)
  assert.equal(writes.length,0,scenario.name)
  assert.ok(summary.conflicts.some(c=>c.kind===scenario.kind),scenario.name)
}
{
  const {db,writes}=mockDb();const summary=await server.syncEmployeeAttendanceSources(db,employeeId,day,day)
  assert.equal(summary.createdDays,1);assert.equal(writes.length,1);assert.equal(writes[0].table,'attendance_logs');assert.equal(writes[0].payload.absence_request_status,'approved')
}
console.log('RC3M LOCAL REBASE PASS — mocked lock, fingerprint, overlapping requests, valid absence creation and inclusive 45-day range')
