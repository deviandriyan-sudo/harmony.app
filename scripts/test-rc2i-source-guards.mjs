import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const hr = read('app/hr/leave/page.tsx')
const api = read('app/api/hr/leave/postpone-adjustments/route.ts')
const supervisor = read('app/employee/approvals/leave/page.tsx')
assert.match(hr, /hr_reject_leave_request_atomic_rc2i/)
const reject = hr.split('async function rejectLeaveRequest() {')[1].split('function requestDeleteLeave')[0]
assert.doesNotMatch(reject, /\.from\(['"]leave_requests['"]\)/)
assert.match(reject, /if \(error\) throw error/)
assert.match(api, /await clientFor\(request\)/)
assert.match(api, /readLeaveApprovalDiagnostics/)
assert.match(api, /estimated_after_pending_days/)
assert.match(hr, /Saldo approval legacy|Saldo Approval Legacy/)
assert.match(hr, /bukan saldo final/)
assert.match(supervisor, /if \(isLeaveHRDecisionFinal\(request\)\)/)
console.log('RC2I source guards PASS — reject fail-closed, HR-only diagnostics, no mutation from diagnostics.')
