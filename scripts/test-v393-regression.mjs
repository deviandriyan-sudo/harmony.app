import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = (path) => readFileSync(path, 'utf8')

const idSource = read('lib/phl-identity-conflict.ts')
const transpiled = ts.transpileModule(idSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleObj = { exports: {} }
vm.runInNewContext(transpiled, { module: moduleObj, exports: moduleObj.exports })
const conflict = moduleObj.exports.hasPHLIdentityConflict
assert.equal(typeof conflict, 'function')
const e = { id: '00111111-1111-4111-8111-111111111111', employee_number: '01234' }
assert.equal(conflict({ employee_id: e.id, employee_number: '99999' }, e), false, 'UUID takes priority')
assert.equal(conflict({ employee_id: '00222222-2222-4222-8222-222222222222' }, e), true, 'Cross-employee UUID must be blocked')
assert.equal(conflict({ employee_number: '01234' }, e), false)
assert.equal(conflict({ employee_number: '1234' }, e), true, 'Leading zeroes on NIK remain meaningful')
assert.equal(conflict({ employee_id: null, employee_number: null }, e), false, 'Legacy row without IDs is unresolved')
assert.equal(conflict({ employee_id: e.id }, e), false)

const phlRequest = read('app/api/phl/work-requests/route.ts')
assert.match(phlRequest, /hasPHLIdentityConflict\(row, employee\)/)
const phlReview = read('app/api/phl/work-requests/[id]/review/route.ts')
assert.match(phlReview, /let approvalCommitted = false/)
assert.match(phlReview, /approvalCommitted = true/)
assert.match(phlReview, /if \(!approvalCommitted && attendanceSnapshot\)/)
assert.ok(phlReview.indexOf('approvalCommitted = true') < phlReview.indexOf('if (reviewedError || !reviewed)'))
assert.match(phlReview, /needs_refresh: true/)

const css = read('app/globals.css')
assert.doesNotMatch(css, /\n\s*body \*\{visibility:hidden!important\}/)
assert.match(css, /body:has\(#scaleup-print-sheet\) \*\{visibility:hidden!important\}/)
assert.match(css, /body:has\(\.harmony-print-document\) \.harmony-module-subnav/)
assert.match(css, /\.harmony-print-document \*\{visibility:visible !important;\}/)
const remed = read('app/api/remed/claims/[id]/route.ts')
assert.match(remed, /signature_warning: signatureWarning/)
assert.match(read('lib/server/remed-signatures.ts'), /data\?\.length === 1/)
assert.match(read('components/remed/PaymentRequestPrint.tsx'), /signatureWarning/)

for (const role of ['employee','hr','remed']) {
  assert.ok(existsSync(`app/${role}/loading.tsx`), `${role} route loading fallback missing`)
  assert.match(read(`app/${role}/loading.tsx`), /RouteLoading/)
}
assert.match(read('components/layout/RouteLoading.tsx'), /aria-busy="true"/)
console.log('HARMONY V3.9.3 RC1 regression PASS: 6 executed PHL identity cases, scoped print, safe post-commit handling, Re-Med fallback, shared loaders (source guards; NOT live integration).')
