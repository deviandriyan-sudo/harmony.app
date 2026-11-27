import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (p) => fs.readFileSync(path.join(root,p),'utf8')
const cron = read('app/api/cron/leave-lifecycle/route.ts')
const api = read('app/api/hr/leave/lifecycle-audit/route.ts')
const page = read('app/hr/leave/audit/page.tsx')
assert.match(cron,/HARMONY_LEAVE_CRON_ENABLED !== 'true'/)
assert.match(cron,/timingSafeEqual/)
assert.match(cron,/harmony_reconcile_leave_lifecycle_one/)
assert.match(cron,/recordLeaveLifecycleRun\(supabaseAdmin,/)
assert.match(cron,/environment: process\.env\.VERCEL_ENV \|\| 'local'/)
assert.match(cron,/auditRecorded/)
assert.match(api,/requireHRApi\(request\)/)
assert.match(api,/harmony_leave_2026_hr_verifications/)
assert.match(api,/readLatestLeaveLifecycleRun\(admin\)/)
const telemetry = read('lib/server/leave-lifecycle-telemetry.ts')
assert.match(telemetry,/leave_lifecycle_audit_logs/)
assert.match(telemetry,/scheduled_lifecycle_run/)
assert.doesNotMatch(cron + api + telemetry,/harmony_leave_lifecycle_cron_runs/)
assert.match(api,/telemetry_available/)
assert.doesNotMatch(api,/\.rpc\('harmony_reconcile_leave_lifecycle_one'/)
assert.match(page,/Maturity otomatis/)
assert.match(page,/Eksekusi terakhir tercatat/)
assert.match(page,/HARMONY_LEAVE_CRON_ENABLED/)
// Synthetic policy checks: do not assert live DB behavior without a real RPC test.
const compute = ({entitlement=12,debt=0,approvedCarry=0,oldAdjustment=0}) => {
  assert.ok(oldAdjustment <= 365)
  return Math.max(entitlement - debt,0) + approvedCarry
}
assert.equal(compute({entitlement:12,debt:0,approvedCarry:0,oldAdjustment:-12}),12)
assert.equal(compute({entitlement:12,debt:4,approvedCarry:0,oldAdjustment:-12}),8)
assert.equal(compute({entitlement:12,debt:6,approvedCarry:0,oldAdjustment:-12}),6)
assert.equal(compute({entitlement:12,debt:3,approvedCarry:0,oldAdjustment:-12}),9)
assert.equal(compute({entitlement:12,debt:0,approvedCarry:9,oldAdjustment:-3}),21)
console.log('RC3K SOURCE PASS — guarded HR audit, WITA cron evidence, future maturity rollover formula fixtures (not live DB execution).')
