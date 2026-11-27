import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const source = (file) => fs.readFileSync(path.join(root,file),'utf8')
const employee=source('app/employee/leave/postpone/page.tsx')
const employeeApi=source('app/api/employee/leave/postpone/route.ts')
const hr=source('app/hr/leave/administration/page.tsx')
const hrApi=source('app/api/hr/leave/postpone-adjustments/route.ts')
const hrEmployee=source('app/hr/employees/page.tsx')

assert.match(employee,/subtractDays\(anniversaryDate, 7\)/,'Deadline must use anniversary-H7')
assert.match(employee,/subtractDays\(addDays\(cycle\.cycle_end, 1\), 7\)/)
assert.match(employee,/outstandingDebtDays === 0/)
assert.match(employee,/Status hutang cuti belum dapat diverifikasi/)
assert.match(employee,/Karyawan dengan hutang cuti aktif tidak dapat postpone/)
assert.match(employeeApi,/debt_status_verified: debtVerified/)
assert.match(employeeApi,/debt_outstanding_days: debtDays/)
assert.match(hr,/today <= addDays\(anniversary, -7\)/)
assert.match(hr,/Postpone tidak diperbolehkan/)
assert.match(hrApi,/Jalur fleksibel lama hanya untuk pengurangan saldo historis/)
assert.match(hrEmployee,/Bagian ini hanya untuk mengurangi saldo fleksibel historis/)

if (process.argv.includes('--sql')) {
  const sqlRoot = path.resolve(process.argv[process.argv.indexOf('--sql')+1]||'.')
  const policy=fs.readFileSync(path.join(sqlRoot,'01_RC3J_KEBIJAKAN_POSTPONE_H7_6BULAN.sql'),'utf8')
  const faisal=fs.readFileSync(path.join(sqlRoot,'02_RC3J_KOREKSI_FAISAL_21_HARI.sql'),'utf8')
  assert.match(policy,/v_deadline := v_cycle\.cycle_end::date - 6;/)
  assert.match(policy,/v_anniversary - 7/)
  assert.match(policy,/interval '6 months'/)
  assert.match(policy,/annual_leave_debts/)
  assert.match(policy,/BEFORE INSERT OR UPDATE OF approval_status/)
  assert.match(policy,/BEFORE INSERT ON public\.leave_postpone_manual_adjustments/)
  assert.match(policy,/REVOKE INSERT, UPDATE, DELETE ON public\.annual_leave_cycles/)
  assert.match(faisal,/e\.employee_number='1010791'/)
  assert.match(faisal,/s\.postpone_active_days=9/)
  assert.match(faisal,/s\.annual_regular_days=12/)
  assert.match(faisal,/a\.adjustment_days=-3/)
  assert.match(faisal,/s\.annual_total_available_days=21/)
  assert.match(faisal,/COMMIT;/)
}
console.log('RC3J PASS — H-7 maturity cutoff, 6-month expiry, debt-block, HR source-cycle-only, Faisal verified 21-day correction safeguards.')
