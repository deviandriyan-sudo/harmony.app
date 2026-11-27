import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const path = 'app/employee/leave/page.tsx'
const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
assert.equal(parsed.parseDiagnostics.length, 0, 'Leave page must parse as TSX')
assert.doesNotMatch(source, /import\s*\{\s*harmonyFetch\s*\}\s*from\s*['"]@\/lib\/harmony-client['"]/, 'Remove unused harmonyFetch import')

const parent = source.slice(source.indexOf('export default function EmployeeLeavePage()'), source.indexOf('function LeaveRequestModal('))
const modal = source.slice(source.indexOf('function LeaveRequestModal('), source.indexOf('function HistorySection('))
assert.match(parent, /const\s*\[annualLeave,\s*setAnnualLeave\]/, 'Canonical leave summary remains in page state')
assert.match(parent, /annualLeaveAvailable=\{annualLeave\s*!==\s*null\}/, 'Parent must provide availability of canonical balance')
assert.match(modal, /annualLeaveAvailable\s*,/, 'Modal must destructure availability prop')
assert.match(modal, /annualLeaveAvailable:\s*boolean/, 'Modal availability must be strongly typed')
assert.match(modal, /value=\{annualLeaveAvailable\s*\?\s*`\$\{annualRemaining\} hari`\s*:\s*'—'\}/, 'Modal must not report 0 if balance is unavailable')
assert.doesNotMatch(modal, /\bannualLeave\b/, 'Modal cannot access parent state without an explicit prop')
console.log('RC3F HOTFIX PASS — modal receives typed balance availability, no out-of-scope annualLeave, unused import removed.')
