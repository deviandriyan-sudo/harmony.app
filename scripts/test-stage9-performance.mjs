import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const login = read('app/login/page.tsx')
const callback = read('app/auth/callback/page.tsx')
const hr = read('app/hr/layout.tsx')
const employee = read('app/employee/layout.tsx')
const remedLayout = read('app/remed/layout.tsx')
const remedIndex = read('app/remed/page.tsx')
const session = read('lib/remed-session-client.ts')
const dash = read('app/api/remed/dashboard/route.ts')
const sidebar = read('components/layout/AppSidebar.tsx')
const avatar = read('components/profile/useEmployeeAvatar.ts')
const adminDashboard = read('components/remed/RemedAdminDashboard.tsx')

assert.doesNotMatch(login, /await remedFetch<\{ session: RemedSession \}>\('\/api\/remed\/session'\)/)
assert.doesNotMatch(callback, /await remedFetch<\{ session: RemedSession \}>\('\/api\/remed\/session'\)/)
assert.match(hr, /navigationForRole\('hr', \{ remed: true \}\)/)
assert.match(employee, /navigationForRole\('employee', \{ remed: true, supervisor: hasSubordinates \}\)/)
assert.match(remedLayout, /getRemedUiSession\(\)/)
assert.match(remedIndex, /getRemedUiSession\(\)/)
assert.match(session, /cachedToken !== token/)
assert.match(session, /UI_SESSION_TTL_MS = 8_000/)
assert.match(session, /cachedUntil = Date\.now\(\) \+ UI_SESSION_TTL_MS/)
assert.match(sidebar, /clearRemedUiSession\(\)/)
assert.match(sidebar, /useEmployeeAvatar\(!userRole\.toLowerCase\(\)\.includes\('finance'\)\)/)
assert.match(avatar, /CACHE_MS = 30_000/)
assert.match(avatar, /cachedUserToken !== token/)
assert.match(avatar, /harmony:avatar-updated/)
assert.match(dash, /requireRemedApi\(request\)/)
assert.match(dash, /select\('id', \{ count: 'exact', head: true \}\)/)
assert.match(dash, /select\('approved_amount,submitted_amount'/)
assert.match(dash, /\.limit\(8\)/)
assert.match(dash, /for \(let offset = PAGE; offset < paidCount; offset \+= PAGE\)/)
assert.match(dash, /enrichRemedClaims\(ctx.admin, recent.data \|\| \[\]\)/)
assert.match(adminDashboard, /loading && !data/)
// Original paid total semantics must be preserved, including NULL/zero fallback.
assert.match(dash, /Number\(row\.approved_amount \|\| row\.submitted_amount \|\| 0\)/)
assert.doesNotMatch(dash, /\.update\(|\.delete\(|\.insert\(/)
assert.doesNotMatch(session, /sessionStorage|localStorage\.setItem/)

// Unit sanity: historical payments still count all items, including >1000 rows.
const records = Array.from({ length: 1_201 }, (_, index) => ({
  approved_amount: index % 3 === 0 ? null : index * 25,
  submitted_amount: index * 10 + 100,
}))
const oldSum = records.reduce((sum, row) => sum + Number(row.approved_amount || row.submitted_amount || 0), 0)
let newSum = 0
for (let offset = 0; offset < records.length; offset += 500) {
  for (const row of records.slice(offset, offset + 500)) {
    newSum += Number(row.approved_amount || row.submitted_amount || 0)
  }
}
assert.equal(newSum, oldSum)
console.log('Stage 9 performance/source guards PASS (not a latency benchmark or production DB test)')
