import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const routes = [
  'app/api/attachments/route.ts',
  'app/api/employee/attendance/manual-entry/route.ts',
  'app/api/employee/attendance/reset-verification/route.ts',
]
for (const file of routes) {
  const code = readFileSync(file, 'utf8')
  assert.match(code, /\.eq\(["']id["'], authData\.user\.id\)/, `${file} needs UUID binding`)
  assert.doesNotMatch(code, /byEmail\s*=/, `${file} must not self-bind role by email`)
  assert.doesNotMatch(code, /mayUseEmailFallback|const emailMatches\s*=/, `${file} must not grant ownership by email`)
}
assert.match(readFileSync(routes[1], 'utf8'), /clean\(appUser\.employee_id\) !== requestedEmployeeId/)
assert.match(readFileSync(routes[2], 'utf8'), /clean\(appUser\.employee_id\) !== employeeId/)
console.log('PASS: explicit JWT/app_users UUID binding in 3 routes (source guards only)')
