import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync('lib/server/leave-lifecycle-telemetry.ts', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { recordLeaveLifecycleRun, readLatestLeaveLifecycleRun } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
const run = { reference_date: '2026-11-26', environment: 'test', succeeded: true, processed_count: 49, failed_count: 0, remaining_count: 0, created_cycles: 1, expired_postpone_count: 0, error_codes: {} }
let written
const result = await recordLeaveLifecycleRun({ from(table) { assert.equal(table, 'leave_lifecycle_audit_logs'); return { insert(payload) { written = payload; return Promise.resolve({ error: null }) } } } }, run)
assert.equal(result.error, null)
assert.equal(written.event_type, 'scheduled_lifecycle_run')
assert.equal(written.source_table, 'harmony_scheduler')
assert.match(written.source_id, /^[0-9a-f-]{36}$/)
assert.equal(written.employee_id, undefined)
assert.equal(written.reference_date, run.reference_date)
assert.equal(written.metadata.reference_date, undefined)
const query = (data, error = null) => ({ from(table) { assert.equal(table, 'leave_lifecycle_audit_logs'); const chain = { select() { return this }, eq(col, value) { assert.equal(value, { event_type: 'scheduled_lifecycle_run', source_table: 'harmony_scheduler' }[col]); return this }, is(col, value) { assert.equal(col, 'employee_id'); assert.equal(value, null); return this }, order() { return this }, limit(n) { assert.equal(n, 1); return this }, maybeSingle() { return Promise.resolve({ data, error }) } }; return chain } })
const row = { reference_date: run.reference_date, metadata: written.metadata, created_at: '2026-11-25T16:10:00Z' }
const read = await readLatestLeaveLifecycleRun(query(row))
assert.equal(read.error, null)
assert.equal(read.data.processed_count, 49)
assert.equal(read.data.reference_date, run.reference_date)
assert.equal((await readLatestLeaveLifecycleRun(query(null))).data, null)
assert.equal((await readLatestLeaveLifecycleRun(query({ ...row, metadata: { ...row.metadata, processed_count: -1 } }))).error.code, 'HARMONY_INVALID_RUN_TELEMETRY')
assert.equal((await readLatestLeaveLifecycleRun(query(null, { code: '42501' }))).error.code, '42501')
assert.match(readFileSync('app/api/cron/leave-lifecycle/route.ts', 'utf8'), /recordLeaveLifecycleRun\(supabaseAdmin,/)
console.log('RC3N lifecycle telemetry PASS: existing ledger, no employee identity, strict metadata, read/error contracts.')
