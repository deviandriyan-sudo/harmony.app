import fs from 'node:fs'
import assert from 'node:assert/strict'

const page = fs.readFileSync('app/hr/employees/page.tsx', 'utf8')
const styles = fs.readFileSync('app/globals.css', 'utf8')

assert(page.includes('function EmployeeModalPortal(') && page.includes('createPortal(children, document.body)'), 'HR employee dialogs must remain portaled to body')
assert(page.includes('className="harmony-hr-form-scroll space-y-6 overflow-y-auto p-6"'), 'HR employee form must use dedicated scroll viewport')
assert(page.includes('flex min-h-0 flex-1 flex-col'), 'HR employee form must retain bounded flex container')
assert(styles.includes('.harmony-hr-edit-modal .harmony-hr-form-scroll > *'), 'All form sections must be protected from vertical flex shrink')
assert(/\.harmony-hr-edit-modal \.harmony-hr-form-scroll > \*\s*\{[^}]*flex\s*:\s*0 0 auto;/s.test(styles), 'Direct children of HR form scroll must have flex: 0 0 auto')
assert(/\.harmony-hr-edit-modal \.harmony-hr-form-scroll\s*\{[^}]*min-height\s*:\s*0;[^}]*overflow-y\s*:\s*auto;/s.test(styles), 'Scroll viewport must maintain min-height:0 and vertical scrolling')
assert(!styles.includes('.harmony-hr-edit-modal form > div:first-child { padding:14px 18px; display:flex;'), 'Remove previous unscoped HR form vertical flex configuration')
for (const required of ['Identitas Karyawan', 'Homebase Utama & Status', 'Jabatan & Penugasan Tambahan', 'Data Pribadi Tersinkron', 'Saldo & Status Data', 'AnnualLeaveCorrection', 'AnnualLeaveDebtSection', 'PostponeAdjustmentSection', 'PHLBalanceAdjustmentSection', 'onSubmit={onSubmit}', "onClose={resetForm}"]) {
  assert(page.includes(required), `Required employee workflow element missing: ${required}`)
}
assert(page.includes('disabled={saving}'), 'Existing saving guard must remain')
console.log('HARMONY HR employee modal PASS: no crushed accordion panels, internal scroll, portalled overlay and employee workflows preserved')
