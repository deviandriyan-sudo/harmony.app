/* HARMONY Stage 3.2 source invariants. No database/network access. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (relative) => fs.readFileSync(path.join(projectRoot, relative), 'utf8')
const typed = [
  'app/api/hr/users/change-email/route.ts',
  'app/api/remed/hr/access/route.ts',
  'app/employee/approvals/leave/page.tsx',
  'app/employee/approvals/leave/postpone/page.tsx',
  'app/hr/attendance/data/page.tsx',
  'app/hr/attendance/upload/page.tsx',
  'app/hr/employees/page.tsx',
  'lib/server/remed-data.ts',
]
for (const filename of typed) {
  assert.doesNotMatch(source(filename), /\bany\b/, `${filename}: explicit any unexpectedly reintroduced`)
}
const effectFiles = [
  'app/auth/callback/page.tsx',
  'app/employee/approvals/[employeeId]/[period]/page.tsx',
  'app/employee/layout.tsx',
  'app/hr/attendance/upload/page.tsx',
  'app/hr/holidays/page.tsx',
  'app/hr/layout.tsx',
  'app/hr/leave/administration/page.tsx',
  'app/hr/users/page.tsx',
  'app/login/page.tsx',
  'app/remed/employee/account/page.tsx',
  'app/remed/employee/claims/page.tsx',
  'app/remed/employee/dashboard/page.tsx',
  'app/remed/hr/employees/page.tsx',
  'app/remed/hr/signatures/page.tsx',
  'app/remed/layout.tsx',
  'app/reset-password/page.tsx',
  'components/attendance/useHRAttendanceReporting.ts',
  'components/layout/Topbar.tsx',
  'components/remed/RemedAdminDashboard.tsx',
  'components/remed/RemedAdminQueue.tsx',
  'components/remed/RemedHistoryWorkspace.tsx',
  'lib/use-attendance-period.ts',
]
for (const filename of effectFiles) {
  assert.match(source(filename), /queueMicrotask\s*\(/, `${filename}: deferred loading/close not found`)
}
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(dir, entry.name)
  return entry.isDirectory() ? walk(absolute) : [absolute]
})
const pages = walk(path.join(projectRoot, 'app')).filter((f) => /[\/]page\.tsx$/.test(f)).length
const routes = walk(path.join(projectRoot, 'app', 'api')).filter((f) => /[\/]route\.ts$/.test(f)).length
assert.equal(pages, 64, 'Page routes changed')
assert.equal(routes, 48, 'API routes changed')
assert.equal(source('lib/server/phl-work.ts').includes('formatDate'), true)
console.log('HARMONY Stage 3.2 source guards PASS: 36 typed any locations, 22 effect sites, 112 routes')
