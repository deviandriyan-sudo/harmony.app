import assert from 'node:assert/strict'
import fs from 'node:fs'
const read = file => fs.readFileSync(file,'utf8')
const hr = read('app/hr/employees/page.tsx')
const users = read('app/api/hr/users/route.ts')
const correction = read('app/api/hr/leave/balance-correction/route.ts')
const sql = read('SQL_ONLY/05_STAGE5_LEAVE_DIAGNOSTIC_READ_ONLY.sql')
const sqlAuth = read('SQL_ONLY/06_STAGE5_EMPLOYEE_LOGIN_DIAGNOSTIC_READ_ONLY.sql')
const css = read('app/contrast-hardening.css')
const claim = read('components/remed/RemedClaimList.tsx')
assert.match(hr,/setCreateLoginWithEmployee\(true\)/)
assert.match(hr,/initialLoginPassword\.length < 8/)
assert.match(hr,/\.select\('id'\)\.single\(\)/)
assert.match(hr,/await harmonyFetch\('\/api\/hr\/users'/)
assert.match(hr,/akun login BELUM aktif/)
assert.match(hr,/role: 'employee'/)
assert.match(users,/createdAuth/)
assert.match(users,/auth\.admin\.createUser/)
assert.match(users,/AUTH_EXISTS_UNLINKED/)
assert.doesNotMatch(users,/auth\.admin\.updateUserById\(authUser\.id/)
assert.match(correction,/harmony_hr_correct_annual_leave_balance_v1/)
assert.match(correction,/lifecycleMismatch/)
assert.match(correction,/status: unavailable \? 503 : lifecycleMismatch \? 409 : 400/)
for (const text of [sql,sqlAuth]) {
 assert.doesNotMatch(text.replace(/--[^\n]*/g,''),/\b(?:update|insert|delete|alter|drop|create|truncate)\s+\w+\b/i)
}
assert.match(read('app/layout.tsx'),/contrast-hardening\.css/)
for (const cls of ['harmony-remed-impact','harmony-remed-impact-tile','harmony-remed-claim-meta','harmony-remed-claim-card']) {
 assert.ok(css.includes('.'+cls),`Missing CSS ${cls}`)
 assert.ok(claim.includes(cls),`Missing component hook ${cls}`)
}
assert.match(css,/data-harmony-theme='dark'/)
assert.match(css,/data-harmony-theme='light'/)
assert.match(css,/harmony-print-document/)
for (const route of ['app/hr/leave/page.tsx','app/hr/leave/postpone/page.tsx']) {
  assert.match(read(route),/router\.push\('\/hr\/leave\/administration'\)/)
  assert.doesNotMatch(read(route),/window\.location\.href\s*=/)
}
assert.doesNotMatch(read('components/layout/AppSidebar.tsx'),/window\.location\.href\s*=/)
console.log('HARMONY Stage 5 guards PASS: secure employee onboarding, lifecycle correction fail-safe, read-only SQL, contrast semantics')
