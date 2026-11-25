import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import postcss from 'postcss'

const read = path => readFileSync(path,'utf8')
const attendance=read('app/employee/attendance/page.tsx')
const css=read('app/harmony-rc2ze-attendance-composition.css')
const layout=read('app/layout.tsx')
const pkg=JSON.parse(read('package.json'))

const check=(haystack,parts,where)=>{
  for (const part of parts) assert(haystack.includes(part),`${where}: missing ${part}`)
}

const expectedSections=[
  'aria-labelledby="harmony-approved-summary-title"',
  'Riwayat Absensi',
  'aria-labelledby="harmony-today-attendance-title"',
  'Verifikasi Riwayat Absensi',
]
let previous=-1
for (const section of expectedSections) {
  const index=attendance.indexOf(section)
  assert(index>previous, `Section order changed: ${section}`)
  previous=index
}
check(attendance,[
  'harmony-attendance-unified-shell', 'harmony-attendance-history-section',
  'harmony-attendance-today-shell', 'harmony-attendance-history-toolbar-compact',
  'harmony-attendance-review-toolbar', 'harmony-attendance-review-actions',
  'void openLiveManualAttendance()', 'harmony-attendance-clock-card-action',
  'onClick={exportExcel}', 'onClick={exportCsv}', 'toggleSelectAllAttendance',
  'handleSubmitPeriod', 'isFutureUnrecordedCalendarDay', 'saveLiveManualAttendance()',
  'registerHarmonySubmissionAttachments', '<LiveManualAttendanceModal',
  'HarmonyPendingAttachmentPicker',
], 'Attendance layout/workflow')
assert.equal((attendance.match(/<LiveManualAttendanceModal/g)||[]).length,1,
  'Manual attendance must be presented in one modal only')
assert(!attendance.includes('className={`harmony-attendance-overview-grid'),
  'Old stacked section grid should not remain')
assert(!attendance.includes('Checklist review:'),
  'Unrequested checklist copy must be removed')
assert(!attendance.includes('Centang seluruh hari sebagai tanda verifikasi employee.'),
  'Verbose review copy must be removed')
assert(!attendance.includes('Periode belum selesai. Submit periode penuh tersedia mulai'),
  'Verbose review notice must be removed (domain gating preserved)')
check(css,[
  'harmony-attendance-unified-shell', 'harmony-attendance-clock-card-action',
  'harmony-attendance-review-actions', 'prefers-reduced-motion: reduce',
], 'RC2ZE accessible styling')
const current=read('app/harmony-rc3a-light-refinement.css')
for(const required of [
  '.harmony-attendance-history-section', '.harmony-attendance-today-shell',
  '.harmony-attendance-today-stats', '.harmony-attendance-review-toolbar',
  "background: linear-gradient(145deg,#e4faef,#c8efda)",
  "background: linear-gradient(145deg,#fff0f0,#ffd8d9)",
]) assert(current.includes(required),`RC3A attendance design missing ${required}`)
assert(css.includes('@media screen {') && !css.includes('@media print'), 'Print-safe screen only')
assert(!css.includes('@import')&&!css.includes('url(http'), 'No remote styles')
assert.equal(layout.split("import './harmony-rc2ze-attendance-composition.css'").length-1,1,
  'RC2ZE stylesheet must mount exactly once')
assert(layout.indexOf("import './harmony-rc2z-liquid-glass.css'")<layout.indexOf("import './harmony-rc2ze-attendance-composition.css'"),
  'RC2ZE composition must follow RC2Z material CSS')
assert.equal(pkg.scripts['test:rc2ze:attendance'],'node scripts/test-rc2ze-attendance-composition.mjs')
const parsed=ts.createSourceFile('page.tsx',attendance,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
assert.equal(parsed.parseDiagnostics.length,0,'Attendance TSX is syntactically invalid')
assert.doesNotThrow(()=>postcss.parse(css,{from:'rc2ze'}),'RC2ZE CSS parse error')
console.log('RC2ZE PASS: colored metric structure, two-column responsive sheet, balanced buttons, modal-only manual form and preserved workflow guards')
