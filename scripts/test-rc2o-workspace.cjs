/* eslint-disable @typescript-eslint/no-require-imports -- Node behavioral test */
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const source=fs.readFileSync('lib/dashboard-monitoring.ts','utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const moduleStub={exports:{}}
vm.runInNewContext(compiled,{exports:moduleStub.exports,module:moduleStub,Intl,Date},{filename:'dashboard-monitoring.js'})
const x=moduleStub.exports
assert.equal(x.approvalOf({status:'approved',supervisor_status:'approved',hr_status:'pending'}),'pending','Supervisor approval must not mean HR final')
assert.equal(x.approvalOf({status:'pending',supervisor_status:'approved',hr_status:'approved'}),'approved')
assert.equal(x.approvalOf({status:'approved',supervisor_status:'rejected',hr_status:'pending'}),'excluded')
assert.equal(x.approvalOf({status:'cancelled',supervisor_status:'approved',hr_status:'pending'}),'excluded')
for(const [type,category] of [['sick','sakit'],['permit','izin'],['official_travel','tugas_luar'],['annual_leave','cuti']]) assert.equal(x.leaveCategory({request_type:type}),category)
assert.equal(x.validOnDate('2026-11-19','2026-11-22','2026-11-20'),true)
assert.equal(x.validOnDate('2026-11-19','2026-11-19','2026-11-20'),false)
assert.equal(x.validOnDate('','','2026-11-20'),false)
const endpoints=['app/api/hr/dashboard/monitoring/route.ts','app/api/employee/dashboard/approval-summary/route.ts','app/api/remed/finance/summary/route.ts']
for(const endpoint of endpoints) {
 const content=fs.readFileSync(endpoint,'utf8')
 assert.match(content,/export async function GET/)
 assert.doesNotMatch(content,/export async function (?:POST|PATCH|PUT|DELETE)/)
 assert.doesNotMatch(content,/\.\s*(?:insert|update|upsert|delete)\s*\(/)
 assert.match(content,/Cache-Control.*no-store/)
}
assert.match(fs.readFileSync(endpoints[0],'utf8'),/requireHRApi/)
assert.match(fs.readFileSync(endpoints[1],'utf8'),/requireHarmonyApi/)
assert.match(fs.readFileSync(endpoints[1],'utf8'),/getPHLSubordinateIds/)
assert.match(fs.readFileSync(endpoints[2],'utf8'),/ctx\.access\.role !== 'finance'/)
assert.match(fs.readFileSync('app/hr/dashboard/page.tsx','utf8'),/value==='pending'/)
// Later RC3E dashboard intentionally introduced guarded direct approval, retaining detail links and confirmation.
const dashboard=fs.readFileSync('app/employee/dashboard/page.tsx','utf8')
assert.match(dashboard,/item\.canApprove &&/); assert.match(dashboard,/item\.canReject &&/)
assert.match(dashboard,/Konfirmasi Setujui/); assert.match(dashboard,/Konfirmasi Tolak/)
assert.match(dashboard,/approvalModal\.decision === 'approve' && !approvalReviewed/)
assert.match(dashboard,/approvalModal\.decision === 'reject' && approvalNote\.trim\(\)\.length < 3/)
assert.match(dashboard,/Buka halaman detail pengajuan/)
const nav=fs.readFileSync('components/layout/Topbar.tsx','utf8')
assert.doesNotMatch(nav,/<HarmonyThemeToggle compact/)
assert.doesNotMatch(fs.readFileSync('components/layout/AppSidebar.tsx','utf8'),/HarmonyThemeToggle/)
console.log('RC2O dashboard tests PASS: 11 approval/date cases, 3 guarded read-only endpoints, supervisor scope, theme navigation')
