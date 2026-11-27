import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const require = createRequire(import.meta.url)
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const ts = (() => {
  try { return require('typescript') }
  catch { return require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')) }
})()
const compiled = ts.transpileModule(read('lib/server/phl-evidence-preservation.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const fakeModule = { exports: {} }
new Function('require', 'module', 'exports', compiled)(require, fakeModule, fakeModule.exports)
const { phlStoragePathFromPublicUrl, unreferencedAttendanceProofPaths } = fakeModule.exports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'

const example = 'https://example.supabase.co/storage/v1/object/public/leave-attachments/attendance-live-manual/employee/2026-08-15/IMG%20test.jpg'
assert.equal(phlStoragePathFromPublicUrl(example), 'attendance-live-manual/employee/2026-08-15/IMG test.jpg')
assert.equal(phlStoragePathFromPublicUrl(example.replace('example.supabase.co', 'evil.invalid')), null)
assert.equal(phlStoragePathFromPublicUrl('https://example.supabase.co/storage/v1/object/public/other-bucket/x.jpg'), null)
assert.equal(phlStoragePathFromPublicUrl('https://example.supabase.co/storage/v1/object/public/leave-attachments/a/../b.jpg'), 'b.jpg') // URL normalizes segments
assert.equal(phlStoragePathFromPublicUrl('bad'), null)

function mockAdmin(byPath, byLegacy) {
  return { from(table) {
    assert.equal(table, 'phl_work_request_attachments')
    return { select() { return { in(column) {
      return Promise.resolve(column === 'storage_path' ? byPath : byLegacy)
    } } } }
  } }
}
const ok = (data) => ({ data, error: null })
const err = { data: null, error: { message: 'DB inaccessible' } }
const candidate = 'attendance-live-manual/e1/2026-08-15/1.jpg'
const legacyURL = `https://example.supabase.co/storage/v1/object/public/leave-attachments/${candidate}`
assert.deepEqual(await unreferencedAttendanceProofPaths(mockAdmin(ok([]),ok([])),[candidate], [legacyURL]),[candidate])
assert.deepEqual(await unreferencedAttendanceProofPaths(mockAdmin(ok([{ storage_path: candidate }]),ok([])),[candidate], [legacyURL]),[])
assert.deepEqual(await unreferencedAttendanceProofPaths(mockAdmin(ok([]),ok([{ legacy_file_url: legacyURL }])),[candidate], [legacyURL]),[])
assert.deepEqual(await unreferencedAttendanceProofPaths(mockAdmin(err,ok([])),[candidate], [legacyURL]),[])
assert.deepEqual(await unreferencedAttendanceProofPaths(mockAdmin(ok([]),err),[candidate], [legacyURL]),[])

const api = read('app/api/phl/work-requests/route.ts')
assert(api.includes('evidence_id'))
assert(api.includes('getPHLSubordinateIds'))
assert(api.includes('await readCheckedEvidenceBytes(context.admin, bucket, path'))
assert(read('lib/server/private-evidence.ts').includes('await admin.storage.from(bucket).download(path)'))
assert(api.indexOf('if (!isHR && !isOwner && !isSupervisor)') < api.indexOf('await readCheckedEvidenceBytes(context.admin, bucket, path'))
assert(api.indexOf('await verifiedEvidenceOwner(context.admin,bucket,path,owner.employee_id)') < api.indexOf('await readCheckedEvidenceBytes(context.admin, bucket, path'))
const reset = read('app/api/employee/attendance/reset-verification/route.ts')
assert(reset.includes('unreferencedAttendanceProofPaths'))
assert(reset.includes(".eq('attendance_log_id', log.id)"))
for (const file of ['app/hr/phl/page.tsx','app/employee/approvals/phl/page.tsx','app/employee/phl/page.tsx']) {
  assert(read(file).includes('openPHLWorkEvidence(attachment.id)'), file)
}
const attachments = read('app/api/attachments/route.ts')
assert(attachments.includes('unreferencedAttendanceProofPaths'))
console.log('PASS: RC2C evidence paths, 5 preservation scenarios, authorization and 3 UI entrypoints.')
