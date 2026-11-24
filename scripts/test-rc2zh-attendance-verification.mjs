import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import postcss from 'postcss'

const read = file => readFileSync(file, 'utf8')
const page = read('app/employee/attendance/page.tsx')
const css = read('app/harmony-rc2zh-attendance-verification.css')
const layout = read('app/layout.tsx')
const pkg = JSON.parse(read('package.json'))
const ordered = [
  'className="harmony-attendance-unified-shell"',
  'className="harmony-attendance-section harmony-attendance-history-section',
  'aria-labelledby="harmony-today-attendance-title"',
  '</div>\n\n          <section aria-labelledby="harmony-attendance-verification-title"',
  'className="harmony-attendance-review-toolbar"',
  'id="harmony-attendance-verification-title"',
  'className="harmony-attendance-review-actions"',
]
let last = -1
for (const marker of ordered) {
  const next = page.indexOf(marker, last + 1)
  assert(next > last, `Attendance layout order: missing/misordered ${marker}`)
  last = next
}
assert.equal((page.match(/className="harmony-attendance-verification-card"/g) ?? []).length, 1,
  'Verification must have exactly one independent card')
assert.equal((page.match(/harmony-attendance-today-shell/g) ?? []).length, 1,
  'Today attendance must remain one section')
assert(page.indexOf('</table>', last) > last, 'Verification card must retain the records table')
assert(page.indexOf('          </section>\n        </div>', page.indexOf('</table>', last)) > last,
  'Verification card must wrap its table and close before modal portals')
for (const term of [
  'toggleSelectAllAttendance', 'handleSubmitPeriod', 'allRowsSelected',
  '!isPeriodComplete', 'isReadOnlyPeriod', 'submittingPeriod',
  'exportExcel', 'exportCsv', 'openLiveManualAttendance()', 'saveLiveManualAttendance()',
  '<LiveManualAttendanceModal', '<EditAttendanceModal',
  'registerHarmonySubmissionAttachments', 'isFutureUnrecordedCalendarDay',
]) assert(page.includes(term), `Existing business guard missing: ${term}`)
const baseImport = "import './harmony-rc2ze-attendance-composition.css'"
const newImport = "import './harmony-rc2zh-attendance-verification.css'"
assert.equal(layout.split(newImport).length - 1, 1, 'RC2ZH stylesheet must import once')
assert(layout.indexOf(baseImport) < layout.indexOf(newImport), 'RC2ZH must load after RC2ZE')
assert.equal(pkg.scripts['test:rc2zh:attendance'], 'node scripts/test-rc2zh-attendance-verification.mjs')
for (const token of [
  '.harmony-attendance-verification-card',
  'align-items: center !important',
  'min-height: 76px !important',
  'height: 44px !important',
  '@container attendance-sheet (min-width: 1120px)',
  'prefers-reduced-transparency: reduce',
]) assert(css.includes(token), `Verification CSS missing: ${token}`)
assert(!css.includes('@media print') && !css.includes('@import') && !css.includes('url(http'), 'No print override or remote CSS')
assert.doesNotThrow(() => postcss.parse(css, { from: 'RC2ZH' }), 'CSS syntax must parse')
const parsed = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
assert.equal(parsed.parseDiagnostics.length, 0, 'TSX must parse')
console.log('RC2ZH PASS: separate attendance cards, compact verification header, unchanged handlers and accessibility')
