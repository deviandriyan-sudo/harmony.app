import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const targets = [
  'app/employee/approvals/attendance/page.tsx',
  'app/employee/approvals/page.tsx',
  'app/employee/attendance/page.tsx',
  'app/employee/leave/page.tsx',
  'app/employee/settings/page.tsx',
  'app/hr/attendance/approvals/[employeeId]/[period]/page.tsx',
  'app/hr/attendance/audit/page.tsx',
  'app/hr/attendance/upload/page.tsx',
  'app/hr/employees/page.tsx',
  'app/hr/leave/administration/page.tsx',
  'app/hr/leave/page.tsx',
  'app/hr/settings/notifications/page.tsx',
  'app/hr/settings/page.tsx',
  'app/remed/hr/employees/page.tsx',
  'components/layout/Topbar.tsx',
]
let effectEvents = 0
for (const relative of targets) {
  const text = read(relative)
  assert.match(text, /import\s*\{[^}]*useEffectEvent[^}]*\}\s*from\s*['"]react['"]/, `${relative}: React 19 effect event import absent`)
  const occurrences = text.match(/\buseEffectEvent\s*\(/g) || []
  effectEvents += occurrences.length
  assert.ok(occurrences.length > 0, `${relative}: expected an Effect Event`)
  assert.doesNotMatch(text, /import\s*\{[^}]*useEffectEvent[^}]*\}\s*from\s*['"]@\/lib\/error-utils['"]/, `${relative}: effect event imported from wrong module`)
}
assert.equal(effectEvents, 17, 'The original 17 effect-specific warning sites should be covered')
assert.doesNotMatch(read('app/employee/attendance/page.tsx'), /\}, \[calendarRows, rowDrafts\]\);\s*\n\s*const presentCount/, 'The old summaryBuckets memo is still active')
assert.doesNotMatch(read('app/employee/approvals/page.tsx'), /type SummaryTone\s*=/)
assert.doesNotMatch(read('app/employee/attendance/page.tsx'), /function formatPeriodStatus\s*\(/)
assert.doesNotMatch(read('app/employee/leave/page.tsx'), /function isPendingStatus\s*\(/)
const pages = []
const apis = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (/^page\.tsx?$/.test(entry.name) && !p.includes(`${path.sep}api${path.sep}`)) pages.push(p)
    else if (/^route\.tsx?$/.test(entry.name) && p.includes(`${path.sep}api${path.sep}`)) apis.push(p)
  }
}
walk(path.join(root, 'app'))
assert.equal(pages.length, 64)
assert.equal(apis.length, 48)
console.log(`HARMONY Stage 3.4 hook guards PASS: ${effectEvents} effect callbacks, 3 unused declarations removed, pure attendance summary, 112 routes`)
