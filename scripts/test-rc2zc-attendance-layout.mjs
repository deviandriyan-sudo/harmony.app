import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(path, 'utf8')
const attendance = read('app/employee/attendance/page.tsx')
const css = read('app/harmony-rc2z-liquid-glass.css')
const pkg = JSON.parse(read('package.json'))

// The unified workspace must be a real DOM parent, not just an optical CSS facade.
const unified = attendance.indexOf('className="harmony-card harmony-rc2q-attendance-panel harmony-liquid-lit harmony-liquid-surface harmony-attendance-history harmony-attendance-unified overflow-hidden"')
const today = attendance.indexOf('aria-labelledby="harmony-today-attendance-title"')
const historyHeading = attendance.indexOf('className="harmony-attendance-section harmony-attendance-history-section')
const review = attendance.indexOf('className="harmony-attendance-review-toolbar')
assert(unified > 0 && unified < historyHeading && historyHeading < today && today < review,
  'History filters, today status, and review must be ordered inside the single workspace card')
assert.equal((attendance.match(/aria-labelledby="harmony-today-attendance-title"/g) ?? []).length, 1,
  'Today attendance is rendered once')
assert.equal((attendance.match(/harmony-card harmony-rc2q-attendance-panel harmony-liquid-lit harmony-liquid-surface harmony-attendance-history harmony-attendance-unified/g) ?? []).length, 1,
  'Exactly one unified attendance card')
assert.equal((attendance.match(/harmony-rc2q-attendance-panel harmony-liquid-lit harmony-liquid-surface/g) ?? []).length, 2,
  'Preserve two existing optical panel hooks for RC2X source guards')
for (const label of ['Check In', 'Check Out', 'Sumber data', 'Periode Absensi', 'Excel Berwarna', 'CSV Raw', 'Verifikasi Riwayat Absensi']) {
  assert(attendance.includes(label), `Missing operational label: ${label}`)
}
for (const handler of ['openLiveManualAttendance()', 'setTodayMode(\'normal\')', 'setTodayMode(\'manual\')',
  'saveLiveManualAttendance()', 'exportExcel', 'exportCsv', 'toggleSelectAllAttendance', 'handleSubmitPeriod',
  'registerHarmonySubmissionAttachments', 'isFutureUnrecordedCalendarDay']) {
  assert(attendance.includes(handler), `Missing preserved workflow: ${handler}`)
}
for (const selector of [
  '.harmony-attendance-unified', '.harmony-attendance-today-inline', '.harmony-attendance-today-stats',
  '.harmony-attendance-clock-card', '.harmony-attendance-history-heading', '.harmony-attendance-history-toolbar',
  '.harmony-attendance-export-actions', '.harmony-attendance-review-toolbar', '.harmony-attendance-review-actions',
  '@media (max-width: 520px)', 'prefers-reduced-transparency: reduce',
]) {
  assert(css.includes(selector), `Missing responsive scoped layout: ${selector}`)
}
assert(!css.includes('@media print'), 'No RC2ZC changes to print styles')
assert(!css.includes('url(http') && !css.includes('@import'), 'No remote CSS assets')
assert.equal(pkg.scripts['test:rc2zc:attendance'], 'node scripts/test-rc2zc-attendance-layout.mjs')
const file = ts.createSourceFile('page.tsx', attendance, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
assert.equal(file.parseDiagnostics.length, 0,
  `TypeScript JSX parser errors: ${file.parseDiagnostics.map(x => x.messageText).join('; ')}`)
console.log('RC2ZC PASS: unified Attendance DOM, intact handlers, responsive toolbar and print-safe CSS')
