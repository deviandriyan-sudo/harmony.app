import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = (path) => readFileSync(path, 'utf8')
// Execute the real policy function rather than only checking a source string.
const policy = read('lib/phl-assignment-policy.ts')
const compiled = ts.transpileModule(policy, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
const context = { exports: {} }
vm.runInNewContext(compiled.outputText, context)
const isEffective = context.exports.assignmentIsEffective
assert.equal(typeof isEffective, 'function')
const date = '2026-11-05'
assert.equal(isEffective({ is_primary: true, is_active: true, start_date: '2024-01-01' }, date), true, 'Primary assignment was incorrectly dropped')
assert.equal(isEffective({ is_primary: false, is_active: true, start_date: '2024-01-01' }, date), true)
assert.equal(isEffective({ is_primary: true, is_active: false }, date), false)
assert.equal(isEffective({ start_date: '2026-11-06' }, date), false)
assert.equal(isEffective({ end_date: '2026-11-04' }, date), false)
assert.equal(isEffective({ start_date: '2026-11-05', end_date: '2026-11-05' }, date), true)

const phl = read('lib/server/phl-work.ts')
assert.match(phl, /import \{ assignmentIsEffective \} from '@\/lib\/phl-assignment-policy'/)
assert.match(phl, /phl-work:submitted:\$\{requestRow\.id\}/)
assert.match(phl, /phl-work:cancelled:\$\{requestRow\.id\}/)
assert.match(phl, /phl-work:\$\{approved \? 'approved' : 'rejected'\}:\$\{requestRow\.id\}/)

const picker = read('components/scaleup/ScaleupWorkspace.tsx')
assert.match(picker, /useRef<HTMLDivElement>\(null\)/)
assert.match(picker, /document\.addEventListener\('pointerdown',closeOnOutsidePointer\)/)
assert.match(picker, /document\.addEventListener\('focusin',closeOnOutsideFocus\)/)
assert.match(picker, /document\.addEventListener\('keydown',closeOnEscape\)/)
assert.match(picker, /pickerRef\.current\?\.contains\(event\.target\)/)
assert.match(picker, /role="combobox"/)
assert.match(picker, /hasMore&&<button/)
const topbar = read('components/layout/Topbar.tsx')
assert.match(topbar, /navigationSearchEntries\(menuRole\)/)
assert.match(topbar, /onChange=\{\(event\) => \{ setMenuQuery/)
assert.match(topbar, /router\.push\(href\)/)
assert.doesNotMatch(topbar, /placeholder="Cari nama, NIP, unit kerja, atau menu/)
assert.match(read('lib/navigation.ts'), /export function navigationSearchEntries\(/)

console.log('HARMONY V3.9.2 refinement checks PASS: 6 executed PHL assignment cases; picker/search/idempotency guards (static only).')
