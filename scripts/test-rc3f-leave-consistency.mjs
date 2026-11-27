import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const dashboard = read('app/employee/dashboard/page.tsx')
const leave = read('app/employee/leave/page.tsx')
const remed = read('app/remed/employee/dashboard/page.tsx')
const summary = read('lib/leave-balance-canonical.ts')
const contract = read('lib/employee-leave-balance.ts')
const money = read('lib/harmony-money.ts')
const cron = read('app/api/cron/leave-lifecycle/route.ts')
const server = read('app/api/employee/leave/postpone/route.ts')
const metric = read('components/dashboard/CompactMetric.tsx')

function requireCode(source, tokens, name) {
  for (const token of tokens) assert.ok(source.includes(token), `${name} missing: ${token}`)
}
requireCode(dashboard, ['fetchMyCanonicalLeaveBalance<BalanceSummary>()', 'setBalanceWarning(', 'formatFullRupiah(remedAvailable)', 'fullValue', 'visibilitychange', '60_000', 'debtOutstandingDays', 'debtNextMaturity'], 'Employee dashboard')
requireCode(leave, ['fetchMyCanonicalLeaveBalance<AnnualLeaveSummary>()', 'annualBalanceWarning', "annualLeave === null", "annualLeave ? `${annualRemaining} hari` : '—'", 'visibilitychange', 'annualDebtSummary'], 'Employee Cuti')
requireCode(remed, ['formatFullRupiah(', 'visibilitychange', '60_000'], 'Re-Med dashboard')
requireCode(contract, ["'/api/employee/leave/postpone'", 'payload.success !== true', 'Number.isFinite(days)', 'balance_integrity_warning'], 'Canonical balance contract')
requireCode(summary, ['debt_applied_days', 'numeric(currentCycle.remaining_days) - debtApplied'], 'Debt-aware balance integrity')
requireCode(server, ['harmony_get_my_leave_postpone_context', "'harmony_leave_balance_summary'", "'Cache-Control': 'no-store, max-age=0'"], 'Server balance endpoint')
requireCode(cron, ['HARMONY_LEAVE_CRON_ENABLED', 'CRON_SECRET', 'harmony_reconcile_leave_lifecycle_one', 'Asia/Makassar'], 'Scheduled lifecycle')
requireCode(metric, ['fullValue', 'whitespace-normal break-words'], 'Full currency metric')
assert.doesNotMatch(dashboard, /notation:\s*['"]compact['"]/)
for (const file of ['app/employee/dashboard/page.tsx','app/employee/leave/page.tsx','app/remed/employee/dashboard/page.tsx','lib/leave-balance-canonical.ts','lib/employee-leave-balance.ts','lib/harmony-money.ts','components/dashboard/CompactMetric.tsx']) {
  const text = read(file)
  const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  assert.equal(parsed.parseDiagnostics.length, 0, `${file}: TS parser diagnostics ${parsed.parseDiagnostics.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`)
}

async function importPureTS(text) {
  const result = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`)
}
const { canonicalizeLeaveBalanceSummary } = await importPureTS(summary)
const { formatFullRupiah } = await importPureTS(money)
const cycle = {
  id: 'cycle-1', employee_id: 'employee-1', matured_at: '2026-01-01',
  cycle_end: '2026-12-31', is_active: true,
  total_days: 12, used_days: 0, remaining_days: 12, debt_applied_days: 3,
}
const canonical = canonicalizeLeaveBalanceSummary({
  employee_id: 'employee-1', annual_regular_days: 9,
  postpone_active_days: 0, annual_manual_adjustment_days: 0, annual_total_available_days: 9,
}, [cycle], '2026-11-25')
assert.equal(canonical.balance_integrity_status, 'ok')
assert.equal(canonical.canonical_cycle_regular_days, 9)
assert.equal(canonical.canonical_cycle_formula_days, 9)
assert.equal(canonical.annual_total_available_days, 9)
const mismatch = canonicalizeLeaveBalanceSummary({employee_id:'employee-1',annual_regular_days: 8,postpone_active_days:0,annual_manual_adjustment_days:0,annual_total_available_days:8},[cycle],'2026-11-25')
assert.equal(mismatch.balance_integrity_status,'mismatch')
assert.equal(formatFullRupiah(5000000),'Rp 5.000.000')
assert.equal(formatFullRupiah(1234567.5),'Rp 1.234.567,5')
assert.equal(formatFullRupiah(0),'Rp 0')
assert.equal(formatFullRupiah(null),'—')
console.log('RC3F PASS — shared canonical leave balance, debt-aware integrity, live revalidation, full Rupiah amounts, existing WITA lifecycle cron. No browser-side credits.')
