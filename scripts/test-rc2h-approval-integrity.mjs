import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// The installed Next.js source does NOT include SQL migration files.
// They remain outside 01_APP_SOURCE in the extracted full-replacement package.
const appRoot = fileURLToPath(new URL('../', import.meta.url))
const frontend = readFileSync(path.join(appRoot, 'app/employee/approvals/leave/page.tsx'), 'utf8')

assert.match(frontend, /function isLeaveHRDecisionFinal\(/)
assert.match(frontend, /if \(isLeaveHRDecisionFinal\(request\)\) \{/)
assert.match(frontend, /!isLeaveHRDecisionFinal\(request\)/)
console.log('PASS: RC2H frontend approval guards (static source checks).')

const args = process.argv.slice(2)
let packageRoot = null
let requireSql = false
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--package-root') {
    if (!args[i + 1]) throw new Error('--package-root requires a directory')
    packageRoot = path.resolve(args[++i])
  } else if (args[i] === '--require-sql') {
    requireSql = true
  } else {
    throw new Error(`Unknown argument: ${args[i]}`)
  }
}
// When launched from the extracted ZIP, sibling SQL is available.
// When launched from D:\WEBSITE\harmony.app, do not assume D:\WEBSITE\02_DATABASE_SQL exists.
const root = packageRoot ?? path.resolve(appRoot, '..')
const sqlDir = path.join(root, '02_DATABASE_SQL', '01_NEW_MIGRATIONS_APPLY_IN_ORDER')
const migrationPath = path.join(sqlDir, '01_RC2H_APPROVAL_RPC_MINIMAL_REVIEW_BEFORE_APPLY.sql')
const rollbackPath = path.join(sqlDir, '99_RC2H_ROLLBACK_FUNCTIONS_MANUAL_REVIEW.sql')

if (!existsSync(migrationPath) || !existsSync(rollbackPath)) {
  if (requireSql || packageRoot !== null) {
    throw new Error(`RC2H SQL artifact not found in extracted package: ${sqlDir}. No DB change attempted.`)
  }
  console.log('NOT RUN: RC2H SQL artifact guards (SQL kept outside installed source).')
  console.log('To verify extracted SQL: npm run test:rc2h:sql -- --package-root "<extracted ZIP folder>"')
} else {
  const sql = readFileSync(migrationPath, 'utf8')
  const rollback = readFileSync(rollbackPath, 'utf8')
  assert.match(sql, /auth\.uid\(\) is null or v_actor_employee_id is null/i)
  assert.match(sql, /for update;/i)
  assert.match(sql, /v_actor_identifiers/i)
  assert.match(sql, /Pengajuan sudah final\/ditolak/i)
  assert.match(sql, /if lower\(coalesce\(v_request\.hr_status, ''\)\) = 'approved' then/i)
  assert.doesNotMatch(sql, /or lower\(coalesce\(v_request\.status, ''\)\) = 'approved' then/i)
  assert.match(sql, /Debit cuti tahap atasan tidak ditemukan/i)
  assert.match(sql, /v_balance_field := null;/i)
  assert.match(sql, /SET LOCAL lock_timeout = '5s'/)
  assert.match(sql, /RC2H BLOCKED: supervisor RPC differs/i)
  assert.match(sql, /COMMIT;/)
  assert.match(rollback, /CREATE OR REPLACE FUNCTION public\.approve_leave_request_by_supervisor/i)
  assert.match(rollback, /CREATE OR REPLACE FUNCTION public\.hr_approve_leave_request_atomic/i)
  assert.doesNotMatch(sql, /\b(TRUNCATE|DROP TABLE|DELETE FROM public\.|UPDATE public\.leave_requests SET)\b/i)
  console.log('PASS: RC2H SQL artifact and rollback static guards (SQL NOT executed; DB integration NOT RUN).')
}
