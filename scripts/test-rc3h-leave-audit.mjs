import fs from 'node:fs'
import assert from 'node:assert/strict'
const api = fs.readFileSync('app/api/hr/leave/lifecycle-audit/route.ts','utf8')
const page = fs.readFileSync('app/hr/leave/audit/page.tsx','utf8')
assert.match(api, /requireHRApi\(request\)/, 'Audit must require verified HR session')
assert.match(api, /Cache-Control': 'private, no-store'/, 'Audit must not cache PII')
assert.doesNotMatch(api,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/, 'Audit must not write or run mutating RPC')
assert.match(api,/maturity_cycle_count/)
assert.match(api,/legacy_remaining_days/)
assert.match(api,/debt_due_days/)
assert.match(page,/Perlu perhatian/)
assert.match(page,/Saldo kanonis/)
console.log('RC3H PASS — HR-authenticated read-only annual leave audit, WITA scoped maturity/debt review, no DB writes.')
