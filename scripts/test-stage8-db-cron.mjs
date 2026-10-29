import assert from 'node:assert/strict'
import fs from 'node:fs'
const read = (p) => fs.readFileSync(p,'utf8')
const cron = read('app/api/cron/leave-lifecycle/route.ts')
const vercel = JSON.parse(read('vercel.json'))
const jobs = vercel.crons || []
assert.equal(jobs.filter(job => job.path === '/api/cron/leave-lifecycle').length,1)
assert.equal(jobs.find(job => job.path === '/api/cron/leave-lifecycle').schedule,'10 16 * * *')
assert.equal(jobs.filter(job => job.path === '/api/cron/attendance-emails').length,1)
assert.match(cron,/timingSafeEqual/)
assert.match(cron,/secret\.length < 16/)
assert.match(cron,/Asia\/Makassar/)
assert.match(cron,/HARMONY_LEAVE_CRON_ENABLED !== 'true'/)
assert.match(cron,/control\.configured/)
assert.match(cron,/control\.systemEnabled/)
assert.match(cron,/\.select\('id'\)/)
assert.match(cron,/MAX_EMPLOYEES \+ 1/)
assert.match(cron,/harmony_reconcile_leave_lifecycle_one/)
assert.match(cron,/p_reference_date: referenceDate/)
assert.match(cron,/failed === 0 && remaining === 0/)
assert.doesNotMatch(cron, /email|full_name|employee_number|annual_leave_balance|entitlement_days|\.update\(|\.insert\(/i,
 'The cron must not recalculate balances or fetch employee PII')
const diag=read('SQL_ONLY/12_STAGE8_DATABASE_SECURITY_AND_CRON_DIAGNOSTIC_READ_ONLY.sql')
assert.match(diag, /anon_can_execute/)
assert.match(diag, /storage\.buckets/)
const priv=read('SQL_ONLY/13_STAGE8_RESTRICT_INTERNAL_LIFECYCLE_RPC_OPTIONAL.sql')
assert.match(priv, /REVOKE ALL ON FUNCTION/)
assert.match(priv, /TO service_role/)
// WITA boundary sanity: UTC day can differ from Indonesia's business day.
const getWita = (date) => {
 const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(date))
 const g = type => parts.find(p => p.type === type)?.value
 return `${g('year')}-${g('month')}-${g('day')}`
}
assert.equal(getWita('2026-10-28T16:00:00.000Z'),'2026-10-29')
assert.equal(getWita('2026-02-28T16:00:00.000Z'),'2026-03-01')
assert.equal(getWita('2028-02-28T16:00:00.000Z'),'2028-02-29')
console.log('Stage 8 source guard and WITA boundary checks PASS (not a production RPC integration test)')
