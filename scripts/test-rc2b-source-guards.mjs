import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function loadTs(file, mocks = {}) {
  const content = readFileSync(file, 'utf8')
  const compiled = ts.transpileModule(content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  })
  assert.equal(compiled.diagnostics?.length || 0, 0, `${file} syntax`)
  const exports = {}
  const context = {
    exports,
    require: (name) => {
      if (!(name in mocks)) throw new Error(`Unmocked module: ${name}`)
      return mocks[name]
    },
    crypto: { randomUUID: () => '77777777-7777-4777-8777-777777777777' },
    Date, Number, String, Object, Error, Set, Math, Promise, console,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" } },
  }
  vm.runInNewContext(compiled.outputText, context, { filename: file })
  return exports
}

const guard = loadTs('lib/phl-claim-identity.ts').phlClaimIdentityAssessment
const self = { id: '22222222-2222-4222-8222-222222222222', employee_number: '0012' }
assert.equal(guard({ employee_id: self.id, employee_number: 'old' }, self), 'match')
assert.equal(guard({ employee_id: '33333333-3333-4333-8333-333333333333', employee_number: '0012' }, self), 'different_employee')
assert.equal(guard({ employee_id: null, employee_number: '0012' }, self), 'match')
assert.equal(guard({ employee_id: null, employee_number: '12' }, self), 'different_employee')
assert.equal(guard({ employee_id: null, employee_number: '' }, self), 'unverified_legacy')

const NextResponse = {
  json: (body, options = {}) => ({ body, status: options.status || 200 }),
}
let ctx, rpcPayload, lookedUpId, claimRows, lookupData
const scoped = { rpc: async (name, payload) => {
  if (name === 'get_my_phl_balance_summary') return { data: { success: true, total_available_days: 3 }, error: null }
  assert.equal(name, 'harmony_employee_submit_phl_claim_v1')
  rpcPayload = payload
  return { data: { success: true, claim_record_id: 'claim-id' }, error: null }
} }
function query(model) {
  const q = {
    eq(name, value) { if (model === 'employees' && name === 'id') lookedUpId = value; return q },
    order() { return q },
    range() { return Promise.resolve({ data: claimRows, error: null }) },
    maybeSingle() { return Promise.resolve({ data: lookupData, error: null }) },
    select() { return q },
  }
  return q
}
ctx = {
  employee: { ...self, machine_pin: 'PIN-5' },
  admin: { from: (name) => query(name) },
}
const route = loadTs('app/api/employee/phl-claims/route.ts', {
  '@supabase/supabase-js': { createClient: () => scoped },
  'next/server': { NextResponse },
  '@/lib/server/user-api-auth': {
    requireHarmonyApi: async () => ctx,
    harmonyApiError: (e, fallback) => ({ message: e?.message || fallback, status: e?.status || 500 }),
  },
  '@/lib/phl-claim-identity': { phlClaimIdentityAssessment: guard },
})
const UUID = '33333333-3333-4333-8333-333333333333'
let payload = {
  request_key: '77777777-7777-4777-8777-777777777777',
  claim_date: '2026-11-06', days: 1, reason: 'PHL', job_pending: 'Handover task',
  handover_to_full_name: 'Wrong Label', handover_to_employee_id: UUID,
}
function req(p = payload) {
  return { headers: { get: () => 'Bearer fake-user-token' }, json: async () => p }
}
lookupData = { id: UUID, employee_number: '333', full_name: 'Verified Employee', department: 'HR', position: 'Officer', is_active: true }
claimRows = [{ id: 'other-claim', phl_date: '2026-11-06', employee_id: UUID, employee_number: self.employee_number, status: 'approved' }]
let result = await route.POST(req())
assert.equal(result.status, 200, 'Different employee with recycled PIN must not block claim')
assert.equal(lookedUpId, UUID)
assert.equal(rpcPayload.p_handover_to_full_name, 'Verified Employee', 'Canonical handover name wins')
assert.equal(rpcPayload.p_handover_to_employee_number, '333')

claimRows = [{ id: 'legacy-unverified', phl_date: '2026-11-06', employee_id: null, employee_number: null, status: 'pending' }]
result = await route.POST(req())
assert.equal(result.status, 409, 'Legacy unverified active same-date claim fails closed')
assert.ok(!JSON.stringify(result.body).includes('legacy-unverified'), 'Do not reveal another claim ID')

claimRows = []
result = await route.POST(req({ ...payload, claim_date: '2026-02-30' }))
assert.equal(result.status, 400, 'Reject invalid calendar dates before RPC')
result = await route.POST(req({ ...payload, handover_to_employee_id: self.id }))
assert.equal(result.status, 400, 'Cannot assign handover to self')
lookupData = { ...lookupData, is_active: false }
result = await route.POST(req())
assert.equal(result.status, 409, 'Inactive handover employee refused')
lookupData = { ...lookupData, is_active: true }
result = await route.POST(req({ ...payload, request_key: 'invalid-key' }))
assert.equal(result.status, 400, 'Malformed request keys rejected')

const userError = loadTs('lib/server/user-api-auth.ts', {
  '@supabase/supabase-js': { createClient: () => {} },
  '@/lib/server/system-control': { assertHarmonySystemAvailable: () => {} },
}).harmonyApiError
const hrError = loadTs('lib/server/hr-api-auth.ts', { '@supabase/supabase-js': { createClient: () => {} } }).apiError
assert.equal(userError({ message: 'internal db private', status: 500 }, 'Generic fallback').message, 'Generic fallback')
assert.equal(hrError({ message: 'SQL connection secret', status: 500 }, 'Safe message').message, 'Safe message')
assert.equal(userError({ message: 'Already processed', status: 409 }).message, 'Already processed')
assert.equal(hrError({ message: 'Denied', status: 403 }).status, 403)

const leave = readFileSync('app/employee/leave/page.tsx', 'utf8')
const catchBlock = leave.match(/catch \(claimError: unknown\) \{([\s\S]*?)\n      \}/)?.[1] || ''
assert.ok(catchBlock.includes('Lampiran tetap disimpan'))
assert.ok(!catchBlock.includes('cleanupUploadedProof'), 'Do not erase PHL evidence after uncertain response')
const cron = readFileSync('app/api/cron/leave-lifecycle/route.ts', 'utf8')
assert.ok(cron.includes('{ status: ok ? 200 : 503,'), 'Incomplete lifecycle cron must report non-2xx')
const claimSource = readFileSync('app/api/employee/phl-claims/route.ts', 'utf8')
assert.ok(!claimSource.includes('Jalankan SQL_ONLY migration'))
console.log('RC2B PASS: 5 identity checks, 6 API cases, canonical handover, 4 error guards, attachment safety and cron status')
