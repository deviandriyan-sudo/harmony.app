import assert from 'node:assert/strict'
import fs from 'node:fs'
const sql = fs.readFileSync('SQL_ONLY/02_V380_SAFE_AUDITED_ANNUAL_CORRECTION.sql','utf8')
const api = fs.readFileSync('app/api/hr/leave/balance-correction/route.ts','utf8')
const ui = fs.readFileSync('components/employee/AnnualLeaveCorrection.tsx','utf8')
assert(sql.includes('FOR UPDATE'),'Employee concurrency lock missing')
assert(sql.includes('harmony_leave_is_active_hr_admin'),'Server HR permission guard missing')
assert(sql.includes('harmony_annual_leave_correction_audit'),'Audit ledger missing')
assert(sql.includes('v_after.annual_total_available_days'),'Post-write lifecycle verification missing')
assert(sql.includes('RAISE EXCEPTION'),'Fail-closed required')
assert(!sql.includes('CREATE OR REPLACE VIEW'),'Existing leave view must stay unmodified')
assert(api.includes('await hrClient(request)'),'Authenticated API guard missing')
assert(ui.includes('type="button"'),'Forms must not accidentally submit employee master')
console.log('HARMONY annual leave correction safeguards PASS')
