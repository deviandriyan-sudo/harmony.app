/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
// Dependency on the project's declared TypeScript devDependency, not a mocked implementation.
const source = fs.readFileSync('lib/leave-balance-canonical.ts','utf8')
const js = ts.transpileModule(source, { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020 } }).outputText
const mod = { exports: {} }
vm.runInNewContext(js, { module: mod,exports:mod.exports,Date,Math,Number,String,Boolean,Object,Array }, { filename:'leave-balance-canonical.compiled.cjs' })
const { canonicalizeLeaveBalanceSummary: summary } = mod.exports
const base = {employee_id:'A',annual_regular_days:0,postpone_active_days:0,annual_manual_adjustment_days:0,annual_total_available_days:0}
const cyc = {id:'cycle-1',employee_id:'A',cycle_start:'2024-02-29',matured_at:'2024-02-29',cycle_end:'2025-02-28',remaining_days:8,total_days:12,used_days:4,is_active:true}
const d1 = summary({...base},[cyc],'2024-02-28')
assert.equal(d1.canonical_cycle_id,null,'future cycle must not be credited')
const d2 = summary({...base,annual_regular_days:8,annual_total_available_days:8},[cyc],'2024-02-29')
assert.equal(d2.canonical_cycle_id,'cycle-1','maturity boundary must be inclusive')
assert.equal(d2.annual_total_available_days,8)
const d3 = summary({...base,annual_regular_days:8,annual_total_available_days:8},[cyc],'2025-02-28')
assert.equal(d3.canonical_cycle_id,'cycle-1','expiry boundary must be inclusive')
const d4 = summary({...base,annual_regular_days:0,annual_total_available_days:0},[cyc],'2025-03-01')
assert.equal(d4.canonical_cycle_id,null,'expired cycle must never revive')
assert.equal(d4.annual_total_available_days,0)
const d5 = summary({...base},[cyc],'2026-01-01')
assert.equal(d5.canonical_cycle_id,null,'missed cycle must not be treated as active')
const d6 = summary({...base, annual_regular_days:2,postpone_active_days:1, annual_manual_adjustment_days:-10,annual_total_available_days:0}, [], '2024-12-31')
assert.equal(d6.annual_total_available_days,0,'summary floor and debt correction must not grant credit')
const d7 = summary({...base,annual_regular_days:3,annual_total_available_days:3},[cyc],'2024-03-01')
assert.equal(d7.annual_total_available_days,3,'UI may not override canonical balance using cycle preview')
assert.equal(d7.balance_integrity_status,'mismatch')
const d8 = summary({...base,annual_regular_days:3,annual_total_available_days:3},[ {...cyc,notes:'[HR_FLEX_POSTPONE]'} ],'2024-03-01')
assert.equal(d8.canonical_cycle_id,null,'flexible postpone cycle must not act as annual leave')
console.log('Stage 7 lifecycle behavior PASS (8 boundary/mismatch scenarios, no database writes)')
