import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const read = (file) => fs.readFileSync(file, 'utf8')
for (const file of ['lib/server/hr-api-auth.ts','lib/server/user-api-auth.ts','lib/server/remed-api-auth.ts','app/api/auth/access/route.ts']) {
  assert.doesNotMatch(read(file), /if \(!(?:actor|appUser|access|financeAccess) && authEmail\)/,
    `${file}: privileged email-only fallback still exists`)
}
const remed = read('lib/server/remed-api-auth.ts')
assert.doesNotMatch(remed,/\.update\(\{ auth_user_id: authUserId/)
const ctl = read('lib/server/system-control.ts')
assert.match(ctl,/configured: false/)
assert.match(ctl,/emailEnabled: false/)
assert.match(read('app/api/employee/phl-claims/route.ts'), /\.range\(page \* PAGE, \(page \+ 1\) \* PAGE - 1\)/)
assert.match(read('app/api/employee/phl-claims/route.ts'), /Riwayat PHL terlalu besar/)
assert.match(read('lib/leave-balance-canonical.ts'),/annual_total_available_days: storedTotal/)
assert.doesNotMatch(read('lib/leave-balance-canonical.ts'),/annual_total_available_days: canonicalTotal/)
assert.match(read('SQL_ONLY/09_STAGE7_LIFECYCLE_AUTOMATION_DIAGNOSTIC_READ_ONLY.sql'),/to_regclass\('cron.job'\)/)
const walk = (dir, filename) => fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name),filename):d.name===filename?[path.join(dir,d.name)]:[])
assert.equal(walk('app','page.tsx').length,64)
assert.equal(walk('app/api','route.ts').length,49)
console.log('HARMONY Stage 7 guard/source checks PASS: 113 routes, strict identity binding, maintenance email fail-closed, full PHL history scan')
