import fs from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const detail = read('app/employee/approvals/[employeeId]/[period]/page.tsx')
const list = read('app/employee/approvals/attendance/page.tsx')
const leave = read('app/employee/approvals/leave/page.tsx')
const employees = read('app/hr/employees/page.tsx')

assert.match(detail, /href=\{`\/employee\/approvals\/attendance\?period=\$\{encodeURIComponent\(periodMonth\)\}`\}/)
assert.match(detail, /Kembali ke Daftar Karyawan/)
assert.match(detail, /Approval Cuti &amp; Izin/)
assert.match(detail, /\/employee\/approvals\/leave\?employee_id=\$\{encodeURIComponent\(employeeId\)\}/)
assert.match(list, /\?period=\$\{encodeURIComponent\(periodMonth\)\}/)
assert.match(leave, /contextEmployeeId && request\.employee_id !== contextEmployeeId/)
assert.match(leave, /Tampilkan Semua Karyawan/)
assert.match(leave, /approve_leave_request_by_supervisor/)
assert.match(leave, /reject_leave_request_by_supervisor/)
assert.match(leave, /Jika berbeda dari saldo yang terlihat di Data Karyawan/)
assert.match(employees, /stored_annual_leave_balance: employee\.annual_leave_balance/)
assert.match(employees, /leave_balance_source: balanceByEmployee\.has\(employee\.id\)/)
assert.match(employees, /Periksa cuti \(master/)
assert.doesNotMatch(employees, /await\s+supabase\.from\('employees'\)\.update\(\{\s*annual_leave_balance:/)
console.log('RC2G workflow guards PASS — explicit team return, contextual leave filtering, no automatic balance rewrite')
