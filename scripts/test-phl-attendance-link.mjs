import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync('lib/phl-attendance-link-policy.ts', 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.equal(compiled.diagnostics?.length || 0, 0)
const context = { exports: {} }
vm.runInNewContext(compiled.outputText, context)
const issue = context.exports.phlAttendanceLinkIssue
assert.equal(typeof issue, 'function')
const request = {
  id: '11111111-1111-4111-8111-111111111111',
  employee_id: '22222222-2222-4222-8222-222222222222',
  employee_number: '0012', work_date: '2026-11-05',
}
const row = {
  employee_id: request.employee_id, employee_number: 'stale-number',
  attendance_date: request.work_date, deleted_at: null, phl_work_request_id: null,
}
assert.equal(issue(row, request), null, 'Matching UUID overrides stale legacy number')
assert.equal(issue({ ...row, employee_id: '33333333-3333-4333-8333-333333333333', employee_number: request.employee_number }, request), 'employee_uuid_mismatch')
assert.equal(issue({ ...row, employee_id: null, employee_number: request.employee_number }, request), null, 'Legacy number can establish ownership')
assert.equal(issue({ ...row, employee_id: null, employee_number: '12' }, request), 'employee_identity_unverified', 'Leading zeroes matter')
assert.equal(issue({ ...row, employee_id: null, employee_number: null }, request), 'employee_identity_unverified', 'PIN alone is unsafe')
assert.equal(issue({ ...row, attendance_date: '2026-11-04' }, request), 'date_mismatch')
assert.equal(issue({ ...row, deleted_at: '2026-11-05T00:00:00Z' }, request), 'deleted_attendance')
assert.equal(issue({ ...row, phl_work_request_id: '33333333-3333-4333-8333-333333333333' }, request), 'other_phl_request')
assert.equal(issue({ ...row, phl_work_request_id: request.id }, request), null)
assert.equal(issue(row, { ...request, employee_id: 'bad-id' }), 'invalid_request_employee_id')

const review = readFileSync('app/api/phl/work-requests/[id]/review/route.ts', 'utf8')
assert.match(review, /phlAttendanceLinkIssue\(byId\.data, target\)/)
assert.match(review, /candidates\.find\(\(row\) => phlAttendanceLinkIssue\(row, target\) === null\)/)
assert.match(review, /\.eq\('attendance_date', target\.work_date\)/)
assert.match(review, /updateQuery\.is\('phl_work_request_id', null\)/)
assert.match(review, /approvalCommitted = true/)
console.log('PASS: 10 executed identity/date/link/deleted tests + route guard checks (DB race not E2E verified)')
